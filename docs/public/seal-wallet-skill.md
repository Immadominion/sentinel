---
name: seal-wallet
description: "Control a Seal smart wallet on Solana. Transfer SOL, interact with DeFi protocols (Meteora DLMM), check balances, and manage LP positions — all enforced by on-chain spending limits via session keys."
metadata: {"openclaw": {"requires": {"env": ["SEAL_PAIRING_TOKEN"], "bins": ["node"]}, "primaryEnv": "SEAL_PAIRING_TOKEN", "emoji": "🔐"}}
---

# Seal Wallet Skill

You have access to a **Seal smart wallet** on Solana via the Sigil pairing system. Seal wallets are on-chain smart wallets with session-based authorization, per-transaction spending limits, and allowed-program enforcement. You interact with the wallet using a **pairing token** — you never hold the wallet's private key.

## How It Works

1. The wallet owner created a **pairing token** (`sgil_xxx`) in their Sigil mobile app
2. You use this token to request an **ephemeral session** from the Sigil backend
3. The session gives you a temporary keypair with on-chain spending limits
4. You wrap your Solana instructions through Seal's `ExecuteViaSession` CPI
5. The on-chain program enforces limits — you cannot exceed your allowance

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SEAL_PAIRING_TOKEN` | Yes | The pairing token from Sigil app (`sgil_xxx` format) |
| `SIGIL_API_URL` | No | Sigil backend URL (default: `https://sigil-backend-production-fd3d.up.railway.app`) |
| `SOLANA_RPC_URL` | No | Solana RPC endpoint (default: devnet) |

## Setup (one-time)

Before using this skill, the workspace needs the SDK installed:

```bash
cd ~/.openclaw/workspace
npm install seal-wallet-agent-sdk @solana/web3.js
```

## Core Operations

### 1. Check Wallet Balance

To check the Seal wallet's SOL balance, run this script:

```typescript
import { SigilAgent } from "seal-wallet-agent-sdk";

const agent = new SigilAgent({
  pairingToken: process.env.SEAL_PAIRING_TOKEN!,
});

const balance = await agent.getWalletBalance();
const sessionBalance = await agent.getSessionBalance();
const session = await agent.getSession();

console.log(`Wallet: ${session.walletPda.toBase58()}`);
console.log(`Wallet balance: ${balance} SOL`);
console.log(`Session fee balance: ${sessionBalance} SOL`);
console.log(`Session expires: ${session.credentials.expiresAt}`);
```

Save as a temp file and run with `npx tsx <file>`.

### 2. Transfer SOL

To send SOL from the Seal wallet to a recipient, use `sendTransferSol()` — the simplest approach. Do **not** use `SystemProgram.transfer` because the wallet PDA carries on-chain data and the System Program rejects transfers from data-bearing accounts:

```typescript
import { SigilAgent } from "seal-wallet-agent-sdk";

const agent = new SigilAgent({
  pairingToken: process.env.SEAL_PAIRING_TOKEN!,
});

const RECIPIENT = "RECIPIENT_ADDRESS_HERE"; // Replace with actual address
const AMOUNT_SOL = 0.1; // Replace with actual amount

const sig = await agent.sendTransferSol(RECIPIENT, AMOUNT_SOL);
console.log(`Transfer sent! Signature: ${sig}`);
console.log(`Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);

await agent.heartbeat("active", { action: "transfer", amount: AMOUNT_SOL, recipient: RECIPIENT });
```

### 3. Meteora DLMM — Open LP Position

To open a liquidity position on a Meteora DLMM pool:

```typescript
import { SigilAgent } from "seal-wallet-agent-sdk";
import { Connection, Transaction, Keypair, PublicKey } from "@solana/web3.js";
import DLMM, { StrategyType } from "@meteora-ag/dlmm";
import BN from "bn.js";

const agent = new SigilAgent({
  pairingToken: process.env.SEAL_PAIRING_TOKEN!,
  apiUrl: process.env.SIGIL_API_URL || "https://sigil-backend-production-fd3d.up.railway.app",
});

