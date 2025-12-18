import { useEffect, useRef } from 'react';
import type {
  GameRendererProps,
} from '../interfaces/interfaces';
import { getMapConfig } from '../config/map_config/mapConfigRegistry';
import { useResponsiveGameSize } from '../hooks/useResponsiveGameSize';

// Constants
const MAP_BACKGROUND_PATH_PREFIX = "/map_backgrounds"

/**
 * Maps the coordinates retrieved from the game to the canvas coordinates
 * @param mapName - Name of the map the match is played on(ex: de_dust2)
 * @param gameX - X coordinate in the game
 * @param gameY - Y coordinate in the game
 * @param canvasWidth - Width of the canvas
 * @param canvasHeight - Height of the canvas
 * @returns Returns the (x, y) tuple of the canvas coordinates
 */
function mapGameCoordinatesToCanvasCoordinates(
  mapName: string,
  gameX: number,
  gameY: number,
  canvasWidth: number,
  canvasHeight: number
): [number, number] {
  // Get the map configuration for the specified map
  const mapConfig = getMapConfig(mapName);
  
  if (!mapConfig) {
    console.warn(`No map configuration found for map: ${mapName}. Using default coordinates.`);
    // Return center of canvas as fallback
    return [canvasWidth / 2, canvasHeight / 2];
  }
  
  const { coordinateBounds } = mapConfig;
  const { bottomLeft, topRight } = coordinateBounds;
  
  // Calculate the game coordinate ranges
  const gameWidth = topRight.x - bottomLeft.x;
  const gameHeight = topRight.y - bottomLeft.y;
  
  // Normalize the game coordinates to 0-1 range
  const normalizedX = (gameX - bottomLeft.x) / gameWidth;
  const normalizedY = (gameY - bottomLeft.y) / gameHeight;
  
  // Convert to canvas coordinates
  // Note: Canvas Y is inverted (0 is top), so we flip the Y coordinate
  const canvasX = normalizedX * canvasWidth;
  const canvasY = (1 - normalizedY) * canvasHeight;
  
  // Clamp coordinates to canvas bounds
  const clampedX = Math.max(0, Math.min(canvasWidth, canvasX));
  const clampedY = Math.max(0, Math.min(canvasHeight, canvasY));
  
  return [clampedX, clampedY];
}


export default function GameRenderer({
  gameMetadata,
  roundState,
  renderVersion,
}: GameRendererProps) {
  console.log(`Rendering the game state for game ${JSON.stringify(gameMetadata)} at tick ${roundState.tick}`)

  // Get responsive game size
  const { width: gameWidth, height: gameHeight } = useResponsiveGameSize({
    minSize: 400,
    maxSize: 1024,
    aspectRatio: 1,
    padding: 20
  });

  // Persistent object to hold the DOM <canvas> element for the map layer
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);
  // Persistent object to hold the DOM <canvas> element for the players layer
  const playerCanvasRef = useRef<HTMLCanvasElement>(null);

  // Drawing the background map, only drawn when the game changes or size changes
  useEffect(() => {
    // Getting the map canvas element and 2D rendering context
    const mapCanvas = mapCanvasRef.current;
    if (!mapCanvas) return;
    const ctx = mapCanvas.getContext("2d");
    if (!ctx) return;
    
    // Set canvas size
    mapCanvas.width = gameWidth;
    mapCanvas.height = gameHeight;
    
    // Getting the image to display
    const mapName = gameMetadata.map;
    const mapImagePath = `${MAP_BACKGROUND_PATH_PREFIX}/${mapName}.webp`;

    // Loading the map image
    const img = new Image();
    img.src = mapImagePath; // Starts loading the image asynchronously
    img.onload = () => {
      // Clear the canvas, then draw the background scaled to fit
      ctx.clearRect(0, 0, gameWidth, gameHeight);
      ctx.drawImage(img, 0, 0, gameWidth, gameHeight);
    };
    img.onerror = () => {
      console.error(`Failed to load map image: ${mapImagePath}`);
    };
  }, [gameMetadata.map, gameWidth, gameHeight]); // Update when map or size changes

  // Drawing the players, only drawn when their state changes
  useEffect(() => {
    console.log("Drawing the player indicators on the map")

    // Getting the player canvas element and 2D rendering context
    const playerCanvas = playerCanvasRef.current;
    if (!playerCanvas) return;
    const ctx = playerCanvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    playerCanvas.width = gameWidth;
    playerCanvas.height = gameHeight;

    // Clears the overlay to make space for the new player states
    ctx.clearRect(0, 0, gameWidth, gameHeight);

    // Calculate player dot size based on canvas size
    const playerDotRadius = Math.max(3, gameWidth / 200);

    // For each player, draw a circle based on their position and team
    for (const player of roundState.playerMap.values()) {
      // Map game coordinates to canvas coordinates using the map configuration
      const [canvasX, canvasY] = mapGameCoordinatesToCanvasCoordinates(
        gameMetadata.map,
        player.x,
        player.y,
        gameWidth,
        gameHeight
      );
      
      // TODO: Figure out how to display Z if important(ex: on Nuke)
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, playerDotRadius, 0, 2 * Math.PI); // Drawing the circle
      
      // Color of the player's bubble
      let fillStyle;
      if (player.team_name == "TERRORIST") {
        if (player.is_alive) {
          fillStyle = "#edad13";
        } else {
          fillStyle = "#f7f0ba";
        }
      } else if (player.team_name == "CT") {
        if (player.is_alive) {
          fillStyle = "#4d79ff";
        } else {
          fillStyle = "#bad0f7";
        }
      } else {
        fillStyle = "#ffffff";
      }
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
  }, [roundState, gameMetadata.map, renderVersion, gameWidth, gameHeight]); // Update when roundState, map, or size changes

  // Returns the two canvases
  // mapCanvas(zIndex = 0) is the static visual background
  // playerCanvas(zIndex = 1) is the player canvas on top with frequent redraws
  return (
    <div style={{ position: "relative", width: gameWidth, height: gameHeight }}>
      <canvas
        ref={mapCanvasRef}
        width={gameWidth}
        height={gameHeight}
        style={{ position: "absolute", top: 0, left: 0, zIndex: 0 }}
      />
      <canvas
        ref={playerCanvasRef}
        width={gameWidth}
        height={gameHeight}
        style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
      />
    </div>
  );
}