import React, { useState } from 'react';
import Main from './components/Main';
import Footer from './components/Footer';   
import './App.css';

const App: React.FC = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  return (
    <div className="App">
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