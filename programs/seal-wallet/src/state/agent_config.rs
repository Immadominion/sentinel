use borsh::{BorshDeserialize, BorshSerialize};

use super::{MAX_ALLOWED_PROGRAMS, MAX_ALLOWED_INSTRUCTIONS};

/// Configuration for a registered agent — defines what the agent is allowed to do.
///
/// PDA seeds: ["agent", wallet_pubkey, agent_pubkey]
///
/// Each agent has an explicit scope: which programs it can call, which
/// instructions, and how much it can spend. This is the on-chain policy.
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct AgentConfig {
    /// Account discriminator.
    pub discriminator: [u8; 8],
    /// The parent smart wallet PDA.
    pub wallet: [u8; 32],
    /// The agent's identity pubkey.
    pub agent: [u8; 32],
    /// Human-readable agent name (max 32 bytes, UTF-8).
    pub name: [u8; 32],
    /// PDA bump seed.
    pub bump: u8,
    /// Whether this agent is currently active.
    pub is_active: bool,
    /// Number of allowed programs.
    pub allowed_programs_count: u8,
    /// Program IDs this agent is allowed to CPI into.
    pub allowed_programs: [[u8; 32]; MAX_ALLOWED_PROGRAMS],
    /// Number of allowed instruction discriminators.
    pub allowed_instructions_count: u8,
    /// Instruction discriminators (first 8 bytes) this agent can execute.
    pub allowed_instructions: [[u8; 8]; MAX_ALLOWED_INSTRUCTIONS],
    /// Maximum lamports this agent can spend per day.
    pub daily_limit: u64,
    /// Maximum lamports per transaction for this agent.
    pub per_tx_limit: u64,
    /// Default session duration in seconds.
    pub default_session_duration: i64,
    /// Maximum session duration in seconds.
    pub max_session_duration: i64,
    /// Total lamports spent by this agent (cumulative).
    pub total_spent: u64,
    /// Number of transactions executed by this agent (cumulative).
    pub tx_count: u64,
    /// Lamports spent by this agent today (rolling daily window).
    pub spent_today: u64,
    /// Unix timestamp of the start of the current daily window.
    pub day_start_timestamp: i64,
}

impl AgentConfig {
    /// Total account size in bytes.
    pub const SIZE: usize = 8    // discriminator
        + 32                      // wallet
        + 32                      // agent
        + 32                      // name
        + 1                       // bump
        + 1                       // is_active
        + 1                       // allowed_programs_count
        + (MAX_ALLOWED_PROGRAMS * 32)  // allowed_programs
        + 1                       // allowed_instructions_count
        + (MAX_ALLOWED_INSTRUCTIONS * 8) // allowed_instructions
        + 8                       // daily_limit
        + 8                       // per_tx_limit
        + 8                       // default_session_duration
        + 8                       // max_session_duration
        + 8                       // total_spent
        + 8                       // tx_count
        + 8                       // spent_today
        + 8;                      // day_start_timestamp

    /// Check if this agent is allowed to call a specific program.
    ///
    /// **Default-open**: if no programs are registered, all programs are allowed.
    /// Security is enforced at the session/spending-limit level.
    /// Use the allowlist for fine-grained restriction on specific agents.
    pub fn is_program_allowed(&self, program_id: &[u8; 32]) -> bool {
        if self.allowed_programs_count == 0 {
            return true; // default-open: no restrictions = all programs allowed
        }
        for i in 0..self.allowed_programs_count as usize {
            if self.allowed_programs[i] == *program_id {
                return true;
            }
        }
        false
    }

    /// Check if this agent is allowed to execute a specific instruction.
    ///
    /// **Default-open**: if no instruction restrictions are set,
    /// all instructions on an allowed program are permitted.
    /// Use instruction restrictions for fine-grained control on sensitive programs
    /// (e.g., restricting Token Program to Transfer only).
    pub fn is_instruction_allowed(&self, discriminator: &[u8; 8]) -> bool {
        if self.allowed_instructions_count == 0 {
            return true; // no restrictions = all instructions allowed on allowed programs
        }
        for i in 0..self.allowed_instructions_count as usize {
            if self.allowed_instructions[i] == *discriminator {
                return true;
            }
        }
        false
    }
}
