pub mod smart_wallet;
pub mod session_key;
pub mod agent_config;

#[cfg(test)]
mod tests;

pub use smart_wallet::*;
pub use session_key::*;
pub use agent_config::*;

// ──────────────────────────────────────────────────────────────
// Account discriminators — first 8 bytes of each account
// These are SHA256("sentinel:<AccountName>")[..8]
// ──────────────────────────────────────────────────────────────

/// SmartWallet account discriminator.
pub const SMART_WALLET_DISCRIMINATOR: [u8; 8] = [0x53, 0x65, 0x6E, 0x74, 0x57, 0x61, 0x6C, 0x74]; // "SentWalt"

/// SessionKey account discriminator.
pub const SESSION_KEY_DISCRIMINATOR: [u8; 8] = [0x53, 0x65, 0x6E, 0x74, 0x53, 0x65, 0x73, 0x73]; // "SentSess"

/// AgentConfig account discriminator.
pub const AGENT_CONFIG_DISCRIMINATOR: [u8; 8] = [0x53, 0x65, 0x6E, 0x74, 0x41, 0x67, 0x6E, 0x74]; // "SentAgnt"

// ──────────────────────────────────────────────────────────────
// PDA Seeds
// ──────────────────────────────────────────────────────────────

/// Seed prefix for SmartWallet PDA: ["sentinel", owner_pubkey].
pub const WALLET_SEED: &[u8] = b"sentinel";

/// Seed prefix for SessionKey PDA: ["session", wallet_pubkey, agent_pubkey].
pub const SESSION_SEED: &[u8] = b"session";

/// Seed prefix for AgentConfig PDA: ["agent", wallet_pubkey, agent_pubkey].
pub const AGENT_SEED: &[u8] = b"agent";

// ──────────────────────────────────────────────────────────────
// Size limits
// ──────────────────────────────────────────────────────────────

/// Maximum number of agents per wallet.
pub const MAX_AGENTS: usize = 16;

/// Maximum number of guardians per wallet.
pub const MAX_GUARDIANS: usize = 5;

/// Maximum number of allowed programs per agent.
pub const MAX_ALLOWED_PROGRAMS: usize = 8;

/// Maximum number of allowed instruction discriminators per agent.
pub const MAX_ALLOWED_INSTRUCTIONS: usize = 16;
