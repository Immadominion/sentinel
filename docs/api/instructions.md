# Instructions

Sentinel exposes 10 instructions through a single-byte discriminant at the start of the instruction data. This page documents every instruction's accounts, data layout, and behavior.

## Instruction Table

| Discriminant | Name | Authority | Accounts | Data Size |
|-------------|------|-----------|----------|-----------|
| `0` | [CreateWallet](#createwallet) | Payer / Owner | 4 | 17 bytes |
| `1` | [RegisterAgent](#registeragent) | Owner | 4 | 99+ bytes |
| `2` | [CreateSessionKey](#createsessionkey) | Agent | 5 | 57 bytes |
| `3` | [ExecuteViaSession](#executeviasession) | Session Key | 5+ | 8+ bytes |
| `4` | [RevokeSession](#revokesession) | Owner / Agent | 4 | 0 bytes |
| `5` | [UpdateSpendingLimit](#updatespendinglimit) | Owner | 2 | 16 bytes |
| `6` | [AddGuardian](#addguardian) | Owner | 2 | 32 bytes |
| `7` | [RecoverWallet](#recoverwallet) | Guardians | 2 | 32 bytes |
| `8` | [DeregisterAgent](#deregisteragent) | Owner | 3 | 0 bytes |
| `9` | [CloseWallet](#closewallet) | Owner | 2 | 0 bytes |

---

## CreateWallet

Deploy a new SmartWallet PDA. Supports sponsored creation where a separate funder pays rent.

### Accounts

| # | Account | Signer | Writable | Description |
|---|---------|--------|----------|-------------|
| 0 | Funder | ✅ | ✅ | Pays rent for PDA creation |
| 1 | Owner | ✅ | | Becomes the wallet owner |
| 2 | SmartWallet PDA | | ✅ | The new wallet account |
| 3 | System Program | | | Required for CPI account creation |

### Data Layout (17 bytes)

| Offset | Size | Field | Type |
|--------|------|-------|------|
| 0 | 1 | `bump` | `u8` |
| 1 | 8 | `daily_limit_lamports` | `u64 (LE)` |
| 9 | 8 | `per_tx_limit_lamports` | `u64 (LE)` |

### Validation Rules

- Funder must be a signer and writable
- Owner must be a signer
- Wallet PDA must not already exist (empty data)
- `daily_limit_lamports > 0` and `per_tx_limit_lamports > 0`
- `per_tx_limit_lamports ≤ daily_limit_lamports`

### SDK

```typescript
import { createWalletInstruction } from "@sentinel-wallet/sdk";

const ix = createWalletInstruction({
  owner: ownerPubkey,
  funder: funderPubkey,  // Optional, defaults to owner
  dailyLimitLamports: BigInt(10 * LAMPORTS_PER_SOL),
  perTxLimitLamports: BigInt(1 * LAMPORTS_PER_SOL),
});
```

---

## RegisterAgent

Register an agent with scoped permissions on the wallet.

### Accounts

| # | Account | Signer | Writable | Description |
|---|---------|--------|----------|-------------|
| 0 | Owner | ✅ | ✅ | Must be wallet owner, pays for agent account |
| 1 | SmartWallet PDA | | ✅ | Parent wallet |
| 2 | AgentConfig PDA | | ✅ | The new agent config account |
| 3 | System Program | | | Required for CPI account creation |

### Data Layout (variable, min 99 bytes)

| Offset | Size | Field | Type |
|--------|------|-------|------|
| 0 | 1 | `bump` | `u8` |
| 1 | 32 | `agent_pubkey` | `[u8; 32]` |
| 33 | 32 | `name` | `[u8; 32]` |
| 65 | 1 | `allowed_programs_count` | `u8` |
| 66 | 32 × count | `allowed_programs` | `[Pubkey]` |
| var | 1 | `allowed_instructions_count` | `u8` |
| var | 8 × count | `allowed_instructions` | `[[u8; 8]]` |
| var | 8 | `daily_limit` | `u64 (LE)` |
| var | 8 | `per_tx_limit` | `u64 (LE)` |
| var | 8 | `default_session_duration` | `i64 (LE)` |
| var | 8 | `max_session_duration` | `i64 (LE)` |

### Validation Rules

- Only the wallet owner can register agents
- Wallet must not be locked or closed
- Agent count must be below `MAX_AGENTS`
- Agent account must not already exist
- `allowed_programs_count ≤ MAX_ALLOWED_PROGRAMS` (8)
- `allowed_instructions_count ≤ MAX_ALLOWED_INSTRUCTIONS` (16)

### SDK

```typescript
import { registerAgentInstruction } from "@sentinel-wallet/sdk";

const ix = registerAgentInstruction({
  owner: ownerPubkey,
  agent: agentPubkey,
  name: "trading-bot",
  allowedPrograms: [JUPITER_PROGRAM_ID],
  dailyLimitLamports: BigInt(5 * LAMPORTS_PER_SOL),
  perTxLimitLamports: BigInt(1 * LAMPORTS_PER_SOL),
});
```

---

## CreateSessionKey

Create an ephemeral session key for an agent.

### Accounts

| # | Account | Signer | Writable | Description |
|---|---------|--------|----------|-------------|
| 0 | Agent | ✅ | ✅ | Must match registered agent, pays rent |
| 1 | SmartWallet PDA | | | Parent wallet |
| 2 | AgentConfig PDA | | | Agent's configuration |
| 3 | SessionKey PDA | | ✅ | The new session account |
| 4 | System Program | | | Required for CPI account creation |

### Data Layout (57 bytes)

| Offset | Size | Field | Type |
|--------|------|-------|------|
| 0 | 1 | `bump` | `u8` |
| 1 | 32 | `session_pubkey` | `[u8; 32]` |
| 33 | 8 | `duration` | `i64 (LE)` — seconds |
| 41 | 8 | `max_amount` | `u64 (LE)` — lamports |
| 49 | 8 | `max_per_tx` | `u64 (LE)` — lamports |

### Validation Rules

- Agent must be registered and active
- Wallet must not be locked or closed
- `duration ≤ agent.max_session_duration`
- `max_amount ≤ agent.daily_limit`
- `max_per_tx ≤ agent.per_tx_limit`
- Session PDA must not already exist

---

## ExecuteViaSession

Execute a CPI through the wallet using a session key. This is the **core instruction** — it's how agents autonomously transact.

### Accounts

| # | Account | Signer | Writable | Description |
|---|---------|--------|----------|-------------|
| 0 | Session Key | ✅ | | The ephemeral key that signed |
| 1 | SmartWallet PDA | | ✅ | Spending state updates |
| 2 | AgentConfig PDA | | ✅ | tx_count / total_spent updates |
| 3 | SessionKey PDA | | ✅ | amount_spent updates |
| 4 | Target Program | | | The program being CPI'd into |
| 5..N | Remaining | varies | varies | Passed through to target CPI |

### Data Layout

| Offset | Size | Field | Type |
|--------|------|-------|------|
| 0 | 8 | `amount_lamports` | `u64 (LE)` — for limit tracking |
| 8 | var | `inner_instruction_data` | `[u8]` — data for target CPI |

### Validation (in order)

1. Session key must be a signer
2. Session must not be expired (`current_time ≤ expires_at`)
3. Session must not be revoked
4. `amount_lamports ≤ session.max_per_tx`
5. `session.amount_spent + amount_lamports ≤ session.max_amount`
6. Agent must be active
7. Target program must be in agent's `allowed_programs` (if non-empty)
8. Instruction discriminator must be in agent's `allowed_instructions` (if non-empty)
9. `amount_lamports ≤ agent.per_tx_limit`
10. Agent daily limit check
11. `amount_lamports ≤ wallet.per_tx_limit_lamports`
12. `wallet.spent_today_lamports + amount_lamports ≤ wallet.daily_limit_lamports`

If all pass → CPI with wallet PDA as signer → update counters.

---

## RevokeSession

Revoke a session key immediately. Both the owner and the parent agent can revoke.

### Accounts

| # | Account | Signer | Writable | Description |
|---|---------|--------|----------|-------------|
| 0 | Authority | ✅ | | Owner or agent keypair |
| 1 | SmartWallet PDA | | | Parent wallet |
| 2 | AgentConfig PDA | | | Agent's configuration |
| 3 | SessionKey PDA | | ✅ | Session to revoke |

Sets `is_revoked = true`. Irreversible.

---

## UpdateSpendingLimit

Modify the wallet's daily and per-transaction limits.

### Accounts

| # | Account | Signer | Writable | Description |
|---|---------|--------|----------|-------------|
| 0 | Owner | ✅ | | Must be wallet owner |
| 1 | SmartWallet PDA | | ✅ | Wallet to update |

### Data Layout (16 bytes)

| Offset | Size | Field | Type |
|--------|------|-------|------|
| 0 | 8 | `daily_limit_lamports` | `u64 (LE)` |
| 8 | 8 | `per_tx_limit_lamports` | `u64 (LE)` |

---

## AddGuardian

Add a guardian pubkey for wallet recovery.

### Accounts

| # | Account | Signer | Writable | Description |
|---|---------|--------|----------|-------------|
| 0 | Owner | ✅ | | Must be wallet owner |
| 1 | SmartWallet PDA | | ✅ | Wallet to update |

### Data Layout (32 bytes)

| Offset | Size | Field | Type |
|--------|------|-------|------|
| 0 | 32 | `guardian_pubkey` | `[u8; 32]` |

Fails if `guardian_count ≥ MAX_GUARDIANS` (5) or guardian is already added.

---

## RecoverWallet

Rotate the wallet owner via guardian consensus.

### Accounts

| # | Account | Signer | Writable | Description |
|---|---------|--------|----------|-------------|
| 0 | Guardian | ✅ | | Must be a registered guardian |
| 1 | SmartWallet PDA | | ✅ | Wallet to recover |

### Data Layout (32 bytes)

| Offset | Size | Field | Type |
|--------|------|-------|------|
| 0 | 32 | `new_owner_pubkey` | `[u8; 32]` |

---

## DeregisterAgent

Remove an agent from the wallet.

### Accounts

| # | Account | Signer | Writable | Description |
|---|---------|--------|----------|-------------|
| 0 | Owner | ✅ | ✅ | Must be wallet owner, receives rent |
| 1 | SmartWallet PDA | | ✅ | Parent wallet |
| 2 | AgentConfig PDA | | ✅ | Agent to remove |

Decrements `agent_count` on the wallet and closes the AgentConfig account (rent returned to owner).

---

## CloseWallet

Permanently close the wallet. Sets `is_closed = true`. This is **irreversible**.

### Accounts

| # | Account | Signer | Writable | Description |
|---|---------|--------|----------|-------------|
| 0 | Owner | ✅ | | Must be wallet owner |
| 1 | SmartWallet PDA | | ✅ | Wallet to close |
