# TypeScript SDK

The `@sentinel-wallet/sdk` package provides a high-level TypeScript client for the Sentinel smart wallet program. It wraps all 10 program instructions, PDA derivation, and account deserialization into a clean API.

## SentinelClient

The main entry point. Manages RPC connections and provides methods for every wallet operation.

```typescript
import { SentinelClient } from "@sentinel-wallet/sdk";

const client = new SentinelClient({
  network: "devnet",           // "devnet" | "mainnet" | "localnet"
  rpcUrl: "https://...",       // Override default RPC endpoint
  commitment: "confirmed",     // "processed" | "confirmed" | "finalized"
});
```

### Constructor Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `network` | `string` | `"devnet"` | Network preset (`devnet`, `mainnet`, `localnet`) |
| `rpcUrl` | `string` | Network default | Custom RPC endpoint URL |
| `programId` | `PublicKey` | Sentinel program ID | Override program ID |
| `commitment` | `string` | `"confirmed"` | Transaction confirmation level |

## Wallet Operations

### createWallet

Create a new SmartWallet PDA for the owner.

```typescript
const result = await client.createWallet(ownerKeypair, {
  dailyLimitSol: 10,
  perTxLimitSol: 1,
});

console.log(result.walletPda.toBase58());
console.log(result.signature);
```

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `owner` | `Keypair` | Owner keypair (signs the tx) |
| `dailyLimitSol` | `number` | Max SOL per day across all agents |
| `perTxLimitSol` | `number` | Max SOL per transaction |

Supports **sponsored creation** — a separate funder pays rent while the owner just signs:

```typescript
const result = await client.createWallet(ownerKeypair, {
  dailyLimitSol: 10,
  perTxLimitSol: 1,
  funder: funderKeypair,  // Funder pays rent + fees
});
```

### getWallet

Fetch and deserialize a SmartWallet account.

```typescript
const wallet = await client.getWallet(ownerPubkey);

console.log("Agent count:", wallet.agentCount);
console.log("Daily limit:", wallet.dailyLimitLamports);
console.log("Spent today:", wallet.spentTodayLamports);
console.log("Is locked:", wallet.isLocked);
```

### updateSpendingLimit

Modify the wallet's spending limits.

```typescript
await client.updateSpendingLimit(ownerKeypair, {
  dailyLimitLamports: BigInt(20 * LAMPORTS_PER_SOL),
  perTxLimitLamports: BigInt(2 * LAMPORTS_PER_SOL),
});
```

### closeWallet

Permanently close the wallet. This is **irreversible**.

```typescript
await client.closeWallet(ownerKeypair);
```

## Agent Operations

### registerAgent

Register an agent with scoped permissions.

```typescript
const result = await client.registerAgent(ownerKeypair, agentPubkey, {
  name: "trading-bot",
  dailyLimitSol: 5,
  perTxLimitSol: 1,
  allowedPrograms: [JUPITER_PROGRAM_ID],
  allowedInstructions: [swapDiscriminator],
  defaultSessionDurationSecs: BigInt(3600),    // 1 hour
  maxSessionDurationSecs: BigInt(86400),        // 24 hours
});
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Agent name (max 32 chars) |
| `dailyLimitSol` | `number` | Yes | Agent daily spending limit |
| `perTxLimitSol` | `number` | Yes | Agent per-transaction limit |
| `allowedPrograms` | `PublicKey[]` | No | Programs the agent can CPI into (empty = any) |
| `allowedInstructions` | `Buffer[]` | No | Instruction discriminators (8 bytes each, empty = any) |
| `defaultSessionDurationSecs` | `bigint` | No | Default session duration (default: 24h) |
| `maxSessionDurationSecs` | `bigint` | No | Maximum session duration (default: 7 days) |

### getAgentConfig

Fetch an agent's configuration.

```typescript
const agent = await client.getAgentConfig(walletPda, agentPubkey);

console.log("Name:", agent.name);
console.log("Active:", agent.isActive);
console.log("Total spent:", agent.totalSpent);
console.log("TX count:", agent.txCount);
```

### deregisterAgent

Remove an agent from the wallet.

```typescript
await client.deregisterAgent(ownerKeypair, agentPubkey);
```

## Session Operations

### createSession

Create a time-bounded session key for an agent.

```typescript
const sessionKeypair = Keypair.generate();

const result = await client.createSession(agentKeypair, ownerPubkey, {
  sessionPubkey: sessionKeypair.publicKey,
  durationSecs: BigInt(3600),
  maxAmountLamports: BigInt(0.5 * LAMPORTS_PER_SOL),
  maxPerTxLamports: BigInt(0.1 * LAMPORTS_PER_SOL),
});
```

### revokeSession

Revoke a session immediately. Can be called by the owner or the parent agent.

```typescript
await client.revokeSession(agentKeypair, ownerPubkey, sessionPubkey);
```

### getSessionKey

Fetch session key state.

```typescript
const session = await client.getSessionKey(walletPda, agentPubkey, sessionPubkey);

console.log("Spent:", session.amountSpent, "/", session.maxAmount);
console.log("Expires:", new Date(Number(session.expiresAt) * 1000));
console.log("Revoked:", session.isRevoked);
```

## Guardian Operations

### addGuardian

Add a guardian for wallet recovery.

```typescript
await client.addGuardian(ownerKeypair, guardianPubkey);
```

### recoverWallet

Rotate the wallet owner via guardian consensus.

```typescript
await client.recoverWallet(guardianKeypair, ownerPubkey, newOwnerPubkey);
```

## Low-Level Instruction Builders

For advanced use cases, you can build individual instructions and compose them into transactions yourself:

```typescript
import {
  createWalletInstruction,
  registerAgentInstruction,
  createSessionInstruction,
  executeViaSessionInstruction,
  revokeSessionInstruction,
  updateSpendingLimitInstruction,
  addGuardianInstruction,
  recoverWalletInstruction,
  deregisterAgentInstruction,
  closeWalletInstruction,
} from "@sentinel-wallet/sdk";
```

See [Instructions](/api/instructions) for the full instruction builder reference.

## Account Deserializers

Parse raw account data from RPC responses:

```typescript
import {
  deserializeSmartWallet,
  deserializeAgentConfig,
  deserializeSessionKey,
} from "@sentinel-wallet/sdk";

const accountInfo = await connection.getAccountInfo(walletPda);
const wallet = deserializeSmartWallet(accountInfo.data);
```

## Type Exports

All account types are exported for TypeScript consumers:

```typescript
import type {
  SmartWallet,
  AgentConfig,
  SessionKey,
  SentinelClientConfig,
  CreateWalletParams,
  RegisterAgentParams,
  CreateSessionParams,
  // ... all parameter interfaces
} from "@sentinel-wallet/sdk";
```

See the [Generated API Docs](/api/generated/README) for complete TypeDoc-generated reference.
