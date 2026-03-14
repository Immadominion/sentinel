/**
 * Instruction builders for the Seal program.
 *
 * Each function returns a TransactionInstruction that can be
 * added to a Transaction and signed.
 */

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  SEAL_PROGRAM_ID,
  InstructionDiscriminant,
  MAX_AGENT_NAME_LENGTH,
} from "./constants";
import { deriveWalletPda, deriveAgentPda, deriveSessionPda } from "./pda";

// ════════════════════════════════════════════════════════════════
// Encoding Helpers
// ════════════════════════════════════════════════════════════════

/** Encode a u64 as little-endian 8 bytes */
function encodeU64(value: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(value);
  return buf;
}

/** Encode an i64 as little-endian 8 bytes */
function encodeI64(value: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(value);
  return buf;
}

/** Encode a string as fixed-length bytes (padded with zeros) */
function encodeFixedString(str: string, length: number): Buffer {
  const buf = Buffer.alloc(length);
  buf.write(str, "utf-8");
  return buf;
}

// ════════════════════════════════════════════════════════════════
// CreateWallet
// ════════════════════════════════════════════════════════════════

export interface CreateWalletParams {
  /** The owner's public key (will sign the transaction) */
  owner: PublicKey;
  /** Optional funder public key — pays rent + tx fees.
   *  When omitted, owner pays (self-funded mode). */
  funder?: PublicKey;
  /** Maximum SOL that can be spent per day (in lamports) */
  dailyLimitLamports: bigint;
  /** Maximum SOL that can be spent per transaction (in lamports) */
  perTxLimitLamports: bigint;
  /** Program ID (defaults to SEAL_PROGRAM_ID) */
  programId?: PublicKey;
}

/**
 * Create a new SmartWallet PDA for the owner.
 *
 * Supports sponsored wallet creation: when `funder` is provided,
 * the funder pays rent and the owner just signs to prove intent.
 * When `funder` is omitted, owner pays everything (self-funded).
 *
 * Accounts:
 * 0. `[signer, writable]` Funder (pays rent)
 * 1. `[signer]` Owner (becomes wallet owner)
 * 2. `[writable]` SmartWallet PDA
 * 3. `[]` System Program
 */
