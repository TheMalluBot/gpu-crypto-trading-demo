// Authentication module for secure bot operations
// Implements JWT-based authentication with proper token validation

use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation, Algorithm};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc, Duration};
use crate::errors::{TradingError, TradingResult, AuthErrorType};
use crate::secure_string::SecureString;
use std::collections::HashSet;

const JWT_SECRET: &[u8] = b"crypto_trading_bot_secret_key_2025"; // Should be environment variable in production
const TOKEN_EXPIRY_HOURS: i64 = 24;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,           // Subject (user ID)
    pub exp: i64,             // Expiration time
    pub iat: i64,             // Issued at
    pub permissions: Vec<String>, // User permissions
    pub session_id: String,   // Unique session identifier
}

#[derive(Debug, Clone)]
pub struct AuthToken {
    pub token: SecureString,
    pub user_id: String,
    pub permissions: HashSet<String>,
    pub expires_at: DateTime<Utc>,
    pub session_id: String,
}

#[derive(Debug, Clone)]
pub struct AuthManager {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
    validation: Validation,
    active_sessions: std::sync::Arc<std::sync::RwLock<HashSet<String>>>,
}

impl Default for AuthManager {
    fn default() -> Self {
        Self::new()
    }
}

impl AuthManager {
    pub fn new() -> Self {
        let mut validation = Validation::new(Algorithm::HS256);
        validation.set_required_spec_claims(&["exp", "sub", "iat"]);
        
        Self {
            encoding_key: EncodingKey::from_secret(JWT_SECRET),
            decoding_key: DecodingKey::from_secret(JWT_SECRET),
            validation,
            active_sessions: std::sync::Arc::new(std::sync::RwLock::new(HashSet::new())),
        }
    }
    
    /// Generate a new authentication token for a user
    pub fn generate_token(&self, user_id: &str, permissions: Vec<String>) -> TradingResult<AuthToken> {
        let now = Utc::now();
        let expires_at = now + Duration::hours(TOKEN_EXPIRY_HOURS);
        let session_id = uuid::Uuid::new_v4().to_string();
        
        let claims = Claims {
            sub: user_id.to_string(),
            exp: expires_at.timestamp(),
            iat: now.timestamp(),
            permissions: permissions.clone(),
            session_id: session_id.clone(),
        };
        
        let token = encode(&Header::default(), &claims, &self.encoding_key)
            .map_err(|e| TradingError::auth_error(
                AuthErrorType::TokenGenerationFailed,
                format!("Failed to generate JWT token: {}", e)
            ))?;
        
        // Add session to active sessions
        {
            let mut sessions = self.active_sessions.write().unwrap();
            sessions.insert(session_id.clone());
        }
        
        Ok(AuthToken {
            token: SecureString::new(token),
            user_id: user_id.to_string(),
            permissions: permissions.into_iter().collect(),
            expires_at,
            session_id,
        })
    }
    
    /// Validate an authentication token
    pub fn validate_token(&self, token_str: &str) -> TradingResult<Claims> {
        let token_data = decode::<Claims>(token_str, &self.decoding_key, &self.validation)
            .map_err(|e| match e.kind() {
                jsonwebtoken::errors::ErrorKind::ExpiredSignature => {
                    TradingError::auth_error(
                        AuthErrorType::TokenExpired,
                        "Authentication token has expired".to_string()
                    )
                },
                jsonwebtoken::errors::ErrorKind::InvalidToken => {
                    TradingError::auth_error(
                        AuthErrorType::InvalidToken,
                        "Invalid authentication token".to_string()
                    )
                },
                _ => {
                    TradingError::auth_error(
                        AuthErrorType::TokenValidationFailed,
                        format!("Token validation failed: {}", e)
                    )
                }
            })?;
        
        let claims = token_data.claims;
        
        // Check if session is still active
        {
            let sessions = self.active_sessions.read().unwrap();
            if !sessions.contains(&claims.session_id) {
                return Err(TradingError::auth_error(
                    AuthErrorType::SessionInvalid,
                    "Session has been invalidated".to_string()
                ));
            }
        }
        
        // Additional expiration check (belt and suspenders)
        let now = Utc::now().timestamp();
        if claims.exp < now {
            return Err(TradingError::auth_error(
                AuthErrorType::TokenExpired,
                "Token has expired".to_string()
            ));
        }
        
        Ok(claims)
    }
    
