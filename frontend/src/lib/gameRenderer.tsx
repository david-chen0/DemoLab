import { useEffect, useRef } from 'react';
import type {
  GameRendererProps,
} from '../interfaces/interfaces';
import { getMapConfig } from '../config/map_config/mapConfigRegistry';

// Constants
const GAME_DISPLAY_WIDTH: number = 1024; // todo: figure out if this is right or even what we want
const GAME_DISPLAY_HEIGHT: number = 1024; // todo: figure out if this is right or even what we want
const MAP_BACKGROUND_PATH_PREFIX = "/map_backgrounds"

/**
 * Maps the coordinates retrieved from the game to the canvas coordinates
 * @param mapName - Name of the map the match is played on(ex: de_dust2)
 * @param gameX - X coordinate in the game
 * @param gameY - Y coordinate in the game
 * @returns Returns the (x, y) tuple of the canvas coordinates
 */
function mapGameCoordinatesToCanvasCoordinates(mapName: string, gameX: number, gameY: number): [number, number] {
  // Get the map configuration for the specified map
  const mapConfig = getMapConfig(mapName);
  
  if (!mapConfig) {
    console.warn(`No map configuration found for map: ${mapName}. Using default coordinates.`);
    // Return center of canvas as fallback
    return [GAME_DISPLAY_WIDTH / 2, GAME_DISPLAY_HEIGHT / 2];
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
  const canvasX = normalizedX * GAME_DISPLAY_WIDTH;
  const canvasY = (1 - normalizedY) * GAME_DISPLAY_HEIGHT;
  
  // Clamp coordinates to canvas bounds
  const clampedX = Math.max(0, Math.min(GAME_DISPLAY_WIDTH, canvasX));
  const clampedY = Math.max(0, Math.min(GAME_DISPLAY_HEIGHT, canvasY));
  
  return [clampedX, clampedY];
}


export default function GameRenderer({
  gameMetadata,
  roundState,
  renderVersion,
}: GameRendererProps) {
  console.log(`Rendering the game state for game ${JSON.stringify(gameMetadata)} at tick ${roundState.tick}`)

  // Persistent object to hold the DOM <canvas> element for the map layer
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);
  // Persistent object to hold the DOM <canvas> element for the players layer
  const playerCanvasRef = useRef<HTMLCanvasElement>(null);

  // Drawing the background map, only drawn when the game changes
  useEffect(() => {
    // Getting the map canvas element and 2D rendering context
    const mapCanvas = mapCanvasRef.current;
    if (!mapCanvas) return;
    const ctx = mapCanvas.getContext("2d");
    if (!ctx) return;
    
    // Getting the image to display
    const mapName = gameMetadata.map;
    console.log(`Found map ${mapName}`)
    const mapImagePath = `${MAP_BACKGROUND_PATH_PREFIX}/${mapName}.webp`;

    // Loading the map image
    const img = new Image();
    img.src = mapImagePath; // Starts loading the image asynchronously
    img.onload = () => {
      // Resizing the canvas to match image dimensions
      // TODO: FIGURE OUT IF WE WANT TO DO THIS OR JUST HARDCODE IMAGE DIMENSIONS
      mapCanvas.width = img.width;
      mapCanvas.height = img.height;

      // Clear the canvas, then draw the background
      ctx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
      ctx.drawImage(img, 0, 0, mapCanvas.width, mapCanvas.height);
    };
    img.onerror = () => {
      console.error(`Failed to load map image: ${mapImagePath}`);
    };
  }, [gameMetadata.map]); // Only update when the game metadata's map changes

  // Drawing the players, only drawn when their state changes
  useEffect(() => {
    console.log("Drawing the player indicators on the map")

    // Getting the player canvas element and 2D rendering context
    const playerCanvas = playerCanvasRef.current;
    if (!playerCanvas) return;
    const ctx = playerCanvas.getContext("2d");
    if (!ctx) return;

    // Clears the overlay to make space for the new player states
    // TODO: Is this what we want? This seems like it would make it choppy rather than having the players flow together
    ctx.clearRect(0, 0, GAME_DISPLAY_WIDTH, GAME_DISPLAY_HEIGHT);

    // For each player, draw a circle based on their position and team
    for (const player of roundState.playerMap.values()) {
      // Map game coordinates to canvas coordinates using the map configuration
      const [canvasX, canvasY] = mapGameCoordinatesToCanvasCoordinates(
        gameMetadata.map,
        player.x,
        player.y
      );
      
      // TODO: Figure out how to display Z if important(ex: on Nuke)
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 5, 0, 2 * Math.PI); // Drawing the circle
      // TODO: If player is dead, change them to grey
      ctx.fillStyle = player.team_name == "TERRORIST" ?  "#edad13" : "#4d79ff"; // Orange for T, Blue for CT
      ctx.fill();
    }
  }, [roundState, gameMetadata.map, renderVersion]); // Update when roundState or map changes or renderVersion increments

  // Returns the two canvases
  // mapCanvas(zIndex = 0) is the static visual background
  // playerCanvas(zIndex = 1) is the player canvas on top with frequent redraws
  return (
    <div style={{ position: "relative", width: GAME_DISPLAY_WIDTH, height: GAME_DISPLAY_HEIGHT }}>
      <canvas
        ref={mapCanvasRef}
        width={GAME_DISPLAY_WIDTH}
        height={GAME_DISPLAY_HEIGHT}
        style={{ position: "absolute", top: 0, left: 0, zIndex: 0 }}
      />
      <canvas
        ref={playerCanvasRef}
        width={GAME_DISPLAY_WIDTH}
        height={GAME_DISPLAY_HEIGHT}
        style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
      />
    </div>
  );
}