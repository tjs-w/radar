import React, { useState } from 'react';
import styled from 'styled-components';
import logger from '../../utils/logger';
import Button from '../common/Button';
import Icon from '../common/Icon';
import ScanButton from './ScanButton/ScanButton';

const ControllerContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 4px 0;
`;

export interface NetworkControllerProps {
  onScanStart?: () => void;
  onScanEnd?: () => void;
}

export const NetworkController: React.FC<NetworkControllerProps> = ({ onScanStart, onScanEnd }) => {
  const [isScanning, setIsScanning] = useState(false);
  logger.debug('NetworkController rendered');

  const handleScanClick = () => {
    logger.debug('NetworkController - scan clicked:', !isScanning);

    if (!isScanning) {
      logger.debug('NetworkController - starting scan');
      setIsScanning(true);
      if (onScanStart) {
        onScanStart();
      }
      // Auto-stop after 5 seconds (matching the ScanButton timeout)
      setTimeout(() => {
        logger.debug('NetworkController - auto-stopping scan');
        setIsScanning(false);
        if (onScanEnd) {
          onScanEnd();
        }
      }, 5000);
    } else {
      logger.debug('NetworkController - stopping scan');
      setIsScanning(false);
      if (onScanEnd) {
        onScanEnd();
      }
    }
  };

  return (
    <ControllerContainer>
      <ScanButton onClick={handleScanClick} isScanning={isScanning} />
      <Button variant="ghost" size="md" icon={<Icon name="settings" size="md" />}>
        Settings
      </Button>
    </ControllerContainer>
  );
};

export default NetworkController;
