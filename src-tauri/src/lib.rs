// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use tauri::Manager;

// Public network module
pub mod public_network;
// Network scanning module
pub mod network_scanner;
// Router discovery module
pub mod router_discovery;
// Log module
pub mod log;
// Commands module
pub mod commands;

// Import the functions from network_scanner module
pub use network_scanner::{discover_mdns_streaming, discover_upnp_streaming, scan_local_network};

// Export other modules
pub use router_discovery::get_router_and_isp_info;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash)]
pub struct NetworkService {
    pub name: String,
    pub service_type: String,
    pub address: String,
    pub port: Option<u16>,
    pub discovery_method: String,
    pub details: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConsolidatedService {
    // Core identification
    pub name: String,
    pub address: String,
    pub port: Option<u16>,

    // Service information
    pub hostname: Option<String>,
    pub device_type: Option<String>,

    // Discovery information
    pub discovery_methods: Vec<String>,

    // Service details
    pub service_types: Vec<String>,
    pub open_ports: HashMap<u16, String>, // port -> service name

    // Additional metadata
    pub uuid: Option<String>,
    pub location_url: Option<String>,
    pub server_info: Option<String>,

    // Formatted details for display
    pub friendly_description: String,
}

// Store discovered services
pub static DISCOVERED_SERVICES: once_cell::sync::Lazy<Arc<Mutex<HashSet<NetworkService>>>> =
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(HashSet::new())));

// Store consolidated services
pub static CONSOLIDATED_SERVICES: once_cell::sync::Lazy<
    Arc<Mutex<HashMap<String, ConsolidatedService>>>,
> = once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));

// Add UPnP XML structures
#[derive(Debug, Deserialize)]
pub struct DeviceDescription {
    #[serde(rename = "device")]
    pub device: Device,
}

#[derive(Debug, Deserialize)]
pub struct Device {
    #[serde(rename = "deviceType")]
    pub device_type: Option<String>,
    #[serde(rename = "friendlyName")]
    pub friendly_name: Option<String>,
    #[serde(rename = "manufacturer")]
    pub manufacturer: Option<String>,
    #[serde(rename = "manufacturerURL")]
    pub manufacturer_url: Option<String>,
    #[serde(rename = "modelDescription")]
    pub model_description: Option<String>,
    #[serde(rename = "modelName")]
    pub model_name: Option<String>,
    #[serde(rename = "modelNumber")]
    pub model_number: Option<String>,
    #[serde(rename = "modelURL")]
    pub model_url: Option<String>,
    #[serde(rename = "serialNumber")]
    pub serial_number: Option<String>,
    #[serde(rename = "UDN")]
    pub udn: Option<String>,
    #[serde(rename = "presentationURL")]
    pub presentation_url: Option<String>,
    #[serde(rename = "serviceList")]
    pub service_list: Option<ServiceList>,
    #[serde(rename = "deviceList")]
    pub device_list: Option<DeviceList>,
}

#[derive(Debug, Deserialize)]
pub struct ServiceList {
    #[serde(rename = "service")]
    pub services: Vec<Service>,
}

#[derive(Debug, Deserialize)]
pub struct Service {
    #[serde(rename = "serviceType")]
    pub service_type: String,
    #[serde(rename = "serviceId")]
    pub service_id: String,
    #[serde(rename = "controlURL")]
    pub control_url: Option<String>,
    #[serde(rename = "eventSubURL")]
    pub event_sub_url: Option<String>,
    #[serde(rename = "SCPDURL")]
    pub scpd_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DeviceList {
    #[serde(rename = "device")]
    pub devices: Vec<Device>,
}

// Create a new run function that can be called from main.rs
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_network::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize modules
            public_network::init(app)?;

            // Set up the tray icon
            tauri::tray::TrayIconBuilder::new()
                .tooltip("Radar - Network Scanner")
                .on_tray_icon_event(|tray, event| match event {
                    tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } => {
                        // Show and focus the main window when the tray is clicked
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {
                        // Ignore other tray events
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Use commands from the commands module
            commands::get_public_network_info,
            commands::set_network_logging,
            commands::is_network_logging_enabled,
            commands::run_network_scan,
            commands::stop_network_scan,
            commands::discover_mdns_streaming,
            commands::discover_upnp_streaming,
            // Logging commands
            #[cfg(debug_assertions)]
            commands::set_logging,
            #[cfg(debug_assertions)]
            commands::is_logging_enabled,
            // Command logging filter commands
            #[cfg(feature = "command_logging")]
            commands::set_command_logging_filter,
            #[cfg(feature = "command_logging")]
            commands::get_command_logging_filter,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
