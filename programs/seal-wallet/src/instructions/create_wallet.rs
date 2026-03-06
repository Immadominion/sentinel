use pinocchio::cpi::{Seed, Signer};
use pinocchio::error::ProgramError;
use pinocchio::{AccountView, Address, ProgramResult};
use solana_program_log::log;

use crate::error::SealError;
use crate::state::{SmartWallet, WALLET_SEED};
use crate::utils;

/// Create a new SmartWallet PDA.
///
/// Supports sponsored wallet creation: a separate funder can pay
/// rent and tx fees while the owner only signs to prove intent.
/// When funder == owner, behaves identically to self-funded mode.
///
/// ## Accounts
/// 0. `[signer, writable]` Funder — pays rent for PDA account creation
/// 1. `[signer]`            Owner — becomes the wallet owner
/// 2. `[writable]`          SmartWallet PDA — the new wallet account
/// 3. `[]`                  System Program
///
/// ## Data (17 bytes)
/// - `bump: u8` — PDA bump seed
/// - `daily_limit_lamports: u64` — max daily spend (LE)
/// - `per_tx_limit_lamports: u64` — max per-transaction spend (LE)
pub fn process(program_id: &Address, accounts: &[AccountView], data: &[u8]) -> ProgramResult {
    // ── Parse accounts ──────────────────────────────────────
    if accounts.len() < 4 {
        log!("CreateWallet: expected 4 accounts");
        return Err(ProgramError::NotEnoughAccountKeys);
    }

    let funder = &accounts[0];
    let owner = &accounts[1];
    let wallet_account = &accounts[2];
    let _system_program = &accounts[3];

    // ── Validate accounts ───────────────────────────────────
    utils::check_signer(funder)?;
    utils::check_writable(funder)?;
    utils::check_signer(owner)?;
    utils::check_writable(wallet_account)?;

    // System program ID verified by runtime during CPI.

    // Wallet must not already be initialised.
    if !wallet_account.is_data_empty() {
        log!("CreateWallet: wallet account already initialised");
        return Err(SealError::WalletAlreadyExists.into());
    }

    // ── Parse instruction data ──────────────────────────────
    if data.len() < 17 {
        log!("CreateWallet: data too short");
        return Err(ProgramError::InvalidInstructionData);
    }

    let bump = data[0];
    let daily_limit = utils::read_u64_le(data, 1)?;
    let per_tx_limit = utils::read_u64_le(data, 9)?;

    // Sanity-check limits.
    if daily_limit == 0 || per_tx_limit == 0 {
        log!("CreateWallet: limits must be > 0");
        return Err(ProgramError::InvalidInstructionData);
    }
    if per_tx_limit > daily_limit {
        log!("CreateWallet: per_tx_limit exceeds daily_limit");
        return Err(ProgramError::InvalidInstructionData);
    }

    // ── Create PDA account via System Program CPI ───────────
    // PDA is derived from the owner's pubkey, not the funder's.
    let owner_ref: &[u8] = owner.address().as_ref();
    let bump_bytes = [bump];

    let signer_seeds = [
        Seed::from(WALLET_SEED),
        Seed::from(owner_ref),
        Seed::from(bump_bytes.as_slice()),
    ];
    let signer = Signer::from(&signer_seeds);

    // create_account_with_minimum_balance_signed verifies the
    // PDA address matches the provided seeds — if the client
    // passed a wrong bump or address the runtime will reject.
    // Funder pays the rent; owner is only used for PDA derivation.
    pinocchio_system::create_account_with_minimum_balance_signed(
        wallet_account,
        SmartWallet::SIZE,
        program_id,
        funder,
        None, // derive rent via syscall, no sysvar account needed
        &[signer],
    )?;

    // ── Initialise SmartWallet state ────────────────────────
    let wallet_state =
        SmartWallet::new(owner.address().to_bytes(), bump, daily_limit, per_tx_limit);

    utils::save_account(&wallet_state, wallet_account)?;

    log!("CreateWallet: success");
    Ok(())
}
