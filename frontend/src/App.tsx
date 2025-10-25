import { Table, tableFromIPC } from 'apache-arrow';
import { useState, useRef } from 'react';
import './App.css';

function App() {
  // Stores the file the file that the user is uploading for demo ingestion
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // Indicates whether we are uploading a file to our backend for ingestion
  const [uploading, setUploading] = useState(false);
  // Message used to indicate the status of the demo file upload
  const [message, setMessage] = useState<string>('');
  // Error that was thrown during the upload
  const [error, setError] = useState<string>('');
  // Stores demo information after successful ingestion
  const [demoInfo, setDemoInfo] = useState<{
    fileId: string;
    numRounds: number;
    round1TableSize: number;
  } | null>(null);
  // Ref that is being used to track the file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API endpoint prefixes
  const ENDPOINT_PREFIX = "http://localhost:8000";
  const DEMO_COACH_ENDPOINT_PREFIX = "demo_coach";
  const DEMO_INGESTOR_ENDPOINT_PREFIX = "demo_ingestor";

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
   * Fetches the number of rounds for a given demo ID
   */
  const getNumRounds = async (demoId: string): Promise<number> => {
    const response = await fetch(`${ENDPOINT_PREFIX}/${DEMO_COACH_ENDPOINT_PREFIX}/get_num_rounds?demo_id=${encodeURIComponent(demoId)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to get number of rounds: ${response.status}`);
    }

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error);
    }

    return result.numRounds;
  };

  /**
   * Gets the size of the table for a specific round
   */
  const getRoundTableSize = async (demoId: string, roundNumber: number): Promise<number> => {
    const table = await getDemoData(demoId, roundNumber);
    return table.numRows;
  };

  /**
   * This method takes in a user input file, which is stored in selectedFile, and ingests it by calling
   * the DemoIngestor endpoint.
   * @returns TODO: UPDATE THIS ONCE WE FINISH THE RETURN
   */
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return
    }

    setUploading(true);
    setMessage('');
    setError('');
    setDemoInfo(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${ENDPOINT_PREFIX}/${DEMO_INGESTOR_ENDPOINT_PREFIX}/ingest_demo`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.error) {
        setError(result.error);
      } else {
        setMessage(`Success: ${result.message}`);
        
        // Fetch demo information after successful ingestion
        try {
          const fileId = result.fileId;
          const numRounds = await getNumRounds(fileId);
          const round1TableSize = await getRoundTableSize(fileId, 1);
          
          setDemoInfo({
            fileId,
            numRounds,
            round1TableSize
          });
        } catch (infoError) {
          setError(`Demo ingested but failed to fetch demo info: ${infoError instanceof Error ? infoError.message : 'Unknown error'}`);
        }
        
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err) {
      setError(`Failed to upload file: ${err instanceof Error ? err.message : 'Unknown error'}. Make sure the backend server is running.`);
    } finally {
      setUploading(false);
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  }

  async function getDemoData(demoId?: string, roundNumber?: number): Promise<Table> {
    let endpoint = `${ENDPOINT_PREFIX}/${DEMO_COACH_ENDPOINT_PREFIX}/get_demo_data`;
    if (demoId != null) {
      endpoint += `?demo_id=${encodeURIComponent(demoId)}`;
      
      // Round number can only be provided if demoId is provided
      if (roundNumber != null) {
        endpoint += `&round_num=${roundNumber}`;
      }
    }

    // Fetch the binary stream containing the demo data from the backend
    const response = await fetch(endpoint, {
      method: 'GET',
    });
    if (!response.ok) {
      // Something failed in the backend
      throw new Error(`Backend error (${response.status}): ${response.text()}`);
    }

    // Converting the binary stream into an Arrow table
    const arrayBuffer = await response.arrayBuffer();
    const table = tableFromIPC(arrayBuffer);

    return table;

    // Iterate over the result later with something like this    
    // for (let i = 0; i < table.length; i++) {
    //   const row = table.get(i);
    // }
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

      {demoInfo && (
        <div className="demo-info">
          <h2>Demo Information</h2>
          <div className="info-item">
            <strong>File ID:</strong> {demoInfo.fileId}
          </div>
          <div className="info-item">
            <strong>Number of Rounds:</strong> {demoInfo.numRounds}
          </div>
          <div className="info-item">
            <strong>Round 1 Table Size:</strong> {demoInfo.round1TableSize} rows
          </div>
        </div>
      )}
    </div>
  )
}

export default App;
