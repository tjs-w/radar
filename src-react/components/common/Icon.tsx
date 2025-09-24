import React from "react";
import styled, { css } from "styled-components";

export interface IconProps {
  name: string;
  type?: "material" | "custom";
  size?: "sm" | "md" | "lg" | "xl";
  color?: string;
  className?: string;
  onClick?: () => void;
}

// Size definitions
const sizeStyles = {
  sm: css`
    font-size: 18px;
    width: 18px;
    height: 18px;
  `,
  md: css`
    font-size: 24px;
    width: 24px;
    height: 24px;
  `,
  lg: css`
    font-size: 32px;
    width: 32px;
    height: 32px;
  `,
  xl: css`
    font-size: 40px;
    width: 40px;
    height: 40px;
  `,
};

const IconBase = styled.span<{
  $size: "sm" | "md" | "lg" | "xl";
  $hasClick: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  transition: color 0.2s ease;
  cursor: ${(props) => (props.$hasClick ? "pointer" : "inherit")};

  ${(props) => sizeStyles[props.$size]}
`;

const Icon: React.FC<IconProps> = ({
  name,
  type = "material",
  size = "md",
  color,
  className = "",
  onClick,
}) => {
  const style = color ? { color } : undefined;
  const hasClick = !!onClick;

  if (type === "material") {
    return (
      <IconBase
        className={`${className} material-symbols-rounded`}
        style={style}
        onClick={onClick}
        $size={size}
        $hasClick={hasClick}
      >
        {name}
      </IconBase>
    );
  }

  // For custom icons, you could use SVGs or another approach
  if (type === "custom") {
    return (
      <IconBase
        className={className}
        style={style}
        onClick={onClick}
        $size={size}
        $hasClick={hasClick}
      >
        {/* You would implement custom icons here, 
            either using an object mapping or importing specific SVGs */}
        {name}
      </IconBase>
    );
  }

  return null;
};

export default Icon;
