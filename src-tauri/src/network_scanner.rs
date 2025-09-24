use crate::{ConsolidatedService, NetworkService, DISCOVERED_SERVICES, CONSOLIDATED_SERVICES};
use std::collections::{HashMap, HashSet};
use std::time::Duration;
use mdns_sd::{ServiceDaemon, ServiceEvent};
use ssdp_client::SearchTarget;
use futures::StreamExt;
use std::process::Command;
use tauri::{AppHandle, Emitter};
use crate::DeviceDescription;
use crate::radar_debug;
use crate::radar_error;
use crate::radar_info;
use crate::radar_warn;
use once_cell::sync::Lazy;
use dns_lookup;
use std::sync::{Arc, Mutex};

// NetworkHost struct to store information about discovered hosts
#[derive(Debug, Clone)]
pub struct NetworkHost {
    pub hostname: Option<String>,
    pub tcp_ports: HashSet<u16>,
    pub udp_ports: HashSet<u16>,
}

impl NetworkHost {
    fn new(hostname: Option<String>) -> Self {
        Self {
            hostname,
            tcp_ports: HashSet::new(),
            udp_ports: HashSet::new(),
        }
    }

    fn add_tcp_port(&mut self, port: u16) {
        self.tcp_ports.insert(port);
    }

    fn add_udp_port(&mut self, port: u16) {
        self.udp_ports.insert(port);
    }
}

// Global NetworkMap to store discovered hosts
pub static NETWORK_MAP: Lazy<Arc<Mutex<HashMap<String, NetworkHost>>>> = 
    Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));

// Function to add or update a host in the network map
pub fn add_to_network_map(ip: &str, hostname: Option<String>, tcp_ports: Option<Vec<u16>>, udp_ports: Option<Vec<u16>>) {
    let mut map = NETWORK_MAP.lock().unwrap();
    
    let host = map.entry(ip.to_string()).or_insert_with(|| NetworkHost::new(hostname.clone()));
    
    // If we have a new hostname and the current one is None, update it
    if host.hostname.is_none() && hostname.is_some() {
        host.hostname = hostname;
    }
    
    // Add TCP ports if provided
    if let Some(ports) = tcp_ports {
        for port in ports {
            host.add_tcp_port(port);
        }
    }
    
    // Add UDP ports if provided
    if let Some(ports) = udp_ports {
        for port in ports {
            host.add_udp_port(port);
        }
    }
}

// Removed get_new_services function as it's not used by the UI

