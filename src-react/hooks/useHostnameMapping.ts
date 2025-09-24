import { useCallback, useEffect, useState } from 'react';
import { useAppState } from '../context/AppContext';
import { NetworkService } from '../types/network';

// Helper function to check if an IP is in the multicast range
const isMulticastIP = (ip: string): boolean => {
  try {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;

    const firstOctet = parseInt(parts[0], 10);
    return firstOctet === 239;
  } catch (e) {
    return false;
  }
};

export function useHostnameMapping() {
  const { state } = useAppState();
  const { services } = state;
  const [ipToHostnameMap, setIpToHostnameMap] = useState<Record<string, string>>({});

  // Process mDNS service to extract hostname
  const extractHostnameFromMdns = useCallback((service: NetworkService): string | null => {
    if (!service.details) return null;
    const details = service.details;

    // Try service name first if it's not a port description
    if (service.name && !service.name.includes('on port')) {
      const nameParts = service.name.split('(');
      if (nameParts.length > 0) {
        const possibleHostname = nameParts[0].trim();
        if (possibleHostname && possibleHostname !== service.service_type.toUpperCase()) {
          return possibleHostname;
        }
      }
    }

    // Check for host field which is common in mDNS
    const hostMatch = details.match(/Host:\s*([^\n]+)/i);
    if (hostMatch && hostMatch[1]) {
      return hostMatch[1].trim();
    }

    // Check for full name field which often contains the hostname
    const fullNameMatch = details.match(/Full Name:\s*([^\n]+)/i);
    if (fullNameMatch && fullNameMatch[1]) {
      const fullName = fullNameMatch[1].trim();
      // Extract first part before dot from full name
      const parts = fullName.split('.');
      if (parts.length > 0 && parts[0]) {
        return parts[0];
      }
    }

    // Check other common fields
    const hostnameMatch = details.match(/Hostname:\s*([^\n]+)/i);
    if (hostnameMatch && hostnameMatch[1]) {
      return hostnameMatch[1].trim();
    }

    return null;
  }, []);

  // Process UPnP service to extract hostname
  const extractHostnameFromUpnp = useCallback((service: NetworkService): string | null => {
    if (!service.details) return null;
    const details = service.details;

    // Check for friendly name first (common in UPnP)
    const friendlyNameMatch = details.match(/[Ff]riendly[Nn]ame:\s*([^\n]+)/);
    if (friendlyNameMatch && friendlyNameMatch[1]) {
      return friendlyNameMatch[1].trim();
    }

    // Then check for regular name
    const nameMatch = details.match(/[Nn]ame:\s*([^\n]+)/);
    if (nameMatch && nameMatch[1]) {
      return nameMatch[1].trim();
    }

    // Try to parse UPnP details as JSON if it looks like JSON
    if (details.includes('{') && details.includes('}')) {
      try {
        const detailsJson = JSON.parse(details);
        const jsonHostname =
          detailsJson.friendlyName ||
          detailsJson.FriendlyName ||
          detailsJson.name ||
          detailsJson.Name;
        if (jsonHostname) {
          return jsonHostname;
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
    }

    return null;
  }, []);

  // Generic hostname extraction fallback
  const extractHostnameGeneric = useCallback((service: NetworkService): string | null => {
    if (!service.details) return null;

    // Try to extract from service name if it might contain hostname
    if (service.name && !service.name.includes('on port')) {
      const nameParts = service.name.split('(');
      if (nameParts.length > 1) {
        const possibleHostname = nameParts[0].trim();
        if (possibleHostname && possibleHostname !== service.service_type.toUpperCase()) {
          return possibleHostname;
        }
      }
    }

    const details = service.details;
    const lowercaseDetails = details.toLowerCase();

    // Common hostname patterns with case-insensitive lookups
    if (lowercaseDetails.includes('hostname:')) {
      const match = details.match(/[Hh][Oo][Ss][Tt][Nn][Aa][Mm][Ee]:\s*([^\n]+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    } else if (lowercaseDetails.includes('host:')) {
      const match = details.match(/[Hh][Oo][Ss][Tt]:\s*([^\n]+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    } else if (lowercaseDetails.includes('name:')) {
      const match = details.match(/[Nn][Aa][Mm][Ee]:\s*([^\n]+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    } else if (lowercaseDetails.includes('computer name:')) {
      const match = details.match(
        /[Cc][Oo][Mm][Pp][Uu][Tt][Ee][Rr]\s+[Nn][Aa][Mm][Ee]:\s*([^\n]+)/
      );
      if (match && match[1]) {
        return match[1].trim();
      }
    } else if (lowercaseDetails.includes('device name:')) {
      const match = details.match(/[Dd][Ee][Vv][Ii][Cc][Ee]\s+[Nn][Aa][Mm][Ee]:\s*([^\n]+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    } else if (lowercaseDetails.includes('server:')) {
      const match = details.match(/[Ss][Ee][Rr][Vv][Ee][Rr]:\s*([^\n]+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }, []);

  // Update the IP-to-hostname map whenever services change
  useEffect(() => {
    const newMap = { ...ipToHostnameMap };
    let hasChanges = false;

    // Group services by IP for better extraction
    const servicesByIp = new Map<string, NetworkService[]>();

    services.forEach(service => {
      // Handle multicast IPs specially
      if (isMulticastIP(service.address)) {
        if (!newMap[service.address]) {
          newMap[service.address] = '[Multicast]';
          hasChanges = true;
        }
        return;
      }

      const ipServices = servicesByIp.get(service.address) || [];
      ipServices.push(service);
      servicesByIp.set(service.address, ipServices);
    });

    // Process services by IP address
    for (const [ip, ipServices] of servicesByIp.entries()) {
      // Skip if we already have a hostname for this IP
      if (newMap[ip]) continue;

      // First try mDNS services which usually have the most reliable hostnames
      const mdnsServices = ipServices.filter(
        s => s.discovery_method && s.discovery_method.toLowerCase() === 'mdns'
      );

      for (const mdnsService of mdnsServices) {
        const hostname = extractHostnameFromMdns(mdnsService);
        if (hostname) {
          newMap[ip] = hostname;
          hasChanges = true;
          break;
        }
      }

      // If no hostname from mDNS, try UPnP services
      if (!newMap[ip]) {
        const upnpServices = ipServices.filter(
          s => s.discovery_method && s.discovery_method.toLowerCase() === 'upnp'
        );

        for (const upnpService of upnpServices) {
          const hostname = extractHostnameFromUpnp(upnpService);
          if (hostname) {
            newMap[ip] = hostname;
            hasChanges = true;
            break;
          }
        }
      }

      // If still no hostname, try generic extraction from any service
      if (!newMap[ip]) {
        for (const service of ipServices) {
          const hostname = extractHostnameGeneric(service);
          if (hostname) {
            newMap[ip] = hostname;
            hasChanges = true;
            break;
          }
        }
      }
    }

    // Update the map if changes were made
    if (hasChanges) {
      setIpToHostnameMap(newMap);
    }
  }, [
    services,
    extractHostnameFromMdns,
    extractHostnameFromUpnp,
    extractHostnameGeneric,
    ipToHostnameMap,
  ]);

  // Get hostname for an IP address
  const getHostname = useCallback(
    (ip: string): string | null => {
      return ipToHostnameMap[ip] || null;
    },
    [ipToHostnameMap]
  );

  return {
    ipToHostnameMap,
    getHostname,
  };
}
