// commands.rs - Contains all Tauri commands

use tauri::AppHandle;
use tauri::Emitter;
use crate::radar_info;
use crate::NetworkService;

// Import only the macros we actually use

#[cfg(feature = "command_logging")]
use std::sync::Mutex;
#[cfg(feature = "command_logging")]
use once_cell::sync::Lazy;
#[cfg(feature = "command_logging")]
use std::collections::HashSet;

// Store which commands should be logged (empty means log all)
#[cfg(feature = "command_logging")]
static COMMAND_LOG_FILTER: Lazy<Mutex<HashSet<String>>> = Lazy::new(|| Mutex::new(HashSet::new()));

// Set the commands to log - empty vec means log all commands
#[cfg(feature = "command_logging")]
#[tauri::command]
pub fn set_command_logging_filter(commands: Vec<String>) -> bool {
    let mut filter = COMMAND_LOG_FILTER.lock().unwrap();
    filter.clear();
    for cmd in commands {
        filter.insert(cmd);
    }
    true
}

// Get the current command logging filter
#[cfg(feature = "command_logging")]
#[tauri::command]
pub fn get_command_logging_filter() -> Vec<String> {
    let filter = COMMAND_LOG_FILTER.lock().unwrap();
    filter.iter().cloned().collect()
}

// Logging helper function that only logs when command_logging feature is enabled
// and the command is in the filter (or filter is empty)
#[cfg(feature = "command_logging")]
fn should_log_command(name: &str) -> bool {
    let filter = COMMAND_LOG_FILTER.lock().unwrap();
    filter.is_empty() || filter.contains(name)
}

#[cfg(feature = "command_logging")]
fn log_command(name: &str, args: String) {
    if should_log_command(name) {
        radar_info!("Command '{}' called with args: {}", name, args);
    }
}

#[cfg(feature = "command_logging")]
fn log_result(name: &str, result: String) {
    if should_log_command(name) {
        radar_info!("Command '{}' returned: {}", name, result);
    }
}

// Logging commands
#[cfg(debug_assertions)]
#[tauri::command]
pub fn set_logging(enable: bool) -> bool {
    // Kept for development use, only available in debug builds
    crate::log::set_logging(enable)
}

#[cfg(debug_assertions)]
#[tauri::command]
pub fn is_logging_enabled() -> bool {
    // Kept for development use, only available in debug builds
    crate::log::is_logging_enabled()
}

// Network commands
#[tauri::command]
pub async fn get_public_network_info() -> Result<crate::public_network::PublicNetworkInfo, String> {
    #[cfg(feature = "command_logging")]
    log_command("get_public_network_info", "no args".to_string());
    
    let result = crate::public_network::get_public_network_info_internal()
        .await
        .map_err(|e| e.to_string());
    
    #[cfg(feature = "command_logging")]
    log_result("get_public_network_info", format!("{:?}", result));
    
    result
}

#[tauri::command]
pub fn set_network_logging(enable: bool) -> bool {
    #[cfg(feature = "command_logging")]
    log_command("set_network_logging", format!("enable: {}", enable));
    
    let result = crate::log::set_logging(enable);
    
    #[cfg(feature = "command_logging")]
    log_result("set_network_logging", format!("{}", result));
    
    result
}

#[tauri::command]
pub fn is_network_logging_enabled() -> bool {
    #[cfg(feature = "command_logging")]
    log_command("is_network_logging_enabled", "no args".to_string());
    
    let result = crate::log::is_logging_enabled();
    
    #[cfg(feature = "command_logging")]
    log_result("is_network_logging_enabled", format!("{}", result));
    
    result
}

