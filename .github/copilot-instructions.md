# Sentinel Wallet — AI Agent Coding Instructions

## ⚠️ CRITICAL: SECURITY-FIRST DEVELOPMENT
This is a **smart wallet program that controls real money on Solana mainnet**. Every code change, every parameter, every assumption can result in **total loss of user funds**. When in doubt, STOP and verify.

---

## Golden Rules

### 1. VERIFY ONLINE BEFORE IMPLEMENTING
**NEVER** assume you know the latest API, version, or pattern. You are outdated.
- Before using ANY crate: check crates.io for latest version
- Before using ANY npm package: check npmjs.com for latest version
- Before using ANY Solana pattern: verify it works with current runtime
- Before using ANY Pinocchio API: check the GitHub repo (anza-xyz/pinocchio)
- If a web fetch fails, try alternative sources — do NOT fall back to memory

### 2. NO ANCHOR — PINOCCHIO ONLY
This project uses **Pinocchio** (anza-xyz/pinocchio), NOT Anchor. Reasons:
- ~10x smaller binary → cheaper mainnet deploy (~0.1 SOL vs ~2 SOL)
- Smaller attack surface
- Zero external dependencies (no_std)
- Forces explicit security thinking

**NEVER**:
- Import `anchor_lang` anywhere
- Use `#[account]` or `#[derive(Accounts)]` macros
- Assume Anchor IDL generation exists
- Reference Anchor documentation for this project

**ALWAYS**:
- Use `pinocchio::entrypoint!` macro
- Manually deserialize with borsh
- Manually validate account ownership, signers, PDAs
- Use Codama (not Anchor) for IDL/client generation

### 3. ALL POLICY ENFORCEMENT IS ON-CHAIN
The on-chain program is the ONLY source of truth. Client-side checks in sentinel-core/policy.rs are **optimistic pre-validation** only — they exist to give better error messages, NOT to enforce security.

**Every** limit, allowlist, and permission check must be enforced in `programs/sentinel-wallet/src/instructions/`.

### 4. NEVER STORE RAW PRIVATE KEYS
- Private keys must ALWAYS be encrypted at rest (AES-256-GCM)
- In-memory keys must be zeroized on vault lock/drop
- Never log, print, or serialize private keys
- Never include private keys in error messages
- Session keys are ephemeral — generate, use, discard

### 5. USE EXACT TYPES — NO FLOATING POINT FOR MONEY
- All amounts are in **lamports** (u64)
- Use `u64` for amounts, `i64` for timestamps
- Never convert to f64 for arithmetic
- Display conversions happen at the UI boundary only

---

## Project Structure

```
sentinel/
├── programs/sentinel-wallet/  # Pinocchio on-chain program (Rust)
├── crates/sentinel-core/      # Crypto core (Rust → Dart via FRB)
├── sdk/sentinel-dart/         # Flutter/Dart SDK
├── sdk/sentinel-ts/           # TypeScript SDK
├── tests/                     # Integration tests (bankrun)
├── codama.json                # IDL generation config
├── ARCHITECTURE.md            # Technical architecture docs
└── ROADMAP.md                 # Development roadmap
```

---

## Technology Versions (Verified 2025-01)

| Component | Version | Source |
|-----------|---------|--------|
| Pinocchio | 0.10.2 | crates.io / anza-xyz/pinocchio |
| pinocchio-system | 0.5.0 | pinocchio helper |
| pinocchio-token | 0.5.0 | pinocchio helper |
| flutter_rust_bridge | 2.11 | pub.dev (Flutter Favorite) |
| Codama | 1.5.1 | codama-idl/codama |
| @limechain/codama-dart | latest | Dart client generation |
| borsh | 1.5 | crates.io |
| bytemuck | 1.21 | crates.io |
| ed25519-dalek | 2.1 | crates.io |
| aes-gcm | 0.10 | crates.io |
| solana-sdk | 2.2 | crates.io (CLIENT-SIDE ONLY) |
| Rust | 1.85.0 | Edition 2024 |
| Dart | >=3.5.0 | |
| Flutter | >=3.24.0 | |

**UPDATE RULE**: Before adding any dependency, verify latest version online. Pin exact versions in Cargo.toml / pubspec.yaml / package.json.

---

## On-Chain Program Rules

### Account Validation Checklist
Every instruction MUST validate:
1. [ ] All expected signers are actually signers (`account.is_signer()`)
2. [ ] Account owners match expected program (`account.owner() == expected_program`)
3. [ ] PDA addresses match derivation (`find_program_address()` with correct seeds)
4. [ ] Discriminators match expected account type
5. [ ] Account is not closed/locked when it shouldn't be
6. [ ] Writable accounts are actually writable
7. [ ] System program is correct when doing CPIs

