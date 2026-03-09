# SKILLS.md — Seal Wallet

> This file describes the capabilities and tools exposed by the Seal smart wallet for AI agents operating on Solana.

## Identity

- **Name**: Seal
- **Type**: On-chain smart wallet with session key delegation
- **Network**: Solana (devnet)
- **Program ID**: `EV3TKRVz7pTHpAqBTjP8jmwuvoRBRCpjmVSPHhcMnXqb`
- **License**: Apache-2.0
- **Repository**: <https://github.com/immadominion/seal>

## What I Can Do

### Wallet Management

- **Create wallets** — Deploy a SmartWallet PDA with configurable daily and per-transaction spending limits
- **Update limits** — Modify spending limits on an existing wallet
- **Lock wallets** — Emergency lock that blocks all agent operations
- **Close wallets** — Permanently shut down a wallet

### Agent Delegation

- **Register agents** — Scope an AI agent to specific programs, instructions, and amounts
- **Deregister agents** — Remove an agent's permissions
- **Isolate agents** — Each agent has independent limits and program scopes; one cannot affect another

### Session Keys

- **Create sessions** — Issue time-bounded, amount-capped ephemeral keys for autonomous operation
- **Revoke sessions** — Immediately invalidate a session key
- **Auto-expire** — Sessions automatically become unusable after their duration expires

### Execution

- **Execute via session** — Sign and submit transactions through the wallet PDA using a session key
- **CPI passthrough** — Call any allowed target program (Jupiter, Meteora, Raydium, etc.) with the wallet as signer
- **Policy enforcement** — Every execution is validated against session, agent, and wallet limits on-chain

### Recovery

- **Add guardians** — Register up to 5 guardian pubkeys for wallet recovery
- **Recover wallet** — Rotate the wallet owner via guardian consensus if the master key is lost

## Limits

| Parameter | Value |
|-----------|-------|
| Max guardians per wallet | 5 |
| Max programs per agent | 8 |
| Max instruction discriminators per agent | 16 |
| Max agent name length | 32 bytes |
| Default session duration | 24 hours |
| Maximum session duration | 7 days |

## SDK

### TypeScript

```bash
npm install seal-wallet-sdk
```

```typescript
import { SealClient } from "seal-wallet-sdk";

const client = new SealClient({ network: "devnet" });

// Create wallet → Register agent → Create session → Execute
const wallet = await client.createWallet(owner, { dailyLimitSol: 10, perTxLimitSol: 1 });
const agent = await client.registerAgent(owner, agentKey, { name: "bot", dailyLimitSol: 2, perTxLimitSol: 0.5 });
const session = await client.createSession(agentKey, owner.publicKey, { ... });
```

### Dart

```yaml
dependencies:
  seal_dart: ^0.1.0
```

## Security Model

- **On-chain enforcement** — All policies (spending limits, program allowlists, session expiry) are validated inside the Solana program. No server, no middleware, no admin key can override.
- **Three-layer limits** — Per-transaction → agent daily → wallet daily. Each checked independently.
- **Zero per-signature cost** — Session keys sign directly; no relay or per-sig billing.
- **Self-custodial** — The wallet PDA is derived from your pubkey. Only you control it.
- **Ephemeral sessions** — Session keys exist only in memory, never written to disk.

## MCP Integration

### Wallet MCP (Available)

Seal provides a wallet operations MCP server (`seal-wallet-mcp-server`) that lets AI agents in code editors manage smart wallets via tool calls — all spending limits enforced on-chain:

- `create_wallet` — Create a SmartWallet with spending limits
- `register_agent` — Register an AI agent with scoped permissions
- `create_session` — Create a time-bounded, budget-capped session key
- `execute_via_session` — Execute a CPI through the wallet via session key
- `revoke_session` — Emergency session revoke
- Plus 14 more tools for wallet management, recovery, and PDA derivation

### Documentation MCP (Planned)

A docs-search MCP server is on our roadmap — following the Mintlify pattern, it will let AI agents search and retrieve Seal documentation to generate correct integration code:

- `seal_search_docs` — Full-text search across all Seal documentation
- `seal_get_doc` — Retrieve a specific documentation page
- `seal_list_docs` — List all available documentation pages

Combined with the upcoming mobile app, users will create sub-wallets from their phone, pass them to AI agents via MCP, and maintain full control over spending limits and program access — all enforced on-chain.

## How to Interact with Me

1. **Install the SDK** for your language (TypeScript or Dart)
2. **Create a wallet** with spending limits appropriate to your use case
3. **Register yourself as an agent** with the specific programs you need to call
4. **Create short-lived sessions** for each operational cycle
5. **Execute transactions** through session keys — I enforce all limits on-chain
6. **Revoke sessions** when done or if something goes wrong

## Documentation

Full docs: <https://github.com/immadominion/seal/tree/main/docs>
