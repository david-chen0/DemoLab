import { useState, useRef, useEffect } from 'react';
import type { GameMetadata, RoundData, RoundState, PlayerData } from '../interfaces/interfaces';
import { parseTick } from '../lib/gameStateManager';
import { getDemoMetadata, getDemoData } from '../services/api';

/**
 * Custom React hook for managing game state including demo metadata,
 * round data, player states, and tick navigation for CS2 demo playback.
 */
export const useGameState = () => {
  // Constants
  // TODO: Game still feels a bit quick?? Like its somehow more than 64 ticks per second, look into this
  const TICKS_PER_SECOND = 64; // Valve forces 64 ticks per second for all servers

  // Stores demo metadata after successful ingestion
  const [demoMetadata, setDemoMetadata] = useState<{
    metadata: GameMetadata;
  } | null>(null);
  // Stores round data for the current round
  const [roundData, setRoundData] = useState<RoundData | null>(null);
  // Stores the currently selected round number
  const [selectedRound, setSelectedRound] = useState<number>(1);
  // Stores current round state - using useRef since roundState is edited in-place and needs to be edited constantly. Re-renders are controlled by renderVersion
  const roundStateRef = useRef<RoundState | null>(null);
  // Tracks the current tick index for navigation - using useRef for synchronous updates
  const currentTickIndexRef = useRef<number>(0);
  // Stores the first and last tick numbers for efficient validation
  const [firstTick, setFirstTick] = useState<number>(-1);
  const [lastTick, setLastTick] = useState<number>(-1);
  // Version counter to force re-renders when roundState is mutated
  const [renderVersion, setRenderVersion] = useState<number>(0);
  // Animation state management
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
   * Initializes the necessary items that will be used to parse the player data throughout the round
   * @param metadata - Metadata on the game
   * @param demoId - ID of the demo we are using
   * @param setError - Method to set the error, provided by the caller
   * @param roundNum - Number of the round we are initializing the data for
   */
  const initializePlayerDataForRound = async (
    metadata: GameMetadata,
    demoId: string,
    setError: (err: string) => void,
    roundNum: number = 1
  ) => {
    // Stop any running animation when switching rounds
    pauseAnimation();
    
    // Update the selected round state
    setSelectedRound(roundNum);
    
    console.log(`Getting data for demo ${demoId} and round ${roundNum}`);
    try {
      // Fetch data for the specified round, defaults to round 1
      const table = await getDemoData(demoId, roundNum);
      
      // Create RoundData object
      const roundData: RoundData = {
        roundNum: roundNum,
        tickData: table
      };
      setRoundData(roundData);

      // Map from player steamId to their player data
      const playerMap = new Map<string, PlayerData>();

      // Creating blank players for the player map and the RoundState
      // Typescript is by reference, so editing the PlayerData in-place for one
      // of these collections will edit it for both
      for (const playerInfo of metadata.playerInfo) {
        const steamId = playerInfo.playerId;
        console.log(`Creating blank player for steam ID ${steamId}`);
        playerMap.set(steamId, createBlankPlayer());
      }
      if (playerMap.size != 10) {
        console.warn(`Found ${playerMap.size} players, which is different from the expected 10.`);
      }

      // Store initial player map state for resetting when going back
      const initialMap = new Map<string, PlayerData>();
      for (const [steamId, player] of playerMap) {
        initialMap.set(steamId, { ...player });
      }

      // This round state is how we'll display the info
      const roundState: RoundState = {
        playerMap: playerMap,
        tick: -1,
      };

      // Parse only the first tick instead of all ticks
      if (roundData.tickData.numRows > 0) {
        // Store first and last tick numbers for efficient validation
        const firstRow = roundData.tickData.get(0);
        const lastRow = roundData.tickData.get(roundData.tickData.numRows - 1);
        if (firstRow && lastRow) {
          setFirstTick(firstRow.tick);
          setLastTick(lastRow.tick);
        }

        const nextTickIndex = parseTick(roundState, 0, roundData);
        currentTickIndexRef.current = nextTickIndex;
        roundStateRef.current = roundState;
        setRenderVersion(1); // Initialize render version

        // Debug statements for the player's current value
        for (const player of playerMap.values()) {
          console.debug(`Updated player to: ${JSON.stringify(player)}`);
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch demo data');
    }
  };

  /**
   * Advances to the next tick
   */
  const goToNextTick = () => {
    if (!roundData || !roundStateRef.current || currentTickIndexRef.current >= roundData.tickData.numRows) {
      console.warn('Cannot advance to next tick: no more ticks available');
      return;
    }

    try {
      // Parse the next tick
      const nextTickIndex = parseTick(roundStateRef.current, currentTickIndexRef.current, roundData);
      currentTickIndexRef.current = nextTickIndex;
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
    if (!roundData || !roundStateRef.current) {
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

    // Binary search for the index of a row that corresponds to the tick
    let firstPtr = 0;
    let lastPtr = roundData.tickData.numRows - 1;
    let firstTickIndex: number;
    while (true) {
      const middlePtr = Math.floor((firstPtr + lastPtr) / 2);
      const currentTick = roundData.tickData.get(middlePtr)!.tick;
      if (currentTick == targetTick) {
        // We found an index that has the same tick value
        firstTickIndex = middlePtr;
        break;
      } else if (currentTick < targetTick) {
        firstPtr = middlePtr;
      } else {
        lastPtr = middlePtr;
      }
    }

    // firstTickIndex is now in the tick, but is not guaranteed to be the first row
    // corresponding to that tick
    firstTickIndex -= 1;
    while (firstTickIndex > 0) {
      const currentTick = roundData.tickData.get(firstTickIndex)!.tick;
      if (currentTick != targetTick) {
        // Reached the previous tick
        break;
      }

      firstTickIndex -= 1;
    }
    firstTickIndex += 1; // Before this, we were at the last row of the previous tick, so we need to increment by one

    // Parsing the current tick, which we now have the index for
    const nextTickIndex = parseTick(roundStateRef.current, firstTickIndex, roundData);
    console.log(`Jumped to tick: ${roundStateRef.current.tick}`);
    currentTickIndexRef.current = nextTickIndex;
    // Force re-render by incrementing version, as roundState is being edited in-place so it doesn't trigger a re-render
    setRenderVersion(prev => prev + 1);
  };

  /**
   * Checks if there's a next tick available
   */
  const hasNextTick = (): boolean => {
    return roundData ? currentTickIndexRef.current < roundData.tickData.numRows : false;
  };

  /**
   * Starts the animation by setting up an interval to advance ticks
   */
  const startAnimation = () => {
    if (isAnimating || !roundData || !roundStateRef.current) {
      return;
    }

    setIsAnimating(true);
    const intervalMs = 1000 / TICKS_PER_SECOND;
    
    // Every intervalMs milliseconds, run this following logic
    animationIntervalRef.current = setInterval(() => {
      if (!roundData || !roundStateRef.current || currentTickIndexRef.current >= roundData.tickData.numRows) {
        // Stop animation if we've reached the end
        pauseAnimation();
        return;
      }

      // Now using useRef for synchronous updates - this fixes the async update bug
      // where currentTickIndex would never actually get updated in time for the next iteration

      try {
        // Parse the next tick
        const nextTickIndex = parseTick(roundStateRef.current, currentTickIndexRef.current, roundData);
        currentTickIndexRef.current = nextTickIndex;
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
    setRoundData(null);
    roundStateRef.current = null;
    currentTickIndexRef.current = 0;
    setFirstTick(-1);
    setLastTick(-1);
    setRenderVersion(0);
    setSelectedRound(1); // Reset to round 1
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
      await initializePlayerDataForRound(metadata, demoId, setError, roundNum);
    } catch (error) {
      setError(`Failed to switch to round ${roundNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return {
    demoMetadata,
    roundData,
    roundState: roundStateRef.current,
    renderVersion,
    currentTickNumber: roundStateRef.current?.tick ?? -1,
    maxTickNumber: lastTick,
    hasNextTick: hasNextTick(),
    isAnimating,
    selectedRound,
    setSelectedRound,
    handleGetDemoMetadata,
    initializePlayerDataForRound,
    switchToRound,
    goToNextTick,
    jumpToTick,
    startAnimation,
    pauseAnimation,
    resetDemoData,
  };
};
