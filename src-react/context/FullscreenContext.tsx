import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import logger from '../utils/logger';

interface FullscreenContextType {
  isFullscreen: boolean;
  toggleFullscreen: () => Promise<void>;
}

const FullscreenContext = createContext<FullscreenContextType | undefined>(undefined);

interface FullscreenProviderProps {
  children: ReactNode;
}

export function FullscreenProvider({ children }: FullscreenProviderProps) {
  // The pattern (maintaining state + syncing with native functionality)
  // follows React best practices by:
  // 1. Lifting state up to the parent component (context)
  // 2. Abstracting platform-specific API calls
  // 3. Providing a clean, synchronous API for components to consume
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Check fullscreen state on mount
  useEffect(() => {
    const checkFullscreen = async () => {
      try {
        const appWindow = await getCurrentWebviewWindow();
        const isFs = await appWindow.isFullscreen();
        setIsFullscreen(isFs);
      } catch (err) {
        logger.error('Failed to check fullscreen state', err as Error);
      }
    };

    checkFullscreen();
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      const appWindow = await getCurrentWebviewWindow();
      const newState = !isFullscreen;

      // Set fullscreen state for better UI responsiveness
      setIsFullscreen(newState);

      // Use Tauri's native window management API
      await appWindow.setFullscreen(newState);
    } catch (err) {
      logger.error('Error toggling fullscreen', err as Error);
      // Revert state if there was an error
      setIsFullscreen(isFullscreen);
    }
  }, [isFullscreen]);

  return (
    <FullscreenContext.Provider value={{ isFullscreen, toggleFullscreen }}>
      {children}
    </FullscreenContext.Provider>
  );
}

// Custom hook for accessing the fullscreen context
export function useFullscreen() {
  const context = useContext(FullscreenContext);

  if (context === undefined) {
    throw new Error('useFullscreen must be used within a FullscreenProvider');
  }

  return context;
}

export default FullscreenContext;
