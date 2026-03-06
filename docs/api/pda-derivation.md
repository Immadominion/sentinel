# PDA Derivation

Seal uses three Program Derived Addresses (PDAs). All are deterministic — you can compute any address client-side without querying the chain.

## Seeds

| Account | Seeds | Address |
|---------|-------|---------|
| SmartWallet | `["seal", owner_pubkey]` | One per owner |
| AgentConfig | `["agent", wallet_pda, agent_pubkey]` | One per wallet-agent pair |
| SessionKey | `["session", wallet_pda, agent_pubkey, session_pubkey]` | One per session |

## TypeScript

```typescript
import { PublicKey } from "@solana/web3.js";
import {
  SEAL_PROGRAM_ID,
  WALLET_SEED,    // Buffer.from("seal")
  AGENT_SEED,     // Buffer.from("agent")
  SESSION_SEED,   // Buffer.from("session")
} from "seal-wallet-sdk";
```

### deriveWalletPda

```typescript
import { deriveWalletPda } from "seal-wallet-sdk";

const [walletPda, bump] = deriveWalletPda(ownerPubkey);
// Seeds: [Buffer.from("seal"), owner.toBuffer()]
```

**Manual derivation:**

```typescript
const [walletPda, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from("seal"), ownerPubkey.toBuffer()],
  SEAL_PROGRAM_ID
);
```

### deriveAgentPda

```typescript
import { deriveAgentPda } from "seal-wallet-sdk";

const [agentPda, bump] = deriveAgentPda(walletPda, agentPubkey);
// Seeds: [Buffer.from("agent"), wallet.toBuffer(), agent.toBuffer()]
```

**Manual derivation:**

```typescript
const [agentPda, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from("agent"), walletPda.toBuffer(), agentPubkey.toBuffer()],
  SEAL_PROGRAM_ID
);
```

### deriveSessionPda

```typescript
import { deriveSessionPda } from "seal-wallet-sdk";

const [sessionPda, bump] = deriveSessionPda(walletPda, agentPubkey, sessionPubkey);
// Seeds: [Buffer.from("session"), wallet.toBuffer(), agent.toBuffer(), session.toBuffer()]
```

**Manual derivation:**

```typescript
const [sessionPda, bump] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("session"),
    walletPda.toBuffer(),
    agentPubkey.toBuffer(),
    sessionPubkey.toBuffer(),
  ],
  SEAL_PROGRAM_ID
);
```

## Rust (Program-Side)

Inside the Seal program, PDA derivation uses Pinocchio's address utilities:

```rust
use crate::state::{WALLET_SEED, AGENT_SEED, SESSION_SEED};

// SmartWallet PDA
let wallet_seeds = &[
    WALLET_SEED,           // b"seal"
    owner.address().as_ref(),
    &[bump],
];

// AgentConfig PDA
let agent_seeds = &[
    AGENT_SEED,            // b"agent"
    wallet_pda.as_ref(),
    agent_pubkey.as_ref(),
    &[bump],
];

// SessionKey PDA
let session_seeds = &[
    SESSION_SEED,          // b"session"
    wallet_pda.as_ref(),
    agent_pubkey.as_ref(),
    session_pubkey.as_ref(),
    &[bump],
];
```

## Address Relationships

```mermaid
graph TD
    Owner[Owner Pubkey] -->|seed| WS["seal" + owner]
    WS --> Wallet[SmartWallet PDA]
    Wallet -->|seed| AS["agent" + wallet + agent"]
    Agent[Agent Pubkey] -->|seed| AS
    AS --> AgentPDA[AgentConfig PDA]
    AgentPDA -->|seed| SS["session" + wallet + agent + session"]
    Session[Session Pubkey] -->|seed| SS
    SS --> SessionPDA[SessionKey PDA]

    style Owner fill:#5b8def,color:#fff
    style Agent fill:#5b8def,color:#fff
    style Session fill:#5b8def,color:#fff
    style Wallet fill:#2d3748,color:#fff
    style AgentPDA fill:#4a5568,color:#fff
    style SessionPDA fill:#553c9a,color:#fff
```

## Bump Seeds

Each PDA derivation returns a bump seed. The bump is stored inside the account data and used for CPI signing:

```typescript
// Bump is the second element of the tuple
const [walletPda, walletBump] = deriveWalletPda(ownerPubkey);

// When building instructions, the SDK handles bumps automatically.
// For manual instruction construction, pass the bump in the data field.
```

The bump is required in instruction data for `CreateWallet`, `RegisterAgent`, and `CreateSessionKey`. The SDK computes it automatically when you use the instruction builder functions.

::: tip
You rarely need to handle bumps manually. The SDK's instruction builders (`createWalletInstruction`, `registerAgentInstruction`, etc.) compute and embed them automatically.
:::
