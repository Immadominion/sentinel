use pinocchio::error::ProgramError;
use pinocchio::sysvars::clock::Clock;
use pinocchio::sysvars::Sysvar;
use pinocchio::{AccountView, Address, ProgramResult};
use solana_program_log::log;

use crate::error::SealError;
use crate::state::{
    AgentConfig, SessionKey, SmartWallet, AGENT_CONFIG_DISCRIMINATOR, SESSION_KEY_DISCRIMINATOR,
    SMART_WALLET_DISCRIMINATOR,
};
use crate::utils;

/// Transfer lamports from the wallet PDA to a destination account,
/// authorized by a valid session key.
///
/// This instruction solves the fundamental PDA ownership problem:
/// the wallet PDA is owned by the Seal program, so it cannot be used
/// as a payer in SystemProgram::Transfer or CreateAccount. Instead,
/// this instruction directly debits the wallet PDA and credits the
/// destination — which is allowed because the Seal program owns the
/// wallet PDA account.
///
/// The same spending limits, daily caps, and session validation from
/// ExecuteViaSession apply here.
///
/// ## Accounts
/// 0. `[signer]`    Session Key — the ephemeral key that signed
/// 1. `[writable]`  SmartWallet PDA — source of funds
/// 2. `[writable]`  AgentConfig PDA — spending state updates
/// 3. `[writable]`  SessionKey PDA — spending state updates
/// 4. `[writable]`  Destination — receives lamports
///
/// ## Data (8 bytes)
/// - `[0..8] amount_lamports: u64` (LE) — amount to transfer
pub fn process(program_id: &Address, accounts: &[AccountView], data: &[u8]) -> ProgramResult {
    // ── Parse accounts ──────────────────────────────────────
    if accounts.len() < 5 {
        log!("TransferLamports: expected at least 5 accounts");
        return Err(ProgramError::NotEnoughAccountKeys);
    }

    let session_key_signer = &accounts[0];
    let wallet_account = &accounts[1];
    let agent_account = &accounts[2];
    let session_account = &accounts[3];
    let destination = &accounts[4];

    // ── Validate account flags ──────────────────────────────
    utils::check_signer(session_key_signer)?;
    utils::check_writable(wallet_account)?;
    utils::check_writable(agent_account)?;
    utils::check_writable(session_account)?;
    utils::check_writable(destination)?;

    // ── Parse instruction data ──────────────────────────────
    if data.len() < 8 {
        log!("TransferLamports: data too short, need 8 bytes");
        return Err(ProgramError::InvalidInstructionData);
    }
    let amount_lamports = utils::read_u64_le(data, 0)?;

    if amount_lamports == 0 {
        log!("TransferLamports: amount must be > 0");
        return Err(ProgramError::InvalidInstructionData);
    }

    // ── Load and validate SessionKey PDA ────────────────────
    let mut session_state: SessionKey = utils::load_account(
        session_account,
        program_id,
        &SESSION_KEY_DISCRIMINATOR,
        SessionKey::SIZE,
    )?;

    // Session's ephemeral pubkey must match the signer.
    if session_state.session_pubkey != session_key_signer.address().to_bytes() {
        log!("TransferLamports: session pubkey != signer");
        return Err(SealError::InvalidSessionKey.into());
    }

    // Session must belong to this wallet.
    if session_state.wallet != wallet_account.address().to_bytes() {
        log!("TransferLamports: session wallet mismatch");
        return Err(SealError::InvalidSessionKey.into());
    }

    // Check time validity.
    let clock = Clock::get()?;
    let current_timestamp = clock.unix_timestamp;

    if current_timestamp >= session_state.expires_at {
        log!("TransferLamports: session expired");
        return Err(SealError::SessionExpired.into());
    }

    if session_state.is_revoked {
        log!("TransferLamports: session revoked");
        return Err(SealError::SessionRevoked.into());
    }

    // Check session spending limits.
    if !session_state.can_spend(amount_lamports) {
        log!("TransferLamports: session spending limit exceeded");
        return Err(SealError::SpendingLimitExceeded.into());
    }

    // ── Load and validate AgentConfig PDA ───────────────────
    let mut agent_config: AgentConfig = utils::load_account(
        agent_account,
        program_id,
        &AGENT_CONFIG_DISCRIMINATOR,
        AgentConfig::SIZE,
    )?;

    // Agent must match the session's agent.
    if agent_config.agent != session_state.agent {
        log!("TransferLamports: agent mismatch");
        return Err(SealError::AgentNotAuthorized.into());
    }

    // Agent config must belong to the same wallet.
    if agent_config.wallet != wallet_account.address().to_bytes() {
        log!("TransferLamports: agent not bound to wallet");
        return Err(SealError::AgentNotFound.into());
    }

    if !agent_config.is_active {
        log!("TransferLamports: agent not active");
        return Err(SealError::AgentNotActive.into());
    }

    // ── Load and validate SmartWallet PDA ───────────────────
    let mut wallet_state: SmartWallet = utils::load_account(
        wallet_account,
        program_id,
        &SMART_WALLET_DISCRIMINATOR,
        SmartWallet::SIZE,
    )?;

    if wallet_state.is_locked {
        log!("TransferLamports: wallet is locked");
        return Err(SealError::WalletLocked.into());
    }
    if wallet_state.is_closed {
        log!("TransferLamports: wallet is closed");
        return Err(SealError::WalletClosed.into());
    }

    // Reset daily spending window if a new day started.
    utils::maybe_reset_daily_spend(
        &mut wallet_state.spent_today_lamports,
        &mut wallet_state.day_start_timestamp,
        current_timestamp,
    );

    // Check wallet daily limit.
    let new_daily_total = wallet_state
        .spent_today_lamports
        .checked_add(amount_lamports)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    if new_daily_total > wallet_state.daily_limit_lamports {
        log!("TransferLamports: wallet daily limit exceeded");
        return Err(SealError::DailyLimitExceeded.into());
    }

    // Check wallet per-tx limit.
    if amount_lamports > wallet_state.per_tx_limit_lamports {
        log!("TransferLamports: wallet per-tx limit exceeded");
        return Err(SealError::PerTransactionLimitExceeded.into());
    }

    // ── Enforce agent-level limits ──────────────────────────
    if amount_lamports > agent_config.per_tx_limit {
        log!("TransferLamports: agent per-tx limit exceeded");
        return Err(SealError::PerTransactionLimitExceeded.into());
    }

    utils::maybe_reset_daily_spend(
        &mut agent_config.spent_today,
        &mut agent_config.day_start_timestamp,
        current_timestamp,
    );
    let agent_new_daily = agent_config
        .spent_today
        .checked_add(amount_lamports)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    if agent_new_daily > agent_config.daily_limit {
        log!("TransferLamports: agent daily limit exceeded");
        return Err(SealError::DailyLimitExceeded.into());
    }

    // ── Execute transfer ────────────────────────────────────
    // The Seal program owns the wallet PDA account, so we can
    // directly debit/credit lamports. No CPI needed.
    //
    // Safety: retain enough lamports for rent exemption.
    // SmartWallet::SIZE = 278 bytes → ~0.003 SOL rent-exempt minimum.
    // We keep a conservative buffer of 890_880 lamports (rent for 278 bytes).
    const MIN_RENT_LAMPORTS: u64 = 890_880;

    let wallet_balance = wallet_account.lamports();
    let post_transfer_balance = wallet_balance
        .checked_sub(amount_lamports)
        .ok_or(ProgramError::from(SealError::InsufficientFunds))?;

    if post_transfer_balance < MIN_RENT_LAMPORTS {
        log!("TransferLamports: would drop below rent-exempt minimum");
        return Err(SealError::InsufficientFunds.into());
    }

    // Debit wallet PDA, credit destination.
    wallet_account.set_lamports(post_transfer_balance);
    let dest_balance = destination
        .lamports()
        .checked_add(amount_lamports)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    destination.set_lamports(dest_balance);

    // ── Post-transfer state updates ─────────────────────────
    // Update session spending.
    session_state.amount_spent = session_state
        .amount_spent
        .checked_add(amount_lamports)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    utils::save_account(&session_state, session_account)?;

    // Update wallet spending + nonce.
    wallet_state.spent_today_lamports = new_daily_total;
    wallet_state.nonce = wallet_state
        .nonce
        .checked_add(1)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    utils::save_account(&wallet_state, wallet_account)?;

    // Update agent cumulative stats + daily spending.
    agent_config.total_spent = agent_config
        .total_spent
        .checked_add(amount_lamports)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    agent_config.tx_count = agent_config
        .tx_count
        .checked_add(1)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    agent_config.spent_today = agent_new_daily;
    utils::save_account(&agent_config, agent_account)?;

    log!("TransferLamports: transferred from wallet PDA to destination");
    Ok(())
}
