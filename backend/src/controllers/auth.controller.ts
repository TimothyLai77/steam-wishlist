import type { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/error.middleware.js";
import { createUser, authenticateUser, getUserById } from "../services/user.service.js";

/**
 * Register a new user.
 */
export const register = async (
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

    const result = await createUser({ username, password });

    res.status(201).json(result);
  } catch (err) {
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
export const getMe = async (
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

