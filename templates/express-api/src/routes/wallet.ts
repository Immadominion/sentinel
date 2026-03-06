/**
 * Wallet routes — create wallet, get wallet state, deposit flow.
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { getConnection, deriveWalletPda, SEAL_PROGRAM_ID } from "../services/solana.js";
import { createError } from "../middleware/error.js";

const router = Router();

// ════════════════════════════════════════════════════════════════
// Validation Schemas
// ════════════════════════════════════════════════════════════════

const createWalletSchema = z.object({
    owner: z.string().min(32).max(50),
    dailyLimitSol: z.number().positive().max(1000).default(10),
    perTxLimitSol: z.number().positive().max(100).default(1),
});

const getWalletSchema = z.object({
    address: z.string().min(32).max(50),
});

// ════════════════════════════════════════════════════════════════
// Discriminators & Account Parsing
// ════════════════════════════════════════════════════════════════

const SMART_WALLET_DISCRIMINATOR = Buffer.from("SentWalt");

function readU64LE(buf: Buffer, offset: number): bigint {
    return buf.readBigUInt64LE(offset);
}

function readPubkey(buf: Buffer, offset: number): string {
    return new PublicKey(buf.subarray(offset, offset + 32)).toBase58();
}

interface SmartWalletState {
    address: string;
    owner: string;
    bump: number;
    nonce: string;
    agentCount: number;
    guardianCount: number;
    guardians: string[];
    dailyLimitSol: number;
    perTxLimitSol: number;
    spentTodaySol: number;
    dayStartTimestamp: number;
    isLocked: boolean;
    isClosed: boolean;
}

function parseSmartWallet(address: string, data: Buffer): SmartWalletState | null {
    if (data.length < 245) return null;

    const discriminator = data.subarray(0, 8);
    if (!discriminator.equals(SMART_WALLET_DISCRIMINATOR)) return null;

    const guardianCount = data[50];
    const guardians: string[] = [];
    for (let i = 0; i < guardianCount && i < 5; i++) {
        guardians.push(readPubkey(data, 51 + i * 32));
    }

    return {
        address,
        owner: readPubkey(data, 8),
        bump: data[40],
        nonce: readU64LE(data, 41).toString(),
        agentCount: data[49],
        guardianCount,
        guardians,
        dailyLimitSol: Number(readU64LE(data, 211)) / LAMPORTS_PER_SOL,
        perTxLimitSol: Number(readU64LE(data, 219)) / LAMPORTS_PER_SOL,
        spentTodaySol: Number(readU64LE(data, 227)) / LAMPORTS_PER_SOL,
        dayStartTimestamp: Number(readU64LE(data, 235)),
        isLocked: data[243] !== 0,
        isClosed: data[244] !== 0,
    };
}

// ════════════════════════════════════════════════════════════════
// Instruction Builder Helpers
// ════════════════════════════════════════════════════════════════

function encodeU64(value: bigint): Buffer {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(value);
    return buf;
}

enum InstructionDiscriminant {
    CreateWallet = 0,
}

function buildCreateWalletIx(
    funder: PublicKey,
    owner: PublicKey,
    walletPda: PublicKey,
    bump: number,
    dailyLimitLamports: bigint,
    perTxLimitLamports: bigint
) {
    const data = Buffer.concat([
        Buffer.from([InstructionDiscriminant.CreateWallet]),
        Buffer.from([bump]),
        encodeU64(dailyLimitLamports),
        encodeU64(perTxLimitLamports),
    ]);

    return {
        programId: SEAL_PROGRAM_ID,
        keys: [
            { pubkey: funder, isSigner: true, isWritable: true },
            { pubkey: owner, isSigner: true, isWritable: false },
            { pubkey: walletPda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
    };
}

// ════════════════════════════════════════════════════════════════
// Routes
// ════════════════════════════════════════════════════════════════

/**
 * POST /wallet/prepare-create
 * Returns an unsigned transaction for wallet creation.
 * The Flutter app signs this via MWA and sends it to the network.
 */
router.post("/prepare-create", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = createWalletSchema.parse(req.body);
        const ownerPubkey = new PublicKey(body.owner);

        const [walletPda, bump] = deriveWalletPda(ownerPubkey);

        // Check if wallet already exists
        const connection = getConnection();
        const existing = await connection.getAccountInfo(walletPda);
        if (existing) {
            throw createError("Wallet already exists for this owner", 409, {
                walletAddress: walletPda.toBase58(),
            });
        }

        // Build transaction
        const dailyLimitLamports = BigInt(Math.floor(body.dailyLimitSol * LAMPORTS_PER_SOL));
        const perTxLimitLamports = BigInt(Math.floor(body.perTxLimitSol * LAMPORTS_PER_SOL));

        const ix = buildCreateWalletIx(
            ownerPubkey,
            ownerPubkey,
            walletPda,
            bump,
            dailyLimitLamports,
            perTxLimitLamports
        );

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

        const tx = new Transaction();
        tx.add(ix);
        tx.recentBlockhash = blockhash;
        tx.feePayer = ownerPubkey;

        // Serialize to base64 for mobile to deserialize & sign
        const serialized = tx.serialize({ requireAllSignatures: false }).toString("base64");

        res.json({
            success: true,
            walletAddress: walletPda.toBase58(),
            transaction: serialized,
            blockhash,
            lastValidBlockHeight,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /wallet/:address
 * Get wallet state by PDA address.
 */
router.get("/:address", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { address } = getWalletSchema.parse(req.params);
        const pubkey = new PublicKey(address);

        const connection = getConnection();
        const accountInfo = await connection.getAccountInfo(pubkey);

        if (!accountInfo) {
            throw createError("Wallet not found", 404);
        }

        const wallet = parseSmartWallet(address, accountInfo.data);
        if (!wallet) {
            throw createError("Invalid wallet account data", 400);
        }

        res.json({
            success: true,
            wallet,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /wallet/by-owner/:owner
 * Derive and fetch wallet by owner pubkey.
 */
router.get("/by-owner/:owner", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ownerPubkey = new PublicKey(req.params.owner);
        const [walletPda] = deriveWalletPda(ownerPubkey);

        const connection = getConnection();
        const accountInfo = await connection.getAccountInfo(walletPda);

        if (!accountInfo) {
            res.json({
                success: true,
                exists: false,
                walletAddress: walletPda.toBase58(),
            });
            return;
        }

        const wallet = parseSmartWallet(walletPda.toBase58(), accountInfo.data);

        res.json({
            success: true,
            exists: true,
            wallet,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /wallet/:address/balance
 * Get SOL balance of a wallet PDA.
 */
router.get("/:address/balance", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const pubkey = new PublicKey(req.params.address);
        const connection = getConnection();
        const lamports = await connection.getBalance(pubkey);

        res.json({
            success: true,
            lamports,
            sol: lamports / LAMPORTS_PER_SOL,
        });
    } catch (err) {
        next(err);
    }
});

export default router;
