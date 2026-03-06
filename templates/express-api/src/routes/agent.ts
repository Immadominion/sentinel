/**
 * Agent routes — register agent, get agent config, deregister.
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
    getConnection,
    deriveWalletPda,
    deriveAgentPda,
    SEAL_PROGRAM_ID,
} from "../services/solana.js";
import { createError } from "../middleware/error.js";

const router = Router();

// ════════════════════════════════════════════════════════════════
// Validation Schemas
// ════════════════════════════════════════════════════════════════

const registerAgentSchema = z.object({
    owner: z.string().min(32).max(50),
    agent: z.string().min(32).max(50),
    name: z.string().min(1).max(32).default("Sage Agent"),
    dailyLimitSol: z.number().positive().max(100).default(2),
    perTxLimitSol: z.number().positive().max(10).default(0.5),
    allowedPrograms: z.array(z.string().min(32).max(50)).max(8).default([]),
});

// ════════════════════════════════════════════════════════════════
// Account Parsing
// ════════════════════════════════════════════════════════════════

const AGENT_CONFIG_DISCRIMINATOR = Buffer.from("SentAgnt");

function readU64LE(buf: Buffer, offset: number): bigint {
    return buf.readBigUInt64LE(offset);
}

function readPubkey(buf: Buffer, offset: number): string {
    return new PublicKey(buf.subarray(offset, offset + 32)).toBase58();
}

function readFixedString(buf: Buffer, offset: number, length: number): string {
    const slice = buf.subarray(offset, offset + length);
    const nullIndex = slice.indexOf(0);
    return slice.subarray(0, nullIndex === -1 ? length : nullIndex).toString("utf8");
}

interface AgentConfigState {
    configAddress: string;
    wallet: string;
    agent: string;
    name: string;
    bump: number;
    isActive: boolean;
    allowedPrograms: string[];
    dailyLimitSol: number;
    perTxLimitSol: number;
    spentTodaySol: number;
    dayStartTimestamp: number;
}

function parseAgentConfig(address: string, data: Buffer): AgentConfigState | null {
    if (data.length < 540) return null;

    const discriminator = data.subarray(0, 8);
    if (!discriminator.equals(AGENT_CONFIG_DISCRIMINATOR)) return null;

    const allowedProgramsCount = data[106];
    const allowedPrograms: string[] = [];
    for (let i = 0; i < allowedProgramsCount && i < 8; i++) {
        allowedPrograms.push(readPubkey(data, 107 + i * 32));
    }

    return {
        configAddress: address,
        wallet: readPubkey(data, 8),
        agent: readPubkey(data, 40),
        name: readFixedString(data, 72, 32),
        bump: data[104],
        isActive: data[105] !== 0,
        allowedPrograms,
        dailyLimitSol: Number(readU64LE(data, 492)) / LAMPORTS_PER_SOL,
        perTxLimitSol: Number(readU64LE(data, 500)) / LAMPORTS_PER_SOL,
        spentTodaySol: Number(readU64LE(data, 508)) / LAMPORTS_PER_SOL,
        dayStartTimestamp: Number(readU64LE(data, 516)),
    };
}

// ════════════════════════════════════════════════════════════════
// Instruction Builders
// ════════════════════════════════════════════════════════════════

function encodeU64(value: bigint): Buffer {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(value);
    return buf;
}

function encodeFixedString(str: string, length: number): Buffer {
    const buf = Buffer.alloc(length);
    buf.write(str.slice(0, length), "utf8");
    return buf;
}

enum InstructionDiscriminant {
    RegisterAgent = 1,
    DeregisterAgent = 8,
}

function buildRegisterAgentIx(
    owner: PublicKey,
    wallet: PublicKey,
    agent: PublicKey,
    agentConfigPda: PublicKey,
    bump: number,
    name: string,
    dailyLimitLamports: bigint,
    perTxLimitLamports: bigint,
    allowedPrograms: PublicKey[]
) {
    // Pad allowed programs to 8
    const paddedPrograms = [...allowedPrograms];
    while (paddedPrograms.length < 8) {
        paddedPrograms.push(SystemProgram.programId); // placeholder
    }

    const data = Buffer.concat([
        Buffer.from([InstructionDiscriminant.RegisterAgent]),
        Buffer.from([bump]),
        encodeFixedString(name, 32),
        encodeU64(dailyLimitLamports),
        encodeU64(perTxLimitLamports),
        Buffer.from([allowedPrograms.length]),
        Buffer.concat(paddedPrograms.map((p) => p.toBuffer())),
    ]);

    return {
        programId: SEAL_PROGRAM_ID,
        keys: [
            { pubkey: owner, isSigner: true, isWritable: true },
            { pubkey: wallet, isSigner: false, isWritable: true },
            { pubkey: agent, isSigner: false, isWritable: false },
            { pubkey: agentConfigPda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
    };
}

// ════════════════════════════════════════════════════════════════
// Routes
// ════════════════════════════════════════════════════════════════

/**
 * POST /agent/prepare-register
 * Returns an unsigned transaction for agent registration.
 */
