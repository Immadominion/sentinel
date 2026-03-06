use pinocchio::error::ProgramError;
use pinocchio::{AccountView, Address, ProgramResult};
use solana_program_log::log;

use crate::error::SealError;
use crate::state::{SmartWallet, SMART_WALLET_DISCRIMINATOR};
use crate::utils;

/// Set the m-of-n recovery threshold (owner-only).
///
/// The threshold must be >= 1 and <= guardian_count.
/// This determines how many guardians must co-sign a RecoverWallet instruction.
///
/// ## Accounts
/// 0. `[signer]`    Owner
/// 1. `[writable]`  SmartWallet PDA
///
/// ## Data (1 byte)
/// - `[0] threshold: u8` — the new recovery threshold
pub fn process(
    program_id: &Address,
    accounts: &[AccountView],
    data: &[u8],
) -> ProgramResult {
    // ── Parse accounts ──────────────────────────────────────
    if accounts.len() < 2 {
        log!("SetRecoveryThreshold: expected 2 accounts");
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
        log!("SetRecoveryThreshold: signer is not the owner");
        return Err(SealError::InvalidWalletOwner.into());
    }

    if wallet_state.is_closed {
        log!("SetRecoveryThreshold: wallet is closed");
        return Err(SealError::WalletClosed.into());
    }

    // ── Parse threshold ─────────────────────────────────────
    if data.is_empty() {
        log!("SetRecoveryThreshold: data too short");
        return Err(ProgramError::InvalidInstructionData);
    }

    let threshold = data[0];

    if threshold == 0 {
        log!("SetRecoveryThreshold: threshold must be >= 1");
        return Err(ProgramError::InvalidInstructionData);
    }

    if threshold > wallet_state.guardian_count {
        log!("SetRecoveryThreshold: threshold exceeds guardian count");
        return Err(SealError::InsufficientGuardianApprovals.into());
    }

    // ── Update ──────────────────────────────────────────────
    wallet_state.recovery_threshold = threshold;
    utils::save_account(&wallet_state, wallet_account)?;

    log!("SetRecoveryThreshold: set to {}", threshold);
    Ok(())
}