pub async fn discover_mdns_streaming(app_handle: AppHandle) -> Result<Vec<NetworkService>, String> {
    // Services we'll discover
    let mut services = Vec::new();
    
    // Create a new ServiceDaemon for each discovery session
    // The key is to use a new instance each time and ensure it lives long enough
    let mdns = match ServiceDaemon::new() {
        Ok(daemon) => daemon,
        Err(e) => {
            // If we can't create the daemon, this is a critical error
            radar_error!("Failed to create mDNS service daemon: {}", e);
            return Err(format!("Failed to create mDNS service daemon: {}", e));
        }
    };
    
    radar_info!("Starting mDNS service discovery");
    
    // Using a smaller set of the most common service types for reliability
    let service_types = vec![
        "_http._tcp.local.",
        "_https._tcp.local.",
        "_ssh._tcp.local.",
        "_device-info._tcp.local.",
        "_spotify-connect._tcp.local.",
        "_airplay._tcp.local.",
        "_googlecast._tcp.local.",
        "_printer._tcp.local.",
        "_ipp._tcp.local.",
        "_homekit._tcp.local.",
        "_companion-link._tcp.local.",
    ];
    
    // Process each service type one by one
    for service_type in service_types {
        radar_debug!("Browsing for service type: {}", service_type);
        
        // Create a new receiver for this service type
        let receiver = match mdns.browse(service_type) {
            Ok(r) => {
                radar_debug!("Successfully created browser for {}", service_type);
                r
            },
            Err(e) => {
                // This is a non-critical error, just log and continue
                radar_warn!("Failed to browse for service type {}: {}", service_type, e);
                continue;
            }
        };
        
        // Use a longer timeout like the debug version - 2 seconds per service type 
        // This is critical for successful mDNS discovery
        let timeout = Duration::from_secs(2);
        let deadline = std::time::Instant::now() + timeout;
        
        radar_debug!("Listening for {} services until {:?}", service_type, deadline);
        
        // Process responses until timeout
        loop {
            if std::time::Instant::now() > deadline {
                break;
            }
            
            // Try to receive events non-blocking
            match receiver.try_recv() {
                Ok(ServiceEvent::ServiceResolved(info)) => {
                    radar_debug!("Resolved service: {}", info.get_fullname());
                    
                            // Get all addresses
                            let addresses: Vec<String> = info.get_addresses()
                                .iter()
                                .map(|addr| addr.to_string())
                                .collect();
                            
                            let address = addresses.first().cloned().unwrap_or_else(|| "Unknown".to_string());
                            
                    // Extract service name and create detailed description
                            let fullname = info.get_fullname().to_string();
                            let name = if let Some(idx) = fullname.find('.') {
                                fullname[0..idx].to_string()
                            } else {
                                fullname.clone()
                            };
                            
                            let mut details_parts = Vec::new();
                            let mut open_ports = HashMap::new();
                            
                            // Add basic service information
                            details_parts.push(format!("Host: {}", info.get_hostname()));
                            details_parts.push(format!("Full Name: {}", info.get_fullname()));
                            
                            // Parse and add service type information
                            let service_protocol = if service_type.contains("_tcp") {
                                "TCP"
                            } else if service_type.contains("_udp") {
                                "UDP"
                            } else {
                                "Unknown"
                            };
                            
                            let clean_service_type = service_type
                                .replace("._tcp.local.", "")
                                .replace("._udp.local.", "")
                                .replace("_", "");
                            
                            details_parts.push(format!("Service Type: {}", clean_service_type));
                            details_parts.push(format!("Protocol: {}", service_protocol));
                            details_parts.push(format!("Port: {}", info.get_port()));
                            
                            // Add port to open ports
                            open_ports.insert(info.get_port(), clean_service_type.clone());
                            
                            // Add TXT record information if available
                            let txt_properties = info.get_properties();
                            if !txt_properties.is_empty() {
                                details_parts.push("\nTXT Records:".to_string());
                                for i in 0..txt_properties.len() {
                                    if let Some(property) = txt_properties.iter().nth(i) {
                                        details_parts.push(format!("  {}: {}", property.key(), property.val_str()));
                                    }
                                }
                            }
                            
                            // Add all addresses
                            if addresses.len() > 1 {
                                details_parts.push("\nAll Addresses:".to_string());
                                for addr in &addresses {
                                    details_parts.push(format!("  {}", addr));
                                }
                            }
                            
                            // Create a friendly name
                            let friendly_name = if name.is_empty() || name == service_type {
                                let hostname = info.get_hostname();
                                if hostname.contains('.') {
                                    hostname.split('.').next().unwrap_or("Device").to_string()
                                } else {
                                    format!("{} Device", clean_service_type.to_uppercase())
                                }
                            } else {
                                name
                            };
                            
                            // Create the service object
                            let service = NetworkService {
                                name: friendly_name,
                                service_type: clean_service_type,
                        address: address.clone(),
                                port: Some(info.get_port()),
                                discovery_method: "mDNS".to_string(),
                                details: Some(details_parts.join("\n")),
                            };
                    
                    // Add the host to the network map
                    if service_protocol == "TCP" {
                        // Add to network map with TCP port
                        add_to_network_map(
                            &address, 
                            Some(info.get_hostname().to_string()),
                            Some(vec![info.get_port()]),
                            None
                        );
                    } else if service_protocol == "UDP" {
                        // Add to network map with UDP port
                        add_to_network_map(
                            &address,
                            Some(info.get_hostname().to_string()),
                            None,
                            Some(vec![info.get_port()])
                        );
                    }
                            
                            // Emit the service as an event
                    // Using a match to prevent any errors from affecting our service collection
                    match app_handle.emit("service-discovered", &service) {
                        Ok(_) => {
                            radar_debug!("Successfully emitted mDNS service: {}", service.name);
                            
                            // Extra debug info to verify event structure matches frontend expectations
                            radar_info!("Event 'service-discovered' emitted with payload: {{");
                            radar_info!("  name: {}", service.name);
                            radar_info!("  service_type: {}", service.service_type);
                            radar_info!("  address: {}", service.address);
                            radar_info!("  port: {:?}", service.port);
                            radar_info!("  discovery_method: {}", service.discovery_method);
                            radar_info!("}}");
                        },
                        Err(e) => {
                            // Just log the error but don't fail - the channel might be closed if UI is not listening
                            radar_warn!("Failed to emit mDNS service event: {}", e);
                        }
                    }
                            
                            // Add to our collection
                            services.push(service);
                },
                Ok(_) => {
                    // Ignore other service events
                },
                Err(e) => {
                    // Handle empty channel cases without excessive logging - these are normal
                    let error_message = e.to_string();
                    if error_message.contains("no messages in queue") || 
                       error_message.contains("empty channel") || 
                       error_message.contains("receiving on an empty channel") {
                        // Just yield CPU without logging in debug mode
                        tokio::task::yield_now().await;
                    } else {
                        // Log other unexpected errors
                        radar_warn!("Error receiving mDNS event for {}: {}", service_type, e);
                        break;
                    }
                }
            }
        }
        
        // Explicitly drop the receiver to ensure it's cleaned up properly
        drop(receiver);
    }
    
    radar_info!("mDNS discovery completed, found {} services", services.len());
    
    // Return the discovered services
    let result = Ok(services);
    return result;
}

