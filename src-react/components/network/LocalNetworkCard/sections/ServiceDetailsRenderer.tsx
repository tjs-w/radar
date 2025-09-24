import React from "react";
import styled from "styled-components";
import InfoRow from "../../../common/InfoRow";
import Section from "../../../common/Section";

interface ServiceDetailsRendererProps {
  details: string;
}


const DetailsSection = styled(Section)`
  .section-title {
    font-size: var(--fs-md);
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--text-primary);
    display: flex;
    align-items: center;

    &::before {
      content: "";
      display: inline-block;
      width: 4px;
      height: 16px;
      background-color: var(--primary-color);
      margin-right: 8px;
      border-radius: 2px;
    }
  }

  /* Remove any background accents from rows */
  && [class*="Row-"] {
    background: none;
    border: none;
    border-bottom: 1px solid var(--border-color-light);

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background-color: var(--hover-bg);
    }
  }
`;

// Function to check if a string is likely a UPnP-related string
const isUPnPRelated = (str: string): boolean => {
  const lowerStr = str.toLowerCase();
  return (
    lowerStr.includes("upnp") ||
    lowerStr.includes("urn:schemas-upnp-org") ||
    lowerStr.includes("discovery") ||
    lowerStr.includes("ssdp")
  );
};

// Function to check if a string is likely mDNS-related
const isMDNSRelated = (str: string): boolean => {
  const lowerStr = str.toLowerCase();
  return (
    lowerStr.includes("mdns") ||
    lowerStr.includes("_tcp.local") ||
    lowerStr.includes("_udp.local") ||
    lowerStr.includes("txt records:") ||
    lowerStr.includes("service type:") ||
    (lowerStr.includes("discovery") && lowerStr.includes("mdns"))
  );
};

// Get appropriate icon for a field key
const getFieldIcon = (
  key: string,
  serviceType: "upnp" | "mdns" | "other"
): string => {
  const lowerKey = key.toLowerCase();

  // Common icons across service types
  if (lowerKey.includes("protocol") || lowerKey === "device") return "token";
  if (lowerKey.includes("model") || lowerKey.includes("manufacturer"))
    return "devices";
  if (lowerKey.includes("url") || lowerKey.includes("location")) return "link";
  if (lowerKey.includes("uuid") || lowerKey.includes("id")) return "tag";

  // Service-specific icons
  if (serviceType === "upnp") {
    if (lowerKey.includes("target") || lowerKey.includes("st")) return "target";
    if (lowerKey.includes("usn")) return "tag";
  }

  if (serviceType === "mdns") {
    if (lowerKey.includes("service")) return "api";
    if (lowerKey.includes("txt") || lowerKey.includes("property"))
      return "data_object";
    if (lowerKey.includes("port")) return "settings_ethernet";
    if (lowerKey.includes("host") || lowerKey.includes("address")) return "dns";
  }

  return "info";
};

// Format display key for better readability
const formatDisplayKey = (
  key: string,
  serviceType: "upnp" | "mdns" | "other"
): string => {
  // Format key with spaces and capitalization
  let displayKey = key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  // Special case replacements for service types
  if (serviceType === "upnp") {
    if (key === "device") return "Protocol";
    if (key === "deviceType") return "Device Type";
  }

  if (serviceType === "mdns") {
    if (key === "service_type") return "Service";
  }

  return displayKey;
};

