import { useState, useRef, useEffect } from 'react';
import GameRenderer from './lib/gameRenderer';
import RoundSelector from './components/RoundSelector';
import { checkDemoState, triggerDemoIngestion, uploadDemoFileAndTriggerIngestion } from './services/api';
import { useGameState } from './hooks/useGameState';
import './styles/App.css';
import { hashFileBlake3Streaming } from './utils/demoHash';

function App() {
  
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
    isAnimating,
    selectedRound,
    latestAvailableTick,
    handleGetDemoMetadata,
    initializeRoundData,
    switchToRound,
    jumpToTick,
    startAnimation,
    pauseAnimation,
    resetDemoData,
  } = useGameState();

  // State for auto-hiding controls
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls logic
  const showControlsTemporarily = () => {
    setShowControls(true);
    
    // Clear existing timeout
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    
    // Set new timeout to hide controls after 3 seconds
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  // Handle mouse movement over game area
  const handleMouseMove = () => {
    showControlsTemporarily();
  };

  // Handle mouse leave from game area
  const handleMouseLeave = () => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    // Hide controls immediately when mouse leaves
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 1000);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, []);

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
      
      // Reset demo data when a new file is selected to clear previous demo state
      resetDemoData();
      
      // Set the file immediately for UI responsiveness
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
      const demoId = await hashFileBlake3Streaming(selectedFile);
      console.log(`Hash value of the input demo file: ${demoId}`);

      const demoState = await checkDemoState(demoId);
      console.log(`Demo state: ${demoState}`);
      
      if (demoState === "nothing_exists") {
        // Upload demo file and trigger ingestion
        console.log("No demo found, uploading file and triggering ingestion");
        await uploadDemoFileAndTriggerIngestion(demoId, selectedFile);
      } else if (demoState === "demo_exists") {
        // Demo file exists but needs ingestion - only trigger ingestion, don't upload
        console.log("Demo file exists but not ingested, triggering ingestion only");
        const targetFilepath = `uploads/${demoId}.dem`;
        await triggerDemoIngestion(demoId, targetFilepath);
      } else if (demoState === "metadata_exists") {
        // Demo is fully processed, skip to results
        console.log("Demo has already been fully processed, skipping to results");
      }
      
      // Fetch demo information after successful ingestion
      try {
        // Fetching the game metadata
        // We need to return the value here rather than using the React setter, as React is asynchronous and can cause race conditions
        const gameMetadata = await handleGetDemoMetadata(demoId, setMessage, setError);
        if (gameMetadata == undefined) {
          throw Error("Failed to fetch game metadata");
        }

        // Console log the demo information instead of displaying it
        console.log('Demo Information:', {
          fileId: gameMetadata.demoId,
          numberOfRounds: gameMetadata.numRounds,
          map: gameMetadata.map,
          matchTimestamp: gameMetadata.matchTimestamp,
          serverType: gameMetadata.serverType,
          players: gameMetadata.playerInfo.map(player => ({
            name: player.playerName,
            id: player.playerId,
            team: player.playerTeamNumber
          }))
        });

        // Fetching the demo data for the selected round
        await initializeRoundData(gameMetadata, demoId, setError, selectedRound);

        setMessage(`Successfully processed demo`);
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
  };

  // Handle round selection
  const handleRoundSelect = async (roundNumber: number) => {
    if (!demoMetadata || isAnimating) return;
    
    await switchToRound(
      roundNumber,
      demoMetadata.metadata,
      demoMetadata.metadata.demoId,
      setError
    );
  };


  return (
    <div className="app">
      <h1>DemoLab</h1>
      
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

      {/* Show loading state in game layout when uploading */}
      {uploading && (
        <div className="game-layout">
          <div className="game-section">
            <div className="loading-game-area">
              <img
                src="/loading_animation.gif"
                alt="Loading..."
                className="loading-animation-inline"
              />
              <p className="loading-text-inline">Processing demo file...</p>
              <p className="loading-subtext-inline">This may take a few moments</p>
            </div>
          </div>
        </div>
      )}

      {/* Show demo content when loaded and not uploading */}
      {!uploading && demoMetadata && roundState && roundData && (
        <div className="game-layout">
          <div
            className="game-section"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
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
            
            {/* Game Controls - Auto-hide like video player */}
            <div className={`game-controls ${showControls ? 'show' : ''}`}>
              <div className="playback-controls">
                <button
                  onClick={isAnimating ? pauseAnimation : startAnimation}
                  className={`playback-btn ${isAnimating ? 'pause' : 'play'}`}
                  title={isAnimating ? 'Pause' : 'Play'}
                >
                  {isAnimating ? '⏸️' : '▶️'}
                </button>
                
                <div className="progress-container">
                  <div
                    className="progress-bar"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const percentage = clickX / rect.width;
                      const roundStart = demoMetadata.metadata.roundMetadata[selectedRound].roundStart;
                      const roundEnd = maxTickNumber;
                      const targetTick = Math.round(roundStart + (roundEnd - roundStart) * percentage);
                      jumpToTick(targetTick);
                    }}
                  >
                    {/* Shadow showing how much of the round is ready/available */}
                    <div
                      className="progress-shadow"
                      style={{
                        width: `${latestAvailableTick > 0 ?
                          ((latestAvailableTick - demoMetadata.metadata.roundMetadata[selectedRound].roundStart) /
                          (maxTickNumber - demoMetadata.metadata.roundMetadata[selectedRound].roundStart)) * 100 : 0}%`
                      }}
                    />
                    {/* Current position fill */}
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.max(0, ((currentTickNumber - demoMetadata.metadata.roundMetadata[selectedRound].roundStart) /
                          (maxTickNumber - demoMetadata.metadata.roundMetadata[selectedRound].roundStart)) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Round Selector */}
            <RoundSelector
              totalRounds={demoMetadata.metadata.numRounds}
              selectedRound={selectedRound}
              onRoundSelect={handleRoundSelect}
              disabled={isAnimating}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default App;
