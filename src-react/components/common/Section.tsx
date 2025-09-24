import React, { ReactNode } from "react";
import styled from "styled-components";

interface SectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

const StyledSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    left: -14px;
    top: 0;
    bottom: 0;
    width: var(--detail-indicator-width, 3px);
    background-color: var(--primary-color, #7aa2f7);
    opacity: 0.3;
    border-radius: 1.5px;
  }
`;

const SectionTitle = styled.h4`
  font-size: var(--fs-md);
  font-weight: 600;
  margin: 0 0 8px;
  color: var(--text-primary);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: "";
    display: inline-block;
    width: 4px;
    height: 16px;
    background-color: var(--primary-color);
    border-radius: 2px;
  }
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px 4px;

  /* Add subtle hover effect to each row for better UX */
  & > div {
    transition: background-color 0.15s ease;
    border-radius: var(--border-radius-sm);
    padding: 4px 6px;

    &:hover {
      background-color: var(--hover-bg);
    }
  }
`;

const Section: React.FC<SectionProps> = ({ title, children, className }) => {
  return (
    <StyledSection className={className}>
      <SectionTitle>{title}</SectionTitle>
      <Content>{children}</Content>
    </StyledSection>
  );
};

export default Section;
