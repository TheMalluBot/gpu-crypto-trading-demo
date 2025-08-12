use crate::{AppState, TradingState};
use tauri::State;

#[tauri::command]
pub async fn cpu_stats(state: State<'_, AppState>) -> Result<f32, String> {
    let stats = state.read().await;
    Ok(stats.cpu_load)
}

#[tauri::command]
pub async fn gpu_stats(state: State<'_, AppState>) -> Result<(f32, f32), String> {
    let stats = state.read().await;
    Ok((stats.fps, stats.gpu_frame_time))
}

#[tauri::command]
pub async fn get_texture_data() -> Result<Vec<u8>, String> {
    // Return minimal black texture since we're not doing rendering
    let size = 512 * 512 * 4;
    Ok(vec![0u8; size]) // Just return black pixels
}

#[tauri::command]
pub async fn start_websocket_feed(
    trading_state: State<'_, TradingState>,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    let websocket = trading_state.websocket.clone();
    
    match websocket.connect(app_handle).await {
        Ok(()) => Ok("WebSocket connection started successfully".to_string()),
        Err(e) => Err(format!("Failed to start WebSocket connection: {}", e)),
    }
}