pub async fn discover_upnp_streaming(app_handle: AppHandle) -> Result<Vec<NetworkService>, String> {
    let mut services = Vec::new();
    let search_targets = vec![
        SearchTarget::RootDevice,
        SearchTarget::All,
        SearchTarget::UUID("upnp:rootdevice".to_string()),
    ];
    
    for search_target in search_targets {
        match ssdp_client::search(&search_target, Duration::from_secs(2), 1, None).await {
            Ok(responses) => {
                tokio::pin!(responses);
                
                while let Some(response_result) = responses.next().await {
                    if let Ok(response) = response_result {
                        let location_url = response.location().to_string();
                        
                        // Try to fetch and parse device description
                        let device_desc = if !location_url.is_empty() {
                            fetch_device_description(&location_url).await
                        } else {
                            None
                        };
                        
                        // Extract IP and port from location URL
                        let mut address = "Unknown".to_string();
                        let mut port = None;
                        
                        let location = response.location();
                        if location.starts_with("http://") {
                            let without_prefix = location.trim_start_matches("http://");
                            if let Some(host_end) = without_prefix.find('/') {
                                let host_part = &without_prefix[..host_end];
                                if let Some(port_idx) = host_part.find(':') {
                                    address = host_part[..port_idx].to_string();
                                    if let Ok(port_num) = host_part[port_idx+1..].parse::<u16>() {
                                        port = Some(port_num);
                                    }
                                } else {
                                    address = host_part.to_string();
                                    port = Some(80);
                                }
                            }
                        }
                        
                        let mut details_parts = Vec::new();
                        let mut open_ports = HashMap::new();
                        
                        // Add device description details if available
                        if let Some(ref desc) = device_desc {
                            // Extract device type with more detail
                            if let Some(device_type) = &desc.device.device_type {
                                details_parts.push(format!("Device Type: {}", device_type));
                                // Parse protocol from device type
                                if let Some(protocol) = device_type.split(':').nth(3) {
                                    details_parts.push(format!("Protocol: {}", protocol));
                                }
                            }
                            
                            // Add basic device info
                            if let Some(friendly_name) = &desc.device.friendly_name {
                                details_parts.push(format!("Name: {}", friendly_name));
                            }
                            if let Some(manufacturer) = &desc.device.manufacturer {
                                details_parts.push(format!("Manufacturer: {}", manufacturer));
                                if let Some(url) = &desc.device.manufacturer_url {
                                    details_parts.push(format!("Manufacturer URL: {}", url));
                                }
                            }
                            if let Some(model_name) = &desc.device.model_name {
                                details_parts.push(format!("Model: {}", model_name));
                                if let Some(desc_text) = &desc.device.model_description {
                                    details_parts.push(format!("Model Description: {}", desc_text));
                                }
                                if let Some(num) = &desc.device.model_number {
                                    details_parts.push(format!("Model Number: {}", num));
                                }
                                if let Some(url) = &desc.device.model_url {
                                    details_parts.push(format!("Model URL: {}", url));
                                }
                            }
                            if let Some(serial) = &desc.device.serial_number {
                                details_parts.push(format!("Serial Number: {}", serial));
                            }
                            if let Some(udn) = &desc.device.udn {
                                details_parts.push(format!("UDN: {}", udn));
                                // Extract UUID from UDN
                                if let Some(uuid) = udn.strip_prefix("uuid:") {
                                    details_parts.push(format!("UUID: {}", uuid));
                                }
                            }
                            if let Some(url) = &desc.device.presentation_url {
                                details_parts.push(format!("Web Interface: {}", url));
                                // Try to extract port from URL
                                if let Some(port) = url.split(':').nth(2).and_then(|p| p.split('/').next()) {
                                    if let Ok(port_num) = port.parse::<u16>() {
                                        open_ports.insert(port_num, "Web Interface".to_string());
                                    }
                                }
                            }
                            
                            // Add service list with enhanced details
                            if let Some(service_list) = &desc.device.service_list {
                                details_parts.push("\nServices:".to_string());
                                for service in &service_list.services {
                                    details_parts.push(format!("  Service Type: {}", service.service_type));
                                    
                                    // Extract protocol and service name from service type
                                    let parts: Vec<&str> = service.service_type.split(':').collect();
                                    if parts.len() >= 4 {
                                        details_parts.push(format!("    Protocol: {}", parts[1]));
                                        details_parts.push(format!("    Service: {}", parts[3]));
                                    }
                                    
                                    details_parts.push(format!("  Service ID: {}", service.service_id));
                                    
                                    // Add URLs with port information
                                    if let Some(url) = &service.control_url {
                                        details_parts.push(format!("    Control URL: {}", url));
                                        if url.contains(':') {
                                            if let Some(port) = url.split(':').nth(1).and_then(|p| p.split('/').next()) {
                                                if let Ok(port_num) = port.parse::<u16>() {
                                                    open_ports.insert(port_num, format!("{} Control", service.service_type));
                                                }
                                            }
                                        }
                                    }
                                    if let Some(url) = &service.event_sub_url {
                                        details_parts.push(format!("    Event Sub URL: {}", url));
                                    }
                                    if let Some(url) = &service.scpd_url {
                                        details_parts.push(format!("    SCPD URL: {}", url));
                                    }
                                    details_parts.push("".to_string());
                                }
                            }
                            
                            // Add embedded devices with enhanced details
                            if let Some(device_list) = &desc.device.device_list {
                                details_parts.push("\nEmbedded Devices:".to_string());
                                for device in &device_list.devices {
                                    details_parts.push("  Device:".to_string());
                                    if let Some(name) = &device.friendly_name {
                                        details_parts.push(format!("    Name: {}", name));
                                    }
                                    if let Some(type_) = &device.device_type {
                                        details_parts.push(format!("    Type: {}", type_));
                                        // Extract protocol from device type
                                        if let Some(protocol) = type_.split(':').nth(3) {
                                            details_parts.push(format!("    Protocol: {}", protocol));
                                        }
                                    }
                                    if let Some(model) = &device.model_name {
                                        details_parts.push(format!("    Model: {}", model));
                                    }
                                    if let Some(manufacturer) = &device.manufacturer {
                                        details_parts.push(format!("    Manufacturer: {}", manufacturer));
                                    }
                                    details_parts.push("".to_string());
                                }
                            }
                        }
                        
                        // Add enhanced SSDP response information
                        details_parts.push("\nSSDP Information:".to_string());
                        details_parts.push(format!("Location: {}", location_url));
                        
                        // Parse server string for OS and UPnP details
                        let server_info = response.server();
                        details_parts.push(format!("Server: {}", server_info));
                        let server_parts: Vec<&str> = server_info.split('/').collect();
                        if server_parts.len() > 1 {
                            details_parts.push(format!("  OS: {}", server_parts[0].trim()));
                            if let Some(upnp_version) = server_info.find("UPnP").map(|i| &server_info[i..]) {
                                details_parts.push(format!("  UPnP Version: {}", upnp_version));
                            }
                        }
                        
                        // Parse search target for protocol information
                        let search_target = response.search_target().to_string();
                        details_parts.push(format!("Search Target: {}", search_target));
                        if search_target.contains("urn:") {
                            let parts: Vec<&str> = search_target.split(':').collect();
                            if parts.len() >= 4 {
                                details_parts.push(format!("  Protocol: {}", parts[1]));
                                details_parts.push(format!("  Service Type: {}", parts[3]));
                            }
                        }
                        
                        // Parse USN for additional device information
                        let usn = response.usn();
                        details_parts.push(format!("USN: {}", usn));
                        if let Some(uuid_end) = usn.find("::") {
                            if let Some(uuid) = usn[..uuid_end].strip_prefix("uuid:") {
                                details_parts.push(format!("  UUID: {}", uuid));
                            }
                        }
                        
                        // Create service name from device description or fallback to basic info
                        let name = if let Some(ref desc) = device_desc {
                            desc.device.friendly_name.clone()
                                .or(desc.device.model_name.clone())
                                .unwrap_or_else(|| format!("UPnP Device at {}", address))
                        } else {
                            format!("UPnP Device at {}", address)
                        };
                        
                        // Determine device type
                        let device_type = if let Some(ref desc) = device_desc {
                            desc.device.device_type
                                .clone()
                                .unwrap_or_else(|| "UPnP Device".to_string())
                        } else {
                            "UPnP Device".to_string()
                        };
                        
                        // Create the service object
                        let service = NetworkService {
                            name,
                            service_type: device_type,
                            address: address.clone(),
                            port,
                            discovery_method: "UPnP".to_string(),
                            details: Some(details_parts.join("\n")),
                        };
                        
                        // Emit the service as an event
                        let _ = app_handle.emit("service-discovered", &service);
                        
                        // Add to our collection
                        services.push(service);

                        // Add to network map
                        if address != "Unknown" {
                            // For UPnP, we generally know it's on HTTP which is TCP
                            add_to_network_map(
                                &address,
                                Some(address.split(':').next().unwrap_or("Unknown").to_string()),
                                Some(vec![port.unwrap_or(80)]),
                                None
                            );
                        }
                    }
                }
            }
            Err(e) => {
                radar_error!("Error discovering UPnP services: {}", e);
            }
        }
    }
    
    // Deduplicate services
    let mut unique_services = Vec::new();
    let mut seen_addresses = HashSet::new();
    
    for service in services {
        let key = (service.address.clone(), service.port);
        if !seen_addresses.contains(&key) {
            seen_addresses.insert(key);
            unique_services.push(service);
        }
    }
    
    let result = Ok(unique_services);
    return result;
}