    /// Check if user has specific permission
    pub fn has_permission(&self, claims: &Claims, permission: &str) -> bool {
        claims.permissions.contains(permission) || claims.permissions.contains("admin")
    }
    
    /// Revoke a session (logout)
    pub fn revoke_session(&self, session_id: &str) -> TradingResult<()> {
        let mut sessions = self.active_sessions.write().unwrap();
        sessions.remove(session_id);
        Ok(())
    }
    
    /// Clean up expired sessions
    pub fn cleanup_expired_sessions(&self) {
        // This would typically involve checking a database or cache
        // For now, we'll implement a simple cleanup
        let mut sessions = self.active_sessions.write().unwrap();
        // In a real implementation, you'd track session expiry times
        // and remove expired sessions here
        sessions.clear(); // Simplified for demo
    }
}

/// Authentication middleware for bot operations
pub struct BotAuthMiddleware {
    auth_manager: AuthManager,
}

impl BotAuthMiddleware {
    pub fn new() -> Self {
        Self {
            auth_manager: AuthManager::new(),
        }
    }
    
    /// Validate bot operation permission
    pub fn validate_bot_operation(&self, token: &str, operation: &str) -> TradingResult<Claims> {
        let claims = self.auth_manager.validate_token(token)?;
        
        let required_permission = match operation {
            "start_bot" | "stop_bot" => "bot:control",
            "configure_bot" => "bot:configure", 
            "view_bot_status" => "bot:view",
            "emergency_stop" => "bot:emergency",
            _ => return Err(TradingError::auth_error(
                AuthErrorType::PermissionDenied,
                format!("Unknown bot operation: {}", operation)
            ))
        };
        
        if !self.auth_manager.has_permission(&claims, required_permission) {
            return Err(TradingError::auth_error(
                AuthErrorType::PermissionDenied,
                format!("Insufficient permissions for operation: {}", operation)
            ));
        }
        
        Ok(claims)
    }
    
    /// Generate bot operation token (for testing/demo purposes)
    pub fn generate_bot_token(&self, user_id: &str) -> TradingResult<AuthToken> {
        let permissions = vec![
            "bot:control".to_string(),
            "bot:configure".to_string(),
            "bot:view".to_string(),
            "bot:emergency".to_string(),
        ];
        
        self.auth_manager.generate_token(user_id, permissions)
    }
}

impl Default for BotAuthMiddleware {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_token_generation_and_validation() {
        let auth = AuthManager::new();
        let permissions = vec!["bot:control".to_string(), "bot:view".to_string()];
        
        let token = auth.generate_token("test_user", permissions).unwrap();
        
        token.token.with_data(|token_str| {
            let claims = auth.validate_token(token_str).unwrap();
            assert_eq!(claims.sub, "test_user");
            assert!(claims.permissions.contains("bot:control"));
            assert!(claims.permissions.contains("bot:view"));
        });
    }
    
    #[test]
    fn test_permission_checking() {
        let auth = AuthManager::new();
        let permissions = vec!["bot:view".to_string()];
        
        let token = auth.generate_token("test_user", permissions).unwrap();
        
        token.token.with_data(|token_str| {
            let claims = auth.validate_token(token_str).unwrap();
            assert!(auth.has_permission(&claims, "bot:view"));
            assert!(!auth.has_permission(&claims, "bot:control"));
        });
    }
    
    #[test]
    fn test_invalid_token() {
        let auth = AuthManager::new();
        let result = auth.validate_token("invalid_token");
        assert!(result.is_err());
    }
    
    #[test]
    fn test_bot_auth_middleware() {
        let middleware = BotAuthMiddleware::new();
        let token = middleware.generate_bot_token("test_user").unwrap();
        
        token.token.with_data(|token_str| {
            let claims = middleware.validate_bot_operation(token_str, "start_bot").unwrap();
            assert_eq!(claims.sub, "test_user");
        });
    }
    
    #[test]
    fn test_insufficient_permissions() {
        let auth = AuthManager::new();
        let permissions = vec!["bot:view".to_string()]; // Only view permission
        let token = auth.generate_token("test_user", permissions).unwrap();
        
        let middleware = BotAuthMiddleware::new();
        
        token.token.with_data(|token_str| {
            let result = middleware.validate_bot_operation(token_str, "start_bot");
            assert!(result.is_err());
            if let Err(TradingError::Auth { error_type, .. }) = result {
                assert_eq!(error_type, AuthErrorType::PermissionDenied);
            }
        });
    }
}