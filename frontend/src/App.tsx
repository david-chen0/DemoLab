import { useState, useRef } from 'react';
import type { GameMetadata } from './interfaces/interfaces';
import { getDemoMetadata, uploadDemoFile, getDemoData } from './services/api';
import './styles/App.css';

function App() {
  // TODO: WOULD PROBABLY MAKE SENSE TO MOVE ALL THESE CONTEXT INTO A SEPARATE FILE/FOLDER AND MANAGE IT FROM THERE

  // Stores the file the file that the user is uploading for demo ingestion
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // Indicates whether we are uploading a file to our backend for ingestion
  const [uploading, setUploading] = useState(false);
  // Message used to indicate the status of the demo file upload
  const [message, setMessage] = useState<string>('');
  // Error that was thrown during the upload
  const [error, setError] = useState<string>('');
  // Stores demo metadata after successful ingestion
  const [demoMetadata, setDemoMetadata] = useState<{
    metadata: GameMetadata;
  } | null>(null);
  // Ref that is being used to track the file input
  const fileInputRef = useRef<HTMLInputElement>(null);


  /**
   * Handles the file selection, where users are prompted to select a file for use.
   * The selection file is then store in the fileInputRef object.
   * @param event 
   * @returns 
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if the file has a .dem extension
      if (!file.name.toLowerCase().endsWith('.dem')) {
        setError('Invalid file type. Please select a .dem file.');
        setSelectedFile(null);
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return
      }
      
      setSelectedFile(file);
      setMessage('');
      setError('');
    }
  }

  /**
   * Fetches demo metadata and updates component state
   */
  const handleGetDemoMetadata = async (demoId: string) => {
    try {
      const metadata = await getDemoMetadata(demoId);
      setMessage('Demo metadata fetched successfully');
      setDemoMetadata({ metadata });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch demo metadata');
    }
  };

  /**
   * This method takes in a user input file, which is stored in selectedFile, and ingests it by calling
   * the DemoIngestor endpoint.
   */
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setMessage('');
    setError('');
    setDemoMetadata(null);

    try {
      const result = await uploadDemoFile(selectedFile);
      setMessage(`Success: ${result.message}`);
      
      // Fetch demo information after successful ingestion
      try {
        const demoId = result.demoId;
        await handleGetDemoMetadata(demoId);
        await getDemoData(demoId);
      } catch (infoError) {
        setError(`Demo ingested but failed to fetch demo info: ${infoError instanceof Error ? infoError.message : 'Unknown error'}`);
      }
      
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(`Failed to upload file: ${err instanceof Error ? err.message : 'Unknown error'}. Make sure the backend server is running.`);
    } finally {
      setUploading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  }


  return (
    <div className="app">
      <h1>Demo File Ingestor</h1>
      
      <div className="upload-section">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        <button
          onClick={triggerFileSelect}
          className="select-file-btn"
          disabled={uploading}
        >
          {selectedFile ? `Selected: ${selectedFile.name}` : 'Select File'}
        </button>

        {selectedFile && (
          <button
            onClick={handleUpload}
            className="upload-btn"
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload & Ingest Demo'}
          </button>
        )}
      </div>

      {message && (
        <div className="message success">
          {message}
        </div>
      )}

      {error && (
        <div className="message error">
          {error}
        </div>
      )}

      {demoMetadata && (
        <div className="demo-info">
          <h2>Demo Information</h2>
          <div className="info-item">
            <strong>File ID:</strong> {demoMetadata.metadata.demoId}
          </div>
          <div className="info-item">
            <strong>Number of Rounds:</strong> {demoMetadata.metadata.numRounds}
          </div>
          <div className="info-item">
            <strong>Map:</strong> {demoMetadata.metadata.map}
          </div>
          <div className="info-item">
            <strong>Match timestamp:</strong> {demoMetadata.metadata.matchTimestamp}
          </div>
          <div className="info-item">
            <strong>Server Type:</strong> {demoMetadata.metadata.serverType}
          </div>
          <div className="info-item">
            <strong>Players:</strong>
            <div className="player-list">
              {demoMetadata.metadata.playerInfo.map((player) => (
              <div key={player.playerId} className="player-entry">
                <div><strong>Name:</strong> {player.playerName}</div>
                <div><strong>ID:</strong> {player.playerId}</div>
                <div><strong>Team:</strong> {player.playerTeamNumber}</div>
              </div>
            ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App;
