use pinocchio::error::ProgramError;
use pinocchio::{AccountView, Address, ProgramResult};
use solana_program_log::log;

use crate::error::SealError;
use crate::state::{SmartWallet, SMART_WALLET_DISCRIMINATOR};
use crate::utils;

/// Recover wallet by rotating the owner key (guardian-initiated).
///
/// **v1: Simplified** — any single registered guardian can rotate the owner.
/// Future versions will support m-of-n threshold approval.
///
/// ## Accounts
/// 0. `[signer]`    Guardian (one of the registered guardians)
/// 1. `[writable]`  SmartWallet PDA
///
/// ## Data (32 bytes)
/// - `[0..32] new_owner: [u8; 32]` — the new owner pubkey
pub fn process(
    program_id: &Address,
    accounts: &[AccountView],
    data: &[u8],
) -> ProgramResult {
    // ── Parse accounts ──────────────────────────────────────
    if accounts.len() < 2 {
        log!("RecoverWallet: expected 2 accounts");
        return Err(ProgramError::NotEnoughAccountKeys);
    }

    let guardian = &accounts[0];
    let wallet_account = &accounts[1];

    // ── Validate ────────────────────────────────────────────
    utils::check_signer(guardian)?;
    utils::check_writable(wallet_account)?;

    let mut wallet_state: SmartWallet = utils::load_account(
        wallet_account,
        program_id,
        &SMART_WALLET_DISCRIMINATOR,
        SmartWallet::SIZE,
    )?;

    if wallet_state.is_closed {
        log!("RecoverWallet: wallet is closed");
        return Err(SealError::WalletClosed.into());
    }

    // Verify the signer is a registered guardian.
    let guardian_bytes = guardian.address().to_bytes();
    let mut is_guardian = false;
    for i in 0..wallet_state.guardian_count as usize {
        if wallet_state.guardians[i] == guardian_bytes {
            is_guardian = true;
            break;
        }
    }
    if !is_guardian {
        log!("RecoverWallet: signer is not a guardian");
        return Err(SealError::GuardianNotFound.into());
    }

    // ── Parse new owner ─────────────────────────────────────
    if data.len() < 32 {
        log!("RecoverWallet: data too short");
        return Err(ProgramError::InvalidInstructionData);
    }

    let new_owner = utils::read_pubkey(data, 0)?;
    let zero_key = [0u8; 32];
    if new_owner == zero_key {
        log!("RecoverWallet: zero key not allowed as owner");
        return Err(ProgramError::InvalidInstructionData);
    }

    // ── Rotate owner ────────────────────────────────────────
    wallet_state.owner = new_owner;
    // Unlock the wallet if it was locked (recovery implies restoring access).
    wallet_state.is_locked = false;
    utils::save_account(&wallet_state, wallet_account)?;

    log!("RecoverWallet: owner rotated");
    Ok(())
}
