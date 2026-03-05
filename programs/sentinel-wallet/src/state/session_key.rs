use borsh::{BorshDeserialize, BorshSerialize};

/// A session key — an ephemeral keypair with scoped permissions.
///
/// PDA seeds: ["session", wallet_pubkey, agent_pubkey, nonce_bytes]
///
/// Session keys are the core mechanism for autonomous agent operations.
/// They are time-limited, scope-limited, and spending-limited.
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct SessionKey {
    /// Account discriminator.
    pub discriminator: [u8; 8],
    /// The parent smart wallet PDA.
    pub wallet: [u8; 32],
    /// The agent's pubkey that owns this session.
    pub agent: [u8; 32],
    /// The ephemeral session key pubkey (signs transactions).
    pub session_pubkey: [u8; 32],
    /// PDA bump seed.
    pub bump: u8,
    /// Unix timestamp when this session was created.
    pub created_at: i64,
    /// Unix timestamp when this session expires.
    pub expires_at: i64,
    /// Maximum lamports this session can spend total.
    pub max_amount: u64,
    /// Lamports already spent by this session.
    pub amount_spent: u64,
    /// Maximum lamports per individual transaction.
    pub max_per_tx: u64,
    /// Whether this session has been revoked.
    pub is_revoked: bool,
    /// Session nonce for uniqueness.
    pub nonce: u64,
}

impl SessionKey {
    /// Total account size in bytes.
    pub const SIZE: usize = 8    // discriminator
        + 32                      // wallet
        + 32                      // agent
        + 32                      // session_pubkey
        + 1                       // bump
        + 8                       // created_at
        + 8                       // expires_at
        + 8                       // max_amount
        + 8                       // amount_spent
        + 8                       // max_per_tx
        + 1                       // is_revoked
        + 8;                      // nonce

    /// Check if the session is currently valid.
    pub fn is_valid(&self, current_timestamp: i64) -> bool {
        !self.is_revoked
            && current_timestamp < self.expires_at
            && self.amount_spent < self.max_amount
    }

    /// Check if a transaction amount is within limits.
    pub fn can_spend(&self, amount: u64) -> bool {
        amount <= self.max_per_tx
            && self.amount_spent.checked_add(amount).map_or(false, |total| total <= self.max_amount)
    }
}
