import React, { useEffect } from 'react';
import styled from 'styled-components';
import logger from '../../utils/logger';
import Button from '../common/Button';
import Icon from '../common/Icon';
import ScanButton from './ScanButton';

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
  logger.debug('NetworkController rendered');

  useEffect(() => {
    logger.debug('NetworkController - scan toggle', { isScanning: false });
    if (onScanStart) {
      logger.debug('NetworkController - calling onScanStart');
      onScanStart();
    }
  }, [onScanStart]);

  useEffect(() => {
    logger.debug('NetworkController - scan toggle', { isScanning: true });
    if (onScanEnd) {
      logger.debug('NetworkController - calling onScanEnd');
      onScanEnd();
    }
  }, [onScanEnd]);

  const handleScanToggle = (isScanning: boolean) => {
    logger.debug('NetworkController - scan toggle:', isScanning);
    if (isScanning) {
      logger.debug('NetworkController - calling onScanStart');
      if (onScanStart) {
        onScanStart();
      }
    } else {
      logger.debug('NetworkController - calling onScanEnd');
      if (onScanEnd) {
        onScanEnd();
      }
    }
  };

  return (
    <ControllerContainer>
      <ScanButton onScanToggle={handleScanToggle} />
      <Button variant="ghost" size="md" icon={<Icon name="settings" size="md" />}>
        Settings
      </Button>
    </ControllerContainer>
  );
};

export default NetworkController;
