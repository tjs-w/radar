import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { useAppState } from '../../context/AppContext';
import { NetworkService, PublicNetworkInfo } from '../../types/network';
import PublicNetworkCard from '../network/PublicNetworkCard/PublicNetworkCard';
import RadarAnimation from '../network/RadarAnimation/RadarAnimation';
import ServiceGrouping from '../network/ServiceGrouping/ServiceGrouping';

export interface MainContentProps {
  services: NetworkService[];
  publicNetworkInfo: PublicNetworkInfo | null;
  isScanning: boolean;
  scanProgress: number;
  filterOptions: {
    searchTerm: string;
    serviceTypes: string[];
    discoveryMethods: string[];
  };
  onFilterChange: (options: Partial<MainContentProps['filterOptions']>) => void;
}

const MainContainer = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 16px;
  position: relative;
`;

const FloatingRadar = styled.div`
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  height: 250px;
`;

const RadarText = styled.text`
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--text-tertiary);
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionTitle = styled.h2`
  font-size: var(--fs-lg);
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SearchIcon = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--text-tertiary);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: var(--primary-color);
    background-color: var(--hover-bg);
  }

  &:focus {
    outline: none;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const FilterContainer = styled.div<{ $isExpanded: boolean }>`
  overflow: hidden;
  max-height: ${props => (props.$isExpanded ? '500px' : '0')};
  opacity: ${props => (props.$isExpanded ? '1' : '0')};
  transition: all 0.3s ease;
  margin-bottom: ${props => (props.$isExpanded ? '16px' : '0')};
  background-color: var(--card-bg);
  border-radius: var(--border-radius);
  padding: ${props => (props.$isExpanded ? '16px' : '0')};
  box-shadow: ${props => (props.$isExpanded ? 'var(--card-shadow)' : 'none')};
`;

const SearchInput = styled.input`
  padding: 8px 12px;
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-color);
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-size: var(--fs-md);
  width: 100%;
  margin-bottom: 12px;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }
`;

const FilterGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
`;

const FilterChip = styled.button<{ active: boolean }>`
  display: flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: var(--border-radius-sm);
  font-size: var(--fs-xs);
  cursor: pointer;
  border: 1px solid ${props => (props.active ? 'var(--primary-color)' : 'var(--border-color)')};
  background-color: ${props => (props.active ? 'var(--primary-color-light)' : 'var(--input-bg)')};
  color: ${props => (props.active ? 'var(--primary-color)' : 'var(--text-secondary)')};
  transition: all 0.15s ease;

  &:hover {
    background-color: ${props => (props.active ? 'var(--primary-color-light)' : 'var(--hover-bg)')};
    transform: translateY(-1px);
  }
`;

const FilterHeading = styled.h4`
  font-size: var(--fs-xs);
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const EmptyState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30px;
  flex-direction: column;
  text-align: center;
  border-radius: var(--border-radius);
  background-color: var(--card-bg);
  border: 1px dashed var(--border-color);

  h3 {
    font-size: var(--fs-md);
    margin-bottom: 8px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  p {
    color: var(--text-tertiary);
    max-width: 450px;
    font-size: var(--fs-sm);
    line-height: 1.4;
  }
`;

