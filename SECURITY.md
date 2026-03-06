# Seal Smart Wallet — Security Considerations

## Overview

This document outlines known security considerations, limitations, and best practices for the Seal smart wallet program. **This is a financial system dealing with REAL MONEY.** Users and integrators should carefully review these notes before deploying to production.

> **Status**: Seal is deployed on **devnet only** and has not undergone a formal third-party audit. Do not use on mainnet for significant value without an independent audit.

---

## Critical Findings

### 1. Single Guardian Recovery (1-of-n Takeover)

**Severity: CRITICAL**

In v1, ANY single registered guardian can unilaterally:

1. Rotate the wallet owner to **any** address (including their own)
2. Bypass the wallet lock flag (recovery auto-sets `is_locked = false`)
3. Execute immediately — no time delay, no approval threshold, no notification

**Attack scenario:**

```
1. Alice adds Bob as a guardian
2. Bob's key is compromised (phishing, malware, social engineering)
3. Attacker calls RecoverWallet → rotates owner to attacker's address
4. Attacker now controls all wallet assets
5. No recourse — the change is immediate and on-chain
```

**Code**: [`instructions/recover_wallet.rs`](programs/seal-wallet/src/instructions/recover_wallet.rs)

**Mitigation until v2:**

- **Do NOT add guardians** for wallets holding significant value
- If guardians are necessary, only add keys you control on separate hardware
- Treat guardians as "backup keys" not "trusted third parties"
- Monitor for `RecoverWallet` instructions via on-chain event monitoring

**Planned v2 fix:** m-of-n threshold, time-locked recovery (24–48h delay), cancellation window, per-guardian attestation nonces.

---

### 2. Self-Declared Spending Amounts (Limit Bypass)

**Severity: CRITICAL**

The `ExecuteViaSession` instruction accepts `amount_lamports` as a **caller-declared value** in the instruction data. The program tracks spending against this declared amount, but **never verifies it against the actual CPI transfer**.

This means an agent can declare `amount_lamports = 0` while the inner CPI transfers the wallet's entire SOL balance. All three spending limit tiers (session, agent, wallet) are bypassable.

**Code**: [`instructions/execute_via_session.rs`](programs/seal-wallet/src/instructions/execute_via_session.rs)

**Mitigation:**

- Register agents with strict `allowed_programs` lists (non-empty) to limit what programs can be called
- Use agents with the minimum possible `allowed_instructions` to restrict to known-safe operations
- Client-side balance monitoring before/after each execution

**Planned fix:** On-chain pre/post balance diff verification.

---

## High Severity

### 3. Default-Open Allowlists

**Severity: HIGH**

When an agent is registered with `allowed_programs_count = 0`, the agent can CPI into **any program** on Solana. Similarly, `allowed_instructions_count = 0` allows **any instruction**.

This is a "default open" design — an agent without explicit restrictions has no restrictions.

**Code**: [`state/agent_config.rs`](programs/seal-wallet/src/state/agent_config.rs) — `is_program_allowed()` and `is_instruction_allowed()`

```rust
pub fn is_program_allowed(&self, program_id: &[u8; 32]) -> bool {
    if self.allowed_programs_count == 0 { return true; } // ← allow ALL
    // else linear search in allowlist...
}
```

**Mitigation:** Always register agents with explicit `allowed_programs` and `allowed_instructions` lists. Never leave both at 0 for agents that handle real value.

---

### 4. Instruction Discriminator Check Bypass

**Severity: MEDIUM**

If the inner instruction data is less than 8 bytes, the instruction discriminator check is **skipped entirely**. An attacker could craft a CPI with <8 bytes of data to bypass instruction allowlisting.

**Code**: [`instructions/execute_via_session.rs`](programs/seal-wallet/src/instructions/execute_via_session.rs) — conditional check `if inner_instruction_data.len() >= 8`

**Mitigation:** Target programs that require ≥8 bytes of instruction data are unaffected. For programs accepting short instructions, rely on the program allowlist instead.

---

## Medium Severity

### 5. No Guardian Removal

There is no `RemoveGuardian` instruction. Once a guardian is added, it **cannot be removed** without closing the entire wallet (which requires deregistering all agents first). Combined with Finding #1, this means a guardian added by mistake is a permanent attack surface.

### 6. No Session Cleanup

There is no `CloseSession` instruction. Expired or revoked session PDAs remain on-chain with rent locked permanently. While these sessions cannot be used (execution checks will fail), the ~0.002 SOL rent per session is unrecoverable.