// Function to get local network hosts using ARP table
async fn get_arp_hosts() -> Vec<(String, Option<String>)> {
    let mut hosts = Vec::new();
    
    // Run "arp -a" command to get ARP table
    let output = Command::new("arp")
        .arg("-a")
        .output();
    
    match output {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    // Parse each line of ARP output
                    if let Some(ip_start) = line.find('(') {
                        if let Some(ip_end) = line.find(')') {
                            if ip_start < ip_end {
                                let hostname = line[0..ip_start].trim().to_string();
                                let ip = line[ip_start+1..ip_end].trim().to_string();
                                
                                // Only add valid IPv4 addresses
                                if ip.split('.').count() == 4 {
                                    let hostname = if hostname.is_empty() || hostname == "?" {
                                        None
                                    } else {
                                        Some(hostname)
                                    };
                                    
                                    hosts.push((ip, hostname));
                                }
                            }
                        }
                    }
                }
            }
        }
        Err(e) => {
            radar_error!("Failed to run arp command: {}", e);
        }
    }
    
    // Fallback for systems where arp -a doesn't work well
    if hosts.is_empty() {
        // Try to get the local IP address
        if let Some(local_ip) = get_local_ip() {
            // Create a network range by replacing the last octet with a range
            let network_prefix = local_ip.split('.').take(3).collect::<Vec<_>>().join(".");
            
            for i in 1..255 {
                let ip = format!("{}.{}", network_prefix, i);
                hosts.push((ip, None));
            }
        }
    }
    
    hosts
}

