/**
 * Complete Backend Server for React + Passkeys Example
 * 
 * This example demonstrates ALL features of @castellan/passkeys:
 * - Passkey registration and authentication
 * - Session management (simple in-memory for demo)
 * - Passkey management (list, update, delete)
 * - Recovery codes (generate, authenticate, count)
 * - Email recovery (initiate, verify)
 * 
 * For production patterns, see: https://github.com/castellan-cyber/passkeys-production-example
 */

import express from 'express';
import cors from 'cors';
import { createPasskeys } from '@productiongrade/passkeys/express';
import { createMockStorage, createMockChallengeStorage } from '@productiongrade/passkeys/testing';
import { randomBytes } from 'crypto';

const app = express();
const PORT = process.env.PORT || 3001;

// Simple in-memory session storage (use Redis/database in production)
const sessions = new Map<string, { userId: string; email: string; createdAt: Date }>();

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

// Simple session middleware - extracts userId from Authorization header
app.use('/api', (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = sessions.get(token);
    if (session) {
      (req as any).user = { id: session.userId, email: session.email };
    }
  }
  next();
});

// Helper to create session token
function createSession(userId: string, email: string): string {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { userId, email, createdAt: new Date() });
  
  // Auto-expire after 24 hours
  setTimeout(() => sessions.delete(token), 24 * 60 * 60 * 1000);
  
  return token;
}

// Create storage instances
const storage = createMockStorage();
const challengeStorage = createMockChallengeStorage();

// Create passkey authentication with all features enabled
const { router: passkeyRouter, services } = createPasskeys({
  rpId: 'localhost',
  rpName: 'Passkeys Complete Example',
  origin: 'http://localhost:5173',
  storage,
  challenges: challengeStorage,
  userVerification: 'preferred',
  recovery: {
    codes: {
      enabled: true,
      count: 10,
      length: 8,
    },
    email: {
      enabled: true,
      sendEmail: async (to, token) => {
        console.log('\n📧 Recovery Email');
        console.log(`To: ${to}`);
        console.log(`Recovery URL: http://localhost:5173/recover?token=${token}`);
        console.log('(In production, send this via email service)\n');
      },
      tokenTTL: 60, // 60 minutes
    },
  },
});

// Custom finish endpoints that add session tokens
// These must be defined BEFORE mounting the router
app.post('/api/auth/passkey/authenticate/finish', async (req, res, next) => {
  try {
    const { credential } = req.body;
    const challengeRecord = await services.challenge.verify(credential.response.clientDataJSON);
    const result = await services.passkey.verifyAuthentication(credential, challengeRecord.challenge);
    await services.challenge.delete(challengeRecord.id);
    const user = await storage.getUserById(result.userId);
    const sessionToken = createSession(result.userId, user!.email);
    
    res.json({
      success: true,
      data: { verified: true, user, passkey: result.passkey, sessionToken },
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/passkey/register/finish', async (req, res, next) => {
  try {
    const { userId, credential, nickname } = req.body;
    const challenge = await services.challenge.verify(credential.response.clientDataJSON);
    const passkey = await services.passkey.verifyRegistration(credential, challenge.challenge, userId, nickname);
    await services.challenge.delete(challenge.id);
    const user = await storage.getUserById(userId);
    const sessionToken = createSession(userId, user!.email);
    
    res.json({
      success: true,
      data: { verified: true, user, passkey, sessionToken },
    });
  } catch (error) {
    next(error);
  }
});

// Mount passkey routes (will skip the above routes since they're already defined)
app.use('/api/auth/passkey', passkeyRouter);

// Get current session
app.get('/api/session', (req, res) => {
  const user = (req as any).user;
  
  if (!user) {
    return res.status(401).json({
      authenticated: false,
    });
  }
  
  res.json({
    authenticated: true,
    user,
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    sessions.delete(token);
  }
  res.json({ success: true });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    features: {
      passkeys: true,
      recoveryCodes: true,
      emailRecovery: true,
      passkeyManagement: true,
    },
  });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // RFC 7807 Problem Details format
  res.status(err.statusCode || 500).json({
    type: err.code || 'internal_error',
    title: err.name || 'Error',
    status: err.statusCode || 500,
    detail: err.message || 'Internal server error',
    ...(err.details && { details: err.details }),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`\n📖 Available Features:`);
  console.log(`   ✅ Passkey Registration & Authentication`);
  console.log(`   ✅ Session Management`);
  console.log(`   ✅ Passkey Management (list, update, delete)`);
  console.log(`   ✅ Recovery Codes (generate, authenticate, count)`);
  console.log(`   ✅ Email Recovery (initiate, verify)`);
  console.log(`\n📚 API Endpoints:`);
  console.log(`   - POST   /api/auth/passkey/register/start`);
  console.log(`   - POST   /api/auth/passkey/register/finish`);
  console.log(`   - POST   /api/auth/passkey/authenticate/start`);
  console.log(`   - POST   /api/auth/passkey/authenticate/finish`);
  console.log(`   - GET    /api/auth/passkey/passkeys (requires auth)`);
  console.log(`   - PATCH  /api/auth/passkey/passkeys/:id (requires auth)`);
  console.log(`   - DELETE /api/auth/passkey/passkeys/:id (requires auth)`);
  console.log(`   - POST   /api/auth/passkey/recovery/codes/generate (requires auth)`);
  console.log(`   - POST   /api/auth/passkey/recovery/codes/authenticate`);
  console.log(`   - GET    /api/auth/passkey/recovery/codes/count (requires auth)`);
  console.log(`   - POST   /api/auth/passkey/recovery/email/initiate`);
  console.log(`   - POST   /api/auth/passkey/recovery/email/verify`);
  console.log(`   - GET    /api/session`);
  console.log(`   - POST   /api/auth/logout`);
  console.log(`\n🎨 Frontend: http://localhost:5173`);
  console.log(`\n💡 Note: This example uses in-memory storage for simplicity.`);
  console.log(`   For production, use Prisma, Redis, or another persistent storage.\n`);
});
