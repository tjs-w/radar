use serde::{Deserialize, Serialize};
use std::net::IpAddr;
use thiserror::Error;
use default_net::{self, Gateway};
use std::process::Command;
use reqwest;
use crate::radar_info;

// Error types specific to router discovery
#[derive(Error, Debug)]
pub enum RouterError {
    #[error("Failed to discover gateway: {0}")]
    GatewayDiscoveryError(String),
    
    #[error("Failed to communicate with router: {0}")]
    #[allow(dead_code)]
    RouterCommunicationError(String),
    
    #[error("Failed to parse router response: {0}")]
    #[allow(dead_code)]
    RouterResponseError(String),
    
    #[error("UPnP error: {0}")]
    #[allow(dead_code)]
    UPnPError(String),
    
    #[error("HTTP client error: {0}")]
    HttpClientError(#[from] reqwest::Error),
    
    #[error("Timeout error")]
    #[allow(dead_code)]
    TimeoutError,
    
    #[error("Network interface error: {0}")]
    NetworkInterfaceError(String),
    
    #[error("No router found")]
    #[allow(dead_code)]
    NoRouterFound,
}

// Result type alias using our custom error
type Result<T> = std::result::Result<T, RouterError>;

// Router information structure
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct RouterInfo {
    pub gateway_ip: Option<String>,
    pub mac_address: Option<String>,
    pub manufacturer: Option<String>,
    pub model: Option<String>,
    pub dns_servers: Vec<String>,
    pub public_ip: Option<String>,
    pub upnp_enabled: Option<bool>,
    pub firmware_version: Option<String>,
    pub isp_config: Option<IspConfig>,
    pub connected_interfaces: Vec<NetworkInterface>,
}

// ISP configuration
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct IspConfig {
    pub isp_name: Option<String>,
    pub connection_type: Option<String>,
    pub ipv4: Option<String>,
    pub ipv6: Option<String>,
    pub dns_servers: Vec<String>,
    pub hostname: Option<String>,
    pub uptime: Option<u64>,
}

// Network interface information
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct NetworkInterface {
    pub name: String,
    pub ip_address: String,
    pub mac_address: Option<String>,
    pub is_default: bool,
    pub interface_type: Option<String>,
}

// Discover local gateway information
pub async fn discover_gateway() -> Result<RouterInfo> {
    radar_info!("Starting gateway discovery...");
    let mut router_info = RouterInfo::default();
    
    // Try multiple methods to discover the gateway
    let gateway_result = discover_gateway_via_default_net().await;
    
    if let Ok(gateway) = gateway_result {
        radar_info!("Gateway discovered: {}", gateway.ip_addr);
        router_info.gateway_ip = Some(gateway.ip_addr.to_string());
        // For MacAddr, we need to convert it directly to a string
        router_info.mac_address = Some(gateway.mac_addr.to_string());
        
        // Try to get network interfaces
        match get_network_interfaces().await {
            Ok(interfaces) => {
                radar_info!("Found {} network interfaces", interfaces.len());
                router_info.connected_interfaces = interfaces.clone();
            },
            Err(e) => {
                radar_info!("Error getting network interfaces: {}", e);
            }
        }
        
        // Try to get DNS servers
        match get_dns_servers().await {
            Ok(dns_servers) => {
                radar_info!("Found {} DNS servers", dns_servers.len());
                router_info.dns_servers = dns_servers.clone();
            },
            Err(e) => {
                radar_info!("Error getting DNS servers: {}", e);
            }
        }
        
        // Try to get ISP configuration
        match get_isp_config(gateway.ip_addr).await {
            Ok(isp_config) => {
                radar_info!("Successfully retrieved ISP configuration");
                
                // Copy public IP from ISP config to router info for convenience
                if router_info.public_ip.is_none() {
                    if let Some(ipv4) = &isp_config.ipv4 {
                        radar_info!("Setting public IP to: {}", ipv4);
                        router_info.public_ip = Some(ipv4.clone());
                    }
                }
                
                // Store the ISP config
                router_info.isp_config = Some(isp_config);
            },
            Err(e) => {
                radar_info!("Error getting ISP config: {}", e);
            }
        }
        
        radar_info!("Router discovery completed successfully");
        Ok(router_info)
    } else {
        let err = gateway_result.err().unwrap();
        radar_info!("Failed to discover gateway: {}", err);
        Err(err)
    }
}

// Discover gateway using default-net
async fn discover_gateway_via_default_net() -> Result<Gateway> {
    radar_info!("Attempting to discover gateway via default-net...");
    
    match default_net::get_default_gateway() {
        Ok(gateway) => {
            radar_info!("Gateway found: {} (MAC: {})", gateway.ip_addr, gateway.mac_addr);
            Ok(gateway)
        },
        Err(e) => {
            radar_info!("Failed to get default gateway: {}", e);
            Err(RouterError::GatewayDiscoveryError(e.to_string()))
        }
    }
}

// Get network interfaces
async fn get_network_interfaces() -> Result<Vec<NetworkInterface>> {
    radar_info!("Getting network interfaces...");
    
    // Try to get the default interface first
    let default_interface = match default_net::get_default_interface() {
        Ok(interface) => {
            radar_info!("Default interface: {}", interface.name);
            Some(interface)
        },
        Err(e) => {
            radar_info!("Failed to get default interface: {}", e);
            None
        }
    };
    
    // Get all interfaces
    match get_if_addrs::get_if_addrs() {
        Ok(if_addrs) => {
            radar_info!("Found {} total interfaces", if_addrs.len());
            
            let mut interfaces = Vec::new();
            
            for if_addr in if_addrs {
                let ip_addr = if_addr.ip().to_string();
                
                // Skip loopback interfaces
                if if_addr.is_loopback() {
                    continue;
                }
                
                radar_info!("Interface: {} ({})", if_addr.name, ip_addr);
                
                let is_default = match &default_interface {
                    Some(def_if) => def_if.name == if_addr.name,
                    None => false
                };
                
                // Determine interface type based on name pattern
                let interface_type = if if_addr.name.starts_with("en") {
                    Some("Ethernet".to_string())
                } else if if_addr.name.starts_with("wl") {
                    Some("WiFi".to_string())
                } else {
                    None
                };
                
                interfaces.push(NetworkInterface {
                    name: if_addr.name.clone(),
                    ip_address: ip_addr,
                    mac_address: None, // We don't have MAC address from get_if_addrs
                    is_default,
                    interface_type,
                });
            }
            
            radar_info!("Returning {} non-loopback interfaces", interfaces.len());
            Ok(interfaces)
        },
        Err(e) => {
            radar_info!("Error getting network interfaces: {}", e);
            Err(RouterError::NetworkInterfaceError(e.to_string()))
        }
    }
}

// Get DNS servers
async fn get_dns_servers() -> Result<Vec<String>> {
    radar_info!("Getting DNS servers using dns-lookup crate...");
    
    let mut dns_servers = Vec::new();
    
    // On Unix-like systems (macOS, Linux), read /etc/resolv.conf
    #[cfg(unix)]
    {
        match std::fs::read_to_string("/etc/resolv.conf") {
            Ok(contents) => {
                for line in contents.lines() {
                    if line.starts_with("nameserver") {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if parts.len() >= 2 {
                            radar_info!("Found DNS server in resolv.conf: {}", parts[1]);
                            dns_servers.push(parts[1].to_string());
                        }
                    }
                }
            },
            Err(e) => radar_info!("Error reading resolv.conf: {}", e),
        }
    }
    
    // On macOS, can also use scutil
    #[cfg(target_os = "macos")]
    if dns_servers.is_empty() {
        match Command::new("scutil")
            .args(["--dns"])
            .output() {
                Ok(output) => {
                    if let Ok(output_str) = String::from_utf8(output.stdout) {
                        for line in output_str.lines() {
                            if line.trim().starts_with("nameserver[") {
                                if let Some(server) = line.split_whitespace().last() {
                                    radar_info!("Found DNS server via scutil: {}", server);
                                    dns_servers.push(server.to_string());
                                }
                            }
                        }
                    }
                },
                Err(e) => radar_info!("Error running scutil: {}", e),
            }
    }
    
    // On Windows, use ipconfig /all
    #[cfg(target_os = "windows")]
    if dns_servers.is_empty() {
        match Command::new("ipconfig")
            .args(["/all"])
            .output() {
                Ok(output) => {
                    if let Ok(output_str) = String::from_utf8(output.stdout) {
                        for line in output_str.lines() {
                            if line.contains("DNS Servers") {
                                if let Some(server) = line.split(':').last() {
                                    let server = server.trim();
                                    if !server.is_empty() {
                                        radar_info!("Found DNS server via ipconfig: {}", server);
                                        dns_servers.push(server.to_string());
                                    }
                                }
                            }
                        }
                    }
                },
                Err(e) => radar_info!("Error running ipconfig: {}", e),
            }
    }
    
    radar_info!("Returning {} DNS servers", dns_servers.len());
    
    // If no DNS servers were found, use fallback public DNS servers
    if dns_servers.is_empty() {
        radar_info!("No DNS servers found, using fallback servers");
        dns_servers.push("8.8.8.8".to_string());  // Google DNS
        dns_servers.push("1.1.1.1".to_string());  // Cloudflare DNS
    }
    
    Ok(dns_servers)
}

// Get ISP configuration
async fn get_isp_config(_gateway_ip: IpAddr) -> Result<IspConfig> {
    radar_info!("Getting ISP configuration (local only)...");
    
    let mut isp_config = IspConfig::default();
    
    // Get hostname from local system
    if let Ok(output) = Command::new("hostname").output() {
        if let Ok(hostname) = String::from_utf8(output.stdout) {
            let hostname = hostname.trim().to_string();
            radar_info!("Local hostname: {}", hostname);
            isp_config.hostname = Some(hostname);
        }
    }
    
    // Get connection type by checking interfaces
    if let Ok(interfaces) = get_if_addrs::get_if_addrs() {
        for interface in interfaces {
            if !interface.is_loopback() {
                let name = interface.name.to_lowercase();
                if name.starts_with("en") {
                    isp_config.connection_type = Some("Ethernet".to_string());
                    break;
                } else if name.starts_with("wl") {
                    isp_config.connection_type = Some("WiFi".to_string());
                    break;
                }
            }
        }
    }
    
    // Get uptime
    if let Ok(output) = Command::new("uptime").output() {
        if let Ok(uptime_str) = String::from_utf8(output.stdout) {
            // Extract uptime in seconds (rough estimate)
            // Format varies by OS, this is a simple approximation
            if let Some(days) = uptime_str.split("up").nth(1).and_then(|s| s.split("days").next()) {
                if let Ok(days_num) = days.trim().parse::<u64>() {
                    isp_config.uptime = Some(days_num * 24 * 60 * 60); // days to seconds
                }
            }
        }
    }
    
    radar_info!("ISP configuration retrieval completed (local only)");
    Ok(isp_config)
}

// Get router and ISP information (public function)
pub async fn get_router_and_isp_info() -> Result<RouterInfo> {
    radar_info!("get_router_and_isp_info called");
    discover_gateway().await
} 