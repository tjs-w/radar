import { useEffect, useRef, useState } from "react";

export interface Dot {
  x: number;
  y: number;
  size: number;
  opacity: number;
  appearing: boolean; // Whether the dot is appearing or disappearing
  animationProgress: number; // Animation progress from 0 to 1
}

export function useDots(size: number, count: number): { dots: Dot[] } {
  const [dots, setDots] = useState<Dot[]>([]);
  const timerRef = useRef<number | null>(null);

  // Create initial dots
  useEffect(() => {
    const radius = size / 2;
    const newDots: Dot[] = [];

    // Generate dots in a more realistic pattern - grouped in certain sectors
    // and with varying distances from center to simulate real radar contacts
    for (let i = 0; i < count; i++) {
      // Create clusters of dots in 2-3 sectors
      let angle;
      if (i < count / 3) {
        // Cluster 1: Top right
        angle = (Math.random() * Math.PI) / 4 - Math.PI / 8;
      } else if (i < (count * 2) / 3) {
        // Cluster 2: Bottom left
        angle = (Math.random() * Math.PI) / 4 + Math.PI - Math.PI / 8;
      } else {
        // Cluster 3: Random placement
        angle = Math.random() * Math.PI * 2;
      }

      // Vary distance from center with preference for mid-range
      // to simulate a more realistic distribution of targets
      const distanceFactor = Math.pow(Math.random(), 0.7); // Bias toward middle distances
      const distance = radius * 0.3 + distanceFactor * radius * 0.6;

      newDots.push({
        x: radius + Math.cos(angle) * distance,
        y: radius + Math.sin(angle) * distance,
        size: 2 + Math.random() * 2, // Slightly smaller size range for more realism
        opacity: 0.3 + Math.random() * 0.7,
        appearing: true,
        animationProgress: Math.random() * 0.3, // Start with lower initial progress
      });
    }

    setDots(newDots);

    // Clear any existing animation timer
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }

    // Set up a timer to periodically change dot states
    timerRef.current = window.setInterval(() => {
      setDots((prevDots) => {
        return prevDots.map((dot) => {
          // Randomly choose some dots to change their animation state
          if (Math.random() < 0.08) {
            // Slightly lower probability for more stable signatures
            return {
              ...dot,
              appearing: !dot.appearing,
              // If switching from disappearing to appearing, reset position
              ...(dot.appearing === false && {
                x:
                  radius +
                  Math.cos(Math.random() * Math.PI * 2) *
                    (Math.random() * radius * 0.9),
                y:
                  radius +
                  Math.sin(Math.random() * Math.PI * 2) *
                    (Math.random() * radius * 0.9),
              }),
            };
          }
          return dot;
        });
      });
    }, 1200); // Slightly longer interval for more stable blips

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [size, count]);

  // Update animation progress for dots
  useEffect(() => {
    const animationFrame = requestAnimationFrame(function animate() {
      setDots((prevDots) => {
        return prevDots.map((dot) => {
          // Update animation progress with slightly adjusted speeds
          let newProgress = dot.animationProgress;
          if (dot.appearing) {
            // Faster appearance
            newProgress = Math.min(newProgress + 0.025, 1);
          } else {
            // Slower fade out
            newProgress = Math.max(newProgress - 0.015, 0);
          }

          return {
            ...dot,
            animationProgress: newProgress,
            opacity: dot.appearing
              ? 0.3 + newProgress * 0.7 // Fade in from 0.3 to 1.0
              : Math.max(0.1, 0.3 + (1 - newProgress) * 0.7), // Fade out from 1.0 to 0.1 (not completely)
          };
        });
      });

      requestAnimationFrame(animate);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return { dots };
}
