# @sentinel/sdk

TypeScript SDK for the **Sentinel Smart Wallet** on Solana.

Sentinel enables autonomous agent capabilities with on-chain spending limits and scoped permissions. Perfect for AI agents, trading bots, and automated workflows.

## Installation

```bash
npm install @sentinel/sdk @solana/web3.js
```

## Quick Start

```typescript
import { SentinelClient, solToLamports } from "@sentinel/sdk";
import { Keypair } from "@solana/web3.js";

// Initialize client
const client = new SentinelClient({ network: "devnet" });

// Load your owner keypair
const owner = Keypair.fromSecretKey(/* your secret key */);

// Create a smart wallet with spending limits
const wallet = await client.createWallet(owner, {
  dailyLimitSol: 10,  // Max 10 SOL per day
  perTxLimitSol: 1,   // Max 1 SOL per transaction
});

console.log("Wallet created:", wallet.address.toBase58());
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    SMART WALLET (PDA)                    │
│  - Owner (can modify limits, add guardians)              │
│  - Daily/Per-TX spending limits                          │
│  - Guardian list for recovery                            │
└─────────────────────────────────────────────────────────┘
                            │
                            │ registers
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    AGENT CONFIG (PDA)                    │
│  - Agent public key                                      │
│  - Scoped spending limits (can be lower than wallet)     │
│  - Allowed programs list                                 │
│  - Transaction counter & total spent                     │
└─────────────────────────────────────────────────────────┘
                            │
                            │ creates
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    SESSION KEY (PDA)                     │
│  - Ephemeral keypair for signing                         │
│  - Time-bounded (expiry timestamp)                       │
│  - Amount-bounded (max spend limit)                      │
│  - Revocable by owner or agent                           │
└─────────────────────────────────────────────────────────┘
```

## Full Workflow Example

```typescript
import {
  SentinelClient,
  solToLamports,
} from "@sentinel/sdk";
import { Keypair, PublicKey } from "@solana/web3.js";

async function main() {
  // 1. Initialize
  const client = new SentinelClient({ network: "devnet" });
  const owner = Keypair.generate();
  const agent = Keypair.generate();

  // 2. Create wallet with limits
  const wallet = await client.createWallet(owner, {
    dailyLimitSol: 10,
    perTxLimitSol: 2,
  });
  console.log("Wallet:", wallet.address.toBase58());

  // 3. Register an agent with scoped permissions
  const agentConfig = await client.registerAgent(owner, agent.publicKey, {
    name: "Trading Bot",
    dailyLimitSol: 5,     // Agent limited to 5 SOL/day (less than wallet)
    perTxLimitSol: 0.5,   // Agent limited to 0.5 SOL/tx
    allowedPrograms: [    // Only allow specific programs
      new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"),
    ],
    blockAllExceptAllowed: true, // Strict mode
  });
  console.log("Agent registered:", agentConfig.agent.toBase58());

  // 4. Agent creates a time/amount-limited session
  const { sessionKeypair, session } = await client.createSession(
    agent,
    owner.publicKey,
    {
      durationSecs: 3600,          // 1 hour session
      maxAmountLamports: solToLamports(1),   // Max 1 SOL total
      maxPerTxLamports: solToLamports(0.1),  // Max 0.1 SOL per tx
    }
  );
  console.log("Session created, expires:", new Date(Number(session.expiresAt) * 1000));

  // 5. Agent executes a transaction via session
  // (The session keypair signs, Sentinel validates and CPIs)
  const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
  const signature = await client.executeViaSession(
    sessionKeypair,
    owner.publicKey,
    agent.publicKey,
    MEMO_PROGRAM,
    BigInt(0), // No SOL transfer, just a memo
    Buffer.from("Hello from autonomous agent!"),
    [], // No additional accounts needed for memo
  );
  console.log("Executed:", signature);

  // 6. Owner can revoke session at any time
  await client.revokeSession(
    owner,
    owner.publicKey,
    agent.publicKey,
    sessionKeypair.publicKey
  );
  console.log("Session revoked");

  // 7. Owner can deregister agent (returns rent)
  await client.deregisterAgent(owner, agent.publicKey);
  console.log("Agent deregistered");

  // 8. Owner can close wallet (after all agents removed)
  await client.closeWallet(owner);
  console.log("Wallet closed, rent returned");
}

main().catch(console.error);
```

## API Reference

### SentinelClient

```typescript
const client = new SentinelClient({
  network?: "mainnet" | "devnet" | "localnet",  // Default: "devnet"
  rpcUrl?: string,                              // Custom RPC URL
  programId?: PublicKey,                        // Custom program ID
  commitment?: "processed" | "confirmed" | "finalized",
});
```

### Wallet Operations

```typescript
// Create a new smart wallet
const wallet = await client.createWallet(owner: Keypair, options: {
  dailyLimitSol: number,
  perTxLimitSol: number,
}): Promise<SmartWallet>;

// Get wallet by PDA
const wallet = await client.getWallet(address: PublicKey): Promise<SmartWallet>;

// Update spending limits
const wallet = await client.updateSpendingLimits(
  owner: Keypair,
  newDailyLimitSol: number,
  newPerTxLimitSol: number,
): Promise<SmartWallet>;

// Add a guardian for recovery
const wallet = await client.addGuardian(
  owner: Keypair,
  guardian: PublicKey,
): Promise<SmartWallet>;

// Close wallet (returns rent)
await client.closeWallet(owner: Keypair): Promise<void>;
```

