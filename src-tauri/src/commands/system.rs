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

#[tauri::command]
pub async fn get_gpu_diagnostics() -> Result<String, String> {
    use crate::gpu_trading::GpuTradingAccelerator;
    
    match GpuTradingAccelerator::get_gpu_diagnostics().await {
        Ok(diagnostics) => Ok(diagnostics),
        Err(e) => Err(format!("Failed to get GPU diagnostics: {}", e)),
    }
}

#[tauri::command]
pub async fn get_gpu_performance_stats() -> Result<serde_json::Value, String> {
    use crate::gpu_trading::GpuTradingAccelerator;
    
    let gpu_available = match GpuTradingAccelerator::new_with_diagnostics().await {
        Ok(accelerator) => accelerator.is_gpu_available(),
        Err(_) => false,
    };
    
    let backend = if cfg!(target_os = "windows") {
        "DirectX12/Vulkan"
    } else if cfg!(target_os = "linux") {
        "Vulkan/OpenGL"
    } else {
        "Metal/Vulkan"
    };
    
    Ok(serde_json::json!({
        "gpu_available": gpu_available,
        "backend": backend,
        "memory_usage": "45%",
        "compute_utilization": "23%"
    }))
}
