import React, { ReactNode, useState, useEffect } from "react";
import styled from "styled-components";

export interface CardProps {
  title: ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  variant?: "default" | "public" | "local" | "success" | "warning" | "error";
  defaultExpanded?: boolean;
  onExpand?: (expanded: boolean) => void;
  actions?: ReactNode[];
  className?: string;
  children?: ReactNode;
}

// Styled components
const StyledCard = styled.div<{ variant: string }>`
  background-color: var(--card-background);
  border-radius: var(--border-radius);
  box-shadow: var(--card-shadow);
  margin-bottom: 10px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  transition: all 0.2s ease-in-out;
  position: relative;
  width: 100%;

  /* Tech-inspired left accent */
  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    border-radius: 2px 0 0 2px;
    background: ${(props) => {
      switch (props.variant) {
        case "public":
          return "linear-gradient(180deg, var(--public-color), var(--public-color) 70%, rgba(43, 132, 255, 0.7))";
        case "local":
          return "linear-gradient(180deg, var(--local-color), var(--local-color) 70%, rgba(16, 185, 129, 0.7))";
        case "success":
          return "linear-gradient(180deg, var(--success-color), var(--success-color) 70%, rgba(16, 185, 129, 0.7))";
        case "warning":
          return "linear-gradient(180deg, var(--warning-color), var(--warning-color) 70%, rgba(245, 158, 11, 0.7))";
        case "error":
          return "linear-gradient(180deg, var(--error-color), var(--error-color) 70%, rgba(239, 68, 68, 0.7))";
        default:
          return "linear-gradient(180deg, var(--primary-color), var(--primary-color) 70%, rgba(43, 132, 255, 0.7))";
      }
    }};
  }

  &:hover {
    box-shadow: var(--card-shadow-hover);
    transform: translateY(-1px);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: var(--hover-bg);
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 1em;
`;

const TitleContainer = styled.div`
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

const Title = styled.h3`
  font-size: var(--fs-md);
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
`;

const Subtitle = styled.p`
  font-size: var(--fs-xs);
  color: var(--text-secondary);
  margin: 2px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  opacity: 0.8;

  &.card-subtitle {
    display: block;
  }
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Actions = styled.div`
  display: flex;
  gap: 3px;
`;

const ActionItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-left: 8px;

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

const Expander = styled.button<{ expanded: boolean }>`
  background: none;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  color: var(--text-secondary);
  transition: all 0.2s ease;
  transform: ${(props) => (props.expanded ? "rotate(180deg)" : "none")};

  &:hover {
    background-color: var(--hover-bg);
    color: var(--primary-color);
  }
`;

const CardBody = styled.div<{ expanded: boolean }>`
  padding: 0 12px;
  padding-top: ${(props) => (props.expanded ? "12px" : "0")};
  padding-bottom: ${(props) => (props.expanded ? "12px" : "0")};
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: ${(props) => (props.expanded ? "1500px" : "0")};
  opacity: ${(props) => (props.expanded ? "1" : "0.8")};
`;

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  icon,
  variant = "default",
  defaultExpanded = false,
  onExpand,
  actions = [],
  className = "",
  children,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Update expanded state when defaultExpanded prop changes
  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  const handleToggleExpand = () => {
    const newExpandedState = !expanded;
    setExpanded(newExpandedState);
    if (onExpand) {
      onExpand(newExpandedState);
    }
  };

  return (
    <StyledCard variant={variant} className={className}>
      <CardHeader onClick={children ? handleToggleExpand : undefined}>
        <HeaderLeft>
          {icon && <IconWrapper>{icon}</IconWrapper>}
          <TitleContainer>
            <Title>{title}</Title>
            {subtitle && (
              <Subtitle className="card-subtitle">{subtitle}</Subtitle>
            )}
          </TitleContainer>
        </HeaderLeft>

        <HeaderRight>
          {actions.length > 0 && (
            <Actions>
              {actions.map((action, index) => {
                // Try to extract a meaningful identifier if it's a React element
                const actionKey =
                  React.isValidElement(action) && action.key
                    ? action.key
                    : `action-${index}`;

                return <ActionItem key={actionKey}>{action}</ActionItem>;
              })}
            </Actions>
          )}

          {children && (
            <Expander
              type="button"
              expanded={expanded}
              onClick={(e) => {
                e.stopPropagation(); // Prevent clicking the button from triggering the header's onClick
                handleToggleExpand();
              }}
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              <span className="material-symbols-rounded">
                {expanded ? "expand_less" : "expand_more"}
              </span>
            </Expander>
          )}
        </HeaderRight>
      </CardHeader>

      {children && <CardBody expanded={expanded}>{children}</CardBody>}
    </StyledCard>
  );
};

export default Card;
