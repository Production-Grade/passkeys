# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-11-21

### 🚀 Next.js Adapter

Added comprehensive Next.js 14+ App Router integration for passkey authentication.

### Added

#### Next.js Adapter (`@productiongrade/passkeys/nextjs`)
- **`createNextPasskeys()`**: Factory function for Next.js route handlers with catch-all route support
- **Minimal Integration**: 10-20 lines of code for complete passkey authentication
- **Automatic Routing**: Single catch-all route handles all passkey endpoints
- **Management Endpoints**: Built-in GET, PATCH, DELETE handlers for passkey management
- **Type Safety**: Full TypeScript support with comprehensive JSDoc and IntelliSense
- **RFC 7807 Errors**: Standardized Problem Details error responses
- **rpId Validation**: Automatic hostname validation on first request
- **Storage Failure Handling**: Graceful 503 responses for storage unavailability

#### NextAuth Provider (`@productiongrade/passkeys/nextjs/provider`)
- **`PasskeyProvider()`**: NextAuth CredentialsProvider for seamless session integration
- **Automatic Sessions**: Creates NextAuth session on successful passkey authentication
- **Drop-in Integration**: Works alongside existing NextAuth providers
- **Coexistence**: Can be used with or without standalone routes

#### Configuration
- **`NextPasskeyConfig`**: Extends `PasskeyConfig` with `getUserId` callback for authenticated endpoints
- **`NextAuthPasskeyProviderConfig`**: Subset of config for NextAuth provider integration
- **Authentication Callback**: Optional `getUserId()` for management endpoint authentication

#### API Endpoints (via catch-all route)
- `POST /register/start` - Start passkey registration
- `POST /register/finish` - Complete passkey registration
- `POST /authenticate/start` - Start passkey authentication
- `POST /authenticate/finish` - Complete passkey authentication
- `GET /passkeys` - List user's passkeys (requires authentication)
- `PATCH /passkeys/:id` - Update passkey nickname (requires authentication)
- `DELETE /passkeys/:id` - Delete passkey (requires authentication, prevents deleting last passkey)
- `POST /recovery/generate` - Generate recovery codes (if recovery configured)
- `POST /recovery/verify` - Verify recovery code (if recovery configured)

#### Utilities
- `transformRequest()` - Convert Next.js Request to adapter format
- `errorToNextResponse()` - Convert errors to RFC 7807 Next.js responses
- `validateRpId()` - Validate rpId matches request hostname
- `resetRpIdValidation()` - Reset validation state (for testing)

#### Documentation
- Complete Next.js integration guide in `specs/002-nextjs-adapter/quickstart.md`
- Next.js section added to main README.md
- Pages Router migration guide in `docs/MIGRATION.md`
- Comprehensive API documentation in `docs/API.md`
- Multiple usage examples (standalone routes, NextAuth, management endpoints)

#### Types
- Full TypeScript definitions for all Next.js adapter components
- IntelliSense-optimized JSDoc comments
- Compile-time type safety with proper error detection
- Type inference for `getUserId` callback return values

### Package Updates
- Added Next.js 14+ and next-auth 4.24+ as optional peer dependencies
- Added `./nextjs` and `./nextjs/provider` to package exports
- Updated keywords to include "nextjs" and "next-auth"

## [1.0.0] - 2025-11-19

### 🎉 Initial Release

Production-ready passkey authentication library for Node.js applications with comprehensive WebAuthn support.

### Added

#### Core Features
- **WebAuthn Integration**: Full FIDO2/WebAuthn implementation using `@simplewebauthn/server`
- **Express.js Middleware**: Drop-in passkey authentication for Express applications
- **React Hooks**: Complete React integration with `usePasskeyRegistration`, `usePasskeyAuth`, and `usePasskeyManagement`
- **TypeScript Support**: Full type definitions and TypeScript-first development
- **Flexible Storage**: Pluggable storage architecture with multiple adapters

#### Services
- `PasskeyService`: Core passkey registration and authentication
- `ChallengeService`: WebAuthn challenge management with automatic expiration
- `RecoveryService`: Account recovery with recovery codes and email tokens

#### Storage Adapters
- `MemoryStorage`: In-memory storage for development and testing
- `MemoryChallengeStorage`: In-memory challenge storage
- `PrismaAdapter`: PostgreSQL integration via Prisma ORM
- `RedisChallengeStorage`: Redis-based ephemeral challenge storage

#### Security Features
- Counter anomaly detection for cloned credential prevention
- User verification support (required/preferred/discouraged)
- Credential backup state tracking
- Recovery code generation with bcrypt hashing
- Email-based recovery tokens with SHA-256 hashing
- Security hooks for monitoring and audit logging

#### Developer Experience
- Comprehensive error handling with RFC 7807 Problem Details
- Extensive validation utilities
- Base64url encoding/decoding helpers
- Input sanitization and security best practices
- Contract tests for storage implementations
- Example Express application with HTTPS setup

### Security
- Implements FIDO2/WebAuthn specifications
- Cryptographically secure random value generation
- Bcrypt for recovery code hashing
- SHA-256 for email recovery token hashing
- Replay attack prevention via challenge single-use
- Counter-based credential cloning detection

### Documentation
- Comprehensive README with quickstart guide
- API documentation for all public interfaces
- Storage adapter implementation guide
- Testing guide with multiple test strategies
- Security considerations and best practices
- TypeScript type definitions and JSDoc comments

### Dependencies
- `@simplewebauthn/server`: ^9.0.0 - WebAuthn server implementation
- `bcrypt`: ^5.1.1 - Password hashing for recovery codes

### Optional Peer Dependencies
- `express`: ^4.18.0 - For Express.js middleware
- `@prisma/client`: ^5.0.0 - For Prisma storage adapter
- `redis`: ^4.0.0 - For Redis challenge storage
- `react`: ^18.0.0 - For React hooks
- `@simplewebauthn/browser`: ^9.0.0 - For React hooks

### Development
- Jest testing framework with 151+ tests
- ESLint and Prettier for code quality
- TypeScript strict mode enabled
- Comprehensive unit, integration, and contract tests
- Example applications for testing and demonstration

[1.0.0]: https://github.com/Production-Grade/passkeys/releases/tag/v1.0.0

