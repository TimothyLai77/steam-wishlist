import type { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/error.middleware.js";
import { createUser, authenticateUser, getUserById, updateUserSteamId } from "../services/user.service.js";

/**
 * Register a new user.
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    console.log("[REGISTER] Request received", { bodyKeys: Object.keys(req.body) });
    const { username, password } = req.body;

    if (!username || typeof username !== "string" || !username.trim()) {
      throw new AppError(400, "Username is required.");
    }

    if (!password || typeof password !== "string") {
      throw new AppError(400, "Password is required.");
    }

    console.log("[REGISTER] Calling createUser");
    const result = await createUser({ username, password });
    console.log("[REGISTER] createUser succeeded", { userId: result.user.id });

    res.status(201).json(result);
  } catch (err) {
    console.error("[REGISTER] Error", err);
    next(err);
  }
};

/**
 * Log in an existing user and return a JWT.
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || typeof username !== "string" || !username.trim()) {
      throw new AppError(400, "Username is required.");
    }

    if (!password || typeof password !== "string") {
      throw new AppError(400, "Password is required.");
    }

    const result = await authenticateUser({ username, password });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Get the current authenticated user's profile.
 */
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req.user!;

    const user = await getUserById(userId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

/**
 * Update the current user's profile.
 *
 * `PUT /api/auth/profile` with `{ steamId }` — a 17-digit string to save, or
 * null/empty to clear. Responds with the updated `{ user }`.
 */
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req.user!;
    const body = req.body as { steamId?: string | null } | undefined;
    const raw = body?.steamId;

    if (raw !== undefined && raw !== null && typeof raw !== "string") {
      throw new AppError(400, "steamId must be a string", "INVALID_STEAM_ID");
    }

    const steamId = raw === undefined || raw === null || raw.trim() === "" ? null : raw.trim();
    const user = await updateUserSteamId(userId, steamId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

