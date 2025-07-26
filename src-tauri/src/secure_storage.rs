use aes_gcm::{Aes256Gcm, Key, Nonce, aead::Aead, KeyInit};
use rand::{RngCore, rngs::OsRng};
use serde::{Serialize, Deserialize};
use std::path::PathBuf;
use base64::{Engine as _, engine::general_purpose};
use crate::secure_path::{SecurePathValidator, PathSecurityError, create_app_path_validator};

const NONCE_SIZE: usize = 12; // 96 bits for AES-GCM
const KEY_SIZE: usize = 32;   // 256 bits for AES-256

#[derive(Debug, Serialize, Deserialize)]
struct EncryptedData {
    nonce: Vec<u8>,
    ciphertext: Vec<u8>,
}

#[derive(Debug)]
pub struct SecureStorage {
    storage_path: PathBuf,
    path_validator: SecurePathValidator,
}

impl SecureStorage {
    pub fn new(app_name: &str) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let path_validator = create_app_path_validator()
            .map_err(|e| format!("Failed to create path validator: {}", e))?;
        
        let storage_path = Self::get_secure_storage_path(app_name, &path_validator)?;
        
        // Create storage directory if it doesn't exist
        if let Some(parent) = storage_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        
        Ok(Self { 
            storage_path,
            path_validator,
        })
    }

    fn get_secure_storage_path(
        app_name: &str, 
        validator: &SecurePathValidator
    ) -> Result<PathBuf, Box<dyn std::error::Error + Send + Sync>> {
        // Sanitize app_name to prevent path injection
        let sanitized_name = app_name
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
            .collect::<String>();
        
        if sanitized_name.is_empty() {
            return Err("Invalid app name".into());
        }
        
        // Try to get proper app data directory, fallback to current dir + data
        let app_dir = if let Ok(data_dir) = std::env::var("APPDATA") {
            // Windows AppData
            PathBuf::from(data_dir).join(&sanitized_name)
        } else if let Ok(home_dir) = std::env::var("HOME") {
            // Unix-like systems
            PathBuf::from(home_dir).join(".local/share").join(&sanitized_name)
        } else {
            // Fallback to current directory
            std::env::current_dir()
                .map_err(|_| "Could not determine app data directory")?
                .join("data")
        };
        
        std::fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create app directory: {}", e))?;
            
        let storage_file = app_dir.join(format!("{}_secure.dat", sanitized_name));
        
        // Validate the final path
        validator.validate_path(&storage_file)
            .map_err(|e| format!("Storage path validation failed: {}", e).into())
    }
    }

    fn derive_key_from_system() -> Result<[u8; KEY_SIZE], Box<dyn std::error::Error + Send + Sync>> {
        // In production, you would want to use a more secure key derivation method
        // This could involve user passwords, system-specific identifiers, or hardware security modules
        
        // For this example, we'll use a combination of system identifiers
        // WARNING: This is a simplified approach and may not be suitable for all security requirements
        
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        
        // Use system identifiers to create a consistent but system-specific key
        if let Ok(hostname) = std::env::var("COMPUTERNAME") {
            hostname.hash(&mut hasher);
        } else if let Ok(hostname) = std::env::var("HOSTNAME") {
            hostname.hash(&mut hasher);
        }
        
        if let Ok(user) = std::env::var("USERNAME") {
            user.hash(&mut hasher);
        } else if let Ok(user) = std::env::var("USER") {
            user.hash(&mut hasher);
        }
        
        // Add some additional entropy
        "crypto_trader_v1".hash(&mut hasher);
        
        let hash = hasher.finish();
        
        // Expand the hash to a full 256-bit key using a simple method
        // In production, use a proper KDF like PBKDF2, scrypt, or Argon2
        let mut key = [0u8; KEY_SIZE];
        for i in 0..KEY_SIZE {
            key[i] = ((hash >> (i % 8 * 8)) & 0xFF) as u8;
            if i >= 8 {
                key[i] ^= key[i - 8]; // Add some mixing
            }
        }
        
        Ok(key)
    }

    pub fn store_encrypted<T: Serialize>(&self, data: &T) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Serialize the data
        let json_data = serde_json::to_vec(data)?;
        
        // Derive encryption key from system
        let key_bytes = Self::derive_key_from_system()?;
        let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
        let cipher = Aes256Gcm::new(key);
        
        // Generate random nonce
        let mut nonce_bytes = [0u8; NONCE_SIZE];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);
        
        // Encrypt the data
        let ciphertext = cipher.encrypt(nonce, json_data.as_ref())
            .map_err(|e| format!("Encryption failed: {}", e))?;
        
        // Prepare encrypted data structure
        let encrypted_data = EncryptedData {
            nonce: nonce_bytes.to_vec(),
            ciphertext,
        };
        
        // Write to file
        let encrypted_json = serde_json::to_string(&encrypted_data)?;
        std::fs::write(&self.storage_path, encrypted_json)?;
        
        Ok(())
    }

    pub fn load_encrypted<T: for<'de> Deserialize<'de>>(&self) -> Result<Option<T>, Box<dyn std::error::Error + Send + Sync>> {
        // Check if file exists
        if !self.storage_path.exists() {
            return Ok(None);
        }
        
        // Read encrypted data from file
        let encrypted_json = std::fs::read_to_string(&self.storage_path)?;
        let encrypted_data: EncryptedData = serde_json::from_str(&encrypted_json)?;
        
        // Derive decryption key
        let key_bytes = Self::derive_key_from_system()?;
        let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
        let cipher = Aes256Gcm::new(key);
        
        // Prepare nonce
        if encrypted_data.nonce.len() != NONCE_SIZE {
            return Err("Invalid nonce size".into());
        }
        let nonce = Nonce::from_slice(&encrypted_data.nonce);
        
        // Decrypt the data
        let decrypted_data = cipher.decrypt(nonce, encrypted_data.ciphertext.as_ref())
            .map_err(|e| format!("Decryption failed: {}", e))?;
        
        // Deserialize the data
        let data: T = serde_json::from_slice(&decrypted_data)?;
        Ok(Some(data))
    }

    pub fn delete(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if self.storage_path.exists() {
            std::fs::remove_file(&self.storage_path)?;
        }
        Ok(())
    }

    pub fn exists(&self) -> bool {
        self.storage_path.exists()
    }
}