export function createWalletInstruction(
  params: CreateWalletParams
): TransactionInstruction {
  const programId = params.programId ?? SEAL_PROGRAM_ID;
  const funder = params.funder ?? params.owner;
  const [walletPda, bump] = deriveWalletPda(params.owner, programId);

  const data = Buffer.concat([
    Buffer.from([InstructionDiscriminant.CreateWallet]),
    Buffer.from([bump]),
    encodeU64(params.dailyLimitLamports),
    encodeU64(params.perTxLimitLamports),
  ]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: funder, isSigner: true, isWritable: true },
      { pubkey: params.owner, isSigner: true, isWritable: false },
      { pubkey: walletPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ════════════════════════════════════════════════════════════════
// RegisterAgent
// ════════════════════════════════════════════════════════════════

export interface RegisterAgentParams {
  /** The owner's public key (must sign) */
  owner: PublicKey;
  /** The agent's public key (identifies the agent) */
  agent: PublicKey;
  /** Human-readable name for the agent (max 32 chars) */
  name: string;
  /** Programs the agent is allowed to call via CPI */
  allowedPrograms?: PublicKey[];
  /** Instruction discriminators the agent is allowed to invoke (8 bytes each) */
  allowedInstructions?: Buffer[];
  /** Maximum SOL the agent can spend per day (in lamports) */
  dailyLimitLamports: bigint;
  /** Maximum SOL the agent can spend per transaction (in lamports) */
  perTxLimitLamports: bigint;
  /** Default session duration in seconds */
  defaultSessionDurationSecs?: bigint;
  /** Maximum session duration in seconds */
  maxSessionDurationSecs?: bigint;
  /** Program ID (defaults to SEAL_PROGRAM_ID) */
  programId?: PublicKey;
}

/**
 * Register a new agent on the SmartWallet.
 *
 * Accounts:
 * 0. `[signer, writable]` Owner
 * 1. `[writable]` SmartWallet PDA
 * 2. `[writable]` AgentConfig PDA
 * 3. `[]` System Program
 */
export function registerAgentInstruction(
  params: RegisterAgentParams
): TransactionInstruction {
  const programId = params.programId ?? SEAL_PROGRAM_ID;
  const [walletPda] = deriveWalletPda(params.owner, programId);
  const [agentPda, bump] = deriveAgentPda(walletPda, params.agent, programId);

  const allowedPrograms = params.allowedPrograms ?? [];
  const allowedInstructions = params.allowedInstructions ?? [];
  const defaultSessionDuration = params.defaultSessionDurationSecs ?? BigInt(24 * 60 * 60);
  const maxSessionDuration = params.maxSessionDurationSecs ?? BigInt(7 * 24 * 60 * 60);

  const data = Buffer.concat([
    Buffer.from([InstructionDiscriminant.RegisterAgent]),
    Buffer.from([bump]),
    params.agent.toBuffer(),
    encodeFixedString(params.name, MAX_AGENT_NAME_LENGTH),
    Buffer.from([allowedPrograms.length]),
    Buffer.concat(allowedPrograms.map((p) => p.toBuffer())),
    Buffer.from([allowedInstructions.length]),
    Buffer.concat(allowedInstructions),
    encodeU64(params.dailyLimitLamports),
    encodeU64(params.perTxLimitLamports),
    encodeI64(defaultSessionDuration),
    encodeI64(maxSessionDuration),
  ]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: params.owner, isSigner: true, isWritable: true },
      { pubkey: walletPda, isSigner: false, isWritable: true },
      { pubkey: agentPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ════════════════════════════════════════════════════════════════
// CreateSession
// ════════════════════════════════════════════════════════════════

export interface CreateSessionParams {
  /** The agent's public key (must sign) */
  agent: PublicKey;
  /** The wallet owner's public key (to derive wallet PDA) */
  walletOwner: PublicKey;
  /** Ephemeral keypair for this session (public key) */
  sessionPubkey: PublicKey;
  /** Session duration in seconds */
  durationSecs: bigint;
  /** Maximum total amount for this session (in lamports) */
  maxAmountLamports: bigint;
  /** Maximum amount per transaction (in lamports) */
  maxPerTxLamports: bigint;
  /** Program ID (defaults to SEAL_PROGRAM_ID) */
  programId?: PublicKey;
}

/**
 * Create a new session key for an agent.
 *
 * Accounts:
 * 0. `[signer, writable]` Agent (payer)
 * 1. `[]` SmartWallet PDA
 * 2. `[]` AgentConfig PDA
 * 3. `[writable]` SessionKey PDA
 * 4. `[]` System Program
 */
export function createSessionInstruction(
  params: CreateSessionParams
): TransactionInstruction {
  const programId = params.programId ?? SEAL_PROGRAM_ID;
  const [walletPda] = deriveWalletPda(params.walletOwner, programId);
  const [agentPda] = deriveAgentPda(walletPda, params.agent, programId);
  const [sessionPda, bump] = deriveSessionPda(
    walletPda,
    params.agent,
    params.sessionPubkey,
    programId
  );

  const data = Buffer.concat([
    Buffer.from([InstructionDiscriminant.CreateSessionKey]),
    Buffer.from([bump]),
    params.sessionPubkey.toBuffer(),
    encodeI64(params.durationSecs),
    encodeU64(params.maxAmountLamports),
    encodeU64(params.maxPerTxLamports),
  ]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: params.agent, isSigner: true, isWritable: true },
      { pubkey: walletPda, isSigner: false, isWritable: false },
      { pubkey: agentPda, isSigner: false, isWritable: false },
      { pubkey: sessionPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ════════════════════════════════════════════════════════════════
// RevokeSession
// ════════════════════════════════════════════════════════════════

export interface RevokeSessionParams {
  /** The signer (owner or agent can revoke) */
  authority: PublicKey;
  /** The wallet owner's public key (to derive wallet PDA) */
  walletOwner: PublicKey;
  /** The agent's public key */
  agent: PublicKey;
  /** The session's ephemeral public key */
  sessionPubkey: PublicKey;
  /** Program ID (defaults to SEAL_PROGRAM_ID) */
  programId?: PublicKey;
}

/**
 * Revoke a session key (owner or agent can do this).
 *
 * Accounts:
 * 0. `[signer]` Authority (owner or agent)
 * 1. `[writable]` SessionKey PDA
 * 2. `[]` SmartWallet PDA (to verify ownership)
 */
export function revokeSessionInstruction(
  params: RevokeSessionParams
): TransactionInstruction {
  const programId = params.programId ?? SEAL_PROGRAM_ID;
  const [walletPda] = deriveWalletPda(params.walletOwner, programId);
  const [sessionPda] = deriveSessionPda(
    walletPda,
    params.agent,
    params.sessionPubkey,
    programId
  );

  const data = Buffer.from([InstructionDiscriminant.RevokeSession]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: params.authority, isSigner: true, isWritable: false },
      { pubkey: sessionPda, isSigner: false, isWritable: true },
      { pubkey: walletPda, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ════════════════════════════════════════════════════════════════
// ExecuteViaSession (CRITICAL - Agent CPI execution)
// ════════════════════════════════════════════════════════════════

export interface ExecuteViaSessionParams {
  /** The session key (ephemeral keypair that signs the transaction) */
  sessionKey: PublicKey;
  /** The wallet owner's public key (to derive wallet PDA) */
  walletOwner: PublicKey;
  /** The agent's public key */
  agent: PublicKey;
  /** The session's ephemeral public key */
  sessionPubkey: PublicKey;
  /** The target program to CPI into */
  targetProgram: PublicKey;
  /** Amount for spending limit tracking (in lamports) - critical for enforcing limits */
  amountLamports: bigint;
  /** The instruction data to send to the target program */
  innerInstructionData: Buffer;
  /**
   * Additional accounts to pass through to the CPI.
   * The wallet PDA will automatically be added as a signer.
   */
  remainingAccounts: {
    pubkey: PublicKey;
    isSigner: boolean;
    isWritable: boolean;
  }[];
  /** Program ID (defaults to SEAL_PROGRAM_ID) */
  programId?: PublicKey;
}

/**
 * Execute a transaction via session key on behalf of the smart wallet.
 *
 * This is the CORE instruction for autonomous agent operations.
 * The session key signs, and the Seal program:
 * 1. Validates session validity (time, spending limits, allowed programs)
 * 2. Executes the inner CPI with wallet PDA as signer
 * 3. Updates spending counters
 *
 * Accounts:
 * 0. `[signer]`    Session Key — the ephemeral key that signs
 * 1. `[writable]`  SmartWallet PDA — spending state updates
 * 2. `[writable]`  AgentConfig PDA — tx_count / total_spent updates
 * 3. `[writable]`  SessionKey PDA — amount_spent updates
 * 4. `[]`          Target Program — the program being CPI'd into
 * 5..N `[varies]`  Remaining accounts — passed through to target CPI
 *
 * Data:
 * - `[0..8]  amount_lamports: u64` (LE) — amount for limit tracking
 * - `[8..]   inner_instruction_data: &[u8]` — data for the target CPI
 *
 * @example
 * ```typescript
 * // Execute a SPL Token transfer via session
 * const ix = executeViaSessionInstruction({
 *   sessionKey: sessionKeypair.publicKey,
 *   walletOwner: owner.publicKey,
 *   agent: agentKeypair.publicKey,
 *   sessionPubkey: sessionKeypair.publicKey,
 *   targetProgram: TOKEN_PROGRAM_ID,
 *   amountLamports: transferAmount,
 *   innerInstructionData: transferIxData,
 *   remainingAccounts: [
 *     { pubkey: walletPda, isSigner: false, isWritable: true },
 *     { pubkey: destination, isSigner: false, isWritable: true },
 *   ],
 * });
 * ```
 */
export function executeViaSessionInstruction(
  params: ExecuteViaSessionParams
): TransactionInstruction {
  const programId = params.programId ?? SEAL_PROGRAM_ID;
  const [walletPda] = deriveWalletPda(params.walletOwner, programId);
  const [agentPda] = deriveAgentPda(walletPda, params.agent, programId);
  const [sessionPda] = deriveSessionPda(
    walletPda,
    params.agent,
    params.sessionPubkey,
    programId
  );

  // Build instruction data: [discriminant(1)] + [amount(8)] + [inner_data(N)]
  const data = Buffer.concat([
    Buffer.from([InstructionDiscriminant.ExecuteViaSession]),
    encodeU64(params.amountLamports),
    params.innerInstructionData,
  ]);

  // Build account metas
  const keys = [
    // Required accounts for Seal validation
    { pubkey: params.sessionKey, isSigner: true, isWritable: false },
    { pubkey: walletPda, isSigner: false, isWritable: true },
    { pubkey: agentPda, isSigner: false, isWritable: true },
    { pubkey: sessionPda, isSigner: false, isWritable: true },
    { pubkey: params.targetProgram, isSigner: false, isWritable: false },
    // Remaining accounts passed through to CPI
    ...params.remainingAccounts.map((acc) => ({
      pubkey: acc.pubkey,
      isSigner: acc.isSigner,
      isWritable: acc.isWritable,
    })),
  ];

  return new TransactionInstruction({
    programId,
    keys,
    data,
  });
}

// ════════════════════════════════════════════════════════════════
// UpdateSpendingLimit
// ════════════════════════════════════════════════════════════════

export interface UpdateSpendingLimitParams {
  /** The owner's public key (must sign) */
  owner: PublicKey;
  /** New daily limit (in lamports) */
  newDailyLimitLamports: bigint;
  /** New per-transaction limit (in lamports) */
  newPerTxLimitLamports: bigint;
  /** Program ID (defaults to SEAL_PROGRAM_ID) */
  programId?: PublicKey;
}

/**
 * Update the spending limits on a SmartWallet.
 *
 * Accounts:
 * 0. `[signer]` Owner
 * 1. `[writable]` SmartWallet PDA
 */
export function updateSpendingLimitInstruction(
  params: UpdateSpendingLimitParams
): TransactionInstruction {
  const programId = params.programId ?? SEAL_PROGRAM_ID;
  const [walletPda] = deriveWalletPda(params.owner, programId);

  const data = Buffer.concat([
    Buffer.from([InstructionDiscriminant.UpdateSpendingLimit]),
    encodeU64(params.newDailyLimitLamports),
    encodeU64(params.newPerTxLimitLamports),
  ]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: params.owner, isSigner: true, isWritable: false },
      { pubkey: walletPda, isSigner: false, isWritable: true },
    ],
    data,
  });
}

// ════════════════════════════════════════════════════════════════
// AddGuardian
// ════════════════════════════════════════════════════════════════

export interface AddGuardianParams {
  /** The owner's public key (must sign) */
  owner: PublicKey;
  /** The guardian's public key to add */
  guardian: PublicKey;
  /** Program ID (defaults to SEAL_PROGRAM_ID) */
  programId?: PublicKey;
}

/**
 * Add a guardian to the SmartWallet for recovery.
 *
 * Accounts:
 * 0. `[signer]` Owner
 * 1. `[writable]` SmartWallet PDA
 */
export function addGuardianInstruction(
  params: AddGuardianParams
): TransactionInstruction {
  const programId = params.programId ?? SEAL_PROGRAM_ID;
  const [walletPda] = deriveWalletPda(params.owner, programId);

  const data = Buffer.concat([
    Buffer.from([InstructionDiscriminant.AddGuardian]),
    params.guardian.toBuffer(),
  ]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: params.owner, isSigner: true, isWritable: false },
      { pubkey: walletPda, isSigner: false, isWritable: true },
    ],
    data,
  });
}

// ════════════════════════════════════════════════════════════════
// DeregisterAgent
// ════════════════════════════════════════════════════════════════

export interface DeregisterAgentParams {
  /** The owner's public key (must sign) */
  owner: PublicKey;
  /** The agent's public key to deregister */
  agent: PublicKey;
  /** Program ID (defaults to SEAL_PROGRAM_ID) */
  programId?: PublicKey;
}

/**
 * Deregister an agent from the SmartWallet (returns rent).
 *
 * Accounts:
 * 0. `[signer, writable]` Owner (receives rent back)
 * 1. `[writable]` SmartWallet PDA
 * 2. `[writable]` AgentConfig PDA (will be closed)
 */
export function deregisterAgentInstruction(
  params: DeregisterAgentParams
): TransactionInstruction {
  const programId = params.programId ?? SEAL_PROGRAM_ID;
  const [walletPda] = deriveWalletPda(params.owner, programId);
  const [agentPda] = deriveAgentPda(walletPda, params.agent, programId);

  const data = Buffer.from([InstructionDiscriminant.DeregisterAgent]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: params.owner, isSigner: true, isWritable: true },
      { pubkey: walletPda, isSigner: false, isWritable: true },
      { pubkey: agentPda, isSigner: false, isWritable: true },
    ],
    data,
  });
}

