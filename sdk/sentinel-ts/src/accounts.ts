/**
 * Account deserialization for Sentinel on-chain accounts.
 */

import { PublicKey } from "@solana/web3.js";
import {
    SMART_WALLET_DISCRIMINATOR,
    AGENT_CONFIG_DISCRIMINATOR,
    SESSION_KEY_DISCRIMINATOR,
    MAX_GUARDIANS,
    MAX_ALLOWED_PROGRAMS,
    MAX_ALLOWED_INSTRUCTIONS,
    MAX_AGENT_NAME_LENGTH,
} from "./constants";
import { SmartWallet, AgentConfig, SessionKey } from "./types";

// ════════════════════════════════════════════════════════════════
// Decoding Helpers
// ════════════════════════════════════════════════════════════════

function readU64LE(buf: Buffer, offset: number): bigint {
    return buf.readBigUInt64LE(offset);
}

function readI64LE(buf: Buffer, offset: number): bigint {
    return buf.readBigInt64LE(offset);
}

function readPubkey(buf: Buffer, offset: number): string {
    return new PublicKey(buf.subarray(offset, offset + 32)).toBase58();
}

function readFixedString(buf: Buffer, offset: number, length: number): string {
    const bytes = buf.subarray(offset, offset + length);
    const nullIndex = bytes.indexOf(0);
    return bytes.subarray(0, nullIndex === -1 ? length : nullIndex).toString("utf-8");
}

// ════════════════════════════════════════════════════════════════
// SmartWallet Deserialization
// ════════════════════════════════════════════════════════════════

/**
 * Deserialize a SmartWallet account from raw bytes.
 *
 * Layout (245 bytes total - verified from Rust):
 * - [0..8]    discriminator "SentWalt" (8)
 * - [8..40]   owner: Pubkey (32)
 * - [40]      bump: u8 (1)
 * - [41..49]  nonce: u64 (8)
 * - [49]      agent_count: u8 (1)
 * - [50]      guardian_count: u8 (1)
 * - [51..211] guardians: [Pubkey; 5] (160 = 5*32)
 * - [211..219] daily_limit_lamports: u64 (8)
 * - [219..227] per_tx_limit_lamports: u64 (8)
 * - [227..235] spent_today_lamports: u64 (8)
 * - [235..243] day_start_timestamp: i64 (8)
 * - [243]     is_locked: bool (1)
 * - [244]     is_closed: bool (1)
 */
export function deserializeSmartWallet(
    address: PublicKey,
    data: Buffer
): SmartWallet | null {
    if (data.length < 245) {
        return null;
    }

    // Check discriminator
    const discriminator = data.subarray(0, 8);
    if (!discriminator.equals(SMART_WALLET_DISCRIMINATOR)) {
        return null;
    }

    const owner = readPubkey(data, 8);
    const bump = data[40];
    const nonce = readU64LE(data, 41);
    const agentCount = data[49];
    const guardianCount = data[50];

    // Read guardians (up to guardianCount)
    const guardians: string[] = [];
    for (let i = 0; i < guardianCount && i < MAX_GUARDIANS; i++) {
        guardians.push(readPubkey(data, 51 + i * 32));
    }

    const dailyLimitLamports = readU64LE(data, 211);
    const perTxLimitLamports = readU64LE(data, 219);
    const spentTodayLamports = readU64LE(data, 227);
    const dayStartTimestamp = readI64LE(data, 235);
    const isLocked = data[243] !== 0;
    const isClosed = data[244] !== 0;

    return {
        address: address.toBase58(),
        owner,
        bump,
        nonce,
        agentCount,
        guardianCount,
        guardians,
        dailyLimitLamports,
        perTxLimitLamports,
        spentTodayLamports,
        dayStartTimestamp,
        isLocked,
        isClosed,
    };
}

// ════════════════════════════════════════════════════════════════
// AgentConfig Deserialization
// ════════════════════════════════════════════════════════════════

/**
 * Deserialize an AgentConfig account from raw bytes.
 *
 * Layout (540 bytes total - verified from Rust):
 * - [0..8]     discriminator "SentAgnt" (8)
 * - [8..40]    wallet: Pubkey (32)
 * - [40..72]   agent: Pubkey (32)
 * - [72..104]  name: [u8; 32] (32)
 * - [104]      bump: u8 (1)
 * - [105]      is_active: bool (1)
 * - [106]      allowed_programs_count: u8 (1)
 * - [107..363] allowed_programs: [Pubkey; 8] (256 = 8*32)
 * - [363]      allowed_instructions_count: u8 (1)
 * - [364..492] allowed_instructions: [[u8; 8]; 16] (128 = 16*8)
 * - [492..500] daily_limit: u64 (8)
 * - [500..508] per_tx_limit: u64 (8)
 * - [508..516] default_session_duration: i64 (8)
 * - [516..524] max_session_duration: i64 (8)
 * - [524..532] total_spent: u64 (8)
 * - [532..540] tx_count: u64 (8)
 */
