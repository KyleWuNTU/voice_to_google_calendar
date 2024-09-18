import React from 'react';
import { api } from '../services/api';

interface HeaderProps {
  isAuthorized: boolean;
  userEmail: string;
  onSignOut: () => void;
  isAuthorizing: boolean;
  setIsAuthorizing: React.Dispatch<React.SetStateAction<boolean>>;
}

const Header: React.FC<HeaderProps> = ({ isAuthorized, userEmail, onSignOut, isAuthorizing, setIsAuthorizing }) => {
  const handleAuthorize = async () => {
    setIsAuthorizing(true);
    try {
      const data = await api.getAuthUrl();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        console.error('Auth URL not found in response');
        setIsAuthorizing(false);
      }
    } catch (error) {
      console.error('Error:', error);
      setIsAuthorizing(false);
    }
  };

  return (
    <header className="header">
      <h1>Voice Calendar</h1>
      {isAuthorized ? (
        <div>
          <span className="user-email">You are signed in as <span className="email">{userEmail}</span></span>
          <button className="auth-button" onClick={onSignOut}>Sign Out</button>
        </div>
      ) : isAuthorizing ? (
        <span>Signing in...</span>
      ) : (
        <button className="auth-button" onClick={handleAuthorize}>Sign In with Google</button>
      )}
    </header>
  );
};

export default Header;