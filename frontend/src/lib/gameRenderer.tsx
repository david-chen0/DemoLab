import { useEffect, useRef } from 'react';
import type {
  GameRendererProps,
} from '../interfaces/interfaces';

// Constants
const GAME_DISPLAY_WIDTH: number = 1024; // todo: figure out if this is right or even what we want
const GAME_DISPLAY_HEIGHT: number = 1024; // todo: figure out if this is right or even what we want
const MAP_BACKGROUND_PATH_PREFIX = "/map_backgrounds"

// todo: delete mapView once we get this working
export default function GameRenderer({
  gameMetadata,
  roundState,
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
    // TODO: Do we want to use .webp file type for images? Supports transparent background, but check if that's what we want
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
      const mapX = player.x;
      const mapY = player.y;
      ctx.beginPath();
      ctx.arc(mapX, mapY, 5, 0, 2 * Math.PI); // Drawing the circle
      ctx.fillStyle = player.team_name == "TERRORIST" ?  "#edad13" : "#4d79ff"; // Orange for T, Blue for CT
      ctx.fill();
    }
  }, [roundState]); // Update when roundState changes

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