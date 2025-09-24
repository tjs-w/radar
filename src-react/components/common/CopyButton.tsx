import React, { useState } from "react";
import styled from "styled-components";

interface CopyButtonProps {
  textToCopy: string;
  tooltip?: string;
}

const Button = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  svg {
    width: 14px;
    height: 14px;
    fill: var(--text-secondary);
    transition: fill 0.2s;
  }

  &:hover svg {
    fill: var(--primary);
  }
`;

const TooltipContainer = styled.span<{ visible: boolean }>`
  position: absolute;
  bottom: -28px;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--card-bg-darker);
  color: var(--text-primary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  white-space: nowrap;
  opacity: ${(props) => (props.visible ? 1 : 0)};
  transition: opacity 0.2s;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
`;

const CopyButton: React.FC<CopyButtonProps> = ({
  textToCopy,
  tooltip = "Copy to clipboard",
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipText, setTooltipText] = useState(tooltip);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setTooltipText("Copied!");
      setShowTooltip(true);
      setTimeout(() => {
        setShowTooltip(false);
        setTimeout(() => {
          setTooltipText(tooltip);
        }, 200);
      }, 1500);
    } catch (err) {
      setTooltipText("Failed to copy");
      setShowTooltip(true);
      setTimeout(() => {
        setShowTooltip(false);
        setTimeout(() => {
          setTooltipText(tooltip);
        }, 200);
      }, 1500);
    }
  };

  return (
    <Button
      onClick={handleCopy}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => {
        if (tooltipText === tooltip) {
          setShowTooltip(false);
        }
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
      </svg>
      <TooltipContainer visible={showTooltip}>{tooltipText}</TooltipContainer>
    </Button>
  );
};

export default CopyButton;
