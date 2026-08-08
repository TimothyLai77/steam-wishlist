/**
 * Minimal user data returned by login/register endpoints
 */
export interface AuthUser {
  id: string;
  username: string;
}

/**
 * Full User type matching the backend User model (from getProfile)
 */
export interface User extends AuthUser {
  steamId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Credentials for login
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Data for registration
 */
export interface RegisterCredentials {
  username: string;
  password: string;
}

/**
 * Response from login/register endpoints
 */
export interface AuthResponse {
  token: string;
  user: AuthUser;
}
