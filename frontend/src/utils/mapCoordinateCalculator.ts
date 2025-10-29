import type { MapCoordinateBounds } from '../interfaces/interfaces';

/**
 * Represents a reference point with both game coordinates and pixel coordinates
 */
export interface ReferencePoint {
  gamePosition: {
    x: number; // Game coordinate X
    y: number; // Game coordinate Y
  };
  pixelPosition: {
    x: number; // Pixel coordinate X on the map image
    y: number; // Pixel coordinate Y on the map image
  };
}

/**
 * Input data for calculating map coordinate bounds
 */
export interface MapCalculationInput {
  point1: ReferencePoint;
  point2: ReferencePoint;
  mapImageDimensions: {
    width: number;  // Width of the map image in pixels
    height: number; // Height of the map image in pixels
  };
}

/**
 * Result of the map coordinate calculation
 */
export interface MapCalculationResult {
  coordinateBounds: MapCoordinateBounds;
  scaleFactors: {
    x: number; // Game units per pixel in X direction
    y: number; // Game units per pixel in Y direction
  };
  validation: {
    isValid: boolean;
    errors: string[];
  };
}

/**
 * Calculates the map coordinate bounds (bottomLeft and topRight) using two reference points.
 * 
 * The algorithm works by:
 * 1. Calculating the scale factor (game units per pixel) for both X and Y axes
 * 2. Using linear interpolation to find the game coordinates of the image corners
 * 
 * @param input - The input data containing two reference points and map dimensions
 * @returns The calculated coordinate bounds and validation results
 */
export function calculateMapCoordinateBounds(input: MapCalculationInput): MapCalculationResult {
  const { point1, point2, mapImageDimensions } = input;
  const errors: string[] = [];

  // Validate input
  if (!validateInput(input, errors)) {
    return {
      coordinateBounds: { bottomLeft: { x: 0, y: 0 }, topRight: { x: 0, y: 0 } },
      scaleFactors: { x: 0, y: 0 },
      validation: { isValid: false, errors }
    };
  }

  // Calculate the differences in game coordinates and pixel coordinates
  const gameXDiff = point2.gamePosition.x - point1.gamePosition.x;
  const gameYDiff = point2.gamePosition.y - point1.gamePosition.y;
  const pixelXDiff = point2.pixelPosition.x - point1.pixelPosition.x;
  // IMPORTANT: Invert Y pixel difference because image Y=0 is at top, but game Y increases upward
  const pixelYDiff = -(point2.pixelPosition.y - point1.pixelPosition.y);

  // Calculate scale factors (game units per pixel)
  const scaleX = gameXDiff / pixelXDiff;
  const scaleY = gameYDiff / pixelYDiff;

  // Calculate game coordinates for the image corners
  // Bottom-left corner is at pixel (0, mapHeight) in image coordinates
  // Top-right corner is at pixel (mapWidth, 0) in image coordinates
  // Note: In image coordinates, Y=0 is at the top, but in game coordinates, Y increases upward

  // Calculate bottom-left game coordinates (pixel position: 0, mapHeight)
  const bottomLeftX = point1.gamePosition.x - (point1.pixelPosition.x * scaleX);
  const bottomLeftY = point1.gamePosition.y + ((point1.pixelPosition.y - mapImageDimensions.height) * scaleY);

  // Calculate top-right game coordinates (pixel position: mapWidth, 0)
  const topRightX = point1.gamePosition.x + ((mapImageDimensions.width - point1.pixelPosition.x) * scaleX);
  const topRightY = point1.gamePosition.y + (point1.pixelPosition.y * scaleY);

  const coordinateBounds: MapCoordinateBounds = {
    bottomLeft: {
      x: Math.round(bottomLeftX),
      y: Math.round(bottomLeftY)
    },
    topRight: {
      x: Math.round(topRightX),
      y: Math.round(topRightY)
    }
  };

  return {
    coordinateBounds,
    scaleFactors: {
      x: scaleX,
      y: scaleY
    },
    validation: {
      isValid: true,
      errors: []
    }
  };
}

/**
 * Validates the input data for the coordinate calculation
 */
function validateInput(input: MapCalculationInput, errors: string[]): boolean {
  const { point1, point2, mapImageDimensions } = input;

  // Check if points are different
  if (point1.gamePosition.x === point2.gamePosition.x && point1.gamePosition.y === point2.gamePosition.y) {
    errors.push("The two reference points must have different game coordinates");
  }

  if (point1.pixelPosition.x === point2.pixelPosition.x && point1.pixelPosition.y === point2.pixelPosition.y) {
    errors.push("The two reference points must have different pixel coordinates");
  }

  // Check if pixel coordinates are within image bounds
  if (point1.pixelPosition.x < 0 || point1.pixelPosition.x > mapImageDimensions.width ||
      point1.pixelPosition.y < 0 || point1.pixelPosition.y > mapImageDimensions.height) {
    errors.push("Point 1 pixel coordinates are outside the image bounds");
  }

  if (point2.pixelPosition.x < 0 || point2.pixelPosition.x > mapImageDimensions.width ||
      point2.pixelPosition.y < 0 || point2.pixelPosition.y > mapImageDimensions.height) {
    errors.push("Point 2 pixel coordinates are outside the image bounds");
  }

  // Check if image dimensions are valid
  if (mapImageDimensions.width <= 0 || mapImageDimensions.height <= 0) {
    errors.push("Map image dimensions must be positive");
  }

  // Check if points create a valid scale (not parallel to axes)
  const pixelXDiff = point2.pixelPosition.x - point1.pixelPosition.x;
  const pixelYDiff = point2.pixelPosition.y - point1.pixelPosition.y;

  if (Math.abs(pixelXDiff) < 1 && Math.abs(pixelYDiff) < 1) {
    errors.push("Reference points are too close together in pixel space");
  }

  return errors.length === 0;
}

/**
 * Creates a formatted string representation of the calculation result
 * for easy copying into map configuration files
 */
export function formatMapConfigOutput(result: MapCalculationResult, mapName: string): string {
  if (!result.validation.isValid) {
    return `// Error calculating coordinates for ${mapName}:\n// ${result.validation.errors.join('\n// ')}`;
  }

  return `export const ${mapName}_config: MapConfig = {
  mapName: "${mapName}",
  coordinateBounds: {
    bottomLeft: {
      x: ${result.coordinateBounds.bottomLeft.x},  // Left edge of the map
      y: ${result.coordinateBounds.bottomLeft.y}   // Bottom edge of the map
    },
    topRight: {
      x: ${result.coordinateBounds.topRight.x},   // Right edge of the map  
      y: ${result.coordinateBounds.topRight.y}    // Top edge of the map
    }
  }
};

// Scale factors: ${result.scaleFactors.x.toFixed(4)} game units per pixel (X), ${result.scaleFactors.y.toFixed(4)} game units per pixel (Y)`;
}