// ════════════════════════════════════════════════════════════════
// RecoverWallet (Guardian-initiated owner rotation, m-of-n threshold)
// ════════════════════════════════════════════════════════════════

export interface RecoverWalletParams {
  /** Guardian public keys (must all sign - must each be registered) */
  guardians: PublicKey[];
  /** The wallet owner's public key (to derive wallet PDA) */
  walletOwner: PublicKey;
  /** The new owner's public key */
  newOwner: PublicKey;
  /** Program ID (defaults to SEAL_PROGRAM_ID) */
  programId?: PublicKey;
}

/**
 * Recover a wallet by rotating the owner key (guardian-initiated, m-of-n threshold).
 *
 * Multiple guardians must co-sign to reach the wallet's recovery_threshold.
 * All signing guardians must be unique and registered.
 *
 * Accounts:
 * 0..M `[signer]`   Guardians (M must be >= recovery_threshold)
 * M    `[writable]`  SmartWallet PDA
 *
 * Data:
 * - `[0..32] new_owner: Pubkey` — the new owner public key
 */
export function recoverWalletInstruction(
  params: RecoverWalletParams
): TransactionInstruction {
  const programId = params.programId ?? SEAL_PROGRAM_ID;
  const [walletPda] = deriveWalletPda(params.walletOwner, programId);

  const data = Buffer.concat([
    Buffer.from([InstructionDiscriminant.RecoverWallet]),
    params.newOwner.toBuffer(),
  ]);

  const keys = params.guardians.map((g) => ({
    pubkey: g,
    isSigner: true,
    isWritable: false,
  }));
  keys.push({ pubkey: walletPda, isSigner: false, isWritable: true });

  return new TransactionInstruction({
    programId,
    keys,
    data,
  });
}

