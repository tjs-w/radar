import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppState } from '../context/AppContext';
import { default as backendService } from '../services/backendService';
import { showServiceDiscoveredNotification } from '../services/notificationService';
import { NetworkService, PublicNetworkInfo } from '../types/network';
import logger from '../utils/logger';

// Maximum scan duration in milliseconds (15 seconds)
const MAX_SCAN_DURATION = 60 * 1000;

export function useBackendService() {
  const { state, dispatch } = useAppState();
  const [scanProgress, setScanProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [scanStartTime, setScanStartTime] = useState<Date | null>(null);
  const scanTimeoutRef = useRef<number | null>(null);

  // Set up event listeners for scan progress and service discovery
  useEffect(() => {
    const setupListeners = async () => {
      await backendService.setupScanListeners({
        // Handle discovered services
        onServiceDiscovered: (service: NetworkService) => {
          logger.debug('Received service', {
            name: service.name,
            type: service.service_type,
            address: service.address,
            port: service.port,
          });

          dispatch({ type: 'ADD_SERVICE', service });

          // Notify of new service
          showServiceDiscoveredNotification(service.name, service.service_type, service.address);
        },

        // Handle scan progress
        onProgress: (progress: number) => {
          logger.debug('Scan progress update', { progress });
          setScanProgress(progress);
        },

        // Handle scan completion
        onComplete: handleComplete,

        // Handle scan errors
        onError: handleError,
      });
    };

    setupListeners();

    return () => {
      backendService.cleanupListeners();
    };
  }, [dispatch]);

  // Safety mechanism: if a scan is running for too long, stop it automatically
  useEffect(() => {
    // If scanning started, set up a safety timeout
    if (state.isScanning && scanStartTime) {
      // Clear any existing timeout first
      if (scanTimeoutRef.current !== null) {
        window.clearTimeout(scanTimeoutRef.current);
      }

      // Set a new timeout to force stop after MAX_SCAN_DURATION
      scanTimeoutRef.current = window.setTimeout(() => {
        logger.warn(
          `Scan exceeded maximum duration of ${MAX_SCAN_DURATION / 1000}s, force stopping`
        );
        stopNetworkScan();
      }, MAX_SCAN_DURATION);
    } else {
      // Not scanning, clear any timeout
      if (scanTimeoutRef.current !== null) {
        window.clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
    }

    return () => {
      if (scanTimeoutRef.current !== null) {
        window.clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
    };
  }, [state.isScanning, scanStartTime]);

  const handleComplete = useCallback(() => {
    logger.debug('Scan completed');
    const endTime = new Date();
    const startTime = scanStartTime || endTime;
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;

    logger.debug('Dispatching STOP_SCAN action', { duration });
    dispatch({ type: 'STOP_SCAN' });
    setScanProgress(100);
  }, [dispatch, scanStartTime]);

  const handleError = useCallback(
    (errorMessage: string) => {
      logger.error('Scan error', new Error(errorMessage));
      setError(errorMessage);
      logger.debug('Dispatching STOP_SCAN action due to error');
      dispatch({ type: 'STOP_SCAN' });
      setScanProgress(0);
    },
    [dispatch]
  );

  // Start a network scan
  const startNetworkScan = useCallback(async () => {
    try {
      logger.debug('Starting network scan');
      setError(null);
      setScanProgress(0);
      dispatch({ type: 'START_SCAN' });
      setScanStartTime(new Date());
      await backendService.startNetworkScan();
    } catch (err: any) {
      logger.error('Error starting network scan', err as Error);
      setError(err instanceof Error ? err.message : String(err));
      dispatch({ type: 'STOP_SCAN' });
    }
  }, [dispatch]);

  // Stop an ongoing network scan
  const stopNetworkScan = useCallback(async () => {
    try {
      logger.debug('Attempting to stop network scan');
      await backendService.stopNetworkScan();
      dispatch({ type: 'STOP_SCAN' });
      setScanProgress(0);
      setScanStartTime(null);
    } catch (err: any) {
      logger.error('Error stopping network scan', err as Error);
      setError(err instanceof Error ? err.message : String(err));
      dispatch({ type: 'STOP_SCAN' });
    }
  }, [dispatch]);

  // Fetch public network information with retry logic
  const fetchPublicNetworkInfo = useCallback(async () => {
    try {
      logger.debug('Fetching public network information');
      const info = await backendService.getPublicNetworkInfo();
      logger.debug('Public network info received', { info });

      if (!info) {
        // If we get null or undefined, create a fallback object
        logger.warn('Public network info is null or undefined, using fallback');
        const fallbackInfo: PublicNetworkInfo = {
          internet_available: navigator.onLine,
          public_ip: 'Unavailable',
        };
        dispatch({ type: 'SET_PUBLIC_INFO', info: fallbackInfo });
        return fallbackInfo;
      }

      // Initialize internet_available if not set
      if (info.internet_available === undefined) {
        info.internet_available = !!info.public_ip;
      }

      dispatch({ type: 'SET_PUBLIC_INFO', info });
      return info;
    } catch (err: any) {
      logger.error('Error fetching public network information', err as Error);
      const errorMessage = err.message || 'Failed to fetch public network information';
      setError(errorMessage);

      // Create a fallback object with error state
      const fallbackInfo: PublicNetworkInfo = {
        internet_available: false,
        error: errorMessage,
      };
      dispatch({ type: 'SET_PUBLIC_INFO', info: fallbackInfo });
      return fallbackInfo;
    }
  }, [dispatch]);

  // Automatically retry fetching network info if it failed
  useEffect(() => {
    if (
      state.publicNetworkInfo === null ||
      (state.publicNetworkInfo && !state.publicNetworkInfo.internet_available)
    ) {
      const retryInterval = setInterval(() => {
        logger.debug('Retrying to fetch public network information');
        fetchPublicNetworkInfo();
      }, 10000); // Retry every 10 seconds

      return () => clearInterval(retryInterval);
    }
  }, [state.publicNetworkInfo, fetchPublicNetworkInfo]);

  // Load previously saved services
  const loadSavedServices = useCallback(async () => {
    // Return empty array - persistence not needed
    return [];
  }, []);

  return {
    services: state.services,
    publicNetworkInfo: state.publicNetworkInfo,
    isScanning: state.isScanning,
    scanProgress,
    error,
    startNetworkScan,
    stopNetworkScan,
    fetchPublicNetworkInfo,
    loadSavedServices,
  };
}