// Function to check if a TCP port is open
async fn check_tcp_port(ip: &str, port: u16, timeout: Duration) -> bool {
    match tokio::time::timeout(
        timeout,
        tokio::net::TcpStream::connect(format!("{}:{}", ip, port))
    ).await {
        Ok(Ok(_)) => true,
        _ => false
    }
}

// Function to check if a UDP port is open
async fn check_udp_port(ip: &str, port: u16, timeout: Duration) -> bool {
    match tokio::time::timeout(
        timeout,
        tokio::net::UdpSocket::bind("0.0.0.0:0")
    ).await {
        Ok(Ok(socket)) => {
            match socket.connect(format!("{}:{}", ip, port)).await {
                Ok(_) => {
                    // Send a small UDP packet
                    match socket.send(&[0, 1, 2, 3]).await {
                        Ok(_) => {
                            // Try to receive any response
                            let mut buf = [0; 10];
                            match tokio::time::timeout(
                                timeout,
                                socket.recv(&mut buf)
                            ).await {
                                Ok(_) => true, // Got response, port is likely open
                                Err(_) => {
                                    // No response, but we could send data, so the port might be open
                                    // UDP is connectionless, so this is a best effort estimate
                                    true
                                }
                            }
                        },
                        Err(_) => false
                    }
                },
                Err(_) => false
            }
        },
        _ => false
    }
}

// Common ports to scan
const COMMON_TCP_PORTS: &[u16] = &[
    20, 21, 22, 23, 25, 53, 80, 110, 443, 587, 993, 995, 3306, 3389, 5432, 8080, 8443, 
];

const COMMON_UDP_PORTS: &[u16] = &[
    53, 67, 68, 69, 123, 161, 162, 1900, 5353,
];

// Get the local IP address
fn get_local_ip() -> Option<String> {
    // Try to get a socket connection to a public address
    // This won't actually connect but will determine local interface
    match std::net::UdpSocket::bind("0.0.0.0:0") {
        Ok(socket) => {
            match socket.connect("8.8.8.8:80") {
                Ok(_) => {
                    match socket.local_addr() {
                        Ok(addr) => {
                            Some(addr.ip().to_string())
                        },
                        Err(_) => None
                    }
                },
                Err(_) => None
            }
        },
        Err(_) => None
    }
}

