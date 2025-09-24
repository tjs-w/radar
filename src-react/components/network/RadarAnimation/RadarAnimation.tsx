import React, { useEffect } from "react";
import styled from "styled-components";
import debug from "../../../services/debugLogger";
import AnimationCanvas from "./AnimationCanvas";

const RadarContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

interface RadarAnimationProps {
  size: number;
  dotCount?: number;
  animationSpeed?: number;
}

const RadarAnimation: React.FC<RadarAnimationProps> = ({
  size,
  dotCount = 7,
  animationSpeed = 75,
}) => {
  // Add lifecycle logging
  useEffect(() => {
    debug.log("components", "RadarAnimation component mounted", {
      timestamp: new Date().toISOString(),
    });

    return () => {
      debug.log("components", "RadarAnimation component unmounted", {
        timestamp: new Date().toISOString(),
      });
    };
  }, []);

  return (
    <RadarContainer>
      <AnimationCanvas
        size={size}
        animationSpeed={animationSpeed}
        dotCount={dotCount}
      />
    </RadarContainer>
  );
};

export default RadarAnimation;