const session = await agent.getSession({ maxAmountSol: 2.0, maxPerTxSol: 1.0 });
const connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com");

const POOL_ADDRESS = new PublicKey("POOL_ADDRESS_HERE"); // Replace
const dlmm = await DLMM.create(connection, POOL_ADDRESS);
const activeBin = await dlmm.getActiveBin();

const positionKeypair = Keypair.generate();
const { instructions } = await dlmm.initializePositionAndAddLiquidityByStrategy({
  positionPubKey: positionKeypair.publicKey,
  user: session.walletPda,
  totalXAmount: new BN(0.5 * 1e9),
  totalYAmount: new BN(0),
  strategy: {
    maxBinId: activeBin.binId + 10,
    minBinId: activeBin.binId - 10,
    strategyType: StrategyType.SpotBalanced,
  },
});

const wrappedInstructions = instructions.map((ix) =>
  agent.wrapInstruction(ix, 500_000_000n)
);

const tx = new Transaction().add(...wrappedInstructions);
tx.feePayer = session.sessionKeypair.publicKey;
tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

const sig = await connection.sendTransaction(tx, [session.sessionKeypair, positionKeypair]);
console.log(`LP position opened! Signature: ${sig}`);

await agent.heartbeat("trading", { action: "open_position", pool: POOL_ADDRESS.toBase58() });
```

### 4. Send Heartbeat

Always send heartbeats to let the wallet owner know what you're doing:

```typescript
await agent.heartbeat("active", { action: "monitoring", note: "Checking pool conditions" });
await agent.heartbeat("trading", { action: "opening_position", pool: "SOL-USDC" });
await agent.heartbeat("idle", { action: "waiting", note: "No profitable opportunities" });
```

## Important Rules

1. **Use `sendTransferSol()` for SOL transfers** — This is the simplest and safest way: `await agent.sendTransferSol(recipient, amountSol)`. Do NOT use `SystemProgram.transfer` — the wallet PDA carries on-chain data, and SystemProgram rejects transfers from data-bearing accounts. For low-level control, use `agent.buildTransferSol(destination, amountLamports)` to build the instruction manually.

2. **Use `wrapInstruction()` for DeFi operations** — For DLMM, swaps, and other program interactions, wrap the instruction with `agent.wrapInstruction(ix, amountLamports)` to route through Seal's session authorization.

3. **Use session.walletPda as authority** — When building instructions (transfers, DLMM, etc.), the source/authority is always `session.walletPda`, NOT the session keypair's public key.

4. **Session keypair is the signer** — The `session.sessionKeypair` signs transactions and pays fees. The fee payer should be `session.sessionKeypair.publicKey`.

5. **Handle "pending approval"** — If `agent.getSession()` throws with "pending manual approval", the wallet owner has auto-approve disabled. Tell the user to check their Sigil app.

6. **Handle "wallet is locked"** — If the wallet is locked, you cannot create new sessions. Inform the user.

7. **Send heartbeats** — After each significant action, send a heartbeat so the wallet owner sees activity in their Sigil app dashboard.

8. **Devnet by default** — The SDK defaults to Solana devnet. The Seal program is deployed on devnet. For mainnet usage, set `SOLANA_RPC_URL` to a mainnet-beta endpoint.

## Error Handling

```typescript
try {
  const session = await agent.getSession();
} catch (err) {
  if (err.message.includes("pending manual approval")) {
    // Tell user: "Your wallet requires manual session approval. Please check your Sigil app."
  } else if (err.message.includes("Wallet is locked")) {
    // Tell user: "Your wallet is currently locked. Unlock it in the Sigil app to proceed."
  } else if (err.message.includes("Invalid pairing token")) {
    // The token was revoked or is wrong
  } else {
    // Network/server error — the SDK already retried 3 times
  }
}
```

## Seal Program ID

The Seal on-chain program address (devnet): `EV3TKRVz7pTHpAqBTjP8jmwuvoRBRCpjmVSPHhcMnXqb`

Do not hardcode this — it's already embedded in the SDK's `wrapInstruction()` method.
