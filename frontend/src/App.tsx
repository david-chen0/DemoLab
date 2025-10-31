import { useState, useRef } from 'react';
import GameRenderer from './lib/gameRenderer';
import { uploadDemoFile } from './services/api';
import { useGameState } from './hooks/useGameState';
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
  // Ref that is being used to track the file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom hook for demo data management
  const {
    demoMetadata,
    roundData,
    roundState,
    renderVersion,
    currentTickNumber,
    maxTickNumber,
    hasNextTick,
    isAnimating,
    handleGetDemoMetadata,
    initializePlayerDataForRound,
    goToNextTick,
    jumpToTick,
    startAnimation,
    pauseAnimation,
    resetDemoData,
  } = useGameState();

  // State for jump-to-tick input
  const [jumpTickInput, setJumpTickInput] = useState<string>('');

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
    resetDemoData();

    try {
      const result = await uploadDemoFile(selectedFile);
      setMessage(`Success: ${result.message}`);
      
      // Fetch demo information after successful ingestion
      try {
        const demoId = result.demoId;

        // Fetching the game metadata
        // We need to return the value here rather than using the React setter, as React is asynchronous and can cause race conditions
        const gameMetadata = await handleGetDemoMetadata(demoId, setMessage, setError);
        if (gameMetadata == undefined) {
          throw Error("Failed to fetch game metadata");
        }

        // Fetching the demo data
        // TODO: Need to setup frontend mechanism for user to select the round that we want to display and then pass this round number into initializePlayerDataForRound
        await initializePlayerDataForRound(gameMetadata, demoId, setError);
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
      <h1>Demo File Input</h1>
      
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

      {demoMetadata && roundState && roundData && (
        <>
          {/* Tick Navigation Section */}
          <div className="tick-navigation">
            <h3>Tick Navigation</h3>
            <div className="tick-controls">
              <div className="tick-display">
                <strong>Current Tick: {currentTickNumber}</strong>
                <span className="tick-range">(Range: {roundData.tickData.get(0)?.tick || 0} - {maxTickNumber})</span>
              </div>
              
              <button
                onClick={goToNextTick}
                disabled={!hasNextTick || isAnimating}
                className="nav-btn next-btn"
                title="Go to next tick"
              >
                Next →
              </button>
            </div>

            {/* Animation Controls */}
            <div className="animation-controls">
              <h4>Animation Controls</h4>
              <div className="animation-buttons">
                <button
                  onClick={isAnimating ? pauseAnimation : startAnimation}
                  disabled={!hasNextTick && !isAnimating}
                  className={`nav-btn animation-btn ${isAnimating ? 'pause-btn' : 'start-btn'}`}
                  title={isAnimating ? 'Pause animation' : 'Start animation'}
                >
                  {isAnimating ? '⏸️ Pause' : '▶️ Start'}
                </button>
              </div>
              
              <div className="animation-status">
                <span className={`status-indicator ${isAnimating ? 'animating' : 'paused'}`}>
                  {isAnimating ? '🔄 Animating' : '⏹️ Paused'} - 64 ticks/sec
                </span>
              </div>
            </div>
            
            <div className="jump-controls">
              <label htmlFor="jumpTick">Jump to tick:</label>
              <input
                id="jumpTick"
                type="number"
                value={jumpTickInput}
                onChange={(e) => setJumpTickInput(e.target.value)}
                placeholder={`${roundData.tickData.get(0)?.tick || 0} - ${maxTickNumber}`}
                className="jump-input"
                min={roundData.tickData.get(0)?.tick || 0}
                max={maxTickNumber}
                disabled={isAnimating}
              />
              <button
                onClick={() => {
                  const targetTick = parseInt(jumpTickInput);
                  if (!isNaN(targetTick)) {
                    jumpToTick(targetTick);
                    setJumpTickInput('');
                  }
                }}
                disabled={!jumpTickInput || isNaN(parseInt(jumpTickInput)) || isAnimating}
                className="nav-btn jump-btn"
                title="Jump to specified tick"
              >
                Jump
              </button>
            </div>
          </div>

          {/* Game Renderer Section */}
          <div className="game-section">
            <div className="game-header">
              <h3>Game View</h3>
              <div className="round-indicator">
                Round {roundData.roundNum}/{demoMetadata.metadata.numRounds}
              </div>
            </div>
            <GameRenderer
              gameMetadata={demoMetadata.metadata}
              roundState={roundState}
              renderVersion={renderVersion}
            />
          </div>
          
          {/* Demo Info Section */}
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
        </>
      )}
    </div>
  )
}

export default App;
