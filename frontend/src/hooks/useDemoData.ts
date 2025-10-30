import { useState } from 'react';
import type { GameMetadata, RoundData, RoundState, PlayerData } from '../interfaces/interfaces';
import { createBlankPlayer, parseTick } from '../lib/gameStateManager';
import { getDemoMetadata, getDemoData } from '../services/api';

export const useDemoData = () => {
  // Stores demo metadata after successful ingestion
  const [demoMetadata, setDemoMetadata] = useState<{
    metadata: GameMetadata;
  } | null>(null);
  // Stores round data for the first round
  const [roundData, setRoundData] = useState<RoundData | null>(null);
  // Stores current round state (first tick of first round)
  const [roundState, setRoundState] = useState<RoundState | null>(null);
  // Tracks the current tick index for navigation
  const [currentTickIndex, setCurrentTickIndex] = useState<number>(0);
  // Stores the first and last tick numbers for efficient validation
  const [firstTick, setFirstTick] = useState<number>(-1);
  const [lastTick, setLastTick] = useState<number>(-1);
  // Version counter to force re-renders when roundState is mutated
  const [renderVersion, setRenderVersion] = useState<number>(0);

  /**
   * Fetches demo metadata and updates component state
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
    roundNum: number = 6 // TODO: round 6 is used because it is guaranteed a gun round for testing, change back to round 1 when done
  ) => {
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
        setCurrentTickIndex(nextTickIndex);
        setRoundState({ ...roundState });
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
    if (!roundData || !roundState || currentTickIndex >= roundData.tickData.numRows) {
      console.warn('Cannot advance to next tick: no more ticks available');
      return;
    }

    try {
      // Parse the next tick
      const nextTickIndex = parseTick(roundState, currentTickIndex, roundData);
      setCurrentTickIndex(nextTickIndex);
      // Force re-render by incrementing version
      setRenderVersion(prev => prev + 1);

      // Debug statements for the player's current value
      for (const player of roundState.playerMap.values()) {
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
    if (!roundData || !roundState) {
      console.warn('Cannot jump to tick: no round data available');
      return;
    }
    
    if (targetTick === roundState.tick) {
      // Do nothing if already at target tick
      return;
    }
    
    if (targetTick < roundState.tick) {
      console.warn('Jumping to previous ticks is not supported yet');
      return;
    }
    
    // Validate that target tick exists using stored first/last tick values
    if (targetTick < firstTick || targetTick > lastTick) {
      console.warn(`Target tick ${targetTick} is out of range. Valid range: ${firstTick} - ${lastTick}`);
      return;
    }
    
    // We need to manually set the tick, as React hooks are async, so changing the roundState object
    // between iterations does not get caught in the next iteration
    let nextTickIndex = currentTickIndex;
    while (roundState.tick < targetTick && hasNextTick()) {
      nextTickIndex = parseTick(roundState, nextTickIndex, roundData);
      console.log(`Parsed tick: ${roundState.tick}`);
    }
    setCurrentTickIndex(nextTickIndex);
    // Force re-render by incrementing version, as roundState is being edited in-place so it doesn't trigger a re-render
    setRenderVersion(prev => prev + 1);
  };

  /**
   * Checks if there's a next tick available
   */
  const hasNextTick = (): boolean => {
    return roundData ? currentTickIndex < roundData.tickData.numRows : false;
  };

  /**
   * Resets all demo-related state
   */
  const resetDemoData = () => {
    setDemoMetadata(null);
    setRoundData(null);
    setRoundState(null);
    setCurrentTickIndex(0);
    setFirstTick(-1);
    setLastTick(-1);
    setRenderVersion(0);
  };

  return {
    demoMetadata,
    roundData,
    roundState,
    renderVersion,
    currentTickNumber: roundState?.tick ?? -1,
    maxTickNumber: lastTick,
    hasNextTick: hasNextTick(),
    handleGetDemoMetadata,
    initializePlayerDataForRound,
    goToNextTick,
    jumpToTick,
    resetDemoData,
  };
};
