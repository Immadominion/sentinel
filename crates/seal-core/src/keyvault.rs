// KeyVault — encrypted key storage and retrieval.
//
// Keys are stored encrypted at rest using AES-256-GCM.
// The encryption key is derived from a user password (or biometric
// secret on mobile) via PBKDF2.

use crate::crypto;
use serde::{Deserialize, Serialize};

const PBKDF2_ROUNDS: u32 = 600_000;

/// An encrypted key stored on disk.
#[derive(Serialize, Deserialize, Clone)]
pub struct EncryptedKey {
    /// The salt used for PBKDF2 key derivation.
    pub salt: [u8; 16],
    /// The AES-GCM nonce.
    pub nonce: Vec<u8>,
    /// The encrypted Ed25519 secret key bytes.
    pub ciphertext: Vec<u8>,
    /// The public key (NOT encrypted — needed for account lookup).
    pub public_key: [u8; 32],
}

/// In-memory key vault holding decrypted keys.
/// Keys are zeroized on drop in a real implementation.
pub struct KeyVault {
    /// Active session signing key (decrypted, in-memory only).
    session_key: Option<[u8; 32]>,
    /// The wallet owner's public key.
    owner_pubkey: Option<[u8; 32]>,
}

impl KeyVault {
    pub fn new() -> Self {
        Self {
            session_key: None,
            owner_pubkey: None,
        }
    }

    /// Generate a new keypair and encrypt the secret key with a password.
    pub fn create_encrypted_key(password: &[u8]) -> Result<EncryptedKey, String> {
        let (secret, public) = crypto::generate_keypair();
        let salt = crypto::generate_salt();
        let enc_key = crypto::derive_encryption_key(password, &salt, PBKDF2_ROUNDS);
        let (nonce, ciphertext) = crypto::encrypt_aes256gcm(&enc_key, &secret)?;

        Ok(EncryptedKey {
            salt,
            nonce,
            ciphertext,
            public_key: public,
        })
    }

    /// Decrypt and load a key into the vault.
    pub fn unlock(&mut self, encrypted: &EncryptedKey, password: &[u8]) -> Result<(), String> {
        let enc_key =
            crypto::derive_encryption_key(password, &encrypted.salt, PBKDF2_ROUNDS);
        let secret_bytes =
            crypto::decrypt_aes256gcm(&enc_key, &encrypted.nonce, &encrypted.ciphertext)?;

        if secret_bytes.len() != 32 {
            return Err("Decrypted key has invalid length".into());
        }

        let mut key = [0u8; 32];
        key.copy_from_slice(&secret_bytes);
        self.session_key = Some(key);
        self.owner_pubkey = Some(encrypted.public_key);
        Ok(())
    }

    /// Sign a message using the loaded session key.
    pub fn sign(&self, message: &[u8]) -> Result<[u8; 64], String> {
        let key = self
            .session_key
            .as_ref()
            .ok_or("Vault is locked — no key loaded")?;
        Ok(crypto::sign_message(key, message))
    }

    /// Get the owner's public key.
    pub fn public_key(&self) -> Option<[u8; 32]> {
        self.owner_pubkey
    }

    /// Lock the vault — zeroize the in-memory key.
    pub fn lock(&mut self) {
        if let Some(ref mut key) = self.session_key {
            key.fill(0);
        }
        self.session_key = None;
    }

    pub fn is_unlocked(&self) -> bool {
        self.session_key.is_some()
    }
}

impl Drop for KeyVault {
    fn drop(&mut self) {
        self.lock();
    }
}