pub async fn scan_local_network(app_handle: &AppHandle) -> Vec<NetworkService> {
    let mut services = Vec::new();
    radar_info!("Starting local network scan");
    
    // Get hosts from ARP table
    let arp_hosts = get_arp_hosts().await;
    radar_info!("Found {} hosts in ARP table", arp_hosts.len());
    
    // Add all hosts to network map initially
    for (ip, hostname) in &arp_hosts {
        add_to_network_map(ip, hostname.clone(), None, None);
        
        // If we don't have a hostname yet, try to look it up
        if hostname.is_none() {
            if let Some(resolved_hostname) = get_hostname_from_ip(ip).await {
                add_to_network_map(ip, Some(resolved_hostname), None, None);
            }
        }
    }
    
    // Create scanner tasks
    let mut join_handles = Vec::new();
    
    // Scan each host for open ports
    for (ip, hostname) in arp_hosts {
        let app_handle_clone = app_handle.clone();
        let ip_clone = ip.clone();
        
        // Spawn a separate task for each host
        let handle = tokio::spawn(async move {
            let mut open_tcp_ports = Vec::new();
            let mut open_udp_ports = Vec::new();
            
            // Scan common TCP ports
            for &port in COMMON_TCP_PORTS {
                if check_tcp_port(&ip_clone, port, Duration::from_millis(500)).await {
                    radar_debug!("Found open TCP port {}:{}", ip_clone, port);
                    open_tcp_ports.push(port);
                    
                    // Create a service for each open port
                    let service_type = match port {
                        20 | 21 => "ftp",
                        22 => "ssh",
                        23 => "telnet",
                        25 | 587 => "smtp",
                        53 => "dns",
                        80 | 8080 => "http",
                        110 => "pop3",
                        443 | 8443 => "https",
                        993 => "imaps",
                        995 => "pop3s",
                        3306 => "mysql",
                        3389 => "rdp",
                        5432 => "postgresql",
                        _ => "unknown",
                    }.to_string();
                    
                    let service = NetworkService {
                        name: format!("{} ({}) on port {}", service_type.to_uppercase(), ip_clone, port),
                        service_type: service_type.clone(),
                        address: ip_clone.clone(),
                        port: Some(port),
                        discovery_method: "Network Scan".to_string(),
                        details: Some(format!("TCP service discovered on {}:{}\nType: {}", ip_clone, port, service_type)),
                    };
                    
                    // Emit the service
                    let _ = app_handle_clone.emit("service-discovered", &service);
                }
            }
            
            // Scan common UDP ports
            for &port in COMMON_UDP_PORTS {
                if check_udp_port(&ip_clone, port, Duration::from_millis(500)).await {
                    radar_debug!("Found open UDP port {}:{}", ip_clone, port);
                    open_udp_ports.push(port);
                    
                    // Create a service for each open port
                    let service_type = match port {
                        53 => "dns",
                        67 | 68 => "dhcp",
                        69 => "tftp",
                        123 => "ntp",
                        161 | 162 => "snmp",
                        1900 => "upnp",
                        5353 => "mdns",
                        _ => "unknown",
                    }.to_string();
                    
    let service = NetworkService {
                        name: format!("{} ({}) on port {}/udp", service_type.to_uppercase(), ip_clone, port),
                        service_type: service_type.clone(),
                        address: ip_clone.clone(),
                        port: Some(port),
                        discovery_method: "Network Scan".to_string(),
                        details: Some(format!("UDP service discovered on {}:{}\nType: {}", ip_clone, port, service_type)),
                    };
                    
                    // Emit the service
                    let _ = app_handle_clone.emit("service-discovered", &service);
                }
            }
            
            // Update network map with discovered ports
            add_to_network_map(&ip_clone, None, Some(open_tcp_ports), Some(open_udp_ports));
            
            // Return the hostname and IP
            (ip_clone, hostname)
        });
        
        join_handles.push(handle);
    }
    
    // Wait for all scan tasks to complete
    for handle in join_handles {
        if let Ok((ip, hostname)) = handle.await {
            // Create a basic service for each host even if no ports were found
            let service = NetworkService {
                name: hostname.unwrap_or_else(|| format!("Device at {}", ip)),
        service_type: "host".to_string(),
                address: ip.clone(),
        port: None,
        discovery_method: "Network Scan".to_string(),
                details: Some(format!("Host discovered on network at {}", ip)),
            };
            
            services.push(service);
        }
    }
    
    // Get all entries from network map
    let network_map = NETWORK_MAP.lock().unwrap();
    for (ip, host) in network_map.iter() {
        // For each host, create a service with the collected information
        if !host.tcp_ports.is_empty() || !host.udp_ports.is_empty() {
            let mut details = format!("Host: {}\n", ip);
            
            if let Some(hostname) = &host.hostname {
                details.push_str(&format!("Hostname: {}\n", hostname));
            }
            
            if !host.tcp_ports.is_empty() {
                details.push_str("\nOpen TCP ports:\n");
                for port in &host.tcp_ports {
                    details.push_str(&format!("  {}\n", port));
                }
            }
            
            if !host.udp_ports.is_empty() {
                details.push_str("\nOpen UDP ports:\n");
                for port in &host.udp_ports {
                    details.push_str(&format!("  {}\n", port));
                }
            }
            
            let service = NetworkService {
                name: host.hostname.clone().unwrap_or_else(|| format!("Network Device at {}", ip)),
                service_type: "network_device".to_string(),
                address: ip.clone(),
                port: None,
                discovery_method: "Network Scan".to_string(),
                details: Some(details),
            };
            
            // Don't add if we already have this IP in services
            if !services.iter().any(|s| s.address == *ip) {
    services.push(service);
            }
        }
    }
    
    radar_info!("Network scan complete, found {} hosts", services.len());
    services
}

// Implementation function for network scanning
pub async fn scan_network_services_impl(
    app_handle: &AppHandle,
) -> Result<Vec<ConsolidatedService>, String> {
    // Start with empty services
    let mut all_services = Vec::new();
    
    // Discover mDNS services and emit events as they're found
    let mdns_services = crate::discover_mdns_streaming(app_handle.clone()).await.unwrap_or_else(|_| vec![]);
    all_services.extend(mdns_services);
    
    // Discover UPnP services and emit events as they're found
    let upnp_services = crate::discover_upnp_streaming(app_handle.clone()).await.unwrap_or_else(|_| vec![]);
    all_services.extend(upnp_services);
    
    // Scan network and emit events as hosts are found
    let network_scan_services = crate::scan_local_network(app_handle).await;
    all_services.extend(network_scan_services);

    // Store services in the global state
    let mut discovered_services = DISCOVERED_SERVICES.lock().unwrap();
    let mut consolidated_services = CONSOLIDATED_SERVICES.lock().unwrap();
    
    // Add all services to the discovered set
    for service in &all_services {
        discovered_services.insert(service.clone());
    }
    
    // Consolidate services
    let consolidated = consolidate_services(all_services);
    
    // Update the consolidated services map
    for service in &consolidated {
        let key = format!("{}:{}", service.address, service.port.unwrap_or(0));
        consolidated_services.insert(key, service.clone());
    }

    let result = Ok(consolidated);
    return result;
}

