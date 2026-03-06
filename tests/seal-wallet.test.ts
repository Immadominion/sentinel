/**
 * LiteSVM integration tests for Seal smart wallet.
 *
 * Uses litesvm to simulate the Solana runtime locally,
 * running the compiled SBF program against real-like conditions.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { LiteSVM, FailedTransactionMetadata, TransactionMetadata } from "litesvm";
import * as path from "path";

// ================================================================
// Constants — must match on-chain program
// ================================================================

const PROGRAM_ID = new PublicKey(
  "SentWaL1et111111111111111111111111111111111"
);

// Seeds
const WALLET_SEED = Buffer.from("seal");
const AGENT_SEED = Buffer.from("agent");
const SESSION_SEED = Buffer.from("session");

// Discriminators
const SMART_WALLET_DISCRIMINATOR = Buffer.from("SealWalt");
const SESSION_KEY_DISCRIMINATOR = Buffer.from("SealSess");
const AGENT_CONFIG_DISCRIMINATOR = Buffer.from("SealAgnt");

// Instruction discriminants (first byte)
const IX_CREATE_WALLET = 0;
const IX_REGISTER_AGENT = 1;
const IX_CREATE_SESSION = 2;
const IX_EXECUTE_VIA_SESSION = 3;
const IX_REVOKE_SESSION = 4;
const IX_UPDATE_SPENDING_LIMIT = 5;
const IX_ADD_GUARDIAN = 6;
const IX_RECOVER_WALLET = 7;
const IX_DEREGISTER_AGENT = 8;
const IX_CLOSE_WALLET = 9;
const IX_LOCK_WALLET = 10;

// Sizes
const MAX_GUARDIANS = 5;
const MAX_ALLOWED_PROGRAMS = 8;
const MAX_ALLOWED_INSTRUCTIONS = 16;

// ================================================================
// Helpers
// ================================================================

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

/** Derive wallet PDA */
function deriveWalletPda(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [WALLET_SEED, owner.toBuffer()],
    PROGRAM_ID
  );
}

/** Derive agent config PDA */
function deriveAgentPda(
  wallet: PublicKey,
  agent: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [AGENT_SEED, wallet.toBuffer(), agent.toBuffer()],
    PROGRAM_ID
  );
}

/** Derive session key PDA */
function deriveSessionPda(
  wallet: PublicKey,
  agent: PublicKey,
  sessionPubkey: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SESSION_SEED, wallet.toBuffer(), agent.toBuffer(), sessionPubkey.toBuffer()],
    PROGRAM_ID
  );
}

/** Build CreateWallet instruction data */
function buildCreateWalletData(
  bump: number,
  dailyLimit: bigint,
  perTxLimit: bigint
): Buffer {
  return Buffer.concat([
    Buffer.from([IX_CREATE_WALLET]),
    Buffer.from([bump]),
    encodeU64(dailyLimit),
    encodeU64(perTxLimit),
  ]);
}

/** Build RegisterAgent instruction data (minimal: 0 programs, 0 instructions) */
function buildRegisterAgentData(
  bump: number,
  agentPubkey: PublicKey,
  name: string,
  allowedPrograms: PublicKey[],
  allowedInstructions: Buffer[],
  dailyLimit: bigint,
  perTxLimit: bigint,
  defaultSessionDuration: bigint,
  maxSessionDuration: bigint
): Buffer {
  const nameBytes = Buffer.alloc(32);
  nameBytes.write(name, "utf-8");

  const programsCount = Buffer.from([allowedPrograms.length]);
  const programsData = Buffer.concat(
    allowedPrograms.map((p) => p.toBuffer())
  );

  const instructionsCount = Buffer.from([allowedInstructions.length]);
  const instructionsData = Buffer.concat(allowedInstructions);

  return Buffer.concat([
    Buffer.from([IX_REGISTER_AGENT]),
    Buffer.from([bump]),
    agentPubkey.toBuffer(),
    nameBytes,
    programsCount,
    programsData,
    instructionsCount,
    instructionsData,
    encodeU64(dailyLimit),
    encodeU64(perTxLimit),
    encodeI64(defaultSessionDuration),
    encodeI64(maxSessionDuration),
  ]);
}

/** Build CreateSession instruction data */
function buildCreateSessionData(
  bump: number,
  sessionPubkey: PublicKey,
  duration: bigint,
  maxAmount: bigint,
  maxPerTx: bigint
): Buffer {
  return Buffer.concat([
    Buffer.from([IX_CREATE_SESSION]),
    Buffer.from([bump]),
    sessionPubkey.toBuffer(),
    encodeI64(duration),
    encodeU64(maxAmount),
    encodeU64(maxPerTx),
  ]);
}

/** Build RevokeSession instruction data */
function buildRevokeSessionData(): Buffer {
  return Buffer.from([IX_REVOKE_SESSION]);
}

/** Build UpdateSpendingLimit instruction data */
function buildUpdateSpendingLimitData(
  newDailyLimit: bigint,
  newPerTxLimit: bigint
): Buffer {
  return Buffer.concat([
    Buffer.from([IX_UPDATE_SPENDING_LIMIT]),
    encodeU64(newDailyLimit),
    encodeU64(newPerTxLimit),
  ]);
}

/** Build AddGuardian instruction data */
function buildAddGuardianData(guardianPubkey: PublicKey): Buffer {
  return Buffer.concat([
    Buffer.from([IX_ADD_GUARDIAN]),
    guardianPubkey.toBuffer(),
  ]);
}

/** Build LockWallet instruction data */
function buildLockWalletData(lock: boolean): Buffer {
  return Buffer.concat([
    Buffer.from([IX_LOCK_WALLET]),
    Buffer.from([lock ? 1 : 0]),
  ]);
}

