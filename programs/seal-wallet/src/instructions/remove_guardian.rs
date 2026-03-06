use pinocchio::error::ProgramError;
use pinocchio::{AccountView, Address, ProgramResult};
use solana_program_log::log;

use crate::error::SealError;
use crate::state::{SmartWallet, SMART_WALLET_DISCRIMINATOR};
use crate::utils;

/// Remove a guardian from the wallet (owner-only).
///
/// After removal, the recovery_threshold is clamped to the remaining
/// guardian count so recovery remains possible.
///
/// ## Accounts
/// 0. `[signer]`    Owner
/// 1. `[writable]`  SmartWallet PDA
///
/// ## Data (32 bytes)
/// - `[0..32] guardian_pubkey: [u8; 32]` — the guardian to remove
pub fn process(
    program_id: &Address,
    accounts: &[AccountView],
    data: &[u8],
) -> ProgramResult {
    // ── Parse accounts ──────────────────────────────────────
    if accounts.len() < 2 {
        log!("RemoveGuardian: expected 2 accounts");
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
        log!("RemoveGuardian: signer is not the owner");
        return Err(SealError::InvalidWalletOwner.into());
    }

    if wallet_state.is_closed {
        log!("RemoveGuardian: wallet is closed");
        return Err(SealError::WalletClosed.into());
    }

    // ── Parse data ──────────────────────────────────────────
    if data.len() < 32 {
        log!("RemoveGuardian: data too short");
        return Err(ProgramError::InvalidInstructionData);
    }

    let guardian_pubkey = utils::read_pubkey(data, 0)?;

    // ── Find and remove guardian ────────────────────────────
    let count = wallet_state.guardian_count as usize;
    let mut found_idx: Option<usize> = None;

    for i in 0..count {
        if wallet_state.guardians[i] == guardian_pubkey {
            found_idx = Some(i);
            break;
        }
    }

    let idx = match found_idx {
        Some(i) => i,
        None => {
            log!("RemoveGuardian: guardian not found");
            return Err(SealError::GuardianNotFound.into());
        }
    };

    // Shift remaining guardians left to fill the gap.
    for i in idx..count - 1 {
        wallet_state.guardians[i] = wallet_state.guardians[i + 1];
    }
    // Zero out the last slot.
    wallet_state.guardians[count - 1] = [0u8; 32];
    wallet_state.guardian_count -= 1;

    // Clamp recovery_threshold so it doesn't exceed the new guardian count.
    if wallet_state.recovery_threshold > wallet_state.guardian_count {
        wallet_state.recovery_threshold = wallet_state.guardian_count;
    }

    utils::save_account(&wallet_state, wallet_account)?;

    log!("RemoveGuardian: guardian removed, count={}", wallet_state.guardian_count);
    Ok(())
}