// Function to consolidate services from different discovery methods
pub fn consolidate_services(services: Vec<NetworkService>) -> Vec<ConsolidatedService> {
    let mut service_map: HashMap<String, ConsolidatedService> = HashMap::new();
    
    // First pass: Create or update services by IP address
    for service in services {
        // Use IP address as the primary key for consolidation
        let key = service.address.clone();
        
        if let Some(existing) = service_map.get_mut(&key) {
            // Update existing consolidated service
            update_consolidated_service(existing, &service);
        } else {
            // Create new consolidated service
            let consolidated = create_consolidated_service(&service);
            service_map.insert(key, consolidated);
        }
    }
    
    // Convert map to vector and sort by address for consistent display
    let mut consolidated: Vec<ConsolidatedService> = service_map.into_values().collect();
    consolidated.sort_by(|a, b| a.address.cmp(&b.address));
    consolidated
}

// Function to create a new consolidated service from a network service
fn create_consolidated_service(service: &NetworkService) -> ConsolidatedService {
    let mut hostname = None;
    let mut uuid = None;
    let mut location_url = None;
    let mut server_info = None;
    let mut open_ports = HashMap::new();
    let service_details = Vec::new();
    
    // Extract information from details
    if let Some(details) = &service.details {
        for line in details.lines() {
            if line.starts_with("Host:") || line.starts_with("Hostname:") {
                hostname = line.split(':').nth(1).map(|s| s.trim().to_string());
            } else if line.starts_with("UUID:") {
                uuid = line.split(':').nth(1).map(|s| s.trim().to_string());
            } else if line.starts_with("Location:") {
                location_url = line.split(':').nth(1).map(|s| s.trim().to_string());
            } else if line.starts_with("Server:") {
                server_info = line.split(':').nth(1).map(|s| s.trim().to_string());
            } else if line.contains("://") && line.contains(":") {
                // This might be a URL with port
                if let Some(port_str) = line.split(':').last() {
                    if let Ok(port) = port_str.trim().parse::<u16>() {
                        open_ports.insert(port, "Web Interface".to_string());
                    }
                }
            } else if line.contains(":") && !line.starts_with("IP:") && !line.starts_with("Type:") && 
                      !line.starts_with("USN:") && !line.starts_with("Full Name:") {
                // This might be a port:service line
                let parts: Vec<&str> = line.splitn(2, ':').collect();
                if parts.len() == 2 {
                    if let Ok(port) = parts[0].trim().parse::<u16>() {
                        open_ports.insert(port, parts[1].trim().to_string());
                    }
                }
            }
        }
    }
    
    // Add the current service's port if it exists
    if let Some(port) = service.port {
        if !open_ports.contains_key(&port) {
            open_ports.insert(port, service.service_type.clone());
        }
    }
    
    // Determine device type
    let device_type = if service.service_type.contains("_") && service.service_type.contains(".") {
        // This is likely an mDNS service type
        Some(service.service_type.split('_').nth(1).unwrap_or("unknown").trim_end_matches(".").to_string())
    } else {
        Some(service.service_type.clone())
    };
    
    // Create friendly description
    let friendly_description = create_friendly_description(
        &service.name,
        &service.address,
        service.port,
        &hostname,
        &device_type,
        &open_ports,
        &service_details,
    );
    
    ConsolidatedService {
        name: service.name.clone(),
        address: service.address.clone(),
        port: service.port,
        hostname,
        device_type,
        discovery_methods: vec![service.discovery_method.clone()],
        service_types: vec![service.service_type.clone()],
        open_ports,
        uuid,
        location_url,
        server_info,
        friendly_description,
    }
}

