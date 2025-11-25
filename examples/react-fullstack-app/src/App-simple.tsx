import { useState } from 'react';
import AuthPage from './components/AuthPage-simple';
import Dashboard from './components/Dashboard-simple';
import './App.css';

function App() {
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null);

  const handleAuthenticated = (userId: string) => {
    setAuthenticatedUserId(userId);
  };

  const handleLogout = () => {
    setAuthenticatedUserId(null);
  };

  return (
    <div className="app">
      {authenticatedUserId ? (
        <Dashboard userId={authenticatedUserId} onLogout={handleLogout} />
      ) : (
        <AuthPage onAuthenticated={handleAuthenticated} />
      )}
    </div>
  );
}

export default App;


