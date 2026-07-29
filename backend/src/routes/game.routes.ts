import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getGamesHandler, addGameHandler, deleteGameHandler, moveGameHandler } from '../controllers/game.controller.js';

const router = Router();

// All game routes require authentication
router.use(authenticate);

// Wishlist-scoped game endpoints
router.get('/wishlists/:wishlistId/games', getGamesHandler);
router.post('/wishlists/:wishlistId/games', addGameHandler);

// Game endpoints (using composite key format: steamId+wishlistId)
router.delete('/games/:gameId', deleteGameHandler);
router.post('/games/:gameId/move', moveGameHandler);

export default router;
