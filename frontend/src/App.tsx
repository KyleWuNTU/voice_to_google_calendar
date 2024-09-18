import React, { useState } from 'react';
import Header from './components/Header';
import Main from './components/Main';
import Footer from './components/Footer';   
import './App.css';

const App: React.FC = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const handleSignOut = async () => {
    try {
      const response = await fetch('http://localhost:3000/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        setIsAuthorized(false);
        setUserEmail('');
      } else {
        console.error('Failed to sign out:', response.statusText);
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="App">
      <Header isAuthorized={isAuthorized} userEmail={userEmail} onSignOut={handleSignOut} />
      <Main 
        isAuthorized={isAuthorized} 
        setIsAuthorized={setIsAuthorized}
        userEmail={userEmail}
        setUserEmail={setUserEmail}
      />
      <Footer />
    </div>
  );
};

export default App;