// Scanner commands
#[tauri::command]
pub async fn run_network_scan(app_handle: AppHandle) -> Result<bool, String> {
    radar_info!("Starting network scan");
    
    // First, emit a scan-started event so the frontend knows to start listening
    match app_handle.emit("scan-started", true) {
        Ok(_) => radar_info!("Successfully emitted scan-started event"),
        Err(e) => radar_info!("Failed to emit scan-started event: {}", e),
    }
    
    // Run mDNS and UPnP discovery first
    radar_info!("Starting mDNS service discovery...");
    let mdns_result = crate::discover_mdns_streaming(app_handle.clone()).await;
    if let Ok(services) = &mdns_result {
        radar_info!("Found {} mDNS services", services.len());
    }
    
    radar_info!("Starting UPnP service discovery...");
    let upnp_result = crate::discover_upnp_streaming(app_handle.clone()).await;
    if let Ok(services) = &upnp_result {
        radar_info!("Found {} UPnP services", services.len());
    }
    
    // Now run the local network scan which will add to the shared network map
    radar_info!("Scanning local network...");
    let network_services = crate::network_scanner::scan_local_network(&app_handle).await;
    radar_info!("Found {} network services", network_services.len());
    
    // Now consolidate all services
    let mut all_services = Vec::new();
    if let Ok(services) = mdns_result {
        all_services.extend(services);
    }
    if let Ok(services) = upnp_result {
        all_services.extend(services);
    }
    all_services.extend(network_services);
    
    // Consolidate services for reporting (but we've already emitted individual service events)
    let consolidated = crate::network_scanner::consolidate_services(all_services.clone());
    radar_info!("Network scan complete, found {} consolidated services", consolidated.len());
    
    // Store in global state
    {
        let mut discovered_services = crate::DISCOVERED_SERVICES.lock().unwrap();
        let mut consolidated_services = crate::CONSOLIDATED_SERVICES.lock().unwrap();
        
        // Update discovered services set
        for service in &all_services {
            discovered_services.insert(service.clone());
        }
        
        // Update consolidated services map
        for service in &consolidated {
            let key = format!("{}:{}", service.address, service.port.unwrap_or(0));
            consolidated_services.insert(key, service.clone());
        }
    }
    
    // Finally emit scan-complete
    radar_info!("Emitting scan-complete event");
    let _ = app_handle.emit("scan-complete", ());
    
    Ok(true)
}

#[tauri::command]
pub async fn stop_network_scan(app_handle: AppHandle) -> Result<(), String> {
    #[cfg(feature = "command_logging")]
    log_command("stop_network_scan", "app_handle provided".to_string());
    
    // We currently don't have a way to cancel an in-progress scan,
    // but we can emit the scan-complete event to tell the frontend to stop
    app_handle.emit("scan-complete", ()).ok();
    
    #[cfg(feature = "command_logging")]
    log_result("stop_network_scan", "Stopped scan".to_string());
    
    Ok(())
}

#[tauri::command]
pub async fn discover_mdns_streaming(app_handle: AppHandle) -> Result<Vec<crate::NetworkService>, String> {
    #[cfg(feature = "command_logging")]
    log_command("discover_mdns_streaming", "app_handle provided".to_string());
    
    let result = crate::network_scanner::discover_mdns_streaming(app_handle).await;
    
    #[cfg(feature = "command_logging")]
    log_result("discover_mdns_streaming", format!("Found {} services", result.as_ref().map_or(0, |v| v.len())));
    
    result
}

#[tauri::command]
pub async fn discover_upnp_streaming(app_handle: AppHandle) -> Result<Vec<crate::NetworkService>, String> {
    #[cfg(feature = "command_logging")]
    log_command("discover_upnp_streaming", "app_handle provided".to_string());
    
    let result = crate::network_scanner::discover_upnp_streaming(app_handle).await;
    
    #[cfg(feature = "command_logging")]
    log_result("discover_upnp_streaming", format!("Found {} services", result.as_ref().map_or(0, |v| v.len())));
    
    result
}

// Command for saved services removed - persistence not needed

/// Get macOS version information (macOS only)
#[tauri::command]
pub fn get_macos_version() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let output = Command::new("sw_vers")
            .arg("-productVersion")
            .output()
            .map_err(|e| e.to_string())?;
        
        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(version)
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        Ok("Not macOS".to_string())
    }
}

/// Get all discovered services
#[tauri::command]
pub fn get_discovered_services() -> Vec<NetworkService> {
    let services = crate::DISCOVERED_SERVICES.lock().unwrap();
    let services_vec: Vec<NetworkService> = services.iter().cloned().collect();
    services_vec
}
