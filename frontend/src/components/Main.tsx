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