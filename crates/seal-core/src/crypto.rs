// Cryptographic primitives — Ed25519, AES-256-GCM, key derivation.

use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use ed25519_dalek::{Signer, SigningKey, VerifyingKey};
use pbkdf2::pbkdf2_hmac;
use sha2::Sha256;
use rand::RngCore;

/// Generate a new Ed25519 keypair.
/// Returns (secret_key_bytes, public_key_bytes).
pub fn generate_keypair() -> ([u8; 32], [u8; 32]) {
    let signing_key = SigningKey::generate(&mut OsRng);
    let verifying_key: VerifyingKey = signing_key.verifying_key();
    (signing_key.to_bytes(), verifying_key.to_bytes())
}

/// Sign a message with an Ed25519 secret key.
pub fn sign_message(secret_key: &[u8; 32], message: &[u8]) -> [u8; 64] {
    let signing_key = SigningKey::from_bytes(secret_key);
    let signature = signing_key.sign(message);
    signature.to_bytes()
}

/// Verify an Ed25519 signature.
pub fn verify_signature(
    public_key: &[u8; 32],
    message: &[u8],
    signature: &[u8; 64],
) -> bool {
    let Ok(verifying_key) = VerifyingKey::from_bytes(public_key) else {
        return false;
    };
    let sig = ed25519_dalek::Signature::from_bytes(signature);
    verifying_key.verify_strict(message, &sig).is_ok()
}

/// Derive an AES-256 key from a password using PBKDF2-HMAC-SHA256.
pub fn derive_encryption_key(password: &[u8], salt: &[u8; 16], rounds: u32) -> [u8; 32] {
    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(password, salt, rounds, &mut key);
    key
}

/// Encrypt data with AES-256-GCM.
/// Returns (nonce, ciphertext).
pub fn encrypt_aes256gcm(key: &[u8; 32], plaintext: &[u8]) -> Result<(Vec<u8>, Vec<u8>), String> {
    let cipher = Aes256Gcm::new(key.into());
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| format!("Encryption failed: {e}"))?;
    Ok((nonce_bytes.to_vec(), ciphertext))
}

/// Decrypt data with AES-256-GCM.
pub fn decrypt_aes256gcm(
    key: &[u8; 32],
    nonce: &[u8],
    ciphertext: &[u8],
) -> Result<Vec<u8>, String> {
    let cipher = Aes256Gcm::new(key.into());
    let nonce = Nonce::from_slice(nonce);
    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {e}"))
}

/// Generate a random salt for key derivation.
pub fn generate_salt() -> [u8; 16] {
    let mut salt = [0u8; 16];
    OsRng.fill_bytes(&mut salt);
    salt
}
