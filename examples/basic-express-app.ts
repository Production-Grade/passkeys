/**
 * Basic Express App Example
 * Demonstrates how to integrate the Passkeys library into an Express application
 * 
 * To run:
 * 1. mkcert -install && mkcert localhost  (first time only)
 * 2. npm run build
 * 3. ts-node examples/basic-express-app.ts
 * 4. Open https://localhost:3000 in your browser (note: HTTPS!)
 */

import express from 'express';
import https from 'https';
import fs from 'fs';
import { createPasskeys } from '../src/express';
import { createMockStorage, createMockChallengeStorage } from '../src/testing';

const app = express();
app.use(express.json());

// Initialize storage (using testing utilities for this example)
const storage = createMockStorage();
const challengeStorage = createMockChallengeStorage();

// Create passkeys instance
const passkeys = createPasskeys({
  rpName: 'Demo App',
  rpId: 'localhost',
  origin: 'https://localhost:3000',
  storage,
  challenges: challengeStorage,
  userVerification: 'preferred',
  recovery: {
    codes: {
      enabled: true,
      count: 10,
      length: 16,
    },
    email: {
      enabled: true,
      sendEmail: async (to: string, token: string, userId: string) => {
        console.log(`\n📧 Email Recovery Token for ${to}:`);
        console.log(`   User ID: ${userId}`);
        console.log(`   Token: ${token}`);
        console.log(`   Use: POST /auth/recovery/email/verify with { "token": "${token}" }\n`);
      },
      tokenTTL: 60,
    },
  },
  hooks: {
    onRegistrationStart: (userId: string, email: string) => console.log(`🔵 Registration started: ${email} (${userId})`),
    onRegistrationSuccess: (userId: string, passkeyId: string) => console.log(`✅ Registration complete: User ${userId}, Passkey ${passkeyId}`),
    onRegistrationFailure: (userId: string, error: Error) => console.log(`❌ Registration failed: ${userId} - ${error.message}`),
    onAuthStart: (email: string) => console.log(`🔵 Authentication started: ${email}`),
    onAuthSuccess: (userId: string, passkeyId: string) => console.log(`✅ Authentication success: User ${userId}, Passkey ${passkeyId}`),
    onAuthFailure: (email: string, error: Error) => console.log(`❌ Authentication failed: ${email} - ${error.message}`),
    onRecoveryCodesRegenerated: (userId: string, count: number) => console.log(`🔑 Generated ${count} recovery codes for user ${userId}`),
    onRecoveryCodeUsed: (userId: string) => console.log(`🔓 Recovery code used by user ${userId}`),
    onPasskeyDeleted: ({ userId, passkeyId }: { userId: string; passkeyId: string }) => console.log(`🗑️  Passkey ${passkeyId} deleted by user ${userId}`),
  },
});

// Simple session middleware (in production, use express-session or similar)
const sessions = new Map<string, { userId: string }>();

// Authentication middleware to extract session and set req.user
app.use('/auth', (req, _res, next) => {
  const sessionToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (sessionToken && sessions.has(sessionToken)) {
    const session = sessions.get(sessionToken)!;
    (req as any).user = { id: session.userId };
  }
  
  next();
});

// Mount authentication routes
app.use('/auth', passkeys.router);

// Create session endpoint (called after successful auth)
app.post('/session/create', async (req, res): Promise<void> => {
  const { userId } = req.body;
  
  if (!userId) {
    res.status(400).json({ error: 'userId required' });
    return;
  }

  const sessionToken = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  sessions.set(sessionToken, { userId });

  console.log(`📝 Session created for user ${userId}`);
  
  res.json({ 
    sessionToken,
    message: 'Session created successfully' 
  });
});

