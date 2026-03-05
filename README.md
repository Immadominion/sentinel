<p align="center">
  <img src="banner.png" alt="Sentinel" width="600" />
</p>

<h1 align="center">Sentinel</h1>

<p align="center">
  <strong>On-chain autonomous wallet infrastructure for Solana.</strong>
</p>

<p align="center">
  <a href="https://github.com/immadominion/sentinel/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License" /></a>
  <a href="https://explorer.solana.com/address/EV3TKRVz7pTHpAqBTjP8jmwuvoRBRCpjmVSPHhcMnXqb?cluster=devnet"><img src="https://img.shields.io/badge/solana-devnet-green.svg" alt="Devnet" /></a>
</p>

Sentinel is an open-source smart wallet SDK with **on-chain policy enforcement** — session keys, spending limits, scoped agent delegation, and guardian recovery — built with [Pinocchio](https://github.com/anza-xyz/pinocchio) for minimal deploy cost and maximum compute efficiency.

## Why Sentinel?

| Problem | Existing Solutions | Sentinel |
|---|---|---|
| AI agents need to sign transactions automatically | Raw keypair in memory (SendAI Agent Kit) — no guardrails | On-chain session keys with scope + expiry + spending limits |
| Wallet providers are vendor-locked | Phantom KMS, Crossmint API, Privy MPC — keys in their servers | Self-custodial, keys encrypted locally, program is open-source |
| Policy enforcement is server-side | Turnkey/Crossmint policies run on their servers — bypassable | On-chain enforcement by Solana runtime — impossible to bypass |
| No Flutter SDK for autonomous wallets | None of them have Flutter support | Native Dart SDK via `flutter_rust_bridge` + Codama |
| Signing costs money | Privy $0.01/sig, Crossmint $0.05/MAW | Zero per-signature cost |

## Architecture

```
sentinel/
├── programs/sentinel-wallet/    Pinocchio on-chain program (smart wallet, session keys)
├── crates/sentinel-core/        Rust cryptographic core (KeyVault, Signer, Policy)
├── sdk/
│   ├── sentinel-dart/           Flutter/Dart SDK (via flutter_rust_bridge)
│   └── sentinel-ts/             TypeScript SDK (via Codama renderers-js)
├── tests/                       Integration tests (Bankrun + Rust)
└── docs/                        Technical documentation
```

## Quick Start

```bash
# Build the on-chain program
cd programs/sentinel-wallet
cargo build-sbf

# Run tests
cargo test

# Deploy to devnet
solana program deploy target/deploy/sentinel_wallet.so --url devnet
```

## Key Concepts

### Smart Wallet (PDA)

A program-derived account that holds your assets. Owned by the Sentinel program, controlled by your master key.

### Session Keys

Ephemeral keypairs with scoped permissions: which programs to call, which instructions, how much to spend, when they expire. Agents use these to sign autonomously.

### Agent Delegation

Register AI agents with specific scopes — e.g., "LP Bot can only call Meteora DLMM, max 5 SOL/day." The on-chain program enforces these limits.

### Guardian Recovery

Set m-of-n guardians who can rotate your master key if you lose access.

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| On-chain program | [Pinocchio](https://github.com/anza-xyz/pinocchio) v0.10 | Zero-dep, ~10x smaller binary than Anchor, lower deploy cost |
| IDL & client gen | [Codama](https://github.com/codama-idl/codama) | Multi-language client generation (JS, Rust, Dart) |
| Rust core | `ed25519-dalek`, `aes-gcm` | Battle-tested cryptographic primitives |
| Dart FFI | [flutter_rust_bridge](https://cjycode.com/flutter_rust_bridge/) v2 | Flutter Favorite, auto binding generation |
| Testing | [LiteSVM](https://github.com/LiteSVM/litesvm) / Bankrun | Fast local Solana VM for testing |

## License

Apache-2.0
