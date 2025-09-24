import React from "react";
import styled from "styled-components";
import { DNSServer } from "../../../../types/network";
import InfoRow from "../../../common/InfoRow";
import Section from "../../../common/Section";

interface DNSSectionProps {
  dnsServers: DNSServer[];
}

const ServerRow = styled.div`
  border-bottom: 1px solid var(--border-color-light);
  padding-bottom: 8px;
  margin-bottom: 8px;

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }
`;

const DNSSection: React.FC<DNSSectionProps> = ({ dnsServers }) => {
  return (
    <Section title="DNS Servers">
      {dnsServers.map((server, index) => (
        <ServerRow key={`dns-server-${server.address || server.name || index}`}>
          <InfoRow
            label="IP Address"
            value={server.address}
            icon="dns"
            copyable
          />

          {server.name && (
            <InfoRow label="Name" value={server.name} icon="label" copyable />
          )}

          {server.provider && (
            <InfoRow
              label="Provider"
              value={server.provider}
              icon="business"
              copyable
            />
          )}
        </ServerRow>
      ))}
    </Section>
  );
};

export default DNSSection;
