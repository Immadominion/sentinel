use pinocchio::error::ProgramError;
use pinocchio::{AccountView, Address, ProgramResult};
use solana_program_log::log;

use crate::error::SealError;
use crate::state::{
    AgentConfig, SmartWallet, AGENT_CONFIG_DISCRIMINATOR, SMART_WALLET_DISCRIMINATOR,
};
use crate::utils;

/// Deregister an agent from the wallet.
///
/// Closes the AgentConfig account and returns rent to the owner.
///
/// ## Accounts
/// 0. `[signer, writable]` Owner — receives rent refund
/// 1. `[writable]`          SmartWallet PDA
/// 2. `[writable]`          AgentConfig PDA — will be closed
pub fn process(
    program_id: &Address,
    accounts: &[AccountView],
    _data: &[u8],
) -> ProgramResult {
    // ── Parse accounts ──────────────────────────────────────
    if accounts.len() < 3 {
        log!("DeregisterAgent: expected 3 accounts");
        return Err(ProgramError::NotEnoughAccountKeys);
    }

    let owner = &accounts[0];
    let wallet_account = &accounts[1];
    let agent_account = &accounts[2];

    // ── Validate ────────────────────────────────────────────
    utils::check_signer(owner)?;
    utils::check_writable(owner)?;
    utils::check_writable(wallet_account)?;
    utils::check_writable(agent_account)?;

    let mut wallet_state: SmartWallet = utils::load_account(
        wallet_account,
        program_id,
        &SMART_WALLET_DISCRIMINATOR,
        SmartWallet::SIZE,
    )?;

    if wallet_state.owner != owner.address().to_bytes() {
        log!("DeregisterAgent: signer is not the owner");
        return Err(SealError::InvalidWalletOwner.into());
    }

    if wallet_state.is_closed {
        log!("DeregisterAgent: wallet is closed");
        return Err(SealError::WalletClosed.into());
    }

    let agent_config: AgentConfig = utils::load_account(
        agent_account,
        program_id,
        &AGENT_CONFIG_DISCRIMINATOR,
        AgentConfig::SIZE,
    )?;

    // Agent must belong to this wallet.
    if agent_config.wallet != wallet_account.address().to_bytes() {
        log!("DeregisterAgent: agent not bound to this wallet");
        return Err(SealError::AgentNotFound.into());
    }

    // ── Close AgentConfig account ───────────────────────────
    // Transfer rent lamports to owner.
    let rent_lamports = agent_account.lamports();
    let owner_lamports = owner
        .lamports()
        .checked_add(rent_lamports)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    agent_account.set_lamports(0);
    owner.set_lamports(owner_lamports);
    agent_account.close()?;

    // ── Decrement agent count ───────────────────────────────
    wallet_state.agent_count = wallet_state.agent_count.saturating_sub(1);
    utils::save_account(&wallet_state, wallet_account)?;

    log!("DeregisterAgent: agent removed, rent returned");
    Ok(())
}
