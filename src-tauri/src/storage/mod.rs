pub mod chats;
pub mod crypto;
pub mod keyring;
pub mod providers_store;
pub mod records;
pub mod usage;

pub use keyring::keyring_available;
pub use providers_store::{
    delete_provider, get_provider, load_api_key, load_providers, parse_kind, preset_providers,
    save_api_key, save_providers, upsert_provider,
};
pub use keyring::keyring_has_master_key;

use crypto::{decrypt_aes_gcm, derive_key_argon2, encrypt_aes_gcm};
use keyring::{keyring_get_master_key, keyring_set_master_key};
use std::fs;
use std::path::Path;
use std::sync::Mutex;

static MEMORY_KEY: Mutex<Option<[u8; 32]>> = Mutex::new(None);
static FIXED_SALT: [u8; 16] = [15, 24, 33, 42, 51, 60, 79, 88, 97, 106, 115, 124, 133, 142, 151, 160];

pub fn is_unlocked() -> bool {
    match MEMORY_KEY.lock() {
        Ok(l) => l.is_some(),
        Err(_) => false,
    }
}

pub fn get_storage_master_key() -> Result<[u8; 32], String> {
    let lock = MEMORY_KEY.lock().map_err(|e| e.to_string())?;
    match *lock {
        Some(k) => Ok(k),
        None => Err("El almacenamiento no está desbloqueado. Ingrese la clave maestra.".to_string()),
    }
}

/// Unlocks storage. Tries the OS keyring first; if a master key exists there it
/// is loaded directly (silent auto-unlock on later runs). Otherwise derives the
/// key from the passphrase via Argon2id and persists it to the keyring when
/// available.
pub fn unlock_storage(passphrase: &str) -> Result<bool, String> {
    if let Some(key) = keyring_get_master_key() {
        let mut lock = MEMORY_KEY.lock().map_err(|e| e.to_string())?;
        *lock = Some(key);
        return Ok(true);
    }

    let derived = derive_key_argon2(passphrase, &FIXED_SALT)?;
    let mut lock = MEMORY_KEY.lock().map_err(|e| e.to_string())?;
    *lock = Some(derived);

    // Best-effort: persist to keyring so future launches unlock silently.
    let _ = keyring_set_master_key(&derived);
    Ok(true)
}

pub fn lock_storage() -> Result<bool, String> {
    let mut lock = MEMORY_KEY.lock().map_err(|e| e.to_string())?;
    *lock = None;
    Ok(true)
}

pub fn save_encrypted_value(key: &str, value: &str) -> Result<bool, String> {
    let lock = MEMORY_KEY.lock().map_err(|e| e.to_string())?;
    let master_key = match *lock {
        Some(k) => k,
        None => return Err("El almacenamiento no está desbloqueado. Ingrese la clave maestra.".to_string()),
    };

    let encrypted = encrypt_aes_gcm(value.as_bytes(), &master_key)?;
    let dir = Path::new(".crafter_storage");
    let _ = fs::create_dir_all(dir);
    let file_path = dir.join(format!("{}.enc", key));

    if let Err(err) = fs::write(&file_path, encrypted) {
        return Err(format!("Error guardando valor cifrado: {}", err));
    }

    Ok(true)
}

pub fn load_encrypted_value(key: &str) -> Result<String, String> {
    let lock = MEMORY_KEY.lock().map_err(|e| e.to_string())?;
    let master_key = match *lock {
        Some(k) => k,
        None => return Err("El almacenamiento no está desbloqueado. Ingrese la clave maestra.".to_string()),
    };

    let file_path = Path::new(".crafter_storage").join(format!("{}.enc", key));
    if !file_path.exists() {
        return Err("El registro especificado no existe".to_string());
    }

    let encrypted_data = fs::read(&file_path).map_err(|e| e.to_string())?;
    let decrypted = decrypt_aes_gcm(&encrypted_data, &master_key)?;
    String::from_utf8(decrypted).map_err(|e| format!("UTF-8 inválido: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_storage_unlock_and_save_load() {
        let passphrase = "clave_de_prueba_crafter";
        assert!(unlock_storage(passphrase).unwrap());

        let key = "api_key_test";
        let val = "sk-1234567890abcdef";

        assert!(save_encrypted_value(key, val).unwrap());
        let loaded = load_encrypted_value(key).unwrap();
        assert_eq!(loaded, val);

        let _ = fs::remove_dir_all(".crafter_storage");
    }
}
