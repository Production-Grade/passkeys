/**
 * Next.js Route Handler for Passkey Authentication
 *
 * Provides a catch-all route handler that handles all passkey endpoints
 */

import { PasskeyService } from '../core/services/PasskeyService';
import { ChallengeService } from '../core/services/ChallengeService';
import { RecoveryService } from '../core/services/RecoveryService';
import type {
  NextRequest,
  NextPasskeyConfig,
  RouteHandlerMethods,
  TransformedRequest,
  SuccessResponse,
} from './types';
import { transformRequest, errorToNextResponse, validateRpId } from './types';

// Import Next.js Response helper at runtime
let NextResponseClass: any;
try {
  const nextServer = require('next/server');
  NextResponseClass = nextServer.NextResponse;
} catch {
  // Next.js not installed - fallback Response wrapper
  NextResponseClass = class {
    static json(body: any, init?: any) {
      return new Response(JSON.stringify(body), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      });
    }
  };
}

/**
 * Create Next.js route handlers for passkey authentication
 *
 * @param config - Next.js passkey configuration
 * @returns Object with route handler methods (POST, GET, DELETE, PATCH)
 *
 * @example
 * ```typescript
 * // app/api/auth/passkeys/[[...passkey]]/route.ts
 * import { createNextPasskeys } from '@productiongrade/passkeys/nextjs';
 * import { storage } from '@/lib/storage';
 *
 * const { POST, GET, DELETE } = createNextPasskeys({
 *   rpId: 'example.com',
 *   rpName: 'My App',
 *   origin: 'https://example.com',
 *   storage,
 * });
 *
 * export { POST, GET, DELETE };
 * ```
 */
