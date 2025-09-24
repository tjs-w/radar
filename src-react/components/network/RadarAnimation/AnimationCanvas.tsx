import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useAnimationFrame } from "../../../hooks/useAnimationFrame";
import { useDots } from "../../../hooks/useDots";
import { useRadarRenderer } from "../../../hooks/useRadarRenderer";
import debug from "../../../services/debugLogger";

export interface AnimationCanvasProps {
  size: number;
  animationSpeed: number;
  dotCount: number;
}

const Canvas = styled.canvas<{ size: number }>`
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
  border-radius: 50%;
  overflow: hidden;
`;

const AnimationCanvas: React.FC<AnimationCanvasProps> = ({
  size,
  animationSpeed,
  dotCount,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { dots } = useDots(size, dotCount);
  const drawRadar = useRadarRenderer(size);
  const [scanAngle, setScanAngle] = useState(0);

  // Component lifecycle logging
  useEffect(() => {
    debug.log("components", "AnimationCanvas component mounted", {
      size,
      animationSpeed,
      dotCount,
      timestamp: new Date().toISOString(),
    });

    return () => {
      debug.log("components", "AnimationCanvas component unmounted", {
        timestamp: new Date().toISOString(),
      });
    };
  }, [size, animationSpeed, dotCount]);

  // Animate using requestAnimationFrame
  useAnimationFrame((deltaTime) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Increase sweep speed factor to 1.5 for extremely fast rotation
    const sweepSpeedFactor = 1.5;

    // Update scan angle with faster sweep
    const newAngle =
      (scanAngle + animationSpeed * deltaTime * sweepSpeedFactor) % 360;
    setScanAngle(newAngle);

    // Draw radar with current angle and dots
    drawRadar(
      ctx,
      newAngle,
      dots.map((dot) => ({
        x: dot.x / size,
        y: dot.y / size,
        age: (1 - dot.opacity) * 100,
      }))
    );
  });

  return <Canvas ref={canvasRef} width={size} height={size} size={size} />;
};

export default AnimationCanvas;
