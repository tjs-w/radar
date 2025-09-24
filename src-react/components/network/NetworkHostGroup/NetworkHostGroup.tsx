import React, { useState } from 'react';
import styled from 'styled-components';
import { useHostnameMapping } from '../../../hooks/useHostnameMapping';
import { NetworkService } from '../../../types/network';
import Card from '../../common/Card';
import Icon from '../../common/Icon';

interface HostInfo {
  ip: string;
  hostname?: string;
  services: NetworkService[];
}

export interface NetworkHostGroupProps {
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

const HostsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  width: 100%;
  grid-auto-rows: min-content;
  align-items: start;

  @media (min-width: 1440px) {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  }

  @media (min-width: 1920px) {
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  }
`;

const StyledCard = styled(Card)`
  position: relative;
  display: flex;
  flex-direction: column;
  height: auto;
  align-self: start;
  width: 100%;
  transition: all 0.3s ease-out;
`;

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;


const PortsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const PortSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const PortSectionTitle = styled.div`
  font-weight: 600;
  font-size: var(--fs-sm);
  color: var(--text-primary);
  margin-bottom: 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-color-light);
`;

const PortEntry = styled.div`
  font-family: monospace;
  color: var(--text-secondary);
  font-size: var(--fs-sm);
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: 8px;
  align-items: center;
  padding: 4px 0;

  &:hover {
    background-color: var(--hover-bg);
    border-radius: 4px;
  }
`;

const PortNumber = styled.span`
  font-weight: 600;
  color: var(--primary-color);
`;

const PortProtocol = styled.span`
  color: var(--text-secondary);
`;

// Helper function to check if an IP is in the multicast range
const isMulticastIP = (ip: string): boolean => {
  try {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;

    const firstOctet = parseInt(parts[0], 10);
    return firstOctet === 239;
  } catch (e) {
    return false;
  }
};

const NetworkHostGroup: React.FC<NetworkHostGroupProps> = ({ name, services }) => {
  // Use the shared hostname mapping hook
  const { ipToHostnameMap } = useHostnameMapping();

  // Group services by IP address
  const hosts = React.useMemo(() => {
    const hostsMap = new Map<string, HostInfo>();

    // Create a host entry for each unique IP
    services.forEach(service => {
      if (!hostsMap.has(service.address)) {
        // First check if this is a multicast IP address
        if (isMulticastIP(service.address)) {
          hostsMap.set(service.address, {
            ip: service.address,
            hostname: '[Multicast]',
            services: [],
          });
          hostsMap.get(service.address)?.services.push(service);
          return; // Skip further processing for this service
        }

        // Get hostname from our centralized IP-to-hostname map
        const hostname = ipToHostnameMap[service.address];

        hostsMap.set(service.address, {
          ip: service.address,
          hostname,
          services: [],
        });
      }

      // Add the service to its host
      hostsMap.get(service.address)?.services.push(service);
    });

    return Array.from(hostsMap.values());
  }, [services, ipToHostnameMap]);

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

  if (services.length === 0) {
    return null;
  }

  return (
    <Group>
      <Heading>
        <HeadingLeft>
          <GroupName>{name}</GroupName>
          <ServiceCount>{hosts.length}</ServiceCount>
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

      <HostsGrid>
        {hosts.map(host => {
          // Count TCP and UDP ports
          const tcpServices = host.services.filter(s => !s.name.includes('/udp'));
          const udpServices = host.services.filter(s => s.name.includes('/udp'));

          // Generate summary text
          const summaryParts: string[] = [];
          if (tcpServices.length > 0) {
            summaryParts.push(`TCP(${tcpServices.length})`);
          }
          if (udpServices.length > 0) {
            summaryParts.push(`UDP(${udpServices.length})`);
          }

          const summaryText = summaryParts.join(', ');

          // Generate title
          const title = host.hostname ? `${host.hostname} (${host.ip})` : host.ip;

          return (
            <StyledCard
              key={host.ip}
              title={title}
              subtitle={summaryText}
              icon={<Icon name="devices" type="material" />}
              variant="local"
              defaultExpanded={!allCollapsed}
            >
              <CardContent>
                <PortsList>
                  {/* TCP Ports Section */}
                  {tcpServices.length > 0 && (
                    <PortSection>
                      <PortSectionTitle>TCP Ports</PortSectionTitle>
                      {tcpServices.map(service => {
                        // Extract port from service
                        const portMatch = service.name.match(/on port (\d+)/) || [];
                        const port = portMatch[1] || service.port?.toString() || 'N/A';
                        const protocol = service.service_type;

                        return (
                          <PortEntry key={`tcp-${port}`}>
                            <PortNumber>{port}:</PortNumber>
                            <PortProtocol>{protocol}</PortProtocol>
                          </PortEntry>
                        );
                      })}
                    </PortSection>
                  )}

                  {/* UDP Ports Section */}
                  {udpServices.length > 0 && (
                    <PortSection>
                      <PortSectionTitle>UDP Ports</PortSectionTitle>
                      {udpServices.map(service => {
                        // Extract port from service
                        const portMatch = service.name.match(/on port (\d+)/) || [];
                        const port = portMatch[1] || service.port?.toString() || 'N/A';
                        const protocol = service.service_type;

                        return (
                          <PortEntry key={`udp-${port}`}>
                            <PortNumber>{port}:</PortNumber>
                            <PortProtocol>{protocol}</PortProtocol>
                          </PortEntry>
                        );
                      })}
                    </PortSection>
                  )}
                </PortsList>
              </CardContent>
            </StyledCard>
          );
        })}
      </HostsGrid>
    </Group>
  );
};

export default NetworkHostGroup;
