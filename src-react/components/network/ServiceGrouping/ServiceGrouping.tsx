import React, { useMemo } from 'react';
import styled from 'styled-components';
import { NetworkService } from '../../../types/network';
import NetworkHostGroup from '../NetworkHostGroup/NetworkHostGroup';
import ServiceGroup from './ServiceGroup';

export interface ServiceGroupingProps {
  services: NetworkService[];
  groupBy: 'service_type' | 'discovery_method' | 'none';
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 28px;
  animation: fadeIn 0.3s ease-in-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;
  border: 1px dashed var(--border-color);
  border-radius: var(--border-radius);
  margin: 16px 0;

  h3 {
    color: var(--text-secondary);
    margin-bottom: 8px;
    font-weight: 500;
  }

  p {
    color: var(--text-tertiary);
    font-size: var(--fs-sm);
    max-width: 280px;
  }
`;

// Function to check if a service type is a UPnP-related URN
const isUPnPServiceType = (serviceType: string): boolean => {
  if (!serviceType) return false;

  const lowerServiceType = serviceType.toLowerCase();

  // Check for various UPnP-related patterns
  return (
    lowerServiceType.includes('schemas-upnp-org:device:') ||
    lowerServiceType.includes('schemas-wifialliance-org:device:') ||
    lowerServiceType.includes('upnp') ||
    (lowerServiceType.includes('urn:') && lowerServiceType.includes(':device:'))
  );
};

const ServiceGrouping: React.FC<ServiceGroupingProps> = ({ services, groupBy }) => {
  // Group services based on the groupBy property
  const groupedServices = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Services': services };
    }

    return services.reduce<Record<string, NetworkService[]>>((groups, service) => {
      let key = '';

      if (groupBy === 'service_type') {
        // Special handling for UPnP services
        if (isUPnPServiceType(service.service_type)) {
          key = 'UPnP Services';
        } else {
          key = service.service_type || 'Unknown';
        }
      } else if (groupBy === 'discovery_method') {
        // Special handling for UPnP discovery method
        if (service.discovery_method?.toLowerCase() === 'upnp') {
          key = 'UPnP';
        } else {
          key = service.discovery_method || 'Unknown';
        }
      }

      // Improve the display names for common service types
      if (groupBy === 'service_type' && key !== 'UPnP Services') {
        if (key.includes('_http._tcp')) {
          key = 'HTTP Services';
        } else if (key.includes('_https._tcp')) {
          key = 'HTTPS Services';
        } else if (key.includes('_ssh._tcp')) {
          key = 'SSH Services';
        } else if (key.includes('_device-info._tcp')) {
          key = 'Device Info';
        }
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(service);
      return groups;
    }, {});
  }, [services, groupBy]);

  // If no services are available, show an empty state message
  if (services.length === 0) {
    return (
      <EmptyState>
        <h3>No network services found</h3>
        <p>Run a network scan to discover services on your network</p>
      </EmptyState>
    );
  }

  // Standardize the "Network Scan" key for consistency
  const normalizedGroupedServices = useMemo(() => {
    const result = { ...groupedServices };

    // If "network scan" exists in any case variation, normalize it
    const networkScanKey = Object.keys(result).find(key => key.toLowerCase() === 'network scan');

    if (networkScanKey && networkScanKey !== 'NETWORK SCAN') {
      result['NETWORK SCAN'] = result[networkScanKey];
      delete result[networkScanKey];
    }

    return result;
  }, [groupedServices]);

  return (
    <Container>
      {Object.entries(normalizedGroupedServices).map(([groupName, groupServices]) => {
        // Use NetworkHostGroup for "NETWORK SCAN" section
        if (groupName === 'NETWORK SCAN') {
          return <NetworkHostGroup key={groupName} name={groupName} services={groupServices} />;
        }

        // Use regular ServiceGroup for all other sections
        return <ServiceGroup key={groupName} name={groupName} services={groupServices} />;
      })}
    </Container>
  );
};

export default ServiceGrouping;