// ════════════════════════════════════════════════════════════════
// CloseWallet
// ════════════════════════════════════════════════════════════════

export interface CloseWalletParams {
  /** The owner's public key (must sign) */
  owner: PublicKey;
  /** Program ID (defaults to SEAL_PROGRAM_ID) */
  programId?: PublicKey;
}

/**
 * Permanently close the SmartWallet (returns rent to owner).
 *
 * Requirements:
 * - All agents must be deregistered first (agent_count must be 0)
 * - Only the owner can close the wallet
 *
 * Accounts:
 * 0. `[signer, writable]` Owner (receives rent refund)
 * 1. `[writable]`         SmartWallet PDA (will be closed)
 */
export function closeWalletInstruction(
  params: CloseWalletParams
): TransactionInstruction {
  const programId = params.programId ?? SEAL_PROGRAM_ID;
  const [walletPda] = deriveWalletPda(params.owner, programId);

  const data = Buffer.from([InstructionDiscriminant.CloseWallet]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: params.owner, isSigner: true, isWritable: true },
      { pubkey: walletPda, isSigner: false, isWritable: true },
    ],
    data,
  });
}

// ════════════════════════════════════════════════════════════════
// LockWallet (Owner-only emergency lock/unlock)
// ════════════════════════════════════════════════════════════════

