// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Create the log module
mod log;

use image;
use tauri::image::Image;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::TrayIconBuilder;
use tauri::Manager;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize our custom logger
    log::init_logger();

    // Enable application-wide logging if the all_logging feature is enabled
    #[cfg(feature = "all_logging")]
    {
        // Enable internal application logging by calling the log module directly
        #[allow(dead_code)]
        crate::log::set_logging(true);
        println!("All logging enabled - running with full logs");
    }

    // Log which module-specific flags are enabled
    #[cfg(any(
        feature = "log_commands",
        feature = "log_network_scanner",
        feature = "log_public_network"
    ))]
    {
        // Let's use our radar macros here to prove they work
        crate::radar_info!("Module-specific logging enabled for:");
        #[cfg(feature = "log_commands")]
        crate::radar_info!("- commands module");
        #[cfg(feature = "log_network_scanner")]
        crate::radar_info!("- network_scanner module");
        #[cfg(feature = "log_public_network")]
        crate::radar_info!("- public_network module");
    }

    // Set up command logging filter from environment variables if present
    #[cfg(feature = "command_logging")]
    {
        if let Ok(cmd_filter) = std::env::var("RADAR_LOG_COMMANDS") {
            if !cmd_filter.is_empty() {
                let commands: Vec<String> = cmd_filter
                    .split(',')
                    .map(|s| s.trim().to_string())
                    .collect();

                if !commands.is_empty() {
                    println!(
                        "Command logging enabled for {} specific commands",
                        commands.len()
                    );
                    radar_lib::commands::set_command_logging_filter(commands);
                }
            }
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_network::init())
        .plugin(tauri_plugin_opener::init())
        // .plugin(tauri_plugin_notification::init()) // Temporarily disabled due to macOS crash
        .setup(|app| {
            // Store a handle to the main window for access throughout the app
            let main_window = app
                .get_webview_window("main")
                .expect("Failed to get main window");

            // Create tray menu with only Quit option
            let tray_menu = MenuBuilder::new(app)
                .item(&MenuItemBuilder::new("Quit").id("quit").build(app)?)
                .build()?;

            println!("Created menu");

            // Create tray icon with explicitly set icon path
            let mut icon_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("icons")
                .join("32x32.png");

            println!("Using icon at path: {:?}", icon_path);

            // Verify the file exists
            if !icon_path.exists() {
                println!("Warning: Icon file not found at {:?}", icon_path);
                // Try alternative path
                let alt_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                    .join("icons")
                    .join("icon.png");
                if alt_path.exists() {
                    println!("Using alternative icon at {:?}", alt_path);
                    icon_path = alt_path;
                } else {
                    println!("Warning: Alternative icon not found at {:?}", alt_path);
                }
            }

            // Load the image using the image crate
            let img = image::open(&icon_path).expect("Failed to load icon");
            let rgba_img = img.to_rgba8();
            let dimensions = rgba_img.dimensions();
            let icon_image = Image::new_owned(rgba_img.into_raw(), dimensions.0, dimensions.1);

            // Clone window handle for use in closures
            let window_handle = main_window.clone();

            let _tray_icon = TrayIconBuilder::new()
                .icon(icon_image)
                .tooltip("Radar - Network Scanner")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(move |_, event| {
                    // Only handle left button down events (not up events)
                    if let tauri::tray::TrayIconEvent::Click {
                        button,
                        button_state,
                        ..
                    } = event
                    {
                        // Match directly on the values using debug format
                        if format!("{:?}", button) == "Left"
                            && format!("{:?}", button_state) == "Down"
                        {
                            // Use the cloned window handle directly
                            match window_handle.is_visible() {
                                Ok(visible) => {
                                    if visible {
                                        let _ = window_handle.hide();
                                    } else {
                                        // Force window to remain visible
                                        let _ = window_handle.show();
                                        let _ = window_handle.set_always_on_top(true);
                                        let _ = window_handle.set_focus();

                                        // Reset always-on-top after a short delay
                                        let win_clone = window_handle.clone();
                                        std::thread::spawn(move || {
                                            std::thread::sleep(std::time::Duration::from_millis(
                                                500,
                                            ));
                                            let _ = win_clone.set_always_on_top(false);
                                        });
                                    }
                                }
                                Err(_) => {}
                            }
                        }
                    }
                })
                .build(app)?;

            // Show the window on startup instead of hiding it
            main_window.show().unwrap();

            #[cfg(target_os = "macos")]
            {
                main_window.set_title("Radar").unwrap();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Use commands from the commands module
            radar_lib::commands::get_public_network_info,
            // Network scanning commands
            radar_lib::commands::run_network_scan,
            radar_lib::commands::stop_network_scan,
            // Removed get_new_services as it's not used by the UI
            radar_lib::commands::discover_mdns_streaming,
            radar_lib::commands::discover_upnp_streaming,
            // Logging commands - only in debug builds
            #[cfg(debug_assertions)]
            radar_lib::commands::set_network_logging,
            #[cfg(debug_assertions)]
            radar_lib::commands::is_network_logging_enabled,
            #[cfg(debug_assertions)]
            radar_lib::commands::set_logging,
            #[cfg(debug_assertions)]
            radar_lib::commands::is_logging_enabled,
            // Command logging filter commands - only with specific feature
            #[cfg(feature = "command_logging")]
            radar_lib::commands::set_command_logging_filter,
            #[cfg(feature = "command_logging")]
            radar_lib::commands::get_command_logging_filter,
            radar_lib::commands::get_macos_version,
            radar_lib::commands::get_discovered_services,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    Ok(())
}
