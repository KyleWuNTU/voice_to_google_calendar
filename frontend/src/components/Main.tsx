import React, { useState, useRef, useEffect } from 'react';
import RecordingButtons from './RecordingButtons';

interface MainProps {
  isAuthorized: boolean;
  setIsAuthorized: React.Dispatch<React.SetStateAction<boolean>>;
  userEmail: string;
  setUserEmail: React.Dispatch<React.SetStateAction<string>>;
}

const Main: React.FC<MainProps> = ({ isAuthorized, setIsAuthorized, userEmail, setUserEmail }) => {
  const [status, setStatus] = useState('Please authorize with Google to begin.');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorderRef.current.start();
      setStatus("Recording...");

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
    } catch (err) {
      console.error('Failed to start recording:', err);
      setStatus("Failed to start recording, please check browser compatibility.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setStatus("Recording stopped, uploading...");

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        setStatus("Recording saved, uploading...");

        try {
          const response = await fetch('/upload-audio', {
            method: 'POST',
            body: formData
          });

          const contentType = response.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            const result = await response.json();
            if (response.ok) {
              setStatus(`Event created: ${result.event.summary} at ${result.event.start.dateTime}`);
              console.log('Event created successfully:', result.event);
            } else {
              setStatus(`Error: ${result.error}`);
              console.error('Error:', result.error);
            }
          } else {
            const text = await response.text();
            setStatus(`Unexpected response: ${response.status} ${response.statusText}`);
            console.error('Unexpected response:', text);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          setStatus(`Error: ${errorMessage}`);
          console.error('Error:', error);
        }

        audioChunksRef.current = [];
      };
    }
  };

  const checkAuthStatus = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const authStatus = urlParams.get('auth');

      if (authStatus === 'success') {
        setStatus('Authorization successful!');
        setTimeout(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
          checkAuthStatusFromServer();
        }, 3000);
      } else if (authStatus === 'error') {
        setStatus('Authorization failed. Please try again.');
      } else {
        await checkAuthStatusFromServer();
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const checkAuthStatusFromServer = async () => {
    const response = await fetch('http://localhost:3000/auth/status', {
      headers: {
        'Accept': 'application/json'
      }
    });
    if (response.ok) {
      const data = await response.json();
      setIsAuthorized(data.isAuthorized);
      setUserEmail(data.userEmail || '');
      setStatus(data.isAuthorized ? 'You are authorized and ready to record!' : 'Please authorize with Google to begin.');
    } else {
      console.error('Failed to check auth status:', response.statusText);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    window.addEventListener('popstate', checkAuthStatus);
    return () => {
      window.removeEventListener('popstate', checkAuthStatus);
    };
  }, []);

  return (
    <main className="main">
      <h1 className="main-title">Generate Google Calendar Event from Voice</h1>
      <RecordingButtons
        isAuthorized={isAuthorized}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
      />
      <p id="status">{status}</p>
    </main>
  );
};

export default Main;