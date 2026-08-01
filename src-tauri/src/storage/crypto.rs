use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::{
    password_hash::SaltString,
    Argon2,
};
use rand::RngCore;

pub fn derive_key_argon2(passphrase: &str, salt: &[u8; 16]) -> Result<[u8; 32], String> {
    let mut key = [0u8; 32];
    let argon2 = Argon2::default();
    let salt_str = match SaltString::encode_b64(salt) {
        Ok(s) => s,
        Err(err) => return Err(format!("Error codificando sal Argon2: {}", err)),
    };

    if let Err(err) = argon2.hash_password_into(passphrase.as_bytes(), salt_str.as_str().as_bytes(), &mut key) {
        return Err(format!("Error en hash Argon2id: {}", err));
    }

    Ok(key)
}

pub fn encrypt_aes_gcm(plaintext: &[u8], key: &[u8; 32]) -> Result<Vec<u8>, String> {
    let cipher = match Aes256Gcm::new_from_slice(key) {
        Ok(c) => c,
        Err(err) => return Err(format!("Error creando cifrador AES-GCM: {}", err)),
    };

    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = match cipher.encrypt(nonce, plaintext) {
        Ok(c) => c,
        Err(err) => return Err(format!("Error cifrando datos: {}", err)),
    };

    // Prepend nonce (12 bytes) to ciphertext
    let mut result = Vec::with_capacity(12 + ciphertext.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);
    Ok(result)
}

pub fn decrypt_aes_gcm(encrypted_data: &[u8], key: &[u8; 32]) -> Result<Vec<u8>, String> {
    if encrypted_data.len() < 12 {
        return Err("Datos cifrados demasiado cortos para contener un Nonce".to_string());
    }

    let (nonce_bytes, ciphertext) = encrypted_data.split_at(12);
    let cipher = match Aes256Gcm::new_from_slice(key) {
        Ok(c) => c,
        Err(err) => return Err(format!("Error creando descifrador AES-GCM: {}", err)),
    };

    let nonce = Nonce::from_slice(nonce_bytes);
    match cipher.decrypt(nonce, ciphertext) {
        Ok(plaintext) => Ok(plaintext),
        Err(err) => Err(format!("Error descifrando datos (contraseña/clave incorrecta): {}", err)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_argon2_key_derivation_consistency() {
        let passphrase = "mi_clave_secreta_crafter";
        let salt = [42u8; 16];

        let key1 = derive_key_argon2(passphrase, &salt).unwrap();
        let key2 = derive_key_argon2(passphrase, &salt).unwrap();

        assert_eq!(key1, key2);
        assert_eq!(key1.len(), 32);
    }

    #[test]
    fn test_aes_gcm_encrypt_decrypt_roundtrip() {
        let key = [7u8; 32];
        let original_data = b"Datos confidenciales de la sesion del agente Crafter";

        let encrypted = encrypt_aes_gcm(original_data, &key).unwrap();
        assert_ne!(encrypted, original_data);

        let decrypted = decrypt_aes_gcm(&encrypted, &key).unwrap();
        assert_eq!(decrypted, original_data);
    }

    #[test]
    fn test_decrypt_with_wrong_key_fails() {
        let correct_key = [7u8; 32];
        let wrong_key = [9u8; 32];
        let data = b"Mensaje de prueba";

        let encrypted = encrypt_aes_gcm(data, &correct_key).unwrap();
        let result = decrypt_aes_gcm(&encrypted, &wrong_key);

        assert!(result.is_err());
    }
}
