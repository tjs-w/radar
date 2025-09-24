import React from "react";
import { PublicNetworkInfo } from "../../../../types/network";
import InfoRow from "../../../common/InfoRow";
import Section from "../../../common/Section";

interface PublicIPSectionProps {
  networkInfo: PublicNetworkInfo;
}

const PublicIPSection: React.FC<PublicIPSectionProps> = ({ networkInfo }) => {
  return (
    <Section title="General Information">
      <InfoRow
        label="IP Address"
        value={networkInfo.public_ip}
        icon="public"
        copyable
        isPublicIP={true}
      />
      {networkInfo.ipv6 && (
        <InfoRow
          label="IPv6 Address"
          value={networkInfo.ipv6}
          icon="public"
          copyable
        />
      )}
      {networkInfo.isp && (
        <InfoRow label="ISP" value={networkInfo.isp} icon="router" copyable />
      )}
      {networkInfo.org && (
        <InfoRow
          label="Organization"
          value={networkInfo.org}
          icon="business"
          copyable
        />
      )}
      {networkInfo.asn && (
        <InfoRow
          label="ASN"
          value={networkInfo.asn}
          icon="account_tree"
          copyable
        />
      )}
    </Section>
  );
};

export default PublicIPSection;
