// This service handles system notifications using Tauri's notification plugin
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import logger from '../utils/logger';

export interface NotificationOptions {
  title?: string;
  body: string;
  icon?: string;
}

/**
 * Show a system notification
 * @returns Promise<boolean> whether the notification was shown
 */
export async function showSystemNotification({
  title = 'Radar',
  body,
  icon,
}: NotificationOptions): Promise<boolean> {
  try {
    // Check if we have permission to show notifications
    let permissionGranted = await isPermissionGranted();

    // If not, request permission
    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === 'granted';
    }

    // If we have permission, show the notification
    if (permissionGranted) {
      await sendNotification({
        title,
        body,
        icon: icon || 'icon.png',
      });
      return true;
    }

    return false;
  } catch (error) {
    logger.warn('Notifications not available - plugin may be disabled', error as Error);
    return false;
  }
}

/**
 * Show a notification when a new network service is discovered
 */
export async function showServiceDiscoveredNotification(
  serviceName: string,
  serviceType: string,
  address: string
): Promise<boolean> {
  return showSystemNotification({
    title: 'New Network Service Discovered',
    body: `${serviceName} (${serviceType}) at ${address}`,
  });
}

/**
 * Show a notification when a scan is complete
 */
export async function showScanCompleteNotification(
  serviceCount: number,
  scanDuration: number
): Promise<boolean> {
  return showSystemNotification({
    title: 'Network Scan Complete',
    body: `Found ${serviceCount} services in ${scanDuration.toFixed(1)} seconds`,
  });
}

/**
 * Show a notification when a scan error occurs
 */
export async function showScanErrorNotification(error: string): Promise<boolean> {
  return showSystemNotification({
    title: 'Network Scan Error',
    body: error,
  });
}

export const showNotification = async (title: string, body: string) => {
  try {
    await sendNotification({ title, body });
  } catch (error) {
    logger.warn('Notifications not available - plugin may be disabled', error as Error);
  }
};
