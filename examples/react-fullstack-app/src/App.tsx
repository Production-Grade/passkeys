import { useState, useEffect } from 'react';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import './App.css';

interface User {
  id: string;
  email: string;
}

function App() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    if (token) {
      // Verify session with backend
      fetch('http://localhost:3001/api/session', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(res => res.json())
        .then(data => {
          if (data.authenticated) {
            setSessionToken(token);
            setUser(data.user);
          } else {
            localStorage.removeItem('sessionToken');
          }
        })
        .catch(() => {
          localStorage.removeItem('sessionToken');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleAuthenticated = (token: string, userData: User) => {
    localStorage.setItem('sessionToken', token);
    setSessionToken(token);
    setUser(userData);
  };

  const handleLogout = async () => {
    if (sessionToken) {
      try {
        await fetch('http://localhost:3001/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        });
      } catch {
        // Ignore logout errors
      }
    }
    localStorage.removeItem('sessionToken');
    setSessionToken(null);
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {sessionToken && user ? (
        <Dashboard 
          user={user}
          sessionToken={sessionToken}
          onLogout={handleLogout}
        />
      ) : (
        <AuthPage onAuthenticated={handleAuthenticated} />
      )}
    </div>
  );
}

export default App;
