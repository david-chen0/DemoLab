import { useState, useEffect, useCallback } from 'react';

interface GameSize {
  width: number;
  height: number;
}

interface UseResponsiveGameSizeOptions {
  minSize?: number;
  maxSize?: number;
  aspectRatio?: number;
  padding?: number;
}

/**
 * Custom hook that calculates optimal game renderer size based on available window space
 * @param options Configuration options for size calculation
 * @returns Object containing width and height for the game renderer
 */
export function useResponsiveGameSize(options: UseResponsiveGameSizeOptions = {}): GameSize {
  const {
    minSize = 400,
    maxSize = 1024,
    aspectRatio = 1, // Square by default
    padding = 40 // Padding around the game area
  } = options;

  const [gameSize, setGameSize] = useState<GameSize>({
    width: maxSize,
    height: maxSize
  });

  const calculateGameSize = useCallback(() => {
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    console.log(`Calculating game size for viewport: ${viewportWidth}x${viewportHeight}`);

    // Account for header, controls, and other UI elements
    // Estimate space taken by header (~100px), upload section (~150px), and padding
    const availableHeight = viewportHeight - 250 - padding * 2;
    
    let availableWidth: number;
    
    // Handle different screen sizes
    if (viewportWidth <= 1200) {
      // Mobile/tablet: stacked layout, use full width minus padding
      availableWidth = viewportWidth - padding * 4; // Extra padding for mobile
      console.log(`Mobile/tablet layout: availableWidth = ${availableWidth}`);
    } else {
      // Desktop: side-by-side layout
      // Right column: min 350px, max 500px, plus gap (2rem = 32px), plus app padding (4rem = 64px)
      const rightColumnWidth = Math.min(500, Math.max(350, viewportWidth * 0.3));
      const layoutOverhead = rightColumnWidth + 32 + 64; // right column + gap + app padding
      availableWidth = Math.max(minSize, viewportWidth - layoutOverhead);
      console.log(`Desktop layout: rightColumnWidth = ${rightColumnWidth}, availableWidth = ${availableWidth}`);
    }

    // Calculate size based on the limiting dimension, maintaining square aspect ratio
    let size = Math.min(availableWidth, availableHeight);
    
    // Apply constraints
    size = Math.max(minSize, Math.min(maxSize, size));
    
    // Calculate final dimensions based on aspect ratio
    const width = size;
    const height = size / aspectRatio;

    console.log(`Final game size: ${width}x${height}`);

    setGameSize({
      width: Math.round(width),
      height: Math.round(height)
    });
  }, [minSize, maxSize, aspectRatio, padding]);

  useEffect(() => {
    // Calculate initial size
    calculateGameSize();

    // Add resize listener with throttling to prevent excessive calculations
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        calculateGameSize();
      }, 100); // Throttle resize events
    };

    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateGameSize]);

  return gameSize;
}