// Function to update an existing consolidated service with information from another service
fn update_consolidated_service(consolidated: &mut ConsolidatedService, service: &NetworkService) {
    // Add discovery method if not already present
    if !consolidated.discovery_methods.contains(&service.discovery_method) {
        consolidated.discovery_methods.push(service.discovery_method.clone());
    }
    
    // Add service type if not already present
    if !consolidated.service_types.contains(&service.service_type) {
        consolidated.service_types.push(service.service_type.clone());
    }
    
    // Add port if it exists and is not already present
    if let Some(port) = service.port {
        if !consolidated.open_ports.contains_key(&port) {
            consolidated.open_ports.insert(port, service.service_type.clone());
        }
    }
    
    let mut service_details = Vec::new();
    
    // Extract additional information from details
    if let Some(details) = &service.details {
        for line in details.lines() {
            if line.starts_with("Host:") || line.starts_with("Hostname:") {
                if consolidated.hostname.is_none() {
                    consolidated.hostname = Some(line.split(':').nth(1).unwrap_or("").trim().to_string());
                }
            } else if line.starts_with("UUID:") {
                if consolidated.uuid.is_none() {
                    consolidated.uuid = Some(line.split(':').nth(1).unwrap_or("").trim().to_string());
                }
            } else if line.starts_with("Location:") {
                if consolidated.location_url.is_none() {
                    consolidated.location_url = Some(line.split(':').nth(1).unwrap_or("").trim().to_string());
                }
            } else if line.starts_with("Server:") {
                if consolidated.server_info.is_none() {
                    consolidated.server_info = Some(line.split(':').nth(1).unwrap_or("").trim().to_string());
                }
            } else if line.starts_with("Model:") || line.starts_with("Manufacturer:") || 
                      line.starts_with("Device Type:") || line.starts_with("Service Type:") {
                service_details.push(line.trim().to_string());
            } else if line.contains("://") && line.contains(":") {
                // This might be a URL with port
                if let Some(port_str) = line.split(':').last() {
                    if let Ok(port) = port_str.trim().parse::<u16>() {
                        if !consolidated.open_ports.contains_key(&port) {
                            consolidated.open_ports.insert(port, "Web Interface".to_string());
                        }
                    }
                }
            } else if line.contains(":") && !line.starts_with("IP:") && !line.starts_with("Type:") && 
                      !line.starts_with("USN:") && !line.starts_with("Full Name:") {
                // This might be a port:service line
                let parts: Vec<&str> = line.splitn(2, ':').collect();
                if parts.len() == 2 {
                    if let Ok(port) = parts[0].trim().parse::<u16>() {
                        if !consolidated.open_ports.contains_key(&port) {
                            consolidated.open_ports.insert(port, parts[1].trim().to_string());
                        }
                    }
                }
            }
        }
    }
    
    // Update friendly description
    consolidated.friendly_description = create_friendly_description(
        &consolidated.name,
        &consolidated.address,
        consolidated.port,
        &consolidated.hostname,
        &consolidated.device_type,
        &consolidated.open_ports,
        &service_details,
    );
}

// Function to create a friendly description for a service
fn create_friendly_description(
    name: &str,
    address: &str,
    port: Option<u16>,
    hostname: &Option<String>,
    device_type: &Option<String>,
    open_ports: &HashMap<u16, String>,
    service_details: &[String],
) -> String {
    let mut parts = Vec::new();
    
    // Add name if it's not too long or complex
    if name.len() < 30 && !name.contains(".") {
        parts.push(format!("{}", name));
    }
    
    // Add hostname if available
    if let Some(host) = hostname {
        if !parts.is_empty() {
            parts.push(format!("({})", host));
        } else {
            parts.push(host.clone());
        }
    }
    
    // Add device type if available
    if let Some(dtype) = device_type {
        if dtype != "host" && dtype != "unknown" {
            parts.push(format!("[{}]", dtype));
        }
    }
    
    // Create base description
    let mut description = if !parts.is_empty() {
        parts.join(" ")
    } else {
        format!("Device at {}", address)
    };
    
    // Add address and port
    if let Some(p) = port {
        description.push_str(&format!(" - {}:{}", address, p));
    } else {
        description.push_str(&format!(" - {}", address));
    }
    
    // Add discovery methods summary
    if !open_ports.is_empty() {
        let services: Vec<String> = open_ports
            .iter()
            .map(|(port, service)| format!("{}:{}", service, port))
            .collect();
        
        description.push_str(&format!(" - Services: {}", services.join(", ")));
    }
    
    // Add additional service details
    if !service_details.is_empty() {
        description.push_str("\nDetails: ");
        description.push_str(&service_details.join(", "));
    }
    
    description
}

async fn fetch_device_description(location_url: &str) -> Option<DeviceDescription> {
    match reqwest::get(location_url).await {
        Ok(response) => {
            if let Ok(text) = response.text().await {
                match quick_xml::de::from_str(&text) {
                    Ok(desc) => Some(desc),
                    Err(_) => None,
                }
            } else {
                None
            }
        }
        Err(_) => None,
    }
}

// Initialize the network scanner module
pub fn init<R: tauri::Runtime>(_app: &mut tauri::App<R>) -> std::result::Result<(), Box<dyn std::error::Error>> {
    radar_info!("Initializing network scanner module");
    Ok(())
}

// Function to get hostname from IP address
async fn get_hostname_from_ip(ip: &str) -> Option<String> {
    if let Ok(ip_addr) = ip.parse::<std::net::IpAddr>() {
        match tokio::net::lookup_host(format!("{}:0", ip)).await {
            Ok(addrs) => {
                for addr in addrs {
                    if addr.ip() == ip_addr {
                        if let Ok(hostname) = dns_lookup::lookup_addr(&ip_addr) {
                            return Some(hostname);
                        }
                    }
                }
                None
            },
            Err(_) => None
        }
    } else {
        None
    }
} 