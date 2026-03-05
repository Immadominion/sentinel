# Constants & Sizes

All constants, account sizes, discriminators, and limits used by the Sentinel program and SDK.

## Program ID

```typescript
import { SENTINEL_PROGRAM_ID } from "@sentinel-wallet/sdk";
// EV3TKRVz7pTHpAqBTjP8jmwuvoRBRCpjmVSPHhcMnXqb
```

Deployed on **Solana devnet**. [View on Explorer →](https://explorer.solana.com/address/EV3TKRVz7pTHpAqBTjP8jmwuvoRBRCpjmVSPHhcMnXqb?cluster=devnet)

## PDA Seeds

| Constant | Value | Used For |
|----------|-------|----------|
| `WALLET_SEED` | `"sentinel"` | SmartWallet PDA derivation |
| `AGENT_SEED` | `"agent"` | AgentConfig PDA derivation |
| `SESSION_SEED` | `"session"` | SessionKey PDA derivation |

```typescript
import { WALLET_SEED, AGENT_SEED, SESSION_SEED } from "@sentinel-wallet/sdk";
```

## Account Discriminators

The first 8 bytes of each account identify its type:

| Constant | Value (ASCII) | Bytes |
|----------|--------------|-------|
| `SMART_WALLET_DISCRIMINATOR` | `SentWalt` | `[83, 101, 110, 116, 87, 97, 108, 116]` |
| `AGENT_CONFIG_DISCRIMINATOR` | `SentAgnt` | `[83, 101, 110, 116, 65, 103, 110, 116]` |
| `SESSION_KEY_DISCRIMINATOR` | `SentSess` | `[83, 101, 110, 116, 83, 101, 115, 115]` |

```typescript
import {
  SMART_WALLET_DISCRIMINATOR,
  AGENT_CONFIG_DISCRIMINATOR,
  SESSION_KEY_DISCRIMINATOR,
} from "@sentinel-wallet/sdk";
```

## Instruction Discriminants

Single-byte discriminants at position 0 of instruction data:

```typescript
import { InstructionDiscriminant } from "@sentinel-wallet/sdk";
```

| Discriminant | Value | Instruction |
|-------------|-------|-------------|
| `CreateWallet` | `0` | Create a new SmartWallet |
| `RegisterAgent` | `1` | Register an agent |
| `CreateSessionKey` | `2` | Create a session key |
| `ExecuteViaSession` | `3` | Execute via session |
| `RevokeSession` | `4` | Revoke a session |
| `UpdateSpendingLimit` | `5` | Update spending limits |
| `AddGuardian` | `6` | Add a guardian |
| `RecoverWallet` | `7` | Recover wallet ownership |
| `DeregisterAgent` | `8` | Deregister an agent |
| `CloseWallet` | `9` | Close the wallet |

## Limits

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_GUARDIANS` | `5` | Maximum guardian pubkeys per wallet |
| `MAX_ALLOWED_PROGRAMS` | `8` | Maximum programs an agent can be scoped to |
| `MAX_ALLOWED_INSTRUCTIONS` | `16` | Maximum instruction discriminators per agent |
| `MAX_AGENT_NAME_LENGTH` | `32` | Maximum bytes for agent name (UTF-8) |

```typescript
import {
  MAX_GUARDIANS,
  MAX_ALLOWED_PROGRAMS,
  MAX_ALLOWED_INSTRUCTIONS,
  MAX_AGENT_NAME_LENGTH,
} from "@sentinel-wallet/sdk";
```

## Default Values

| Constant | Value | Description |
|----------|-------|-------------|
| `DEFAULT_SESSION_DURATION_SECS` | `86400` (24h) | Default session duration |
| `MAX_SESSION_DURATION_SECS` | `604800` (7d) | Maximum session duration |

## Account Sizes

### SmartWallet — 245 bytes

```
 8  discriminator
32  owner
 1  bump
 8  nonce
 1  agent_count
 1  guardian_count
160  guardians (5 × 32)
 8  daily_limit_lamports
 8  per_tx_limit_lamports
 8  spent_today_lamports
 8  day_start_timestamp
 1  is_locked
 1  is_closed
─── ─────────
245  total
```

### AgentConfig — 540 bytes

```
  8  discriminator
 32  wallet
 32  agent
 32  name
  1  bump
  1  is_active
  1  allowed_programs_count
256  allowed_programs (8 × 32)
  1  allowed_instructions_count
128  allowed_instructions (16 × 8)
  8  daily_limit
  8  per_tx_limit
  8  default_session_duration
  8  max_session_duration
  8  total_spent
  8  tx_count
─── ─────────
540  total
```

### SessionKey — 154 bytes

```
 8  discriminator
32  wallet
32  agent
32  session_pubkey
 1  bump
 8  created_at
 8  expires_at
 8  max_amount
 8  amount_spent
 8  max_per_tx
 1  is_revoked
 8  nonce
─── ─────────
154  total
```

## Rent Costs

Approximate rent-exempt costs at the current Solana rent rate:

| Account | Size | Rent-Exempt |
|---------|------|-------------|
| SmartWallet | 245 B | ~0.0028 SOL |
| AgentConfig | 540 B | ~0.0049 SOL |
| SessionKey | 154 B | ~0.0021 SOL |

## Error Code Ranges

| Range | Category |
|-------|----------|
| 0–99 | General errors |
| 100–199 | Wallet errors |
| 200–299 | Agent errors |
| 300–399 | Session key errors |
| 400–499 | Guardian errors |
| 500–599 | CPI errors |
| 600–699 | Nonce errors |
| 700–799 | Serialization errors |

See [Security Model](/concepts/security-model#error-codes) for the full error table.
