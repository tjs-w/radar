// commands.rs - Contains all Tauri commands

use tauri::AppHandle;

// Logging commands
#[tauri::command]
pub fn set_logging(enable: bool) -> bool {
    crate::log::set_logging(enable)
}

#[tauri::command]
pub fn is_logging_enabled() -> bool {
    crate::log::is_logging_enabled()
}

// Network commands
#[tauri::command]
pub async fn get_public_network_info() -> Result<crate::public_network::PublicNetworkInfo, String> {
    crate::public_network::get_public_network_info_internal()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stream_public_network_info(app_handle: AppHandle) -> Result<(), String> {
    // Just delegate to that function in the public_network module
    crate::public_network::stream_public_network_info(app_handle).await
}

#[tauri::command]
pub fn set_network_logging(enable: bool) -> bool {
    // Just delegate to the main logging function
    crate::log::set_logging(enable)
}

#[tauri::command]
pub fn is_network_logging_enabled() -> bool {
    // Just delegate to the main logging function
    crate::log::is_logging_enabled()
}

// Scanner commands
#[tauri::command]
pub async fn run_network_scan(app_handle: AppHandle) -> Result<Vec<crate::ConsolidatedService>, String> {
    crate::network_scanner::run_network_scan(app_handle).await
}

#[tauri::command]
pub fn get_consolidated_services() -> Vec<crate::ConsolidatedService> {
    crate::network_scanner::get_consolidated_services()
}

#[tauri::command]
pub fn get_new_services() -> Vec<crate::NetworkService> {
    crate::network_scanner::get_new_services()
}

#[tauri::command]
pub async fn discover_mdns_streaming(app_handle: AppHandle) -> Result<Vec<crate::NetworkService>, String> {
    crate::network_scanner::discover_mdns_streaming(app_handle).await
}

#[tauri::command]
pub async fn discover_upnp_streaming(app_handle: AppHandle) -> Result<Vec<crate::NetworkService>, String> {
    crate::network_scanner::discover_upnp_streaming(app_handle).await
} 