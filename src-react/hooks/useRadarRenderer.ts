import { useCallback } from "react";

export const useRadarRenderer = (size: number) => {
  const drawRadar = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      scanAngle: number,
      dots: { x: number; y: number; age: number }[],
      dataCallback?: (info: {
        scanPercent: number;
        targetCount: number;
      }) => void
    ) => {
      const center = size / 2;
      const radius = Math.min(center, center) - 4;

      // Calculate radian angle once for reuse
      const radianAngle = (scanAngle * Math.PI) / 180;

      // Enable crisp rendering
      ctx.imageSmoothingEnabled = false;

      // Clear canvas with transparent background
      ctx.clearRect(0, 0, size, size);

      // Set up clipping region (circular)
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.clip();

      // Draw square grid (simplified) - using blue tones
      const gridSize = Math.floor(size / 12);

      // Draw vertical grid lines
      for (let x = 0; x <= size; x += gridSize) {
        // Skip the center X axis as we'll draw it separately
        if (Math.abs(x - center) > 1) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, size);
          ctx.strokeStyle = "rgba(65, 145, 255, 0.15)";
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // Draw horizontal grid lines
      for (let y = 0; y <= size; y += gridSize) {
        // Skip the center Y axis as we'll draw it separately
        if (Math.abs(y - center) > 1) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(size, y);
          ctx.strokeStyle = "rgba(65, 145, 255, 0.15)";
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // Restore clipping
      ctx.restore();

      // Draw outer ring with bright blue
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(65, 145, 255, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw X and Y axes through center
      ctx.beginPath();
      // X-axis
      ctx.moveTo(0, center);
      ctx.lineTo(size, center);
      // Y-axis
      ctx.moveTo(center, 0);
      ctx.lineTo(center, size);
      ctx.strokeStyle = "rgba(65, 145, 255, 0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw concentric circles (simplified)
      const numRings = 3;
      ctx.strokeStyle = "rgba(65, 145, 255, 0.5)";
      ctx.lineWidth = 0.75;

      for (let i = 1; i <= numRings; i++) {
        const ringRadius = (radius * i) / (numRings + 1);
        ctx.beginPath();
        ctx.arc(center, center, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw scan trail with gradient
      const trailAngle = 0.785; // 45 degrees in radians (π/4)
      const trailStartAngle = radianAngle - trailAngle;
      const trailEndAngle = radianAngle;

      // Manual gradient for trail (createConicGradient isn't widely supported)
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, trailStartAngle, trailEndAngle);
      ctx.lineTo(center, center);

      // Create gradient manually with steps
      const steps = 15; // More steps for smoother gradient
      for (let i = 0; i < steps; i++) {
        const subStartAngle = trailStartAngle + (trailAngle * i) / steps;
        const subEndAngle = trailStartAngle + (trailAngle * (i + 1)) / steps;
        // Darker trail with higher maximum opacity
        const alpha = (i / steps) * 0.45;

        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, subStartAngle, subEndAngle);
        ctx.lineTo(center, center);
        ctx.fillStyle = `rgba(45, 125, 235, ${alpha})`;
        ctx.fill();
      }

      // Draw scanning line - bright blue
      const scanX = center + radius * Math.cos(radianAngle);
      const scanY = center + radius * Math.sin(radianAngle);

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(scanX, scanY);
      ctx.strokeStyle = "#4191ff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw dots - using brighter blue for targets with variable sizes
      const activeDots: { x: number; y: number; age: number }[] = [];
      for (const dot of dots) {
        const alpha = 1 - dot.age / 100;
        if (alpha <= 0) continue;

        const x = center + (dot.x - 0.5) * radius * 2;
        const y = center + (dot.y - 0.5) * radius * 2;

        // Generate random size between 1.5 and 4.5 based on dot position
        const seed = (dot.x * 10 + dot.y * 10) % 1;
        const dotSize = 1.5 + seed * 3;

        activeDots.push(dot);

        // Draw dot glow effect
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, dotSize * 1.8);
        gradient.addColorStop(0, `rgba(95, 165, 255, ${alpha * 0.7})`);
        gradient.addColorStop(0.5, `rgba(65, 145, 255, ${alpha * 0.4})`);
        gradient.addColorStop(1, `rgba(35, 125, 255, 0)`);
        ctx.fillStyle = gradient;
        ctx.arc(x, y, dotSize * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Draw main dot - brighter blue
        ctx.beginPath();
        ctx.fillStyle = `rgba(145, 205, 255, ${alpha * 0.9})`;
        ctx.arc(x, y, dotSize * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Add highlight to create depth
        ctx.beginPath();
        ctx.fillStyle = `rgba(220, 240, 255, ${alpha})`;
        ctx.arc(x, y, dotSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Update data callback with minimal info
      if (dataCallback) {
        dataCallback({ scanPercent: 0, targetCount: activeDots.length });
      }
    },
    [size]
  );

  return drawRadar;
};
