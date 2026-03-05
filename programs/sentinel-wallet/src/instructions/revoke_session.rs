use pinocchio::error::ProgramError;
use pinocchio::{AccountView, Address, ProgramResult};
use solana_program_log::log;

use crate::error::SentinelError;
use crate::state::{
    SessionKey, SmartWallet, SESSION_KEY_DISCRIMINATOR, SMART_WALLET_DISCRIMINATOR,
};
use crate::utils;

/// Revoke an active session key.
///
/// Either the wallet owner or the agent who created the session can revoke it.
///
/// ## Accounts
/// 0. `[signer]`   Authority — wallet owner OR the session's agent
/// 1. `[writable]`  SessionKey PDA
/// 2. `[]`          SmartWallet PDA
pub fn process(
    program_id: &Address,
    accounts: &[AccountView],
    _data: &[u8],
) -> ProgramResult {
    // ── Parse accounts ──────────────────────────────────────
    if accounts.len() < 3 {
        log!("RevokeSession: expected 3 accounts");
        return Err(ProgramError::NotEnoughAccountKeys);
    }

    let authority = &accounts[0];
    let session_account = &accounts[1];
    let wallet_account = &accounts[2];

    // ── Validate accounts ───────────────────────────────────
    utils::check_signer(authority)?;
    utils::check_writable(session_account)?;

    // Load wallet to get owner.
    let wallet_state: SmartWallet = utils::load_account(
        wallet_account,
        program_id,
        &SMART_WALLET_DISCRIMINATOR,
        SmartWallet::SIZE,
    )?;

    // Load session.
    let mut session_state: SessionKey = utils::load_account(
        session_account,
        program_id,
        &SESSION_KEY_DISCRIMINATOR,
        SessionKey::SIZE,
    )?;

    // Session must belong to this wallet.
    if session_state.wallet != wallet_account.address().to_bytes() {
        log!("RevokeSession: session wallet mismatch");
        return Err(SentinelError::InvalidSessionKey.into());
    }

    // Authority must be either the owner or the agent.
    let authority_bytes = authority.address().to_bytes();
    let is_owner = authority_bytes == wallet_state.owner;
    let is_agent = authority_bytes == session_state.agent;

    if !is_owner && !is_agent {
        log!("RevokeSession: signer is neither owner nor agent");
        return Err(SentinelError::AgentNotAuthorized.into());
    }

    // Already revoked is a no-op (idempotent).
    if session_state.is_revoked {
        log!("RevokeSession: session already revoked");
        return Ok(());
    }

    // ── Revoke ──────────────────────────────────────────────
    session_state.is_revoked = true;
    utils::save_account(&session_state, session_account)?;

    log!("RevokeSession: session revoked");
    Ok(())
}
