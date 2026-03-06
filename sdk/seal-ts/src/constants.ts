/**
 * Constants for the Seal smart wallet program.
 */

import { PublicKey } from "@solana/web3.js";

// Default program ID used by the SDK unless a caller overrides `programId`.
// Production integrations should inject the cluster-specific deployment they intend to use.
export const SEAL_PROGRAM_ID = new PublicKey(
    "EV3TKRVz7pTHpAqBTjP8jmwuvoRBRCpjmVSPHhcMnXqb"
);

// PDA Seeds
export const WALLET_SEED = Buffer.from("seal");
export const AGENT_SEED = Buffer.from("agent");
export const SESSION_SEED = Buffer.from("session");

// Account Discriminators (first 8 bytes)
export const SMART_WALLET_DISCRIMINATOR = Buffer.from("SealWalt"); // 8 bytes
export const AGENT_CONFIG_DISCRIMINATOR = Buffer.from("SealAgnt");
export const SESSION_KEY_DISCRIMINATOR = Buffer.from("SealSess");

// Instruction Discriminators (first byte)
export enum InstructionDiscriminant {
    CreateWallet = 0,
    RegisterAgent = 1,
    CreateSessionKey = 2,
    ExecuteViaSession = 3,
    RevokeSession = 4,
    UpdateSpendingLimit = 5,
    AddGuardian = 6,
    RecoverWallet = 7,
    DeregisterAgent = 8,
    CloseWallet = 9,
    LockWallet = 10,
    RemoveGuardian = 11,
    SetRecoveryThreshold = 12,
}

// Limits
export const MAX_GUARDIANS = 5;
export const MAX_ALLOWED_PROGRAMS = 10;
export const MAX_ALLOWED_INSTRUCTIONS = 5;
export const MAX_AGENT_NAME_LENGTH = 64;

// Default values
export const DEFAULT_SESSION_DURATION_SECS = BigInt(24 * 60 * 60); // 24 hours
export const MAX_SESSION_DURATION_SECS = BigInt(7 * 24 * 60 * 60); // 7 days

// Account sizes (MUST match Rust - verified from programs/seal-wallet/src/state/*.rs)
export const SMART_WALLET_SIZE = 278; // 8+32+32+1+8+1+1+1+160+8+8+8+8+1+1
export const AGENT_CONFIG_SIZE = 556; // 8+32+32+32+1+1+1+256+1+128+8+8+8+8+8+8+8+8
export const SESSION_KEY_SIZE = 154;  // 8+32+32+32+1+8+8+8+8+8+1+8
