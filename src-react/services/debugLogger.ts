/**
 * Simple debug logger for Radar application
 * This replaces the more complex LoggingService with a straightforward debugging utility
 */

// Simple flag to enable/disable all debug logging
const DEBUG_ENABLED = process.env.NODE_ENV !== "production";

// Specific component/feature flags - all true when debug is enabled
const DEBUG_FLAGS = {
  radar: true, // Radar animation related logs
  network: true, // Network scanning logs
  components: true, // Component lifecycle logs
  events: true, // Event handling logs
};

// Force debug to be enabled during troubleshooting
const FORCE_DEBUG = true;

/**
 * Debug logger utility
 */
const debug = {
  /**
   * Log a debug message if debugging is enabled
   */
  log(
    area: keyof typeof DEBUG_FLAGS | "general",
    message: string,
    data?: any
  ): void {
    // Track each call for troubleshooting
    console.warn(
      `DEBUG CALLED: area=${area}, message=${message.substring(0, 30)}`
    );

    // Skip if debugging is disabled globally (unless forced)
    if (!DEBUG_ENABLED && !FORCE_DEBUG) return;

    // For general logs, always show if debug is enabled
    if (area === "general") {
      const logMessage = data ? `[DEBUG] ${message}` : `[DEBUG] ${message}`;

      console.log(logMessage, data || "");
      return;
    }

    // For specific areas, check the area flag
    if (DEBUG_FLAGS[area]) {
      const logMessage = data
        ? `[DEBUG:${area}] ${message}`
        : `[DEBUG:${area}] ${message}`;

      console.log(logMessage, data || "");
    }
  },

  /**
   * Log error messages (these are always shown)
   */
  error(area: string, message: string, error?: any): void {
    const logMessage = `[ERROR:${area}] ${message}`;
    console.error(logMessage, error || "");
  },

  /**
   * Enable debugging for a specific area
   */
  enable(area: keyof typeof DEBUG_FLAGS): void {
    DEBUG_FLAGS[area] = true;
    this.log("general", `Enabled debugging for ${area}`);
  },

  /**
   * Disable debugging for a specific area
   */
  disable(area: keyof typeof DEBUG_FLAGS): void {
    DEBUG_FLAGS[area] = false;
    this.log("general", `Disabled debugging for ${area}`);
  },

  /**
   * Check if debugging is enabled for an area
   */
  isEnabled(area: keyof typeof DEBUG_FLAGS): boolean {
    return DEBUG_ENABLED && DEBUG_FLAGS[area];
  },
};

export default debug;
