import type { Request, Response } from 'express';
import { getGamesByWishlistId, addGameToWishlist, removeGameFromWishlist, moveGameToWishlist, refreshGamesInWishlist } from '../services/game.service.js';

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
