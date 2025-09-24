import React from 'react';
import styled from 'styled-components';
import { useAppState } from '../../context/AppContext';
import { useFullscreen } from '../../context/FullscreenContext';
import ScanButton from '../network/ScanButton/ScanButton';

export interface HeaderProps {
  title?: string;
  isScanning?: boolean;
  onScan?: () => void;
}

const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background-color: var(--card-background);
  border-bottom: 1px solid var(--border-color);
  /* Using data-tauri-drag-region attribute instead of -webkit-app-region for better Tauri compatibility */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 2;
  user-select: none;
  cursor: default;
`;

const Title = styled.h1`
  display: flex;
  align-items: center;
  font-size: var(--fs-lg);
  font-weight: 600;
  margin: 0;
  user-select: none;
  gap: 8px;
`;

const RadarLogo = styled.img`
  width: 24px;
  height: 24px;
  object-fit: contain;
`;

const ButtonContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Header: React.FC<HeaderProps> = ({ title = 'radar', isScanning = false, onScan }) => {
  const { state, dispatch } = useAppState();
  const { isScanning: appIsScanning } = state;
  const { toggleFullscreen } = useFullscreen();

  const handleScan = async () => {
    if (appIsScanning) {
      dispatch({ type: 'STOP_SCAN' });
    } else {
      dispatch({ type: 'START_SCAN' });
    }
  };

  return (
    <HeaderContainer data-tauri-drag-region onDoubleClick={toggleFullscreen}>
      <Title data-tauri-drag-region>
        <RadarLogo src="/radar-logo.png" alt="Radar" data-tauri-drag-region />
        <span data-tauri-drag-region>{title}</span>
      </Title>

      {/* Buttons must not be draggable */}
      <ButtonContainer>
        <ScanButton
          onClick={onScan || handleScan}
          isScanning={isScanning || appIsScanning}
          type="unified"
        />
      </ButtonContainer>
    </HeaderContainer>
  );
};

export default Header;
