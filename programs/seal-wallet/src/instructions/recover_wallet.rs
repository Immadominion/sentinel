use pinocchio::error::ProgramError;
use pinocchio::{AccountView, Address, ProgramResult};
use solana_program_log::log;

use crate::error::SealError;
use crate::state::{SmartWallet, SMART_WALLET_DISCRIMINATOR};
use crate::utils;

/// Recover wallet by rotating the owner key (guardian-initiated, m-of-n threshold).
///
/// Multiple guardians must co-sign the transaction to reach the recovery threshold.
/// All signing guardians must be unique and registered on the wallet.
///
/// ## Accounts
/// 0..M `[signer]`   Guardians (M must be >= recovery_threshold)
/// M    `[writable]`  SmartWallet PDA
///
/// ## Data (32 bytes)
/// - `[0..32] new_owner: [u8; 32]` — the new owner pubkey
pub fn process(
    program_id: &Address,
    accounts: &[AccountView],
    data: &[u8],
) -> ProgramResult {
    // ── Parse accounts ──────────────────────────────────────
    // Last account is the wallet. All preceding are guardian signers.
    if accounts.len() < 2 {
        log!("RecoverWallet: expected at least 2 accounts (guardian + wallet)");
        return Err(ProgramError::NotEnoughAccountKeys);
    }

    let wallet_account = &accounts[accounts.len() - 1];
    let guardian_count = accounts.len() - 1;

    // ── Validate wallet ─────────────────────────────────────
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

    // ── Check threshold ─────────────────────────────────────
    let threshold = wallet_state.recovery_threshold.max(1) as usize;
    if guardian_count < threshold {
        log!("RecoverWallet: insufficient guardian approvals");
        return Err(SealError::InsufficientGuardianApprovals.into());
    }

    // ── Validate each guardian signer ───────────────────────
    // Each must be: (a) a signer, (b) a registered guardian, (c) unique.
    let mut verified_guardians = [[0u8; 32]; 5]; // MAX_GUARDIANS = 5
    let mut verified_count = 0usize;

    for i in 0..guardian_count {
        let guardian = &accounts[i];
        utils::check_signer(guardian)?;

        let guardian_bytes = guardian.address().to_bytes();

        // Check uniqueness (no duplicate guardian signatures)
        for j in 0..verified_count {
            if verified_guardians[j] == guardian_bytes {
                log!("RecoverWallet: duplicate guardian signer");
                return Err(ProgramError::InvalidInstructionData.into());
            }
        }

        // Check guardian is registered on the wallet
        let mut is_registered = false;
        for g in 0..wallet_state.guardian_count as usize {
            if wallet_state.guardians[g] == guardian_bytes {
                is_registered = true;
                break;
            }
        }
        if !is_registered {
            log!("RecoverWallet: signer is not a registered guardian");
            return Err(SealError::GuardianNotFound.into());
        }

        verified_guardians[verified_count] = guardian_bytes;
        verified_count += 1;
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
    // CRITICAL: pda_authority is NEVER changed — it's the immutable PDA seed.
    // Only the rotatable `owner` authority is updated.
    wallet_state.owner = new_owner;
    // Unlock the wallet if it was locked (recovery implies restoring access).
    wallet_state.is_locked = false;
    utils::save_account(&wallet_state, wallet_account)?;

    log!("RecoverWallet: owner rotated by {} guardian(s)", verified_count);
    Ok(())
}