The `MaxSessionsReached` error variant (307) exists in the error enum but is **never enforced** — agents can create unlimited sessions.

### 7. Spending Limit Updates Have No Timelock

The owner can instantly raise spending limits to `u64::MAX` via `UpdateSpendingLimit`. If the owner key is compromised, the attacker can raise limits then drain via an agent session in a single block.

---

## Spending Limit Model

Spending limits are enforced at three independent levels:

| Level | Set By | Modified By | Enforced At |
|-------|--------|-------------|-------------|
| **Wallet** | Owner | `UpdateSpendingLimit` | `ExecuteViaSession` |
| **Agent** | Owner | `RegisterAgent` only (immutable after) | `ExecuteViaSession` |
| **Session** | Agent | `CreateSession` only (immutable after) | `ExecuteViaSession` |

> **Note:** Agent-level limits are set at registration time and **cannot be modified**. There is no `UpdateAgentLimit` instruction. To change an agent's limits, deregister and re-register it.

### Invariant

**Per-transaction limit can never exceed daily limit.** Enforced at wallet creation, agent registration, and session creation.

---

## Account Sizes

| Account | Size | Layout |
|---------|------|--------|
| SmartWallet | **245 bytes** | `8 disc + 32 owner + 1 bump + 8 nonce + 1 agent_count + 1 guardian_count + 160 guardians(5×32) + 8 daily_limit + 8 per_tx_limit + 8 spent_today + 8 day_start + 1 is_locked + 1 is_closed` |
| AgentConfig | **540 bytes** | `8 disc + 32 wallet + 32 agent + 32 name + 1 bump + 1 is_active + 1 programs_count + 256 programs(8×32) + 1 instructions_count + 128 instructions(16×8) + 8 daily_limit + 8 per_tx_limit + 8 default_dur + 8 max_dur + 8 total_spent + 8 tx_count` |
| SessionKey | **154 bytes** | `8 disc + 32 wallet + 32 agent + 32 session_pubkey + 1 bump + 8 created_at + 8 expires_at + 8 max_amount + 8 amount_spent + 8 max_per_tx + 1 is_revoked + 8 nonce` |

---

## Session Key Security

### Properties

- **Time-bounded**: Sessions expire based on `Clock` sysvar timestamp
- **Amount-bounded**: Per-tx and cumulative caps (subject to Finding #2)
- **Program-scoped**: Can be restricted via agent's allowlist (subject to Findings #3, #4)
- **Revocable**: Owner or parent agent can revoke at any time (irreversible)

### Attack Vectors

| Vector | Risk | Mitigation |
|--------|------|-----------|
| Ephemeral key leak | Session budget exposed | Short durations + tight caps |
| Clock manipulation | Fake timestamps extend sessions | Uses cluster-verified `Clock` sysvar |
| Replay | Same instruction replayed | Spending counters track cumulative; wallet nonce increments |
| Declared amount = 0 | Bypasses spending limits | See Finding #2 |

---

## Best Practices

### For Wallet Owners

1. **Do NOT add guardians** until m-of-n threshold is implemented (v2)
2. Start with conservative spending limits
3. **Always set `allowed_programs`** when registering agents — never leave at 0
4. Monitor agent activity via on-chain logs or Helius webhooks
5. Use short session durations (1–4 hours, not 24h)

### For Agent Developers

1. Request the minimum permissions your agent needs
2. Rotate sessions frequently — rent cost (~0.002 SOL) is negligible vs. security benefit
3. Implement client-side pre/post balance checks to detect unexpected transfers
4. Revoke sessions immediately on error or unexpected conditions

### For Auditors

| Directory | Contents |
|-----------|----------|
| [`programs/seal-wallet/`](programs/seal-wallet/) | On-chain program (Pinocchio, ~100KB binary) |
| [`sdk/seal-ts/`](sdk/seal-ts/) | TypeScript SDK |
| [`tests/`](tests/) | Integration tests (LiteSVM + Vitest) |

---

## Reporting Vulnerabilities

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. Email: **<immadominion@gmail.com>**
3. Include: description, reproduction steps, impact assessment
4. Expected response: 48 hours

---

## Changelog

| Date | Change |
|------|--------|
| 2026-03-05 | Full security audit — corrected account size breakdowns, removed references to nonexistent `block_all_except_allowed` field, documented self-declared amount bypass, added findings #3–#7 |
| 2025-01-XX | Initial security documentation |
