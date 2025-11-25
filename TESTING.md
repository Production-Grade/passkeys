# Testing Guide

This guide covers different ways to test the `@productiongrade/passkeys` library.

## 1. Automated Tests ✅

The library includes comprehensive test coverage with 138 tests.

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Core services
npm test -- PasskeyService
npm test -- ChallengeService
npm test -- RecoveryService

# Storage implementations
npm test -- storage-implementations

# Integration tests
npm test -- passkey-management

# Utilities
npm test -- crypto
npm test -- encoding
npm test -- validation
```

### Run with Coverage
```bash
npm test -- --coverage
```

### Watch Mode (for development)
```bash
npm test -- --watch
```

## 2. Manual Testing with Example App

### Start the Demo Application

```bash
# Build the library
npm run build

# Install ts-node if not already installed
npm install -D ts-node

# Run the example app
npx ts-node examples/basic-express-app.ts
```

Open http://localhost:3000 in your browser to see the demo UI.

**Note**: The demo shows the API structure but WebAuthn requires HTTPS in production and won't work fully in this local demo. For real WebAuthn testing, see the next section.

## 3. Testing with curl (API Testing)

Since WebAuthn requires browser APIs, here's how to test the library's API structure using curl:

### Registration Flow
```bash
# 1. Start registration
curl -X POST http://localhost:3000/auth/register/start \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Response includes challenge and options for WebAuthn
```

### Authentication Flow
```bash
# 1. Start authentication
curl -X POST http://localhost:3000/auth/authenticate/start \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Recovery Code Flow
```bash
# 1. Generate recovery codes (requires authentication)
curl -X POST http://localhost:3000/auth/recovery/codes/generate \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# 2. Authenticate with recovery code
curl -X POST http://localhost:3000/auth/recovery/codes/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "RECOVERY-CODE-HERE"
  }'

# 3. Get recovery code count
curl -X GET http://localhost:3000/auth/recovery/codes/count \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

### Email Recovery Flow
```bash
# 1. Initiate email recovery
curl -X POST http://localhost:3000/auth/recovery/email/initiate \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 2. Verify recovery token (token from email)
curl -X POST http://localhost:3000/auth/recovery/email/verify \
  -H "Content-Type: application/json" \
  -d '{"token": "TOKEN-FROM-EMAIL"}'
```

### Passkey Management
```bash
# 1. List user's passkeys
curl -X GET http://localhost:3000/auth/passkeys \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# 2. Delete a passkey
curl -X DELETE http://localhost:3000/auth/passkeys/PASSKEY_ID \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## 4. Testing with Real WebAuthn

To test actual WebAuthn functionality, you need:

1. **HTTPS**: WebAuthn requires a secure context
2. **Valid Domain**: Use a real domain or localhost with SSL
3. **WebAuthn-capable Device**: Modern browser with biometrics or security key

### Setup for Real WebAuthn Testing

#### Option A: Use ngrok for HTTPS tunnel
```bash
# Install ngrok: https://ngrok.com/
ngrok http 3000

# Use the HTTPS URL provided by ngrok
# Update rpId and origin in your config to match ngrok domain
```

#### Option B: Local HTTPS with mkcert
```bash
# Install mkcert: https://github.com/FiloSottile/mkcert
mkcert -install
mkcert localhost

# Update your Express app to use HTTPS
# https.createServer({
#   key: fs.readFileSync('localhost-key.pem'),
#   cert: fs.readFileSync('localhost.pem')
# }, app).listen(3000);
```

#### Option C: Use a staging/production environment
- Deploy to a service with HTTPS (Vercel, Netlify, Heroku, etc.)
- Configure rpId and origin to match your domain

### Frontend WebAuthn Integration

Here's a complete example for the browser:

