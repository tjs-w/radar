import React from "react";
import styled from "styled-components";
import { PublicNetworkInfo } from "../../../types/network";
import Card from "../../common/Card";
import Icon from "../../common/Icon";
import DNSSection from "./sections/DNSSection";
import LocationSection from "./sections/LocationSection";
import PublicIPSection from "./sections/PublicIPSection";
import SecuritySection from "./sections/SecuritySection";

export interface PublicNetworkCardProps {
  networkInfo: PublicNetworkInfo;
  defaultExpanded?: boolean;
  onExpand?: (expanded: boolean) => void;
  className?: string;
}

const StyledCard = styled(Card)`
  position: relative;
  display: flex;
  flex-direction: column;
  height: auto; /* Changed from 100% to auto to prevent stretching */
  align-self: start; /* Aligns the card to the top of its grid cell */
  width: 100%; /* Ensure full width within its container */
  max-width: 100%; /* Don't exceed container width */

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

const StyledPublicIP = styled.span`
  font-family: "JetBrains Mono", "Fira Code", "SF Mono", "Menlo", "Consolas",
    monospace;
  color: #3366cc;
  padding: 0 4px;
  font-size: 1.05em;
  font-weight: 500;
  letter-spacing: 0.5px;
`;


const PublicNetworkCard: React.FC<PublicNetworkCardProps> = ({
  networkInfo,
  defaultExpanded = false,
  onExpand,
  className = "",
}) => {
  const renderTitle = () => (
    <>
      Public IP:{" "}
      {networkInfo.public_ip ? (
        <StyledPublicIP>{networkInfo.public_ip}</StyledPublicIP>
      ) : (
        "Not available"
      )}
    </>
  );

  return (
    <StyledCard
      title={renderTitle()}
      subtitle={networkInfo.isp ? `ISP: ${networkInfo.isp}` : ""}
      icon={<Icon name="public" type="material" />}
      variant="public"
      defaultExpanded={defaultExpanded}
      onExpand={onExpand}
      className={className}
    >
      <CardContent>
        {networkInfo.public_ip && <PublicIPSection networkInfo={networkInfo} />}
        {networkInfo.location && (
          <LocationSection location={networkInfo.location} />
        )}
        {networkInfo.dns_servers && networkInfo.dns_servers.length > 0 && (
          <DNSSection dnsServers={networkInfo.dns_servers} />
        )}
        <SecuritySection networkInfo={networkInfo} />
      </CardContent>
    </StyledCard>
  );
};

export default PublicNetworkCard;
