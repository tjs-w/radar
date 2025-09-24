import React from "react";
import styled from "styled-components";
import { useTheme } from "../../context/ThemeContext";
import Icon from "./Icon";

const ToggleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: var(--border-radius-sm);
  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover {
    background-color: var(--hover-bg);
    color: var(--text-primary);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--primary-color);
  }
`;

const StyledIcon = styled(Icon)`
  transition: transform 0.3s ease;

  ${ToggleButton}:hover & {
    transform: rotate(30deg);
  }
`;

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <ToggleButton
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      <StyledIcon name={theme === "light" ? "dark_mode" : "light_mode"} />
    </ToggleButton>
  );
};

export default ThemeToggle;
