// This service provides the interface for communicating with the Tauri backend
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { DNSServer, LocationInfo, NetworkService, PublicNetworkInfo } from '../types/network';
import logger from '../utils/logger';

// Define the events that can be received from Tauri
export interface ScanProgressEvent {
  progress: number;
}

export interface ScanErrorEvent {
  error: string;
}

// Interface to match the Rust backend structure
interface RustPublicNetworkInfo {
  ip?: string;
  ipv6?: string;
  internet_available?: boolean;
  asn?: string;
  isp?: string;
  org?: string;
  hostname?: string;
  local_hostname?: string;
  dns?: string[];
  location?: {
    city?: string;
    region?: string;
    country?: string;
    postal?: string;
    timezone?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };
  is_vpn?: boolean;
  is_proxy?: boolean;
  is_hosting?: boolean;
}

// Interface for scan listeners
export interface ScanListeners {
  onServiceDiscovered?: (service: NetworkService) => void;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

// Singleton class to manage Tauri backend communication
class BackendService {
  private static instance: BackendService;
  private listenerCleanupFunctions: (() => void)[] = [];

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): BackendService {
    if (!BackendService.instance) {
      BackendService.instance = new BackendService();
    }
    return BackendService.instance;
  }

  // Set up listeners for scan events
  public async setupScanListeners(listeners: ScanListeners): Promise<void> {
    // Clean up any existing listeners
    this.cleanupListeners();
    logger.debug('====================================');
    logger.debug('Setting up scan event listeners...');

    // Remove universal debug event listener

    // Setting up service-discovered listeners
    if (listeners.onServiceDiscovered) {
      logger.debug("Setting up 'service-discovered' listener");
      try {
        const unlistenService = await listen<NetworkService>('service-discovered', event => {
          logger.debug('====================================');
          logger.debug("🔎 Received 'service-discovered' event:", {
            name: event.payload.name,
            type: event.payload.service_type,
            method: event.payload.discovery_method,
            address: event.payload.address,
            port: event.payload.port,
          });
          logger.debug('Raw event payload:', JSON.stringify(event.payload));

          if (listeners.onServiceDiscovered) {
            try {
              listeners.onServiceDiscovered(event.payload);
              logger.debug('✅ Successfully processed service-discovered event');
            } catch (error) {
              logger.error('❌ Error in onServiceDiscovered callback:', error as Error);
            }
          }
        });
        logger.debug("✅ Successfully set up 'service-discovered' listener");
        this.listenerCleanupFunctions.push(unlistenService);

        // TRY ALTERNATIVE EVENT NAME FORMATS
        logger.debug('Setting up alternative event name formats as a test...');

        // Try camelCase format
        const unlistenServiceCamel = await listen<NetworkService>('serviceDiscovered', event => {
          logger.debug("🔎 Received 'serviceDiscovered' (camelCase) event:", event.payload);
          listeners.onServiceDiscovered?.(event.payload);
        });
        this.listenerCleanupFunctions.push(unlistenServiceCamel);

        // Try underscore format
        const unlistenServiceUnderscore = await listen<NetworkService>(
          'service_discovered',
          event => {
            logger.debug("🔎 Received 'service_discovered' (underscore) event:", event.payload);
            listeners.onServiceDiscovered?.(event.payload);
          }
        );
        this.listenerCleanupFunctions.push(unlistenServiceUnderscore);
      } catch (error) {
        logger.error("❌ Failed to set up 'service-discovered' listener:", error as Error);
      }
    }

    if (listeners.onProgress) {
      logger.debug("Setting up 'scan-progress' listener");
      const unlistenProgress = await listen<ScanProgressEvent>('scan-progress', event => {
        logger.debug("🔍 Received 'scan-progress' event:", event.payload);
        if (listeners.onProgress) {
          try {
            listeners.onProgress(event.payload.progress);
            logger.debug('✅ Successfully processed scan-progress event');
          } catch (error) {
            logger.error('❌ Error in onProgress callback:', error as Error);
          }
        }
      });
      this.listenerCleanupFunctions.push(unlistenProgress);
    }

    if (listeners.onComplete) {
      logger.debug("Setting up 'scan-complete' listener");
      const unlistenComplete = await listen('scan-complete', () => {
        logger.debug("🔍 Received 'scan-complete' event");
        if (listeners.onComplete) {
          try {
            listeners.onComplete();
            logger.debug('✅ Successfully processed scan-complete event');
          } catch (error) {
            logger.error('❌ Error in onComplete callback:', error as Error);
          }
        }
      });
      this.listenerCleanupFunctions.push(unlistenComplete);
    }

    if (listeners.onError) {
      logger.debug("Setting up 'scan-error' listener");
      const unlistenError = await listen<ScanErrorEvent>('scan-error', event => {
        logger.debug("🔍 Received 'scan-error' event:", event.payload);
        if (listeners.onError) {
          try {
            listeners.onError(event.payload.error);
            logger.debug('✅ Successfully processed scan-error event');
          } catch (error) {
            logger.error('❌ Error in onError callback:', error as Error);
          }
        }
      });
      this.listenerCleanupFunctions.push(unlistenError);
    }

    logger.debug(
      `✅ Setup complete. Registered ${this.listenerCleanupFunctions.length} listeners.`
    );
  }

