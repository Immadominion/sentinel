/**
 * LiteSVM integration tests for Sentinel smart wallet.
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
const WALLET_SEED = Buffer.from("sentinel");
const AGENT_SEED = Buffer.from("agent");
const SESSION_SEED = Buffer.from("session");

// Discriminators
const SMART_WALLET_DISCRIMINATOR = Buffer.from("SentWalt");
const SESSION_KEY_DISCRIMINATOR = Buffer.from("SentSess");
const AGENT_CONFIG_DISCRIMINATOR = Buffer.from("SentAgnt");

// Instruction discriminants (first byte)
const IX_CREATE_WALLET = 0;
const IX_REGISTER_AGENT = 1;
const IX_CREATE_SESSION = 2;
const IX_EXECUTE_VIA_SESSION = 3;
const IX_REVOKE_SESSION = 4;
const IX_UPDATE_SPENDING_LIMIT = 5;
const IX_ADD_GUARDIAN = 6;

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
  "../target/deploy/sentinel_wallet.so"
);

// ================================================================
// Test Suite
// ================================================================

describe("Sentinel Wallet", () => {
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
          { pubkey: owner.publicKey, isSigner: true, isWritable: true },
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
          { pubkey: owner.publicKey, isSigner: true, isWritable: true },
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
      // Register agent with allow-all programs (count=0)
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
          [],   // allow ALL programs (count=0 → no restriction)
          [],   // allow ALL instructions
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
      const memoText = Buffer.from("Hello from Sentinel wallet!");
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
});
