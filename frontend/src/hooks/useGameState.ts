import { useState, useRef, useEffect } from 'react';
import type { GameMetadata, RoundState, PlayerData, ChunkData, DatasetName } from '../interfaces/interfaces';
import { Dataset } from '../interfaces/interfaces';
import { getDemoMetadata, streamData } from '../services/api';
import { ChunkCoordinator } from '../lib/chunkCoordinator';
import { GameStateManager } from '../lib/gameStateManager';

/**
 * Custom React hook for managing game state including demo metadata,
 * round data, player states, and tick navigation for CS2 demo playback.
 * Now supports streaming data instead of loading everything at once.
 */
export const useGameState = () => {
  // Constants
  // TODO: Game still feels a bit quick?? Like its somehow more than 64 ticks per second, look into this
  const TICKS_PER_SECOND = 64; // Valve forces 64 ticks per second for all servers

  // Stores demo metadata after successful ingestion
  const [demoMetadata, setDemoMetadata] = useState<{
    metadata: GameMetadata;
  } | null>(null);
  // Stores the currently selected round number
  const [selectedRound, setSelectedRound] = useState<number>(1);
  // Stores current round state - using useRef since roundState is edited in-place and needs to be edited constantly. Re-renders are controlled by renderVersion
  const roundStateRef = useRef<RoundState | null>(null);
  // Tracks the current tick index for each dataset/table
  const currentTickIndexMap = useRef<Map<DatasetName, number>>(new Map());
  // Stores the first and last tick of the round for efficient validation
  const [firstTick, setFirstTick] = useState<number>(-1);
  const [lastTick, setLastTick] = useState<number>(-1);
  // Version counter to force re-renders when roundState is mutated
  const [renderVersion, setRenderVersion] = useState<number>(0);
  // Animation state management
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Streaming-related state
  const gameStateManagerRef = useRef<GameStateManager | null>(null);
  const chunkCoordinatorRef = useRef<ChunkCoordinator | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [latestAvailableTick, setLatestAvailableTick] = useState<number>(-1);

  /**
   * Creates a blank player for initialization purposes.
   * @returns PlayerData with blank/null fields
   */
  function createBlankPlayer(): PlayerData {
    return {
        x: 0,
        y: 0,
        z: 0,
        pitch: 0,
        yaw: 0,
        velocityX: 0,
        velocityY: 0,
        velocityZ: 0,
        hp: 0,
        is_alive: true,
        is_defusing: false,
        is_in_bombsite: null,
        is_in_buy_zone: null,
        is_scoped: false,
        is_walking: false,
        is_ducking: false,
        team_name: null,
        cash: 0,
        equipment_value_this_round: 0,
        cash_spent_this_round: 0,
        armor_value: 0,
        has_helmet: false,
        has_defuse_kit: false,
        active_weapon_name: "",
        active_weapon_ammo: 0,
        active_weapon_reserve: 0,
        flash_duration: 0,
        flash_max_alpha: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
    }
}

  /**
   * Fetches demo metadata and updates component state
   * @param demoId - ID of the demo we are using
   * @param setMessage - Method to set the message displayed to the user, provided by the caller
   * @param setError - Method to set the error, provided by the caller
   * @returns GameMetadata object representing the metadata for that game. Only necessary if React async hooks are a dependency for something which needs to avoid race condition.
   */
  const handleGetDemoMetadata = async (demoId: string, setMessage: (msg: string) => void, setError: (err: string) => void) => {
    console.log(`Getting metadata for demo ${demoId}`);
    try {
      const metadata = await getDemoMetadata(demoId);
      setMessage('Demo successfully processed');
      setDemoMetadata({ metadata });
      return metadata;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch demo metadata');
    }
  };
 
  /**
   * Initializes streaming for the specified round
   * @param metadata - Metadata on the game
   * @param demoId - ID of the demo we are using
   * @param setError - Method to set the error, provided by the caller
   * @param roundNum - Number of the round we are initializing the data for
   */
  const initializeRoundData = async (
    metadata: GameMetadata,
    demoId: string,
    setError: (err: string) => void,
    roundNum: number = 1
  ) => {
    console.log(`Initializing round data for demo ${demoId} and round number ${roundNum}`);

    // Stop any running animation when switching rounds
    pauseAnimation();
    
    // Update the selected round state
    setSelectedRound(roundNum);
    
    console.log(`Starting streaming for demo ${demoId} and round ${roundNum}`);
    const datasetNames: DatasetName[] = [Dataset.PLAYER_DATA, Dataset.EVENT_DATA];
    try {
      // Initialize GameStateManager for this round
      const gameStateManager = new GameStateManager();
      gameStateManager.changeRound(roundNum);
      gameStateManagerRef.current = gameStateManager;

      // Set the indexes for the datasets to be 0, since we are parsing from the first row
      if (currentTickIndexMap.current == null) {
        currentTickIndexMap.current = new Map();
      }
      for (const datasetName of datasetNames) {
        currentTickIndexMap.current.set(datasetName, 0);
      }

      // Map from player steamId to their player data
      const playerMap = new Map<string, PlayerData>();

      // Creating blank players for the player map and the RoundState
      for (const playerInfo of metadata.playerInfo) {
        const steamId = playerInfo.playerId;
        console.log(`Creating blank player for steam ID ${steamId}`);
        playerMap.set(steamId, createBlankPlayer());
      }
      if (playerMap.size != 10) {
        console.warn(`Found ${playerMap.size} players, which is different from the expected 10.`);
      }

      // Set tick range from round metadata first
      const roundMetadata = metadata.roundMetadata[roundNum];
      if (roundMetadata) {
        setFirstTick(roundMetadata.roundStart);
        setLastTick(roundMetadata.roundEnd);
      }

      // This round state is how we'll display the info
      // Initialize with -1, will be set to actual first tick when first chunk arrives
      const roundState: RoundState = {
        playerMap: playerMap,
        tick: -1,
      };
      roundStateRef.current = roundState;

      // Reset streaming state
      setLatestAvailableTick(-1);
      setRenderVersion(1);

      // Initialize ChunkCoordinator
      const coordinator = new ChunkCoordinator(
        datasetNames,
        (chunkIndex, chunkData) => {
          // Handle incoming chunk
          handleChunkReady(chunkIndex, chunkData, gameStateManager);
        }
      );
      chunkCoordinatorRef.current = coordinator;

      // Start streaming
      setIsStreaming(true);
      await streamData(
        datasetNames,
        demoId,
        ({ datasetName, windowIndex, chunkTable }) => {
          coordinator.onChunk(datasetName, windowIndex, chunkTable);
        },
        roundNum
      );
      setIsStreaming(false);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start streaming demo data');
      setIsStreaming(false);
    }
  };

  /**
   * Handles when a chunk is ready from the coordinator
   */
  const handleChunkReady = (chunkIndex: number, chunkData: ChunkData, gameStateManager: GameStateManager) => {
    try {
      // Process each dataset in the chunk
      for (const [datasetName, table] of Object.entries(chunkData)) {
        gameStateManager.appendChunk(datasetName as DatasetName, table);
        
        // Update latest available tick if this is player data
        if (datasetName === Dataset.PLAYER_DATA && table.numRows > 0) {
          const lastRow = table.get(table.numRows - 1);
          if (lastRow) {
            setLatestAvailableTick(lastRow.tick);
          }
        }
      }

      // If this is the first chunk, parse the first available tick to populate initial player data
      if (chunkIndex === 0 && roundStateRef.current && gameStateManager.currentRoundData) {
        const playerTable = gameStateManager.currentRoundData.tables.get(Dataset.PLAYER_DATA);
        if (playerTable && playerTable.numRows > 0) {
          try {
            // Get the first tick from the actual data
            const firstRow = playerTable.get(0);
            if (firstRow) {
              const actualFirstTick = firstRow.tick;
              // Update the round state to start at the actual first tick
              roundStateRef.current.tick = actualFirstTick;
              // Parse the first tick to populate initial player data
              gameStateManager.parseTick(roundStateRef.current, currentTickIndexMap.current, actualFirstTick);
              setRenderVersion(prev => prev + 1);
            }
          } catch (error) {
            console.warn('Could not parse first tick yet, waiting for more data:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error handling chunk:', error);
    }
  };

  /**
   * Advances to the next tick
   */
  const goToNextTick = () => {
    const gameStateManager = gameStateManagerRef.current;
    if (!gameStateManager?.currentRoundData || !roundStateRef.current) {
      console.warn('Cannot advance to next tick: no round data available');
      return;
    }

    const playerTable = gameStateManager.currentRoundData.tables.get(Dataset.PLAYER_DATA);
    const currentPlayerTableIndex = currentTickIndexMap.current.get(Dataset.PLAYER_DATA);
    if (currentPlayerTableIndex == undefined) {
      console.error(`Current player table index is undefined`);
      return;
    }
    if (!playerTable || currentPlayerTableIndex >= playerTable.numRows) {
      console.warn('Cannot advance to next tick: no more ticks available');
      return;
    }

    try {
      // Parse the next tick
      gameStateManager.parseTick(roundStateRef.current, currentTickIndexMap.current, roundStateRef.current.tick + 1);
      // Force re-render by incrementing version
      setRenderVersion(prev => prev + 1);

      // Debug statements for the player's current value
      for (const player of roundStateRef.current.playerMap.values()) {
        console.debug(`Updated player to: ${JSON.stringify(player)}`);
      }
    } catch (error) {
      console.error('Error advancing to next tick:', error);
    }
  };

  /**
   * Jumps to a specific tick number
   */
  const jumpToTick = (targetTick: number) => {
    const gameStateManager = gameStateManagerRef.current;
    if (!gameStateManager?.currentRoundData || !roundStateRef.current) {
      console.warn('Cannot jump to tick: no round data available');
      return;
    }
    
    if (targetTick === roundStateRef.current.tick) {
      // Do nothing if already at target tick
      return;
    }
    
    // Validate that target tick exists using stored first/last tick values
    if (targetTick < firstTick || targetTick > lastTick) {
      console.warn(`Target tick ${targetTick} is out of range. Valid range: ${firstTick} - ${lastTick}`);
      return;
    }

    // Check if target tick is available in streamed data
    if (targetTick > latestAvailableTick) {
      console.warn(`Target tick ${targetTick} is not yet available. Latest available: ${latestAvailableTick}`);
      return;
    }

    const targetDatasets = [Dataset.PLAYER_DATA, Dataset.EVENT_DATA];
    for (const targetDataset of targetDatasets) {
      const table = gameStateManager.currentRoundData.tables.get(targetDataset);
      if (!table) {
        console.warn(`Cannot jump to tick ${targetTick}, as there is no data available for the table ${table}`);
        return;
      }
      
      // Binary search for the index of the first row that is >= to that tick
      let firstPtr = 0;
      let lastPtr = table.numRows - 1;
      while (firstPtr < lastPtr) {
        const middlePtr = Math.floor((firstPtr + lastPtr) / 2);
        const currentTick = table.get(middlePtr)!.tick;
        if (currentTick < targetTick) {
          firstPtr = middlePtr + 1;
        } else {
          lastPtr = middlePtr;
        }
      }
      currentTickIndexMap.current.set(targetDataset, firstPtr);
    }

    // Parsing the current tick, which we now have the index for
    gameStateManager.parseTick(roundStateRef.current, currentTickIndexMap.current, targetTick);
    console.log(`Jumped to tick: ${roundStateRef.current.tick}`);
    // Force re-render by incrementing version, as roundState is being edited in-place so it doesn't trigger a re-render
    setRenderVersion(prev => prev + 1);
  };

  /**
   * Checks if there's a next tick available
   */
  const hasNextTick = (): boolean => {
    const roundData = gameStateManagerRef.current?.currentRoundData;
    if (!roundData) return false;

    const roundMetadata = demoMetadata?.metadata.roundMetadata[selectedRound];
    if (!roundMetadata) return false;
    if (!roundStateRef.current) return false;
    return roundStateRef.current.tick < roundMetadata.roundEnd;
  };

  /**
   * Starts the animation by setting up an interval to advance ticks
   */
  const startAnimation = () => {
    const gameStateManager = gameStateManagerRef.current;
    if (isAnimating || !gameStateManager?.currentRoundData || !roundStateRef.current) {
      return;
    }

    setIsAnimating(true);
    const intervalMs = 1000 / TICKS_PER_SECOND;
    
    // Every intervalMs milliseconds, run this following logic
    animationIntervalRef.current = setInterval(() => {
      const currentGameStateManager = gameStateManagerRef.current;
      if (!currentGameStateManager?.currentRoundData || !roundStateRef.current) {
        // Stop animation if we've lost round data
        pauseAnimation();
        return;
      }

      if (!hasNextTick()) {
        // Stop animation if we've reached the end
        pauseAnimation();
        return;
      }

      // Now using useRef for synchronous updates - this fixes the async update bug
      // where currentTickIndex would never actually get updated in time for the next iteration
      try {
        // Parse the next tick
        currentGameStateManager.parseTick(roundStateRef.current, currentTickIndexMap.current, roundStateRef.current.tick + 1);
        // Force re-render by incrementing version
        setRenderVersion(prev => prev + 1);
      } catch (error) {
        console.error('Error during animation:', error);
        pauseAnimation();
      }
    }, intervalMs);
  };

  /**
   * Pauses the animation by clearing the interval
   */
  const pauseAnimation = () => {
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    setIsAnimating(false);
  };


  /**
   * Cleanup effect to clear animation interval on unmount
   */
  useEffect(() => {
    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    };
  }, []);

  /**
   * Resets all demo-related state
   */
  const resetDemoData = () => {
    pauseAnimation(); // Stop any running animation
    setDemoMetadata(null);
    gameStateManagerRef.current = null;
    chunkCoordinatorRef.current = null;
    roundStateRef.current = null;
    currentTickIndexMap.current = new Map();
    setFirstTick(-1);
    setLastTick(-1);
    setLatestAvailableTick(-1);
    setRenderVersion(0);
    setSelectedRound(1); // Reset to round 1
    setIsStreaming(false);
  };

  /**
   * Switches to a different round and loads its data
   */
  const switchToRound = async (
    roundNum: number,
    metadata: GameMetadata,
    demoId: string,
    setError: (err: string) => void
  ) => {
    if (roundNum === selectedRound) {
      // Already on this round, no need to switch
      return;
    }
    
    try {
      await initializeRoundData(metadata, demoId, setError, roundNum);
    } catch (error) {
      setError(`Failed to switch to round ${roundNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return {
    demoMetadata,
    roundData: gameStateManagerRef.current?.currentRoundData ?? null,
    roundState: roundStateRef.current,
    renderVersion,
    currentTickNumber: roundStateRef.current?.tick ?? -1,
    maxTickNumber: lastTick,
    hasNextTick: hasNextTick(),
    isAnimating,
    selectedRound,
    setSelectedRound,
    handleGetDemoMetadata,
    initializeRoundData,
    switchToRound,
    goToNextTick,
    jumpToTick,
    startAnimation,
    pauseAnimation,
    resetDemoData,
    isStreaming,
    latestAvailableTick,
  };
};
