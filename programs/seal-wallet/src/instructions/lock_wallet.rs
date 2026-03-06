use pinocchio::error::ProgramError;
use pinocchio::{AccountView, Address, ProgramResult};
use solana_program_log::log;

use crate::error::SealError;
use crate::state::{SmartWallet, SMART_WALLET_DISCRIMINATOR};
use crate::utils;

/// Lock or unlock a wallet (owner-only emergency toggle).
///
/// When locked, ALL agent operations via `ExecuteViaSession` are blocked.
/// The owner can unlock at any time. This is the emergency brake.
///
/// ## Accounts
/// 0. `[signer]`    Owner
/// 1. `[writable]`  SmartWallet PDA
///
/// ## Data (1 byte)
/// - `[0] lock_flag: u8` — 1 = lock, 0 = unlock
pub fn process(
    program_id: &Address,
    accounts: &[AccountView],
    data: &[u8],
) -> ProgramResult {
    // ── Parse accounts ──────────────────────────────────────
    if accounts.len() < 2 {
        log!("LockWallet: expected 2 accounts");
        return Err(ProgramError::NotEnoughAccountKeys);
    }

    let owner = &accounts[0];
    let wallet_account = &accounts[1];

    // ── Validate ────────────────────────────────────────────
    utils::check_signer(owner)?;
    utils::check_writable(wallet_account)?;

    let mut wallet_state: SmartWallet = utils::load_account(
        wallet_account,
        program_id,
        &SMART_WALLET_DISCRIMINATOR,
        SmartWallet::SIZE,
    )?;

    if wallet_state.owner != owner.address().to_bytes() {
        log!("LockWallet: signer is not the owner");
        return Err(SealError::InvalidWalletOwner.into());
    }

    if wallet_state.is_closed {
        log!("LockWallet: wallet is closed");
        return Err(SealError::WalletClosed.into());
    }

    // ── Parse data ──────────────────────────────────────────
    if data.is_empty() {
        log!("LockWallet: data too short");
        return Err(ProgramError::InvalidInstructionData);
    }

    let lock_flag = data[0];
    if lock_flag > 1 {
        log!("LockWallet: invalid lock flag (must be 0 or 1)");
        return Err(ProgramError::InvalidInstructionData);
    }

    let new_locked = lock_flag == 1;

    // ── Update ──────────────────────────────────────────────
    wallet_state.is_locked = new_locked;
    utils::save_account(&wallet_state, wallet_account)?;

    if new_locked {
        log!("LockWallet: wallet LOCKED — all agent operations blocked");
    } else {
        log!("LockWallet: wallet UNLOCKED");
    }
    Ok(())
}