export function deserializeAgentConfig(
    address: PublicKey,
    data: Buffer
): AgentConfig | null {
    if (data.length < 540) {
        return null;
    }

    // Check discriminator
    const discriminator = data.subarray(0, 8);
    if (!discriminator.equals(AGENT_CONFIG_DISCRIMINATOR)) {
        return null;
    }

    const wallet = readPubkey(data, 8);
    const agent = readPubkey(data, 40);
    const name = readFixedString(data, 72, MAX_AGENT_NAME_LENGTH);
    const bump = data[104];
    const isActive = data[105] !== 0;
    const allowedProgramsCount = data[106];

    const allowedPrograms: string[] = [];
    for (let i = 0; i < allowedProgramsCount && i < MAX_ALLOWED_PROGRAMS; i++) {
        allowedPrograms.push(readPubkey(data, 107 + i * 32));
    }

    const allowedInstructionsCount = data[363];
    const allowedInstructions: string[] = [];
    for (let i = 0; i < allowedInstructionsCount && i < MAX_ALLOWED_INSTRUCTIONS; i++) {
        const instrBytes = data.subarray(364 + i * 8, 364 + i * 8 + 8);
        allowedInstructions.push(instrBytes.toString("hex"));
    }

    // Offset for limits section
    const limitsOffset = 492;
    const dailyLimit = readU64LE(data, limitsOffset);
    const perTxLimit = readU64LE(data, limitsOffset + 8);
    const defaultSessionDuration = readI64LE(data, limitsOffset + 16);
    const maxSessionDuration = readI64LE(data, limitsOffset + 24);
    const totalSpent = readU64LE(data, limitsOffset + 32);
    const txCount = readU64LE(data, limitsOffset + 40);

    return {
        configAddress: address.toBase58(),
        wallet,
        agent,
        name,
        bump,
        isActive,
        allowedPrograms,
        allowedInstructions,
        dailyLimit,
        perTxLimit,
        defaultSessionDuration,
        maxSessionDuration,
        totalSpent,
        txCount,
    };
}

// ════════════════════════════════════════════════════════════════
// SessionKey Deserialization
// ════════════════════════════════════════════════════════════════

/**
 * Deserialize a SessionKey account from raw bytes.
 *
 * Layout (154 bytes total - verified from Rust):
 * - [0..8]     discriminator "SentSess" (8)
 * - [8..40]    wallet: Pubkey (32)
 * - [40..72]   agent: Pubkey (32)
 * - [72..104]  session_pubkey: Pubkey (32)
 * - [104]      bump: u8 (1)
 * - [105..113] created_at: i64 (8)
 * - [113..121] expires_at: i64 (8)
 * - [121..129] max_amount: u64 (8)
 * - [129..137] amount_spent: u64 (8)
 * - [137..145] max_per_tx: u64 (8)
 * - [145]      is_revoked: bool (1)
 * - [146..154] nonce: u64 (8)
 */
export function deserializeSessionKey(
    address: PublicKey,
    data: Buffer
): SessionKey | null {
    if (data.length < 154) {
        return null;
    }

    // Check discriminator
    const discriminator = data.subarray(0, 8);
    if (!discriminator.equals(SESSION_KEY_DISCRIMINATOR)) {
        return null;
    }

    const wallet = readPubkey(data, 8);
    const agent = readPubkey(data, 40);
    const sessionPubkey = readPubkey(data, 72);
    const bump = data[104];
    const createdAt = readI64LE(data, 105);
    const expiresAt = readI64LE(data, 113);
    const maxAmount = readU64LE(data, 121);
    const amountSpent = readU64LE(data, 129);
    const maxPerTx = readU64LE(data, 137);
    const isRevoked = data[145] !== 0;
    const nonce = readU64LE(data, 146);

    return {
        sessionAddress: address.toBase58(),
        wallet,
        agent,
        sessionPubkey,
        bump,
        createdAt,
        expiresAt,
        maxAmount,
        amountSpent,
        maxPerTx,
        isRevoked,
        nonce,
    };
}
