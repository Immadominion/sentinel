/**
 * Session routes — create session, get session, revoke session.
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
    deriveSessionPda,
    SENTINEL_PROGRAM_ID,
} from "../services/solana.js";
import { createError } from "../middleware/error.js";

const router = Router();

// ════════════════════════════════════════════════════════════════
// Validation Schemas
// ════════════════════════════════════════════════════════════════

const createSessionSchema = z.object({
    owner: z.string().min(32).max(50),
    agent: z.string().min(32).max(50),
    sessionId: z.number().int().nonnegative(),
    expirySeconds: z.number().int().positive().max(86400 * 7).default(3600), // max 7 days
    maxAmountSol: z.number().positive().max(100).default(1),
    maxPerTxSol: z.number().positive().max(10).default(0.1),
});

const revokeSessionSchema = z.object({
    revoker: z.string().min(32).max(50), // owner or agent
    agent: z.string().min(32).max(50),
    sessionId: z.number().int().nonnegative(),
});

// ════════════════════════════════════════════════════════════════
// Account Parsing
// ════════════════════════════════════════════════════════════════

const SESSION_KEY_DISCRIMINATOR = Buffer.from("SentSess");

function readU64LE(buf: Buffer, offset: number): bigint {
    return buf.readBigUInt64LE(offset);
}

function readI64LE(buf: Buffer, offset: number): bigint {
    return buf.readBigInt64LE(offset);
}

function readPubkey(buf: Buffer, offset: number): string {
    return new PublicKey(buf.subarray(offset, offset + 32)).toBase58();
}

interface SessionKeyState {
    sessionAddress: string;
    wallet: string;
    agent: string;
    sessionId: number;
    bump: number;
    isRevoked: boolean;
    createdAt: number;
    expiresAt: number;
    maxAmountSol: number;
    maxPerTxSol: number;
    spentSol: number;
}

function parseSessionKey(address: string, data: Buffer): SessionKeyState | null {
    if (data.length < 121) return null;

    const discriminator = data.subarray(0, 8);
    if (!discriminator.equals(SESSION_KEY_DISCRIMINATOR)) return null;

    return {
        sessionAddress: address,
        wallet: readPubkey(data, 8),
        agent: readPubkey(data, 40),
        sessionId: data.readUInt32LE(72),
        bump: data[76],
        isRevoked: data[77] !== 0,
        createdAt: Number(readI64LE(data, 78)),
        expiresAt: Number(readI64LE(data, 86)),
        maxAmountSol: Number(readU64LE(data, 94)) / LAMPORTS_PER_SOL,
        maxPerTxSol: Number(readU64LE(data, 102)) / LAMPORTS_PER_SOL,
        spentSol: Number(readU64LE(data, 110)) / LAMPORTS_PER_SOL,
    };
}

// ════════════════════════════════════════════════════════════════
// Instruction Builders
// ════════════════════════════════════════════════════════════════

function encodeU32(value: number): Buffer {
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(value);
    return buf;
}

function encodeU64(value: bigint): Buffer {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(value);
    return buf;
}

function encodeI64(value: bigint): Buffer {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64LE(value);
    return buf;
}

enum InstructionDiscriminant {
    CreateSessionKey = 2,
    RevokeSession = 4,
}

function buildCreateSessionIx(
    owner: PublicKey,
    wallet: PublicKey,
    agent: PublicKey,
    agentConfig: PublicKey,
    sessionPda: PublicKey,
    bump: number,
    sessionId: number,
    expiryTimestamp: bigint,
    maxAmountLamports: bigint,
    maxPerTxLamports: bigint
) {
    const data = Buffer.concat([
        Buffer.from([InstructionDiscriminant.CreateSessionKey]),
        Buffer.from([bump]),
        encodeU32(sessionId),
        encodeI64(expiryTimestamp),
        encodeU64(maxAmountLamports),
        encodeU64(maxPerTxLamports),
    ]);

    return {
        programId: SENTINEL_PROGRAM_ID,
        keys: [
            { pubkey: owner, isSigner: true, isWritable: true },
            { pubkey: wallet, isSigner: false, isWritable: false },
            { pubkey: agent, isSigner: false, isWritable: false },
            { pubkey: agentConfig, isSigner: false, isWritable: true },
            { pubkey: sessionPda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
    };
}

function buildRevokeSessionIx(
    revoker: PublicKey, // owner or agent
    wallet: PublicKey,
    agent: PublicKey,
    agentConfig: PublicKey,
    sessionPda: PublicKey
) {
    const data = Buffer.from([InstructionDiscriminant.RevokeSession]);

    return {
        programId: SENTINEL_PROGRAM_ID,
        keys: [
            { pubkey: revoker, isSigner: true, isWritable: false },
            { pubkey: wallet, isSigner: false, isWritable: false },
            { pubkey: agent, isSigner: false, isWritable: false },
            { pubkey: agentConfig, isSigner: false, isWritable: false },
            { pubkey: sessionPda, isSigner: false, isWritable: true },
        ],
        data,
    };
}

// ════════════════════════════════════════════════════════════════
// Routes
// ════════════════════════════════════════════════════════════════

/**
 * POST /session/prepare-create
 * Returns an unsigned transaction for session creation.
 */
