import type { Request, Response } from 'express';
import {
  getGamesByWishlistId,
  getGameDetail,
  addGameToWishlist,
  updateGameNotes,
  removeGameFromWishlist,
  moveGameToWishlist,
} from '../services/game.service.js';

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

export const getGameHandler = async (req: Request, res: Response) => {
  try {
    const wishlistId = req.params.wishlistId;
    const steamId = req.params.steamId;

    if (!wishlistId || Array.isArray(wishlistId) || !steamId || Array.isArray(steamId)) {
      return res.status(400).json({ message: 'Invalid parameters' });
    }

    const userId = req.user!.userId;
    const game = await getGameDetail(wishlistId, Number(steamId), userId);

    if (!game) {
      return res.status(404).json({ message: 'Game not found in wishlist' });
    }

    res.json(game);
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

export const updateGameHandler = async (req: Request, res: Response) => {
  try {
    const wishlistId = req.params.wishlistId;
    const steamId = req.params.steamId;
    const { notes } = req.body as { notes?: string };

    if (!wishlistId || Array.isArray(wishlistId) || !steamId || Array.isArray(steamId)) {
      return res.status(400).json({ message: 'Invalid parameters' });
    }

    const userId = req.user!.userId;
    const game = await updateGameNotes(wishlistId, Number(steamId), notes || null, userId);

    res.json(game);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Wishlist not found' || error.message === 'Game not found in wishlist') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteGameHandler = async (req: Request, res: Response) => {
  try {
    const wishlistId = req.params.wishlistId;
    const steamId = req.params.steamId;

    if (!wishlistId || Array.isArray(wishlistId) || !steamId || Array.isArray(steamId)) {
      return res.status(400).json({ message: 'Invalid parameters' });
    }

    const userId = req.user!.userId;
    await removeGameFromWishlist(wishlistId, Number(steamId), userId);

    res.json({ success: true });
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

export const moveGameHandler = async (req: Request, res: Response) => {
  try {
    const fromWishlistId = req.params.wishlistId;
    const steamId = req.params.steamId;
    const { wishlistId: toWishlistId } = req.body as { wishlistId: string };

    if (!fromWishlistId || Array.isArray(fromWishlistId) || !steamId || Array.isArray(steamId)) {
      return res.status(400).json({ message: 'Invalid parameters' });
    }

    if (!toWishlistId) {
      return res.status(400).json({ message: 'Target wishlistId is required' });
    }

    const userId = req.user!.userId;
    const game = await moveGameToWishlist(fromWishlistId, toWishlistId, Number(steamId), userId);

    res.json(game);
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === 'Source wishlist not found' ||
        error.message === 'Target wishlist not found' ||
        error.message === 'Game not found in source wishlist' ||
        error.message === 'Game already exists in target wishlist'
      ) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};
