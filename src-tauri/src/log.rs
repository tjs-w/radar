use log::{LevelFilter, Log, Metadata, Record};
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::collections::HashSet;
use std::io::{self, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

// Global flag to control logging
pub static ENABLE_LOGGING: Lazy<AtomicBool> = Lazy::new(|| AtomicBool::new(false));

// Collection of suppressed error patterns
pub static SUPPRESSED_PATTERNS: Lazy<Mutex<Vec<String>>> = Lazy::new(|| {
    let mut patterns = Vec::new();
    // Add default patterns to suppress
    patterns.push("Failed to send SearchStarted".to_string());
    patterns.push("sending on a closed channel".to_string());
    Mutex::new(patterns)
});

// Collection of explicitly enabled modules
pub static ENABLED_MODULES: Lazy<Mutex<HashSet<String>>> = Lazy::new(|| Mutex::new(HashSet::new()));

// Helper function to check if module is enabled
pub fn is_module_enabled(module_path: &str) -> bool {
    // Global enable flag takes precedence
    if is_logging_enabled() {
        // Only log module status once per module
        static LOGGED_MODULES: Lazy<Mutex<HashSet<String>>> =
            Lazy::new(|| Mutex::new(HashSet::new()));
        let mut logged = LOGGED_MODULES.lock().unwrap();
        if !logged.contains(module_path) {
            println!(
                "LOG DEBUG: Module '{}' enabled due to global flag",
                module_path
            );
            logged.insert(module_path.to_string());
        }
        return true;
    }

    // Check if module is explicitly enabled
    let enabled_modules = ENABLED_MODULES.lock().unwrap();
    if enabled_modules.contains(module_path) {
        // Only log explicitly enabled modules once
        static LOGGED_EXPLICIT_MODULES: Lazy<Mutex<HashSet<String>>> =
            Lazy::new(|| Mutex::new(HashSet::new()));
        let mut logged = LOGGED_EXPLICIT_MODULES.lock().unwrap();
        if !logged.contains(module_path) {
            println!("LOG DEBUG: Module '{}' explicitly enabled", module_path);
            logged.insert(module_path.to_string());
        }
        return true;
    }

    // Check module-specific feature flags with runtime cfg! macro
    let enabled = (cfg!(feature = "log_commands") && module_path.contains("commands")) ||
        (cfg!(feature = "log_network_scanner") && module_path.contains("network_scanner")) ||
        (cfg!(feature = "log_public_network") && module_path.contains("public_network")) ||
        // New module-based features
        (cfg!(feature = "log_enable_mod_mdns_sd") && module_path.contains("mdns_sd")) ||
        (cfg!(feature = "log_enable_mod_upnp") && module_path.contains("upnp")) ||
        (cfg!(feature = "log_enable_mod_service_daemon") && module_path.contains("service_daemon"));

    if enabled {
        // Only log feature-enabled modules once
        static LOGGED_FEATURE_MODULES: Lazy<Mutex<HashSet<String>>> =
            Lazy::new(|| Mutex::new(HashSet::new()));
        let mut logged = LOGGED_FEATURE_MODULES.lock().unwrap();
        if !logged.contains(module_path) {
            println!(
                "LOG DEBUG: Module '{}' enabled by feature flag",
                module_path
            );
            logged.insert(module_path.to_string());
        }
    }
    enabled
}

// Helper function to check if a message should be suppressed
pub fn should_suppress_message(module_path: &str, message: &str) -> bool {
    // If module is enabled, check for suppression patterns
    if is_module_enabled(module_path) {
        let patterns = SUPPRESSED_PATTERNS.lock().unwrap();
        for pattern in patterns.iter() {
            if message.contains(pattern) {
                // Count suppressed messages instead of logging each one
                static SUPPRESSION_COUNTERS: Lazy<Mutex<HashMap<String, u32>>> =
                    Lazy::new(|| Mutex::new(HashMap::new()));
                let mut counters = SUPPRESSION_COUNTERS.lock().unwrap();
                let counter = counters
                    .entry(format!("{}:{}", module_path, pattern))
                    .or_insert(0);
                *counter += 1;

                // Only log every 100 suppressed messages
                if *counter == 1 || *counter % 100 == 0 {
                    println!(
                        "LOG DEBUG: Suppressed {} messages from '{}' with pattern '{}'",
                        *counter, module_path, pattern
                    );
                }
                return true;
            }
        }
        return false;
    } else {
        // Module is not enabled, so suppress the message
        // Don't log each time, it's too noisy
        static DISABLED_MODULE_COUNTERS: Lazy<Mutex<HashMap<String, u32>>> =
            Lazy::new(|| Mutex::new(HashMap::new()));
        let mut counters = DISABLED_MODULE_COUNTERS.lock().unwrap();
        let counter = counters.entry(module_path.to_string()).or_insert(0);
        *counter += 1;

        // Only log every 100 suppressed messages
        if *counter == 1 || *counter % 100 == 0 {
            println!(
                "LOG DEBUG: Suppressed {} messages from disabled module '{}'",
                *counter, module_path
            );
        }
        return true;
    }
}

// Helper macro to check if module should be logged
// Uses runtime cfg! macros instead of compile-time #[cfg]
#[macro_export]
macro_rules! should_log_module {
    () => {{
        $crate::log::is_module_enabled(module_path!())
    }};
}

/// Log an error message - always shown regardless of settings
#[macro_export]
macro_rules! radar_error {
    ($($arg:tt)*) => {
        // Format the message first to check if it should be suppressed
        let msg = format!($($arg)*);
        if !$crate::log::should_suppress_message(module_path!(), &msg) {
            ::log::error!("{}", msg);
        }
    }
}

/// Log a warning message - shown only from enabled modules or with global logging
#[macro_export]
macro_rules! radar_warn {
    ($($arg:tt)*) => {
        if $crate::should_log_module!() {
            let msg = format!($($arg)*);
            if !$crate::log::should_suppress_message(module_path!(), &msg) {
                ::log::warn!("{}", msg);
            }
        }
    }
}

/// Log an info message - shown only from enabled modules or with global logging
#[macro_export]
macro_rules! radar_info {
    ($($arg:tt)*) => {
        if $crate::should_log_module!() {
            let msg = format!($($arg)*);
            if !$crate::log::should_suppress_message(module_path!(), &msg) {
                ::log::info!("{}", msg);
            }
        }
    }
}

/// Log a debug message - shown only from enabled modules or with global logging
#[macro_export]
macro_rules! radar_debug {
    ($($arg:tt)*) => {
        if $crate::should_log_module!() {
            let msg = format!($($arg)*);
            if !$crate::log::should_suppress_message(module_path!(), &msg) {
                ::log::debug!("{}", msg);
            }
        }
    }
}

/// Log a trace message - shown only from enabled modules or with global logging
#[macro_export]
macro_rules! radar_trace {
    ($($arg:tt)*) => {
        if $crate::should_log_module!() {
            let msg = format!($($arg)*);
            if !$crate::log::should_suppress_message(module_path!(), &msg) {
                ::log::trace!("{}", msg);
            }
        }
    }
}

// Simple logger that doesn't do additional filtering - we do it in macros
struct SimpleLogger;

impl Log for SimpleLogger {
    fn enabled(&self, metadata: &Metadata) -> bool {
        metadata.level() <= log::Level::Info
    }

    fn log(&self, record: &Record) {
        if self.enabled(record.metadata()) {
            let message = format!("{}", record.args());
            let module_path = record.metadata().target();

            // Skip suppressed messages
            if should_suppress_message(module_path, &message) {
                return;
            }

            let mut stderr = io::stderr();
            writeln!(
                stderr,
                "{} - [{}] {}",
                record.level(),
                module_path,
                record.args()
            )
            .ok();
        }
    }

    fn flush(&self) {}
}

// Initialize our custom logger
pub fn init_logger() {
    log::set_boxed_logger(Box::new(SimpleLogger))
        .map(|()| log::set_max_level(LevelFilter::Info))
        .expect("Failed to initialize logger");
}

// Used from main.rs when the all_logging feature is enabled
// and from set_network_logging command
#[allow(dead_code)]
pub fn set_logging(enable: bool) -> bool {
    ENABLE_LOGGING.store(enable, Ordering::Relaxed);
    enable
}

// Used from is_network_logging_enabled command
#[allow(dead_code)]
pub fn is_logging_enabled() -> bool {
    ENABLE_LOGGING.load(Ordering::Relaxed)
}

// Add a module to the explicitly enabled list
#[allow(dead_code)]
pub fn enable_module(module_name: &str) {
    let mut enabled_modules = ENABLED_MODULES.lock().unwrap();
    enabled_modules.insert(module_name.to_string());
}

// Remove a module from the explicitly enabled list
#[allow(dead_code)]
pub fn disable_module(module_name: &str) {
    let mut enabled_modules = ENABLED_MODULES.lock().unwrap();
    enabled_modules.remove(module_name);
}

// Add a pattern to the suppression list
#[allow(dead_code)]
pub fn add_suppression_pattern(pattern: &str) {
    let mut patterns = SUPPRESSED_PATTERNS.lock().unwrap();
    patterns.push(pattern.to_string());
}

// Remove a pattern from the suppression list
#[allow(dead_code)]
pub fn remove_suppression_pattern(pattern: &str) {
    let mut patterns = SUPPRESSED_PATTERNS.lock().unwrap();
    patterns.retain(|p| p != pattern);
}

// Clear all suppression patterns
#[allow(dead_code)]
pub fn clear_suppression_patterns() {
    let mut patterns = SUPPRESSED_PATTERNS.lock().unwrap();
    patterns.clear();
}
