import { useEffect, useRef } from 'react';
import type {
  GameMetadata,
} from '../interfaces/interfaces';

// Constants
const MAP_BACKGROUND_PATH_PREFIX = "/map_backgrounds"

export function MapBackground(gameMetadata: GameMetadata) {
  console.log(`Generating map background for game with metadata ${gameMetadata}`)

  // Stores the <canvas> DOM element
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Stores the image of the map that we'll be displaying
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Draw the map once, only when the game changes
  useEffect(() => {
    // Getting the image to display
    const mapName = gameMetadata.map;
    console.log(`Found map ${mapName}`)
    // TODO: Do we want to use .webp file type for images? Supports transparent background, but check if that's what we want
    const mapImagePath = `${MAP_BACKGROUND_PATH_PREFIX}/${mapName}.webp`;

    // Loading the map image
    const img = new Image();
    img.src = mapImagePath; // Starts loading the image asynchronously
    img.onload = () => {
      imageRef.current = img;

      // Getting the canvas element
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Getting a 2D rendering context
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      // Resizing the canvas to match image dimensions
      // TODO: FIGURE OUT IF WE WANT TO DO THIS OR JUST HARDCODE IMAGE DIMENSIONS
      canvas.width = img.width;
      canvas.height = img.height;

      // Clear the canvas, then draw the background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.onerror = () => {
      console.error(`Failed to load map image: ${mapImagePath}`);
    };
  }, [gameMetadata.map]); // Only update when the game metadata's map changes

  return (
    <canvas
      ref={canvasRef}
      className="rounded-xl shadow-md"
      style={{ maxWidth: "100%", height: "auto" }}
    />
  );
}
