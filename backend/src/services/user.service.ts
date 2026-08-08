import { prisma } from "../config/prisma.js";
import { hashPassword, comparePassword } from "../utils/bcrypt.js";
import { signToken } from "../utils/jwt.js";
import { AppError } from "../middleware/error.middleware.js";

export interface CreateUserInput {
  username: string;
  password: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

/**
 * Register a new user and create their default wishlist.
 */
export const createUser = async (input: CreateUserInput): Promise<AuthResponse> => {
  const { username, password } = input;

  const trimmedUsername = username.trim();

  if (trimmedUsername.length < 3) {
    throw new AppError(400, "Username must be at least 3 characters.");
  }

  if (password.length < 6) {
    throw new AppError(400, "Password must be at least 6 characters.");
  }

  const existing = await prisma.user.findUnique({
    where: { username: trimmedUsername },
  });

  if (existing) {
    throw new AppError(409, "Username already taken.");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      username: trimmedUsername,
      passwordHash,
    },
  });

  await prisma.wishlist.create({
    data: {
      userId: user.id,
      name: "My Wishlist",
      isDefault: true,
    },
  });

  const token = signToken({ userId: user.id, username: user.username });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
    },
  };
};

/**
 * Authenticate a user and return a JWT.
 */
export const authenticateUser = async (input: LoginInput): Promise<AuthResponse> => {
  const { username, password } = input;

  const user = await prisma.user.findUnique({
    where: { username: username.trim() },
  });

  if (!user) {
    throw new AppError(401, "Invalid username or password.");
  }

  const valid = await comparePassword(password, user.passwordHash);

  if (!valid) {
    throw new AppError(401, "Invalid username or password.");
  }

  const token = signToken({ userId: user.id, username: user.username });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
    },
  };
};

/**
 * Get the public profile for a user by ID.
 */
export const getUserById = async (userId: string): Promise<AuthUser> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, "User not found.");
  }

  return {
    id: user.id,
    username: user.username,
  };
};
