// Shared types used across seal-core modules.

use serde::{Deserialize, Serialize};

/// Wallet state (client-side mirror of on-chain SmartWallet).
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WalletState {
    pub address: String,
    pub owner: String,
    pub agent_count: u8,
    pub guardian_count: u8,
    pub daily_limit_lamports: u64,
    pub per_tx_limit_lamports: u64,
    pub spent_today_lamports: u64,
    pub is_locked: bool,
    pub is_closed: bool,
}

/// Represents a registered agent (client-side).
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AgentInfo {
    pub config_address: String,
    pub agent_pubkey: String,
    pub name: String,
    pub is_active: bool,
    pub daily_limit: u64,
    pub per_tx_limit: u64,
    pub total_spent: u64,
    pub tx_count: u64,
}

/// Represents an active session (client-side).
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SessionInfo {
    pub session_address: String,
    pub session_pubkey: String,
    pub agent_pubkey: String,
    pub expires_at: i64,
    pub max_amount: u64,
    pub amount_spent: u64,
    pub is_revoked: bool,
}

/// Network configuration.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum Network {
    Mainnet,
    Devnet,
    Localnet,
}

impl Network {
    pub fn rpc_url(&self) -> &str {
        match self {
            Network::Mainnet => "https://api.mainnet-beta.solana.com",
            Network::Devnet => "https://api.devnet.solana.com",
            Network::Localnet => "http://localhost:8899",
        }
    }
}
