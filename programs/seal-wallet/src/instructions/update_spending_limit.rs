use pinocchio::error::ProgramError;
use pinocchio::{AccountView, Address, ProgramResult};
use solana_program_log::log;

use crate::error::SealError;
use crate::state::{SmartWallet, SMART_WALLET_DISCRIMINATOR};
use crate::utils;

/// Update spending limits on the wallet.
///
/// ## Accounts
/// 0. `[signer]`    Owner
/// 1. `[writable]`  SmartWallet PDA
///
/// ## Data (16 bytes)
/// - `[0..8]  new_daily_limit: u64` (LE)
/// - `[8..16] new_per_tx_limit: u64` (LE)
pub fn process(
    program_id: &Address,
    accounts: &[AccountView],
    data: &[u8],
) -> ProgramResult {
    // ── Parse accounts ──────────────────────────────────────
    if accounts.len() < 2 {
        log!("UpdateSpendingLimit: expected 2 accounts");
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

    // Only the owner can update limits.
    if wallet_state.owner != owner.address().to_bytes() {
        log!("UpdateSpendingLimit: signer is not the owner");
        return Err(SealError::InvalidWalletOwner.into());
    }

    if wallet_state.is_closed {
        log!("UpdateSpendingLimit: wallet is closed");
        return Err(SealError::WalletClosed.into());
    }

    // ── Parse data ──────────────────────────────────────────
    if data.len() < 16 {
        log!("UpdateSpendingLimit: data too short");
        return Err(ProgramError::InvalidInstructionData);
    }

    let new_daily_limit = utils::read_u64_le(data, 0)?;
    let new_per_tx_limit = utils::read_u64_le(data, 8)?;

    // Validate limits.
    if new_daily_limit == 0 || new_per_tx_limit == 0 {
        log!("UpdateSpendingLimit: limits must be > 0");
        return Err(ProgramError::InvalidInstructionData);
    }
    if new_per_tx_limit > new_daily_limit {
        log!("UpdateSpendingLimit: per-tx > daily");
        return Err(ProgramError::InvalidInstructionData);
    }

    // ── Update ──────────────────────────────────────────────
    // NOTE: Existing agent configs may hold higher limits than the new
    // wallet limits. This is safe because wallet limits are enforced at
    // execution time (ExecuteViaSession) and session creation time.
    // However, the owner should review and update agent limits separately.
    wallet_state.daily_limit_lamports = new_daily_limit;
    wallet_state.per_tx_limit_lamports = new_per_tx_limit;
    utils::save_account(&wallet_state, wallet_account)?;

    log!("UpdateSpendingLimit: limits updated — review agent configs if reduced");
    Ok(())
}
