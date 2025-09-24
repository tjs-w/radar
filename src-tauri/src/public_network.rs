use reqwest;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::net::UdpSocket;
use std::process::Command;
use thiserror::Error;
use tauri::Manager;
use crate::router_discovery::{get_router_and_isp_info, RouterInfo};
use dns_lookup;
use rand;
use default_net::get_default_gateway;
use crate::radar_error;
use crate::radar_info;

// Function to enable or disable network logging (for backward compatibility)
pub fn set_network_logging(enable: bool) -> bool {
    // Just delegate to the main logging function
    crate::log::set_logging(enable)
}

pub fn is_network_logging_enabled() -> bool {
    // Just delegate to the main logging function
    crate::log::is_logging_enabled()
}

#[derive(Error, Debug)]
pub enum NetworkError {
    #[error("Network request failed: {0}")]
    RequestFailed(String),
    
    #[error("HTTP client error: {0}")]
    HttpClientError(#[from] reqwest::Error),
    
    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),
    
    #[error("Router error: {0}")]
    RouterError(#[from] crate::router_discovery::RouterError),
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

// Result type alias using our custom error
type Result<T> = std::result::Result<T, NetworkError>;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct GeoLocation {
    pub city: Option<String>,
    pub region: Option<String>,
    pub country: Option<String>,
    pub postal: Option<String>,
    pub timezone: Option<String>,
    pub coordinates: Option<(f64, f64)>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct PublicNetworkInfo {
    pub ip: Option<String>,
    pub ipv6: Option<String>,
    pub isp: Option<String>,
    pub asn: Option<String>,
    pub org: Option<String>,
    pub hostname: Option<String>,        // Public hostname (from reverse DNS of public IP)
    pub local_hostname: Option<String>,  // Local system hostname
    pub dns: Vec<String>,
    pub location: Option<GeoLocation>,
    pub router_info: Option<RouterInfo>,
    pub is_vpn: Option<bool>,
    pub is_proxy: Option<bool>,
    pub is_hosting: Option<bool>,
}

// Thread-safe state using Arc<Mutex<T>> as per guidelines
#[derive(Debug)]
pub struct PublicNetworkState {
    pub state: Arc<Mutex<PublicNetworkInfo>>
}

// Adding NetworkInfo struct from network_info.rs
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NetworkInfo {
    pub public_ip: Option<String>,
    pub hostname: Option<String>,
    pub internet_available: Option<bool>,
    pub isp: Option<String>,
    pub location: Option<GeoLocation>,
    pub dns_servers: Vec<String>,
}

// Get geolocation information for an IP address using Team Cymru's DNS service
pub async fn get_geo_info(ip: &str) -> Option<String> {
    // Reverse IP for DNS lookup
    let reversed_ip: String = ip
        .split('.')
        .rev()
        .collect::<Vec<&str>>()
        .join(".");

    // Query GeoIP DNS service
    let query = format!("{}.origin.asn.cymru.com", reversed_ip);

    // Use TokioAsyncResolver with the system configuration to avoid runtime issues
    if let Ok(resolver) = trust_dns_resolver::TokioAsyncResolver::tokio_from_system_conf() {
        if let Ok(response) = resolver.txt_lookup(&query).await {
            for txt in response.iter() {
                if let Some(txt_data) = txt.iter().next() {
                    let geo_info = String::from_utf8_lossy(txt_data);
                    return Some(geo_info.to_string());
                }
            }
        }
    }
    
    None
}

// Modify get_public_network_info function to use the log helper
pub async fn get_public_network_info() -> std::result::Result<PublicNetworkInfo, String> {
    radar_info!("Starting get_public_network_info Tauri command");
    
    match get_public_network_info_internal().await {
        Ok(info) => Ok(info),
        Err(e) => {
            let error_message = format!("Failed to get public network info: {}", e);
            radar_error!("{}", error_message);
            Err(error_message)
        }
    }
}

// Internal function that does the actual work
pub async fn get_public_network_info_internal() -> Result<PublicNetworkInfo> {
    radar_info!("Starting get_public_network_info_internal() - Using parallel execution");
    let mut info = PublicNetworkInfo::default();
    
    // Create futures for different information fetching tasks
    let public_ip_future = get_public_ip_via_stun();
    let dns_servers_future = get_local_dns_servers();
    let router_info_future = get_router_and_isp_info();
    let local_hostname_future = get_local_hostname();
    
    // Try to get IP from default gateway first
    if let Ok(gateway) = get_default_gateway() {
        let gateway_ip = gateway.ip_addr.to_string();
        radar_info!("Default gateway found: {}", gateway_ip);
        
        // Get geolocation info from gateway IP
        if let Some(geo_info) = get_geo_info(&gateway_ip).await {
            radar_info!("Geolocation info from gateway IP: {}", geo_info);
            // Parse the geo info (format: "ASN | IP Range | Country | ISP | Date")
            let parts: Vec<&str> = geo_info.split('|').collect();
            if parts.len() >= 3 {
                let country = parts[2].trim();
                
                // Create a GeoLocation object with the country
                let mut location = GeoLocation::default();
                location.country = Some(country.to_string());
                info.location = Some(location);
                radar_info!("Setting initial location from gateway: country={}", country);
            }
        } else {
            radar_info!("No geolocation info found for gateway IP");
        }
    } else {
        radar_info!("Could not determine default gateway");
    }
    
    // Run the STUN IP fetch task first
    match public_ip_future.await {
        Ok(ip) => {
            info.ip = Some(ip.clone());
            radar_info!("Public IP from STUN: {}", ip);
            
            // Try to get hostname from IP for additional info (reverse DNS lookup)
            if let Ok(ip_addr) = ip.parse::<std::net::IpAddr>() {
                match dns_lookup::lookup_addr(&ip_addr) {
                    Ok(hostname) => {
                        info.hostname = Some(hostname.clone());
                        radar_info!("Hostname from reverse DNS: {}", hostname);
                        
                        // Try to extract ISP from hostname
                        if let Some(isp) = extract_isp_from_hostname(&hostname) {
                            info.isp = Some(isp.clone());
                            radar_info!("ISP extracted from hostname: {}", isp);
                        }
                        
                        // Try to extract organization from hostname
                        if let Some(org) = extract_org_from_hostname(&hostname) {
                            info.org = Some(org.clone());
                            radar_info!("Organization extracted from hostname: {}", org);
                        }
                    },
                    Err(e) => radar_info!("Reverse DNS lookup failed: {}", e),
                }
            }
            
            // Get ASN information using our new function
            if let Some(asn_info) = get_asn(&ip).await {
                // Parse the ASN info (format: "ASN | IP Range | Country | ISP | Date")
                let parts: Vec<&str> = asn_info.split('|').collect();
                if parts.len() >= 4 {
                    let asn = parts[0].trim();
                    let org = parts[3].trim();
                    
                    info.asn = Some(asn.to_string());
                    radar_info!("ASN from lookup: {}", asn);
                    
                    // If we don't have org info yet, use this
                    if info.org.is_none() {
                        info.org = Some(org.to_string());
                        radar_info!("Organization from ASN lookup: {}", org);
                    }
                    
                    // If we don't have ISP info yet, try to use org as ISP
                    if info.isp.is_none() {
                        info.isp = Some(org.to_string());
                        radar_info!("ISP inferred from ASN org: {}", org);
                    }
                    
                    // If we don't have location info yet, try to get it from the ASN info
                    if info.location.is_none() && parts.len() >= 3 {
                        let country = parts[2].trim();
                        
                        // Create a GeoLocation object with the country
                        let mut location = GeoLocation::default();
                        location.country = Some(country.to_string());
                        info.location = Some(location);
                        radar_info!("Location from ASN lookup: country={}", country);
                    }
                }
            } else {
                info.asn = Some("".to_string());
                radar_info!("No ASN info found, setting empty ASN");
            }
            
            // Get geolocation info if we don't have it yet
            if info.location.is_none() {
                if let Some(geo_info) = get_geo_info(&ip).await {
                    radar_info!("Additional geo info from IP: {}", geo_info);
                    // Parse the geo info (format: "ASN | IP Range | Country | ISP | Date")
                    let parts: Vec<&str> = geo_info.split('|').collect();
                    if parts.len() >= 3 {
                        let country = parts[2].trim();
                        
                        // Create a GeoLocation object with the country
                        let mut location = GeoLocation::default();
                        location.country = Some(country.to_string());
                        info.location = Some(location);
                        radar_info!("Setting country from geo API: {}", country);
                    }
                }
            }
        },
        Err(e) => {
            radar_info!("Failed to get public IP via STUN: {}", e);
        }
    }
    
    // Handle the remaining futures in parallel
    let (dns_result, router_result, hostname_result) = 
        tokio::join!(dns_servers_future, router_info_future, local_hostname_future);
    
    // Process DNS servers
    if let Ok(dns_servers) = dns_result {
        info.dns = dns_servers.clone();
        radar_info!("DNS servers found: {:?}", dns_servers);
    } else {
        radar_info!("Failed to get DNS servers");
    }
    
    // Process router info
    if let Ok(router_info) = router_result {
        radar_info!("Router info obtained: {:?}", router_info);
        
        // If we didn't get a public IP via STUN, try from router
        if info.ip.is_none() {
            if let Some(router_ip) = &router_info.public_ip {
                info.ip = Some(router_ip.clone());
                radar_info!("Setting public IP from router: {}", router_ip);
                
                // Try reverse DNS lookup on this IP too
                if let Ok(ip_addr) = router_ip.parse::<std::net::IpAddr>() {
                    if let Ok(hostname) = dns_lookup::lookup_addr(&ip_addr) {
                        info.hostname = Some(hostname.clone());
                        radar_info!("Hostname from router's IP reverse DNS: {}", hostname);
                    }
                }
                
                // Try ASN lookup on router's public IP if we don't have ASN info yet
                if info.asn.is_none() || info.asn == Some("".to_string()) {
                    if let Some(asn_info) = get_asn(router_ip).await {
                        // Parse the ASN info
                        let parts: Vec<&str> = asn_info.split('|').collect();
                        if parts.len() >= 4 {
                            let asn = parts[0].trim();
                            let org = parts[3].trim();
                            
                            info.asn = Some(asn.to_string());
                            radar_info!("ASN from router's IP: {}", asn);
                            
                            // If we don't have org info yet, use this
                            if info.org.is_none() {
                                info.org = Some(org.to_string());
                                radar_info!("Organization from router's IP ASN: {}", org);
                            }
                            
                            // If we don't have ISP info yet, try to use org as ISP
                            if info.isp.is_none() {
                                info.isp = Some(org.to_string());
                                radar_info!("ISP inferred from router's IP ASN: {}", org);
                            }
                        }
                    } else {
                        info.asn = Some("".to_string());
                        radar_info!("No ASN info for router's IP, setting empty ASN");
                    }
                }
            }
        }
        
        // Log gateway IP if available
        if let Some(gateway_ip) = &router_info.gateway_ip {
            radar_info!("Router gateway IP: {}", gateway_ip);
        }
        
        // Log manufacturer if available  
        if let Some(manufacturer) = &router_info.manufacturer {
            radar_info!("Router manufacturer: {}", manufacturer);
        }
        
        // Log model if available
        if let Some(model) = &router_info.model {
            radar_info!("Router model: {}", model);
        }
        
        // Log UPnP status
        radar_info!("UPnP enabled: {:?}", router_info.upnp_enabled);
        
        // If we didn't get ISP info yet, try from router's isp_config
        if info.isp.is_none() {
            if let Some(isp_config) = &router_info.isp_config {
                if let Some(isp_name) = &isp_config.isp_name {
                    info.isp = Some(isp_name.clone());
                    radar_info!("ISP from router's config: {}", isp_name);
                }
            }
        }
        
        info.router_info = Some(router_info);
        radar_info!("Stored router info in PublicNetworkInfo");
    } else {
        radar_info!("Failed to get router info");
    }
    
    // Process local hostname
    if let Ok(hostname) = hostname_result {
        info.local_hostname = Some(hostname.clone());
        radar_info!("Local hostname: {}", hostname);
    } else {
        radar_info!("Failed to get local hostname");
    }
    
    // If we still don't have ASN info, set an empty string
    if info.asn.is_none() {
        info.asn = Some("".to_string());
        radar_info!("No ASN info found from any source, setting empty ASN");
    }
    
    // Infer privacy status
    radar_info!("Inferring privacy status (VPN/proxy detection)");
    infer_privacy_status(&mut info);
    radar_info!("VPN detected: {:?}, Proxy detected: {:?}, Hosting detected: {:?}", 
                info.is_vpn, info.is_proxy, info.is_hosting);
    
    radar_info!("Returning complete PublicNetworkInfo: {:?}", info);
    Ok(info)
}

// Infer VPN/proxy/hosting status from available information
fn infer_privacy_status(info: &mut PublicNetworkInfo) {
    // Check for known VPN hostnames
    if let Some(hostname) = &info.hostname {
        let hostname_lower = hostname.to_lowercase();
        
        // Look for VPN provider patterns in hostname
        let vpn_patterns = ["vpn", "proxy", "tor", "exit", "node", "relay", "tunnel"];
        let is_vpn = vpn_patterns.iter().any(|&pattern| hostname_lower.contains(pattern));
        
        if is_vpn {
            info.is_vpn = Some(true);
            info.is_proxy = Some(true);
        }
        
        // Look for hosting providers in hostname
        let hosting_patterns = ["aws", "amazon", "azure", "google", "cloud", "host", "server", "cdn", "vps"];
        let is_hosting = hosting_patterns.iter().any(|&pattern| hostname_lower.contains(pattern));
        
        if is_hosting {
            info.is_hosting = Some(true);
        }
    }
    
    // Check for known VPN autonomous systems
    if let Some(asn) = &info.asn {
        let asn_lower = asn.to_lowercase();
        
        // Known VPN ASNs
        let vpn_asns = ["as60068", "as16276", "as51852", "as14618"];
        let is_vpn_asn = vpn_asns.iter().any(|&pattern| asn_lower.contains(pattern));
        
        if is_vpn_asn {
            info.is_vpn = Some(true);
            info.is_proxy = Some(true);
        }
    }
    
    // If we haven't set these flags yet, default to false
    if info.is_vpn.is_none() {
        info.is_vpn = Some(false);
    }
    if info.is_proxy.is_none() {
        info.is_proxy = Some(false);
    }
    if info.is_hosting.is_none() {
        info.is_hosting = Some(false);
    }
}

// Extract organization name from hostname
fn extract_org_from_hostname(hostname: &str) -> Option<String> {
    // Example: if hostname is "ec2-52-85-76-55.compute-1.amazonaws.com"
    // We can extract "amazonaws.com" or "compute-1.amazonaws.com"
    
    let parts: Vec<&str> = hostname.split('.').collect();
    if parts.len() >= 2 {
        // Try to extract domain
        let domain_parts = &parts[parts.len() - 2..];
        let domain = domain_parts.join(".");
        
        // Common ISP domains to recognize
        match domain.as_str() {
            "comcast.net" => return Some("Comcast".to_string()),
            "rr.com" => return Some("Spectrum".to_string()),
            "amazonaws.com" => return Some("Amazon Web Services".to_string()),
            "googlefiber.net" => return Some("Google Fiber".to_string()),
            "verizon.net" => return Some("Verizon".to_string()),
            "att.net" => return Some("AT&T".to_string()),
            "cox.net" => return Some("Cox Communications".to_string()),
            "charter.com" => return Some("Charter Communications".to_string()),
            "centurylink.net" => return Some("CenturyLink".to_string()),
            "frontiernet.net" => return Some("Frontier Communications".to_string()),
            _ => {}
        }
        
        // If it's a longer domain with a subdomain, try to extract more info
        if parts.len() >= 3 {
            let subdomain = parts[parts.len() - 3];
            
            // Special cases for well-known providers
            if domain == "amazonaws.com" && (subdomain.contains("compute") || subdomain.contains("ec2")) {
                return Some("Amazon AWS EC2".to_string());
            }
            
            if domain == "googleusercontent.com" {
                return Some("Google Cloud".to_string());
            }
            
            if domain == "azure.com" || domain.ends_with(".azure.com") {
                return Some("Microsoft Azure".to_string());
            }
        }
        
        // If no special case matched, return the domain
        return Some(domain);
    }
    
    None
}

// Extract ISP name from hostname
fn extract_isp_from_hostname(hostname: &str) -> Option<String> {
    // Common ISP hostname patterns
    let isp_patterns = [
        ("comcast", "Comcast"),
        ("xfinity", "Comcast Xfinity"),
        ("verizon", "Verizon"),
        ("fios", "Verizon FiOS"),
        ("att", "AT&T"),
        ("spectrum", "Spectrum"),
        ("charter", "Charter Communications"),
        ("cox", "Cox Communications"),
        ("centurylink", "CenturyLink"),
        ("frontier", "Frontier Communications"),
        ("windstream", "Windstream"),
        ("suddenlink", "Suddenlink"),
        ("optimum", "Optimum"),
        ("mediacom", "Mediacom"),
        ("wow", "WOW! Internet"),
        ("rcn", "RCN"),
        ("hughesnet", "HughesNet"),
        ("starlink", "Starlink"),
        ("viasat", "Viasat"),
        ("tmobile", "T-Mobile"),
        ("sprint", "Sprint"),
        ("boost", "Boost Mobile"),
        ("cricket", "Cricket Wireless"),
        ("metropcs", "Metro by T-Mobile"),
    ];
    
    let hostname_lower = hostname.to_lowercase();
    
    for (pattern, isp_name) in isp_patterns.iter() {
        if hostname_lower.contains(pattern) {
            return Some((*isp_name).to_string());
        }
    }
    
    None
}

// Get ASN information for an IP address using Team Cymru's DNS service
pub async fn get_asn(ip: &str) -> Option<String> {
    // Reverse IP for ASN lookup
    let reversed_ip: String = ip
        .split('.')
        .rev()
        .collect::<Vec<&str>>()
        .join(".");

    // DNS Query to ASN database
    let query = format!("{}.origin.asn.cymru.com.", reversed_ip);

    // Use TokioAsyncResolver with the system configuration to avoid runtime issues
    if let Ok(resolver) = trust_dns_resolver::TokioAsyncResolver::tokio_from_system_conf() {
        if let Ok(response) = resolver.txt_lookup(&query).await {
            for txt in response.iter() {
                if let Some(txt_data) = txt.iter().next() {
                    let asn_info = String::from_utf8_lossy(txt_data);
                    return Some(asn_info.to_string());
                }
            }
        }
    }
    
    None
}

// Add #[allow(dead_code)] to unused functions
#[allow(dead_code)]
async fn get_info_via_snmp() -> Option<PublicNetworkInfo> {
    radar_info!("Attempting to get network info via SNMP");
    
    // This would be a real SNMP implementation
    // For now, we just return None since most home routers don't support SNMP
    // or have it disabled by default
    
    // A proper implementation would:
    // 1. Find the default gateway IP
    // 2. Try to connect to it using SNMP with common community strings
    // 3. Query router OIDs to get ISP and network information
    
    None
}

// Add #[allow(dead_code)] to unused functions
#[allow(dead_code)]
fn infer_location_from_hostname(hostname: &str) -> Option<GeoLocation> {
    radar_info!("Attempting to infer location from hostname: {}", hostname);
    
    // Extract location from hostname patterns like:
    // - city names: dfw, nyc, sfo, lax, etc.
    // - region codes: tx, ca, ny, etc.
    // - airport codes: dfw, jfk, sfo, etc.
    
    let hostname_lower = hostname.to_lowercase();
    
    // Check for common city abbreviations in hostname
    let city_codes = [
        ("dfw", "Dallas", "Texas", "US"),
        ("nyc", "New York City", "New York", "US"),
        ("sfo", "San Francisco", "California", "US"),
        ("lax", "Los Angeles", "California", "US"),
        ("chi", "Chicago", "Illinois", "US"),
        ("atl", "Atlanta", "Georgia", "US"),
        ("sea", "Seattle", "Washington", "US"),
        ("bos", "Boston", "Massachusetts", "US"),
        ("iad", "Washington", "DC", "US"),
        ("den", "Denver", "Colorado", "US"),
        ("lon", "London", "", "UK"),
        ("fra", "Frankfurt", "", "Germany"),
        ("ams", "Amsterdam", "", "Netherlands"),
        ("par", "Paris", "", "France"),
        ("syd", "Sydney", "", "Australia"),
        ("sin", "Singapore", "", "Singapore"),
        ("hkg", "Hong Kong", "", "China"),
        ("nrt", "Tokyo", "", "Japan"),
    ];
    
    for (code, city, region, country) in city_codes.iter() {
        if hostname_lower.contains(code) {
            let mut location = GeoLocation::default();
            location.city = Some(city.to_string());
            
            if !region.is_empty() {
                location.region = Some(region.to_string());
            }
            
            location.country = Some(country.to_string());
            
            // We don't have exact coordinates, so we'll leave them as None
            
            return Some(location);
        }
    }
    
    // If the hostname contains a full city name, try to match that
    let city_names = [
        ("dallas", "Dallas", "Texas", "US"),
        ("newyork", "New York City", "New York", "US"),
        ("francisco", "San Francisco", "California", "US"),
        ("angeles", "Los Angeles", "California", "US"),
        ("chicago", "Chicago", "Illinois", "US"),
        ("atlanta", "Atlanta", "Georgia", "US"),
        ("seattle", "Seattle", "Washington", "US"),
        ("boston", "Boston", "Massachusetts", "US"),
        ("washington", "Washington", "DC", "US"),
        ("denver", "Denver", "Colorado", "US"),
        ("london", "London", "", "UK"),
        ("frankfurt", "Frankfurt", "", "Germany"),
        ("amsterdam", "Amsterdam", "", "Netherlands"),
        ("paris", "Paris", "", "France"),
        ("sydney", "Sydney", "", "Australia"),
        ("singapore", "Singapore", "", "Singapore"),
        ("hongkong", "Hong Kong", "", "China"),
        ("tokyo", "Tokyo", "", "Japan"),
    ];
    
    for (name, city, region, country) in city_names.iter() {
        if hostname_lower.contains(name) {
            let mut location = GeoLocation::default();
            location.city = Some(city.to_string());
            
            if !region.is_empty() {
                location.region = Some(region.to_string());
            }
            
            location.country = Some(country.to_string());
            
            return Some(location);
        }
    }
    
    None
}

// Add #[allow(dead_code)] to unused functions
#[allow(dead_code)]
fn infer_location_from_asn(asn: &str) -> Option<GeoLocation> {
    radar_info!("Attempting to infer location from ASN: {}", asn);
    
    // This would use a local database of ASN to location mappings
    // For now, we'll just check some common ASNs
    
    let asn_locations = [
        ("AS7922", "United States"),  // Comcast
        ("AS701", "United States"),   // Verizon
        ("AS7018", "United States"),  // AT&T
        ("AS3356", "United States"),  // Level 3
        ("AS174", "United States"),   // Cogent
        ("AS2856", "United Kingdom"), // BT
        ("AS3320", "Germany"),        // Deutsche Telekom
        ("AS12322", "France"),        // Free
        ("AS4766", "South Korea"),    // Korea Telecom
        ("AS4134", "China"),          // China Telecom
    ];
    
    for (asn_code, country) in asn_locations.iter() {
        if asn.to_uppercase() == *asn_code {
            let mut location = GeoLocation::default();
            location.country = Some(country.to_string());
            return Some(location);
        }
    }
    
    None
}

// Get DNS servers from local system configuration
async fn get_local_dns_servers() -> Result<Vec<String>> {
    radar_info!("Getting DNS servers from local system");
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
    
    Ok(dns_servers)
}

// Modify get_public_ip_via_stun to use the log helper
async fn get_public_ip_via_stun() -> Result<String> {
    radar_info!("Starting STUN client to get public IP");
    
    // List of STUN servers to try, in order of preference
    let servers = [
        "stun.l.google.com:19302",
        "stun1.l.google.com:19302",
        "stun2.l.google.com:19302", 
        "stun.stunprotocol.org:3478",
        "stun.voip.blackberry.com:3478",
        "stun.sipgate.net:10000"
    ];
    
    // Try each server with a timeout
    for server in servers {
        radar_info!("Trying STUN server: {}", server);
        
        // Set up a timeout for this specific server
        let timeout = std::time::Duration::from_secs(3);
        
        match tokio::time::timeout(timeout, get_ip_from_stun_server(server)).await {
            Ok(result) => {
                match result {
                    Ok(ip) => {
                        radar_info!("Successfully obtained public IP from STUN server {}: {}", server, ip);
                        return Ok(ip);
                    },
                    Err(e) => {
                        radar_info!("Failed to get IP from STUN server {}: {}", server, e);
                        // Continue to next server
                    }
                }
            },
            Err(_) => {
                radar_info!("Timeout when connecting to STUN server: {}", server);
                // Continue to next server
            }
        }
    }
    
    // If all servers failed, try alternative method - fallback to an HTTP service
    radar_info!("All STUN servers failed, trying HTTP API fallback");
    
    // HTTP fallback with timeout
    let timeout = std::time::Duration::from_secs(5);
    match tokio::time::timeout(timeout, get_public_ip_via_http()).await {
        Ok(result) => {
            match result {
                Ok(ip) => {
                    radar_info!("Successfully obtained public IP from HTTP API: {}", ip);
                    return Ok(ip);
                },
                Err(e) => {
                    radar_info!("HTTP API fallback failed: {}", e);
                }
            }
        },
        Err(_) => {
            radar_info!("Timeout when connecting to HTTP API");
        }
    }
    
    // Return fallback placeholder or error
    radar_info!("CRITICAL: Could not determine public IP address from any source");
    Err(NetworkError::RequestFailed("Could not determine public IP address from any source".to_string()))
}

// Implements the STUN protocol to get the public IP from a given STUN server
async fn get_ip_from_stun_server(server: &str) -> Result<String> {
    radar_info!("Connecting to STUN server: {}", server);
    
    let socket = match UdpSocket::bind("0.0.0.0:0") {
        Ok(socket) => {
            radar_info!("Successfully bound UDP socket to 0.0.0.0:0");
            socket
        },
        Err(e) => {
            radar_info!("Failed to bind UDP socket: {}", e);
            return Err(NetworkError::IoError(e));
        }
    };
    
    // Set read timeout to prevent hanging
    if let Err(e) = socket.set_read_timeout(Some(std::time::Duration::from_secs(2))) {
        radar_info!("Failed to set socket read timeout: {}", e);
        return Err(NetworkError::IoError(e));
    }
    
    // Prepare STUN request (RFC 5389)
    // Message Type: 0x0001 (Binding Request)
    // Message Length: 0x0000 (no attributes)
    // Magic Cookie: 0x2112A442 (fixed value)
    // Transaction ID: 12 random bytes
    let mut request = vec![
        0x00, 0x01, // Message Type
        0x00, 0x00, // Message Length
        0x21, 0x12, 0xA4, 0x42, // Magic Cookie
    ];
    
    // Generate random Transaction ID (12 bytes)
    for _ in 0..12 {
        request.push(rand::random::<u8>());
    }
    
    radar_info!("STUN request prepared, connecting to server...");
    
    // Send request to STUN server
    match socket.connect(server) {
        Ok(_) => radar_info!("Connected to STUN server: {}", server),
        Err(e) => {
            radar_info!("Failed to connect to STUN server {}: {}", server, e);
            return Err(NetworkError::IoError(e));
        }
    }
    
    match socket.send(&request) {
        Ok(bytes_sent) => radar_info!("Sent {} bytes to STUN server", bytes_sent),
        Err(e) => {
            radar_info!("Failed to send request to STUN server: {}", e);
            return Err(NetworkError::IoError(e));
        }
    }
    
    radar_info!("Waiting for STUN response...");
    
    // Receive response
    let mut response = [0u8; 512];
    let size = match socket.recv(&mut response) {
        Ok(size) => {
            radar_info!("Received {} bytes from STUN server", size);
            size
        },
        Err(e) => {
            radar_info!("Failed to receive response from STUN server: {}", e);
            return Err(NetworkError::IoError(e));
        }
    };
    
    if size < 20 {
        radar_info!("Invalid STUN response size: {} (should be at least 20 bytes)", size);
        return Err(NetworkError::RequestFailed(format!("Invalid STUN response size: {}", size)));
    }
    
    // Check if response is a STUN Binding Response (type 0x0101)
    if response[0] != 0x01 || response[1] != 0x01 {
        radar_info!("Not a STUN Binding Response: got {:02x}{:02x} (expected 0101)", response[0], response[1]);
        return Err(NetworkError::RequestFailed("Not a STUN Binding Response".to_string()));
    }
    
    radar_info!("Received valid STUN Binding Response, parsing attributes...");
    
    // Parse the response to extract the mapped address
    // Skip the 20-byte header and look for the XOR-MAPPED-ADDRESS attribute (type 0x0020)
    let mut pos = 20;
    radar_info!("Parsing response of {} bytes, starting from position {}", size, pos);
    
    while pos + 8 <= size {
        let attr_type = ((response[pos] as u16) << 8) | (response[pos + 1] as u16);
        let attr_length = ((response[pos + 2] as u16) << 8) | (response[pos + 3] as u16);
        
        radar_info!("Found attribute type: 0x{:04x}, length: {}", attr_type, attr_length);
        
        // XOR-MAPPED-ADDRESS attribute (type 0x0020)
        if attr_type == 0x0020 && attr_length >= 8 {
            // Family: 0x01 for IPv4, 0x02 for IPv6
            let family = response[pos + 5];
            radar_info!("XOR-MAPPED-ADDRESS attribute found, family: {}", family);
            
            if family == 0x01 {  // IPv4
                // Port (XORed with the first 2 bytes of the Magic Cookie)
                // IP (XORed with the Magic Cookie)
                let xor_ip = [
                    response[pos + 8] ^ 0x21,
                    response[pos + 9] ^ 0x12,
                    response[pos + 10] ^ 0xA4,
                    response[pos + 11] ^ 0x42,
                ];
                
                let ip = format!("{}.{}.{}.{}", xor_ip[0], xor_ip[1], xor_ip[2], xor_ip[3]);
                radar_info!("Successfully extracted IPv4 address: {}", ip);
                return Ok(ip);
            } else if family == 0x02 {  // IPv6 (simplified handling)
                radar_info!("IPv6 address found but handling not implemented");
                return Err(NetworkError::RequestFailed("IPv6 handling not implemented".to_string()));
            } else {
                radar_info!("Unknown address family: {}", family);
            }
        }
        
        // Move to the next attribute (attributes are padded to 4-byte boundaries)
        let old_pos = pos;
        pos += 4 + attr_length as usize;
        if attr_length % 4 != 0 {
            pos += 4 - (attr_length % 4) as usize;
        }
        radar_info!("Moving from position {} to {}", old_pos, pos);
    }
    
    radar_info!("XOR-MAPPED-ADDRESS attribute not found in STUN response");
    Err(NetworkError::RequestFailed("Could not find XOR-MAPPED-ADDRESS in STUN response".to_string()))
}

// HTTP fallback method for getting public IP with improved logging
async fn get_public_ip_via_http() -> Result<String> {
    radar_info!("HTTP fallback for public IP is disabled - using local methods only");
    
    // Instead of using external services, try to get the IP from the router
    if let Ok(router_info) = get_router_and_isp_info().await {
        if let Some(public_ip) = router_info.public_ip {
            radar_info!("Got public IP from router: {}", public_ip);
            return Ok(public_ip);
        }
    }
    
    // If we can't get the IP from the router, return an error
    Err(NetworkError::RequestFailed("HTTP fallback is disabled and router did not provide public IP".to_string()))
}

// Get hostname from local system
async fn get_local_hostname() -> Result<String> {
    radar_info!("Getting hostname from local system");
    
    match Command::new("hostname").output() {
        Ok(output) => {
            if let Ok(hostname) = String::from_utf8(output.stdout) {
                let hostname = hostname.trim().to_string();
                if !hostname.is_empty() {
                    return Ok(hostname);
                }
            }
        },
        Err(e) => radar_info!("Error running hostname command: {}", e),
    }
    
    // Fallback to gethostname from libc on Unix systems
    #[cfg(unix)]
    {
        let mut buffer = [0u8; 256];
        let res = unsafe {
            libc::gethostname(buffer.as_mut_ptr() as *mut libc::c_char, buffer.len())
        };
        
        if res == 0 {
            // Find the first null byte
            let pos = buffer.iter().position(|&b| b == 0).unwrap_or(buffer.len());
            let hostname = std::str::from_utf8(&buffer[..pos]).unwrap_or("").to_string();
            if !hostname.is_empty() {
                return Ok(hostname);
            }
        }
    }
    
    Err(NetworkError::RequestFailed("Could not determine hostname".to_string()))
}

// Register commands with Tauri
pub fn init<R: tauri::Runtime>(app: &mut tauri::App<R>) -> std::result::Result<(), Box<dyn std::error::Error>> {
    // Use Arc<Mutex<T>> for thread-safe sharing
    app.manage(PublicNetworkState { state: Arc::new(Mutex::new(PublicNetworkInfo::default())) });
    
    Ok(())
} 