### Error Handling
Every error must:
- Use a specific `SentinelError` variant (NOT generic ProgramError)
- Have a unique error code number
- Be categorized (General 0-99, Wallet 100-199, Agent 200-299, Session 300-399, Guardian 400-499, CPI 500-599, Nonce 600-699)
- Log context via `solana_program_log::sol_log()`

### CPI Safety
- ALWAYS use `invoke_signed()` with correct PDA seeds
- NEVER trust external program return data blindly
- Validate CPI target program is in the agent's allowlist BEFORE invoking
- Check all accounts passed to CPI are correct

### State Changes
- All state mutations must happen AFTER all validations pass
- Update spending counters AFTER successful CPI
- Increment nonce LAST (for atomic consistency)
- Daily limit reset: compare `day_start_timestamp` with `Clock::get()?.unix_timestamp`

---

## sentinel-core (Rust Crypto) Rules

### Key Management
- Generate keys using `ed25519_dalek::SigningKey::generate(&mut OsRng)`
- Encrypt with AES-256-GCM using keys derived from PBKDF2
- PBKDF2 rounds: 600,000 minimum
- Salt: 16 bytes from OsRng

### Policy Engine
- Client-side policy checks MIRROR on-chain checks (same logic, Rust code)
- If client-side check passes but on-chain fails → log warning, investigate mismatch
- Policy checks are INFORMATIONAL on client — on-chain is authoritative

---

## Dart SDK Rules

### flutter_rust_bridge Integration
- Rust core is exposed to Dart via auto-generated FFI bindings
- Run `flutter_rust_bridge_codegen generate` after modifying sentinel-core
- Never manually write FFI bindings — always auto-generate
- Keep Rust API surface simple (no complex generics in public API)

### Dart Code Style
- Use Riverpod for state management
- Use Freezed for immutable models
- Follow Dart effective style guide
- All public APIs must have dartdoc comments

---

## TypeScript SDK Rules

### Solana Web3
- Use `@solana/web3.js` v2+ (new Solana Kit)
- Use `borsh` v2 for serialization
- All amounts as `bigint` (not `number`)

### Codama Integration
- Instruction builders will be auto-generated by Codama
- Manual builders in `instructions.ts` are temporary placeholders
- After Codama generation, replace manual code with generated imports

---

## Testing Rules

### Every Instruction Needs Tests For:
1. **Happy path** — correct execution with valid inputs
2. **Wrong signer** — must fail with specific error
3. **Limit exceeded** — each limit type tested independently
4. **Invalid PDA** — wrong seeds must fail
5. **Closed/locked account** — must reject operations

### Test Tools
- **Rust unit tests**: `cargo test` in programs/sentinel-wallet
- **Integration tests**: solana-bankrun (TypeScript)
- **SDK tests**: vitest (TS), flutter_test (Dart)

---

## Build Commands

```bash
# Build on-chain program
cd sentinel && cargo build-sbf

# Run Rust tests
cargo test --workspace

# Generate Codama clients
npx codama generate

# Build TypeScript SDK
cd sdk/sentinel-ts && npm run build

# Run integration tests
cd tests && npm test

# Generate Dart FFI bindings
cd sdk/sentinel-dart && flutter_rust_bridge_codegen generate
```

---

## What NOT to Do

1. **Never use Anchor** — this is a Pinocchio project
2. **Never hardcode private keys** — always encrypt at rest
3. **Never trust client-side validation alone** — on-chain is the authority
4. **Never use floating point for amounts** — lamports are u64
5. **Never skip account validation** — every account must be verified
6. **Never deploy without testing** — every instruction needs test coverage
7. **Never assume API stability** — verify versions online before use
8. **Never commit secrets** — no keys, no mnemonics, no passwords in code
9. **Never bypass spending limits** — they exist for a reason
10. **Never auto-approve risk changes** — spending limits, allowlists, guardian changes require explicit confirmation

---

## When to Ask the User

- Changes to spending limit defaults or ranges
- Adding new programs to any agent's allowlist
- Modifying guardian recovery thresholds
- Any change to the security validation chain
- Deploying to devnet or mainnet
- Modifying cryptographic algorithm choices

---

## Reference Architecture

- **Squads Protocol v4**: Reference smart wallet on Solana. 7 audits. Study their patterns for multisig and time locks, but remember they use Anchor — we use Pinocchio.
- **Pinocchio examples**: Check `anza-xyz/pinocchio/programs/` for CPI patterns.
- **Codama**: Check `codama-idl/codama` for IDL macro patterns.