export interface LockWalletParams {
  /** The owner's public key (must sign) */
  owner: PublicKey;
  /** true to lock, false to unlock */
  lock: boolean;
  /** Program ID (defaults to SEAL_PROGRAM_ID) */
  programId?: PublicKey;
}

/**
 * Lock or unlock a wallet (owner-only emergency toggle).
 *
 * When locked, ALL agent operations via ExecuteViaSession are blocked.
 * The owner can unlock at any time.
 *
 * Accounts:
 * 0. `[signer]`    Owner
 * 1. `[writable]`  SmartWallet PDA
 *
 * Data:
 * - `[0] lock_flag: u8` — 1 = lock, 0 = unlock
 */
export function lockWalletInstruction(
  params: LockWalletParams
): TransactionInstruction {
  const programId = params.programId ?? SEAL_PROGRAM_ID;
  const [walletPda] = deriveWalletPda(params.owner, programId);

  const data = Buffer.from([
    InstructionDiscriminant.LockWallet,
    params.lock ? 1 : 0,
  ]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: params.owner, isSigner: true, isWritable: false },
      { pubkey: walletPda, isSigner: false, isWritable: true },
    ],
    data,
  });
}

// ════════════════════════════════════════════════════════════════
// RemoveGuardian (Owner-only)
// ════════════════════════════════════════════════════════════════

