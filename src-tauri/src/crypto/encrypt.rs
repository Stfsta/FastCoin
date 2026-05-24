use aes_gcm::{
    aead::{Aead, OsRng},
    AeadCore, Aes256Gcm, KeyInit, Nonce,
};
use base64ct::{Base64, Encoding};

use crate::{crypto::key, utils::error::AppResult};

use super::key::generate_salt;

#[derive(serde::Serialize, serde::Deserialize)]
pub struct EncryptedFile {
    pub salt: String,
    pub iv: String,
    pub ciphertext: String,
    pub metadata: ExportMetadataHeader,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct ExportMetadataHeader {
    #[serde(rename = "formatVersion")]
    pub format_version: u32,
    pub mode: String,
    #[serde(rename = "exportedAt")]
    pub exported_at: String,
    #[serde(rename = "deviceId")]
    pub device_id: String,
    #[serde(rename = "recordCount")]
    pub record_count: u32,
    #[serde(rename = "untilVersion")]
    pub until_version: i64,
}

pub fn encrypt_data(
    plaintext: &str,
    password: &str,
    mode: &str,
    device_id: &str,
    record_count: u32,
    until_version: i64,
) -> AppResult<EncryptedFile> {
    let salt = generate_salt();
    let key = key::derive_key(password, &salt);

    let cipher = Aes256Gcm::new(&key);
    let iv_bytes = Aes256Gcm::generate_nonce(&mut OsRng);
    let nonce = Nonce::from_slice(&iv_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| crate::utils::error::AppError::Encryption(e.to_string()))?;

    let exported_at = chrono::Utc::now().to_rfc3339();

    Ok(EncryptedFile {
        salt: Base64::encode_string(&salt),
        iv: Base64::encode_string(&iv_bytes),
        ciphertext: Base64::encode_string(&ciphertext),
        metadata: ExportMetadataHeader {
            format_version: 1,
            mode: mode.to_string(),
            exported_at,
            device_id: device_id.to_string(),
            record_count,
            until_version,
        },
    })
}
