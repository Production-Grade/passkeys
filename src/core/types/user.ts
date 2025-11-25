/**
 * User entity representing an account
 */
export interface User {
  /** Unique user identifier (UUID v4) */
  id: string;

  /** User email address (unique) */
  email: string;

  /** Timestamp when user was created */
  createdAt: Date;

  /** Timestamp when user was last updated */
  updatedAt: Date;
}

/**
 * User creation input
 */
export interface CreateUserInput {
  /** User email address */
  email: string;
}

/**
 * User update input
 */
export interface UpdateUserInput {
  /** Updated email address */
  email?: string;
}
