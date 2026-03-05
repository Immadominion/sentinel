use pinocchio::error::ProgramError;
use pinocchio::{AccountView, Address, ProgramResult};
use solana_program_log::log;

use crate::error::SentinelError;
use crate::state::{SmartWallet, SMART_WALLET_DISCRIMINATOR};
use crate::utils;

/// Permanently close the wallet. All agents must be deregistered first.
///
/// ## Accounts
/// 0. `[signer, writable]` Owner — receives rent refund
/// 1. `[writable]`          SmartWallet PDA — will be closed
pub fn process(
    program_id: &Address,
    accounts: &[AccountView],
    _data: &[u8],
) -> ProgramResult {
    // ── Parse accounts ──────────────────────────────────────
    if accounts.len() < 2 {
        log!("CloseWallet: expected 2 accounts");
        return Err(ProgramError::NotEnoughAccountKeys);
    }

    let owner = &accounts[0];
    let wallet_account = &accounts[1];

    // ── Validate ────────────────────────────────────────────
    utils::check_signer(owner)?;
    utils::check_writable(owner)?;
    utils::check_writable(wallet_account)?;

    let wallet_state: SmartWallet = utils::load_account(
        wallet_account,
        program_id,
        &SMART_WALLET_DISCRIMINATOR,
        SmartWallet::SIZE,
    )?;

    if wallet_state.owner != owner.address().to_bytes() {
        log!("CloseWallet: signer is not the owner");
        return Err(SentinelError::InvalidWalletOwner.into());
    }

    if wallet_state.is_closed {
        log!("CloseWallet: wallet already closed");
        return Err(SentinelError::WalletClosed.into());
    }

    // All agents must be deregistered before closing.
    if wallet_state.agent_count > 0 {
        log!("CloseWallet: agents still registered");
        return Err(SentinelError::InvalidAccountData.into());
    }

    // ── Close wallet account ────────────────────────────────
    // Transfer rent lamports to owner.
    let rent_lamports = wallet_account.lamports();
    let owner_lamports = owner
        .lamports()
        .checked_add(rent_lamports)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    wallet_account.set_lamports(0);
    owner.set_lamports(owner_lamports);
    wallet_account.close()?;

    log!("CloseWallet: wallet closed, rent returned");
    Ok(())
}
