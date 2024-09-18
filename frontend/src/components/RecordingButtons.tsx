import React, { useState } from 'react';

interface RecordingButtonsProps {
  isAuthorized: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

const RecordingButtons: React.FC<RecordingButtonsProps> = ({ isAuthorized, onStartRecording, onStopRecording }) => {
  const [isRecording, setIsRecording] = useState(false);

  const handleStartRecording = () => {
    setIsRecording(true);
    onStartRecording();
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    onStopRecording();
  };

  return (
    <div className="recording-buttons">
      <button onClick={handleStartRecording} disabled={!isAuthorized || isRecording}>
        {isRecording ? 'Recording...' : 'Start Recording'}
      </button>
      <button onClick={handleStopRecording} disabled={!isRecording}>
        Stop Recording
      </button>
    </div>
  );
};

export default RecordingButtons;