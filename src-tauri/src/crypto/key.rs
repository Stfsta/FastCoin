use aes_gcm::Key;
use pbkdf2::pbkdf2_hmac;
use rand::Rng;
use sha2::Sha256;

const PBKDF2_ITERATIONS: u32 = 210_000;
const SALT_LENGTH: usize = 16;

pub fn generate_salt() -> Vec<u8> {
    let mut salt = vec![0u8; SALT_LENGTH];
    rand::thread_rng().fill(&mut salt[..]);
    salt
}

pub fn derive_key(password: &str, salt: &[u8]) -> Key<aes_gcm::Aes256Gcm> {
    let mut key_bytes = [0u8; 32];
    pbkdf2_hmac::<Sha256>(password.as_bytes(), salt, PBKDF2_ITERATIONS, &mut key_bytes);
    *Key::<aes_gcm::Aes256Gcm>::from_slice(&key_bytes)
}
