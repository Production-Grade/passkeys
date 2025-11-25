/**
 * Next.js Adapter for @productiongrade/passkeys
 *
 * Provides seamless integration with Next.js 14+ App Router for passkey authentication.
 * This adapter wraps the core @productiongrade/passkeys library with Next.js-specific routing,
 * request/response handling, and optional NextAuth integration.
 *
 * ## Features
 *
 * - **Minimal Setup**: Integrate passkeys with 10-20 lines of code
 * - **App Router Compatible**: Built for Next.js 14+ App Router with catch-all routes
 * - **NextAuth Integration**: Optional `PasskeyProvider` for seamless session management
 * - **Type-Safe**: Full TypeScript support with IntelliSense
 * - **Production Ready**: RFC 7807 error handling, rpId validation, storage failure handling
 *
 * ## Quick Start
 *
 * ### Standalone Routes
 *
 * ```typescript
 * // app/api/auth/passkeys/[[...passkey]]/route.ts
 * import { createNextPasskeys } from '@productiongrade/passkeys/nextjs';
 * import { PrismaAdapter } from '@productiongrade/passkeys/adapters/prisma';
 * import { prisma } from '@/lib/prisma';
 *
 * const { POST, GET, DELETE, PATCH } = createNextPasskeys({
 *   rpId: process.env.NEXT_PUBLIC_RP_ID!,
 *   rpName: 'My App',
 *   origin: process.env.NEXT_PUBLIC_APP_URL!,
 *   storage: new PrismaAdapter(prisma),
 * });
 *
 * export { POST, GET, DELETE, PATCH };
 * ```
 *
 * ### With NextAuth
 *
 * ```typescript
 * // app/api/auth/[...nextauth]/route.ts
 * import NextAuth from 'next-auth';
 * import { PasskeyProvider } from '@productiongrade/passkeys/nextjs/provider';
 * import { storage } from '@/lib/storage';
 *
 * const handler = NextAuth({
 *   providers: [
 *     PasskeyProvider({
 *       rpId: process.env.NEXT_PUBLIC_RP_ID!,
 *       rpName: 'My App',
 *       origin: process.env.NEXT_PUBLIC_APP_URL!,
 *       storage,
 *     }),
 *   ],
 * });
 *
 * export { handler as GET, handler as POST };
 * ```
 *
 * ## API Reference
 *
 * ### Main Exports
 *
 * - `createNextPasskeys()` - Factory function to create route handlers
 * - `PasskeyProvider()` - NextAuth credentials provider (import from `/nextjs/provider`)
 *
 * ### Type Exports
 *
 * - `NextPasskeyConfig` - Configuration for Next.js adapter
 * - `NextAuthPasskeyProviderConfig` - Configuration for NextAuth provider
 * - `RouteHandlerMethods` - Return type of createNextPasskeys()
 * - Core types: `User`, `Passkey`, `PasskeyStorage`, etc.
 *
 * ### Utility Exports
 *
 * - `transformRequest()` - Convert Next.js Request to adapter format
 * - `errorToNextResponse()` - Convert errors to RFC 7807 responses
 * - `validateRpId()` - Validate rpId matches request hostname
 *
 * @packageDocumentation
 * @module @productiongrade/passkeys/nextjs
 */

// Export main factory function
export { createNextPasskeys } from './route-handler';

// Export all types
export type {
  /**
   * Configuration interface for Next.js passkey adapter
   * Extends PasskeyConfig with Next.js-specific options
   * @see {@link NextPasskeyConfig}
   */
  NextPasskeyConfig,

  /**
   * Configuration interface for NextAuth passkey provider
   * Subset of NextPasskeyConfig (no getUserId needed)
   * @see {@link NextAuthPasskeyProviderConfig}
   */
  NextAuthPasskeyProviderConfig,

  /**
   * Next.js route handler method signature
   * @see {@link RouteHandlerMethod}
   */
  RouteHandlerMethod,

  /**
   * Object containing route handler methods returned by createNextPasskeys()
   * @see {@link RouteHandlerMethods}
   */
  RouteHandlerMethods,

  /**
   * Transformed request data extracted from Next.js Request
   * @see {@link TransformedRequest}
   */
  TransformedRequest,

  /**
   * RFC 7807 Problem Details error response format
   * @see {@link ErrorResponse}
   */
  ErrorResponse,

  /**
   * Success response wrapper
   * @see {@link SuccessResponse}
   */
  SuccessResponse,
} from './types';

// Re-export core types for convenience
export type {
  /**
   * User entity representing an authenticated user
   */
  User,

  /**
   * Passkey credential entity
   */
  Passkey,

  /**
   * Core passkey configuration interface
   */
  PasskeyConfig,

  /**
   * Storage adapter interface for persisting users and passkeys
   */
  PasskeyStorage,

  /**
   * Storage adapter interface for WebAuthn challenges
   */
  ChallengeStorage,

  /**
   * Configuration for recovery code functionality
   */
  RecoveryConfig,

  /**
   * Security hook callbacks for lifecycle events
   */
  SecurityHooks,
} from './types';

// Export utility functions (useful for custom implementations)
export {
  /**
   * Transform Next.js Request to extracted data for core services
   * Useful when building custom route handlers
   */
  transformRequest,

  /**
   * Convert error to Next.js Response with RFC 7807 Problem Details format
   * Useful for consistent error handling in custom endpoints
   */
  errorToNextResponse,

  /**
   * Validate that configured rpId matches request hostname
   * Only validates once per process (lazy validation)
   */
  validateRpId,

  /**
   * Reset rpId validation state
   * @internal Used for testing purposes only
   */
  resetRpIdValidation,
} from './types';
