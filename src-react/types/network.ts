// Debug comment:
// The NetworkService interface defines the structure of services discovered on the local network
// It must match the structure sent from Rust backend for proper type checking
// The required properties are: name, address, port, service_type
// Optional properties include: discovery_method, details, is_secure, response_time
export interface NetworkService {
  name: string;
  address: string;
  port?: number; // Changed from required to optional to match Rust Option<u16>
  service_type: string;
  discovery_method?: string;
  details?: string;
  is_secure?: boolean;
  response_time?: number;
}

export interface LocationInfo {
  country: string;
  country_code: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface DNSServer {
  address: string;
  name?: string;
  provider?: string;
}

export interface PublicNetworkInfo {
  internet_available: boolean;
  public_ip?: string;
  ipv6?: string;
  isp?: string;
  org?: string;
  asn?: string;
  is_vpn?: boolean;
  is_proxy?: boolean;
  is_hosting?: boolean;
  location?: LocationInfo;
  dns_servers?: DNSServer[];
  error?: string;
}