export function createNextPasskeys(config: NextPasskeyConfig): RouteHandlerMethods {
  // Initialize services
  const challengeStorage = config.challenges;
  const configWithChallenges = { ...config, challenges: challengeStorage };
  const passkeyService = new PasskeyService(config.storage, configWithChallenges as any);
  const challengeService = new ChallengeService(challengeStorage);
  const recoveryService = config.recovery
    ? new RecoveryService(config.storage, configWithChallenges as any)
    : undefined;

  /**
   * Route handler for POST requests
   * Handles: registration start/finish, authentication start/finish, recovery
   */
  const POST = async (request: NextRequest): Promise<any> => {
    try {
      // T025: Validate rpId on first request
      validateRpId(request, config);

      // T008: Transform request to extract data
      const transformed = await transformRequest(request, config);

      // T024: Parse pathname to route to correct handler
      const pathname = transformed.pathname;

      // Registration start endpoint
      if (pathname.endsWith('/register/start')) {
        return await handleRegisterStart(transformed, passkeyService, challengeService);
      }

      // Registration finish endpoint
      if (pathname.endsWith('/register/finish')) {
        return await handleRegisterFinish(transformed, passkeyService, challengeService);
      }

      // Authentication start endpoint
      if (pathname.endsWith('/authenticate/start')) {
        return await handleAuthenticateStart(transformed, passkeyService, challengeService);
      }

      // Authentication finish endpoint
      if (pathname.endsWith('/authenticate/finish')) {
        return await handleAuthenticateFinish(transformed, passkeyService, challengeService);
      }

      // Recovery endpoints (if recovery is configured)
      if (recoveryService) {
        if (pathname.endsWith('/recovery/generate')) {
          return await handleRecoveryGenerate(transformed, recoveryService);
        }
        if (pathname.endsWith('/recovery/verify')) {
          return await handleRecoveryVerify(transformed, recoveryService);
        }
      }

      // Unknown endpoint
      return NextResponseClass.json(
        {
          type: 'https://productiongrade.dev/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: `Unknown passkey endpoint: ${pathname}`,
          instance: pathname,
        },
        { status: 404 }
      );
    } catch (error) {
      // T026: Handle storage failures with 503
      if (isStorageError(error)) {
        return NextResponseClass.json(
          {
            type: 'https://productiongrade.dev/errors/storage-unavailable',
            title: 'Service Unavailable',
            status: 503,
            detail: 'Storage service is temporarily unavailable',
            instance: request.nextUrl.pathname,
          },
          { status: 503 }
        );
      }

      // T009: Convert other errors to Next.js Response
      return errorToNextResponse(error as Error, request.nextUrl.pathname);
    }
  };

  /**
   * Route handler for GET requests
   * Handles: list passkeys for authenticated user
   */
  const GET = async (request: NextRequest): Promise<any> => {
    try {
      validateRpId(request, config);
      const transformed = await transformRequest(request, config);

      // Check authentication via getUserId callback
      if (!transformed.userId) {
        return NextResponseClass.json(
          {
            type: 'https://productiongrade.dev/errors/unauthorized',
            title: 'Unauthorized',
            status: 401,
            detail: 'Authentication required to list passkeys',
            instance: transformed.pathname,
          },
          { status: 401 }
        );
      }

      // List passkeys endpoint
      if (
        transformed.pathname.endsWith('/passkeys') ||
        transformed.pathname.match(/\/passkeys\/?$/)
      ) {
        const passkeys = await config.storage.getUserPasskeys(transformed.userId);

        const response: SuccessResponse = {
          success: true,
          data: { passkeys },
        };

        return NextResponseClass.json(response, { status: 200 });
      }

      return NextResponseClass.json(
        {
          type: 'https://productiongrade.dev/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: `Unknown passkey endpoint: ${transformed.pathname}`,
          instance: transformed.pathname,
        },
        { status: 404 }
      );
    } catch (error) {
      if (isStorageError(error)) {
        return NextResponseClass.json(
          {
            type: 'https://productiongrade.dev/errors/storage-unavailable',
            title: 'Service Unavailable',
            status: 503,
            detail: 'Storage service is temporarily unavailable',
            instance: request.nextUrl.pathname,
          },
          { status: 503 }
        );
      }

      return errorToNextResponse(error as Error, request.nextUrl.pathname);
    }
  };

  /**
   * Route handler for DELETE requests
   * Handles: delete passkey
   */
  const DELETE = async (request: NextRequest): Promise<any> => {
    try {
      validateRpId(request, config);
      const transformed = await transformRequest(request, config);

      // Check authentication via getUserId callback
      if (!transformed.userId) {
        return NextResponseClass.json(
          {
            type: 'https://productiongrade.dev/errors/unauthorized',
            title: 'Unauthorized',
            status: 401,
            detail: 'Authentication required to delete passkeys',
            instance: transformed.pathname,
          },
          { status: 401 }
        );
      }

      // Extract passkey ID from pathname (e.g., /api/auth/passkeys/passkeys/123)
      const passkeyIdMatch = transformed.pathname.match(/\/passkeys\/([^/]+)$/);
      if (!passkeyIdMatch) {
        return NextResponseClass.json(
          {
            type: 'https://productiongrade.dev/errors/bad-request',
            title: 'Bad Request',
            status: 400,
            detail: 'Passkey ID is required',
            instance: transformed.pathname,
          },
          { status: 400 }
        );
      }

      const passkeyId = passkeyIdMatch[1]!;

      // Verify ownership
      const passkey = await config.storage.getPasskeyById(passkeyId);
      if (!passkey || passkey.userId !== transformed.userId) {
        return NextResponseClass.json(
          {
            type: 'https://productiongrade.dev/errors/forbidden',
            title: 'Forbidden',
            status: 403,
            detail: 'You can only delete your own passkeys',
            instance: transformed.pathname,
          },
          { status: 403 }
        );
      }

      // T049: Prevent deleting the last passkey
      const userPasskeys = await config.storage.getUserPasskeys(transformed.userId);
      if (userPasskeys.length <= 1) {
        return NextResponseClass.json(
          {
            type: 'https://productiongrade.dev/errors/validation-error',
            title: 'Validation Error',
            status: 400,
            detail:
              'Cannot delete your last passkey. Add another passkey before deleting this one.',
            instance: transformed.pathname,
          },
          { status: 400 }
        );
      }

      await config.storage.deletePasskey(passkeyId);

      const response: SuccessResponse = {
        success: true,
        data: { deleted: true },
      };

      return NextResponseClass.json(response, { status: 200 });
    } catch (error) {
      if (isStorageError(error)) {
        return NextResponseClass.json(
          {
            type: 'https://productiongrade.dev/errors/storage-unavailable',
            title: 'Service Unavailable',
            status: 503,
            detail: 'Storage service is temporarily unavailable',
            instance: request.nextUrl.pathname,
          },
          { status: 503 }
        );
      }

      return errorToNextResponse(error as Error, request.nextUrl.pathname);
    }
  };

  /**
   * Route handler for PATCH requests
   * Handles: update passkey (e.g., nickname)
   */
  const PATCH = async (request: NextRequest): Promise<any> => {
    try {
      validateRpId(request, config);
      const transformed = await transformRequest(request, config);

      // Check authentication via getUserId callback
      if (!transformed.userId) {
        return NextResponseClass.json(
          {
            type: 'https://productiongrade.dev/errors/unauthorized',
            title: 'Unauthorized',
            status: 401,
            detail: 'Authentication required to update passkeys',
            instance: transformed.pathname,
          },
          { status: 401 }
        );
      }

      // Extract passkey ID from pathname
      const passkeyIdMatch = transformed.pathname.match(/\/passkeys\/([^/]+)$/);
      if (!passkeyIdMatch) {
        return NextResponseClass.json(
          {
            type: 'https://productiongrade.dev/errors/bad-request',
            title: 'Bad Request',
            status: 400,
            detail: 'Passkey ID is required',
            instance: transformed.pathname,
          },
          { status: 400 }
        );
      }

      const passkeyId = passkeyIdMatch[1]!;

      // Verify ownership
      const passkey = await config.storage.getPasskeyById(passkeyId);
      if (!passkey || passkey.userId !== transformed.userId) {
        return NextResponseClass.json(
          {
            type: 'https://productiongrade.dev/errors/forbidden',
            title: 'Forbidden',
            status: 403,
            detail: 'You can only update your own passkeys',
            instance: transformed.pathname,
          },
          { status: 403 }
        );
      }

      // Update nickname (only field that can be updated)
      const { nickname } = transformed.body || {};
      const updated = await config.storage.updatePasskey(passkeyId, { nickname });

      const response: SuccessResponse = {
        success: true,
        data: { passkey: updated },
      };

      return NextResponseClass.json(response, { status: 200 });
    } catch (error) {
      if (isStorageError(error)) {
        return NextResponseClass.json(
          {
            type: 'https://productiongrade.dev/errors/storage-unavailable',
            title: 'Service Unavailable',
            status: 503,
            detail: 'Storage service is temporarily unavailable',
            instance: request.nextUrl.pathname,
          },
          { status: 503 }
        );
      }

      return errorToNextResponse(error as Error, request.nextUrl.pathname);
    }
  };

  return {
    POST,
    GET,
    DELETE,
    PATCH,
  };
}