// Protected route example
app.get('/api/profile', async (req, res): Promise<void> => {
  const sessionToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (!sessionToken || !sessions.has(sessionToken)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const session = sessions.get(sessionToken)!;
  const user = await storage.getUserById(session.userId);
  const passkeys = await storage.getUserPasskeys(session.userId);

  res.json({
    user: {
      id: user?.id,
      email: user?.email,
      createdAt: user?.createdAt,
    },
    passkeys: passkeys.map(p => ({
      id: p.id,
      nickname: p.nickname,
      deviceType: p.deviceType,
      createdAt: p.createdAt,
      lastUsedAt: p.lastUsedAt,
    })),
  });
});

// HTML page for testing
app.get('/', (_req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Passkeys Demo</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 50px auto; padding: 20px; }
    .section { margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
    button { padding: 10px 20px; margin: 5px; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 4px; }
    button:hover { background: #0056b3; }
    input { padding: 8px; margin: 5px; width: 300px; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
    .success { color: green; }
    .error { color: red; }
  </style>
</head>
<body>
  <h1>🔐 Passkeys Demo</h1>
  
  <div class="section">
    <h2>1. Register</h2>
    <input type="email" id="registerEmail" placeholder="your@email.com" value="demo@example.com">
    <button onclick="register()">Register with Passkey</button>
    <div id="registerResult"></div>
  </div>

  <div class="section">
    <h2>2. Authenticate</h2>
    <input type="email" id="authEmail" placeholder="your@email.com" value="demo@example.com">
    <button onclick="authenticate()">Sign In with Passkey</button>
    <div id="authResult"></div>
  </div>

  <div class="section">
    <h2>3. Recovery Codes</h2>
    <button onclick="generateRecoveryCodes()">Generate Recovery Codes</button>
    <div id="recoveryResult"></div>
  </div>

  <div class="section">
    <h2>4. Profile</h2>
    <button onclick="getProfile()">Get Profile</button>
    <div id="profileResult"></div>
  </div>

  <script>
    let sessionToken = null;

    // Helper functions for base64url encoding/decoding
    function base64urlToBuffer(base64url) {
      if (!base64url) {
        console.error('base64urlToBuffer received undefined/null value');
        throw new Error('Invalid base64url string');
      }
      const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    }

    function bufferToBase64url(buffer) {
      if (!buffer) {
        console.error('bufferToBase64url received undefined/null value');
        throw new Error('Invalid buffer');
      }
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=/g, '');
    }

    async function register() {
      try {
        document.getElementById('registerResult').innerHTML = '<p>⏳ Starting registration...</p>';
        const email = document.getElementById('registerEmail').value;

        // Check if WebAuthn is available
        if (!window.PublicKeyCredential) {
          throw new Error('WebAuthn is not supported in this browser. Please use Chrome, Safari, Edge, or Firefox.');
        }

        // Start registration
        const startResp = await fetch('/auth/register/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const startData = await startResp.json();
        
        console.log('Full server response:', JSON.stringify(startData, null, 2));
        
        if (!startResp.ok) {
          throw new Error(startData.detail || 'Registration start failed');
        }

        document.getElementById('registerResult').innerHTML = '<p>⏳ Creating passkey... (Touch your biometric sensor)</p>';

        // Extract options and userId from response
        const options = startData.data;
        const userId = startData.userId;
        console.log('Registration options:', options);
        console.log('User ID:', userId);

        // Validate required fields
        if (!options) {
          throw new Error('Server response missing options: ' + JSON.stringify(startData));
        }
        if (!options.challenge) {
          throw new Error('Options missing challenge: ' + JSON.stringify(options));
        }
        if (!options.user || !options.user.id) {
          throw new Error('Options missing user information: ' + JSON.stringify(options));
        }

        const publicKeyOptions = {
          ...options,
          challenge: base64urlToBuffer(options.challenge),
          user: {
            ...options.user,
            id: base64urlToBuffer(options.user.id)
          },
          excludeCredentials: options.excludeCredentials?.map(cred => ({
            ...cred,
            id: base64urlToBuffer(cred.id)
          })) || []
        };

        console.log('Prepared WebAuthn options:', publicKeyOptions);

        // Create credential using WebAuthn
        const credential = await navigator.credentials.create({ publicKey: publicKeyOptions });

        if (!credential) {
          throw new Error('Failed to create credential');
        }

        document.getElementById('registerResult').innerHTML = '<p>⏳ Completing registration...</p>';

        // Complete registration
        const finishResp = await fetch('/auth/register/finish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            credential: {
              id: credential.id,
              rawId: bufferToBase64url(credential.rawId),
              response: {
                clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
                attestationObject: bufferToBase64url(credential.response.attestationObject)
              },
              type: credential.type
            }
          })
        });

        const finishData = await finishResp.json();

        if (!finishResp.ok) {
          throw new Error(finishData.detail || 'Registration failed');
        }

        // Create session
        sessionToken = await createSession(finishData.data.userId);

        document.getElementById('registerResult').innerHTML = \`
          <p class="success">✅ Registration successful!</p>
          <p>User ID: \${finishData.data.userId}</p>
          <p>Passkey ID: \${finishData.data.passkeyId}</p>
          <p>You can now authenticate using your biometric sensor.</p>
        \`;
      } catch (err) {
        document.getElementById('registerResult').innerHTML = \`<p class="error">Error: \${err.message}</p>\`;
        console.error('Registration error:', err);
      }
    }

    async function authenticate() {
      try {
        document.getElementById('authResult').innerHTML = '<p>⏳ Starting authentication...</p>';
        const email = document.getElementById('authEmail').value;

        // Check if WebAuthn is available
        if (!window.PublicKeyCredential) {
          throw new Error('WebAuthn is not supported in this browser. Please use Chrome, Safari, Edge, or Firefox.');
        }

        const startResp = await fetch('/auth/authenticate/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const startData = await startResp.json();

        if (!startResp.ok) {
          throw new Error(startData.detail || 'Authentication start failed');
        }

        document.getElementById('authResult').innerHTML = '<p>⏳ Authenticating... (Touch your biometric sensor)</p>';

        // Extract options and userId from response
        const options = startData.data;
        const userId = startData.userId;
        console.log('Authentication options:', options);
        console.log('User ID:', userId);

        // Validate required fields
        if (!options) {
          throw new Error('Server response missing options: ' + JSON.stringify(startData));
        }
        if (!options.challenge) {
          throw new Error('Options missing challenge: ' + JSON.stringify(options));
        }

        const publicKeyOptions = {
          ...options,
          challenge: base64urlToBuffer(options.challenge),
          allowCredentials: options.allowCredentials?.map(cred => ({
            ...cred,
            id: base64urlToBuffer(cred.id)
          })) || []
        };

        console.log('Prepared WebAuthn options:', publicKeyOptions);

        // Get credential using WebAuthn
        const assertion = await navigator.credentials.get({ publicKey: publicKeyOptions });

        if (!assertion) {
          throw new Error('Failed to get credential');
        }

        document.getElementById('authResult').innerHTML = '<p>⏳ Completing authentication...</p>';

        // Complete authentication
        const finishResp = await fetch('/auth/authenticate/finish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            credential: {
              id: assertion.id,
              rawId: bufferToBase64url(assertion.rawId),
              response: {
                clientDataJSON: bufferToBase64url(assertion.response.clientDataJSON),
                authenticatorData: bufferToBase64url(assertion.response.authenticatorData),
                signature: bufferToBase64url(assertion.response.signature),
                userHandle: assertion.response.userHandle ? bufferToBase64url(assertion.response.userHandle) : null
              },
              type: assertion.type
            }
          })
        });

        const finishData = await finishResp.json();

        if (!finishResp.ok) {
          throw new Error(finishData.detail || 'Authentication failed');
        }

        // Create session
        sessionToken = await createSession(finishData.data.user.id);

        document.getElementById('authResult').innerHTML = \`
          <p class="success">✅ Authentication successful!</p>
          <p>User ID: \${finishData.data.user.id}</p>
          <p>Email: \${finishData.data.user.email}</p>
          <p>Session token created.</p>
        \`;
      } catch (err) {
        document.getElementById('authResult').innerHTML = \`<p class="error">Error: \${err.message}</p>\`;
        console.error('Authentication error:', err);
      }
    }

    async function createSession(userId) {
      const resp = await fetch('/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await resp.json();
      return data.sessionToken;
    }

    async function generateRecoveryCodes() {
      try {
        if (!sessionToken) {
          document.getElementById('recoveryResult').innerHTML = '<p class="error">⚠️ Not authenticated</p><p>Please register or sign in first.</p>';
          return;
        }

        document.getElementById('recoveryResult').innerHTML = '<p>⏳ Generating recovery codes...</p>';

        const resp = await fetch('/auth/recovery/codes/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${sessionToken}\`
          }
        });
        const data = await resp.json();

        if (!resp.ok) {
          throw new Error(data.detail || 'Failed to generate recovery codes');
        }

        document.getElementById('recoveryResult').innerHTML = \`
          <p class="success">✅ Recovery codes generated!</p>
          <p><strong>⚠️ Save these codes in a safe place!</strong></p>
          <pre>\${data.data.codes.join('\\n')}</pre>
          <p>You can use any of these codes once to recover your account if you lose access to your passkey.</p>
        \`;
      } catch (err) {
        document.getElementById('recoveryResult').innerHTML = \`<p class="error">Error: \${err.message}</p>\`;
      }
    }

    async function getProfile() {
      try {
        if (!sessionToken) {
          document.getElementById('profileResult').innerHTML = '<p class="error">Not authenticated. Please sign in first.</p>';
          return;
        }

        const resp = await fetch('/api/profile', {
          headers: { 'Authorization': \`Bearer \${sessionToken}\` }
        });
        const data = await resp.json();

        if (!resp.ok) throw new Error(data.error);

        document.getElementById('profileResult').innerHTML = \`
          <p class="success">✅ Profile loaded</p>
          <pre>\${JSON.stringify(data, null, 2)}</pre>
        \`;
      } catch (err) {
        document.getElementById('profileResult').innerHTML = \`<p class="error">Error: \${err.message}</p>\`;
      }
    }
  </script>
</body>
</html>
  `);
});

const PORT = 3000;

// Load SSL certificates
const httpsOptions = {
  key: fs.readFileSync('localhost-key.pem'),
  cert: fs.readFileSync('localhost.pem')
};

https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🚀 Passkeys Demo App Running                           ║
╠══════════════════════════════════════════════════════════╣
║  URL: https://localhost:${PORT} 🔒                         ║
║                                                          ║
║  ✅ HTTPS enabled - WebAuthn will work!                 ║
║                                                          ║
║  Available Routes:                                       ║
║  • GET  /                     - Demo UI                  ║
║  • POST /auth/register/start  - Start registration       ║
║  • POST /auth/register/finish - Complete registration    ║
║  • POST /auth/authenticate/*  - Authentication           ║
║  • POST /auth/recovery/*      - Recovery flows           ║
║  • GET  /api/profile          - Protected route          ║
║                                                          ║
║  Note: Browser may show security warning for self-      ║
║        signed cert - click "Advanced" > "Proceed"       ║
╚══════════════════════════════════════════════════════════╝
  `);
});

