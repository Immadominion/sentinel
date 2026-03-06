use pinocchio::error::ProgramError;
use pinocchio::{AccountView, Address, ProgramResult};
use solana_program_log::log;

use crate::error::SealError;
use crate::state::{SmartWallet, SMART_WALLET_DISCRIMINATOR, MAX_GUARDIANS};
use crate::utils;

/// Add a guardian to the wallet for recovery purposes.
///
/// ## Accounts
/// 0. `[signer]`    Owner
/// 1. `[writable]`  SmartWallet PDA
///
/// ## Data (32 bytes)
/// - `[0..32] guardian_pubkey: [u8; 32]`
pub fn process(
    program_id: &Address,
    accounts: &[AccountView],
    data: &[u8],
) -> ProgramResult {
    // ── Parse accounts ──────────────────────────────────────
    if accounts.len() < 2 {
        log!("AddGuardian: expected 2 accounts");
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
        log!("AddGuardian: signer is not the owner");
        return Err(SealError::InvalidWalletOwner.into());
    }

    if wallet_state.is_closed {
        log!("AddGuardian: wallet is closed");
        return Err(SealError::WalletClosed.into());
    }

    if wallet_state.guardian_count as usize >= MAX_GUARDIANS {
        log!("AddGuardian: max guardians reached");
        return Err(SealError::MaxGuardiansReached.into());
    }

    // ── Parse data ──────────────────────────────────────────
    if data.len() < 32 {
        log!("AddGuardian: data too short");
        return Err(ProgramError::InvalidInstructionData);
    }

    let guardian_pubkey = utils::read_pubkey(data, 0)?;

    // Check guardian is not already added.
    let zero_key = [0u8; 32];
    if guardian_pubkey == zero_key {
        log!("AddGuardian: zero key not allowed");
        return Err(ProgramError::InvalidInstructionData);
    }
    for i in 0..wallet_state.guardian_count as usize {
        if wallet_state.guardians[i] == guardian_pubkey {
            log!("AddGuardian: guardian already exists");
            return Err(SealError::GuardianAlreadyAdded.into());
        }
    }

    // ── Add guardian ────────────────────────────────────────
    let idx = wallet_state.guardian_count as usize;
    wallet_state.guardians[idx] = guardian_pubkey;
    wallet_state.guardian_count += 1;
    utils::save_account(&wallet_state, wallet_account)?;

    log!("AddGuardian: guardian added");
    Ok(())
}