// ===== Handler Functions =====

/**
 * T020: Handle POST /register/start
 */
async function handleRegisterStart(
  request: TransformedRequest,
  passkeyService: PasskeyService,
  challengeService: ChallengeService
): Promise<any> {
  const { email } = request.body || {};

  if (!email) {
    return NextResponseClass.json(
      {
        type: 'https://productiongrade.dev/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: 'Email is required',
        instance: request.pathname,
      },
      { status: 400 }
    );
  }

  // Generate registration options
  const { options, userId } = await passkeyService.generateRegistrationOptions(email);

  // Store challenge
  await challengeService.store(options.challenge, 'registration', userId, email);

  const response: SuccessResponse = {
    success: true,
    data: options,
  };

  return NextResponseClass.json({ ...response, userId }, { status: 200 });
}

/**
 * T021: Handle POST /register/finish
 */
async function handleRegisterFinish(
  request: TransformedRequest,
  passkeyService: PasskeyService,
  challengeService: ChallengeService
): Promise<any> {
  const { userId, credential, nickname } = request.body || {};

  if (!userId || !credential) {
    return NextResponseClass.json(
      {
        type: 'https://productiongrade.dev/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: 'userId and credential are required',
        instance: request.pathname,
      },
      { status: 400 }
    );
  }

  // Verify the challenge
  const challenge = await challengeService.verify(credential.response.clientDataJSON);

  // Verify registration
  const passkey = await passkeyService.verifyRegistration(
    credential,
    challenge.challenge,
    userId,
    nickname
  );

  // Delete the challenge after successful use
  await challengeService.delete(challenge.id);

  const response: SuccessResponse = {
    success: true,
    data: { passkey },
  };

  return NextResponseClass.json(response, { status: 200 });
}

