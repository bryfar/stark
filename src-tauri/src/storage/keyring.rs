use base64::{Engine as _, engine::general_purpose};
use keyring::{Entry, Error as KeyringError};
use std::sync::Mutex;

const SERVICE: &str = "crafter-linux-agent";
const ACCOUNT: &str = "master-key";

static KEYRING_AVAILABILITY: Mutex<Option<bool>> = Mutex::new(None);

fn entry() -> Result<Entry, String> {
    Entry::new(SERVICE, ACCOUNT).map_err(|e| format!("Keyring no disponible: {}", e))
}

pub fn keyring_available() -> bool {
    let mut cache = match KEYRING_AVAILABILITY.lock() {
        Ok(l) => l,
        Err(_) => return false,
    };
    if let Some(v) = *cache {
        return v;
    }
    let ok = match entry() {
        Ok(e) => match e.get_password() {
            Ok(_) => true,
            Err(KeyringError::NoEntry) => true,
            Err(_) => false,
        },
        Err(_) => false,
    };
    *cache = Some(ok);
    ok
}

pub fn keyring_has_master_key() -> bool {
    keyring_get_master_key().is_some()
}

pub fn keyring_get_master_key() -> Option<[u8; 32]> {
    let e = entry().ok()?;
    let pw = e.get_password().ok()?;
    let bytes = general_purpose::STANDARD.decode(&pw).ok()?;
    if bytes.len() != 32 {
        return None;
    }
    let mut key = [0u8; 32];
    key.copy_from_slice(&bytes);
    Some(key)
}

pub fn keyring_set_master_key(key: &[u8; 32]) -> Result<(), String> {
    let e = entry()?;
    let encoded = general_purpose::STANDARD.encode(key);
    e.set_password(&encoded).map_err(|err| format!("Error guardando clave en Keyring: {}", err))
}

pub fn keyring_delete_master_key() -> Result<(), String> {
    let e = entry()?;
    e.delete_credential().map_err(|err| format!("Error eliminando clave del Keyring: {}", err))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keyring_available_is_deterministic() {
        let _ = keyring_available();
        let again = keyring_available();
        assert_eq!(again, keyring_available());
    }
}
