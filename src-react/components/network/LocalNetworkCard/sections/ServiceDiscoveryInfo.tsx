import React from "react";
import { NetworkService } from "../../../../types/network";
import InfoRow from "../../../common/InfoRow";
import Section from "../../../common/Section";

interface ServiceDiscoveryInfoProps {
  service: NetworkService;
  upnpProtocol?: string | null;
}

// Function to check if a service type is a UPnP-related URN
const isUPnPServiceType = (serviceType: string): boolean => {
  if (!serviceType) return false;

  const lowerServiceType = serviceType.toLowerCase();

  // Check for various UPnP-related patterns
  return (
    lowerServiceType.includes("schemas-upnp-org:device:") ||
    lowerServiceType.includes("schemas-wifialliance-org:device:") ||
    lowerServiceType.includes("upnp") ||
    (lowerServiceType.includes("urn:") && lowerServiceType.includes(":device:"))
  );
};

const ServiceDiscoveryInfo: React.FC<ServiceDiscoveryInfoProps> = ({
  service,
  upnpProtocol,
}) => {
  // Only show this section if we have discovery method or service type
  if (!service.discovery_method && !service.service_type) {
    return null;
  }

  // Format service type display for UPnP services
  const getServiceTypeDisplay = (): { label: string; value: string } => {
    if (isUPnPServiceType(service.service_type)) {
      // Use the extracted protocol value if available
      return {
        label: "Protocol",
        value: upnpProtocol && upnpProtocol !== "UPnP" ? upnpProtocol : "UPnP",
      };
    }
    return { label: "Service Type", value: service.service_type };
  };

  const serviceTypeInfo = getServiceTypeDisplay();

  return (
    <Section title="Service Information">
      {service.service_type && (
        <InfoRow
          label={serviceTypeInfo.label}
          value={serviceTypeInfo.value}
          icon="category"
          copyable
        />
      )}

      {service.discovery_method && (
        <InfoRow
          label="Discovered Via"
          value={service.discovery_method}
          icon="search"
          copyable
        />
      )}

      {service.response_time !== undefined && (
        <InfoRow
          label="Response Time"
          value={`${service.response_time} ms`}
          icon="timer"
          copyable
        />
      )}
    </Section>
  );
};

export default ServiceDiscoveryInfo;