/** Build RecoverWallet instruction data */
function buildRecoverWalletData(newOwnerPubkey: PublicKey): Buffer {
  return Buffer.concat([
    Buffer.from([IX_RECOVER_WALLET]),
    newOwnerPubkey.toBuffer(),
  ]);
}

/** Build DeregisterAgent instruction data */
function buildDeregisterAgentData(): Buffer {
  return Buffer.from([IX_DEREGISTER_AGENT]);
}

/** Build CloseWallet instruction data */
function buildCloseWalletData(): Buffer {
  return Buffer.from([IX_CLOSE_WALLET]);
}

/** Send a transaction and expect success */
function sendTx(
  svm: LiteSVM,
  instructions: TransactionInstruction[],
  signers: Keypair[]
): TransactionMetadata {
  const tx = new Transaction();
  tx.recentBlockhash = svm.latestBlockhash();
  tx.add(...instructions);
  tx.sign(...signers);
  const result = svm.sendTransaction(tx);
  if (result instanceof FailedTransactionMetadata) {
    throw new Error(`Transaction failed: ${result.err()}`);
  }
  return result;
}

/** Send a transaction and expect failure */
function sendTxExpectFail(
  svm: LiteSVM,
  instructions: TransactionInstruction[],
  signers: Keypair[]
): FailedTransactionMetadata {
  const tx = new Transaction();
  tx.recentBlockhash = svm.latestBlockhash();
  tx.add(...instructions);
  tx.sign(...signers);
  const result = svm.sendTransaction(tx);
  if (!(result instanceof FailedTransactionMetadata)) {
    throw new Error("Transaction should have failed but succeeded");
  }
  return result;
}

// Path to the compiled .so
const PROGRAM_SO_PATH = path.resolve(
  __dirname,
  "../target/deploy/seal_wallet.so"
);

// ================================================================
// Test Suite
// ================================================================

