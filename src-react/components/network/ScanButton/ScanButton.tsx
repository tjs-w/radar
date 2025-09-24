import React from "react";
import styled, { css, keyframes } from "styled-components";
import Icon from "../../common/Icon";

export interface ScanButtonProps {
  onClick: () => void;
  isScanning: boolean;
  type?: "default" | "unified";
  className?: string;
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
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
  100% {
    opacity: 0.5;
    transform: scale(1);
  }
`;

const radarSpin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

// Default button styles
const Button = styled.button<{ $scanning: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #4191ff;
  color: #ffffff;
  border: none;
  border-radius: var(--border-radius);
  padding: 6px 12px;
  font-size: var(--fs-sm);
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    background-color: #5ba2ff;
  }

  &:active {
    transform: scale(0.98);
  }
`;

const ButtonContent = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 1;
`;

const ButtonIcon = styled(Icon)<{ $scanning: boolean }>`
  transition: transform 0.3s ease;

  ${(props) =>
    props.$scanning &&
    css`
      animation: ${radarSpin} 2s infinite linear;
    `}
`;

const Text = styled.span`
  white-space: nowrap;
`;

const Spinner = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SpinnerInner = styled.div`
  width: 100%;
  height: 100%;
  border-radius: var(--border-radius);
  opacity: 0.2;
  background-color: #ffffff;
  animation: ${scan} 2s infinite ease-in-out;
`;

// Unified button styles
const UnifiedButton = styled.button<{ $scanning: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${(props) => (props.$scanning ? "#34d399" : "#4191ff")};
  color: #ffffff;
  border: none;
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  border-radius: 50%;
  padding: 0;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease,
    box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

  &:hover {
    background-color: ${(props) => (props.$scanning ? "#10b981" : "#5ba2ff")};
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.25);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const UnifiedIcon = styled(Icon)<{ $scanning: boolean }>`
  z-index: 1;
  font-size: 14px;

  ${(props) =>
    !props.$scanning &&
    css`
      animation: ${radarSpin} 6s infinite linear;
    `}
`;

const UnifiedSpinner = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const UnifiedSpinnerInner = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  opacity: 0.03;
  background-color: #ffffff;
  animation: ${pulse} 1.5s infinite ease-in-out;
`;

const ScanButton: React.FC<ScanButtonProps> = ({
  onClick,
  isScanning,
  type = "default",
  className = "",
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isScanning) {
      console.log(
        "🛑 [ScanButton] Manual stop requested",
        new Date().toISOString()
      );
      onClick();
    } else {
      onClick();
    }
  };

  // Default button with text
  if (type === "default") {
    return (
      <Button
        type="button"
        $scanning={isScanning}
        className={className}
        onClick={handleClick}
        disabled={isScanning}
        aria-label={isScanning ? "Stop scanning" : "Start network scan"}
      >
        <ButtonContent>
          <ButtonIcon name={"radar"} $scanning={isScanning} />
          <Text>{isScanning ? "Scanning..." : "Scan Network"}</Text>
        </ButtonContent>

        {isScanning && (
          <Spinner>
            <SpinnerInner />
          </Spinner>
        )}
      </Button>
    );
  }

  // Unified button - just icon that transforms to stop button when scanning
  return (
    <UnifiedButton
      type="button"
      $scanning={isScanning}
      className={className}
      onClick={handleClick}
      aria-label={isScanning ? "Stop scanning" : "Start network scan"}
      title={isScanning ? "Stop scanning" : "Start network scan"}
    >
      <UnifiedIcon
        name={isScanning ? "stop" : "radar"}
        $scanning={isScanning}
      />

    </UnifiedButton>
  );
};

export default ScanButton;
