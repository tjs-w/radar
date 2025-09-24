import React, { useState } from 'react';
import styled from 'styled-components';
import { NetworkService } from '../../../types/network';
import Icon from '../../common/Icon';
import LocalNetworkCard from '../LocalNetworkCard/LocalNetworkCard';

export interface ServiceGroupProps {
  name: string;
  services: NetworkService[];
}

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
`;

const Heading = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-color);
`;

const HeadingLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const HeadingRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const GroupName = styled.h3`
  font-weight: 600;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ServiceCount = styled.span`
  font-size: var(--fs-xs);
  font-weight: 500;
  color: var(--text-tertiary);
  background-color: var(--badge-bg);
  padding: 1px 6px;
  border-radius: 10px;
  line-height: 1.2;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: var(--primary-color);
    background-color: var(--hover-bg);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const ServicesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  width: 100%;
  grid-auto-rows: min-content;
  align-items: start;

  /* Add support for full-width expanded cards */
  & > div[style*='grid-column: 1 / -1'] {
    margin-bottom: 12px;
    border-bottom: 1px dashed var(--border-color-light);
    padding-bottom: 12px;
  }

  /* Fix for grid layout to ensure consistent card sizing */
  & > * {
    min-width: 0;
    height: auto;
    width: 100%;
  }

  /* Responsive grid adjustments */
  @media (min-width: 1440px) {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  }

  @media (min-width: 1920px) {
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  }

  @media (min-width: 2560px) {
    grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  }
`;

const ServiceGroup: React.FC<ServiceGroupProps> = ({ name, services }) => {
  // State for section-level collapse
  const [sectionCollapsed, setSectionCollapsed] = useState(false);

  // Use a single state variable to track whether all cards should be expanded
  const [allCollapsed, setAllCollapsed] = useState(true);

  // Function to collapse all cards
  const handleCollapseAll = () => {
    setAllCollapsed(true);
  };

  // Function to expand all cards
  const handleExpandAll = () => {
    setAllCollapsed(false);
  };

  // Function to toggle section collapse
  const handleSectionToggle = () => {
    setSectionCollapsed(!sectionCollapsed);
  };

  if (services.length === 0) {
    return null;
  }

  return (
    <Group>
      <Heading>
        <HeadingLeft>
          <ActionButton
            onClick={handleSectionToggle}
            title={sectionCollapsed ? "Expand section" : "Collapse section"}
            aria-label={sectionCollapsed ? "Expand section" : "Collapse section"}
            type="button"
          >
            <Icon
              name={sectionCollapsed ? "expand_more" : "expand_less"}
              type="material"
              size="sm"
            />
          </ActionButton>
          <GroupName>{name}</GroupName>
          <ServiceCount>{services.length}</ServiceCount>
        </HeadingLeft>

        <HeadingRight>
          {!allCollapsed ? (
            <ActionButton
              onClick={handleCollapseAll}
              title="Collapse all"
              aria-label="Collapse all cards"
              type="button"
            >
              <Icon name="unfold_less" type="material" size="sm" />
            </ActionButton>
          ) : (
            <ActionButton
              onClick={handleExpandAll}
              title="Expand all"
              aria-label="Expand all cards"
              type="button"
            >
              <Icon name="unfold_more" type="material" size="sm" />
            </ActionButton>
          )}
        </HeadingRight>
      </Heading>

      {!sectionCollapsed && (
        <ServicesGrid>
          {services.map(service => {
            const key = `${service.name}-${service.address}-${service.port}-${service.service_type}`;

            return (
              <LocalNetworkCard
                key={key}
                service={service}
                defaultExpanded={false}
                forceExpanded={!allCollapsed}
                onExpand={expanded => {
                  // Only update group state if a card is being expanded individually
                  // (not when responding to group-level expand/collapse)
                  if (expanded && allCollapsed) {
                    setAllCollapsed(false);
                  }
                }}
              />
            );
          })}
        </ServicesGrid>
      )}
    </Group>
  );
};

export default ServiceGroup;
