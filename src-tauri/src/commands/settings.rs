use crate::models::AppSettings;

#[tauri::command]
pub async fn save_settings(settings: AppSettings) -> Result<(), String> {
    let app_dir = std::env::current_dir().unwrap().join("data");
    let store_path = app_dir.join("settings.json");
    
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    std::fs::write(store_path, json).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn load_settings() -> Result<AppSettings, String> {
    let app_dir = std::env::current_dir().unwrap().join("data");
    let store_path = app_dir.join("settings.json");
    
    if !store_path.exists() {
        return Ok(AppSettings::default());
    }
    
    let json = std::fs::read_to_string(store_path).map_err(|e| e.to_string())?;
    let settings: AppSettings = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    
    Ok(settings)
}