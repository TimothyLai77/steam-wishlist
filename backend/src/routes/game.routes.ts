import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getGamesHandler, addGameHandler } from '../controllers/game.controller.js';

const router = Router();

// All game routes require authentication
router.use(authenticate);

// Wishlist-scoped game endpoints
router.get('/wishlists/:wishlistId/games', getGamesHandler);
router.post('/wishlists/:wishlistId/games', addGameHandler);

export default router;
