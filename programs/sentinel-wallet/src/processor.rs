use pinocchio::{AccountView, Address, ProgramResult};
use solana_program_log::log;

use crate::error::SentinelError;
use crate::instructions;

/// Instruction discriminants — first byte of instruction_data.
#[repr(u8)]
pub enum SentinelInstruction {
    CreateWallet = 0,
    RegisterAgent = 1,
    CreateSessionKey = 2,
    ExecuteViaSession = 3,
    RevokeSession = 4,
    UpdateSpendingLimit = 5,
    AddGuardian = 6,
    RecoverWallet = 7,
    DeregisterAgent = 8,
    CloseWallet = 9,
}

impl TryFrom<u8> for SentinelInstruction {
    type Error = SentinelError;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            0 => Ok(Self::CreateWallet),
            1 => Ok(Self::RegisterAgent),
            2 => Ok(Self::CreateSessionKey),
            3 => Ok(Self::ExecuteViaSession),
            4 => Ok(Self::RevokeSession),
            5 => Ok(Self::UpdateSpendingLimit),
            6 => Ok(Self::AddGuardian),
            7 => Ok(Self::RecoverWallet),
            8 => Ok(Self::DeregisterAgent),
            9 => Ok(Self::CloseWallet),
            _ => Err(SentinelError::InvalidInstruction),
        }
    }
}

/// Main instruction dispatcher.
pub fn process_instruction(
    program_id: &Address,
    accounts: &[AccountView],
    instruction_data: &[u8],
) -> ProgramResult {
    if instruction_data.is_empty() {
        log!("Error: empty instruction data");
        return Err(pinocchio::error::ProgramError::InvalidInstructionData);
    }

    let (discriminant, data) = instruction_data.split_at(1);
    let instruction = SentinelInstruction::try_from(discriminant[0])
        .map_err(|_| pinocchio::error::ProgramError::InvalidInstructionData)?;

    match instruction {
        SentinelInstruction::CreateWallet => {
            log!("Instruction: CreateWallet");
            instructions::create_wallet::process(program_id, accounts, data)
        }
        SentinelInstruction::RegisterAgent => {
            log!("Instruction: RegisterAgent");
            instructions::register_agent::process(program_id, accounts, data)
        }
        SentinelInstruction::CreateSessionKey => {
            log!("Instruction: CreateSessionKey");
            instructions::create_session::process(program_id, accounts, data)
        }
        SentinelInstruction::ExecuteViaSession => {
            log!("Instruction: ExecuteViaSession");
            instructions::execute_via_session::process(program_id, accounts, data)
        }
        SentinelInstruction::RevokeSession => {
            log!("Instruction: RevokeSession");
            instructions::revoke_session::process(program_id, accounts, data)
        }
        SentinelInstruction::UpdateSpendingLimit => {
            log!("Instruction: UpdateSpendingLimit");
            instructions::update_spending_limit::process(program_id, accounts, data)
        }
        SentinelInstruction::AddGuardian => {
            log!("Instruction: AddGuardian");
            instructions::add_guardian::process(program_id, accounts, data)
        }
        SentinelInstruction::RecoverWallet => {
            log!("Instruction: RecoverWallet");
            instructions::recover_wallet::process(program_id, accounts, data)
        }
        SentinelInstruction::DeregisterAgent => {
            log!("Instruction: DeregisterAgent");
            instructions::deregister_agent::process(program_id, accounts, data)
        }
        SentinelInstruction::CloseWallet => {
            log!("Instruction: CloseWallet");
            instructions::close_wallet::process(program_id, accounts, data)
        }
    }
}
