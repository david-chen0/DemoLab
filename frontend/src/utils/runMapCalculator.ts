#!/usr/bin/env npx tsx

import { 
  calculateMapCoordinateBounds, 
  formatMapConfigOutput,
  type MapCalculationInput 
} from './mapCoordinateCalculator';

/**
 * Standalone script to calculate map coordinates
 * 
 * To run this script:
 * 1. Navigate to the frontend directory: cd frontend
 * 2. Run: npx tsx src/utils/runMapCalculator.ts
 * 
 * Game coordinates can be retrieved using `getpos` in the in-game console
 * Pixel position can be retrieved using websites like: https://pixspy.com/
 */
const inputData: MapCalculationInput = {
  // First reference point - replace with your measurements
  point1: {
    gamePosition: { x: 1051.033813, y: 3059.971924 },  // Replace with known game coordinates
    pixelPosition: { x: 792, y: 38 }     // Replace with measured pixel coordinates
  },
  
  // Second reference point - should be far from point1
  point2: {
    gamePosition: { x: -2203.818604, y: -1031.968750 },   // Replace with known game coordinates  
    pixelPosition: { x: 58, y: 968 }     // Replace with measured pixel coordinates
  },
  
  // Your map image dimensions
  mapImageDimensions: {
    width: 1024,   // Replace with your map image width
    height: 1024   // Replace with your map image height
  }
};

// Map name for the output
const mapName = 'de_dust2'; // Change this to your map name

console.log('🗺️  Map Coordinate Calculator');
console.log('================================');
console.log();

console.log('Input Data:');
console.log('Point 1 - Game:', inputData.point1.gamePosition, 'Pixel:', inputData.point1.pixelPosition);
console.log('Point 2 - Game:', inputData.point2.gamePosition, 'Pixel:', inputData.point2.pixelPosition);
console.log('Image Size:', inputData.mapImageDimensions);
console.log();

// Calculate the coordinate bounds
const result = calculateMapCoordinateBounds(inputData);

if (result.validation.isValid) {
  console.log('✅ Calculation Successful!');
  console.log();
  
  console.log('Results:');
  console.log('--------');
  console.log('Bottom Left:', result.coordinateBounds.bottomLeft);
  console.log('Top Right:', result.coordinateBounds.topRight);
  console.log();
  
  console.log('Scale Factors:');
  console.log(`X: ${result.scaleFactors.x.toFixed(4)} game units per pixel`);
  console.log(`Y: ${result.scaleFactors.y.toFixed(4)} game units per pixel`);
  console.log();
  
  console.log('📋 Generated Map Config (copy this to your config file):');
  console.log('='.repeat(60));
  console.log(formatMapConfigOutput(result, mapName));
  console.log('='.repeat(60));
  
} else {
  console.log('❌ Calculation Failed!');
  console.log();
  console.log('Errors:');
  result.validation.errors.forEach(error => console.log('- ' + error));
  console.log();
  console.log('Please check your input data and try again.');
}

console.log();
console.log('💡 Tips:');
console.log('- Use points that are far apart for better accuracy');
console.log('- Get game coordinates using CS2 console command: getpos');
console.log('- Measure pixel coordinates using an image editor');
console.log('- Ensure pixel coordinates are within image bounds');
console.log();
console.log('📝 Coordinate Systems:');
console.log('- Image coordinates: (0,0) is top-left, X increases right, Y increases down');
console.log('- Game coordinates: X is left-right, Y is forward-backward (increases upward)');
console.log('- The script automatically handles Y-axis inversion between systems');
console.log();
console.log('🔧 How to run:');
console.log('1. Update the inputData object above with your measurements');
console.log('2. Run: npx tsx src/utils/runMapCalculator.ts');