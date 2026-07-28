import type { Request, Response } from 'express';
import { getGamesByWishlistId, addGameToWishlist } from '../services/game.service.js';

export const getGamesHandler = async (req: Request, res: Response) => {
  try {
    const wishlistId = req.params.wishlistId;
    const userId = req.user!.userId;

    if (!wishlistId || Array.isArray(wishlistId)) {
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
    const wishlistId = req.params.wishlistId;
    const { steamId } = req.body as { steamId: string | number };

    if (!wishlistId || Array.isArray(wishlistId)) {
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
