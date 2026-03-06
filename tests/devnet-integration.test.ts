/**
 * Devnet Integration Tests for Seal Smart Wallet
 *
 * Tests all 13 instructions against the LIVE deployed program on devnet.
 * Uses real Solana transactions — requires funded wallet.
 *
 * Run: npx vitest run devnet-integration.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

// ================================================================
// Config
// ================================================================

const PROGRAM_ID = new PublicKey(
  "EV3TKRVz7pTHpAqBTjP8jmwuvoRBRCpjmVSPHhcMnXqb"
);

const RPC_URL = "https://api.devnet.solana.com";
const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

// Seeds
const WALLET_SEED = Buffer.from("seal");
const AGENT_SEED = Buffer.from("agent");
const SESSION_SEED = Buffer.from("session");

// Discriminators
const SMART_WALLET_DISCRIMINATOR = Buffer.from("SealWalt");
const SESSION_KEY_DISCRIMINATOR = Buffer.from("SealSess");
const AGENT_CONFIG_DISCRIMINATOR = Buffer.from("SealAgnt");

// Instruction discriminants
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
const IX_REMOVE_GUARDIAN = 11;
const IX_SET_RECOVERY_THRESHOLD = 12;

const MAX_GUARDIANS = 5;

// ================================================================
// Helpers
// ================================================================

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

function deriveWalletPda(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [WALLET_SEED, owner.toBuffer()],
    PROGRAM_ID
  );
}

function deriveAgentPda(
  wallet: PublicKey,
  agent: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [AGENT_SEED, wallet.toBuffer(), agent.toBuffer()],
    PROGRAM_ID
  );
}

function deriveSessionPda(
  wallet: PublicKey,
  agent: PublicKey,
  sessionPubkey: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      SESSION_SEED,
      wallet.toBuffer(),
      agent.toBuffer(),
      sessionPubkey.toBuffer(),
    ],
    PROGRAM_ID
  );
}

// Instruction data builders
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

function buildRevokeSessionData(): Buffer {
  return Buffer.from([IX_REVOKE_SESSION]);
}

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

function buildAddGuardianData(guardianPubkey: PublicKey): Buffer {
  return Buffer.concat([
    Buffer.from([IX_ADD_GUARDIAN]),
    guardianPubkey.toBuffer(),
  ]);
}

function buildLockWalletData(lock: boolean): Buffer {
  return Buffer.concat([
    Buffer.from([IX_LOCK_WALLET]),
    Buffer.from([lock ? 1 : 0]),
  ]);
}

function buildRecoverWalletData(newOwnerPubkey: PublicKey): Buffer {
  return Buffer.concat([
    Buffer.from([IX_RECOVER_WALLET]),
    newOwnerPubkey.toBuffer(),
  ]);
}

function buildDeregisterAgentData(): Buffer {
  return Buffer.from([IX_DEREGISTER_AGENT]);
}

function buildCloseWalletData(): Buffer {
  return Buffer.from([IX_CLOSE_WALLET]);
}

function buildRemoveGuardianData(guardianPubkey: PublicKey): Buffer {
  return Buffer.concat([
    Buffer.from([IX_REMOVE_GUARDIAN]),
    guardianPubkey.toBuffer(),
  ]);
}

function buildSetRecoveryThresholdData(threshold: number): Buffer {
  return Buffer.concat([
    Buffer.from([IX_SET_RECOVERY_THRESHOLD]),
    Buffer.from([threshold]),
  ]);
}

/** Load the payer keypair from Solana CLI default location */
function loadPayerKeypair(): Keypair {
  const keypairPath = path.resolve(
    process.env.HOME || "~",
    ".config/solana/id.json"
  );
  const raw = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

/** Send tx and confirm */
async function sendTx(
  connection: Connection,
  instructions: TransactionInstruction[],
  signers: Keypair[]
): Promise<string> {
  const tx = new Transaction().add(...instructions);
  tx.feePayer = signers[0].publicKey;
  const sig = await sendAndConfirmTransaction(connection, tx, signers, {
    commitment: "confirmed",
  });
  return sig;
}

/** Send tx expecting failure */
async function sendTxExpectFail(
  connection: Connection,
  instructions: TransactionInstruction[],
  signers: Keypair[]
): Promise<void> {
  const tx = new Transaction().add(...instructions);
  tx.feePayer = signers[0].publicKey;
  try {
    await sendAndConfirmTransaction(connection, tx, signers, {
      commitment: "confirmed",
    });
    throw new Error("Transaction should have failed but succeeded");
  } catch (err: any) {
    if (err.message === "Transaction should have failed but succeeded") {
      throw err;
    }
    // Expected failure — swallow
  }
}

/** Fund an account by transferring SOL from the payer (avoids devnet airdrop rate limits) */
async function fundAccount(
  connection: Connection,
  funder: Keypair,
  recipient: PublicKey,
  amountSol: number
): Promise<void> {
  const ix = SystemProgram.transfer({
    fromPubkey: funder.publicKey,
    toPubkey: recipient,
    lamports: amountSol * LAMPORTS_PER_SOL,
  });
  const tx = new Transaction().add(ix);
  tx.feePayer = funder.publicKey;
  await sendAndConfirmTransaction(connection, tx, [funder], {
    commitment: "confirmed",
  });
}

/** Small delay to avoid rate limits */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ================================================================
// Test Suite
// ================================================================

describe("Seal Wallet — Devnet Integration", () => {
  let connection: Connection;
  let payer: Keypair;
  let startBalance: number;

  // Core wallets/keypairs used across tests
  let owner: Keypair;
  let walletPda: PublicKey;
  let walletBump: number;

  // Agent used in session tests
  let agent: Keypair;
  let agentPda: PublicKey;
  let agentBump: number;

  // Session used in execute tests
  let sessionKeypair: Keypair;
  let sessionPda: PublicKey;
  let sessionBump: number;

  // Guardians
  let guardian1: Keypair;
  let guardian2: Keypair;
  let guardian3: Keypair;

  beforeAll(async () => {
    connection = new Connection(RPC_URL, "confirmed");
    payer = loadPayerKeypair();
    startBalance =
      (await connection.getBalance(payer.publicKey)) / LAMPORTS_PER_SOL;
    console.log(`\n🔑 Payer: ${payer.publicKey.toBase58()}`);
    console.log(`💰 Starting balance: ${startBalance} SOL`);
    console.log(
      `📡 Program: ${PROGRAM_ID.toBase58()} on ${RPC_URL}\n`
    );

    // Generate a fresh owner for these tests
    owner = Keypair.generate();
    [walletPda, walletBump] = deriveWalletPda(owner.publicKey);

    // Fund the owner
    await fundAccount(connection, payer, owner.publicKey, 0.02);
    await sleep(1000);

    // Generate guardians
    guardian1 = Keypair.generate();
    guardian2 = Keypair.generate();
    guardian3 = Keypair.generate();
  }, 60_000);

  // ────────────────────────────────────────────────────────
  // 1. CreateWallet (IX 0)
  // ────────────────────────────────────────────────────────
  describe("1. CreateWallet", () => {
    it("should create a wallet PDA with correct state", async () => {
      const dailyLimit = BigInt(10 * LAMPORTS_PER_SOL);
      const perTxLimit = BigInt(2 * LAMPORTS_PER_SOL);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: true },
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
        ],
        data: buildCreateWalletData(walletBump, dailyLimit, perTxLimit),
      });

      const sig = await sendTx(connection, [ix], [owner]);
      console.log(`  ✅ CreateWallet tx: ${sig}`);

      // Verify account data
      const account = await connection.getAccountInfo(walletPda);
      expect(account).not.toBeNull();
      const data = Buffer.from(account!.data);

      // Discriminator
      expect(data.subarray(0, 8).toString()).toBe(
        SMART_WALLET_DISCRIMINATOR.toString()
      );

      // pda_authority == owner at creation (bytes 8-40)
      expect(data.subarray(8, 40)).toEqual(
        Buffer.from(owner.publicKey.toBuffer())
      );

      // owner (bytes 40-72)
      expect(data.subarray(40, 72)).toEqual(
        Buffer.from(owner.publicKey.toBuffer())
      );

      // bump
      expect(data[72]).toBe(walletBump);

      // daily limit
      const dailyLimitOffset =
        8 + 32 + 32 + 1 + 8 + 1 + 1 + 1 + MAX_GUARDIANS * 32;
      expect(data.readBigUInt64LE(dailyLimitOffset)).toBe(dailyLimit);
      expect(data.readBigUInt64LE(dailyLimitOffset + 8)).toBe(perTxLimit);
    });

    it("should reject creating wallet twice", async () => {
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: true },
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
        ],
        data: buildCreateWalletData(
          walletBump,
          BigInt(10 * LAMPORTS_PER_SOL),
          BigInt(1 * LAMPORTS_PER_SOL)
        ),
      });

      await sendTxExpectFail(connection, [ix], [owner]);
      console.log("  ✅ Duplicate wallet creation rejected");
    });
  });

  // ────────────────────────────────────────────────────────
  // 2. UpdateSpendingLimit (IX 5)
  // ────────────────────────────────────────────────────────
  describe("2. UpdateSpendingLimit", () => {
    it("should update spending limits (owner only)", async () => {
      const newDaily = BigInt(20 * LAMPORTS_PER_SOL);
      const newPerTx = BigInt(5 * LAMPORTS_PER_SOL);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildUpdateSpendingLimitData(newDaily, newPerTx),
      });

      const sig = await sendTx(connection, [ix], [owner]);
      console.log(`  ✅ UpdateSpendingLimit tx: ${sig}`);

      // Verify
      const account = await connection.getAccountInfo(walletPda);
      const data = Buffer.from(account!.data);
      const dailyLimitOffset =
        8 + 32 + 32 + 1 + 8 + 1 + 1 + 1 + MAX_GUARDIANS * 32;
      expect(data.readBigUInt64LE(dailyLimitOffset)).toBe(newDaily);
      expect(data.readBigUInt64LE(dailyLimitOffset + 8)).toBe(newPerTx);
    });

    it("should reject if per_tx > daily", async () => {
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

      await sendTxExpectFail(connection, [ix], [owner]);
      console.log("  ✅ Invalid limits rejected (per_tx > daily)");
    });

    it("should reject from non-owner", async () => {
      const imposter = Keypair.generate();
      await fundAccount(connection, payer, imposter.publicKey, 0.01);
      await sleep(500);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: imposter.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildUpdateSpendingLimitData(
          BigInt(100 * LAMPORTS_PER_SOL),
          BigInt(10 * LAMPORTS_PER_SOL)
        ),
      });

      await sendTxExpectFail(connection, [ix], [imposter]);
      console.log("  ✅ Non-owner spending limit update rejected");
    });
  });

  // ────────────────────────────────────────────────────────
  // 3. AddGuardian (IX 6)
  // ────────────────────────────────────────────────────────
  describe("3. AddGuardian", () => {
    it("should add guardian 1", async () => {
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildAddGuardianData(guardian1.publicKey),
      });

      const sig = await sendTx(connection, [ix], [owner]);
      console.log(`  ✅ AddGuardian(1) tx: ${sig}`);

      // Verify guardian_count = 1
      const account = await connection.getAccountInfo(walletPda);
      const data = Buffer.from(account!.data);
      const guardianCountOffset = 8 + 32 + 32 + 1 + 8 + 1; // disc(8)+pdaAuth(32)+owner(32)+bump(1)+nonce(8)+agentCount(1)
      expect(data[guardianCountOffset]).toBe(1);
    });

    it("should add guardians 2 and 3", async () => {
      for (const g of [guardian2, guardian3]) {
        const ix = new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: owner.publicKey, isSigner: true, isWritable: false },
            { pubkey: walletPda, isSigner: false, isWritable: true },
          ],
          data: buildAddGuardianData(g.publicKey),
        });
        await sendTx(connection, [ix], [owner]);
        await sleep(500);
      }
      console.log("  ✅ Added guardians 2 and 3");

      // Verify guardian_count = 3
      const account = await connection.getAccountInfo(walletPda);
      const data = Buffer.from(account!.data);
      const guardianCountOffset = 8 + 32 + 32 + 1 + 8 + 1;
      expect(data[guardianCountOffset]).toBe(3);
    });

    it("should reject duplicate guardian", async () => {
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildAddGuardianData(guardian1.publicKey),
      });

      await sendTxExpectFail(connection, [ix], [owner]);
      console.log("  ✅ Duplicate guardian rejected");
    });

    it("should reject zero-address guardian", async () => {
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildAddGuardianData(PublicKey.default),
      });

      await sendTxExpectFail(connection, [ix], [owner]);
      console.log("  ✅ Zero-address guardian rejected");
    });
  });

  // ────────────────────────────────────────────────────────
  // 4. SetRecoveryThreshold (IX 12)
  // ────────────────────────────────────────────────────────
  describe("4. SetRecoveryThreshold", () => {
    it("should set threshold to 2", async () => {
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildSetRecoveryThresholdData(2),
      });

      const sig = await sendTx(connection, [ix], [owner]);
      console.log(`  ✅ SetRecoveryThreshold(2) tx: ${sig}`);

      // Verify recovery_threshold = 2
      const account = await connection.getAccountInfo(walletPda);
      const data = Buffer.from(account!.data);
      const thresholdOffset = 8 + 32 + 32 + 1 + 8 + 1 + 1; // after guardian_count
      expect(data[thresholdOffset]).toBe(2);
    });

    it("should reject threshold of 0", async () => {
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildSetRecoveryThresholdData(0),
      });

      await sendTxExpectFail(connection, [ix], [owner]);
      console.log("  ✅ Zero threshold rejected");
    });

    it("should reject threshold > guardian count", async () => {
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildSetRecoveryThresholdData(5), // only 3 guardians
      });

      await sendTxExpectFail(connection, [ix], [owner]);
      console.log("  ✅ Threshold > guardian_count rejected");
    });
  });

  // ────────────────────────────────────────────────────────
  // 5. RemoveGuardian (IX 11)
  // ────────────────────────────────────────────────────────
  describe("5. RemoveGuardian", () => {
    it("should remove guardian 3 and auto-clamp threshold", async () => {
      // Currently: 3 guardians, threshold 2
      // After removal of guardian3: 2 guardians, threshold should stay 2

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildRemoveGuardianData(guardian3.publicKey),
      });

      const sig = await sendTx(connection, [ix], [owner]);
      console.log(`  ✅ RemoveGuardian(3) tx: ${sig}`);

      const account = await connection.getAccountInfo(walletPda);
      const data = Buffer.from(account!.data);
      const guardianCountOffset = 8 + 32 + 32 + 1 + 8 + 1;
      expect(data[guardianCountOffset]).toBe(2);
      // threshold should be clamped to 2 (was 2, still 2 since count is now 2)
      expect(data[guardianCountOffset + 1]).toBe(2);
    });

    it("should reject removing non-existent guardian", async () => {
      const random = Keypair.generate();
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildRemoveGuardianData(random.publicKey),
      });

      await sendTxExpectFail(connection, [ix], [owner]);
      console.log("  ✅ Non-existent guardian removal rejected");
    });
  });

  // ────────────────────────────────────────────────────────
  // 6. RegisterAgent (IX 1)
  // ────────────────────────────────────────────────────────
  describe("6. RegisterAgent", () => {
    beforeAll(() => {
      agent = Keypair.generate();
      [agentPda, agentBump] = deriveAgentPda(walletPda, agent.publicKey);
    });

    it("should register an agent with Memo program allowed", async () => {
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: true },
          { pubkey: agentPda, isSigner: false, isWritable: true },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
        ],
        data: buildRegisterAgentData(
          agentBump,
          agent.publicKey,
          "DevnetTestAgent",
          [MEMO_PROGRAM_ID], // allow Memo CPI
          [],
          BigInt(10 * LAMPORTS_PER_SOL),
          BigInt(2 * LAMPORTS_PER_SOL),
          3600n, // default session: 1 hour
          86400n // max session: 1 day
        ),
      });

      const sig = await sendTx(connection, [ix], [owner]);
      console.log(`  ✅ RegisterAgent tx: ${sig}`);

      // Verify
      const account = await connection.getAccountInfo(agentPda);
      expect(account).not.toBeNull();
      const data = Buffer.from(account!.data);
      expect(data.subarray(0, 8).toString()).toBe(
        AGENT_CONFIG_DISCRIMINATOR.toString()
      );

      // is_active at offset 105
      expect(data[105]).toBe(1);
    });

    it("should reject if caller is not wallet owner", async () => {
      const imposter = Keypair.generate();
      await fundAccount(connection, payer, imposter.publicKey, 0.01);
      await sleep(500);

      const fakeAgent = Keypair.generate();
      const [fakeAgentPda, fakeAgentBump] = deriveAgentPda(
        walletPda,
        fakeAgent.publicKey
      );

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: imposter.publicKey, isSigner: true, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: true },
          { pubkey: fakeAgentPda, isSigner: false, isWritable: true },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
        ],
        data: buildRegisterAgentData(
          fakeAgentBump,
          fakeAgent.publicKey,
          "Imposter",
          [],
          [],
          BigInt(1 * LAMPORTS_PER_SOL),
          BigInt(1 * LAMPORTS_PER_SOL),
          3600n,
          86400n
        ),
      });

      await sendTxExpectFail(connection, [ix], [imposter]);
      console.log("  ✅ Non-owner agent registration rejected");
    });

    it("should reject agent limits > wallet limits (H3)", async () => {
      const overLimitAgent = Keypair.generate();
      const [overAgentPda, overAgentBump] = deriveAgentPda(
        walletPda,
        overLimitAgent.publicKey
      );

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: true },
          { pubkey: overAgentPda, isSigner: false, isWritable: true },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
        ],
        data: buildRegisterAgentData(
          overAgentBump,
          overLimitAgent.publicKey,
          "OverLimit",
          [SystemProgram.programId],
          [],
          BigInt(100 * LAMPORTS_PER_SOL), // exceeds wallet daily 20 SOL
          BigInt(1 * LAMPORTS_PER_SOL),
          3600n,
          86400n
        ),
      });

      await sendTxExpectFail(connection, [ix], [owner]);
      console.log("  ✅ Agent limits exceeding wallet limits rejected");
    });
  });

  // ────────────────────────────────────────────────────────
  // 7. CreateSession (IX 2)
  // ────────────────────────────────────────────────────────
  describe("7. CreateSession", () => {
    beforeAll(async () => {
      // Fund the agent so it can pay for session creation
      await fundAccount(connection, payer, agent.publicKey, 0.02);
      await sleep(1000);

      sessionKeypair = Keypair.generate();
      [sessionPda, sessionBump] = deriveSessionPda(
        walletPda,
        agent.publicKey,
        sessionKeypair.publicKey
      );
    }, 30_000);

    it("should create a session key with limits", async () => {
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: agent.publicKey, isSigner: true, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: false },
          { pubkey: agentPda, isSigner: false, isWritable: false },
          { pubkey: sessionPda, isSigner: false, isWritable: true },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
        ],
        data: buildCreateSessionData(
          sessionBump,
          sessionKeypair.publicKey,
          3600n, // 1 hour
          BigInt(5 * LAMPORTS_PER_SOL),
          BigInt(2 * LAMPORTS_PER_SOL)
        ),
      });

      const sig = await sendTx(connection, [ix], [agent]);
      console.log(`  ✅ CreateSession tx: ${sig}`);

      const account = await connection.getAccountInfo(sessionPda);
      expect(account).not.toBeNull();
      const data = Buffer.from(account!.data);
      expect(data.subarray(0, 8).toString()).toBe(
        SESSION_KEY_DISCRIMINATOR.toString()
      );

      // session_pubkey at offset 72
      expect(data.subarray(72, 104)).toEqual(
        Buffer.from(sessionKeypair.publicKey.toBuffer())
      );
    });

    it("should reject if duration exceeds max", async () => {
      const badSession = Keypair.generate();
      const [badPda, badBump] = deriveSessionPda(
        walletPda,
        agent.publicKey,
        badSession.publicKey
      );

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: agent.publicKey, isSigner: true, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: false },
          { pubkey: agentPda, isSigner: false, isWritable: false },
          { pubkey: badPda, isSigner: false, isWritable: true },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
        ],
        data: buildCreateSessionData(
          badBump,
          badSession.publicKey,
          100000n, // exceeds max 86400
          BigInt(1 * LAMPORTS_PER_SOL),
          BigInt(LAMPORTS_PER_SOL / 2)
        ),
      });

      await sendTxExpectFail(connection, [ix], [agent]);
      console.log("  ✅ Session duration exceeding max rejected");
    });
  });

  // ────────────────────────────────────────────────────────
  // 8. ExecuteViaSession — Memo CPI (IX 3)
  // ────────────────────────────────────────────────────────
  describe("8. ExecuteViaSession (Memo CPI)", () => {
    it("should execute a Memo CPI via session key", async () => {
      // Fund session key for fees
      await fundAccount(connection, payer, sessionKeypair.publicKey, 0.01);
      await sleep(1000);

      const memoText = Buffer.from("Seal devnet test – hello world!");
      const execData = Buffer.concat([
        Buffer.from([IX_EXECUTE_VIA_SESSION]),
        encodeU64(0n), // amount = 0 (just CPI, no transfer)
        memoText,
      ]);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          {
            pubkey: sessionKeypair.publicKey,
            isSigner: true,
            isWritable: false,
          },
          { pubkey: walletPda, isSigner: false, isWritable: true },
          { pubkey: agentPda, isSigner: false, isWritable: true },
          { pubkey: sessionPda, isSigner: false, isWritable: true },
          { pubkey: MEMO_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true }, // PDA signer
        ],
        data: execData,
      });

      const sig = await sendTx(connection, [ix], [sessionKeypair]);
      console.log(`  ✅ ExecuteViaSession (Memo) tx: ${sig}`);

      // Verify nonce incremented
      const account = await connection.getAccountInfo(walletPda);
      const data = Buffer.from(account!.data);
      const nonceOffset = 8 + 32 + 32 + 1; // after disc+pdaAuth+owner+bump
      expect(data.readBigUInt64LE(nonceOffset)).toBeGreaterThanOrEqual(1n);
    });

    it("should reject CPI to non-allowed program", async () => {
      const fakeProgram = Keypair.generate().publicKey;

      const execData = Buffer.concat([
        Buffer.from([IX_EXECUTE_VIA_SESSION]),
        encodeU64(0n),
        Buffer.from("should fail"),
      ]);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          {
            pubkey: sessionKeypair.publicKey,
            isSigner: true,
            isWritable: false,
          },
          { pubkey: walletPda, isSigner: false, isWritable: true },
          { pubkey: agentPda, isSigner: false, isWritable: true },
          { pubkey: sessionPda, isSigner: false, isWritable: true },
          { pubkey: fakeProgram, isSigner: false, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: execData,
      });

      await sendTxExpectFail(connection, [ix], [sessionKeypair]);
      console.log("  ✅ CPI to non-allowed program rejected");
    });
  });

  // ────────────────────────────────────────────────────────
  // 9. LockWallet (IX 10)
  // ────────────────────────────────────────────────────────
  describe("9. LockWallet", () => {
    it("should lock wallet and block CPI", async () => {
      // Lock
      const lockIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildLockWalletData(true),
      });

      const sig = await sendTx(connection, [lockIx], [owner]);
      console.log(`  ✅ LockWallet(lock=true) tx: ${sig}`);

      // Verify locked
      const account = await connection.getAccountInfo(walletPda);
      const data = Buffer.from(account!.data);
      // is_locked is at the end: after spent_today(8)+day_start(8)+is_closed(1) ... need to find offset
      // Layout: disc(8) + pda_authority(32) + owner(32) + bump(1) + nonce(8) + agent_count(1) + guardian_count(1) + recovery_threshold(1) + guardians(160) + daily_limit(8) + per_tx_limit(8) + spent_today(8) + day_start_timestamp(8) + is_locked(1) + is_closed(1)
      const isLockedOffset =
        8 + 32 + 32 + 1 + 8 + 1 + 1 + 1 + 160 + 8 + 8 + 8 + 8;
      expect(data[isLockedOffset]).toBe(1); // locked

      // Try CPI — should fail
      const execData = Buffer.concat([
        Buffer.from([IX_EXECUTE_VIA_SESSION]),
        encodeU64(0n),
        Buffer.from("blocked"),
      ]);
      const execIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          {
            pubkey: sessionKeypair.publicKey,
            isSigner: true,
            isWritable: false,
          },
          { pubkey: walletPda, isSigner: false, isWritable: true },
          { pubkey: agentPda, isSigner: false, isWritable: true },
          { pubkey: sessionPda, isSigner: false, isWritable: true },
          { pubkey: MEMO_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: execData,
      });

      await sendTxExpectFail(connection, [execIx], [sessionKeypair]);
      console.log("  ✅ CPI on locked wallet rejected");
    });

    it("should unlock wallet and allow CPI again", async () => {
      const unlockIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildLockWalletData(false),
      });

      await sendTx(connection, [unlockIx], [owner]);

      // CPI should work again
      const execData = Buffer.concat([
        Buffer.from([IX_EXECUTE_VIA_SESSION]),
        encodeU64(0n),
        Buffer.from("unlocked test"),
      ]);
      const execIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          {
            pubkey: sessionKeypair.publicKey,
            isSigner: true,
            isWritable: false,
          },
          { pubkey: walletPda, isSigner: false, isWritable: true },
          { pubkey: agentPda, isSigner: false, isWritable: true },
          { pubkey: sessionPda, isSigner: false, isWritable: true },
          { pubkey: MEMO_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: execData,
      });

      const sig = await sendTx(connection, [execIx], [sessionKeypair]);
      console.log(`  ✅ CPI after unlock tx: ${sig}`);
    });

    it("should reject lock from non-owner", async () => {
      const imposter = Keypair.generate();
      await fundAccount(connection, payer, imposter.publicKey, 0.01);
      await sleep(500);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: imposter.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildLockWalletData(true),
      });

      await sendTxExpectFail(connection, [ix], [imposter]);
      console.log("  ✅ Lock from non-owner rejected");
    });
  });

  // ────────────────────────────────────────────────────────
  // 10. RevokeSession (IX 4)
  // ────────────────────────────────────────────────────────
  describe("10. RevokeSession", () => {
    it("should revoke session by owner", async () => {
      // Create a new session to revoke
      const revokeSession = Keypair.generate();
      const [revokePda, revokeBump] = deriveSessionPda(
        walletPda,
        agent.publicKey,
        revokeSession.publicKey
      );

      const createIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: agent.publicKey, isSigner: true, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: false },
          { pubkey: agentPda, isSigner: false, isWritable: false },
          { pubkey: revokePda, isSigner: false, isWritable: true },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
        ],
        data: buildCreateSessionData(
          revokeBump,
          revokeSession.publicKey,
          3600n,
          BigInt(2 * LAMPORTS_PER_SOL),
          BigInt(1 * LAMPORTS_PER_SOL)
        ),
      });

      await sendTx(connection, [createIx], [agent]);
      await sleep(500);

      // Revoke by owner
      const revokeIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: revokePda, isSigner: false, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: false },
        ],
        data: buildRevokeSessionData(),
      });

      const sig = await sendTx(connection, [revokeIx], [owner]);
      console.log(`  ✅ RevokeSession (by owner) tx: ${sig}`);

      // Verify is_revoked
      const account = await connection.getAccountInfo(revokePda);
      const data = Buffer.from(account!.data);
      const isRevokedOffset = 8 + 32 + 32 + 32 + 1 + 8 + 8 + 8 + 8 + 8;
      expect(data[isRevokedOffset]).toBe(1);
    });

    it("should revoke session by agent", async () => {
      const revokeSession2 = Keypair.generate();
      const [revokePda2, revokeBump2] = deriveSessionPda(
        walletPda,
        agent.publicKey,
        revokeSession2.publicKey
      );

      const createIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: agent.publicKey, isSigner: true, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: false },
          { pubkey: agentPda, isSigner: false, isWritable: false },
          { pubkey: revokePda2, isSigner: false, isWritable: true },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
        ],
        data: buildCreateSessionData(
          revokeBump2,
          revokeSession2.publicKey,
          3600n,
          BigInt(2 * LAMPORTS_PER_SOL),
          BigInt(1 * LAMPORTS_PER_SOL)
        ),
      });

      await sendTx(connection, [createIx], [agent]);
      await sleep(500);

      const revokeIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: agent.publicKey, isSigner: true, isWritable: false },
          { pubkey: revokePda2, isSigner: false, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: false },
        ],
        data: buildRevokeSessionData(),
      });

      const sig = await sendTx(connection, [revokeIx], [agent]);
      console.log(`  ✅ RevokeSession (by agent) tx: ${sig}`);

      const account = await connection.getAccountInfo(revokePda2);
      const data = Buffer.from(account!.data);
      const isRevokedOffset = 8 + 32 + 32 + 32 + 1 + 8 + 8 + 8 + 8 + 8;
      expect(data[isRevokedOffset]).toBe(1);
    });

    it("should reject revoke from unauthorized party", async () => {
      const revokeSession3 = Keypair.generate();
      const [revokePda3, revokeBump3] = deriveSessionPda(
        walletPda,
        agent.publicKey,
        revokeSession3.publicKey
      );

      const createIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: agent.publicKey, isSigner: true, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: false },
          { pubkey: agentPda, isSigner: false, isWritable: false },
          { pubkey: revokePda3, isSigner: false, isWritable: true },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
        ],
        data: buildCreateSessionData(
          revokeBump3,
          revokeSession3.publicKey,
          3600n,
          BigInt(2 * LAMPORTS_PER_SOL),
          BigInt(1 * LAMPORTS_PER_SOL)
        ),
      });

      await sendTx(connection, [createIx], [agent]);
      await sleep(500);

      const random = Keypair.generate();
      await fundAccount(connection, payer, random.publicKey, 0.01);
      await sleep(500);

      const revokeIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: random.publicKey, isSigner: true, isWritable: false },
          { pubkey: revokePda3, isSigner: false, isWritable: true },
          { pubkey: walletPda, isSigner: false, isWritable: false },
        ],
        data: buildRevokeSessionData(),
      });

      await sendTxExpectFail(connection, [revokeIx], [random]);
      console.log("  ✅ Unauthorized revoke rejected");
    });
  });

  // ────────────────────────────────────────────────────────
  // 11. M-of-N RecoverWallet (IX 7)
  // ────────────────────────────────────────────────────────
  describe("11. RecoverWallet (M-of-N)", () => {
    // Use a separate wallet for recovery tests
    let recOwner: Keypair;
    let recPda: PublicKey;
    let recBump: number;
    let recGuard1: Keypair;
    let recGuard2: Keypair;

    beforeAll(async () => {
      recOwner = Keypair.generate();
      await fundAccount(connection, payer, recOwner.publicKey, 0.02);
      await sleep(1000);
      [recPda, recBump] = deriveWalletPda(recOwner.publicKey);

      // Create wallet
      const createIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: recOwner.publicKey, isSigner: true, isWritable: true },
          { pubkey: recOwner.publicKey, isSigner: true, isWritable: false },
          { pubkey: recPda, isSigner: false, isWritable: true },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
        ],
        data: buildCreateWalletData(
          recBump,
          BigInt(10 * LAMPORTS_PER_SOL),
          BigInt(2 * LAMPORTS_PER_SOL)
        ),
      });
      await sendTx(connection, [createIx], [recOwner]);

      // Add 2 guardians
      recGuard1 = Keypair.generate();
      recGuard2 = Keypair.generate();

      for (const g of [recGuard1, recGuard2]) {
        const addIx = new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: recOwner.publicKey, isSigner: true, isWritable: false },
            { pubkey: recPda, isSigner: false, isWritable: true },
          ],
          data: buildAddGuardianData(g.publicKey),
        });
        await sendTx(connection, [addIx], [recOwner]);
        await sleep(500);
      }

      // Set threshold to 2
      const threshIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: recOwner.publicKey, isSigner: true, isWritable: false },
          { pubkey: recPda, isSigner: false, isWritable: true },
        ],
        data: buildSetRecoveryThresholdData(2),
      });
      await sendTx(connection, [threshIx], [recOwner]);
    }, 60_000);

    it("should reject recovery with only 1 guardian (threshold=2)", async () => {
      // Fund guardian
      await fundAccount(connection, payer, recGuard1.publicKey, 0.01);
      await sleep(500);

      const newOwner = Keypair.generate();
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: recGuard1.publicKey, isSigner: true, isWritable: false },
          { pubkey: recPda, isSigner: false, isWritable: true },
        ],
        data: buildRecoverWalletData(newOwner.publicKey),
      });

      await sendTxExpectFail(connection, [ix], [recGuard1]);
      console.log("  ✅ Recovery with insufficient guardian count rejected");
    });

    it("should succeed with 2 guardians (threshold=2)", async () => {
      await fundAccount(connection, payer, recGuard2.publicKey, 0.01);
      await sleep(500);

      const newOwner = Keypair.generate();
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: recGuard1.publicKey, isSigner: true, isWritable: false },
          { pubkey: recGuard2.publicKey, isSigner: true, isWritable: false },
          { pubkey: recPda, isSigner: false, isWritable: true },
        ],
        data: buildRecoverWalletData(newOwner.publicKey),
      });

      const sig = await sendTx(connection, [ix], [recGuard1, recGuard2]);
      console.log(`  ✅ M-of-N Recovery (2-of-2) tx: ${sig}`);

      // Verify owner changed
      const account = await connection.getAccountInfo(recPda);
      const data = Buffer.from(account!.data);
      expect(data.subarray(40, 72)).toEqual(
        Buffer.from(newOwner.publicKey.toBuffer())
      );
      // pda_authority stays the same (immutable)
      expect(data.subarray(8, 40)).toEqual(
        Buffer.from(recOwner.publicKey.toBuffer())
      );
    });

    it("should reject recovery with zero address", async () => {
      // Need to use the new owner's wallet now — but since we rotated, we can't easily reset.
      // Use the main test wallet which still has threshold=2, guardians 1&2
      // Actually let's set threshold back to 1 on main wallet for this test
      const setThreshIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildSetRecoveryThresholdData(1),
      });
      await sendTx(connection, [setThreshIx], [owner]);

      await fundAccount(connection, payer, guardian1.publicKey, 0.01);
      await sleep(500);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: guardian1.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildRecoverWalletData(PublicKey.default), // zero address
      });

      await sendTxExpectFail(connection, [ix], [guardian1]);
      console.log("  ✅ Recovery with zero address rejected");

      // Restore threshold to 2
      const restoreIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: owner.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildSetRecoveryThresholdData(2),
      });
      await sendTx(connection, [restoreIx], [owner]);
    });

    it("should reject recovery from non-guardian", async () => {
      const random = Keypair.generate();
      await fundAccount(connection, payer, random.publicKey, 0.01);
      await sleep(500);

      const newOwner = Keypair.generate();
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: random.publicKey, isSigner: true, isWritable: false },
          { pubkey: walletPda, isSigner: false, isWritable: true },
        ],
        data: buildRecoverWalletData(newOwner.publicKey),
      });

      await sendTxExpectFail(connection, [ix], [random]);
      console.log("  ✅ Recovery from non-guardian rejected");
    });
  });

  // ────────────────────────────────────────────────────────
  // 12. Recovery then CPI (pda_authority stability regression)
  // ────────────────────────────────────────────────────────
  describe("12. Recovery then CPI (C1 regression)", () => {
    it("should execute CPI after guardian recovery", async () => {
      // Create a fresh wallet for this test
      const origOwner = Keypair.generate();
      await fundAccount(connection, payer, origOwner.publicKey, 0.02);
      await sleep(1000);
      const [wPda, wBump] = deriveWalletPda(origOwner.publicKey);

      // Create wallet
      await sendTx(
        connection,
        [
          new TransactionInstruction({
            programId: PROGRAM_ID,
            keys: [
              {
                pubkey: origOwner.publicKey,
                isSigner: true,
                isWritable: true,
              },
              {
                pubkey: origOwner.publicKey,
                isSigner: true,
                isWritable: false,
              },
              { pubkey: wPda, isSigner: false, isWritable: true },
              {
                pubkey: SystemProgram.programId,
                isSigner: false,
                isWritable: false,
              },
            ],
            data: buildCreateWalletData(
              wBump,
              BigInt(10 * LAMPORTS_PER_SOL),
              BigInt(5 * LAMPORTS_PER_SOL)
            ),
          }),
        ],
        [origOwner]
      );

      // Add guardian
      const guard = Keypair.generate();
      await sendTx(
        connection,
        [
          new TransactionInstruction({
            programId: PROGRAM_ID,
            keys: [
              {
                pubkey: origOwner.publicKey,
                isSigner: true,
                isWritable: false,
              },
              { pubkey: wPda, isSigner: false, isWritable: true },
            ],
            data: buildAddGuardianData(guard.publicKey),
          }),
        ],
        [origOwner]
      );

      // Register agent with Memo
      const ag = Keypair.generate();
      const [aPda, aBump] = deriveAgentPda(wPda, ag.publicKey);
      await sendTx(
        connection,
        [
          new TransactionInstruction({
            programId: PROGRAM_ID,
            keys: [
              {
                pubkey: origOwner.publicKey,
                isSigner: true,
                isWritable: true,
              },
              { pubkey: wPda, isSigner: false, isWritable: true },
              { pubkey: aPda, isSigner: false, isWritable: true },
              {
                pubkey: SystemProgram.programId,
                isSigner: false,
                isWritable: false,
              },
            ],
            data: buildRegisterAgentData(
              aBump,
              ag.publicKey,
              "PostRecovery",
              [MEMO_PROGRAM_ID],
              [],
              BigInt(5 * LAMPORTS_PER_SOL),
              BigInt(5 * LAMPORTS_PER_SOL),
              3600n,
              86400n
            ),
          }),
        ],
        [origOwner]
      );

      // Fund agent, create session
      await fundAccount(connection, payer, ag.publicKey, 0.02);
      await sleep(1000);

      const sk = Keypair.generate();
      const [sPda, sBump] = deriveSessionPda(wPda, ag.publicKey, sk.publicKey);
      await sendTx(
        connection,
        [
          new TransactionInstruction({
            programId: PROGRAM_ID,
            keys: [
              { pubkey: ag.publicKey, isSigner: true, isWritable: true },
              { pubkey: wPda, isSigner: false, isWritable: false },
              { pubkey: aPda, isSigner: false, isWritable: false },
              { pubkey: sPda, isSigner: false, isWritable: true },
              {
                pubkey: SystemProgram.programId,
                isSigner: false,
                isWritable: false,
              },
            ],
            data: buildCreateSessionData(
              sBump,
              sk.publicKey,
              3600n,
              BigInt(5 * LAMPORTS_PER_SOL),
              BigInt(5 * LAMPORTS_PER_SOL)
            ),
          }),
        ],
        [ag]
      );

      await fundAccount(connection, payer, sk.publicKey, 0.01);
      await sleep(1000);

      // RECOVER WALLET — rotate owner
      await fundAccount(connection, payer, guard.publicKey, 0.01);
      await sleep(500);
      const newOwner = Keypair.generate();
      await sendTx(
        connection,
        [
          new TransactionInstruction({
            programId: PROGRAM_ID,
            keys: [
              { pubkey: guard.publicKey, isSigner: true, isWritable: false },
              { pubkey: wPda, isSigner: false, isWritable: true },
            ],
            data: buildRecoverWalletData(newOwner.publicKey),
          }),
        ],
        [guard]
      );

      // Verify owner changed but pda_authority stable
      let accData = Buffer.from(
        (await connection.getAccountInfo(wPda))!.data
      );
      expect(accData.subarray(40, 72)).toEqual(
        Buffer.from(newOwner.publicKey.toBuffer())
      );
      expect(accData.subarray(8, 40)).toEqual(
        Buffer.from(origOwner.publicKey.toBuffer())
      );

      // CPI AFTER RECOVERY — must work because pda_authority is immutable
      const execData = Buffer.concat([
        Buffer.from([IX_EXECUTE_VIA_SESSION]),
        encodeU64(0n),
        Buffer.from("Post-recovery memo!"),
      ]);
      const sig = await sendTx(
        connection,
        [
          new TransactionInstruction({
            programId: PROGRAM_ID,
            keys: [
              { pubkey: sk.publicKey, isSigner: true, isWritable: false },
              { pubkey: wPda, isSigner: false, isWritable: true },
              { pubkey: aPda, isSigner: false, isWritable: true },
              { pubkey: sPda, isSigner: false, isWritable: true },
              {
                pubkey: MEMO_PROGRAM_ID,
                isSigner: false,
                isWritable: false,
              },
              { pubkey: wPda, isSigner: false, isWritable: true },
            ],
            data: execData,
          }),
        ],
        [sk]
      );
      console.log(`  ✅ CPI after recovery tx: ${sig}`);
    }, 120_000);
  });

  // ────────────────────────────────────────────────────────
  // 13. DeregisterAgent (IX 8) & CloseWallet (IX 9)
  // ────────────────────────────────────────────────────────
  describe("13. DeregisterAgent & CloseWallet", () => {
    // Separate wallet for clean close test
    let closeOwner: Keypair;
    let closePda: PublicKey;
    let closeBump: number;
    let closeAgent: Keypair;
    let closeAgentPda: PublicKey;
    let closeAgentBump: number;

    beforeAll(async () => {
      closeOwner = Keypair.generate();
      await fundAccount(connection, payer, closeOwner.publicKey, 0.02);
      await sleep(1000);
      [closePda, closeBump] = deriveWalletPda(closeOwner.publicKey);

      // Create wallet
      await sendTx(
        connection,
        [
          new TransactionInstruction({
            programId: PROGRAM_ID,
            keys: [
              {
                pubkey: closeOwner.publicKey,
                isSigner: true,
                isWritable: true,
              },
              {
                pubkey: closeOwner.publicKey,
                isSigner: true,
                isWritable: false,
              },
              { pubkey: closePda, isSigner: false, isWritable: true },
              {
                pubkey: SystemProgram.programId,
                isSigner: false,
                isWritable: false,
              },
            ],
            data: buildCreateWalletData(
              closeBump,
              BigInt(10 * LAMPORTS_PER_SOL),
              BigInt(2 * LAMPORTS_PER_SOL)
            ),
          }),
        ],
        [closeOwner]
      );

      // Register an agent
      closeAgent = Keypair.generate();
      [closeAgentPda, closeAgentBump] = deriveAgentPda(
        closePda,
        closeAgent.publicKey
      );
      await sendTx(
        connection,
        [
          new TransactionInstruction({
            programId: PROGRAM_ID,
            keys: [
              {
                pubkey: closeOwner.publicKey,
                isSigner: true,
                isWritable: true,
              },
              { pubkey: closePda, isSigner: false, isWritable: true },
              { pubkey: closeAgentPda, isSigner: false, isWritable: true },
              {
                pubkey: SystemProgram.programId,
                isSigner: false,
                isWritable: false,
              },
            ],
            data: buildRegisterAgentData(
              closeAgentBump,
              closeAgent.publicKey,
              "CloseTest",
              [],
              [],
              BigInt(5 * LAMPORTS_PER_SOL),
              BigInt(1 * LAMPORTS_PER_SOL),
              3600n,
              86400n
            ),
          }),
        ],
        [closeOwner]
      );
    }, 60_000);

    it("should reject closing wallet with agents registered", async () => {
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: closeOwner.publicKey, isSigner: true, isWritable: true },
          { pubkey: closePda, isSigner: false, isWritable: true },
        ],
        data: buildCloseWalletData(),
      });

      await sendTxExpectFail(connection, [ix], [closeOwner]);
      console.log("  ✅ Close with agents registered rejected");
    });

    it("should deregister agent and return rent", async () => {
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: closeOwner.publicKey, isSigner: true, isWritable: true },
          { pubkey: closePda, isSigner: false, isWritable: true },
          { pubkey: closeAgentPda, isSigner: false, isWritable: true },
        ],
        data: buildDeregisterAgentData(),
      });

      const sig = await sendTx(connection, [ix], [closeOwner]);
      console.log(`  ✅ DeregisterAgent tx: ${sig}`);

      // Verify agent account closed (no data)
      const account = await connection.getAccountInfo(closeAgentPda);
      expect(account).toBeNull();
    });

    it("should close wallet after all agents removed", async () => {
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: closeOwner.publicKey, isSigner: true, isWritable: true },
          { pubkey: closePda, isSigner: false, isWritable: true },
        ],
        data: buildCloseWalletData(),
      });

      const sig = await sendTx(connection, [ix], [closeOwner]);
      console.log(`  ✅ CloseWallet tx: ${sig}`);

      // Verify wallet account closed
      const account = await connection.getAccountInfo(closePda);
      expect(account).toBeNull();
    });
  });

  // ────────────────────────────────────────────────────────
  // 14. Max guardians overflow
  // ────────────────────────────────────────────────────────
  describe("14. Edge: Max guardians overflow", () => {
    it("should reject 6th guardian", async () => {
      const maxOwner = Keypair.generate();
      await fundAccount(connection, payer, maxOwner.publicKey, 0.02);
      await sleep(1000);
      const [maxPda, maxBump] = deriveWalletPda(maxOwner.publicKey);

      await sendTx(
        connection,
        [
          new TransactionInstruction({
            programId: PROGRAM_ID,
            keys: [
              {
                pubkey: maxOwner.publicKey,
                isSigner: true,
                isWritable: true,
              },
              {
                pubkey: maxOwner.publicKey,
                isSigner: true,
                isWritable: false,
              },
              { pubkey: maxPda, isSigner: false, isWritable: true },
              {
                pubkey: SystemProgram.programId,
                isSigner: false,
                isWritable: false,
              },
            ],
            data: buildCreateWalletData(
              maxBump,
              BigInt(10 * LAMPORTS_PER_SOL),
              BigInt(1 * LAMPORTS_PER_SOL)
            ),
          }),
        ],
        [maxOwner]
      );

      // Add 5 guardians
      for (let i = 0; i < MAX_GUARDIANS; i++) {
        const g = Keypair.generate();
        await sendTx(
          connection,
          [
            new TransactionInstruction({
              programId: PROGRAM_ID,
              keys: [
                {
                  pubkey: maxOwner.publicKey,
                  isSigner: true,
                  isWritable: false,
                },
                { pubkey: maxPda, isSigner: false, isWritable: true },
              ],
              data: buildAddGuardianData(g.publicKey),
            }),
          ],
          [maxOwner]
        );
        await sleep(300);
      }

      // 6th should fail
      const extra = Keypair.generate();
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: maxOwner.publicKey, isSigner: true, isWritable: false },
          { pubkey: maxPda, isSigner: false, isWritable: true },
        ],
        data: buildAddGuardianData(extra.publicKey),
      });

      await sendTxExpectFail(connection, [ix], [maxOwner]);
      console.log("  ✅ 6th guardian (MAX+1) rejected");
    }, 120_000);
  });

  // ────────────────────────────────────────────────────────
  // Final: Report cost
  // ────────────────────────────────────────────────────────
  describe("Cost Report", () => {
    it("should report total SOL spent on tests", async () => {
      const endBalance =
        (await connection.getBalance(payer.publicKey)) / LAMPORTS_PER_SOL;
      const cost = startBalance - endBalance;
      console.log(`\n════════════════════════════════════════`);
      console.log(`💰 Starting balance: ${startBalance.toFixed(4)} SOL`);
      console.log(`💰 Ending balance:   ${endBalance.toFixed(4)} SOL`);
      console.log(`💸 Total test cost:  ${cost.toFixed(4)} SOL`);
      console.log(`════════════════════════════════════════\n`);
      // This test always passes — it's just a cost reporter
      expect(true).toBe(true);
    });
  });
});
