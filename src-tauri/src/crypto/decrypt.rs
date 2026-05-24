use aes_gcm::{aead::Aead, Aes256Gcm, KeyInit, Nonce};
use base64ct::{Base64, Encoding};

use crate::{crypto::encrypt::EncryptedFile, crypto::key, utils::error::AppResult};

pub fn decrypt_data(encrypted: &EncryptedFile, password: &str) -> AppResult<String> {
    let salt = Base64::decode_vec(&encrypted.salt)
        .map_err(|_e| crate::utils::error::AppError::Decryption)?;
    let iv = Base64::decode_vec(&encrypted.iv)
        .map_err(|_e| crate::utils::error::AppError::Decryption)?;
    let ciphertext = Base64::decode_vec(&encrypted.ciphertext)
        .map_err(|_e| crate::utils::error::AppError::Decryption)?;

    let key = key::derive_key(password, &salt);
    let cipher = Aes256Gcm::new(&key);
    let nonce = Nonce::from_slice(&iv);

    let plaintext = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|_| crate::utils::error::AppError::Decryption)?;

    String::from_utf8(plaintext).map_err(|_e| crate::utils::error::AppError::Decryption)
}
