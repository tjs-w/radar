import React, { ButtonHTMLAttributes, ReactNode } from "react";
import styled, { css } from "styled-components";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  isLoading?: boolean;
  isFullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

const getVariantStyles = (variant: string) => {
  switch (variant) {
    case "primary":
      return css`
        background: linear-gradient(
          135deg,
          var(--primary-color),
          var(--primary-color-hover)
        );
        color: var(--primary-contrast);
        border: none;

        &:hover:not(:disabled) {
          background: linear-gradient(
            135deg,
            var(--primary-color-hover),
            var(--primary-color)
          );
          box-shadow: 0 4px 12px rgba(43, 132, 255, 0.25);
          transform: translateY(-1px);
        }

        &:active:not(:disabled) {
          background: var(--primary-color-hover);
          box-shadow: 0 2px 6px rgba(43, 132, 255, 0.2);
          transform: translateY(0);
        }
      `;
    case "secondary":
      return css`
        background-color: var(--input-bg);
        color: var(--text-secondary);
        border: 1px solid var(--border-color);

        &:hover:not(:disabled) {
          background-color: var(--hover-bg);
          color: var(--text-primary);
          border-color: var(--border-color);
          transform: translateY(-1px);
        }

        &:active:not(:disabled) {
          background-color: var(--hover-bg);
          transform: translateY(0);
        }
      `;
    case "ghost":
      return css`
        background-color: transparent;
        color: var(--text-secondary);
        border: none;

        &:hover:not(:disabled) {
          background-color: var(--hover-bg);
          color: var(--primary-color);
        }

        &:active:not(:disabled) {
          background-color: var(--hover-bg);
        }
      `;
    case "success":
      return css`
        background: linear-gradient(
          135deg,
          var(--success-color),
          var(--success-color-dark)
        );
        color: var(--primary-contrast);
        border: none;

        &:hover:not(:disabled) {
          background: linear-gradient(
            135deg,
            var(--success-color-dark),
            var(--success-color)
          );
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
          transform: translateY(-1px);
        }

        &:active:not(:disabled) {
          background: var(--success-color-dark);
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.2);
          transform: translateY(0);
        }
      `;
    case "warning":
      return css`
        background: linear-gradient(
          135deg,
          var(--warning-color),
          var(--warning-color-dark)
        );
        color: var(--primary-contrast);
        border: none;

        &:hover:not(:disabled) {
          background: linear-gradient(
            135deg,
            var(--warning-color-dark),
            var(--warning-color)
          );
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
          transform: translateY(-1px);
        }

        &:active:not(:disabled) {
          background: var(--warning-color-dark);
          box-shadow: 0 2px 6px rgba(245, 158, 11, 0.2);
          transform: translateY(0);
        }
      `;
    case "error":
      return css`
        background: linear-gradient(
          135deg,
          var(--error-color),
          var(--error-color-dark)
        );
        color: var(--primary-contrast);
        border: none;

        &:hover:not(:disabled) {
          background: linear-gradient(
            135deg,
            var(--error-color-dark),
            var(--error-color)
          );
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
          transform: translateY(-1px);
        }

        &:active:not(:disabled) {
          background: var(--error-color-dark);
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.2);
          transform: translateY(0);
        }
      `;
    default:
      return css``;
  }
};

const getSizeStyles = (size: string) => {
  switch (size) {
    case "sm":
      return css`
        padding: 6px 12px;
        font-size: var(--fs-xs);
        height: 30px;
      `;
    case "lg":
      return css`
        padding: 10px 18px;
        font-size: var(--fs-md);
        height: 42px;
      `;
    default:
      return css`
        padding: 8px 16px;
        font-size: var(--fs-sm);
        height: 36px;
      `;
  }
};

const StyledButton = styled.button<{
  $variant: string;
  $size: string;
  $hasIcon: boolean;
  $iconPosition: string;
  $isFullWidth: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius);
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
  white-space: nowrap;
  width: ${(props) => (props.$isFullWidth ? "100%" : "auto")};

  /* Apply size-specific styles */
  ${(props) => getSizeStyles(props.$size)}

  /* Apply variant-specific styles */
  ${(props) => getVariantStyles(props.$variant)}
  
  /* Icon spacing */
  gap: 8px;

  /* Handle disabled state */
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Loading spinner */
  .spinner {
    animation: spin 1s linear infinite;
    margin-right: ${(props) => (props.children ? "8px" : "0")};
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const IconWrapper = styled.span<{ position: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  order: ${(props) => (props.position === "left" ? -1 : 1)};
`;

const LoadingSpinner = () => (
  <svg
    className="spinner"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="60"
      strokeDashoffset="20"
    />
  </svg>
);

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  isLoading = false,
  isFullWidth = false,
  className = "",
  children,
  ...props
}) => {
  return (
    <StyledButton
      $variant={variant}
      $size={size}
      $hasIcon={!!icon}
      $iconPosition={iconPosition}
      $isFullWidth={isFullWidth}
      className={className}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <LoadingSpinner />}
      {!isLoading && icon && (
        <IconWrapper position={iconPosition}>{icon}</IconWrapper>
      )}
      {children}
    </StyledButton>
  );
};

export default Button;
