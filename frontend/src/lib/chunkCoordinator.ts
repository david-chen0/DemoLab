import { Table } from 'apache-arrow';
import type { ChunkIndex, ChunkData, ChunkReadyCallback, DatasetName } from '../interfaces/interfaces';

/**
 * ChunkCoordinator is responsible for:
 *   - Receiving dataset-specific chunks in arbitrary arrival order
 *   - Grouping them by chunkIndex
 *   - Emitting chunks in sequential order
 */
export class ChunkCoordinator {
  private expectedDatasets: Set<DatasetName>;
  // Partially received chunks, as some datasets haven't sent their table for this chunk yet
  private pendingChunks: Map<ChunkIndex, Map<DatasetName, Table>> = new Map();
  private completedChunks: Map<ChunkIndex, ChunkData> = new Map();

  // Index of the next chunk to emit
  private nextSequentialChunk: ChunkIndex = 0;
  // Callback to be invoked when next chunk is ready. Provided by caller
  private onChunkReady: ChunkReadyCallback;

  constructor(
    datasetNames: DatasetName[],
    onChunkReady: ChunkReadyCallback
  ) {
    this.expectedDatasets = new Set(datasetNames);
    this.onChunkReady = onChunkReady;
  }

  /**
   * Called whenever a chunk arrives from the stream.
   * 
   * Arrival order is not guaranteed, so we need to manage the order ourselves and provide an ordered result to the caller.
   * 
   * @param datasetName - Name of the dataset that this chunk is for
   * @param chunkIndex - Index of the provided chunk
   * @param table - Arrow table with the data
   */
  onChunk(
    datasetName: DatasetName,
    chunkIndex: ChunkIndex,
    table: Table
  ) {
    let chunk = this.pendingChunks.get(chunkIndex);
    if (!chunk) {
      chunk = new Map();
      this.pendingChunks.set(chunkIndex, chunk);
    }
    chunk.set(datasetName, table);

    // Check if the chunk is now complete
    if (chunk.size == this.expectedDatasets.size) {
      const completed_chunk: ChunkData = {};
      for (const [dsName, tbl] of chunk) {
        completed_chunk[dsName] = tbl;
      }

      // Moving chunk from pending to complete
      this.pendingChunks.delete(chunkIndex);
      this.completedChunks.set(chunkIndex, completed_chunk);

      // Can emit more chunks if the next chunk to emit is this chunk that we just marked complete
      if (this.nextSequentialChunk == chunkIndex) {
        while (true) {
          // Get data from completed chunks. Null if doesn't exist, so we break
          const data = this.completedChunks.get(this.nextSequentialChunk);
          if (!data) { break; }

          // TODO: make sure that this is the format that we provide, or change it here if needed
          this.onChunkReady(this.nextSequentialChunk, data);

          // Freeing the memory
          this.completedChunks.delete(this.nextSequentialChunk);

          this.nextSequentialChunk += 1;
        }
      }
    }
  }
}
