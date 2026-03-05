// Policy engine — client-side policy checks before submitting transactions.
//
// These mirror the on-chain checks so the client can pre-validate
// and give descriptive errors before paying for a failed transaction.

use serde::{Deserialize, Serialize};

/// Policy configuration for an agent (mirrors on-chain AgentConfig).
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AgentPolicy {
    /// Allowed program IDs (base58 strings).
    pub allowed_programs: Vec<String>,
    /// Allowed instruction discriminators (hex strings).
    pub allowed_instructions: Vec<String>,
    /// Daily spending limit in lamports.
    pub daily_limit_lamports: u64,
    /// Per-transaction limit in lamports.
    pub per_tx_limit_lamports: u64,
    /// Spent today (tracked locally, reconciled from chain).
    pub spent_today_lamports: u64,
}

/// Session configuration (mirrors on-chain SessionKey).
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SessionPolicy {
    /// Max total spend for this session.
    pub max_amount: u64,
    /// Amount already spent in this session.
    pub amount_spent: u64,
    /// Per-transaction limit.
    pub max_per_tx: u64,
    /// Session expiry (Unix timestamp).
    pub expires_at: i64,
}

/// Result of a policy check.
#[derive(Debug)]
pub enum PolicyResult {
    Allowed,
    Denied(String),
}

/// Check if a transaction is allowed by both agent and session policies.
pub fn check_transaction(
    agent: &AgentPolicy,
    session: &SessionPolicy,
    target_program: &str,
    instruction_discriminator: &str,
    amount_lamports: u64,
    current_timestamp: i64,
) -> PolicyResult {
    // 1. Session expiry
    if current_timestamp >= session.expires_at {
        return PolicyResult::Denied("Session expired".into());
    }

    // 2. Session spending
    if session.amount_spent + amount_lamports > session.max_amount {
        return PolicyResult::Denied(format!(
            "Session spend limit exceeded: {} + {} > {}",
            session.amount_spent, amount_lamports, session.max_amount
        ));
    }

    // 3. Per-tx limit (session)
    if amount_lamports > session.max_per_tx {
        return PolicyResult::Denied(format!(
            "Per-tx limit exceeded (session): {} > {}",
            amount_lamports, session.max_per_tx
        ));
    }

    // 4. Agent daily limit
    if agent.spent_today_lamports + amount_lamports > agent.daily_limit_lamports {
        return PolicyResult::Denied(format!(
            "Agent daily limit exceeded: {} + {} > {}",
            agent.spent_today_lamports, amount_lamports, agent.daily_limit_lamports
        ));
    }

    // 5. Agent per-tx limit
    if amount_lamports > agent.per_tx_limit_lamports {
        return PolicyResult::Denied(format!(
            "Per-tx limit exceeded (agent): {} > {}",
            amount_lamports, agent.per_tx_limit_lamports
        ));
    }

    // 6. Program allowlist
    if !agent.allowed_programs.is_empty()
        && !agent.allowed_programs.contains(&target_program.to_string())
    {
        return PolicyResult::Denied(format!("Program not allowed: {target_program}"));
    }

    // 7. Instruction allowlist
    if !agent.allowed_instructions.is_empty()
        && !agent
            .allowed_instructions
            .contains(&instruction_discriminator.to_string())
    {
        return PolicyResult::Denied(format!(
            "Instruction not allowed: {instruction_discriminator}"
        ));
    }

    PolicyResult::Allowed
}
