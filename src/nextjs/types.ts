/**
 * Next.js Adapter Type Definitions
 *
 * Note: This file uses `any` types for Next.js imports to allow building
 * without Next.js installed (since it's a peer dependency).
 * When Next.js is installed, TypeScript will properly type-check these imports.
 */

import type { PasskeyConfig } from '../core/types/config';
import type { ChallengeStorage } from '../core/types/storage';

// Next.js types - will be properly typed when Next.js is installed
// Using any for build compatibility when peer dependency is not installed
export type NextRequest = any;
export type NextResponse = any;

/**
 * Next.js-specific passkey configuration
 *
 * Extends the base PasskeyConfig with Next.js-specific options like the `getUserId`
 * callback for authenticated management endpoints.
 *
 * @example
 * Basic configuration with Prisma storage
 * ```typescript
 * import { PrismaAdapter } from '@productiongrade/passkeys/adapters/prisma';
 *
 * const config: NextPasskeyConfig = {
 *   rpId: 'example.com',
 *   rpName: 'My App',
 *   origin: 'https://example.com',
 *   storage: new PrismaAdapter(prisma),
 * };
 * ```
 *
 * @example
 * With getUserId for management endpoints
 * ```typescript
 * import { getServerSession } from 'next-auth';
 *
 * const config: NextPasskeyConfig = {
 *   rpId: 'example.com',
 *   rpName: 'My App',
 *   origin: 'https://example.com',
 *   storage: new PrismaAdapter(prisma),
 *   getUserId: async (request) => {
 *     const session = await getServerSession();
 *     return session?.user?.id ?? null;
 *   },
 * };
 * ```
 *
 * @example
 * With Redis challenge storage and recovery codes
 * ```typescript
 * import { RedisChallengeStorage } from '@productiongrade/passkeys/adapters/redis';
 *
 * const config: NextPasskeyConfig = {
 *   rpId: 'example.com',
 *   rpName: 'My App',
 *   origin: 'https://example.com',
 *   storage: new PrismaAdapter(prisma),
 *   challengeStorage: new RedisChallengeStorage(redisClient),
 *   recovery: {
 *     codeCount: 10,
 *     codeLength: 8,
 *   },
 * };
 * ```
 */
export interface NextPasskeyConfig extends Omit<PasskeyConfig, 'challenges'> {
  /**
   * Challenge storage implementation (required)
   * Use RedisChallengeStorage for production or createMockChallengeStorage() for testing
   */
  challenges: ChallengeStorage;

  /**
   * Optional callback to extract authenticated user ID from Next.js request.
   * Used for passkey management endpoints (list, update, delete).
   *
   * @param request - Next.js Request object
   * @returns User ID string if authenticated, null if not authenticated
   *
   * @example
   * // With NextAuth
   * getUserId: async (request) => {
   *   const session = await getServerSession();
   *   return session?.user?.id ?? null;
   * }
   *
   * @example
   * // With custom JWT
   * getUserId: (request) => {
   *   const token = request.headers.get('authorization')?.split(' ')[1];
   *   if (!token) return null;
   *   const payload = jwt.verify(token, SECRET);
   *   return payload.userId;
   * }
   */
  getUserId?: (request: NextRequest) => Promise<string | null> | string | null;
}

/**
 * Route handler method signature matching Next.js App Router
 */
export type RouteHandlerMethod = (
  request: NextRequest,
  context?: { params: Record<string, string | string[]> }
) => Promise<NextResponse>;

/**
 * Object containing route handler methods returned by createNextPasskeys()
 */
export interface RouteHandlerMethods {
  GET?: RouteHandlerMethod;
  POST: RouteHandlerMethod;
  DELETE?: RouteHandlerMethod;
  PATCH?: RouteHandlerMethod;
}

/**
 * Configuration for NextAuth provider
 * Subset of NextPasskeyConfig (no getUserId needed for provider)
 */
export interface NextAuthPasskeyProviderConfig {
  storage: PasskeyConfig['storage'];
  challenges: ChallengeStorage;
  rpId: string;
  rpName: string;
  origin: string;
  recovery?: PasskeyConfig['recovery'];
  hooks?: PasskeyConfig['hooks'];
}

/**
 * Transformed request data extracted from Next.js Request
 */
