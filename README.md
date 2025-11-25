# @productiongrade/passkeys

Production-ready passkey authentication library for Node.js applications.

[![npm version](https://img.shields.io/npm/v/@productiongrade/passkeys.svg)](https://www.npmjs.com/package/@productiongrade/passkeys)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Test Coverage](https://img.shields.io/badge/coverage-93%25-brightgreen.svg)](./CONTRIBUTING.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

## Why Passkeys?

Passkeys provide **passwordless authentication** using device biometrics (Face ID, Touch ID, Windows Hello) or security keys. Benefits include:

- **More Secure**: No passwords to steal, phish, or leak
- **Faster UX**: Biometric auth in seconds, no typing
- **Lower Costs**: Eliminate password reset support tickets
- **Standards-Based**: WebAuthn/FIDO2 supported across all major browsers
- **Cross-Device**: Works on phones, laptops, tablets, and security keys

## Features

### Core Capabilities

- **WebAuthn/FIDO2 Compliant** - Standards-based passkey authentication
- **Next.js 14+ Adapter** - App Router integration with 10-20 lines of code
- **Express Integration** - Ready-to-use Express adapter with RFC 7807 error handling
- **NextAuth Provider** - Seamless NextAuth credentials provider for session management
- **React Hooks** - `usePasskeyRegistration`, `usePasskeyAuth`, `usePasskeyManagement`
- **Framework-Agnostic Core** - Bring your own framework
- **Flexible Storage** - Use any database via storage interface
- **TypeScript-First** - 100% type-safe with full IntelliSense support

### Security Features

- **Counter Anomaly Detection** - Detects cloned credentials
- **Challenge-Based Auth** - Replay attack prevention (5-min TTL)
- **Recovery Mechanisms** - Bcrypt-hashed recovery codes + email recovery
- **Security Event Hooks** - Monitor all authentication events
- **User Verification** - Configurable biometric requirements

### Developer Experience

- **30-Minute Integration** - Get started in minutes
- **Reference Implementations** - Prisma (PostgreSQL) + Redis adapters included
- **Comprehensive Docs** - API reference, migration guides, troubleshooting
- **93%+ Test Coverage** - Production-ready quality with 160+ tests
- **Testing Utilities** - Mock storage and fixtures for easy testing
- **Type-Safe Error Handling** - Type guards and enhanced error messages
- **Configuration Validation** - Catch config errors early with helpful messages
- **Active Maintenance** - Built and maintained by ProductionGrade

## Installation

```bash
npm install @productiongrade/passkeys
```

### Peer Dependencies

```bash
# For Next.js integration
npm install next next-auth  # Optional: next-auth only if using PasskeyProvider

# For Express integration
npm install express

# For React hooks
npm install react @simplewebauthn/browser
```

## Quick Start

### Next.js 14+ (App Router)

```typescript
// app/api/auth/passkeys/[[...passkey]]/route.ts
import { createNextPasskeys } from '@productiongrade/passkeys/nextjs';
import { PrismaAdapter } from '@productiongrade/passkeys/adapters/prisma';
import { prisma } from '@/lib/prisma';

const { POST, GET, DELETE, PATCH } = createNextPasskeys({
  rpId: process.env.NEXT_PUBLIC_RP_ID!,
  rpName: 'My App',
  origin: process.env.NEXT_PUBLIC_APP_URL!,
  storage: new PrismaAdapter(prisma),
});

export { POST, GET, DELETE, PATCH };
```

**With NextAuth Integration:**

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { PasskeyProvider } from '@productiongrade/passkeys/nextjs/provider';
import { storage } from '@/lib/storage';

const handler = NextAuth({
  providers: [
    PasskeyProvider({
      rpId: process.env.NEXT_PUBLIC_RP_ID!,
      rpName: 'My App',
      origin: process.env.NEXT_PUBLIC_APP_URL!,
      storage,
    }),
  ],
});

export { handler as GET, handler as POST };
```

### Express

```typescript
import express from 'express';
import { createPasskeys } from '@productiongrade/passkeys/express';
import { MemoryStorage, MemoryChallengeStorage } from '@productiongrade/passkeys/adapters/memory';

const app = express();
app.use(express.json());

// Create passkey authentication
const { router, middleware } = createPasskeys({
  rpId: 'localhost',                      // Your domain
  rpName: 'My App',                       // Your app name
  origin: 'http://localhost:3000',        // Your origin
  storage: new MemoryStorage(),           // User/passkey storage
  challengeStorage: new MemoryChallengeStorage(), // Challenge storage
  recovery: {
    email: {
      enabled: true,
      sendEmail: async (to, token) => {
        // Send recovery email
        console.log(`Recovery token for ${to}: ${token}`);
      }
    }
  },
  hooks: {
    onAuthSuccess: async (userId) => {
      console.log('User authenticated:', userId);
    }
  }
});

// Mount authentication routes
app.use('/api/auth', router);

// Protected route example
app.get('/api/profile', middleware.requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

## React Integration

```tsx
import { usePasskeyAuth } from '@productiongrade/passkeys/react';

function LoginForm() {
  const { authenticate, isLoading, error } = usePasskeyAuth({
    apiUrl: '/api/auth',
    onSuccess: (user) => {
      console.log('Logged in:', user);
      navigate('/dashboard');
    },
  });

  return (
    <button onClick={() => authenticate('user@example.com')} disabled={isLoading}>
      {isLoading ? 'Authenticating...' : 'Sign in with Passkey'}
    </button>
  );
}
```

**Available Hooks:**
- `usePasskeyRegistration()` - Passkey registration flow
- `usePasskeyAuth()` - Authentication flow
- `usePasskeyManagement()` - List/update/delete passkeys

See [react-integration.mdx](docs/react-integration.mdx) for complete React documentation.

## Documentation

### Getting Started

- **[Getting Started](docs/getting-started.mdx)** - Quick setup guide for all frameworks
- **[Concepts](docs/concepts.mdx)** - Understanding passkeys, WebAuthn, and architecture
- **[Examples](docs/examples.mdx)** - Common patterns and copy-paste code samples

### Reference

- **[API Reference](docs/api-reference.mdx)** - Complete API documentation for all services
- **[Configuration](docs/configuration.mdx)** - All configuration options and settings

### Guides

- **[Best Practices](docs/best-practices.mdx)** - Security, performance, and production recommendations
- **[Deployment](docs/deployment.mdx)** - Production deployment checklist and setup
- **[Testing](docs/testing.mdx)** - Testing strategies, patterns, and utilities
- **[Error Handling](docs/error-handling.mdx)** - Error types, handling patterns, and recovery
- **[Patterns](docs/patterns.mdx)** - Real-world patterns (multi-tenant, RBAC, sessions, etc.)

### Framework Integration

- **[React Integration](docs/react-integration.mdx)** - Frontend integration with React hooks
- **[Storage Adapters](docs/storage-adapters.mdx)** - Implement custom storage for any database
- **[Migration Guide](docs/migration.mdx)** - Migrate from password-based auth
- **[Troubleshooting](docs/troubleshooting.mdx)** - Common issues and solutions

## Storage Adapters

Use any database by implementing the `PasskeyStorage` interface:

```typescript
import { PrismaAdapter } from '@productiongrade/passkeys/adapters/prisma';
import { RedisChallengeStorage } from '@productiongrade/passkeys/adapters/redis';
import prisma from './prisma';
import redis from './redis';

const { router } = createPasskeys({
  rpId: 'example.com',
  rpName: 'My App',
  origin: 'https://example.com',
  storage: new PrismaAdapter(prisma),           // PostgreSQL via Prisma
  challengeStorage: new RedisChallengeStorage(redis), // Redis for challenges
});
```

**Included Adapters:**
- `MemoryStorage` - In-memory (development only)
- `PrismaAdapter` - PostgreSQL, MySQL, SQLite via Prisma
- `RedisChallengeStorage` - Redis for ephemeral challenges

**Custom Adapters:**
See [storage-adapters.mdx](docs/storage-adapters.mdx) for implementing your own storage adapter.

## Examples

### React Full-Stack Example

**[examples/react-fullstack-app/](examples/react-fullstack-app/)** - Complete working application

A production-ready example demonstrating:
- Passkey registration and authentication
- React hooks (`usePasskeyRegistration`, `usePasskeyAuth`, `usePasskeyManagement`)
- Express backend with session management
- Responsive, modern UI
- TypeScript throughout

```bash
cd examples/react-fullstack-app
npm install
npm run dev
```

Open http://localhost:5173 to see it in action!

### Basic Express Example

**[examples/basic-express-app.ts](examples/basic-express-app.ts)** - Minimal Express server

```bash
npm run build
npx ts-node examples/basic-express-app.ts
```

## Developer Utilities

### Type-Safe Error Handling

```typescript
import { isAuthenticationError, getErrorDetails } from '@productiongrade/passkeys';

try {
  await passkeyService.authenticate(...);
} catch (error) {
  if (isAuthenticationError(error)) {
    const details = getErrorDetails(error);
    if (details?.details?.troubleshooting) {
      console.log('Help:', details.details.troubleshooting);
    }
  }
}
```

### Configuration Validation

```typescript
import { validatePasskeyConfig, createPasskeyConfig } from '@productiongrade/passkeys';

// Validate config at startup
const result = validatePasskeyConfig(config);
if (!result.valid) {
  console.error('Errors:', result.errors);
}

// Or use builder with defaults
const config = createPasskeyConfig({
  rpId: 'example.com',
  rpName: 'My App',
  origin: 'https://example.com',
  storage: myStorage,
  challenges: myChallengeStorage,
});
```

### Testing Utilities

```typescript
import { createMockStorage, testFixtures } from '@productiongrade/passkeys/testing';

const storage = createMockStorage();
const user = testFixtures.createTestUser({ email: 'test@example.com' });
```

### Debug Mode

```typescript
import { debugLog } from '@productiongrade/passkeys';

// Set DEBUG=@productiongrade/passkeys:* to enable
debugLog('PasskeyService', 'Starting registration', { userId, email });
```

See [api-reference.mdx](docs/api-reference.mdx) for complete utility documentation.

## Testing

```bash
# Run all tests (160+ tests, 93%+ coverage)
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage

# Test API endpoints
chmod +x examples/test-api.sh
./examples/test-api.sh
```

**Test Coverage:**
- Unit tests for all core services
- Integration tests for complete authentication flows
- Contract tests for storage implementations
- Real WebAuthn testing with HTTPS

See [TESTING.md](./TESTING.md) for detailed testing instructions.

## Architecture

- **Framework-agnostic core** - works with any Node.js framework
- **Storage interface pattern** - works with any database
- **Express adapter** - ready-to-use Express integration
- **React hooks** - optional frontend utilities
- **Reference implementations** - Prisma, Redis, in-memory examples

## Requirements

- Node.js 18+ (LTS)
- TypeScript 5.3+ (recommended)

## Security

This library implements **WebAuthn/FIDO2 standards** with enterprise-grade security:

### Authentication Security
- Challenge-based authentication (5-minute TTL, single-use)
- Origin validation (prevents phishing attacks)
- Counter anomaly detection (detects cloned credentials)
- User verification support (biometric/PIN requirements)

### Data Security
- Bcrypt-hashed recovery codes (10 rounds)
- SHA-256 hashed email recovery tokens
- No plaintext secrets ever stored
- Automatic challenge cleanup

### Monitoring & Compliance
- Security event hooks for all authentication events
- Counter anomaly alerts
- Failed authentication tracking
- RFC 7807 Problem Details error responses

**Example: Security Monitoring**

```typescript
const { router } = createPasskeys({
  // ... config
  hooks: {
    onAuthFailure: async (email, error) => {
      await securityLog.create({
        type: 'AUTH_FAILURE',
        email,
        error: error.message,
      });
    },
    onCounterAnomaly: async (userId, passkeyId, expected, received) => {
      await alerts.send('CRITICAL: Possible cloned credential', {
        userId,
        passkeyId,
        expected,
        received,
      });
      // Lock account pending investigation
      await accounts.lock(userId);
    },
  },
});
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Code standards
- Testing requirements
- Pull request process

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

## License

MIT © ProductionGrade

## Support

### Getting Help

- **Documentation**: [Complete docs](docs/) - API reference, guides, and examples
- **Bug Reports**: [GitHub Issues](https://github.com/Production-Grade/passkeys/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Production-Grade/passkeys/discussions)
- **Email**: support@productiongrade.tech
- **Troubleshooting**: [Common issues](docs/troubleshooting.mdx)

### Resources

- **Migration Guide**: [migration.mdx](docs/migration.mdx) - Step-by-step migration from passwords
- **API Reference**: [api-reference.mdx](docs/api-reference.mdx) - Complete API documentation
- **React Guide**: [react-integration.mdx](docs/react-integration.mdx) - Frontend integration

## Roadmap

Future enhancements:
- Fastify adapter
- Vue.js composables
- Svelte stores
- MongoDB adapter
- MySQL/PostgreSQL adapters (non-Prisma)
- Enhanced audit logging

---

**Built by [ProductionGrade](https://productiongrade.tech)**

---

## Stay Ahead on Production grade Security, Engineering and AI Governance

I write weekly technical breakdowns for engineering leaders — covering security, infrastructure, and AI governance. No fluff. Just what works in production.

- **Join the newsletter** [https://newsletter.productiongrade.tech](https://newsletter.productiongrade.tech) for weekly guides + bonus resources
- **Follow me on Medium** [https://blog.productiongrade.tech](https://blog.productiongrade.tech) for deep-dive articles