router.post("/prepare-register", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = registerAgentSchema.parse(req.body);
        const ownerPubkey = new PublicKey(body.owner);
        const agentPubkey = new PublicKey(body.agent);

        const [walletPda] = deriveWalletPda(ownerPubkey);
        const [agentConfigPda, bump] = deriveAgentPda(walletPda, agentPubkey);

        const connection = getConnection();

        // Check wallet exists
        const walletAccount = await connection.getAccountInfo(walletPda);
        if (!walletAccount) {
            throw createError("Wallet not found. Create wallet first.", 404);
        }

        // Check agent doesn't already exist
        const existingAgent = await connection.getAccountInfo(agentConfigPda);
        if (existingAgent) {
            throw createError("Agent already registered", 409, {
                agentConfigAddress: agentConfigPda.toBase58(),
            });
        }

        const dailyLimitLamports = BigInt(Math.floor(body.dailyLimitSol * LAMPORTS_PER_SOL));
        const perTxLimitLamports = BigInt(Math.floor(body.perTxLimitSol * LAMPORTS_PER_SOL));
        const allowedPrograms = body.allowedPrograms.map((p) => new PublicKey(p));

        const ix = buildRegisterAgentIx(
            ownerPubkey,
            walletPda,
            agentPubkey,
            agentConfigPda,
            bump,
            body.name,
            dailyLimitLamports,
            perTxLimitLamports,
            allowedPrograms
        );

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

        const tx = new Transaction();
        tx.add(ix);
        tx.recentBlockhash = blockhash;
        tx.feePayer = ownerPubkey;

        const serialized = tx.serialize({ requireAllSignatures: false }).toString("base64");

        res.json({
            success: true,
            walletAddress: walletPda.toBase58(),
            agentConfigAddress: agentConfigPda.toBase58(),
            transaction: serialized,
            blockhash,
            lastValidBlockHeight,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /agent/:configAddress
 * Get agent config by PDA address.
 */
router.get("/:configAddress", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const configAddress = req.params.configAddress as string;
        const pubkey = new PublicKey(configAddress);
        const connection = getConnection();
        const accountInfo = await connection.getAccountInfo(pubkey);

        if (!accountInfo) {
            throw createError("Agent config not found", 404);
        }

        const agent = parseAgentConfig(configAddress, accountInfo.data);
        if (!agent) {
            throw createError("Invalid agent config data", 400);
        }

        res.json({
            success: true,
            agent,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /agent/by-wallet/:walletAddress/:agentPubkey
 * Derive and fetch agent config.
 */
router.get(
    "/by-wallet/:walletAddress/:agentPubkey",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const walletPubkey = new PublicKey(req.params.walletAddress);
            const agentPubkey = new PublicKey(req.params.agentPubkey);
            const [agentConfigPda] = deriveAgentPda(walletPubkey, agentPubkey);

            const connection = getConnection();
            const accountInfo = await connection.getAccountInfo(agentConfigPda);

            if (!accountInfo) {
                res.json({
                    success: true,
                    exists: false,
                    agentConfigAddress: agentConfigPda.toBase58(),
                });
                return;
            }

            const agent = parseAgentConfig(agentConfigPda.toBase58(), accountInfo.data);

            res.json({
                success: true,
                exists: true,
                agent,
            });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
