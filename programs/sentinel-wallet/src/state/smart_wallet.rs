use borsh::{BorshDeserialize, BorshSerialize};

use super::{SMART_WALLET_DISCRIMINATOR, MAX_GUARDIANS};

/// The main smart wallet account — a PDA that holds assets and enforces policies.
///
/// PDA seeds: ["sentinel", owner_pubkey]
///
/// ## Account Layout
/// ```text
/// [8] discriminator
/// [32] owner — master authority pubkey
/// [1] bump — PDA bump seed
/// [8] nonce — replay protection counter
/// [1] agent_count — number of registered agents
/// [1] guardian_count — number of guardians
/// [5 * 32] guardians — guardian pubkeys (padded to MAX_GUARDIANS)
/// [8] daily_limit_lamports — max lamports per day across all agents
/// [8] per_tx_limit_lamports — max lamports per single transaction
/// [8] spent_today_lamports — rolling daily spend counter
/// [8] day_start_timestamp — unix timestamp of current day start
/// [1] is_locked — emergency lock flag
/// [1] is_closed — wallet permanently closed
/// ```
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct SmartWallet {
    /// Account discriminator.
    pub discriminator: [u8; 8],
    /// Master authority — the owner's pubkey.
    pub owner: [u8; 32],
    /// PDA bump seed.
    pub bump: u8,
    /// Replay protection nonce, incremented per transaction.
    pub nonce: u64,
    /// Number of currently registered agents.
    pub agent_count: u8,
    /// Number of guardians.
    pub guardian_count: u8,
    /// Guardian pubkeys (fixed-size array for deterministic account size).
    pub guardians: [[u8; 32]; MAX_GUARDIANS],
    /// Maximum lamports any agent can spend in a rolling 24h window.
    pub daily_limit_lamports: u64,
    /// Maximum lamports per single transaction.
    pub per_tx_limit_lamports: u64,
    /// Lamports spent in current rolling day.
    pub spent_today_lamports: u64,
    /// Unix timestamp marking the start of the current spending day.
    pub day_start_timestamp: i64,
    /// Emergency lock — if true, all agent operations are blocked.
    pub is_locked: bool,
    /// Permanently closed — cannot be reopened.
    pub is_closed: bool,
}

impl SmartWallet {
    /// Total account size in bytes.
    pub const SIZE: usize = 8    // discriminator
        + 32                      // owner
        + 1                       // bump
        + 8                       // nonce
        + 1                       // agent_count
        + 1                       // guardian_count
        + (MAX_GUARDIANS * 32)    // guardians
        + 8                       // daily_limit_lamports
        + 8                       // per_tx_limit_lamports
        + 8                       // spent_today_lamports
        + 8                       // day_start_timestamp
        + 1                       // is_locked
        + 1;                      // is_closed

    /// Initialize a new SmartWallet with default values.
    pub fn new(owner: [u8; 32], bump: u8, daily_limit: u64, per_tx_limit: u64) -> Self {
        Self {
            discriminator: SMART_WALLET_DISCRIMINATOR,
            owner,
            bump,
            nonce: 0,
            agent_count: 0,
            guardian_count: 0,
            guardians: [[0u8; 32]; MAX_GUARDIANS],
            daily_limit_lamports: daily_limit,
            per_tx_limit_lamports: per_tx_limit,
            spent_today_lamports: 0,
            day_start_timestamp: 0,
            is_locked: false,
            is_closed: false,
        }
    }
}