### Agent Operations

```typescript
// Register an agent
const agentConfig = await client.registerAgent(
  owner: Keypair,
  agent: PublicKey,
  options: {
    name: string,
    dailyLimitSol: number,
    perTxLimitSol: number,
    allowedPrograms?: PublicKey[],
    blockAllExceptAllowed?: boolean,
  },
): Promise<AgentConfig>;

// Get agent config
const agentConfig = await client.getAgentConfig(address: PublicKey): Promise<AgentConfig>;

// Deregister agent (returns rent)
await client.deregisterAgent(owner: Keypair, agent: PublicKey): Promise<void>;
```

### Session Operations

```typescript
// Create a session (agent creates)
const { sessionKeypair, session } = await client.createSession(
  agent: Keypair,
  walletOwner: PublicKey,
  options: {
    durationSecs?: number,           // Default: 24 hours
    maxAmountLamports?: bigint,      // Total session budget
    maxPerTxLamports?: bigint,       // Per-transaction limit
  },
): Promise<{ sessionKeypair: Keypair; session: SessionKey }>;

// Get session
const session = await client.getSession(address: PublicKey): Promise<SessionKey>;

// Revoke session (owner or agent)
await client.revokeSession(
  authority: Keypair,
  walletOwner: PublicKey,
  agent: PublicKey,
  sessionPubkey: PublicKey,
): Promise<void>;
```

### Execute Operations

```typescript
// Execute via session (the core agent operation)
const signature = await client.executeViaSession(
  sessionKeypair: Keypair,
  walletOwner: PublicKey,
  agent: PublicKey,
  targetProgram: PublicKey,
  amountLamports: bigint,
  innerInstructionData: Buffer,
  remainingAccounts: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[],
): Promise<string>;
```

### Recovery Operations

```typescript
// Recover wallet (guardian rotates owner)
// ⚠️ WARNING: In v1, any single guardian can do this unilaterally
const wallet = await client.recoverWallet(
  guardian: Keypair,
  walletOwner: PublicKey,
  newOwner: PublicKey,
): Promise<SmartWallet>;
```

## Low-Level Instruction Builders

For advanced usage, you can build instructions directly:

```typescript
import {
  createWalletInstruction,
  registerAgentInstruction,
  createSessionInstruction,
  executeViaSessionInstruction,
  revokeSessionInstruction,
  updateSpendingLimitInstruction,
  addGuardianInstruction,
  deregisterAgentInstruction,
  recoverWalletInstruction,
  closeWalletInstruction,
  solToLamports,
} from "@sentinel/sdk";
```

## PDA Derivation

```typescript
import { deriveWalletPda, deriveAgentPda, deriveSessionPda } from "@sentinel/sdk";

const [walletPda, walletBump] = deriveWalletPda(ownerPubkey);
const [agentPda, agentBump] = deriveAgentPda(walletPda, agentPubkey);
const [sessionPda, sessionBump] = deriveSessionPda(walletPda, agentPubkey, sessionPubkey);
```

## Types

```typescript
interface SmartWallet {
  address: PublicKey;
  owner: PublicKey;
  bump: number;
  isLocked: boolean;
  isClosed: boolean;
  guardians: PublicKey[];
  guardianCount: number;
  dailyLimitLamports: bigint;
  perTxLimitLamports: bigint;
  todaySpentLamports: bigint;
  lastResetTimestamp: bigint;
  agentCount: number;
}

interface AgentConfig {
  address: PublicKey;
  wallet: PublicKey;
  agent: PublicKey;
  name: string;
  bump: number;
  isActive: boolean;
  blockAllExceptAllowed: boolean;
  allowedPrograms: PublicKey[];
  dailyLimitLamports: bigint;
  perTxLimitLamports: bigint;
  txCount: bigint;
  totalSpent: bigint;
  createdAt: bigint;
}

interface SessionKey {
  address: PublicKey;
  wallet: PublicKey;
  agent: PublicKey;
  sessionPubkey: PublicKey;
  bump: number;
  isRevoked: boolean;
  expiresAt: bigint;
  maxAmountLamports: bigint;
  maxPerTxLamports: bigint;
  amountSpent: bigint;
}
```

## Security Considerations

### ⚠️ Guardian Recovery (v1 Limitation)

In v1, **any single registered guardian can unilaterally rotate the wallet owner**. This is a known security limitation.

**Recommendation**: Do NOT add guardians for wallets holding significant value until m-of-n threshold recovery is implemented in v2.

See [SECURITY.md](../../SECURITY.md) for full details.

### Spending Limits

Limits are enforced at three levels (most restrictive wins):

1. **Wallet-level**: Set by owner
2. **Agent-level**: Set by owner when registering agent
3. **Session-level**: Set by agent when creating session

### Session Security

- Sessions have an expiry timestamp
- Sessions have a total budget and per-tx limit
- Owner or agent can revoke sessions instantly
- Session keys are ephemeral keypairs

## Testing

```bash
# Run SDK tests
npm test

# Run with coverage
npm run test:coverage
```

## License

Apache-2.0
