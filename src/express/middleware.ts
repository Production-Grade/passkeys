import type { Request, Response, NextFunction } from 'express';
import type { PasskeyError } from '../core/types/errors';

/**
 * Middleware to require authentication
 * Expects req.user to be set by your session middleware
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;

  if (!user) {
    res.status(401).json({
      type: 'https://productiongrade.dev/errors/UNAUTHORIZED',
      title: 'Unauthorized',
      status: 401,
      detail: 'Authentication required',
    });
    return;
  }

  next();
}

/**
 * Error handler middleware for PasskeyError instances
 * Converts errors to RFC 7807 Problem Details format
 */
export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Check if it's a PasskeyError
  if ('toProblemDetails' in error && typeof (error as any).toProblemDetails === 'function') {
    const problemDetails = (error as PasskeyError).toProblemDetails();
    res.status(problemDetails.status).json(problemDetails);
    return;
  }

  // Generic error
  res.status(500).json({
    type: 'https://productiongrade.dev/errors/INTERNAL_ERROR',
    title: 'Internal Server Error',
    status: 500,
    detail: error.message || 'An unexpected error occurred',
  });
}
