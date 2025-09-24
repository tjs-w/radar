import React from "react";
import { LocationInfo } from "../../../../types/network";
import InfoRow from "../../../common/InfoRow";
import Section from "../../../common/Section";

interface LocationSectionProps {
  location: LocationInfo;
}

const LocationSection: React.FC<LocationSectionProps> = ({ location }) => {
  // Format location string
  const getFormattedLocation = (): string => {
    const parts: string[] = [];
    if (location.city) parts.push(location.city);
    if (location.region) parts.push(location.region);
    if (location.country) parts.push(location.country);
    return parts.join(", ");
  };

  return (
    <Section title="Location">
      <InfoRow
        label="Location"
        value={getFormattedLocation()}
        icon="location_on"
        copyable
      />
      {location.country_code && (
        <InfoRow
          label="Country Code"
          value={location.country_code}
          icon="flag"
          copyable
        />
      )}
      {location.latitude && location.longitude && (
        <InfoRow
          label="Coordinates"
          value={`${location.latitude}, ${location.longitude}`}
          icon="explore"
          copyable
        />
      )}
      {location.timezone && (
        <InfoRow
          label="Timezone"
          value={location.timezone}
          icon="schedule"
          copyable
        />
      )}
    </Section>
  );
};

export default LocationSection;
