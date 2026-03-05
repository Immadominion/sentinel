use pinocchio::cpi::{Seed, Signer};
use pinocchio::error::ProgramError;
use pinocchio::sysvars::clock::Clock;
use pinocchio::sysvars::Sysvar;
use pinocchio::{AccountView, Address, ProgramResult};
use solana_program_log::log;

use crate::error::SentinelError;
use crate::state::{
    AgentConfig, SessionKey, SmartWallet, AGENT_CONFIG_DISCRIMINATOR,
    SESSION_KEY_DISCRIMINATOR, SESSION_SEED, SMART_WALLET_DISCRIMINATOR,
};
use crate::utils;

/// Create a new session key for an agent.
///
/// ## Accounts
/// 0. `[signer, writable]` Agent — must match registered agent, pays for session
/// 1. `[]`                  SmartWallet PDA
/// 2. `[]`                  AgentConfig PDA
/// 3. `[writable]`          SessionKey PDA — the new session account
/// 4. `[]`                  System Program
///
/// ## Data (57 bytes)
/// - `bump: u8` — SessionKey PDA bump seed
/// - `session_pubkey: [u8; 32]` — the ephemeral session key
/// - `duration: i64` (LE) — session duration in seconds
/// - `max_amount: u64` (LE) — session spending cap
/// - `max_per_tx: u64` (LE)
pub fn process(
    program_id: &Address,
    accounts: &[AccountView],
    data: &[u8],
) -> ProgramResult {
    // ── Parse accounts ──────────────────────────────────────
    if accounts.len() < 5 {
        log!("CreateSession: expected 5 accounts");
        return Err(ProgramError::NotEnoughAccountKeys);
    }

    let agent = &accounts[0];
    let wallet_account = &accounts[1];
    let agent_account = &accounts[2];
    let session_account = &accounts[3];
    let _system_program = &accounts[4];

    // ── Validate accounts ───────────────────────────────────
    utils::check_signer(agent)?;
    utils::check_writable(agent)?;
    utils::check_writable(session_account)?;

    // Load wallet.
    let wallet_state: SmartWallet = utils::load_account(
        wallet_account,
        program_id,
        &SMART_WALLET_DISCRIMINATOR,
        SmartWallet::SIZE,
    )?;

    if wallet_state.is_locked {
        log!("CreateSession: wallet is locked");
        return Err(SentinelError::WalletClosed.into());
    }
    if wallet_state.is_closed {
        log!("CreateSession: wallet is closed");
        return Err(SentinelError::WalletClosed.into());
    }

    // Load agent config.
    let agent_config: AgentConfig = utils::load_account(
        agent_account,
        program_id,
        &AGENT_CONFIG_DISCRIMINATOR,
        AgentConfig::SIZE,
    )?;

    // Verify agent signer matches agent config.
    if agent.address().to_bytes() != agent_config.agent {
        log!("CreateSession: signer is not the registered agent");
        return Err(SentinelError::AgentNotAuthorized.into());
    }

    // Verify agent config belongs to the wallet.
    if agent_config.wallet != wallet_account.address().to_bytes() {
        log!("CreateSession: agent not bound to this wallet");
        return Err(SentinelError::AgentNotFound.into());
    }

    if !agent_config.is_active {
        log!("CreateSession: agent is not active");
        return Err(SentinelError::AgentNotActive.into());
    }

    // Session account must be empty.
    if !session_account.is_data_empty() {
        log!("CreateSession: session account already exists");
        return Err(SentinelError::AccountAlreadyInitialized.into());
    }

    // ── Parse instruction data ──────────────────────────────
    if data.len() < 57 {
        log!("CreateSession: data too short");
        return Err(ProgramError::InvalidInstructionData);
    }

    let bump = data[0];
    let session_pubkey = utils::read_pubkey(data, 1)?;
    let duration = utils::read_i64_le(data, 33)?;
    let max_amount = utils::read_u64_le(data, 41)?;
    let max_per_tx = utils::read_u64_le(data, 49)?;

    // Validate parameters against agent policy.
    if duration <= 0 {
        log!("CreateSession: duration must be > 0");
        return Err(ProgramError::InvalidInstructionData);
    }
    if duration > agent_config.max_session_duration {
        log!("CreateSession: duration exceeds agent max");
        return Err(SentinelError::SessionScopeViolation.into());
    }
    if max_per_tx > max_amount {
        return Err(ProgramError::InvalidInstructionData);
    }
    // Session spending cannot exceed agent limits.
    if max_amount > agent_config.daily_limit {
        log!("CreateSession: max_amount exceeds agent daily limit");
        return Err(SentinelError::SpendingLimitExceeded.into());
    }
    if max_per_tx > agent_config.per_tx_limit {
        log!("CreateSession: max_per_tx exceeds agent per-tx limit");
        return Err(SentinelError::PerTransactionLimitExceeded.into());
    }

    // ── Get current time ────────────────────────────────────
    let clock = Clock::get()?;
    let current_timestamp = clock.unix_timestamp;

    // ── Create SessionKey PDA ───────────────────────────────
    let wallet_addr: &[u8] = wallet_account.address().as_ref();
    let agent_addr: &[u8] = agent.address().as_ref();
    let bump_bytes = [bump];

    let signer_seeds = [
        Seed::from(SESSION_SEED),
        Seed::from(wallet_addr),
        Seed::from(agent_addr),
        Seed::from(session_pubkey.as_slice()),
        Seed::from(bump_bytes.as_slice()),
    ];
    let signer = Signer::from(&signer_seeds);

    pinocchio_system::create_account_with_minimum_balance_signed(
        session_account,
        SessionKey::SIZE,
        program_id,
        agent,
        None,
        &[signer],
    )?;

    // ── Initialise SessionKey ───────────────────────────────
    let session_state = SessionKey {
        discriminator: SESSION_KEY_DISCRIMINATOR,
        wallet: wallet_account.address().to_bytes(),
        agent: agent.address().to_bytes(),
        session_pubkey,
        bump,
        created_at: current_timestamp,
        expires_at: current_timestamp
            .checked_add(duration)
            .ok_or(ProgramError::ArithmeticOverflow)?,
        max_amount,
        amount_spent: 0,
        max_per_tx,
        is_revoked: false,
        nonce: wallet_state.nonce,
    };

    utils::save_account(&session_state, session_account)?;

    log!("CreateSession: success");
    Ok(())
}
