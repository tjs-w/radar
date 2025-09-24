import { getVersion } from '@tauri-apps/api/app';

// Log levels
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

// Logger configuration
interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
}

// Default configuration based on environment
const isDev = process.env.NODE_ENV === 'development';
const defaultConfig: LoggerConfig = {
  minLevel: isDev ? LogLevel.DEBUG : LogLevel.WARN,
  enableConsole: isDev,
};

let currentConfig = { ...defaultConfig };

// Configure logger
export const configureLogger = (config: Partial<LoggerConfig>) => {
  currentConfig = { ...currentConfig, ...config };
};

// Format message with metadata
const formatMessage = (level: LogLevel, message: string, meta?: any) => {
  const timestamp = new Date().toISOString();
  return {
    timestamp,
    level,
    message,
    ...(meta && { meta }),
  };
};

// Main logging functions
export const logger = {
  debug: (message: string, meta?: any) => {
    if (currentConfig.enableConsole && currentConfig.minLevel === LogLevel.DEBUG) {
      console.debug(formatMessage(LogLevel.DEBUG, message, meta));
    }
  },

  info: (message: string, meta?: any) => {
    if (currentConfig.enableConsole && currentConfig.minLevel <= LogLevel.INFO) {
      console.info(formatMessage(LogLevel.INFO, message, meta));
    }
  },

  warn: (message: string, meta?: any) => {
    if (currentConfig.enableConsole && currentConfig.minLevel <= LogLevel.WARN) {
      console.warn(formatMessage(LogLevel.WARN, message, meta));
    }
  },

  error: (message: string, error?: Error, meta?: any) => {
    if (currentConfig.enableConsole && currentConfig.minLevel <= LogLevel.ERROR) {
      console.error(
        formatMessage(LogLevel.ERROR, message, {
          error: error?.message || error,
          stack: error?.stack,
          ...meta,
        })
      );
    }
  },
};

// Initialize logger with app version
getVersion()
  .then(version => {
    logger.info(`App initialized`, { version });
  })
  .catch(() => {
    logger.warn('Could not retrieve app version');
  });

export default logger;
