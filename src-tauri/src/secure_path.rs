/// Secure path utilities to prevent path traversal attacks
use std::path::{Path, PathBuf};
use std::fs;

/// Error type for path validation
#[derive(Debug, thiserror::Error)]
pub enum PathSecurityError {
    #[error("Path traversal attempt detected: {0}")]
    PathTraversal(String),
    #[error("Invalid path: {0}")]
    InvalidPath(String),
    #[error("Path outside allowed directory: {0}")]
    OutsideAllowedDirectory(String),
    #[error("File system error: {0}")]
    FileSystemError(#[from] std::io::Error),
}

/// Secure path validator that prevents path traversal attacks
pub struct SecurePathValidator {
    allowed_base_paths: Vec<PathBuf>,
}

impl SecurePathValidator {
    /// Create a new secure path validator with allowed base directories
    pub fn new(allowed_base_paths: Vec<PathBuf>) -> Result<Self, PathSecurityError> {
        // Canonicalize all base paths to resolve symlinks and normalize
        let mut canonical_paths = Vec::new();
        for path in allowed_base_paths {
            let canonical = fs::canonicalize(&path)
                .map_err(|e| PathSecurityError::FileSystemError(e))?;
            canonical_paths.push(canonical);
        }
        
        Ok(Self {
            allowed_base_paths: canonical_paths,
        })
    }

    /// Validate and resolve a path safely
    pub fn validate_path<P: AsRef<Path>>(&self, input_path: P) -> Result<PathBuf, PathSecurityError> {
        let input = input_path.as_ref();
        
        // Check for obvious path traversal attempts
        if self.contains_traversal_sequences(input) {
            return Err(PathSecurityError::PathTraversal(
                input.display().to_string()
            ));
        }

        // Try to canonicalize the path
        let canonical_path = match fs::canonicalize(input) {
            Ok(path) => path,
            Err(_) => {
                // If canonicalization fails, construct the path manually but still validate
                let mut resolved_path = PathBuf::new();
                for component in input.components() {
                    match component {
                        std::path::Component::ParentDir => {
                            return Err(PathSecurityError::PathTraversal(
                                "Parent directory (..) not allowed".to_string()
                            ));
                        }
                        std::path::Component::Normal(name) => {
                            resolved_path.push(name);
                        }
                        std::path::Component::RootDir | 
                        std::path::Component::CurDir => {
                            // These are safe to ignore or handle appropriately
                            continue;
                        }
                        std::path::Component::Prefix(_) => {
                            // Windows prefixes, validate carefully
                            resolved_path.push(component.as_os_str());
                        }
                    }
                }
                resolved_path
            }
        };

        // Check if the canonical path is within allowed directories
        for allowed_base in &self.allowed_base_paths {
            if canonical_path.starts_with(allowed_base) {
                return Ok(canonical_path);
            }
        }

        Err(PathSecurityError::OutsideAllowedDirectory(
            canonical_path.display().to_string()
        ))
    }

    /// Check for path traversal sequences
    fn contains_traversal_sequences(&self, path: &Path) -> bool {
        let path_str = path.to_string_lossy();
        
        // Check for various path traversal patterns
        let dangerous_patterns = [
            "..",
            "..\\",
            "../",
            "..\\\\",
            "..//",
            "%2e%2e",
            "%2e%2e/",
            "%2e%2e\\",
            "..%2f",
            "..%5c",
            "%252e%252e",
            "..%252f",
            "..%252c",
        ];

        for pattern in &dangerous_patterns {
            if path_str.contains(pattern) {
                return true;
            }
        }

        // Check for null bytes (path injection)
        if path_str.contains('\0') {
            return true;
        }

        // Check each component individually
        for component in path.components() {
            if let std::path::Component::ParentDir = component {
                return true;
            }
        }

        false
    }

    /// Safely join a base path with a user-provided path
    pub fn safe_join<P1: AsRef<Path>, P2: AsRef<Path>>(
        &self,
        base: P1,
        user_path: P2
    ) -> Result<PathBuf, PathSecurityError> {
        let base_path = base.as_ref();
        let user_path = user_path.as_ref();

        // Validate the user path first
        if self.contains_traversal_sequences(user_path) {
            return Err(PathSecurityError::PathTraversal(
                user_path.display().to_string()
            ));
        }

        // Create the joined path
        let joined = base_path.join(user_path);
        
        // Validate the final path
        self.validate_path(joined)
    }
}

/// Create a default secure path validator for the application
pub fn create_app_path_validator() -> Result<SecurePathValidator, PathSecurityError> {
    let mut allowed_paths = Vec::new();

    // Add application data directory
    if let Ok(data_dir) = get_app_data_dir() {
        allowed_paths.push(data_dir);
    }

    // Add temporary directory for app
    if let Ok(temp_dir) = get_app_temp_dir() {
        allowed_paths.push(temp_dir);
    }

    // Add current working directory (with caution)
    if let Ok(current_dir) = std::env::current_dir() {
        allowed_paths.push(current_dir);
    }

    SecurePathValidator::new(allowed_paths)
}

/// Get secure application data directory
fn get_app_data_dir() -> Result<PathBuf, PathSecurityError> {
    let app_name = "crypto_trader";
    
    let app_dir = if let Ok(data_dir) = std::env::var("APPDATA") {
        // Windows AppData
        PathBuf::from(data_dir).join(app_name)
    } else if let Ok(home_dir) = std::env::var("HOME") {
        // Unix-like systems
        PathBuf::from(home_dir).join(".local/share").join(app_name)
    } else {
        return Err(PathSecurityError::InvalidPath(
            "Could not determine app data directory".to_string()
        ));
    };

    // Create directory if it doesn't exist
    fs::create_dir_all(&app_dir)
        .map_err(PathSecurityError::FileSystemError)?;

    Ok(app_dir)
}

/// Get secure temporary directory for the application
fn get_app_temp_dir() -> Result<PathBuf, PathSecurityError> {
    let temp_dir = std::env::temp_dir().join("crypto_trader");
    
    fs::create_dir_all(&temp_dir)
        .map_err(PathSecurityError::FileSystemError)?;

    Ok(temp_dir)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_path_traversal_detection() {
        let temp_dir = std::env::temp_dir();
        let validator = SecurePathValidator::new(vec![temp_dir.clone()]).unwrap();

        // These should be rejected
        let bad_paths = [
            "../etc/passwd",
            "..\\windows\\system32",
            "folder/../../../etc/shadow",
            "%2e%2e/etc/passwd",
            "..%2f..%2f..%2fetc%2fpasswd",
        ];

        for bad_path in &bad_paths {
            let result = validator.validate_path(bad_path);
            assert!(result.is_err(), "Path should be rejected: {}", bad_path);
        }
    }

    #[test]
    fn test_safe_paths() {
        let temp_dir = std::env::temp_dir();
        let validator = SecurePathValidator::new(vec![temp_dir.clone()]).unwrap();

        // Create a test file in temp directory
        let test_file = temp_dir.join("test_file.txt");
        fs::write(&test_file, "test").unwrap();

        // This should be accepted
        let result = validator.validate_path(&test_file);
        assert!(result.is_ok(), "Safe path should be accepted");

        // Cleanup
        let _ = fs::remove_file(test_file);
    }
}