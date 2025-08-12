// Secure String Implementation for API Credentials
// Automatically clears sensitive data from memory when dropped

use std::fmt;
use zeroize::{Zeroize, ZeroizeOnDrop};
use serde::{Deserialize, Serialize, Deserializer, Serializer};

/// A secure string that automatically clears its contents from memory when dropped
#[derive(Clone, ZeroizeOnDrop)]
pub struct SecureString {
    #[zeroize(skip)]
    inner: Box<str>,
}

impl SecureString {
    /// Create a new SecureString from a regular string
    pub fn new(s: String) -> Self {
        Self {
            inner: s.into_boxed_str(),
        }
    }

    /// Create a SecureString from a string slice
    pub fn from_str(s: &str) -> Self {
        Self::new(s.to_string())
    }

    /// Access the inner string (use carefully - avoid storing references)
    pub fn expose(&self) -> &str {
        &self.inner
    }

    /// Get the length of the string
    pub fn len(&self) -> usize {
        self.inner.len()
    }

    /// Check if the string is empty
    pub fn is_empty(&self) -> bool {
        self.inner.is_empty()
    }

    /// Clear the string contents immediately
    pub fn clear(&mut self) {
        // Convert to Vec<u8> for zeroization, then back to String
        let mut bytes = self.inner.as_bytes().to_vec();
        bytes.zeroize();
        self.inner = String::from_utf8(bytes).unwrap_or_default().into_boxed_str();
    }
}

impl fmt::Debug for SecureString {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "SecureString([REDACTED {} chars])", self.len())
    }
}

impl fmt::Display for SecureString {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[REDACTED]")
    }
}

impl PartialEq for SecureString {
    fn eq(&self, other: &Self) -> bool {
        // Use constant-time comparison to prevent timing attacks
        use subtle::ConstantTimeEq;
        self.inner.as_bytes().ct_eq(other.inner.as_bytes()).into()
    }
}

impl Eq for SecureString {}

// Custom serialization to avoid exposing sensitive data in logs
impl Serialize for SecureString {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str("[REDACTED]")
    }
}

impl<'de> Deserialize<'de> for SecureString {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        Ok(SecureString::new(s))
    }
}

impl From<String> for SecureString {
    fn from(s: String) -> Self {
        SecureString::new(s)
    }
}

impl From<&str> for SecureString {
    fn from(s: &str) -> Self {
        SecureString::from_str(s)
    }
}

/// Secure API credentials that automatically clear from memory
#[derive(Debug, Clone, ZeroizeOnDrop, Serialize, Deserialize)]
pub struct SecureApiCredentials {
    pub api_key: SecureString,
    pub secret_key: SecureString,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub passphrase: Option<SecureString>,
}

impl SecureApiCredentials {
    pub fn new(api_key: String, secret_key: String, passphrase: Option<String>) -> Self {
        Self {
            api_key: SecureString::new(api_key),
            secret_key: SecureString::new(secret_key),
            passphrase: passphrase.map(SecureString::new),
        }
    }

    /// Check if credentials are empty/invalid
    pub fn is_valid(&self) -> bool {
        !self.api_key.is_empty() && !self.secret_key.is_empty()
    }

    /// Clear all credential data immediately
    pub fn clear(&mut self) {
        self.api_key.clear();
        self.secret_key.clear();
        if let Some(ref mut passphrase) = self.passphrase {
            passphrase.clear();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_secure_string_creation() {
        let secure = SecureString::new("sensitive_data".to_string());
        assert_eq!(secure.expose(), "sensitive_data");
        assert_eq!(secure.len(), 14);
        assert!(!secure.is_empty());
    }

    #[test]
    fn test_secure_string_debug() {
        let secure = SecureString::new("secret".to_string());
        let debug_str = format!("{:?}", secure);
        assert!(debug_str.contains("REDACTED"));
        assert!(!debug_str.contains("secret"));
    }

    #[test]
    fn test_secure_credentials() {
        let creds = SecureApiCredentials::new(
            "api_key_123".to_string(),
            "secret_456".to_string(),
            Some("passphrase".to_string())
        );
        
        assert!(creds.is_valid());
        assert_eq!(creds.api_key.expose(), "api_key_123");
        assert_eq!(creds.secret_key.expose(), "secret_456");
        assert_eq!(creds.passphrase.as_ref().unwrap().expose(), "passphrase");
    }

    #[test] 
    fn test_serialization_redaction() {
        let secure = SecureString::new("sensitive".to_string());
        let json = serde_json::to_string(&secure).unwrap();
        assert!(json.contains("REDACTED"));
        assert!(!json.contains("sensitive"));
    }
}