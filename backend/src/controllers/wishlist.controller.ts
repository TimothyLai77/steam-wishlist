import type { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/error.middleware.js";
import {
  getWishlistsByUser,
  getWishlistById,
  createWishlist,
  updateWishlist,
  deleteWishlist,
  type CreateWishlistInput,
  type UpdateWishlistInput,
} from "../services/wishlist.service.js";

/**
 * Get all wishlists for the authenticated user.
 */
export const getWishlists = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.user!;
    const wishlists = await getWishlistsByUser(userId);
    res.json(wishlists);
  } catch (err) {
    next(err);
  }
};

/**
 * Get a single wishlist by ID (with games).
 */
export const getWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { wishlistId } = req.params;
    const { userId } = req.user!;

    if (!wishlistId || Array.isArray(wishlistId)) {
      throw new AppError(400, "Wishlist ID is required.");
    }

    const wishlist = await getWishlistById(wishlistId, userId);

    if (!wishlist) {
      throw new AppError(404, "Wishlist not found.");
    }

    res.json(wishlist);
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new wishlist.
 */
export const createWishlistHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.user!;
    const { name, description } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      throw new AppError(400, "Wishlist name is required.");
    }

    const input: CreateWishlistInput = {
      name,
      description,
    };

    const wishlist = await createWishlist(userId, input);
    res.status(201).json(wishlist);
  } catch (err) {
    next(err);
  }
};

/**
 * Update a wishlist.
 */
export const updateWishlistHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { wishlistId } = req.params;
    const { userId } = req.user!;
    const { name, description } = req.body;

    if (!wishlistId || Array.isArray(wishlistId)) {
      throw new AppError(400, "Wishlist ID is required.");
    }

    const input: UpdateWishlistInput = {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        throw new AppError(400, "Wishlist name must be a non-empty string.");
      }
      input.name = name;
    }
    if (description !== undefined) {
      input.description = description;
    }

    const wishlist = await updateWishlist(wishlistId, userId, input);

    if (!wishlist) {
      throw new AppError(404, "Wishlist not found.");
    }

    res.json(wishlist);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a wishlist.
 */
export const deleteWishlistHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { wishlistId } = req.params;
    const { userId } = req.user!;

    if (!wishlistId || Array.isArray(wishlistId)) {
      throw new AppError(400, "Wishlist ID is required.");
    }

    const result = await deleteWishlist(wishlistId, userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
