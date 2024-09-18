import React from 'react';

interface HeaderProps {
  isAuthorized: boolean;
  userEmail: string;
  onSignOut: () => void;
}

const Header: React.FC<HeaderProps> = ({ isAuthorized, userEmail, onSignOut }) => {
  const handleAuthorize = async () => {
    try {
      const response = await fetch('http://localhost:3000/auth', { 
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.authUrl) {
          window.location.href = data.authUrl;
        } else {
          console.error('Auth URL not found in response');
        }
      } else {
        console.error('Failed to get auth URL:', response.statusText);
      }
    } catch (error) {
      console.error('Error:', error);
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
      ) : (
        <button className="auth-button" onClick={handleAuthorize}>Authorize with Google</button>
      )}
    </header>
  );
};

export default Header;