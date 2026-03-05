// Transaction signer — builds and signs Solana transactions.
//
// This module handles the client-side signing flow:
// 1. Build transaction instruction
// 2. Sign with session key
// 3. Submit to RPC

use crate::keyvault::KeyVault;

/// A signed transaction ready for submission.
pub struct SignedTransaction {
    /// Serialized transaction bytes.
    pub data: Vec<u8>,
    /// The signature.
    pub signature: [u8; 64],
}

/// Transaction signer using the KeyVault.
pub struct TransactionSigner<'a> {
    vault: &'a KeyVault,
}

impl<'a> TransactionSigner<'a> {
    pub fn new(vault: &'a KeyVault) -> Self {
        Self { vault }
    }

    /// Sign raw transaction bytes.
    pub fn sign_raw(&self, tx_bytes: &[u8]) -> Result<SignedTransaction, String> {
        let signature = self.vault.sign(tx_bytes)?;
        Ok(SignedTransaction {
            data: tx_bytes.to_vec(),
            signature,
        })
    }
}