  // Clean up all listeners
  public cleanupListeners(): void {
    logger.debug(`Cleaning up ${this.listenerCleanupFunctions.length} listeners`);
    this.listenerCleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        logger.error('Error cleaning up listener:', error as Error);
      }
    });
    this.listenerCleanupFunctions = [];
    logger.debug('All listeners cleaned up');
  }

  // Start a network scan
  public async startNetworkScan(): Promise<void> {
    try {
      await invoke('run_network_scan');
    } catch (error: any) {
      logger.error('Failed to start network scan:', error as Error);
      throw error;
    }
  }

  // Stop an ongoing network scan
  public async stopNetworkScan(): Promise<void> {
    try {
      await invoke('stop_network_scan');
    } catch (error: any) {
      logger.error('Failed to stop network scan:', error as Error);
      throw error;
    }
  }

  // Fetch public network information
  public async getPublicNetworkInfo(): Promise<PublicNetworkInfo> {
    try {
      // Get the raw data from the Rust backend
      const rustInfo = await invoke<RustPublicNetworkInfo>('get_public_network_info');
      logger.debug('Raw public network info from Rust:', rustInfo);

      // Convert to the TypeScript expected format
      const mappedInfo: PublicNetworkInfo = {
        // Set internet_available to true if we have an IP
        internet_available:
          typeof rustInfo.internet_available === 'boolean'
            ? rustInfo.internet_available
            : !!rustInfo.ip,

        // Map IP fields
        public_ip: rustInfo.ip,
        ipv6: rustInfo.ipv6,

        // Map network provider info
        isp: rustInfo.isp,
        org: rustInfo.org,
        asn: rustInfo.asn,

        // Map security flags
        is_vpn: rustInfo.is_vpn,
        is_proxy: rustInfo.is_proxy,
        is_hosting: rustInfo.is_hosting,
      };

      // Map location if present
      if (rustInfo.location) {
        const locationInfo: LocationInfo = {
          country: rustInfo.location.country || 'Unknown',
          country_code: '', // Not available in the Rust response
        };

        // Add optional location fields if present
        if (rustInfo.location.region) locationInfo.region = rustInfo.location.region;
        if (rustInfo.location.city) locationInfo.city = rustInfo.location.city;
        if (rustInfo.location.timezone) locationInfo.timezone = rustInfo.location.timezone;

        // Add coordinates if present
        if (rustInfo.location.coordinates) {
          locationInfo.latitude = rustInfo.location.coordinates.latitude;
          locationInfo.longitude = rustInfo.location.coordinates.longitude;
        }

        mappedInfo.location = locationInfo;
      }

      // Map DNS servers if present
      if (rustInfo.dns && rustInfo.dns.length > 0) {
        mappedInfo.dns_servers = rustInfo.dns.map(address => {
          const server: DNSServer = { address };
          return server;
        });
      }

      logger.debug('Mapped network info for frontend:', mappedInfo);
      return mappedInfo;
    } catch (error: any) {
      logger.error('Failed to fetch public network information:', error as Error);
      throw error;
    }
  }

  // No longer supporting saved network services
}

export default BackendService.getInstance();
