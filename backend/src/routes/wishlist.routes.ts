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

const router = Router();

// All wishlist routes require authentication
router.use(authenticate);

router.get('/', getWishlists);
router.get('/all-games', getAllGames);
router.get('/:wishlistId', getWishlist);
router.post('/', createWishlistHandler);
router.put('/:wishlistId', updateWishlistHandler);
router.delete('/:wishlistId', deleteWishlistHandler);

export default router;
