import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getGamesHandler,
  getGameHandler,
  addGameHandler,
  updateGameHandler,
  deleteGameHandler,
  moveGameHandler,
} from '../controllers/game.controller.js';

const router = Router();

// All game routes require authentication
router.use(authenticate);

// Wishlist-scoped game endpoints
router.get('/wishlists/:wishlistId/games', getGamesHandler);
router.post('/wishlists/:wishlistId/games', addGameHandler);

// Single game endpoints (using composite ID: steamId+wishlistId)
router.get('/games/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;
    if (!gameId || Array.isArray(gameId)) {
      return res.status(400).json({ message: 'Invalid game ID' });
    }

    const [steamId, wishlistId] = gameId.split('+');
    if (!steamId || !wishlistId) {
      return res.status(400).json({ message: 'Invalid game ID format' });
    }
    const userId = req.user!.userId;

    const { getGameDetail } = await import('../services/game.service.js');
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
});

router.put('/games/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;
    if (!gameId || Array.isArray(gameId)) {
      return res.status(400).json({ message: 'Invalid game ID' });
    }

    const [steamId, wishlistId] = gameId.split('+');
    if (!steamId || !wishlistId) {
      return res.status(400).json({ message: 'Invalid game ID format' });
    }
    const { notes } = req.body as unknown as { notes?: string };
    const userId = req.user!.userId;

    const { updateGameNotes } = await import('../services/game.service.js');
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
});

router.delete('/games/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;
    if (!gameId || Array.isArray(gameId)) {
      return res.status(400).json({ message: 'Invalid game ID' });
    }

    const [steamId, wishlistId] = gameId.split('+');
    if (!steamId || !wishlistId) {
      return res.status(400).json({ message: 'Invalid game ID format' });
    }
    const userId = req.user!.userId;

    const { removeGameFromWishlist } = await import('../services/game.service.js');
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
});

router.put('/games/:gameId/move', async (req, res) => {
  try {
    const gameId = req.params.gameId;
    if (!gameId || Array.isArray(gameId)) {
      return res.status(400).json({ message: 'Invalid game ID' });
    }

    const [steamId, wishlistId] = gameId.split('+');
    if (!steamId || !wishlistId) {
      return res.status(400).json({ message: 'Invalid game ID format' });
    }
    const body = req.body as unknown as { wishlistId: string };
    const { wishlistId: toWishlistId } = body;
    const userId = req.user!.userId;

    if (!toWishlistId) {
      return res.status(400).json({ message: 'Target wishlistId is required' });
    }

    const { moveGameToWishlist } = await import('../services/game.service.js');
    const game = await moveGameToWishlist(wishlistId, toWishlistId, Number(steamId), userId);

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
});

export default router;
