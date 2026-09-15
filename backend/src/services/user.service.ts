import { prisma } from "../config/prisma.js";
import { hashPassword, comparePassword } from "../utils/bcrypt.js";
import { signToken } from "../utils/jwt.js";
import { AppError } from "../middleware/error.middleware.js";
import { isValidSteamId64 } from "./steam.service.js";

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
  steamId: string | null;
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
      steamId: user.steamId,
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
      steamId: user.steamId,
    },
  };
};

/**
 * Get the public profile for a user by ID.
 */
export const getUserById = async (userId: string): Promise<AuthUser> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      steamId: true,
    },
  });

  if (!user) {
    throw new AppError(404, "User not found.");
  }

  return user;
};

/**
 * Saves (or clears) the user's SteamID64.
 *
 * @param userId - The authenticated user.
 * @param steamId - A 17-digit SteamID64, or `null` to clear the saved value.
 * @returns The updated profile (`id`, `username`, `steamId`).
 * @throws {AppError} 404 when the user does not exist; 400 INVALID_STEAM_ID
 *   when `steamId` is present but not 17 digits.
 */
export const updateUserSteamId = async (
  userId: string,
  steamId: string | null,
): Promise<AuthUser> => {
  if (steamId !== null && !isValidSteamId64(steamId)) {
    throw new AppError(400, 'Steam ID must be a 17-digit SteamID64', 'INVALID_STEAM_ID');
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { steamId },
      select: {
        id: true,
        username: true,
        steamId: true,
      },
    });
    return user;
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as { code?: string }).code === 'P2025') {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }
    throw err;
  }
};