export interface TransformedRequest {
  body: any;
  pathname: string;
  origin: string;
  method: string;
  userId?: string | null;
}

/**
 * RFC 7807 Problem Details error response
 */
export interface ErrorResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
}

/**
 * Success response wrapper
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
}

// Re-export core types for convenience
export type { User } from '../core/types/user';
export type { Passkey } from '../core/types/passkey';
export type { PasskeyStorage, ChallengeStorage } from '../core/types/storage';
export type { PasskeyConfig, RecoveryConfig, SecurityHooks } from '../core/types/config';

/**
 * Transform Next.js Request to extracted data for core services
 *
 * @param request - Next.js Request object
 * @param config - Adapter configuration
 * @returns Transformed request data
 */
export async function transformRequest(
  request: NextRequest,
  config: NextPasskeyConfig
): Promise<TransformedRequest> {
  let body: any = undefined;

  // Parse JSON body for POST/PATCH requests
  if (request.method !== 'GET' && request.method !== 'DELETE') {
    try {
      body = await request.json();
    } catch (_error) {
      // If JSON parsing fails, body remains undefined
      // The handler will return 400 Bad Request
    }
  }

  // Extract userId from getUserId callback if provided
  const userId = config.getUserId ? await config.getUserId(request) : null;

  return {
    body,
    pathname: request.nextUrl.pathname,
    origin: request.nextUrl.origin,
    method: request.method,
    userId,
  };
}

/**
 * Convert error to Next.js Response with RFC 7807 Problem Details format
 *
 * @param error - Error object
 * @param pathname - Request pathname for instance field
 * @returns NextResponse with error details
 */
export function errorToNextResponse(error: Error, pathname?: string): NextResponse {
  // Dynamically require NextResponse at runtime
  let NextResponseClass: any;
  try {
    NextResponseClass = require('next/server').NextResponse;
  } catch {
    // Fallback if Next.js not installed
    NextResponseClass = class {
      static json(body: any, init?: any) {
        return new Response(JSON.stringify(body), {
          ...init,
          headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
        });
      }
    };
  }

  // Import PasskeyError type dynamically to avoid circular deps
  const PasskeyError = error as any;

  // Check if it's a PasskeyError (has statusCode and code properties)
  if ('statusCode' in PasskeyError && 'code' in PasskeyError) {
    const errorResponse: ErrorResponse = {
      type: `https://productiongrade.dev/errors/${PasskeyError.code.toLowerCase().replace(/_/g, '-')}`,
      title: error.name,
      status: PasskeyError.statusCode,
      detail: error.message,
    };

    if (pathname) {
      errorResponse.instance = pathname;
    }

    return NextResponseClass.json(errorResponse, { status: PasskeyError.statusCode });
  }

  // Generic 500 for unknown errors
  const errorResponse: ErrorResponse = {
    type: 'https://productiongrade.dev/errors/internal-error',
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unexpected error occurred',
  };

  if (pathname) {
    errorResponse.instance = pathname;
  }

  return NextResponseClass.json(errorResponse, { status: 500 });
}

/**
 * Module-level state for rpId validation
 * Tracks whether rpId has been validated (one-time check)
 */
let rpIdValidated = false;

/**
 * Validate that configured rpId matches request hostname
 * Only validates once per process (lazy validation on first request)
 *
 * @param request - Next.js Request object
 * @param config - Adapter configuration
 * @throws Error if rpId doesn't match hostname
 */
export function validateRpId(request: NextRequest, config: NextPasskeyConfig): void {
  // Skip if already validated
  if (rpIdValidated) return;

  const origin = request.nextUrl.origin;
  const hostname = new URL(origin).hostname;

  // Allow localhost for development
  if (config.rpId === 'localhost' && hostname === 'localhost') {
    rpIdValidated = true;
    return;
  }

  // Check if rpId matches hostname
  if (config.rpId !== hostname) {
    throw new Error(
      `rpId mismatch: configured '${config.rpId}' but request hostname is '${hostname}'. ` +
        `Update rpId in config to match your deployment domain.`
    );
  }

  rpIdValidated = true;
}

/**
 * Reset rpId validation state (for testing purposes)
 * @internal
 */
export function resetRpIdValidation(): void {
  rpIdValidated = false;
}