```typescript
// Registration
async function registerWithPasskey(email: string) {
  // 1. Start registration
  const startResp = await fetch('/auth/register/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const { data: options } = await startResp.json();

  // 2. Create credential using WebAuthn
  const credential = await navigator.credentials.create({
    publicKey: {
      ...options,
      challenge: base64UrlToBuffer(options.challenge),
      user: {
        ...options.user,
        id: base64UrlToBuffer(options.user.id)
      },
      excludeCredentials: options.excludeCredentials?.map(c => ({
        ...c,
        id: base64UrlToBuffer(c.id)
      }))
    }
  });

  // 3. Complete registration
  const finishResp = await fetch('/auth/register/finish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      credential: {
        id: credential.id,
        rawId: bufferToBase64Url(credential.rawId),
        response: {
          clientDataJSON: bufferToBase64Url(credential.response.clientDataJSON),
          attestationObject: bufferToBase64Url(credential.response.attestationObject)
        },
        type: credential.type
      }
    })
  });

  return await finishResp.json();
}

// Helper functions
function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
```

## 5. Testing Custom Storage Implementations

If you're implementing your own storage (e.g., PostgreSQL, MongoDB), run the contract tests:

```typescript
import { YourCustomStorage } from './your-storage';
import { runStorageContractTests } from '@productiongrade/passkeys/tests/contract';

describe('Your Custom Storage', () => {
  let storage: YourCustomStorage;

  beforeEach(() => {
    storage = new YourCustomStorage(/* your config */);
  });

  // Run the contract tests
  runStorageContractTests(() => storage);
});
```

## 6. Load Testing

For production readiness, consider load testing:

```bash
# Install autocannon
npm install -g autocannon

# Test registration endpoint
autocannon -c 10 -d 30 -m POST \
  -H "Content-Type: application/json" \
  -b '{"email":"test@example.com"}' \
  http://localhost:3000/auth/register/start
```

## 7. Security Testing

### Test Recovery Mechanisms
- ✅ Verify recovery codes can only be used once
- ✅ Test email recovery token expiration (default 1 hour)
- ✅ Ensure recovery codes are properly hashed
- ✅ Test rate limiting on recovery requests

### Test Passkey Management
- ✅ Verify users can only manage their own passkeys
- ✅ Test last-passkey deletion prevention
- ✅ Ensure deleted passkeys cannot be used

### Test Authentication
- ✅ Verify challenge expiration (default 5 minutes)
- ✅ Test counter anomaly detection
- ✅ Ensure challenges can only be used once

## 8. Monitoring and Debugging

The library includes comprehensive hooks for monitoring:

```typescript
const passkeys = createPasskeys({
  // ... config
  hooks: {
    onRegistrationStart: (email) => {
      console.log(`Registration started: ${email}`);
      // Log to your monitoring service
    },
    onAuthenticationSuccess: (userId, email) => {
      console.log(`Auth success: ${email}`);
      // Track in analytics
    },
    onAuthenticationFailure: (email, reason) => {
      console.error(`Auth failed: ${email} - ${reason}`);
      // Alert on security issues
    },
    onCounterAnomaly: (userId, passkeyId, expected, received) => {
      console.error(`Counter anomaly detected!`);
      // SECURITY: Investigate immediately
    }
  }
});
```

## Test Checklist

Before deploying to production:

- [ ] All 138+ automated tests pass
- [ ] Custom storage implementation passes contract tests
- [ ] WebAuthn works in staging environment with HTTPS
- [ ] Recovery codes can be generated and used successfully
- [ ] Email recovery flow works end-to-end
- [ ] Passkey management (list, update, delete) works correctly
- [ ] Last passkey cannot be deleted
- [ ] Monitoring hooks are configured
- [ ] Error handling is working correctly
- [ ] Session management is implemented securely
- [ ] HTTPS is enabled in production
- [ ] rpId and origin are correctly configured for your domain

## Need Help?

- Check the [README.md](./README.md) for setup instructions
- Review [specs/001-passkeys-library/spec.md](./specs/001-passkeys-library/spec.md) for requirements
- See [examples/](./examples/) for integration examples
- Run `npm test` to verify your environment