const MainContent: React.FC<MainContentProps> = ({
  services,
  publicNetworkInfo,
  isScanning,
  filterOptions,
  onFilterChange,
}) => {
  const radarRef = useRef<HTMLDivElement>(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const { state } = useAppState();

  // Extract unique service types and discovery methods from services
  const serviceTypes = [...new Set(services.map(s => s.service_type || '').filter(Boolean))];
  const discoveryMethods = [
    ...new Set(services.map(s => s.discovery_method || '').filter(Boolean)),
  ];

  // Filter services based on filter options
  const filteredServices = services.filter(service => {
    // Filter by search term
    const matchesSearch =
      !filterOptions.searchTerm ||
      (service.name &&
        service.name.toLowerCase().includes(filterOptions.searchTerm.toLowerCase())) ||
      (service.address &&
        service.address.toLowerCase().includes(filterOptions.searchTerm.toLowerCase())) ||
      (service.service_type &&
        service.service_type.toLowerCase().includes(filterOptions.searchTerm.toLowerCase()));

    // Filter by service type
    const matchesServiceType =
      filterOptions.serviceTypes.length === 0 ||
      (service.service_type && filterOptions.serviceTypes.includes(service.service_type));

    // Filter by discovery method
    const matchesDiscoveryMethod =
      filterOptions.discoveryMethods.length === 0 ||
      (service.discovery_method &&
        filterOptions.discoveryMethods.includes(service.discovery_method));

    return matchesSearch && matchesServiceType && matchesDiscoveryMethod;
  });

  const toggleFilter = () => {
    setIsFilterExpanded(!isFilterExpanded);
    if (isFilterExpanded) {
      // Reset filters when closing
      onFilterChange({
        searchTerm: '',
        serviceTypes: [],
        discoveryMethods: [],
      });
    }
  };

  return (
    <MainContainer>
      {isScanning && (
        <FloatingRadar ref={radarRef}>
          <RadarAnimation size={200} />
          <RadarText>{`Found ${state.services.length} services`}</RadarText>
        </FloatingRadar>
      )}

      <ContentWrapper>
        {publicNetworkInfo && (
          <Section>
            <SectionTitle>Internet</SectionTitle>
            <PublicNetworkCard networkInfo={publicNetworkInfo} />
          </Section>
        )}

        <Section>
          <SectionHeader>
            <SectionTitle>Local</SectionTitle>
            <SearchIcon onClick={toggleFilter} aria-label="Toggle filter panel">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </SearchIcon>
          </SectionHeader>

          <FilterContainer $isExpanded={isFilterExpanded}>
            <SearchInput
              type="text"
              placeholder="Search services..."
              value={filterOptions.searchTerm}
              onChange={e => onFilterChange({ searchTerm: e.target.value })}
            />

            {serviceTypes.length > 0 && (
              <>
                <FilterHeading>Service Types</FilterHeading>
                <FilterGroup>
                  {serviceTypes.map(type => (
                    <FilterChip
                      key={type}
                      active={filterOptions.serviceTypes.includes(type)}
                      onClick={() => {
                        const newTypes = filterOptions.serviceTypes.includes(type)
                          ? filterOptions.serviceTypes.filter(t => t !== type)
                          : [...filterOptions.serviceTypes, type];
                        onFilterChange({ serviceTypes: newTypes });
                      }}
                    >
                      {type}
                    </FilterChip>
                  ))}
                </FilterGroup>
              </>
            )}

            {discoveryMethods.length > 0 && (
              <>
                <FilterHeading>Discovery Methods</FilterHeading>
                <FilterGroup>
                  {discoveryMethods.map(method => (
                    <FilterChip
                      key={method}
                      active={filterOptions.discoveryMethods.includes(method)}
                      onClick={() => {
                        const newMethods = filterOptions.discoveryMethods.includes(method)
                          ? filterOptions.discoveryMethods.filter(m => m !== method)
                          : [...filterOptions.discoveryMethods, method];
                        onFilterChange({ discoveryMethods: newMethods });
                      }}
                    >
                      {method}
                    </FilterChip>
                  ))}
                </FilterGroup>
              </>
            )}
          </FilterContainer>

          {filteredServices.length > 0 ? (
            <ServiceGrouping services={filteredServices} groupBy="discovery_method" />
          ) : (
            <EmptyState>
              <h3>No network services found</h3>
              <p>
                Try scanning your network to discover services or adjust your filters to see more
                results.
              </p>
            </EmptyState>
          )}
        </Section>
      </ContentWrapper>
    </MainContainer>
  );
};

export default MainContent;
