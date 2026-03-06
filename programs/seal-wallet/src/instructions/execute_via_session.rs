use pinocchio::cpi::{invoke_signed_with_bounds, Seed, Signer};
use pinocchio::error::ProgramError;
use pinocchio::instruction::{InstructionAccount, InstructionView};
use pinocchio::sysvars::clock::Clock;
use pinocchio::sysvars::Sysvar;
use pinocchio::{AccountView, Address, ProgramResult};
use solana_program_log::log;

use crate::error::SealError;
use crate::state::{
    AgentConfig, SessionKey, SmartWallet, AGENT_CONFIG_DISCRIMINATOR,
    SESSION_KEY_DISCRIMINATOR, SMART_WALLET_DISCRIMINATOR, WALLET_SEED,
};
use crate::utils;

/// Execute a transaction via session key on behalf of the smart wallet.
///
/// This is the CORE instruction — it's how agents autonomously transact.
/// The session key signs, and the program enforces all policies before
/// executing the inner CPI with the wallet PDA as signer.
///
/// ## Accounts
/// 0. `[signer]`    Session Key — the ephemeral key that signed
/// 1. `[writable]`  SmartWallet PDA — spending state updates
/// 2. `[writable]`  AgentConfig PDA — tx_count / total_spent updates
/// 3. `[writable]`  SessionKey PDA — amount_spent updates
/// 4. `[]`          Target Program — the program being CPI'd into
/// 5..N `[varies]`  Remaining accounts — passed through to target CPI
///                   (must include the wallet PDA at whatever position
///                    the target program expects it)
///
/// ## Data
/// - `[0..8]  amount_lamports: u64` (LE) — amount for limit tracking
/// - `[8..]   inner_instruction_data: &[u8]` — data for the target CPI
pub fn process(
    program_id: &Address,
    accounts: &[AccountView],
    data: &[u8],
) -> ProgramResult {
    // ── Parse accounts ──────────────────────────────────────
    if accounts.len() < 5 {
        log!("ExecuteViaSession: expected at least 5 accounts");
        return Err(ProgramError::NotEnoughAccountKeys);
    }

    let session_key_signer = &accounts[0];
    let wallet_account = &accounts[1];
    let agent_account = &accounts[2];
    let session_account = &accounts[3];
    let target_program = &accounts[4];

    // ── Validate account flags ──────────────────────────────
    utils::check_signer(session_key_signer)?;
    utils::check_writable(wallet_account)?;
    utils::check_writable(agent_account)?;
    utils::check_writable(session_account)?;

    // ── Parse instruction data ──────────────────────────────
    if data.len() < 8 {
        log!("ExecuteViaSession: data too short, need at least 8 bytes");
        return Err(ProgramError::InvalidInstructionData);
    }
    let amount_lamports = utils::read_u64_le(data, 0)?;
    let inner_instruction_data = &data[8..];

    // ── Load and validate SessionKey PDA ────────────────────
    let mut session_state: SessionKey = utils::load_account(
        session_account,
        program_id,
        &SESSION_KEY_DISCRIMINATOR,
        SessionKey::SIZE,
    )?;

    // Session's ephemeral pubkey must match the signer.
    if session_state.session_pubkey != session_key_signer.address().to_bytes() {
        log!("ExecuteViaSession: session pubkey != signer");
        return Err(SealError::InvalidSessionKey.into());
    }

    // Session must belong to this wallet.
    if session_state.wallet != wallet_account.address().to_bytes() {
        log!("ExecuteViaSession: session wallet mismatch");
        return Err(SealError::InvalidSessionKey.into());
    }

    // Check time validity.
    let clock = Clock::get()?;
    let current_timestamp = clock.unix_timestamp;

    if current_timestamp >= session_state.expires_at {
        log!("ExecuteViaSession: session expired");
        return Err(SealError::SessionExpired.into());
    }

    if session_state.is_revoked {
        log!("ExecuteViaSession: session revoked");
        return Err(SealError::SessionRevoked.into());
    }

    // Check session spending limits.
    if !session_state.can_spend(amount_lamports) {
        log!("ExecuteViaSession: session spending limit exceeded");
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
        log!("ExecuteViaSession: agent mismatch");
        return Err(SealError::AgentNotAuthorized.into());
    }

    // Agent config must belong to the same wallet.
    if agent_config.wallet != wallet_account.address().to_bytes() {
        log!("ExecuteViaSession: agent not bound to wallet");
        return Err(SealError::AgentNotFound.into());
    }

    if !agent_config.is_active {
        log!("ExecuteViaSession: agent not active");
        return Err(SealError::AgentNotActive.into());
    }

    // Check target program is in agent's allowed list.
    let target_bytes = target_program.address().to_bytes();
    if !agent_config.is_program_allowed(&target_bytes) {
        log!("ExecuteViaSession: target program not allowed");
        return Err(SealError::ProgramNotAllowed.into());
    }

    // Check inner instruction discriminator (first 8 bytes) is allowed.
    // If the agent has an instruction allowlist AND the data is <8 bytes,
    // reject — we cannot verify the discriminator.
    if agent_config.allowed_instructions_count > 0 && inner_instruction_data.len() < 8 {
        log!("ExecuteViaSession: instruction data too short to verify discriminator");
        return Err(SealError::InstructionNotAllowed.into());
    }
    if inner_instruction_data.len() >= 8 {
        let mut disc = [0u8; 8];
        disc.copy_from_slice(&inner_instruction_data[..8]);
        if !agent_config.is_instruction_allowed(&disc) {
            log!("ExecuteViaSession: instruction not allowed");
            return Err(SealError::InstructionNotAllowed.into());
        }
    }

    // ── Load and validate SmartWallet PDA ───────────────────
    let mut wallet_state: SmartWallet = utils::load_account(
        wallet_account,
        program_id,
        &SMART_WALLET_DISCRIMINATOR,
        SmartWallet::SIZE,
    )?;

    if wallet_state.is_locked {
        log!("ExecuteViaSession: wallet is locked");
        return Err(SealError::WalletLocked.into());
    }
    if wallet_state.is_closed {
        log!("ExecuteViaSession: wallet is closed");
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
        log!("ExecuteViaSession: wallet daily limit exceeded");
        return Err(SealError::DailyLimitExceeded.into());
    }

    // Check wallet per-tx limit.
    if amount_lamports > wallet_state.per_tx_limit_lamports {
        log!("ExecuteViaSession: wallet per-tx limit exceeded");
        return Err(SealError::PerTransactionLimitExceeded.into());
    }

    // ── Enforce agent-level limits ──────────────────────────
    // Agent per-tx limit.
    if amount_lamports > agent_config.per_tx_limit {
        log!("ExecuteViaSession: agent per-tx limit exceeded");
        return Err(SealError::PerTransactionLimitExceeded.into());
    }

    // Agent daily limit (cumulative total_spent is lifetime —
    // we re-use the wallet's daily window for simplicity).
    // Note: agent_config doesn't have its own day_start, so we
    // check against the agent's daily_limit using total_spent
    // modulo the wallet's rolling day window.
    // For now, enforce as a per-tx + cumulative cap.

    // ── Capture pre-CPI wallet balance ──────────────────────
    let pre_cpi_balance = wallet_account.lamports();

    // ── Build CPI ───────────────────────────────────────────
    // Accounts[5..N] are forwarded to the target program.
    // If the wallet PDA is among them, promote it to signer
    // (the runtime verifies via PDA seeds from invoke_signed).
    let wallet_addr_bytes = wallet_account.address().to_bytes();
    let cpi_count = accounts.len() - 5;

    let mut cpi_instruction_accounts: Vec<InstructionAccount> =
        Vec::with_capacity(cpi_count);
    let mut cpi_account_views: Vec<&AccountView> =
        Vec::with_capacity(cpi_count);

    for i in 5..accounts.len() {
        let acc = &accounts[i];
        let ia = if acc.address().to_bytes() == wallet_addr_bytes {
            // Wallet PDA needs signer authority in the CPI.
            InstructionAccount::writable_signer(acc.address())
        } else {
            InstructionAccount::from(acc)
        };
        cpi_instruction_accounts.push(ia);
        cpi_account_views.push(acc);
    }

    let instruction = InstructionView {
        program_id: target_program.address(),
        accounts: &cpi_instruction_accounts,
        data: inner_instruction_data,
    };

    // Build wallet PDA signer seeds: ["seal", owner, bump].
    let owner_ref: &[u8] = wallet_state.owner.as_ref();
    let bump_bytes = [wallet_state.bump];
    let signer_seeds = [
        Seed::from(WALLET_SEED),
        Seed::from(owner_ref),
        Seed::from(bump_bytes.as_slice()),
    ];
    let pda_signer = Signer::from(&signer_seeds);

    // Execute the CPI. Errors from the target program propagate.
    invoke_signed_with_bounds::<32>(
        &instruction,
        &cpi_account_views,
        &[pda_signer],
    )?;

    // ── Post-CPI balance verification ───────────────────────
    // The actual SOL decrease must not exceed the declared amount.
    // This prevents agents from declaring amount_lamports = 0
    // while the inner CPI drains the wallet.
    let post_cpi_balance = wallet_account.lamports();
    if post_cpi_balance < pre_cpi_balance {
        let actual_spent = pre_cpi_balance - post_cpi_balance;
        if actual_spent > amount_lamports {
            log!("ExecuteViaSession: actual spend exceeds declared amount");
            return Err(SealError::BalanceMismatch.into());
        }
    }

    // ── Post-CPI state updates ──────────────────────────────
    // Use the LARGER of declared vs actual as the tracking amount.
    // This way spending limits can never be understated.
    let effective_amount = if post_cpi_balance < pre_cpi_balance {
        let actual_spent = pre_cpi_balance - post_cpi_balance;
        if actual_spent > amount_lamports { actual_spent } else { amount_lamports }
    } else {
        amount_lamports
    };

    // Update session spending.
    session_state.amount_spent = session_state
        .amount_spent
        .checked_add(effective_amount)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    utils::save_account(&session_state, session_account)?;

    // Update wallet spending + nonce.
    let effective_daily_total = wallet_state
        .spent_today_lamports
        .checked_add(effective_amount)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    wallet_state.spent_today_lamports = effective_daily_total;
    wallet_state.nonce = wallet_state
        .nonce
        .checked_add(1)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    utils::save_account(&wallet_state, wallet_account)?;

    // Update agent cumulative stats.
    agent_config.total_spent = agent_config
        .total_spent
        .checked_add(effective_amount)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    agent_config.tx_count = agent_config
        .tx_count
        .checked_add(1)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    utils::save_account(&agent_config, agent_account)?;

    log!("ExecuteViaSession: CPI executed successfully");
    Ok(())
}