describe("Seal Wallet", () => {
  let svm: LiteSVM;

  // Shared state
  let owner: Keypair;
  let walletPda: PublicKey;
  let walletBump: number;

  beforeAll(() => {
    // Create LiteSVM instance and load our program
    svm = new LiteSVM();
    svm.addProgramFromFile(PROGRAM_ID, PROGRAM_SO_PATH);

    // Create and fund the owner
    owner = Keypair.generate();
    svm.airdrop(owner.publicKey, BigInt(100 * LAMPORTS_PER_SOL));

    [walletPda, walletBump] = deriveWalletPda(owner.publicKey);
  });

  // ────────────────────────────────────────────────────────
  // CreateWallet
  // ────────────────────────────────────────────────────────

  describe("CreateWallet", () => {
    it("should create a wallet PDA with correct state", () => {
      const dailyLimit = BigInt(10 * LAMPORTS_PER_SOL);
      const perTxLimit = BigInt(1 * LAMPORTS_PER_SOL);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: true },  // funder
          { pubkey: owner.publicKey, isSigner: true, isWritable: false }, // owner (same as funder for self-funded)
          { pubkey: walletPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildCreateWalletData(walletBump, dailyLimit, perTxLimit),
      });

      sendTx(svm, [ix], [owner]);

      // Verify account was created
      const account = svm.getAccount(walletPda);
      expect(account).not.toBeNull();
      expect(account!.data.length).toBeGreaterThan(0);

      // Verify discriminator
      const data = Buffer.from(account!.data);
      expect(data.subarray(0, 8).toString()).toBe(
        SMART_WALLET_DISCRIMINATOR.toString()
      );

      // Verify owner (bytes 8-40)
      expect(data.subarray(8, 40)).toEqual(
        Buffer.from(owner.publicKey.toBuffer())
      );

      // Verify bump (byte 40)
      expect(data[40]).toBe(walletBump);

      // Verify daily limit (bytes 43-51, after nonce(8) + agent_count(1) + guardian_count(1) + guardians(160))
      // nonce at 41-48, agent_count at 49, guardian_count at 50, guardians at 51-210
      // daily_limit at 211-218, per_tx at 219-226
      const dailyLimitOffset = 8 + 32 + 1 + 8 + 1 + 1 + (MAX_GUARDIANS * 32);
      const readDailyLimit = data.readBigUInt64LE(dailyLimitOffset);
      expect(readDailyLimit).toBe(dailyLimit);

      const readPerTxLimit = data.readBigUInt64LE(dailyLimitOffset + 8);
      expect(readPerTxLimit).toBe(perTxLimit);
    });

    it("should reject creating wallet twice (already initialized)", () => {
      const dailyLimit = BigInt(10 * LAMPORTS_PER_SOL);
      const perTxLimit = BigInt(1 * LAMPORTS_PER_SOL);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: true },  // funder
          { pubkey: owner.publicKey, isSigner: true, isWritable: false }, // owner
          { pubkey: walletPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildCreateWalletData(walletBump, dailyLimit, perTxLimit),
      });

      sendTxExpectFail(svm, [ix], [owner]);
    });
  });

  // ────────────────────────────────────────────────────────
  // RegisterAgent
  // ────────────────────────────────────────────────────────

  describe("RegisterAgent", () => {
    let agentKeypair: Keypair;
    let agentPda: PublicKey;
    let agentBump: number;

    beforeAll(() => {
      agentKeypair = Keypair.generate();
      [agentPda, agentBump] = deriveAgentPda(walletPda, agentKeypair.publicKey);
    });

    it("should register an agent with scoped permissions", () => {
      const allowedPrograms = [SystemProgram.programId];
      const allowedInstructions: Buffer[] = []; // allow all instructions

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: true },
          { pubkey: agentPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildRegisterAgentData(
          agentBump,
          agentKeypair.publicKey,
          "TestAgent",
          allowedPrograms,
          allowedInstructions,
          BigInt(5 * LAMPORTS_PER_SOL),
          BigInt(1 * LAMPORTS_PER_SOL),
          3600n, // default session: 1 hour
          86400n // max session: 1 day
        ),
      });

      sendTx(svm, [ix], [owner]);

      // Verify account
      const account = svm.getAccount(agentPda);
      expect(account).not.toBeNull();

      const data = Buffer.from(account!.data);
      expect(data.subarray(0, 8).toString()).toBe(
        AGENT_CONFIG_DISCRIMINATOR.toString()
      );

      // Verify agent pubkey (offset: 8 + 32 + 32 = 72 for name, then bump at 104, is_active at 105)
      // wallet at 8, agent at 40, name at 72, bump at 104, is_active at 105
      expect(data.subarray(40, 72)).toEqual(
        Buffer.from(agentKeypair.publicKey.toBuffer())
      );

      // is_active (byte 105)
      expect(data[105]).toBe(1); // true
    });

    it("should reject if caller is not wallet owner", () => {
      const imposter = Keypair.generate();
      svm.airdrop(imposter.publicKey, BigInt(LAMPORTS_PER_SOL));
      const [imposterAgentPda, imposterAgentBump] = deriveAgentPda(
        walletPda,
        imposter.publicKey
      );

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: imposter.publicKey, isSigner: true, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: true },
          { pubkey: imposterAgentPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildRegisterAgentData(
          imposterAgentBump,
          imposter.publicKey,
          "Imposter",
          [],
          [],
          BigInt(1 * LAMPORTS_PER_SOL),
          BigInt(1 * LAMPORTS_PER_SOL),
          3600n,
          86400n
        ),
      });

      sendTxExpectFail(svm, [ix], [imposter]);
    });
  });

  // ────────────────────────────────────────────────────────
  // CreateSession
  // ────────────────────────────────────────────────────────

  describe("CreateSession", () => {
    let agentKeypair: Keypair;
    let agentPda: PublicKey;
    let agentBump: number;
    let sessionKeypair: Keypair;
    let sessionPda: PublicKey;
    let sessionBump: number;

    beforeAll(() => {
      // Register a dedicated agent for session tests
      agentKeypair = Keypair.generate();
      [agentPda, agentBump] = deriveAgentPda(walletPda, agentKeypair.publicKey);

      const regIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: true },
          { pubkey: agentPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildRegisterAgentData(
          agentBump,
          agentKeypair.publicKey,
          "SessionAgent",
          [SystemProgram.programId],
          [],
          BigInt(5 * LAMPORTS_PER_SOL),
          BigInt(1 * LAMPORTS_PER_SOL),
          3600n,
          86400n
        ),
      });

      sendTx(svm, [regIx], [owner]);

      // Fund agent so it can pay for transactions
      svm.airdrop(agentKeypair.publicKey, BigInt(5 * LAMPORTS_PER_SOL));

      // Prepare session keypair
      sessionKeypair = Keypair.generate();
      [sessionPda, sessionBump] = deriveSessionPda(
        walletPda,
        agentKeypair.publicKey,
        sessionKeypair.publicKey
      );
    });

    it("should create a session key with limits", () => {
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: agentKeypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: false },
          { pubkey: agentPda, isSigner: false, isWritable: false },
          { pubkey: sessionPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildCreateSessionData(
          sessionBump,
          sessionKeypair.publicKey,
          3600n, // 1 hour
          BigInt(2 * LAMPORTS_PER_SOL),
          BigInt(LAMPORTS_PER_SOL / 2)
        ),
      });

      sendTx(svm, [ix], [agentKeypair]);

      // Verify session created
      const account = svm.getAccount(sessionPda);
      expect(account).not.toBeNull();

      const data = Buffer.from(account!.data);
      expect(data.subarray(0, 8).toString()).toBe(
        SESSION_KEY_DISCRIMINATOR.toString()
      );

      // Verify session_pubkey (offset: 8 + 32 + 32 = 72)
      expect(data.subarray(72, 104)).toEqual(
        Buffer.from(sessionKeypair.publicKey.toBuffer())
      );
    });

    it("should reject if duration exceeds max", () => {
      const badSessionKeypair = Keypair.generate();
      const [badSessionPda, badSessionBump] = deriveSessionPda(
        walletPda,
        agentKeypair.publicKey,
        badSessionKeypair.publicKey
      );

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: agentKeypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: false },
          { pubkey: agentPda, isSigner: false, isWritable: false },
          { pubkey: badSessionPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildCreateSessionData(
          badSessionBump,
          badSessionKeypair.publicKey,
          100000n, // Exceeds max_session_duration of 86400
          BigInt(1 * LAMPORTS_PER_SOL),
          BigInt(LAMPORTS_PER_SOL / 2)
        ),
      });

      sendTxExpectFail(svm, [ix], [agentKeypair]);
    });
  });

  // ────────────────────────────────────────────────────────
  // RevokeSession
  // ────────────────────────────────────────────────────────

  describe("RevokeSession", () => {
    let agentKeypair: Keypair;
    let agentPda: PublicKey;
    let agentBump: number;

    beforeAll(() => {
      // Register a dedicated agent
      agentKeypair = Keypair.generate();
      [agentPda, agentBump] = deriveAgentPda(walletPda, agentKeypair.publicKey);

      const regIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: true },
          { pubkey: agentPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildRegisterAgentData(
          agentBump,
          agentKeypair.publicKey,
          "RevokeAgent",
          [SystemProgram.programId],
          [],
          BigInt(5 * LAMPORTS_PER_SOL),
          BigInt(1 * LAMPORTS_PER_SOL),
          3600n,
          86400n
        ),
      });
      sendTx(svm, [regIx], [owner]);

      // Fund agent
      svm.airdrop(agentKeypair.publicKey, BigInt(5 * LAMPORTS_PER_SOL));
    });

    it("should revoke a session (by owner)", () => {
      // Create a session
      const sessionKeypair = Keypair.generate();
      const [sessionPda, sessionBump] = deriveSessionPda(
        walletPda,
        agentKeypair.publicKey,
        sessionKeypair.publicKey
      );

      const createIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: agentKeypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: false },
          { pubkey: agentPda, isSigner: false, isWritable: false },
          { pubkey: sessionPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildCreateSessionData(
          sessionBump,
          sessionKeypair.publicKey,
          3600n,
          BigInt(2 * LAMPORTS_PER_SOL),
          BigInt(LAMPORTS_PER_SOL)
        ),
      });
      sendTx(svm, [createIx], [agentKeypair]);

      // Revoke by owner
      const revokeIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: sessionPda, isSigner: false, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: false },
        ],
        data: buildRevokeSessionData(),
      });
      sendTx(svm, [revokeIx], [owner]);

      // Verify is_revoked
      const account = svm.getAccount(sessionPda);
      const data = Buffer.from(account!.data);
      // is_revoked at offset: 8+32+32+32+1+8+8+8+8+8 = 145
      const isRevokedOffset =
        8 + 32 + 32 + 32 + 1 + 8 + 8 + 8 + 8 + 8;
      expect(data[isRevokedOffset]).toBe(1); // true
    });

    it("should revoke a session (by agent)", () => {
      // Create another session
      const sessionKeypair = Keypair.generate();
      const [sessionPda, sessionBump] = deriveSessionPda(
        walletPda,
        agentKeypair.publicKey,
        sessionKeypair.publicKey
      );

      const createIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: agentKeypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: false },
          { pubkey: agentPda, isSigner: false, isWritable: false },
          { pubkey: sessionPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildCreateSessionData(
          sessionBump,
          sessionKeypair.publicKey,
          3600n,
          BigInt(2 * LAMPORTS_PER_SOL),
          BigInt(LAMPORTS_PER_SOL)
        ),
      });
      sendTx(svm, [createIx], [agentKeypair]);

      // Revoke by agent
      const revokeIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: agentKeypair.publicKey, isSigner: true, isWritable: false },
          { pubkey: sessionPda, isSigner: false, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: false },
        ],
        data: buildRevokeSessionData(),
      });
      sendTx(svm, [revokeIx], [agentKeypair]);

      // Verify is_revoked
      const account = svm.getAccount(sessionPda);
      const data = Buffer.from(account!.data);
      const isRevokedOffset = 8 + 32 + 32 + 32 + 1 + 8 + 8 + 8 + 8 + 8;
      expect(data[isRevokedOffset]).toBe(1);
    });

    it("should reject revoke from unauthorized party", () => {
      // Create a session
      const sessionKeypair = Keypair.generate();
      const [sessionPda, sessionBump] = deriveSessionPda(
        walletPda,
        agentKeypair.publicKey,
        sessionKeypair.publicKey
      );

      const createIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: agentKeypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: false },
          { pubkey: agentPda, isSigner: false, isWritable: false },
          { pubkey: sessionPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildCreateSessionData(
          sessionBump,
          sessionKeypair.publicKey,
          3600n,
          BigInt(2 * LAMPORTS_PER_SOL),
          BigInt(LAMPORTS_PER_SOL)
        ),
      });
      sendTx(svm, [createIx], [agentKeypair]);

      // Try to revoke from random keypair
      const random = Keypair.generate();
      svm.airdrop(random.publicKey, BigInt(LAMPORTS_PER_SOL));
      const revokeIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: random.publicKey, isSigner: true, isWritable: false },
          { pubkey: sessionPda, isSigner: false, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: false },
        ],
        data: buildRevokeSessionData(),
      });

      sendTxExpectFail(svm, [revokeIx], [random]);
    });
  });

  // ────────────────────────────────────────────────────────
  // UpdateSpendingLimit
  // ────────────────────────────────────────────────────────

  describe("UpdateSpendingLimit", () => {
    it("should update spending limits (owner only)", () => {
      const newDaily = BigInt(20 * LAMPORTS_PER_SOL);
      const newPerTx = BigInt(2 * LAMPORTS_PER_SOL);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildUpdateSpendingLimitData(newDaily, newPerTx),
      });

      sendTx(svm, [ix], [owner]);

      // Verify updated limits
      const account = svm.getAccount(walletPda);
      const data = Buffer.from(account!.data);
      const dailyLimitOffset = 8 + 32 + 1 + 8 + 1 + 1 + (MAX_GUARDIANS * 32);
      expect(data.readBigUInt64LE(dailyLimitOffset)).toBe(newDaily);
      expect(data.readBigUInt64LE(dailyLimitOffset + 8)).toBe(newPerTx);
    });

    it("should reject if per_tx > daily", () => {
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildUpdateSpendingLimitData(
          BigInt(1 * LAMPORTS_PER_SOL),
          BigInt(2 * LAMPORTS_PER_SOL) // per_tx > daily
        ),
      });

      sendTxExpectFail(svm, [ix], [owner]);
    });

    it("should reject from non-owner", () => {
      const imposter = Keypair.generate();
      svm.airdrop(imposter.publicKey, BigInt(LAMPORTS_PER_SOL));

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: imposter.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildUpdateSpendingLimitData(
          BigInt(10 * LAMPORTS_PER_SOL),
          BigInt(1 * LAMPORTS_PER_SOL)
        ),
      });

      sendTxExpectFail(svm, [ix], [imposter]);
    });
  });

  // ────────────────────────────────────────────────────────
  // AddGuardian
  // ────────────────────────────────────────────────────────

  describe("AddGuardian", () => {
    it("should add a guardian", () => {
      const guardian = Keypair.generate();

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildAddGuardianData(guardian.publicKey),
      });

      sendTx(svm, [ix], [owner]);

      // Verify guardian_count incremented
      const account = svm.getAccount(walletPda);
      const data = Buffer.from(account!.data);
      // guardian_count at offset 8+32+1+8+1 = 50
      expect(data[50]).toBe(1);

      // Verify guardian pubkey at offset 51
      expect(data.subarray(51, 83)).toEqual(
        Buffer.from(guardian.publicKey.toBuffer())
      );
    });

    it("should reject duplicate guardian", () => {
      // Read current guardian
      const account = svm.getAccount(walletPda);
      const data = Buffer.from(account!.data);
      const existingGuardian = new PublicKey(data.subarray(51, 83));

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildAddGuardianData(existingGuardian),
      });

      sendTxExpectFail(svm, [ix], [owner]);
    });

    it("should reject zero-address guardian", () => {
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildAddGuardianData(PublicKey.default),
      });

      sendTxExpectFail(svm, [ix], [owner]);
    });
  });

  // ────────────────────────────────────────────────────────
  // ExecuteViaSession (CPI — full flow)
  // ────────────────────────────────────────────────────────

  describe("ExecuteViaSession", () => {
    // SPL Memo v3 (loaded by default in litesvm)
    const MEMO_PROGRAM_ID = new PublicKey(
      "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
    );

    let cpiAgent: Keypair;
    let cpiAgentPda: PublicKey;
    let cpiAgentBump: number;
    let cpiSession: Keypair;
    let cpiSessionPda: PublicKey;
    let cpiSessionBump: number;

    beforeAll(() => {
      // Register agent with Memo program explicitly allowed (default-closed)
      cpiAgent = Keypair.generate();
      [cpiAgentPda, cpiAgentBump] = deriveAgentPda(walletPda, cpiAgent.publicKey);

      const regIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: true },
          { pubkey: cpiAgentPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildRegisterAgentData(
          cpiAgentBump,
          cpiAgent.publicKey,
          "CPIAgent",
          [MEMO_PROGRAM_ID],   // explicitly allow Memo program (default-closed)
          [],   // allow ALL instructions on allowed programs
          BigInt(10 * LAMPORTS_PER_SOL),
          BigInt(2 * LAMPORTS_PER_SOL),
          3600n,
          86400n
        ),
      });
      sendTx(svm, [regIx], [owner]);

      // Fund agent so it can pay tx fees
      svm.airdrop(cpiAgent.publicKey, BigInt(5 * LAMPORTS_PER_SOL));

      // Create session key
      cpiSession = Keypair.generate();
      [cpiSessionPda, cpiSessionBump] = deriveSessionPda(
        walletPda,
        cpiAgent.publicKey,
        cpiSession.publicKey
      );

      const sessionIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: cpiAgent.publicKey, isSigner: true, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: false },
          { pubkey: cpiAgentPda, isSigner: false, isWritable: false },
          { pubkey: cpiSessionPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildCreateSessionData(
          cpiSessionBump,
          cpiSession.publicKey,
          3600n, // 1 hour
          BigInt(5 * LAMPORTS_PER_SOL), // max total
          BigInt(2 * LAMPORTS_PER_SOL) // max per tx
        ),
      });
      sendTx(svm, [sessionIx], [cpiAgent]);

      // Fund session key so it can pay tx fees
      svm.airdrop(cpiSession.publicKey, BigInt(5 * LAMPORTS_PER_SOL));
    });

    /** Build ExecuteViaSession instruction data */
    function buildExecuteViaSessionData(
      amountLamports: bigint,
      innerInstructionData: Buffer
    ): Buffer {
      return Buffer.concat([
        Buffer.from([IX_EXECUTE_VIA_SESSION]),
        encodeU64(amountLamports),
        innerInstructionData,
      ]);
    }

    it("should execute a Memo CPI via session key", () => {
      // Use SPL Memo (signer-validated): wallet PDA signs a memo via CPI
      const memoText = Buffer.from("Hello from Seal wallet!");
      const data = buildExecuteViaSessionData(0n, memoText);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          // [0] session key signer
          { pubkey: cpiSession.publicKey, isSigner: true, isWritable: false },
          // [1] wallet PDA (writable for spending state)
          { pubkey: walletPda, isSigner: false, isWritable: true },
          // [2] agent config PDA (writable for tx_count)
          { pubkey: cpiAgentPda, isSigner: false, isWritable: true },
          // [3] session key PDA (writable for amount_spent)
          { pubkey: cpiSessionPda, isSigner: false, isWritable: true },
          // [4] target program = SPL Memo
          { pubkey: MEMO_PROGRAM_ID, isSigner: false, isWritable: false },
          // CPI passthrough:
          // [5] wallet PDA as signer (promoted by our program via invoke_signed)
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data,
      });

      sendTx(svm, [ix], [cpiSession]);

      // Verify wallet nonce was incremented (from 0 to 1)
      const walletAcc = svm.getAccount(walletPda)!;
      const walletData = Buffer.from(walletAcc.data);
      // nonce at offset 8+32+1 = 41
      expect(walletData.readBigUInt64LE(41)).toBe(1n);

      // Verify agent tx_count incremented
      const agentAcc = svm.getAccount(cpiAgentPda)!;
      const agentData = Buffer.from(agentAcc.data);
      // AgentConfig SIZE = 8+32+32+32+1+1+1+(8*32)+1+(16*8)+8+8+8+8+8+8 = 540
      // total_spent at offset 524, tx_count at offset 532
      expect(agentData.readBigUInt64LE(532)).toBe(1n);

      // Verify session amount_spent updated (0n since amount tracked = 0)
      const sessionAcc = svm.getAccount(cpiSessionPda)!;
      const sessionData = Buffer.from(sessionAcc.data);
      // amount_spent at offset: 8+32+32+32+1+8+8+8 = 129
      const amountSpentOffset = 8 + 32 + 32 + 32 + 1 + 8 + 8 + 8;
      expect(sessionData.readBigUInt64LE(amountSpentOffset)).toBe(0n);
    });

    it("should track spending across multiple executions", () => {
      // Execute a second CPI with amount tracking
      const memoText = Buffer.from("Tracked tx");
      const trackedAmount = BigInt(LAMPORTS_PER_SOL);
      const data = buildExecuteViaSessionData(trackedAmount, memoText);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: cpiSession.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
          { pubkey: cpiAgentPda, isSigner: false, isWritable: true },
          { pubkey: cpiSessionPda, isSigner: false, isWritable: true },
          { pubkey: MEMO_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data,
      });

      sendTx(svm, [ix], [cpiSession]);

      // Wallet nonce should be 2 now (second execution)
      const walletAcc = svm.getAccount(walletPda)!;
      const walletData = Buffer.from(walletAcc.data);
      expect(walletData.readBigUInt64LE(41)).toBe(2n);

      // Agent tx_count should be 2
      const agentAcc = svm.getAccount(cpiAgentPda)!;
      const agentData = Buffer.from(agentAcc.data);
      expect(agentData.readBigUInt64LE(532)).toBe(2n);

      // Session amount_spent should be 1 SOL (0 from first + 1 SOL from this)
      const sessionAcc = svm.getAccount(cpiSessionPda)!;
      const sessionData = Buffer.from(sessionAcc.data);
      const amountSpentOffset = 8 + 32 + 32 + 32 + 1 + 8 + 8 + 8;
      expect(sessionData.readBigUInt64LE(amountSpentOffset)).toBe(trackedAmount);

      // Wallet spent_today should be 1 SOL
      const dailyLimitOffset = 8 + 32 + 1 + 8 + 1 + 1 + (MAX_GUARDIANS * 32);
      const spentTodayOffset = dailyLimitOffset + 16; // after daily_limit(8) + per_tx_limit(8)
      expect(walletData.readBigUInt64LE(spentTodayOffset)).toBe(trackedAmount);
    });

    it("should reject if amount exceeds session per-tx limit", () => {
      const memoText = Buffer.from("Over limit");
      const excessAmount = BigInt(3 * LAMPORTS_PER_SOL); // > 2 SOL per-tx limit

      const data = buildExecuteViaSessionData(excessAmount, memoText);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: cpiSession.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
          { pubkey: cpiAgentPda, isSigner: false, isWritable: true },
          { pubkey: cpiSessionPda, isSigner: false, isWritable: true },
          { pubkey: MEMO_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data,
      });

      sendTxExpectFail(svm, [ix], [cpiSession]);
    });

    it("should reject if target program is not in allowed list", () => {
      // Register a RESTRICTED agent (only allows SystemProgram)
      const restrictedAgent = Keypair.generate();
      const [restrictedAgentPda, restrictedAgentBump] = deriveAgentPda(
        walletPda,
        restrictedAgent.publicKey
      );

      const regIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: true },
          { pubkey: restrictedAgentPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildRegisterAgentData(
          restrictedAgentBump,
          restrictedAgent.publicKey,
          "Restricted",
          [SystemProgram.programId], // ONLY allow System Program
          [],
          BigInt(10 * LAMPORTS_PER_SOL),
          BigInt(2 * LAMPORTS_PER_SOL),
          3600n,
          86400n
        ),
      });
      sendTx(svm, [regIx], [owner]);

      // Fund and create session for restricted agent
      svm.airdrop(restrictedAgent.publicKey, BigInt(5 * LAMPORTS_PER_SOL));

      const restrictedSession = Keypair.generate();
      const [restrictedSessionPda, restrictedSessionBump] = deriveSessionPda(
        walletPda,
        restrictedAgent.publicKey,
        restrictedSession.publicKey
      );

      const sessionIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: restrictedAgent.publicKey, isSigner: true, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: false },
          { pubkey: restrictedAgentPda, isSigner: false, isWritable: false },
          { pubkey: restrictedSessionPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildCreateSessionData(
          restrictedSessionBump,
          restrictedSession.publicKey,
          3600n,
          BigInt(5 * LAMPORTS_PER_SOL),
          BigInt(2 * LAMPORTS_PER_SOL)
        ),
      });
      sendTx(svm, [sessionIx], [restrictedAgent]);

      svm.airdrop(restrictedSession.publicKey, BigInt(LAMPORTS_PER_SOL));

      // Try CPI to Memo (NOT in restricted agent's allowed list)
      const memoText = Buffer.from("Blocked!");
      const data = buildExecuteViaSessionData(0n, memoText);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: restrictedSession.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
          { pubkey: restrictedAgentPda, isSigner: false, isWritable: true },
          { pubkey: restrictedSessionPda, isSigner: false, isWritable: true },
          { pubkey: MEMO_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data,
      });

      sendTxExpectFail(svm, [ix], [restrictedSession]);
    });
  });

  // ────────────────────────────────────────────────────────
  // LockWallet
  // ────────────────────────────────────────────────────────

  describe("LockWallet", () => {
    it("should lock and unlock the wallet (owner only)", () => {
      // Lock
      const lockIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildLockWalletData(true),
      });
      sendTx(svm, [lockIx], [owner]);

      // Verify is_locked (offset: 8+32+1+8+1+1+160+8+8+8+8 = 243)
      let account = svm.getAccount(walletPda);
      let data = Buffer.from(account!.data);
      const isLockedOffset = 8 + 32 + 1 + 8 + 1 + 1 + (MAX_GUARDIANS * 32) + 8 + 8 + 8 + 8;
      expect(data[isLockedOffset]).toBe(1); // locked

      // Unlock
      const unlockIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildLockWalletData(false),
      });
      sendTx(svm, [unlockIx], [owner]);

      account = svm.getAccount(walletPda);
      data = Buffer.from(account!.data);
      expect(data[isLockedOffset]).toBe(0); // unlocked
    });

    it("should reject lock from non-owner", () => {
      const imposter = Keypair.generate();
      svm.airdrop(imposter.publicKey, BigInt(LAMPORTS_PER_SOL));

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: imposter.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildLockWalletData(true),
      });

      sendTxExpectFail(svm, [ix], [imposter]);
    });

    it("should reject invalid lock flag", () => {
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: Buffer.concat([
          Buffer.from([IX_LOCK_WALLET]),
          Buffer.from([2]), // invalid — must be 0 or 1
        ]),
      });

      sendTxExpectFail(svm, [ix], [owner]);
    });
  });

  // ────────────────────────────────────────────────────────
  // RecoverWallet
  // ────────────────────────────────────────────────────────

  describe("RecoverWallet", () => {
    // Use a separate wallet so we don't corrupt shared state.
    let recoveryOwner: Keypair;
    let recoveryWalletPda: PublicKey;
    let recoveryWalletBump: number;
    let guardian: Keypair;

    beforeAll(() => {
      recoveryOwner = Keypair.generate();
      svm.airdrop(recoveryOwner.publicKey, BigInt(10 * LAMPORTS_PER_SOL));
      [recoveryWalletPda, recoveryWalletBump] = deriveWalletPda(recoveryOwner.publicKey);

      // Create wallet
      const createIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: recoveryOwner.publicKey, isSigner: true, isWritable: true },
          { pubkey: recoveryOwner.publicKey, isSigner: true, isWritable: false },
          { pubkey: recoveryWalletPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildCreateWalletData(
          recoveryWalletBump,
          BigInt(10 * LAMPORTS_PER_SOL),
          BigInt(1 * LAMPORTS_PER_SOL)
        ),
      });
      sendTx(svm, [createIx], [recoveryOwner]);

      // Add guardian
      guardian = Keypair.generate();
      svm.airdrop(guardian.publicKey, BigInt(LAMPORTS_PER_SOL));

      const guardianIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: recoveryOwner.publicKey, isSigner: true, isWritable: false },
          { pubkey: recoveryWalletPda, isSigner: false, isWritable: true },
        ],
        data: buildAddGuardianData(guardian.publicKey),
      });
      sendTx(svm, [guardianIx], [recoveryOwner]);
    });

    it("should allow guardian to rotate owner", () => {
      const newOwner = Keypair.generate();

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: guardian.publicKey, isSigner: true, isWritable: false },
          { pubkey: recoveryWalletPda, isSigner: false, isWritable: true },
        ],
        data: buildRecoverWalletData(newOwner.publicKey),
      });
      sendTx(svm, [ix], [guardian]);

      // Verify owner changed
      const account = svm.getAccount(recoveryWalletPda);
      const data = Buffer.from(account!.data);
      expect(data.subarray(8, 40)).toEqual(
        Buffer.from(newOwner.publicKey.toBuffer())
      );
    });

    it("should reject recovery from non-guardian", () => {
      const random = Keypair.generate();
      svm.airdrop(random.publicKey, BigInt(LAMPORTS_PER_SOL));
      const newOwner = Keypair.generate();

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: random.publicKey, isSigner: true, isWritable: false },
          { pubkey: recoveryWalletPda, isSigner: false, isWritable: true },
        ],
        data: buildRecoverWalletData(newOwner.publicKey),
      });

      sendTxExpectFail(svm, [ix], [random]);
    });
  });

  // ────────────────────────────────────────────────────────
  // DeregisterAgent + CloseWallet
  // ────────────────────────────────────────────────────────

  describe("DeregisterAgent & CloseWallet", () => {
    let closeOwner: Keypair;
    let closeWalletPda: PublicKey;
    let closeWalletBump: number;
    let closeAgent: Keypair;
    let closeAgentPda: PublicKey;
    let closeAgentBump: number;

    beforeAll(() => {
      closeOwner = Keypair.generate();
      svm.airdrop(closeOwner.publicKey, BigInt(10 * LAMPORTS_PER_SOL));
      [closeWalletPda, closeWalletBump] = deriveWalletPda(closeOwner.publicKey);

      // Create wallet
      const createIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: closeOwner.publicKey, isSigner: true, isWritable: true },
          { pubkey: closeOwner.publicKey, isSigner: true, isWritable: false },
          { pubkey: closeWalletPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildCreateWalletData(
          closeWalletBump,
          BigInt(10 * LAMPORTS_PER_SOL),
          BigInt(1 * LAMPORTS_PER_SOL)
        ),
      });
      sendTx(svm, [createIx], [closeOwner]);

      // Register an agent
      closeAgent = Keypair.generate();
      [closeAgentPda, closeAgentBump] = deriveAgentPda(closeWalletPda, closeAgent.publicKey);

      const regIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: closeOwner.publicKey, isSigner: true, isWritable: true },
          { pubkey: closeWalletPda, isSigner: false, isWritable: true },
          { pubkey: closeAgentPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildRegisterAgentData(
          closeAgentBump,
          closeAgent.publicKey,
          "CloseAgent",
          [SystemProgram.programId],
          [],
          BigInt(5 * LAMPORTS_PER_SOL),
          BigInt(1 * LAMPORTS_PER_SOL),
          3600n,
          86400n
        ),
      });
      sendTx(svm, [regIx], [closeOwner]);
    });

    it("should reject closing wallet with agents still registered", () => {
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: closeOwner.publicKey, isSigner: true, isWritable: true },
          { pubkey: closeWalletPda, isSigner: false, isWritable: true },
        ],
        data: buildCloseWalletData(),
      });

      sendTxExpectFail(svm, [ix], [closeOwner]);
    });

    it("should deregister an agent and return rent", () => {
      const ownerBalanceBefore = svm.getBalance(closeOwner.publicKey);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: closeOwner.publicKey, isSigner: true, isWritable: true },
          { pubkey: closeWalletPda, isSigner: false, isWritable: true },
          { pubkey: closeAgentPda, isSigner: false, isWritable: true },
        ],
        data: buildDeregisterAgentData(),
      });
      sendTx(svm, [ix], [closeOwner]);

      // Agent account should be closed
      const agentAccount = svm.getAccount(closeAgentPda);
      expect(agentAccount?.data.length ?? 0).toBe(0);

      // Verify agent_count decremented (offset 49)
      const walletAccount = svm.getAccount(closeWalletPda);
      const walletData = Buffer.from(walletAccount!.data);
      expect(walletData[49]).toBe(0); // agent_count = 0
    });

    it("should close wallet after all agents are removed", () => {
      // Expire the current blockhash to avoid AlreadyProcessed collision
      svm.expireBlockhash();

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: closeOwner.publicKey, isSigner: true, isWritable: true },
          { pubkey: closeWalletPda, isSigner: false, isWritable: true },
        ],
        data: buildCloseWalletData(),
      });
      sendTx(svm, [ix], [closeOwner]);

      // Wallet account should be closed (zeroed)
      const walletAccount = svm.getAccount(closeWalletPda);
      expect(walletAccount?.data.length ?? 0).toBe(0);
    });
  });

  // ────────────────────────────────────────────────────────
  // Default-Closed Allowlist
  // ────────────────────────────────────────────────────────

  describe("Default-Closed Allowlist", () => {
    it("should reject CPI when agent has no allowed programs", () => {
      const MEMO_PROGRAM_ID = new PublicKey(
        "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
      );

      // Create a separate wallet for this test
      const noAllowOwner = Keypair.generate();
      svm.airdrop(noAllowOwner.publicKey, BigInt(10 * LAMPORTS_PER_SOL));
      const [noAllowWalletPda, noAllowWalletBump] = deriveWalletPda(noAllowOwner.publicKey);

      const createIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: noAllowOwner.publicKey, isSigner: true, isWritable: true },
          { pubkey: noAllowOwner.publicKey, isSigner: true, isWritable: false },
          { pubkey: noAllowWalletPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildCreateWalletData(
          noAllowWalletBump,
          BigInt(10 * LAMPORTS_PER_SOL),
          BigInt(2 * LAMPORTS_PER_SOL)
        ),
      });
      sendTx(svm, [createIx], [noAllowOwner]);

      // Register agent with NO allowed programs (default-closed = blocked)
      const noAllowAgent = Keypair.generate();
      const [noAllowAgentPda, noAllowAgentBump] = deriveAgentPda(
        noAllowWalletPda,
        noAllowAgent.publicKey
      );

      const regIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: noAllowOwner.publicKey, isSigner: true, isWritable: true },
          { pubkey: noAllowWalletPda, isSigner: false, isWritable: true },
          { pubkey: noAllowAgentPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildRegisterAgentData(
          noAllowAgentBump,
          noAllowAgent.publicKey,
          "NoAllowAgent",
          [],   // NO programs = default-closed
          [],
          BigInt(5 * LAMPORTS_PER_SOL),
          BigInt(1 * LAMPORTS_PER_SOL),
          3600n,
          86400n
        ),
      });
      sendTx(svm, [regIx], [noAllowOwner]);

      svm.airdrop(noAllowAgent.publicKey, BigInt(5 * LAMPORTS_PER_SOL));

      // Create session
      const noAllowSession = Keypair.generate();
      const [noAllowSessionPda, noAllowSessionBump] = deriveSessionPda(
        noAllowWalletPda,
        noAllowAgent.publicKey,
        noAllowSession.publicKey
      );

      const sessionIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: noAllowAgent.publicKey, isSigner: true, isWritable: true },
          { pubkey: noAllowWalletPda, isSigner: false, isWritable: false },
          { pubkey: noAllowAgentPda, isSigner: false, isWritable: false },
          { pubkey: noAllowSessionPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildCreateSessionData(
          noAllowSessionBump,
          noAllowSession.publicKey,
          3600n,
          BigInt(5 * LAMPORTS_PER_SOL),
          BigInt(1 * LAMPORTS_PER_SOL)  // must be <= agent per_tx_limit (1 SOL)
        ),
      });
      sendTx(svm, [sessionIx], [noAllowAgent]);
      svm.airdrop(noAllowSession.publicKey, BigInt(LAMPORTS_PER_SOL));

      // Try to CPI to Memo — should FAIL (no programs allowed)
      const memoText = Buffer.from("Should be blocked!");
      const execData = Buffer.concat([
        Buffer.from([IX_EXECUTE_VIA_SESSION]),
        encodeU64(0n),
        memoText,
      ]);

      const execIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: noAllowSession.publicKey, isSigner: true, isWritable: false },
          { pubkey: noAllowWalletPda, isSigner: false, isWritable: true },
          { pubkey: noAllowAgentPda, isSigner: false, isWritable: true },
          { pubkey: noAllowSessionPda, isSigner: false, isWritable: true },
          { pubkey: MEMO_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: noAllowWalletPda, isSigner: false, isWritable: true },
        ],
        data: execData,
      });

      sendTxExpectFail(svm, [execIx], [noAllowSession]);
    });
  });
});