router.post("/prepare-create", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = createSessionSchema.parse(req.body);
        const ownerPubkey = new PublicKey(body.owner);
        const agentPubkey = new PublicKey(body.agent);

        const [walletPda] = deriveWalletPda(ownerPubkey);
        const [agentConfigPda] = deriveAgentPda(walletPda, agentPubkey);
        const [sessionPda, bump] = deriveSessionPda(agentPubkey, body.sessionId);

        const connection = getConnection();

        // Check agent exists
        const agentAccount = await connection.getAccountInfo(agentConfigPda);
        if (!agentAccount) {
            throw createError("Agent config not found. Register agent first.", 404);
        }

        // Check session doesn't already exist
        const existingSession = await connection.getAccountInfo(sessionPda);
        if (existingSession) {
            throw createError("Session ID already used", 409, {
                sessionAddress: sessionPda.toBase58(),
            });
        }

        const now = Math.floor(Date.now() / 1000);
        const expiryTimestamp = BigInt(now + body.expirySeconds);
        const maxAmountLamports = BigInt(Math.floor(body.maxAmountSol * LAMPORTS_PER_SOL));
        const maxPerTxLamports = BigInt(Math.floor(body.maxPerTxSol * LAMPORTS_PER_SOL));

        const ix = buildCreateSessionIx(
            ownerPubkey,
            walletPda,
            agentPubkey,
            agentConfigPda,
            sessionPda,
            bump,
            body.sessionId,
            expiryTimestamp,
            maxAmountLamports,
            maxPerTxLamports
        );

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

        const tx = new Transaction();
        tx.add(ix);
        tx.recentBlockhash = blockhash;
        tx.feePayer = ownerPubkey;

        const serialized = tx.serialize({ requireAllSignatures: false }).toString("base64");

        res.json({
            success: true,
            sessionAddress: sessionPda.toBase58(),
            expiresAt: Number(expiryTimestamp),
            transaction: serialized,
            blockhash,
            lastValidBlockHeight,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /session/prepare-revoke
 * Returns an unsigned transaction for session revocation.
 */
router.post("/prepare-revoke", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = revokeSessionSchema.parse(req.body);
        const revokerPubkey = new PublicKey(body.revoker);
        const agentPubkey = new PublicKey(body.agent);

        // Need to derive wallet from the session to verify
        const [sessionPda] = deriveSessionPda(agentPubkey, body.sessionId);

        const connection = getConnection();
        const sessionAccount = await connection.getAccountInfo(sessionPda);

        if (!sessionAccount) {
            throw createError("Session not found", 404);
        }

        const session = parseSessionKey(sessionPda.toBase58(), sessionAccount.data);
        if (!session) {
            throw createError("Invalid session data", 400);
        }

        if (session.isRevoked) {
            throw createError("Session already revoked", 409);
        }

        const walletPubkey = new PublicKey(session.wallet);
        const [agentConfigPda] = deriveAgentPda(walletPubkey, agentPubkey);

        const ix = buildRevokeSessionIx(
            revokerPubkey,
            walletPubkey,
            agentPubkey,
            agentConfigPda,
            sessionPda
        );

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

        const tx = new Transaction();
        tx.add(ix);
        tx.recentBlockhash = blockhash;
        tx.feePayer = revokerPubkey;

        const serialized = tx.serialize({ requireAllSignatures: false }).toString("base64");

        res.json({
            success: true,
            sessionAddress: sessionPda.toBase58(),
            transaction: serialized,
            blockhash,
            lastValidBlockHeight,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /session/:sessionAddress
 * Get session by PDA address.
 */
router.get("/:sessionAddress", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sessionAddress = req.params.sessionAddress as string;
        const pubkey = new PublicKey(sessionAddress);
        const connection = getConnection();
        const accountInfo = await connection.getAccountInfo(pubkey);

        if (!accountInfo) {
            throw createError("Session not found", 404);
        }

        const session = parseSessionKey(sessionAddress, accountInfo.data);
        if (!session) {
            throw createError("Invalid session data", 400);
        }

        // Add computed fields
        const now = Math.floor(Date.now() / 1000);
        const isExpired = session.expiresAt < now;
        const isActive = !session.isRevoked && !isExpired;

        res.json({
            success: true,
            session: {
                ...session,
                isExpired,
                isActive,
                remainingSol: session.maxAmountSol - session.spentSol,
            },
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /session/by-agent/:agentPubkey/:sessionId
 * Derive and fetch session.
 */
router.get(
    "/by-agent/:agentPubkey/:sessionId",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const agentPubkey = new PublicKey(req.params.agentPubkey as string);
            const sessionId = parseInt(req.params.sessionId as string, 10);
            const [sessionPda] = deriveSessionPda(agentPubkey, sessionId);

            const connection = getConnection();
            const accountInfo = await connection.getAccountInfo(sessionPda);

            if (!accountInfo) {
                res.json({
                    success: true,
                    exists: false,
                    sessionAddress: sessionPda.toBase58(),
                });
                return;
            }

            const session = parseSessionKey(sessionPda.toBase58(), accountInfo.data);

            const now = Math.floor(Date.now() / 1000);
            const isExpired = session ? session.expiresAt < now : false;
            const isActive = session ? !session.isRevoked && !isExpired : false;

            res.json({
                success: true,
                exists: true,
                session: session
                    ? {
                        ...session,
                        isExpired,
                        isActive,
                        remainingSol: session.maxAmountSol - session.spentSol,
                    }
                    : null,
            });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
