import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error.middleware.js';
import { prisma } from '../config/prisma.js';
import { getGamesByWishlistId, addGameToWishlist, removeGameFromWishlist, moveGameToWishlist, refreshGamesInWishlist } from '../services/game.service.js';
import { getSalePeriods, getPriceAtDate, getPriceRange, getTrackingStartedAt } from '../services/price-history.service.js';

export const getGamesHandler = async (req: Request, res: Response) => {
  try {
    const wishlistId = req.params.wishlistId as string;
    const userId = req.user!.userId;

    if (!wishlistId) {
      return res.status(400).json({ message: 'Invalid wishlist ID' });
    }

    const games = await getGamesByWishlistId(wishlistId, userId);
    res.json(games);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Wishlist not found') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

export const addGameHandler = async (req: Request, res: Response) => {
  try {
    const wishlistId = req.params.wishlistId as string;
    const { steamId } = req.body as { steamId: string | number };

    if (!wishlistId) {
      return res.status(400).json({ message: 'Invalid wishlist ID' });
    }

    if (!steamId) {
      return res.status(400).json({ message: 'steamId is required' });
    }

    const userId = req.user!.userId;
    const result = await addGameToWishlist(wishlistId, Number(steamId), userId);

    res.status(201).json(result.game);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Wishlist not found') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteGameHandler = async (req: Request, res: Response) => {
  try {
    const gameId = req.params.gameId as string;

    if (!gameId) {
      return res.status(400).json({ message: 'Invalid game ID' });
    }

    const plusIndex = gameId.lastIndexOf('+');
    if (plusIndex === -1) {
      return res.status(400).json({ message: 'Invalid game ID format' });
    }

    const steamId = parseInt(gameId.substring(0, plusIndex), 10);
    const wishlistId = gameId.substring(plusIndex + 1);

    if (isNaN(steamId) || !wishlistId) {
      return res.status(400).json({ message: 'Invalid game ID format' });
    }

    const userId = req.user!.userId;
    await removeGameFromWishlist(wishlistId, steamId, userId);

    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Wishlist not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === 'Game not found in wishlist') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

export const moveGameHandler = async (req: Request, res: Response) => {
  try {
    const gameId = req.params.gameId as string;
    const { targetWishlistId } = req.body as { targetWishlistId?: string };

    if (!gameId) {
      return res.status(400).json({ message: 'Invalid game ID' });
    }

    if (!targetWishlistId) {
      return res.status(400).json({ message: 'targetWishlistId is required' });
    }

    const plusIndex = gameId.lastIndexOf('+');
    if (plusIndex === -1) {
      return res.status(400).json({ message: 'Invalid game ID format' });
    }

    const steamId = parseInt(gameId.substring(0, plusIndex), 10);
    const sourceWishlistId = gameId.substring(plusIndex + 1);

    if (isNaN(steamId) || !sourceWishlistId) {
      return res.status(400).json({ message: 'Invalid game ID format' });
    }

    const userId = req.user!.userId;
    const result = await moveGameToWishlist(sourceWishlistId, targetWishlistId, steamId, userId);

    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Source wishlist not found' || error.message === 'Target wishlist not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === 'Game not found in source wishlist') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === 'Source and target wishlists are the same') {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Parse an optional ISO 8601 date query parameter.
 *
 * @param value - Raw query parameter value (may be undefined, a non-string, or an empty string).
 * @param name - Parameter name, used in the 400 error message when invalid.
 * @returns The parsed `Date`, or `null` when the parameter is absent or empty.
 * @throws {AppError} 400 when the parameter is present but not a valid date.
 */
const parseDateParam = (value: unknown, name: string): Date | null => {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, `Invalid ${name} parameter: ${value}`);
  }

  return date;
};

/**
 * Serves the price history for a single game, keyed by Steam App ID.
 *
 * The `Game` row and its `PriceChangeLog` are global (shared across
 * wishlists and users), so this route keys on `steamId` alone — unlike the
 * delete/move routes, which key on the composite `steamId+wishlistId`
 * because those are per-wishlist operations.
 *
 * Query parameters select the shape of the response:
 * - none: `{ salePeriods, trackingStartedAt }` — all contiguous sale periods
 *   in chronological order (oldest first); the last entry has `end: null`
 *   when a sale is still ongoing. Empty array when the game has no logged
 *   price changes. `trackingStartedAt` is the timestamp of the earliest
 *   logged change (or `null` when the game has no price history), so clients
 *   can render "tracking started <date>" for lookups before that point.
 * - `date=<ISO 8601>`: `{ state }` — the effective price state at that
 *   point (the state established by the latest change at or before it).
 * - `from=<ISO 8601>&to=<ISO 8601>`: `{ state, constant }` — the state in
 *   effect at `to`, plus whether it held unchanged across the whole range.
 *
 * @param req - Request; `steamId` path param and optional `date` / `from` / `to` query params.
 * @param res - Express response; receives the JSON payload.
 * @param next - Express next-function; called with the error on failure.
 * @returns Resolves once the response has been sent (or the error forwarded).
 */
export const getPriceHistoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const steamId = Number(req.params.steamId);
    if (!Number.isInteger(steamId) || steamId <= 0) {
      throw new AppError(400, 'steamId must be a positive integer');
    }

    const query = req.query as Record<string, unknown>;
    const date = parseDateParam(query.date, 'date');
    const from = parseDateParam(query.from, 'from');
    const to = parseDateParam(query.to, 'to');

    if (date && (from || to)) {
      throw new AppError(400, 'date cannot be combined with from/to');
    }
    if (Boolean(from) !== Boolean(to)) {
      throw new AppError(400, 'from and to must be provided together');
    }
    if (from && to && from > to) {
      throw new AppError(400, 'from must be on or before to');
    }

    const game = await prisma.game.findUnique({
      where: { steamId },
      select: { steamId: true },
    });
    if (!game) {
      throw new AppError(404, 'Game not found');
    }

    if (date) {
      const state = await getPriceAtDate(steamId, date);
      if (!state) {
        throw new AppError(404, 'No price history at or before the requested date');
      }
      res.json({ state });
      return;
    }

    if (from && to) {
      const report = await getPriceRange(steamId, from, to);
      if (!report) {
        throw new AppError(404, 'No price history at or before the requested range');
      }
      res.json(report);
      return;
    }

    const [salePeriods, trackingStartedAt] = await Promise.all([
      getSalePeriods(steamId),
      getTrackingStartedAt(steamId),
    ]);
    res.json({ salePeriods, trackingStartedAt });
  } catch (err) {
    next(err);
  }
};

export const refreshGamesHandler = async (req: Request, res: Response) => {
  try {
    const wishlistId = req.params.wishlistId as string;
    const userId = req.user!.userId;

    if (!wishlistId) {
      return res.status(400).json({ message: 'Invalid wishlist ID' });
    }

    const result = await refreshGamesInWishlist(wishlistId, userId);
    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Wishlist not found') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};
