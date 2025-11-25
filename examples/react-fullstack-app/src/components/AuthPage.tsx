import { useState } from 'react';
import { usePasskeyRegistration, usePasskeyAuth, isWebAuthnSupported } from '@productiongrade/passkeys/react';
import '../styles/AuthPage.css';

interface User {
  id: string;
  email: string;
}

interface AuthPageProps {
  onAuthenticated: (token: string, user: User) => void;
}

function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<'login' | 'register' | 'recovery'>('login');
  const [recoveryCode, setRecoveryCode] = useState('');

  const registration = usePasskeyRegistration({
    apiUrl: 'http://localhost:3001/api/auth/passkey',
    onSuccess: (user, _passkey, _recoveryCodes) => {
      // Registration now returns sessionToken from our custom endpoint
      fetch('http://localhost:3001/api/session', {
        headers: {
          'Authorization': `Bearer ${(user as any).sessionToken}`,
        },
      })
        .then(res => res.json())
        .then(data => {
          if (data.authenticated) {
            onAuthenticated((user as any).sessionToken, data.user);
          }
        })
        .catch(() => {
          alert('Registration successful but session creation failed. Please sign in.');
          setMode('login');
        });
    },
    onError: (error) => {
      alert(`Registration failed: ${error.message}`);
    },
  });

  const auth = usePasskeyAuth({
    apiUrl: 'http://localhost:3001/api/auth/passkey',
    onSuccess: (user, data) => {
      const token = data?.sessionToken;
      if (token) {
        onAuthenticated(token, user as User);
      } else {
        alert('Authentication successful but no session token received');
      }
    },
    onError: (error) => {
      alert(`Authentication failed: ${error.message}`);
    },
  });

  const isLoading = registration.isRegistering || auth.isAuthenticating;
  const error = registration.error || auth.error;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      alert('Please enter your email address');
      return;
    }

    if (mode === 'recovery' && !recoveryCode) {
      alert('Please enter your recovery code');
      return;
    }

    try {
      if (mode === 'register') {
        await registration.register({ email });
      } else if (mode === 'recovery') {
        await handleRecoveryCodeAuth();
      } else {
        await auth.authenticate({ email });
      }
    } catch (err) {
      // Error already handled by hook's onError callback
    }
  };

  const handleRecoveryCodeAuth = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/passkey/recovery/codes/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: recoveryCode }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Invalid recovery code');
      }

      const data = await response.json();
      const sessionToken = data.data?.sessionToken || data.sessionToken;
      const user = data.data?.user || data.user;
      
      if (sessionToken && user) {
        onAuthenticated(sessionToken, user);
      } else {
        alert('Recovery successful but no session token received');
      }
    } catch (err: any) {
      alert(`Recovery failed: ${err.message}`);
    }
  };

  if (!isWebAuthnSupported()) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>⚠️ Passkeys Not Supported</h1>
          <p className="error-message">
            Your browser doesn't support passkeys (WebAuthn).
            Please use a modern browser like Chrome, Safari, or Edge.
          </p>
          <p className="browser-list">
            <strong>Supported Browsers:</strong><br />
            • Chrome 67+<br />
            • Safari 14+<br />
            • Edge 18+<br />
            • Firefox 60+
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🔐 Passkeys Complete Example</h1>
          <p className="subtitle">
            {mode === 'register' 
              ? 'Create your account with a passkey'
              : mode === 'recovery'
              ? 'Sign in with a recovery code'
              : 'Sign in with your passkey'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading}
              autoComplete="email webauthn"
            />
          </div>

          {mode === 'recovery' && (
            <div className="form-group">
              <label htmlFor="recovery-code">Recovery Code</label>
              <input
                id="recovery-code"
                type="text"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                placeholder="Enter your recovery code"
                required
                disabled={isLoading}
              />
            </div>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={isLoading || !email || (mode === 'recovery' && !recoveryCode)}
          >
            {isLoading ? (
              <>
                <div className="spinner-small"></div>
                {mode === 'register' ? 'Creating passkey...' : mode === 'recovery' ? 'Verifying...' : 'Authenticating...'}
              </>
            ) : (
              <>
                {mode === 'register' ? '✨ Create Passkey' : mode === 'recovery' ? '🔑 Use Recovery Code' : '🔓 Sign In'}
              </>
            )}
          </button>

          {error && (
            <div className="error-box">
              <strong>Error:</strong> {error.message}
              <button
                onClick={() => {
                  registration.reset();
                  auth.reset();
                }}
                className="error-retry"
              >
                Try Again
              </button>
            </div>
          )}

          <div className="divider">
            <span>or</span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (mode === 'register') setMode('login');
              else if (mode === 'login') setMode('register');
              else setMode('login');
              setRecoveryCode('');
            }}
            className="secondary-button"
            disabled={isLoading}
          >
            {mode === 'register' 
              ? 'Already have an account? Sign In'
              : mode === 'recovery'
              ? 'Back to Sign In'
              : 'Need an account? Create One'}
          </button>

          {mode === 'login' && (
            <button
              type="button"
              onClick={() => setMode('recovery')}
              className="text-button"
              disabled={isLoading}
            >
              Lost your passkey? Use recovery code
            </button>
          )}
        </form>

        <div className="info-box">
          <h3>What This Example Demonstrates</h3>
          <p>
            This is a <strong>complete example</strong> showing all features of @productiongrade/passkeys:
          </p>
          <ul>
            <li>✅ Passkey registration and authentication</li>
            <li>✅ Session management</li>
            <li>✅ Passkey management (list, update, delete)</li>
            <li>✅ Recovery codes (generate and use)</li>
            <li>✅ Email recovery</li>
          </ul>
          <p className="note">
            <strong>Note:</strong> This uses simple in-memory sessions for demonstration.
            For production patterns, see our{' '}
            <a href="https://github.com/castellan-cyber/passkeys-production-example" target="_blank" rel="noopener noreferrer">
              production example
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
