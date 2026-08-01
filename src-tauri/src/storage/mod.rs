pub mod crypto;

use crypto::{decrypt_aes_gcm, derive_key_argon2, encrypt_aes_gcm};
use std::fs;
use std::path::Path;
use std::sync::Mutex;

static MEMORY_KEY: Mutex<Option<[u8; 32]>> = Mutex::new(None);
static FIXED_SALT: [u8; 16] = [15, 24, 33, 42, 51, 60, 79, 88, 97, 106, 115, 124, 133, 142, 151, 160];

pub fn unlock_storage(passphrase: &str) -> Result<bool, String> {
    let derived = derive_key_argon2(passphrase, &FIXED_SALT)?;
    let mut lock = MEMORY_KEY.lock().map_err(|e| e.to_string())?;
    *lock = Some(derived);
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
