# Sentinel Smart Wallet - Security Considerations

## Overview

This document outlines known security considerations, limitations, and best practices for the Sentinel smart wallet program. **This is a financial system dealing with REAL MONEY.** Users and integrators should carefully review these notes before deploying to production.

---

## ⚠️ CRITICAL: Single Guardian Recovery (v1 Limitation)

### The Risk

**In the current v1 implementation, ANY single registered guardian can unilaterally:**

1. Rotate the wallet owner to ANY address (including their own)
2. Bypass wallet lock status (recovery auto-unlocks)
3. No time delay, no approval threshold, no notification

### Attack Scenario

```
1. Alice sets Bob (her friend) as a guardian
2. Bob's keys are compromised (phishing, malware, etc.)
3. Attacker calls RecoverWallet to rotate owner to their address
4. Attacker now controls all wallet assets
5. Alice has NO recourse - the change is immediate and irreversible
```

### Code Location

[sentinel/programs/sentinel-wallet/src/instructions/recover_wallet.rs](programs/sentinel-wallet/src/instructions/recover_wallet.rs)

```rust
// v1: Simplified — any single registered guardian can rotate the owner.
// Future versions will support m-of-n threshold approval.
```

### Mitigation Until v2

Until m-of-n threshold recovery is implemented:

1. **Do NOT add guardians for wallets holding significant value**
2. If guardians are necessary, only add addresses you directly control on separate hardware
3. Consider guardian-0 as a "backup key" rather than "trusted third party"
4. Monitor for `RecoverWallet` instructions via on-chain monitoring

### Planned v2 Fix

Future versions will implement:

- **m-of-n threshold**: e.g., 2-of-3 guardians must approve
- **Time-locked recovery**: 24-48 hour delay before rotation executes
- **Cancellation window**: Owner can cancel pending recovery during timelock
- **Guardian attestations**: Each guardian signs a unique recovery nonce

---

## Spending Limit Security Model

### How Limits Work

Spending limits are enforced at THREE levels:

1. **Wallet-level**: Global daily/per-tx caps set by owner
2. **Agent-level**: Per-agent daily/per-tx caps set by owner
3. **Session-level**: Per-session total/per-tx caps set by agent

The **most restrictive** limit at each level applies.

### Limit Modification Rules

| Level | Who Can Modify | How |
|-------|---------------|-----|
| Wallet | Owner only | `UpdateSpendingLimit` instruction |
| Agent | Owner only | `RegisterAgent` or `UpdateSpendingLimit` |
| Session | Owner or Agent | `CreateSession` instruction |

### Key Invariant

**Per-transaction limit can NEVER exceed daily limit.** Enforced at:

- [instructions/update_spending_limit.rs](programs/sentinel-wallet/src/instructions/update_spending_limit.rs)
- [instructions/register_agent.rs](programs/sentinel-wallet/src/instructions/register_agent.rs)
- [instructions/create_session.rs](programs/sentinel-wallet/src/instructions/create_session.rs)

---

## Session Key Security

### Session Properties

- **Time-bounded**: Sessions have an expiry timestamp
- **Amount-bounded**: Sessions have total and per-tx spending caps
- **Program-scoped**: Sessions can be restricted to specific programs
- **Revocable**: Owner or agent can revoke at any time

### Session Attack Vectors

1. **Ephemeral key leak**: Session keypair stored insecurely
   - Mitigation: Sessions have limited spend amounts
2. **Clock manipulation**: Validator returns fake timestamps
   - Mitigation: Use cluster-verified `Clock` sysvar
3. **Replay attacks**: Same instruction replayed multiple times
   - Mitigation: Spending counters track cumulative spend

---

## Account Size Calculations

**Verified account sizes (as of audit 2025-01-XX):**

| Account | Calculated Size | Notes |
|---------|-----------------|-------|
| SmartWallet | 245 bytes | 8 disc + 32 owner + 1 bump + 1 locked + 1 closed + 2*8 limits + 7*(32+8) guardians + 1 count |
| AgentConfig | 540 bytes | 8 disc + 32 wallet + 32 agent + 1 bump + 1 active + 2*8 limits + 8 tx_count + 8 total_spent + 8 created + 16*32 programs + 1 prog_count + 1 block_all + 64*5 ix + 1 ix_count |
| SessionKey | 154 bytes | 8 disc + 32 wallet + 32 agent + 32 session + 1 bump + 1 revoked + 8 expiry + 2*8 limits + 8 spent |

If TypeScript SDK deserialization fails with "unexpected data length", verify sizes match.

---

## CPI Security (ExecuteViaSession)

### What It Does

`ExecuteViaSession` allows agents to execute arbitrary CPIs with the wallet PDA as signer.

### Security Checks

1. Session key must be signer
2. Session must be valid (not expired, not revoked)
3. Amount must be within session limits
4. Target program must be in agent's allowed program list (unless `block_all_except_allowed = false`)

### Risks

- **Program allowlist bypass**: If `block_all_except_allowed = false`, agent can CPI to ANY program
- **Amount tracking inaccuracy**: Declared `amount_lamports` is trusted, not verified against actual transfer
  - Future: On-chain balance diff verification

---

## Best Practices

### For Wallet Owners

1. Start with conservative spending limits
2. Do NOT add guardians until v2 m-of-n is implemented
3. Register agents with minimal required permissions
4. Monitor agent activity via on-chain logs

### For Agents/Integrators

1. Use short session durations (hours, not days)
2. Request minimal spending limits
3. Implement client-side monitoring for anomalies
4. Always verify transaction success after CPI

### For Auditors

1. [programs/sentinel-wallet/](programs/sentinel-wallet/) - On-chain program
2. [sdk/sentinel-ts/](sdk/sentinel-ts/) - TypeScript SDK
3. [tests/](tests/) - Integration tests via LiteSVM
4. 37 Rust unit tests + 19 TypeScript integration tests

---

## Reporting Vulnerabilities

If you discover a security vulnerability, please:

1. **DO NOT** create a public GitHub issue
2. Email: [TBD - add security email]
3. Include: Description, reproduction steps, impact assessment
4. Expected response: 48 hours

---

## Changelog

- **2025-01-XX**: Initial security documentation
- **2025-01-XX**: Fixed TypeScript SDK account size mismatches
- **2025-01-XX**: Removed unused @solana/spl-token (CVE-2024-XXXX vulnerability)