/**
 * T022: Handle POST /authenticate/start
 */
async function handleAuthenticateStart(
  request: TransformedRequest,
  passkeyService: PasskeyService,
  challengeService: ChallengeService
): Promise<any> {
  const { email } = request.body || {};

  // Generate authentication options (email is optional for autofill UI)
  const { options, userId } = await passkeyService.generateAuthenticationOptions(email);

  // Store challenge
  await challengeService.store(options.challenge, 'authentication', userId, email);

  const response: SuccessResponse = {
    success: true,
    data: options,
  };

  return NextResponseClass.json(response, { status: 200 });
}

/**
 * T023: Handle POST /authenticate/finish
 */
async function handleAuthenticateFinish(
  request: TransformedRequest,
  passkeyService: PasskeyService,
  challengeService: ChallengeService
): Promise<any> {
  const { credential } = request.body || {};

  if (!credential) {
    return NextResponseClass.json(
      {
        type: 'https://productiongrade.dev/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: 'credential is required',
        instance: request.pathname,
      },
      { status: 400 }
    );
  }

  // Verify the challenge
  const challenge = await challengeService.verify(credential.response.clientDataJSON);

  // Verify authentication
  const { userId, passkey } = await passkeyService.verifyAuthentication(
    credential,
    challenge.challenge
  );

  // Get user information
  const user = await passkeyService['storage'].getUserById(userId);

  // Delete the challenge after successful use
  await challengeService.delete(challenge.id);

  const response: SuccessResponse = {
    success: true,
    data: { user, passkey },
  };

  return NextResponseClass.json(response, { status: 200 });
}

/**
 * Handle POST /recovery/generate
 */
async function handleRecoveryGenerate(
  request: TransformedRequest,
  recoveryService: RecoveryService
): Promise<any> {
  const { userId } = request.body || {};

  if (!userId) {
    return NextResponseClass.json(
      {
        type: 'https://productiongrade.dev/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: 'userId is required',
        instance: request.pathname,
      },
      { status: 400 }
    );
  }

  const recoveryCodes = await recoveryService.generateRecoveryCodes(userId);

  const response: SuccessResponse = {
    success: true,
    data: { recoveryCodes },
  };

  return NextResponseClass.json(response, { status: 200 });
}

/**
 * Handle POST /recovery/verify
 */
async function handleRecoveryVerify(
  request: TransformedRequest,
  recoveryService: RecoveryService
): Promise<any> {
  const { userId, recoveryCode } = request.body || {};

  if (!userId || !recoveryCode) {
    return NextResponseClass.json(
      {
        type: 'https://productiongrade.dev/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: 'userId and recoveryCode are required',
        instance: request.pathname,
      },
      { status: 400 }
    );
  }

  const valid = await recoveryService.verifyRecoveryCode(userId, recoveryCode);

  const response: SuccessResponse = {
    success: true,
    data: { valid },
  };

  return NextResponseClass.json(response, { status: 200 });
}

/**
 * Check if error is a storage-related error
 */
function isStorageError(error: any): boolean {
  // Check for common storage error patterns
  if (!error) return false;

  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toLowerCase() || '';

  return (
    message.includes('storage') ||
    message.includes('database') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    code.includes('econnrefused') ||
    code.includes('etimedout') ||
    code.includes('enotfound')
  );
}
