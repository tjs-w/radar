import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import backendService from '../../services/backendService';
import debug from '../../services/debugLogger';
import Button from '../common/Button';
import Icon from '../common/Icon';

// Custom event dispatch for scanning state
const dispatchScanEvent = (scanning: boolean): void => {
  console.warn(`🔥 CREATING CUSTOM EVENT radar-scan-status-change with scanning=${scanning}`);

  const event = new CustomEvent('radar-scan-status-change', {
    detail: { scanning },
  });

  try {
    window.dispatchEvent(event);
    console.warn(
      `✅ SUCCESSFULLY DISPATCHED EVENT radar-scan-status-change with scanning=${scanning}`
    );
  } catch (error) {
    console.error('❌ ERROR DISPATCHING EVENT:', error);
  }

  debug.log('events', `Dispatching scan event: ${scanning ? 'start' : 'stop'}`);
};

export interface ScanButtonProps {
  className?: string;
  onScanToggle?: (isScanning: boolean) => void;
}

// Animations
const scan = keyframes`
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

const pulse = keyframes`
  0% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
`;

// Styled wrapper for scan animation effect
const ScanButtonWrapper = styled.div<{ $scanning: boolean }>`
  position: relative;
  overflow: hidden;
  border-radius: var(--border-radius);
  width: fit-content;

  ${props =>
    props.$scanning &&
    `
    &::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.2),
        transparent
      );
      animation: ${scan} 1.5s infinite;
      pointer-events: none;
    }
  `}
`;

// Radar icon animation
const AnimatedIcon = styled.div<{ $scanning: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${props => (props.$scanning ? `${pulse} 2s infinite` : 'none')};
`;

const CompactButton = styled(Button)`
  padding: 4px 10px;
  height: 28px;
`;

const ScanButton: React.FC<ScanButtonProps> = ({ className = '', onScanToggle }) => {
  const [isScanning, setIsScanning] = useState(false);

  // Reference to timeout to ensure it can be cleared
  const timeoutRef = useRef<number | null>(null);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        debug.log('components', 'ScanButton unmounting - clearing timeout');
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Set up scanning state and notify via global event
  const setScanningState = (scanning: boolean) => {
    debug.log('events', `Setting scanning state to: ${scanning}`, {
      timestamp: new Date().toISOString(),
    });
    setIsScanning(scanning);

    // Call the prop callback
    if (onScanToggle) {
      debug.log('events', `Calling onScanToggle(${scanning})`);
      onScanToggle(scanning);
    }

    // Dispatch global event
    dispatchScanEvent(scanning);
  };

  const handleScan = async () => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      debug.log('events', 'Clearing existing timeout');
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // If already scanning, stop scan
    if (isScanning) {
      debug.log('events', 'Stopping scan manually', {
        timestamp: new Date().toISOString(),
      });
      setScanningState(false);
      return;
    }

    debug.log('events', 'Starting scan', {
      timestamp: new Date().toISOString(),
    });
    setScanningState(true);

    try {
      await backendService.startNetworkScan();
      debug.log('network', 'Network scan completed successfully');
    } catch (error) {
      debug.error('network', 'Error running network scan', error);
      // Immediately end scanning state on error
      debug.log('events', 'Setting scanning to false due to error');
      setScanningState(false);
    } finally {
      // Set timeout to end scanning
      debug.log('events', 'Setting timeout to end scanning in 5000ms');
      timeoutRef.current = window.setTimeout(() => {
        debug.log('events', 'Timeout fired - ending scan state', {
          timestamp: new Date().toISOString(),
        });
        setScanningState(false);
        timeoutRef.current = null;
      }, 5000); // 5 second timeout
    }
  };


  return (
    <ScanButtonWrapper $scanning={isScanning} className={className}>
      <CompactButton
        variant={isScanning ? "success" : "primary"} // Change color during scanning
        size="sm"
        icon={
          <AnimatedIcon $scanning={isScanning}>
            <Icon name="sync" type="material" size="sm" />
          </AnimatedIcon>
        }
        onClick={handleScan}
        disabled={isScanning}
      >
        {isScanning ? 'Scanning...' : 'Scan'}
      </CompactButton>
    </ScanButtonWrapper>
  );
};

export default ScanButton;
