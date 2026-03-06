# Quick Start

Create a smart wallet, register an agent, and execute an autonomous transaction — all in under 50 lines.

## Prerequisites

- Node.js 18+
- A funded Solana keypair on devnet (`solana airdrop 2 --url devnet`)
- The Seal SDK (`npm install @seal-wallet/sdk`)

## Full Example

```typescript
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { SealClient } from "@seal-wallet/sdk";

// Load your owner keypair
const owner = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(require("fs").readFileSync("./wallet.json", "utf-8")))
);

const client = new SealClient({ network: "devnet" });

async function main() {
  // ① Create a SmartWallet
  const wallet = await client.createWallet(owner, {
    dailyLimitSol: 10,
    perTxLimitSol: 1,
  });
  console.log("Wallet PDA:", wallet.walletPda.toBase58());

  // ② Register an agent
  const agentKeypair = Keypair.generate();
  const agent = await client.registerAgent(owner, agentKeypair.publicKey, {
    name: "trading-bot",
    dailyLimitSol: 2,
    perTxLimitSol: 0.5,
  });
  console.log("Agent PDA:", agent.agentPda.toBase58());

  // ③ Create a session key (valid for 1 hour, 0.5 SOL cap)
  const sessionKeypair = Keypair.generate();
  const session = await client.createSession(agentKeypair, owner.publicKey, {
    sessionPubkey: sessionKeypair.publicKey,
    durationSecs: BigInt(3600),
    maxAmountLamports: BigInt(0.5 * LAMPORTS_PER_SOL),
    maxPerTxLamports: BigInt(0.1 * LAMPORTS_PER_SOL),
  });
  console.log("Session PDA:", session.sessionPda.toBase58());

  // ④ Fetch wallet state
  const walletState = await client.getWallet(owner.publicKey);
  console.log("Agent count:", walletState.agentCount);
  console.log("Daily limit:", walletState.dailyLimitLamports, "lamports");
}

main().catch(console.error);
```

## What Happened

1. **`createWallet`** deployed a `SmartWallet` PDA derived from `["seal", owner_pubkey]`. The PDA holds the wallet's spending policy — not your funds directly. SOL is sent to the PDA like any other account.

2. **`registerAgent`** created an `AgentConfig` PDA at `["agent", wallet_pda, agent_pubkey]`. The agent is scoped to 2 SOL/day and 0.5 SOL/tx. You can also restrict which programs and instruction discriminators it can call.

3. **`createSession`** created a `SessionKey` PDA at `["session", wallet_pda, agent_pubkey, session_pubkey]`. This ephemeral key is valid for 1 hour with a 0.5 SOL cap. After expiry, the agent creates a new one.

## Executing via Session

Once a session exists, the agent can execute CPI calls through the wallet:

```typescript
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { executeViaSessionInstruction } from "@seal-wallet/sdk";

// Build the inner instruction (whatever your agent needs to do)
const innerIx = new TransactionInstruction({
  programId: TARGET_PROGRAM_ID,
  keys: [/* ... target accounts ... */],
  data: Buffer.from([/* ... instruction data ... */]),
});

// Wrap it in a Seal execution
const execIx = executeViaSessionInstruction({
  sessionKeypair,
  walletOwner: owner.publicKey,
  agent: agentKeypair.publicKey,
  targetProgram: TARGET_PROGRAM_ID,
  amountLamports: BigInt(0.1 * LAMPORTS_PER_SOL),
  innerInstructionData: innerIx.data,
  remainingAccounts: innerIx.keys,
});
```

The Seal program will:

1. Verify the session key is valid and not expired
2. Check the amount against per-tx limits, session cap, daily limit, and wallet-level limits
3. Verify the target program is in the agent's allowlist
4. Execute the CPI with the wallet PDA as signer
5. Update spending counters on the session, agent, and wallet

If any check fails, the transaction reverts. No funds move.

## Monitoring State

Query on-chain account state at any time:

```typescript
// Wallet state — includes spending counters, lock status
const wallet = await client.getWallet(owner.publicKey);

// Agent config — includes scope and cumulative stats
const agentConfig = await client.getAgentConfig(
  wallet.walletPda,
  agentKeypair.publicKey
);

// Session state — includes spent amount, expiry
const sessionState = await client.getSessionKey(
  wallet.walletPda,
  agentKeypair.publicKey,
  sessionKeypair.publicKey
);

console.log(`Session spent: ${sessionState.amountSpent} / ${sessionState.maxAmount} lamports`);
console.log(`Expires at: ${new Date(Number(sessionState.expiresAt) * 1000)}`);
```

## Next Steps

- [Architecture](/concepts/architecture) — understand the full account hierarchy
- [Security Model](/concepts/security-model) — how policies are enforced
- [Session Keys](/concepts/session-keys) — deep dive into ephemeral key management
- [Instructions Reference](/api/instructions) — all 10 program instructions
