import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { NetworkService } from "../../../types/network";
import { getProtocolIcon, getServiceTypeClass } from "../../../utils/icons";
import Card from "../../common/Card";
import Icon from "../../common/Icon";
import ServiceConnectionInfo from "./sections/ServiceConnectionInfo";
import ServiceDetailsRenderer from "./sections/ServiceDetailsRenderer";
import ServiceDiscoveryInfo from "./sections/ServiceDiscoveryInfo";

export interface LocalNetworkCardProps {
  service: NetworkService;
  defaultExpanded?: boolean;
  forceExpanded?: boolean;
  onExpand?: (expanded: boolean) => void;
  className?: string;
}

// Full-width wrapper for expanded cards
const ExpandableCardWrapper = styled.div<{ isExpanded: boolean }>`
  width: 100%;
  transition: all 0.3s ease-out;
  grid-column: ${(props) => (props.isExpanded ? "1 / -1" : "auto")};
  order: ${(props) => (props.isExpanded ? "-1" : "0")};

  @media (max-width: 768px) {
    grid-column: 1 / -1; /* Always full width on mobile */
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

  /* Handle subtitle text overflow */
  .card-subtitle {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
`;

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

// Extract protocol value from UPnP device details
const extractUPnPProtocol = (details?: string): string | null => {
  if (!details) return null;

  try {
    // Try to parse as JSON first
    const parsedDetails = JSON.parse(details);
    if (typeof parsedDetails === "object" && !Array.isArray(parsedDetails)) {
      // If it has a protocol field, prioritize that first
      if (parsedDetails.protocol) return parsedDetails.protocol;

      // Next try to find any UPnP protocol information
      // Look for Search Target or ST field which often contains protocol info
      if (
        parsedDetails.search_target &&
        typeof parsedDetails.search_target === "string"
      ) {
        // Extract protocol info from search target
        const stMatch = parsedDetails.search_target.match(/urn:([^:]+):/i);
        if (stMatch && stMatch[1]) return stMatch[1];
      }

      // If no protocol info found, then try device field as fallback
      if (parsedDetails.device) return parsedDetails.device;

      // Check for friendlyName or deviceType
      if (parsedDetails.friendlyName) return parsedDetails.friendlyName;
      if (
        parsedDetails.protocol &&
        typeof parsedDetails.protocol === "string"
      ) {
        return parsedDetails.protocol;
      }

      // Otherwise look for anything that might be a protocol identifier
      for (const key in parsedDetails) {
        const value = parsedDetails[key];
        if (typeof value === "string") {
          // Check if value contains protocol indicators first
          if (
            value.toLowerCase().includes("protocol") ||
            value.toLowerCase().includes("upnp") ||
            value.toLowerCase().includes("schemas-")
          ) {
            return value;
          }

          // Then fall back to device indicators
          if (
            value.includes("Device") ||
            value.includes("Gateway") ||
            value.includes("WFADevice")
          ) {
            return value;
          }
        }
      }
    }
  } catch (error) {
    // If not JSON, try different parsing approaches

    // Look for Protocol: field first
    const protocolMatch = details.match(/Protocol:\s*([^\n]+)/i);
    if (protocolMatch && protocolMatch[1]) {
      return protocolMatch[1].trim();
    }

    // Look for search target or ST field which often contains protocol info
    const stMatch = details.match(/Search Target:\s*urn:([^:]+):/i);
    if (stMatch && stMatch[1]) {
      return stMatch[1].trim();
    }

    // Look for Device: field as fallback
    const deviceMatch = details.match(/Device:\s*([^\n]+)/i);
    if (deviceMatch && deviceMatch[1]) {
      return deviceMatch[1].trim();
    }

    // Check for various URN formats in the whole string

    // UPnP.org URNs
    const upnpMatch = details.match(/urn:schemas-upnp-org:device:([^:]+):/i);
    if (upnpMatch && upnpMatch[1]) {
      return upnpMatch[1].trim();
    }

    // WiFi Alliance URNs
    const wfaMatch = details.match(
      /urn:schemas-wifialliance-org:device:([^:]+):/i
    );
    if (wfaMatch && wfaMatch[1]) {
      return wfaMatch[1].trim();
    }

    // Check for common UPnP device types
    if (details.includes("InternetGatewayDevice")) {
      return "InternetGatewayDevice";
    }
    if (details.includes("MediaRenderer")) {
      return "MediaRenderer";
    }
    if (details.includes("MediaServer")) {
      return "MediaServer";
    }
    if (details.includes("WFADevice")) {
      return "WFADevice";
    }
  }

  return null;
};

const LocalNetworkCard: React.FC<LocalNetworkCardProps> = ({
  service,
  defaultExpanded = false,
  forceExpanded,
  onExpand,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Update when forceExpanded changes
  useEffect(() => {
    if (forceExpanded !== undefined) {
      setIsExpanded(forceExpanded);
    }
  }, [forceExpanded]);

  // Extract protocol value if this is a UPnP service
  const upnpProtocol = useMemo(() => {
    if (
      service.discovery_method &&
      service.discovery_method.toLowerCase() === "upnp"
    ) {
      const protocolValue = extractUPnPProtocol(service.details);
      return protocolValue || "UPnP";
    }
    return null;
  }, [service]);

  // Format subtitle
  const subtitle = useMemo(() => {
    let serviceType = service.service_type;

    // Check if it's a UPnP service
    if (
      service.discovery_method &&
      service.discovery_method.toLowerCase() === "upnp"
    ) {
      // Use the extracted protocol value for a cleaner display
      if (upnpProtocol && upnpProtocol !== "UPnP") {
        // Use the specific UPnP protocol type
        return `${upnpProtocol} • ${service.discovery_method}`;
      } else {
        return `${service.discovery_method}`;
      }
    }

    // Regular format for non-UPnP services
    let result = serviceType;
    if (service.discovery_method) {
      result += ` • ${service.discovery_method}`;
    }
    return result;
  }, [service, upnpProtocol]);

  // Get the service type class for styling
  const serviceTypeClass = getServiceTypeClass(service.service_type);

  // Handle expansion state
  const handleExpand = (expanded: boolean) => {
    // Only update local state if not being controlled externally
    if (forceExpanded === undefined) {
      setIsExpanded(expanded);
    }
    if (onExpand) {
      onExpand(expanded);
    }
  };

  return (
    <ExpandableCardWrapper isExpanded={isExpanded}>
      <StyledCard
        title={service.name}
        subtitle={subtitle}
        icon={
          <Icon name={getProtocolIcon(service.service_type)} type="material" />
        }
        variant="local"
        defaultExpanded={isExpanded}
        onExpand={handleExpand}
        className={`${serviceTypeClass} ${className}`}
      >
        <CardContent>
          <ServiceConnectionInfo service={service} />
          <ServiceDiscoveryInfo service={service} upnpProtocol={upnpProtocol} />
          {service.details && (
            <ServiceDetailsRenderer details={service.details} />
          )}
        </CardContent>
      </StyledCard>
    </ExpandableCardWrapper>
  );
};

export default LocalNetworkCard;
