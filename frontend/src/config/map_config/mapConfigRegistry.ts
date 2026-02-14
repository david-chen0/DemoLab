import type { MapConfig } from '../../interfaces/interfaces';

/**
 * Registry of all available map configurations
 * 
 * To determine this, use the runMapCalculator.ts file under utils/. More info/instructions there
 * 
 * TODO: Nuke is currently not supported because it needs Z-coordinate parsing
 */
const mapConfigs: Record<string, MapConfig> = {
  'de_ancient': {
    mapName: "de_ancient",
    coordinateBounds: {
      bottomLeft: {
        x: -2969,  // Left edge of the map
        y: -2994   // Bottom edge of the map
      },
      topRight: {
        x: 2180,   // Right edge of the map
        y: 2205    // Top edge of the map
      }
    }
  },
  'de_anubis': {
    mapName: "de_anubis",
    coordinateBounds: {
      bottomLeft: {
        x: -2775,  // Left edge of the map
        y: -2022   // Bottom edge of the map
      },
      topRight: {
        x: 2522,   // Right edge of the map
        y: 3316    // Top edge of the map
      }
    }
  },
  // TODO: Dust2's config is ever so slightly off, need to adjust these coords
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
  'de_inferno': {
    mapName: "de_inferno",
    coordinateBounds: {
      bottomLeft: {
        x: -2075,  // Left edge of the map
        y: -1104   // Bottom edge of the map
      },
      topRight: {
        x: 2932,   // Right edge of the map
        y: 3849    // Top edge of the map
      }
    }
  },
  'de_mirage': {
    mapName: "de_mirage",
    coordinateBounds: {
      bottomLeft: {
        x: -3212,  // Left edge of the map
        y: -3375   // Bottom edge of the map
      },
      topRight: {
        x: 1865,   // Right edge of the map
        y: 1671    // Top edge of the map
      }
    }
  },
  'de_overpass': {
    mapName: "de_overpass",
    coordinateBounds: {
      bottomLeft: {
        x: -4828,  // Left edge of the map
        y: -3543   // Bottom edge of the map
      },
      topRight: {
        x: 532,   // Right edge of the map
        y: 1797    // Top edge of the map
      }
    }
  }
};

/**
 * Gets the map configuration for a given map name
 * @param mapName - The name of the map (e.g., "de_dust2")
 * @returns The map configuration or null if not found
 */
export function getMapConfig(mapName: string): MapConfig | null {
  return mapConfigs[mapName] || null;
}
