import React, { useState } from 'react';
import styled from 'styled-components';
import logger from '../../utils/logger';
import Icon from './Icon';

export interface InfoRowProps {
  label: string;
  value: string | number | undefined | null;
  icon?: string;
  iconType?: 'material' | 'custom';
  copyable?: boolean;
  className?: string;
  valueClassName?: string;
  labelClassName?: string;
  isLink?: boolean;
  onClick?: () => void;
  isPublicIP?: boolean;
}

const Row = styled.div<{ copyable: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: var(--fs-sm);
  border-bottom: 1px solid var(--border-color-light);
  ${props =>
    props.copyable &&
    `
    cursor: pointer;
    
    &:hover {
      background-color: var(--hover-bg);
    }
  `}

  &:last-child {
    border-bottom: none;
  }
`;

const LabelSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  min-width: 0;
`;

const IconContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
`;

const Label = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ValueSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 16px;
  text-align: right;
  min-width: 0;
`;

const Value = styled.span<{ isLink?: boolean }>`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  font-weight: 500;
  color: var(--text-primary);
  text-align: right;

  ${props =>
    props.isLink &&
    `
    color: var(--primary-color);
    cursor: pointer;
    text-decoration: underline;
    
    &:hover {
      color: var(--primary-hover);
    }
  `}

  &.highlight-value {
    font-weight: 600;
    color: var(--primary-color, #4191ff);
    letter-spacing: 0.02em;
  }
`;

const PublicIPValue = styled.span`
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Menlo', 'Consolas', monospace;
  background: rgba(51, 102, 204, 0.1);
  color: #3366cc;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 1.1em;
  font-weight: 500;
  letter-spacing: 0.5px;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ProtocolValue = styled.span`
  color: var(--primary-color, #4191ff);
  font-weight: 600;
  letter-spacing: 0.02em;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CopyButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition:
    opacity 0.2s ease,
    color 0.2s ease;
  color: var(--text-tertiary);

  ${Row}:hover & {
    opacity: 0.5;
  }

  &:hover {
    opacity: 1 !important;
    color: var(--text-primary);
  }
`;

const InfoRow: React.FC<InfoRowProps> = ({
  label,
  value,
  icon,
  iconType = 'material',
  copyable = false,
  className = '',
  valueClassName = '',
  labelClassName = '',
  isLink = false,
  onClick,
  isPublicIP = false,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  // Handle undefined, null, or empty values
  const displayValue =
    value !== undefined && value !== null && value !== '' ? value.toString() : '';

  // Check if this is a protocol/device field
  const isProtocolField =
    label.toLowerCase() === 'protocol' || valueClassName.includes('highlight-value');

  const handleCopy = async (e?: React.MouseEvent) => {
    // Prevent propagation if it's a button click
    if (e) {
      e.stopPropagation();
    }

    if (!copyable || !value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value.toString());
      setIsCopied(true);

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      logger.error('Failed to copy text', error as Error);
    }
  };

  const handleRowClick = () => {
    if (isLink && onClick) {
      onClick();
    } else if (copyable && value) {
      handleCopy();
    }
  };

  return (
    <Row className={className} copyable={copyable && !!value} onClick={handleRowClick}>
      <LabelSection>
        {icon && (
          <IconContainer>
            <Icon name={icon} type={iconType} size="sm" />
          </IconContainer>
        )}
        <Label className={labelClassName}>{label}</Label>
      </LabelSection>

      <ValueSection>
        {isPublicIP ? (
          <PublicIPValue className={valueClassName}>{displayValue}</PublicIPValue>
        ) : isProtocolField ? (
          <ProtocolValue className={valueClassName}>{displayValue}</ProtocolValue>
        ) : (
          <Value
            className={valueClassName}
            isLink={isLink}
            onClick={
              isLink && onClick
                ? e => {
                    e.stopPropagation();
                    onClick();
                  }
                : undefined
            }
          >
            {displayValue}
          </Value>
        )}

        {copyable && value && (
          <CopyButton
            type="button"
            onClick={e => handleCopy(e)}
            aria-label={isCopied ? 'Copied' : 'Copy to clipboard'}
          >
            <Icon
              name={isCopied ? 'check_circle' : 'content_copy'}
              size="sm"
              color={isCopied ? 'var(--success-color, #a6e3a1)' : undefined}
            />
          </CopyButton>
        )}
      </ValueSection>
    </Row>
  );
};

export default InfoRow;
