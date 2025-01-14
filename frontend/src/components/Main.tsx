import React, { useState, useRef, useEffect } from 'react';
import RecordingButtons from './RecordingButtons';
import Header from './Header';
import { api } from '../services/api';
import EventConfirmation from './EventConfirmation';

interface MainProps {
  isAuthorized: boolean;
  setIsAuthorized: React.Dispatch<React.SetStateAction<boolean>>;
  userEmail: string;
  setUserEmail: React.Dispatch<React.SetStateAction<string>>;
}

const Main: React.FC<MainProps> = ({ isAuthorized, setIsAuthorized, userEmail, setUserEmail }) => {
  const [status, setStatus] = useState('Please authorize with Google to begin.');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [eventDetails, setEventDetails] = useState<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleStartRecording = async () => {
    try {
      // 1. 先測試麥克風
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 44100,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // 2. 檢查音訊軌道
      const audioTracks = stream.getAudioTracks();
      console.log('Audio tracks:', audioTracks);
      if (audioTracks.length === 0) {
        throw new Error('No audio track found');
      }

      // 3. 設定 MediaRecorder 並增加錄音時間間隔
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });

      // 4. 增加音量監測
      const audioContext = new AudioContext();
      const mediaStreamSource = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      mediaStreamSource.connect(analyser);
      
      // 5. 修改數據收集間隔，從 100ms 改為 1000ms
      mediaRecorderRef.current.start(1000);
      setStatus("Recording...");

      // 6. 改進數據收集的處理
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Received audio chunk:', {
            size: event.data.size,
            type: event.data.type,
            timestamp: new Date().toISOString()
          });
          audioChunksRef.current.push(event.data);
        } else {
          console.warn('Received empty audio chunk');
        }
      };

    } catch (err) {
      console.error('Recording setup failed:', err);
      setStatus("Failed to start recording: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setStatus("Recording stopped, uploading...");

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setStatus("Recording saved, uploading...");

        try {
          const result = await api.uploadAudio(audioBlob);
          setEventDetails(result.event);
          setStatus("Please confirm the event details.");
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          setStatus(`Error: ${errorMessage}`);
          console.error('Error:', error);
        }

        audioChunksRef.current = [];
      };
    }
  };

  const handleConfirmEvent = async () => {
    try {
      const response = await api.createEvent(eventDetails);
      const result = response.event;
      console.log("Event created:", result);

      let formattedDate = 'Unknown date';
      if (result.start?.date) {
        formattedDate = result.start.date;
      } else if (result.start?.dateTime) {
        const date = new Date(result.start.dateTime);
        formattedDate = `${result.start.dateTime.split('T')[0]} at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
      }

      setStatus(`Event created: ${result.summary || 'Untitled event'} on ${formattedDate}`);
      setEventDetails(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setStatus(`Error: ${errorMessage}`);
      console.error('Error:', error);
    }
  };

  const handleCancelEvent = () => {
    setEventDetails(null);
    setStatus('Event creation cancelled. You can start a new recording.');
  };

  const checkAuthStatus = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const authStatus = urlParams.get('auth');

      if (authStatus === 'success') {
        setStatus('Authorization successful!');
        setIsAuthorizing(true);
        setTimeout(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
          checkAuthStatusFromServer();
        }, 3000);
      } else if (authStatus === 'error') {
        setStatus('Authorization failed. Please try again.');
        setIsAuthorizing(false);
      } else {
        await checkAuthStatusFromServer();
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthorizing(false);
    }
  };

  const checkAuthStatusFromServer = async () => {
    try {
      const data = await api.checkAuthStatus();
      setIsAuthorized(data.isAuthorized);
      setUserEmail(data.userEmail || '');
      setStatus(data.isAuthorized ? 'You are authorized and ready to record!' : 'Please authorize with Google to begin.');
    } catch (error) {
      console.error('Failed to check auth status:', error);
    } finally {
      setIsAuthorizing(false);
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

  const handleSignOut = async () => {
    try {
      await api.signOut();
      setIsAuthorized(false);
      setUserEmail('');
      setStatus('Please authorize with Google to begin.');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      <Header
        isAuthorized={isAuthorized}
        userEmail={userEmail}
        onSignOut={handleSignOut}
        isAuthorizing={isAuthorizing}
        setIsAuthorizing={setIsAuthorizing}
      />
      <main className="main">
        <h1 className="main-title">Generate Google Calendar Event from Voice</h1>
        {eventDetails ? (
          <EventConfirmation
            eventDetails={eventDetails}
            onConfirm={handleConfirmEvent}
            onCancel={handleCancelEvent}
          />
        ) : (
          <RecordingButtons
            isAuthorized={isAuthorized}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
          />
        )}
        <p id="status">{status}</p>
      </main>
    </>
  );
};

export default Main;