// Secure settings structure for API credentials
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SecureApiCredentials {
    pub api_key: String,
    pub api_secret: String,
    pub testnet: bool,
    pub base_url: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_used: Option<chrono::DateTime<chrono::Utc>>,
}

impl SecureApiCredentials {
    pub fn new(api_key: String, api_secret: String, testnet: bool, base_url: String) -> Self {
        Self {
            api_key,
            api_secret,
            testnet,
            base_url,
            created_at: chrono::Utc::now(),
            last_used: None,
        }
    }

    pub fn mark_used(&mut self) {
        self.last_used = Some(chrono::Utc::now());
    }

    pub fn is_expired(&self, ttl_hours: u64) -> bool {
        if let Some(last_used) = self.last_used {
            let age = chrono::Utc::now().signed_duration_since(last_used);
            age.num_hours() > ttl_hours as i64
        } else {
            false
        }
    }

    // Redact sensitive information for logging
    pub fn redacted(&self) -> SecureApiCredentials {
        Self {
            api_key: Self::redact_string(&self.api_key),
            api_secret: "***REDACTED***".to_string(),
            testnet: self.testnet,
            base_url: self.base_url.clone(),
            created_at: self.created_at,
            last_used: self.last_used,
        }
    }

    fn redact_string(s: &str) -> String {
        if s.len() <= 8 {
            "*".repeat(s.len())
        } else {
            format!("{}***{}", &s[..4], &s[s.len()-4..])
        }
    }
}

// Storage manager for API credentials
pub struct ApiCredentialManager {
    storage: SecureStorage,
}

impl ApiCredentialManager {
    pub fn new() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let storage = SecureStorage::new("crypto_trader_api")?;
        Ok(Self { storage })
    }

    pub fn store_credentials(&self, credentials: &SecureApiCredentials) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Validate credentials before storing
        if credentials.api_key.is_empty() || credentials.api_secret.is_empty() {
            return Err("API key and secret cannot be empty".into());
        }

        if credentials.api_key.len() < 16 || credentials.api_secret.len() < 16 {
            return Err("API credentials appear to be invalid (too short)".into());
        }

        self.storage.store_encrypted(credentials)
    }

    pub fn load_credentials(&self) -> Result<Option<SecureApiCredentials>, Box<dyn std::error::Error + Send + Sync>> {
        self.storage.load_encrypted()
    }

    pub fn update_last_used(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(mut credentials) = self.load_credentials()? {
            credentials.mark_used();
            self.store_credentials(&credentials)?;
        }
        Ok(())
    }

    pub fn delete_credentials(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        self.storage.delete()
    }

    pub fn credentials_exist(&self) -> bool {
        self.storage.exists()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_secure_storage_basic() {
        let temp_dir = TempDir::new().unwrap();
        let storage_path = temp_dir.path().join("test_secure.dat");
        let storage = SecureStorage { storage_path };

        let test_data = vec!["hello", "world", "secure", "storage"];
        
        // Store data
        storage.store_encrypted(&test_data).unwrap();
        
        // Load data
        let loaded_data: Option<Vec<String>> = storage.load_encrypted().unwrap();
        assert_eq!(loaded_data, Some(test_data));
    }

    #[test]
    fn test_api_credentials() {
        let temp_dir = TempDir::new().unwrap();
        std::env::set_var("CARGO_MANIFEST_DIR", temp_dir.path());
        
        let manager = ApiCredentialManager::new().unwrap();
        
        let credentials = SecureApiCredentials::new(
            "test_api_key_12345678".to_string(),
            "test_api_secret_87654321".to_string(),
            true,
            "https://testnet.binance.vision".to_string(),
        );
        
        // Store credentials
        manager.store_credentials(&credentials).unwrap();
        
        // Load credentials
        let loaded = manager.load_credentials().unwrap().unwrap();
        assert_eq!(loaded.api_key, credentials.api_key);
        assert_eq!(loaded.api_secret, credentials.api_secret);
        
        // Test redaction
        let redacted = loaded.redacted();
        assert!(redacted.api_key.contains("***"));
        assert_eq!(redacted.api_secret, "***REDACTED***");
    }

    #[test]
    fn test_invalid_credentials() {
        let manager = ApiCredentialManager::new().unwrap();
        
        let invalid_credentials = SecureApiCredentials::new(
            "short".to_string(),
            "also_short".to_string(),
            true,
            "https://testnet.binance.vision".to_string(),
        );
        
        assert!(manager.store_credentials(&invalid_credentials).is_err());
    }
}