import React from "react";
import { NetworkService } from "../../../../types/network";
import InfoRow from "../../../common/InfoRow";
import Section from "../../../common/Section";

interface ServiceConnectionInfoProps {
  service: NetworkService;
}

const ServiceConnectionInfo: React.FC<ServiceConnectionInfoProps> = ({
  service,
}) => {
  // Format URL if it's an HTTP service
  const getServiceUrl = (): string | null => {
    const type = service.service_type.toLowerCase();
    if (type.includes("http") && service.port) {
      const protocol = type.includes("https") ? "https" : "http";
      return `${protocol}://${service.address}:${service.port}`;
    }
    return null;
  };

  const serviceUrl = getServiceUrl();

  return (
    <Section title="Connection Information">
      <InfoRow
        label="IP Address"
        value={service.address}
        icon="public"
        copyable
      />
      {service.port && (
        <InfoRow
          label="Port"
          value={service.port.toString()}
          icon="settings_ethernet"
          copyable
        />
      )}
      {serviceUrl && (
        <InfoRow
          label="URL"
          value={serviceUrl}
          icon="link"
          isLink
          copyable
          onClick={() => window.open(serviceUrl, "_blank")}
        />
      )}
      {service.is_secure !== undefined && (
        <InfoRow
          label="Secure"
          value={service.is_secure ? "Yes" : "No"}
          icon={service.is_secure ? "lock" : "lock_open"}
          copyable
        />
      )}
    </Section>
  );
};

export default ServiceConnectionInfo;
