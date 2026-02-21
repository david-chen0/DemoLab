import { blake3 } from '@noble/hashes/blake3.js';
import { bytesToHex } from '@noble/hashes/utils.js';

/**
 * Hashes the file without having to store it, as our current workflow doesn't store the file.
 * The file is loaded in 10MB at a time to prevent the buffer from getting too large.
 * Hashing mechanism used is Blake3
 * 
 * @param file - The file to hash
 * @returns Promise<string> containing the hashed value
 */
export async function hashFileBlake3Streaming(file: File): Promise<string> {
  const hasher = blake3.create();
  const chunkSize = 1024 * 1024; // 1MB

  let offset = 0;
  while (offset < file.size) {
    const slice = file.slice(offset, offset + chunkSize);
    const buffer = await slice.arrayBuffer();
    hasher.update(new Uint8Array(buffer));
    offset += chunkSize;
  }

  return bytesToHex(hasher.digest());
}
