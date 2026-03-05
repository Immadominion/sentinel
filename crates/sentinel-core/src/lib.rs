// sentinel-core: Cryptographic core for Sentinel Wallet
//
// This crate provides:
// - Key generation and management (Ed25519)
// - Transaction signing
// - Key encryption at rest (AES-256-GCM)
// - Policy engine (spending limits, allowlists)
// - Session key lifecycle
//
// Exposed to Dart via flutter_rust_bridge auto-codegen.

pub mod crypto;
pub mod keyvault;
pub mod policy;
pub mod signer;
pub mod types;
