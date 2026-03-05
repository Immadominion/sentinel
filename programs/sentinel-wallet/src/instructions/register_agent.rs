use pinocchio::cpi::{Seed, Signer};
use pinocchio::error::ProgramError;
use pinocchio::{AccountView, Address, ProgramResult};
use solana_program_log::log;

use crate::error::SentinelError;
use crate::state::{
    AgentConfig, SmartWallet, AGENT_CONFIG_DISCRIMINATOR, AGENT_SEED,
    MAX_AGENTS, MAX_ALLOWED_INSTRUCTIONS, MAX_ALLOWED_PROGRAMS,
    SMART_WALLET_DISCRIMINATOR,
};
use crate::utils;

/// Register a new agent with scoped permissions on the wallet.
///
/// ## Accounts
/// 0. `[signer, writable]` Owner — must be wallet owner, pays for agent account
/// 1. `[writable]`          SmartWallet PDA
/// 2. `[writable]`          AgentConfig PDA — the new agent config account
/// 3. `[]`                  System Program
///
/// ## Data (variable)
/// - `bump: u8` — AgentConfig PDA bump seed
/// - `agent_pubkey: [u8; 32]`
/// - `name: [u8; 32]`
/// - `allowed_programs_count: u8`
/// - `allowed_programs: [[u8; 32]; count]`
/// - `allowed_instructions_count: u8`
/// - `allowed_instructions: [[u8; 8]; count]`
/// - `daily_limit: u64` (LE)
/// - `per_tx_limit: u64` (LE)
/// - `default_session_duration: i64` (LE)
/// - `max_session_duration: i64` (LE)
pub fn process(
    program_id: &Address,
    accounts: &[AccountView],
    data: &[u8],
) -> ProgramResult {
    // ── Parse accounts ──────────────────────────────────────
    if accounts.len() < 4 {
        log!("RegisterAgent: expected 4 accounts");
        return Err(ProgramError::NotEnoughAccountKeys);
    }

    let owner = &accounts[0];
    let wallet_account = &accounts[1];
    let agent_account = &accounts[2];
    let _system_program = &accounts[3];

    // ── Validate accounts ───────────────────────────────────
    utils::check_signer(owner)?;
    utils::check_writable(owner)?;
    utils::check_writable(wallet_account)?;
    utils::check_writable(agent_account)?;

    // Load wallet state and verify owner.
    let mut wallet_state: SmartWallet = utils::load_account(
        wallet_account,
        program_id,
        &SMART_WALLET_DISCRIMINATOR,
        SmartWallet::SIZE,
    )?;

    if owner.address().to_bytes() != wallet_state.owner {
        log!("RegisterAgent: signer is not wallet owner");
        return Err(SentinelError::InvalidWalletOwner.into());
    }

    if wallet_state.is_locked {
        log!("RegisterAgent: wallet is locked");
        return Err(SentinelError::WalletClosed.into());
    }
    if wallet_state.is_closed {
        log!("RegisterAgent: wallet is closed");
        return Err(SentinelError::WalletClosed.into());
    }
    if wallet_state.agent_count as usize >= MAX_AGENTS {
        log!("RegisterAgent: max agents reached");
        return Err(SentinelError::MaxAgentsReached.into());
    }

    // Agent account must not exist yet.
    if !agent_account.is_data_empty() {
        log!("RegisterAgent: agent account already exists");
        return Err(SentinelError::AgentAlreadyRegistered.into());
    }

    // ── Parse instruction data ──────────────────────────────
    // Minimum: bump(1) + agent_pubkey(32) + name(32) + programs_count(1) +
    //          instructions_count(1) + daily(8) + per_tx(8) + default_dur(8) + max_dur(8) = 99
    if data.len() < 99 {
        log!("RegisterAgent: data too short");
        return Err(ProgramError::InvalidInstructionData);
    }

    let bump = data[0];
    let agent_pubkey = utils::read_pubkey(data, 1)?;
    let name = utils::read_pubkey(data, 33)?; // 32 bytes for name
    let mut offset = 65;

    // Allowed programs
    let programs_count = data[offset] as usize;
    offset += 1;
    if programs_count > MAX_ALLOWED_PROGRAMS {
        log!("RegisterAgent: too many allowed programs");
        return Err(ProgramError::InvalidInstructionData);
    }
    if data.len() < offset + programs_count * 32 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let mut allowed_programs = [[0u8; 32]; MAX_ALLOWED_PROGRAMS];
    for i in 0..programs_count {
        allowed_programs[i] = utils::read_pubkey(data, offset)?;
        offset += 32;
    }

    // Allowed instructions
    let instructions_count = data[offset] as usize;
    offset += 1;
    if instructions_count > MAX_ALLOWED_INSTRUCTIONS {
        log!("RegisterAgent: too many allowed instructions");
        return Err(ProgramError::InvalidInstructionData);
    }
    if data.len() < offset + instructions_count * 8 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let mut allowed_instructions = [[0u8; 8]; MAX_ALLOWED_INSTRUCTIONS];
    for i in 0..instructions_count {
        allowed_instructions[i] = utils::read_discriminator(data, offset)?;
        offset += 8;
    }

    // Limits
    if data.len() < offset + 32 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let daily_limit = utils::read_u64_le(data, offset)?;
    offset += 8;
    let per_tx_limit = utils::read_u64_le(data, offset)?;
    offset += 8;
    let default_session_duration = utils::read_i64_le(data, offset)?;
    offset += 8;
    let max_session_duration = utils::read_i64_le(data, offset)?;

    // Validate limits
    if daily_limit == 0 || per_tx_limit == 0 {
        return Err(ProgramError::InvalidInstructionData);
    }
    if per_tx_limit > daily_limit {
        return Err(ProgramError::InvalidInstructionData);
    }
    if default_session_duration <= 0 || max_session_duration <= 0 {
        return Err(ProgramError::InvalidInstructionData);
    }
    if default_session_duration > max_session_duration {
        return Err(ProgramError::InvalidInstructionData);
    }

    // ── Create AgentConfig PDA ──────────────────────────────
    let wallet_addr: &[u8] = wallet_account.address().as_ref();
    let bump_bytes = [bump];

    let signer_seeds = [
        Seed::from(AGENT_SEED),
        Seed::from(wallet_addr),
        Seed::from(agent_pubkey.as_slice()),
        Seed::from(bump_bytes.as_slice()),
    ];
    let signer = Signer::from(&signer_seeds);

    pinocchio_system::create_account_with_minimum_balance_signed(
        agent_account,
        AgentConfig::SIZE,
        program_id,
        owner,
        None,
        &[signer],
    )?;

    // ── Initialise AgentConfig ──────────────────────────────
    let agent_config = AgentConfig {
        discriminator: AGENT_CONFIG_DISCRIMINATOR,
        wallet: wallet_account.address().to_bytes(),
        agent: agent_pubkey,
        name,
        bump,
        is_active: true,
        allowed_programs_count: programs_count as u8,
        allowed_programs,
        allowed_instructions_count: instructions_count as u8,
        allowed_instructions,
        daily_limit,
        per_tx_limit,
        default_session_duration,
        max_session_duration,
        total_spent: 0,
        tx_count: 0,
    };

    utils::save_account(&agent_config, agent_account)?;

    // ── Update wallet agent count ───────────────────────────
    wallet_state.agent_count += 1;
    utils::save_account(&wallet_state, wallet_account)?;

    log!("RegisterAgent: success");
    Ok(())
}