// This component parses and renders different types of service details
const ServiceDetailsRenderer: React.FC<ServiceDetailsRendererProps> = ({
  details,
}) => {
  // Determine service type early
  const isUPnP = isUPnPRelated(details);
  const isMDNS = isMDNSRelated(details);
  const serviceType = isUPnP ? "upnp" : isMDNS ? "mdns" : "other";

  // Helper function to extract key-value pairs from any text
  const extractKeyValuePairs = (text: string) => {
    // Split into lines and remove empty ones
    const lines = text.split("\n").filter((line) => line.trim().length > 0);

    // Extract pairs from each line
    const pairs = lines
      .map((line) => {
        const colonIndex = line.indexOf(":");
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          return { key, value, isIndented: line.startsWith(" ") };
        }
        return null;
      })
      .filter((pair) => pair !== null);

    return pairs;
  };

  // Try to parse as JSON first
  try {
    const parsedDetails = JSON.parse(details);

    // Handle different formats of details
    const renderDetails = () => {
      // If the details are a simple key-value object
      if (typeof parsedDetails === "object" && !Array.isArray(parsedDetails)) {
        // Priority fields based on service type
        const priorityKeys = [
          "protocol",
          "device",
          "deviceType",
          "service_type",
          "friendlyName",
          "hostname",
          "name",
          "manufacturer",
          "modelName",
          "address",
          "port",
        ];

        // Organize fields for better display
        const orderedEntries = Object.entries(parsedDetails).sort((a, b) => {
          const aIndex = priorityKeys.indexOf(a[0]);
          const bIndex = priorityKeys.indexOf(b[0]);

          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;

          // Alphabetical otherwise
          return a[0].localeCompare(b[0]);
        });

        return orderedEntries.map(([key, value]) => {
          // Format key for display using common function
          const displayKey = formatDisplayKey(key, serviceType);

          // Determine icon based on field type
          const icon = getFieldIcon(key, serviceType);

          // Format the value for better display
          let displayValue = String(value);

          // Handle nested objects or arrays
          if (typeof value === "object" && value !== null) {
            try {
              displayValue = JSON.stringify(value);
            } catch (e) {
              displayValue = String(value);
            }
          }

          // Determine if this is a key field that should be highlighted
          const isHighlightField =
            key === "protocol" ||
            key === "device" ||
            (serviceType === "mdns" && key === "service_type");

          return (
            <InfoRow
              key={key}
              label={displayKey}
              value={displayValue}
              icon={icon}
              copyable
              valueClassName={isHighlightField ? "highlight-value" : ""}
            />
          );
        });
      }

      // If it's an array or other format, parse as text to extract key-value pairs
      const jsonString = JSON.stringify(parsedDetails, null, 2);
      const pairs = extractKeyValuePairs(jsonString);

      // If we found pairs, display them as rows
      if (pairs && pairs.length > 0) {
        return pairs.map((pair, index) => {
          const displayKey = formatDisplayKey(pair!.key, serviceType);
          const icon = getFieldIcon(pair!.key, serviceType);

          return (
            <InfoRow
              key={`json-${index}`}
              label={displayKey}
              value={pair!.value}
              icon={pair!.isIndented ? "subdirectory_arrow_right" : icon}
              copyable
            />
          );
        });
      }

      // If we couldn't extract pairs, split the JSON into separate rows
      return jsonString
        .split("\n")
        .map((line, index) => (
          <InfoRow
            key={`json-line-${index}`}
            label="JSON"
            value={line}
            icon="code"
            copyable
          />
        ));
    };

    return (
      <DetailsSection title="Additional Details">
        {renderDetails()}
      </DetailsSection>
    );
  } catch (error) {
    // If not JSON, handle as text with special formatting

    // Try to extract all key-value pairs from the text
    const pairs = extractKeyValuePairs(details);
    let processedLines: Array<{
      label: string;
      value: string;
      icon: string;
      isHighlighted: boolean;
    }> = [];

    // Check if we have key-value pairs to work with
    if (pairs && pairs.length > 0) {

      // Process each pair to create the processed lines
      pairs.forEach((pair, _index) => {
        // Get display key and icon
        let displayKey = formatDisplayKey(pair!.key, serviceType);
        let icon = pair!.isIndented
          ? "subdirectory_arrow_right"
          : getFieldIcon(pair!.key, serviceType);
        let isHighlighted = false;

        // Handle special cases
        if (pair!.key.toLowerCase().includes("txt records")) {
          icon = "data_object";
        } else if (
          pair!.key.toLowerCase() === "protocol" ||
          pair!.key.toLowerCase() === "service type"
        ) {
          isHighlighted = true;
          icon = "token";
        }

        // Add to processed lines
        processedLines.push({
          label: displayKey,
          value: pair!.value,
          icon: icon,
          isHighlighted: isHighlighted,
        });
      });
    } else {
      // If no key-value pairs were found, try to parse it line by line
      const lines = details
        .split("\n")
        .filter((line) => line.trim().length > 0);

      lines.forEach((line, _index) => {
        // Try to give meaningful labels based on content
        let label = "Info";
        let icon = "info";

        // Try to automatically detect content type
        if (line.match(/\d+\.\d+\.\d+\.\d+/)) {
          label = "IP Address";
          icon = "dns";
        } else if (line.match(/\b([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})\b/)) {
          label = "MAC Address";
          icon = "perm_device_information";
        } else if (line.toLowerCase().includes("port")) {
          label = "Port";
          icon = "settings_ethernet";
        } else if (
          line.toLowerCase().includes("hostname") ||
          line.toLowerCase().includes("host")
        ) {
          label = "Host";
          icon = "dns";
        }

        processedLines.push({
          label: label,
          value: line.trim(),
          icon: icon,
          isHighlighted: false,
        });
      });
    }

    // Sort the processed lines to put important information first
    processedLines.sort((a, b) => {
      const priorityLabels = [
        "Protocol",
        "Service Type",
        "Service",
        "Host",
        "Port",
        "IP Address",
        "MAC Address",
      ];

      const aIndex = priorityLabels.indexOf(a.label);
      const bIndex = priorityLabels.indexOf(b.label);

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      return 0;
    });

    return (
      <DetailsSection title="Additional Details">
        {processedLines.map((item, index) => (
          <InfoRow
            key={`detail-${index}`}
            label={item.label}
            value={item.value}
            icon={item.icon}
            copyable
            valueClassName={item.isHighlighted ? "highlight-value" : ""}
          />
        ))}
      </DetailsSection>
    );
  }
};

export default ServiceDetailsRenderer;
