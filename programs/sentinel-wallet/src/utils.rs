//! Utility functions for the Sentinel Wallet program.
//!
//! Helpers for byte parsing, account validation, and state I/O.

use borsh::{BorshDeserialize, BorshSerialize};
use pinocchio::error::ProgramError;
use pinocchio::{AccountView, Address};

use crate::error::SentinelError;

// ──────────────────────────────────────────────────────────────
// Byte parsing helpers (little-endian)
// ──────────────────────────────────────────────────────────────

/// Read a `u64` (LE) from a byte slice at the given offset.
#[inline(always)]
pub fn read_u64_le(data: &[u8], offset: usize) -> Result<u64, ProgramError> {
    let end = offset
        .checked_add(8)
        .ok_or(ProgramError::InvalidInstructionData)?;
    if data.len() < end {
        return Err(ProgramError::InvalidInstructionData);
    }
    Ok(u64::from_le_bytes(
        data[offset..end].try_into().unwrap(),
    ))
}

/// Read an `i64` (LE) from a byte slice at the given offset.
#[inline(always)]
pub fn read_i64_le(data: &[u8], offset: usize) -> Result<i64, ProgramError> {
    let end = offset
        .checked_add(8)
        .ok_or(ProgramError::InvalidInstructionData)?;
    if data.len() < end {
        return Err(ProgramError::InvalidInstructionData);
    }
    Ok(i64::from_le_bytes(
        data[offset..end].try_into().unwrap(),
    ))
}

/// Read a `u32` (LE) from a byte slice at the given offset.
#[inline(always)]
pub fn read_u32_le(data: &[u8], offset: usize) -> Result<u32, ProgramError> {
    let end = offset
        .checked_add(4)
        .ok_or(ProgramError::InvalidInstructionData)?;
    if data.len() < end {
        return Err(ProgramError::InvalidInstructionData);
    }
    Ok(u32::from_le_bytes(
        data[offset..end].try_into().unwrap(),
    ))
}

/// Read a 32-byte pubkey from a byte slice at the given offset.
#[inline(always)]
pub fn read_pubkey(data: &[u8], offset: usize) -> Result<[u8; 32], ProgramError> {
    let end = offset
        .checked_add(32)
        .ok_or(ProgramError::InvalidInstructionData)?;
    if data.len() < end {
        return Err(ProgramError::InvalidInstructionData);
    }
    let mut key = [0u8; 32];
    key.copy_from_slice(&data[offset..end]);
    Ok(key)
}

/// Read an 8-byte discriminator from a byte slice at the given offset.
#[inline(always)]
pub fn read_discriminator(data: &[u8], offset: usize) -> Result<[u8; 8], ProgramError> {
    let end = offset
        .checked_add(8)
        .ok_or(ProgramError::InvalidInstructionData)?;
    if data.len() < end {
        return Err(ProgramError::InvalidInstructionData);
    }
    let mut disc = [0u8; 8];
    disc.copy_from_slice(&data[offset..end]);
    Ok(disc)
}

// ──────────────────────────────────────────────────────────────
// Account validation helpers
// ──────────────────────────────────────────────────────────────

/// Verify that an account is a signer.
#[inline(always)]
pub fn check_signer(account: &AccountView) -> Result<(), ProgramError> {
    if !account.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }
    Ok(())
}

/// Verify that an account is writable.
#[inline(always)]
pub fn check_writable(account: &AccountView) -> Result<(), ProgramError> {
    if !account.is_writable() {
        return Err(ProgramError::InvalidArgument);
    }
    Ok(())
}

/// Verify that an account is owned by the expected program and has the
/// correct discriminator in its first 8 bytes.
#[inline(always)]
pub fn verify_account_owner_and_discriminator(
    account: &AccountView,
    program_id: &Address,
    expected_discriminator: &[u8; 8],
) -> Result<(), ProgramError> {
    if !account.owned_by(program_id) {
        return Err(ProgramError::IllegalOwner);
    }
    let data = account.try_borrow()?;
    if data.len() < 8 {
        return Err(ProgramError::from(SentinelError::InvalidDataLength));
    }
    if data[..8] != *expected_discriminator {
        return Err(ProgramError::from(SentinelError::InvalidAccountData));
    }
    Ok(())
}

// ──────────────────────────────────────────────────────────────
// State deserialization / serialization helpers
// ──────────────────────────────────────────────────────────────

/// Deserialize a borsh-encoded account state after verifying ownership
/// and discriminator.
///
/// Drops the immutable borrow before returning so the caller can
/// later call `try_borrow_mut`.
pub fn load_account<T: BorshDeserialize>(
    account: &AccountView,
    program_id: &Address,
    expected_discriminator: &[u8; 8],
    size: usize,
) -> Result<T, ProgramError> {
    verify_account_owner_and_discriminator(account, program_id, expected_discriminator)?;
    let data = account.try_borrow()?;
    if data.len() < size {
        return Err(ProgramError::from(SentinelError::InvalidDataLength));
    }
    T::try_from_slice(&data[..size])
        .map_err(|_| ProgramError::from(SentinelError::DeserializationError))
}

/// Serialize a borsh-encoded value and write it to the account data.
pub fn save_account<T: BorshSerialize>(
    value: &T,
    account: &AccountView,
) -> Result<(), ProgramError> {
    let serialized =
        borsh::to_vec(value).map_err(|_| ProgramError::from(SentinelError::SerializationError))?;
    let mut data = account.try_borrow_mut()?;
    if data.len() < serialized.len() {
        return Err(ProgramError::from(SentinelError::InvalidDataLength));
    }
    data[..serialized.len()].copy_from_slice(&serialized);
    Ok(())
}

// ──────────────────────────────────────────────────────────────
// Daily spending limit helpers
// ──────────────────────────────────────────────────────────────

/// Number of seconds in a day for rolling spending window.
pub const SECONDS_PER_DAY: i64 = 86_400;

/// Check and reset the daily spending window if a new day has started.
/// Returns `true` if the counter was reset.
pub fn maybe_reset_daily_spend(
    spent_today: &mut u64,
    day_start: &mut i64,
    current_timestamp: i64,
) -> bool {
    if current_timestamp >= *day_start + SECONDS_PER_DAY {
        *spent_today = 0;
        *day_start = current_timestamp;
        true
    } else {
        false
    }
}