export interface RemoveGuardianParams {
  /** The owner's public key (must sign) */
  owner: PublicKey;
  /** Public key of the guardian to remove */
  guardian: PublicKey;
  /** Program ID (defaults to SEAL_PROGRAM_ID) */
  programId?: PublicKey;
}

/**
 * Remove a guardian from the wallet (owner-only).
 *
 * After removal, the recovery_threshold is automatically clamped
 * to the remaining guardian count so recovery remains possible.
 *
 * Accounts:
 * 0. `[signer]`    Owner
 * 1. `[writable]`  SmartWallet PDA
 *
 * Data:
 * - `[0..32] guardian_pubkey: Pubkey` — the guardian to remove
 */
export function removeGuardianInstruction(
  params: RemoveGuardianParams
): TransactionInstruction {
  const programId = params.programId ?? SEAL_PROGRAM_ID;
  const [walletPda] = deriveWalletPda(params.owner, programId);

  const data = Buffer.concat([
    Buffer.from([InstructionDiscriminant.RemoveGuardian]),
    params.guardian.toBuffer(),
  ]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: params.owner, isSigner: true, isWritable: false },
      { pubkey: walletPda, isSigner: false, isWritable: true },
    ],
    data,
  });
}

// ════════════════════════════════════════════════════════════════
// SetRecoveryThreshold (Owner-only)
// ════════════════════════════════════════════════════════════════

