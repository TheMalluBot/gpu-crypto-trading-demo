use tauri::State;
use crate::secure_storage::{ApiCredentialManager, SecureApiCredentials};
use crate::models::AppSettings;

#[tauri::command]
pub async fn save_secure_credentials(
    api_key: String,
    api_secret: String,
    testnet: bool,
    base_url: String,
) -> Result<(), String> {
    let manager = ApiCredentialManager::new().map_err(|e| e.to_string())?;
    
    let credentials = SecureApiCredentials::new(api_key, api_secret, testnet, base_url);
    manager.store_credentials(&credentials).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn load_secure_credentials() -> Result<Option<SecureApiCredentials>, String> {
    let manager = ApiCredentialManager::new().map_err(|e| e.to_string())?;
    manager.load_credentials().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_redacted_credentials() -> Result<Option<SecureApiCredentials>, String> {
    let manager = ApiCredentialManager::new().map_err(|e| e.to_string())?;
    
    match manager.load_credentials().map_err(|e| e.to_string())? {
        Some(credentials) => Ok(Some(credentials.redacted())),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn has_secure_credentials() -> Result<bool, String> {
    let manager = ApiCredentialManager::new().map_err(|e| e.to_string())?;
    Ok(manager.credentials_exist())
}

#[tauri::command]
pub async fn clear_secure_credentials() -> Result<(), String> {
    let manager = ApiCredentialManager::new().map_err(|e| e.to_string())?;
    manager.delete_credentials().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_credentials_last_used() -> Result<(), String> {
    let manager = ApiCredentialManager::new().map_err(|e| e.to_string())?;
    manager.update_last_used().map_err(|e| e.to_string())?;
    Ok(())
}

// Enhanced connection test with better error handling
#[tauri::command]
pub async fn enhanced_test_connection(settings: AppSettings) -> Result<ConnectionTestResult, String> {
    use crate::binance_client::ImprovedBinanceClient;
    use std::time::Instant;
    
    let start_time = Instant::now();
    
    match ImprovedBinanceClient::new(&settings) {
        Ok(mut client) => {
            // First test basic connectivity
            match client.test_connection().await {
                Ok(is_connected) => {
                    let latency = start_time.elapsed().as_millis() as u64;
                    
                    if is_connected {
                        // Test authenticated endpoint if credentials are available
                        if client.has_valid_credentials() {
                            match client.get_account_info().await {
                                Ok(_) => Ok(ConnectionTestResult {
                                    success: true,
                                    latency_ms: latency,
                                    error_message: None,
                                    authenticated: true,
                                    server_time_synced: true,
                                }),
                                Err(e) => Ok(ConnectionTestResult {
                                    success: false,
                                    latency_ms: latency,
                                    error_message: Some(e.to_string()),
                                    authenticated: false,
                                    server_time_synced: false,
                                }),
                            }
                        } else {
                            Ok(ConnectionTestResult {
                                success: true,
                                latency_ms: latency,
                                error_message: None,
                                authenticated: false,
                                server_time_synced: true,
                            })
                        }
                    } else {
                        Ok(ConnectionTestResult {
                            success: false,
                            latency_ms: latency,
                            error_message: Some("Connection test failed".to_string()),
                            authenticated: false,
                            server_time_synced: false,
                        })
                    }
                }
                Err(e) => {
                    let latency = start_time.elapsed().as_millis() as u64;
                    Ok(ConnectionTestResult {
                        success: false,
                        latency_ms: latency,
                        error_message: Some(e.to_string()),
                        authenticated: false,
                        server_time_synced: false,
                    })
                }
            }
        }
        Err(e) => Ok(ConnectionTestResult {
            success: false,
            latency_ms: 0,
            error_message: Some(format!("Failed to create client: {}", e)),
            authenticated: false,
            server_time_synced: false,
        }),
    }
}

#[derive(serde::Serialize)]
pub struct ConnectionTestResult {
    pub success: bool,
    pub latency_ms: u64,
    pub error_message: Option<String>,
    pub authenticated: bool,
    pub server_time_synced: bool,
}

// Validate API credentials format
#[tauri::command]
pub async fn validate_api_credentials(api_key: String, api_secret: String) -> Result<CredentialValidation, String> {
    let mut issues = Vec::with_capacity(5);
    let mut warnings = Vec::with_capacity(5);
    
    // API Key validation
    if api_key.is_empty() {
        issues.push("API key is required".to_string());
    } else if api_key.len() < 16 {
        issues.push("API key appears to be too short".to_string());
    } else if api_key.len() > 128 {
        issues.push("API key appears to be too long".to_string());
    } else if !api_key.chars().all(|c| c.is_alphanumeric()) {
        warnings.push("API key contains non-alphanumeric characters".to_string());
    }
    
    // API Secret validation
    if api_secret.is_empty() {
        issues.push("API secret is required".to_string());
    } else if api_secret.len() < 16 {
        issues.push("API secret appears to be too short".to_string());
    } else if api_secret.len() > 128 {
        issues.push("API secret appears to be too long".to_string());
    } else if !api_secret.chars().all(|c| c.is_alphanumeric()) {
        warnings.push("API secret contains non-alphanumeric characters".to_string());
    }
    
    // Check for common mistakes
    if api_key == api_secret {
        issues.push("API key and secret cannot be the same".to_string());
    }
    
    if api_key.to_lowercase().contains("secret") || api_secret.to_lowercase().contains("key") {
        warnings.push("Credentials may be swapped (key contains 'secret' or secret contains 'key')".to_string());
    }
    
    Ok(CredentialValidation {
        is_valid: issues.is_empty(),
        issues,
        warnings,
    })
}

#[derive(serde::Serialize)]
pub struct CredentialValidation {
    pub is_valid: bool,
    pub issues: Vec<String>,
    pub warnings: Vec<String>,
}

// Get API endpoint information for user education
#[tauri::command]
pub async fn get_api_endpoint_info(base_url: String, testnet: bool) -> Result<ApiEndpointInfo, String> {
    let endpoint_type = if testnet {
        "Testnet".to_string()
    } else if base_url.contains("binance.us") {
        "Binance US".to_string()
    } else if base_url.contains("binance.com") {
        "Binance Global".to_string()
    } else {
        "Custom".to_string()
    };
    
    let rate_limits = if testnet {
        RateLimitInfo {
            requests_per_minute: 6000,
            weight_per_minute: 1200,
            orders_per_second: 10,
            orders_per_day: 200000,
        }
    } else {
        RateLimitInfo {
            requests_per_minute: 6000,
            weight_per_minute: 1200,
            orders_per_second: 10,
            orders_per_day: 200000,
        }
    };
    
    let security_features = vec![
        "HMAC SHA256 signature".to_string(),
        "Timestamp validation".to_string(),
        "IP whitelisting support".to_string(),
        "API key permissions".to_string(),
    ];
    
    Ok(ApiEndpointInfo {
        endpoint_type,
        base_url,
        testnet,
        rate_limits,
        security_features,
        documentation_url: "https://developers.binance.com/docs/".to_string(),
    })
}

#[derive(serde::Serialize)]
pub struct ApiEndpointInfo {
    pub endpoint_type: String,
    pub base_url: String,
    pub testnet: bool,
    pub rate_limits: RateLimitInfo,
    pub security_features: Vec<String>,
    pub documentation_url: String,
}

#[derive(serde::Serialize)]
pub struct RateLimitInfo {
    pub requests_per_minute: u32,
    pub weight_per_minute: u32,
    pub orders_per_second: u32,
    pub orders_per_day: u32,
}
