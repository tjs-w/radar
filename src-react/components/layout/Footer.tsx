import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useAppState } from "../../context/AppContext";
import { useFullscreen } from "../../context/FullscreenContext";
import { useTheme } from "../../context/ThemeContext";
import Icon from "../common/Icon";

interface FooterProps {
  appVersion?: string;
  children?: React.ReactNode;
}

const FooterContainer = styled.footer`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: var(--card-background);
  border-top: 1px solid var(--border-color);
  font-size: var(--fs-xs);
  color: var(--text-tertiary);
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const Item = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Label = styled.span`
  font-weight: 500;
`;

const Value = styled.span`
  color: var(--text-secondary);
`;

const MenuContainer = styled.div`
  position: relative;
`;

const MenuButton = styled.button`
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: var(--fs-xs);
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--border-radius-sm);
  transition: background-color 0.2s ease;

  &:hover {
    background-color: var(--hover-bg);
    color: var(--text-secondary);
  }
`;

const MenuDropdown = styled.div<{ isOpen: boolean }>`
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 4px;
  background-color: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: var(--dropdown-shadow);
  width: 180px;
  display: ${(props) => (props.isOpen ? "block" : "none")};
  z-index: 100;
  overflow: hidden;
`;

const MenuItem = styled.button`
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 8px 12px;
  font-size: var(--fs-sm);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: var(--hover-bg);
  }

  &:not(:last-child) {
    border-bottom: 1px solid var(--border-color-light);
  }
`;

const Footer: React.FC<FooterProps> = ({ children }) => {
  const { state } = useAppState();
  const { services } = state;
  const { theme, toggleTheme } = useTheme();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside the menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  const handleToggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleToggleTheme = () => {
    toggleTheme();
    setIsMenuOpen(false);
  };

  const handleToggleFullscreen = async () => {
    await toggleFullscreen();
    setIsMenuOpen(false);
  };

  // Update the fullscreen menu item text
  const fullscreenText = isFullscreen ? "Exit Fullscreen" : "Fullscreen";
  const fullscreenIcon = isFullscreen ? "fullscreen_exit" : "fullscreen";

  return (
    <FooterContainer>
      <LeftSection>
        <Item>
          <Icon name="devices" size="sm" />
          <Label>Services:</Label>
          <Value>{services.length}</Value>
        </Item>

        {/* Render children if provided */}
        {children}
      </LeftSection>

      <RightSection>
        <MenuContainer ref={menuRef}>
          <MenuButton onClick={handleToggleMenu} aria-label="Menu">
            <Icon name="more_horiz" type="material" size="sm" />
          </MenuButton>

          <MenuDropdown isOpen={isMenuOpen}>
            <MenuItem onClick={handleToggleTheme} aria-label="Toggle theme">
              <Icon
                name={theme === "light" ? "dark_mode" : "light_mode"}
                type="material"
                size="sm"
              />
              {theme === "light" ? "Dark Theme" : "Light Theme"}
            </MenuItem>

            <MenuItem
              onClick={handleToggleFullscreen}
              aria-label="Toggle fullscreen"
            >
              <Icon name={fullscreenIcon} type="material" size="sm" />
              {fullscreenText}
            </MenuItem>
          </MenuDropdown>
        </MenuContainer>
      </RightSection>
    </FooterContainer>
  );
};

export default Footer;
