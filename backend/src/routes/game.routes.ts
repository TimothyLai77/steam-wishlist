import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { deleteGameHandler, moveGameHandler } from '../controllers/game.controller.js';

const router = Router();

// All game routes require authentication
router.use(authenticate);

// Game endpoints (using composite key format: steamId+wishlistId)
router.delete('/games/:gameId', deleteGameHandler);
router.post('/games/:gameId/move', moveGameHandler);

export default router;
