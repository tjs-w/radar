/**
 * Map service types to Material Icons
 */
export function getProtocolIcon(serviceType: string): string {
  const type = serviceType.toLowerCase();

  // Web services
  if (type.includes("http") || type.includes("web")) {
    return type.includes("https") ? "https" : "http";
  }

  // File sharing
  if (type.includes("ftp")) {
    return "folder_shared";
  }
  if (type.includes("smb") || type.includes("cifs")) {
    return "folder_shared";
  }
  if (type.includes("nfs")) {
    return "folder_shared";
  }

  // Remote access
  if (type.includes("ssh") || type.includes("telnet")) {
    return "terminal";
  }
  if (type.includes("rdp") || type.includes("vnc")) {
    return "desktop_windows";
  }

  // Database
  if (
    type.includes("sql") ||
    type.includes("mysql") ||
    type.includes("postgres")
  ) {
    return "storage";
  }

  // Media
  if (type.includes("dlna") || type.includes("upnp")) {
    // Enhanced UPnP device typing
    if (type.includes("mediaserver") || type.includes("mediarenderer")) {
      return "play_circle";
    }
    if (type.includes("internetgateway") || type.includes("gateway")) {
      return "router";
    }
    if (type.includes("printer")) {
      return "print";
    }
    if (type.includes("nas") || type.includes("storage")) {
      return "backup";
    }
    return "connected_tv";
  }
  if (type.includes("airplay") || type.includes("cast")) {
    return "cast";
  }

  // DNS and discovery
  if (
    type.includes("dns") ||
    type.includes("mdns") ||
    type.includes("bonjour")
  ) {
    return "dns";
  }

  // Mail
  if (type.includes("smtp") || type.includes("imap") || type.includes("pop3")) {
    return "mail";
  }

  // Default
  return "devices_other";
}

/**
 * Get a more descriptive protocol name based on service type
 */
export function getProtocolName(serviceType: string): string {
  const type = serviceType.toLowerCase();

  // UPnP device types
  if (type.includes("upnp") || type.includes("urn:schemas-upnp-org")) {
    if (type.includes("mediaserver")) return "Media Server";
    if (type.includes("mediarenderer")) return "Media Player";
    if (type.includes("internetgateway")) return "Internet Gateway";
    if (type.includes("wanconnection")) return "WAN Connection";
    if (type.includes("wancommon")) return "WAN Device";
    if (type.includes("nas")) return "Network Storage";
    if (type.includes("printer")) return "Printer";
    if (type.includes("telephony")) return "VoIP Device";
    if (type.includes("hvac")) return "Climate Control";
    if (type.includes("lighting")) return "Smart Lighting";
    if (type.includes("remoteui")) return "Remote Control";

    // Extract device type from URN if possible
    const deviceMatch = type.match(/device:([^:]+)/i);
    if (deviceMatch && deviceMatch[1]) {
      return deviceMatch[1];
    }

    return "UPnP Device";
  }

  // Other protocols
  if (type.includes("http")) return "Web Server";
  if (type.includes("https")) return "Secure Web";
  if (type.includes("ftp")) return "File Transfer";
  if (type.includes("ssh")) return "SSH";
  if (type.includes("telnet")) return "Telnet";
  if (type.includes("smb") || type.includes("cifs")) return "File Sharing";
  if (type.includes("nfs")) return "Network File System";
  if (type.includes("rdp")) return "Remote Desktop";
  if (type.includes("vnc")) return "VNC";
  if (type.includes("dns")) return "DNS";
  if (type.includes("mdns") || type.includes("bonjour")) return "mDNS";
  if (type.includes("airplay")) return "AirPlay";
  if (type.includes("cast")) return "Cast";
  if (type.includes("smtp")) return "Email (SMTP)";
  if (type.includes("imap")) return "Email (IMAP)";
  if (type.includes("pop3")) return "Email (POP3)";

  // Return the original service type if no match
  return serviceType;
}

/**
 * Get CSS class based on service type
 */
export function getServiceTypeClass(serviceType: string): string {
  const type = serviceType.toLowerCase();

  // Extract the main protocol type
  if (type.includes("http") || type.includes("web")) {
    return type.includes("https") ? "https" : "http";
  }

  if (type.includes("ftp")) {
    return "ftp";
  }

  if (type.includes("smb") || type.includes("cifs")) {
    return "smb";
  }

  if (type.includes("ssh")) {
    return "ssh";
  }

  if (type.includes("rdp")) {
    return "rdp";
  }

  if (type.includes("vnc")) {
    return "vnc";
  }

  if (
    type.includes("dns") ||
    type.includes("mdns") ||
    type.includes("bonjour")
  ) {
    return "mdns";
  }

  if (type.includes("upnp") || type.includes("ssdp")) {
    return "upnp";
  }

  // Default
  return "default";
}
