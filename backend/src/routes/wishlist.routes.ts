import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getWishlists,
  getWishlist,
  createWishlistHandler,
  updateWishlistHandler,
  deleteWishlistHandler,
  getAllGames,
} from '../controllers/wishlist.controller.js';
import { getGamesHandler, addGameHandler, refreshGamesHandler } from '../controllers/game.controller.js';

const router = Router();

// All wishlist routes require authentication
router.use(authenticate);

router.get('/', getWishlists);
router.get('/all-games', getAllGames);

// Wishlist-scoped game routes must come before :wishlistId to avoid being captured as the ID
router.get('/:wishlistId/games', getGamesHandler);
router.post('/:wishlistId/games', addGameHandler);
router.post('/:wishlistId/games/refresh', refreshGamesHandler);

router.get('/:wishlistId', getWishlist);
router.post('/', createWishlistHandler);
router.put('/:wishlistId', updateWishlistHandler);
router.delete('/:wishlistId', deleteWishlistHandler);

export default router;
