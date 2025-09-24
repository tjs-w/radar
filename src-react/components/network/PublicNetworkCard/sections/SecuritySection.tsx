import React from "react";
import { PublicNetworkInfo } from "../../../../types/network";
import InfoRow from "../../../common/InfoRow";
import Section from "../../../common/Section";

interface SecuritySectionProps {
  networkInfo: PublicNetworkInfo;
}

const SecuritySection: React.FC<SecuritySectionProps> = ({ networkInfo }) => {
  // Only show this section if we have security information
  const hasSecurityInfo =
    networkInfo.is_vpn !== undefined ||
    networkInfo.is_proxy !== undefined ||
    networkInfo.is_hosting !== undefined;

  if (!hasSecurityInfo) {
    return null;
  }

  return (
    <Section title="Security Information">
      {networkInfo.is_vpn !== undefined && (
        <InfoRow
          label="VPN"
          value={networkInfo.is_vpn ? "Yes" : "No"}
          icon={networkInfo.is_vpn ? "lock" : "lock_open"}
          copyable
        />
      )}

      {networkInfo.is_proxy !== undefined && (
        <InfoRow
          label="Proxy"
          value={networkInfo.is_proxy ? "Yes" : "No"}
          icon={networkInfo.is_proxy ? "security" : "security_update_warning"}
          copyable
        />
      )}

      {networkInfo.is_hosting !== undefined && (
        <InfoRow
          label="Hosting Provider"
          value={networkInfo.is_hosting ? "Yes" : "No"}
          icon="cloud"
          copyable
        />
      )}
    </Section>
  );
};

export default SecuritySection;
