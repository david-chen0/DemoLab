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

    // Account for header, upload section, round selector, and padding
    // Estimate space taken by header (~100px), upload section (~150px), round selector (~100px), and padding
    const availableHeight = viewportHeight - 350 - padding * 2;
    
    // Single column layout: use most of the width minus padding
    const availableWidth = viewportWidth - padding * 4;

    // Calculate size based on the limiting dimension, maintaining square aspect ratio
    let size = Math.min(availableWidth, availableHeight);
    
    // Apply constraints
    size = Math.max(minSize, Math.min(maxSize, size));
    
    // Calculate final dimensions based on aspect ratio
    const width = size;
    const height = size / aspectRatio;

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