export interface SetRecoveryThresholdParams {
  /** The owner's public key (must sign) */
  owner: PublicKey;
  /** New recovery threshold (1 ≤ threshold ≤ guardian_count) */
  threshold: number;
  /** Program ID (defaults to SEAL_PROGRAM_ID) */
  programId?: PublicKey;
}

/**
 * Set the m-of-n recovery threshold (owner-only).
 *
 * Determines how many guardians must co-sign a RecoverWallet call.
 * Must be between 1 and the current guardian count.
 *
 * Accounts:
 * 0. `[signer]`    Owner
 * 1. `[writable]`  SmartWallet PDA
 *
 * Data:
 * - `[0] threshold: u8` — the new recovery threshold
 */
export function setRecoveryThresholdInstruction(
  params: SetRecoveryThresholdParams
): TransactionInstruction {
  const programId = params.programId ?? SEAL_PROGRAM_ID;
  const [walletPda] = deriveWalletPda(params.owner, programId);

  const data = Buffer.from([
    InstructionDiscriminant.SetRecoveryThreshold,
    params.threshold & 0xff,
  ]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: params.owner, isSigner: true, isWritable: false },
      { pubkey: walletPda, isSigner: false, isWritable: true },
    ],
    data,
  });
}

// ════════════════════════════════════════════════════════════════
// Convenience: Convert SOL to lamports
// ════════════════════════════════════════════════════════════════

export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * LAMPORTS_PER_SOL));
}

// ════════════════════════════════════════════════════════════════
// TransferLamports (Session-authorized wallet PDA → destination)
// ════════════════════════════════════════════════════════════════

export interface TransferLamportsParams {
  /** The session key (ephemeral keypair that signs the transaction) */
  sessionKey: PublicKey;
  /** The wallet owner's public key (to derive wallet PDA) */
  walletOwner: PublicKey;
  /** The agent's public key */
  agent: PublicKey;
  /** The session's ephemeral public key */
  sessionPubkey: PublicKey;
  /** Destination account to receive lamports */
  destination: PublicKey;
  /** Amount to transfer (in lamports) */
  amountLamports: bigint;
  /** Program ID (defaults to SEAL_PROGRAM_ID) */
  programId?: PublicKey;
}

/**
 * Transfer lamports from the Seal wallet PDA to a destination account.
 *
 * This solves the PDA ownership problem: since the wallet PDA is owned
 * by the Seal program (not SystemProgram), it cannot be used as a payer
 * in SystemProgram::Transfer. This instruction directly debits/credits
 * lamports, enforcing all spending limits.
 *
 * Use this to pre-fund a session signer before opening DLMM positions,
 * or to withdraw funds from the wallet PDA.
 *
 * Accounts:
 * 0. `[signer]`    Session Key
 * 1. `[writable]`  SmartWallet PDA (source)
 * 2. `[writable]`  AgentConfig PDA
 * 3. `[writable]`  SessionKey PDA
 * 4. `[writable]`  Destination
 *
 * Data:
 * - `[0..8] amount_lamports: u64` (LE)
 */
export function transferLamportsInstruction(
  params: TransferLamportsParams
): TransactionInstruction {
  const programId = params.programId ?? SEAL_PROGRAM_ID;
  const [walletPda] = deriveWalletPda(params.walletOwner, programId);
  const [agentPda] = deriveAgentPda(walletPda, params.agent, programId);
  const [sessionPda] = deriveSessionPda(
    walletPda,
    params.agent,
    params.sessionPubkey,
    programId
  );

  const data = Buffer.concat([
    Buffer.from([InstructionDiscriminant.TransferLamports]),
    encodeU64(params.amountLamports),
  ]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: params.sessionKey, isSigner: true, isWritable: false },
      { pubkey: walletPda, isSigner: false, isWritable: true },
      { pubkey: agentPda, isSigner: false, isWritable: true },
      { pubkey: sessionPda, isSigner: false, isWritable: true },
      { pubkey: params.destination, isSigner: false, isWritable: true },
    ],
    data,
  });
}
