//! # Sentinel Wallet Program
//!
//! On-chain smart wallet with session keys, spending limits, scoped agent
//! delegation, and guardian recovery. Built with Pinocchio for minimal
//! binary size and compute cost.
//!
//! ## Instructions
//!
//! | Discriminant | Instruction           | Authority     |
//! |-------------|----------------------|---------------|
//! | 0           | CreateWallet         | Payer/Owner   |
//! | 1           | RegisterAgent        | Owner         |
//! | 2           | CreateSessionKey     | Agent         |
//! | 3           | ExecuteViaSession    | Session Key   |
//! | 4           | RevokeSession        | Owner/Agent   |
//! | 5           | UpdateSpendingLimit  | Owner         |
//! | 6           | AddGuardian          | Owner         |
//! | 7           | RecoverWallet        | Guardians     |
//! | 8           | DeregisterAgent      | Owner         |
//! | 9           | CloseWallet          | Owner         |

#[cfg(not(feature = "no-entrypoint"))]
mod entrypoint;

pub mod error;
pub mod instructions;
pub mod processor;
pub mod state;
pub mod utils;

// Program ID — deployed to devnet Feb 25, 2026
pinocchio::address::declare_id!("EV3TKRVz7pTHpAqBTjP8jmwuvoRBRCpjmVSPHhcMnXqb");
