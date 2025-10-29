import type { MapConfig } from '../../interfaces/interfaces';

/**
 * Registry of all available map configurations
 * 
 * To determine this, use the runMapCalculator.ts file under utils/. More info/instructions there
 */
const mapConfigs: Record<string, MapConfig> = {
  'de_dust2': {
    mapName: "de_dust2",
    coordinateBounds: {
      bottomLeft: {
        x: -2461,  // Left edge of the map
        y: -1278   // Bottom edge of the map
      },
      topRight: {
        x: 2080,   // Right edge of the map
        y: 3227    // Top edge of the map
      }
    }
  },
};

/**
 * Gets the map configuration for a given map name
 * @param mapName - The name of the map (e.g., "de_dust2")
 * @returns The map configuration or null if not found
 */
export function getMapConfig(mapName: string): MapConfig | null {
  return mapConfigs[mapName] || null;
}
