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
   * Fetches demo data for the first round and first tick
   */
  const handleGetDemoData = async (
    metadata: GameMetadata, 
    demoId: string, 
    setError: (err: string) => void,
    roundNum: number = 1
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
      // Index of the first item of the next tick to process
      let currentTickIndex = 0;

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
      // This round state is how we'll display the info
      const roundState: RoundState = {
        playerMap: playerMap,
        tick: -1,
      };

      // Parsing all the ticks
      while (currentTickIndex < roundData.tickData.numRows) {
        // Parse the tick
        currentTickIndex = parseTick(roundState, currentTickIndex, roundData);
        setRoundState(roundState);

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
   * Resets all demo-related state
   */
  const resetDemoData = () => {
    setDemoMetadata(null);
    setRoundData(null);
    setRoundState(null);
  };

  return {
    demoMetadata,
    roundData,
    roundState,
    handleGetDemoMetadata,
    handleGetDemoData,
    resetDemoData,
  };
};
