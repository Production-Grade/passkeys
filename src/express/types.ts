import type { Request } from 'express';
import type { User } from '../core/types/user';
import type { Passkey } from '../core/types/passkey';

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: User;
  passkey?: Passkey;
}

/**
 * Standard success response
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
}

/**
 * Registration start response
 */
export interface RegistrationStartResponse {
  options: any; // WebAuthn PublicKeyCredentialCreationOptions
  userId: string;
}

/**
 * Registration complete response
 */
export interface RegistrationCompleteResponse {
  verified: boolean;
  user: User;
  passkey: Passkey;
}

/**
 * Authentication start response
 */
export interface AuthenticationStartResponse {
  options: any; // WebAuthn PublicKeyCredentialRequestOptions
  userId?: string;
}

/**
 * Authentication complete response
 */
export interface AuthenticationCompleteResponse {
  verified: boolean;
  user: User;
  passkey: Passkey;
}

/**
 * Response transformer function type
 * Allows customizing the response shape for authentication endpoints
 */
export type ResponseTransformer<TInput = any, TOutput = any> = (
  data: TInput,
  req: Request
) => TOutput | Promise<TOutput>;
