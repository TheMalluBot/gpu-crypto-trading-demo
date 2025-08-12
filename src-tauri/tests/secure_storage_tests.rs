// Phase 1 Week 2 Test Engineer - Critical Security Storage Tests
use crypto_trader::secure_storage::{SecureStorage, SecureApiCredentials, ApiCredentialManager};
use tempfile::TempDir;
use std::path::PathBuf;

#[cfg(test)]
mod secure_storage_tests {
    use super::*;

    #[test]
    fn test_secure_storage_encryption_decryption() {
        let temp_dir = TempDir::new().unwrap();
        let storage_path = temp_dir.path().join("test_secure.dat");
        
        // Create a SecureStorage instance with path validator mocked
        let storage = SecureStorage {
            storage_path: storage_path.clone(),
            path_validator: create_test_path_validator(),
        };

        #[derive(serde::Serialize, serde::Deserialize, PartialEq, Debug)]
        struct TestData {
            sensitive_field: String,
            number: i32,
        }

        let test_data = TestData {
            sensitive_field: "super_secret_api_key".to_string(),
            number: 42,
        };
        
        // Store encrypted data
        storage.store_encrypted(&test_data).unwrap();
        
        // Verify file exists
        assert!(storage_path.exists());
        
        // Load and verify data
        let loaded_data: Option<TestData> = storage.load_encrypted().unwrap();
        assert_eq!(loaded_data, Some(test_data));
        
        // Verify file content is encrypted (not plain text)
        let file_content = std::fs::read_to_string(&storage_path).unwrap();
        assert!(!file_content.contains("super_secret_api_key"));
        assert!(!file_content.contains("42"));
    }

    #[test]
    fn test_api_credentials_manager_store_load() {
        let temp_dir = TempDir::new().unwrap();
        std::env::set_var("APPDATA", temp_dir.path());
        
        let manager = ApiCredentialManager::new().unwrap();
        
        let credentials = SecureApiCredentials::new(
            "valid_api_key_1234567890abcdef".to_string(),
            "valid_api_secret_abcdef1234567890".to_string(),
            true,
            "https://testnet.binance.vision".to_string(),
        );
        
        // Store credentials
        manager.store_credentials(&credentials).unwrap();
        
        // Load credentials
        let loaded = manager.load_credentials().unwrap().unwrap();
        assert_eq!(loaded.api_key, credentials.api_key);
        assert_eq!(loaded.api_secret, credentials.api_secret);
        assert_eq!(loaded.testnet, credentials.testnet);
        assert_eq!(loaded.base_url, credentials.base_url);
    }

    #[test]
    fn test_api_credentials_validation() {
        let temp_dir = TempDir::new().unwrap();
        std::env::set_var("APPDATA", temp_dir.path());
        
        let manager = ApiCredentialManager::new().unwrap();
        
        // Test empty credentials
        let empty_credentials = SecureApiCredentials::new(
            "".to_string(),
            "valid_secret".to_string(),
            true,
            "https://testnet.binance.vision".to_string(),
        );
        
        assert!(manager.store_credentials(&empty_credentials).is_err());
        
        // Test short credentials
        let short_credentials = SecureApiCredentials::new(
            "short".to_string(),
            "also_short".to_string(),
            true,
            "https://testnet.binance.vision".to_string(),
        );
        
        assert!(manager.store_credentials(&short_credentials).is_err());
    }

    #[test]
    fn test_api_credentials_redaction() {
        let credentials = SecureApiCredentials::new(
            "1234567890abcdef1234567890abcdef".to_string(),
            "abcdef1234567890abcdef1234567890".to_string(),
            false,
            "https://api.binance.com".to_string(),
        );
        
        let redacted = credentials.redacted();
        
        // API key should be partially redacted
        assert!(redacted.api_key.contains("***"));
        assert!(redacted.api_key.starts_with("1234"));
        assert!(redacted.api_key.ends_with("cdef"));
        
        // API secret should be fully redacted
        assert_eq!(redacted.api_secret, "***REDACTED***");
        
        // Other fields should remain unchanged
        assert_eq!(redacted.testnet, credentials.testnet);
        assert_eq!(redacted.base_url, credentials.base_url);
    }

    #[test]
    fn test_key_derivation_consistency() {
        let temp_dir = TempDir::new().unwrap();
        let storage_path = temp_dir.path().join("consistency_test.dat");
        
        let storage = SecureStorage {
            storage_path: storage_path.clone(),
            path_validator: create_test_path_validator(),
        };

        let test_data = "test_consistency_data";
        
        // Store data multiple times
        storage.store_encrypted(&test_data).unwrap();
        let loaded1: Option<String> = storage.load_encrypted().unwrap();
        
        storage.store_encrypted(&test_data).unwrap();
        let loaded2: Option<String> = storage.load_encrypted().unwrap();
        
        // Should be able to decrypt consistently
        assert_eq!(loaded1, Some(test_data.to_string()));
        assert_eq!(loaded2, Some(test_data.to_string()));
        assert_eq!(loaded1, loaded2);
    }

    #[test]
    fn test_secure_storage_delete() {
        let temp_dir = TempDir::new().unwrap();
        let storage_path = temp_dir.path().join("delete_test.dat");
        
        let storage = SecureStorage {
            storage_path: storage_path.clone(),
            path_validator: create_test_path_validator(),
        };

        let test_data = "data_to_delete";
        
        // Store data
        storage.store_encrypted(&test_data).unwrap();
        assert!(storage.exists());
        
        // Delete data
        storage.delete().unwrap();
        assert!(!storage.exists());
        
        // Should return None when loading after delete
        let loaded: Option<String> = storage.load_encrypted().unwrap();
        assert_eq!(loaded, None);
    }

    // Helper function to create a test path validator
    fn create_test_path_validator() -> crypto_trader::secure_path::SecurePathValidator {
        // This is a simplified version for testing
        // In real implementation, we would use the proper validator
        crypto_trader::secure_path::create_app_path_validator().unwrap()
    }
}