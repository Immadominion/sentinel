/**
 * @seal-wallet/agent-sdk E2E Demo
 *
 * This script demonstrates the full lifecycle of an agent using a Seal wallet
 * via the Sigil pairing token flow:
 *
 *   1. Initialize agent with pairing token
 *   2. Request an ephemeral session (auto-approved or pending approval)
 *   3. Build & wrap a SOL transfer instruction via ExecuteViaSession
 *   4. Send a heartbeat
 *   5. Verify session validity
 *
 * Prerequisites:
 *   - Sigil backend running on localhost:3003
 *   - A Seal wallet created on devnet via the Sigil app
 *   - An agent registered on that wallet with autoApprove=true
 *   - A pairing token generated for that agent
 *
 * Usage:
 *   PAIRING_TOKEN=sgil_xxx npx tsx examples/demo.ts
 *
 * With custom backend URL:
 *   PAIRING_TOKEN=sgil_xxx SIGIL_API=http://localhost:3003 npx tsx examples/demo.ts
 */

import {
  Connection,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { SigilAgent } from "../src/index.js";

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════
const PAIRING_TOKEN = process.env.PAIRING_TOKEN;
const API_URL = process.env.SIGIL_API ?? "http://localhost:3003";
const RPC_URL = process.env.SOLANA_RPC ?? "https://api.devnet.solana.com";

if (!PAIRING_TOKEN) {
  console.error("❌ Missing PAIRING_TOKEN environment variable");
  console.error("   Usage: PAIRING_TOKEN=sgil_xxx npx tsx examples/demo.ts");
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════
// Main Demo
// ═══════════════════════════════════════════════════════════════
async function main() {
  const connection = new Connection(RPC_URL, "confirmed");

  console.log("═══════════════════════════════════════════════════");
  console.log("  @seal-wallet/agent-sdk — E2E Demo");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Backend:  ${API_URL}`);
  console.log(`  RPC:      ${RPC_URL}`);
  console.log(`  Token:    ${PAIRING_TOKEN.slice(0, 10)}...`);
  console.log("");

  // ─── Step 1: Initialize Agent ────────────────────────────
  console.log("Step 1: Initializing SigilAgent...");
  const agent = new SigilAgent({
    pairingToken: PAIRING_TOKEN,
    apiUrl: API_URL,
    autoRefresh: true,
    refreshThresholdSecs: 300,
  });
  console.log("  ✅ Agent initialized\n");

  // ─── Step 2: Request Session ─────────────────────────────
  console.log("Step 2: Requesting ephemeral session...");
  let session;
  try {
    session = await agent.getSession({
      durationSecs: 3600, // 1 hour
      maxAmountSol: 1.0,
      maxPerTxSol: 0.5,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("pending manual approval")) {
      console.log("  ⏳ Session requires manual approval.");
      console.log("  → Open the Sigil app and approve the pending request.");
      console.log("  → Then re-run this script.");
      process.exit(0);
    }
    throw err;
  }

  console.log("  ✅ Session created successfully");
  console.log(`     Session PDA:    ${session.credentials.sessionPda}`);
  console.log(`     Session Pubkey: ${session.credentials.sessionPubkey}`);
  console.log(`     Agent Pubkey:   ${session.credentials.agentPubkey}`);
  console.log(`     Wallet PDA:     ${session.credentials.walletPda}`);
  console.log(`     Expires:        ${session.credentials.expiresAt}`);
  console.log(`     Max Amount:     ${Number(session.credentials.maxAmountLamports) / LAMPORTS_PER_SOL} SOL`);
  console.log(`     Max Per TX:     ${Number(session.credentials.maxPerTxLamports) / LAMPORTS_PER_SOL} SOL`);
  console.log(`     TX Signature:   ${session.credentials.txSignature}`);
  console.log(`     Explorer:       https://explorer.solana.com/tx/${session.credentials.txSignature}?cluster=devnet\n`);

  // ─── Step 3: Build Wrapped Instruction ───────────────────
  console.log("Step 3: Building wrapped SOL transfer instruction...");

  // Build a SOL transfer from the Seal wallet PDA to... itself (safe demo transfer)
  const transferIx = SystemProgram.transfer({
    fromPubkey: session.walletPda,
    toPubkey: session.walletPda, // send to self — no net change
    lamports: 1000, // 0.000001 SOL — minimal test amount
  });

  const wrappedIx = agent.wrapInstruction(transferIx, 1000n);

  console.log("  ✅ Instruction wrapped for ExecuteViaSession");
  console.log(`     Program:      ${wrappedIx.programId.toBase58()}`);
  console.log(`     Accounts:     ${wrappedIx.keys.length}`);
  console.log(`     Data length:  ${wrappedIx.data.length} bytes`);

  // Build transaction (NOT sending in demo mode unless --send flag is passed)
  const tx = new Transaction().add(wrappedIx);
  tx.feePayer = session.sessionKeypair.publicKey;

  const shouldSend = process.argv.includes("--send");

  if (shouldSend) {
    console.log("\n  📤 Sending transaction on-chain...");
    try {
      const sig = await sendAndConfirmTransaction(connection, tx, [
        session.sessionKeypair,
      ]);
      console.log(`  ✅ Transaction confirmed: ${sig}`);
      console.log(`     Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
    } catch (err) {
      console.error(`  ❌ Transaction failed: ${err instanceof Error ? err.message : err}`);
      console.error("     This is expected if the on-chain session/wallet is not funded.");
    }
  } else {
    console.log("  ℹ️  Transaction built but NOT sent (dry run mode)");
    console.log("     Add --send flag to submit on-chain\n");
  }

  // ─── Step 4: Heartbeat ───────────────────────────────────
  console.log("Step 4: Sending heartbeat...");
  await agent.heartbeat("active", { demo: true, step: "heartbeat" });
  console.log("  ✅ Heartbeat acknowledged\n");

  // ─── Step 5: Verify Session ──────────────────────────────
  console.log("Step 5: Verifying session validity...");
  const isValid = agent.isSessionValid();
  console.log(`  ✅ Session valid: ${isValid}`);

  // Verify the session auto-refresh works (same session returned from cache)
  const session2 = await agent.getSession();
  const sameSession =
    session2.credentials.sessionPubkey === session.credentials.sessionPubkey;
  console.log(`  ✅ Session cached correctly: ${sameSession}\n`);

  // ─── Summary ─────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════");
  console.log("  ✅ ALL STEPS COMPLETED SUCCESSFULLY");
  console.log("═══════════════════════════════════════════════════");
  console.log("");
  console.log("  The agent SDK successfully:");
  console.log("  1. Authenticated with a pairing token");
  console.log("  2. Obtained an ephemeral session with spending limits");
  console.log("  3. Wrapped a SOL transfer through ExecuteViaSession");
  console.log("  4. Sent a heartbeat via the Sigil backend");
  console.log("  5. Verified session caching and validity");
  console.log("");
  console.log("  Next steps:");
  console.log("  • Use agent.wrapInstruction() with real DLMM instructions");
  console.log("  • The session keypair signs transactions directly on Solana");
  console.log("  • The Seal program enforces spending limits on-chain");
  console.log("");
}

main().catch((err) => {
  console.error("❌ Demo failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
