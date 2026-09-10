import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { deleteGameHandler, moveGameHandler, getPriceHistoryHandler } from '../controllers/game.controller.js';

/**
 * Routes for everything mounted under `/api/games/*` (mounted at `/api` in
 * `index.ts`). The file is organized by URL prefix, not by domain model,
 * and hosts two families of routes distinguished by their keying:
 *
 * - Per-wishlist `WishlistGame` operations (delete/move): `:gameId` is the
 *   composite `steamId+wishlistId`, since they act on a game *within one
 *   specific wishlist*.
 * - Global `Game` queries (price history): keyed on `steamId` alone, since
 *   the `Game` row and its price log are shared across all wishlists/users.
 *
 * Related: the other per-wishlist game routes (list/add/refresh) live in
 * `wishlist.routes.ts` under `/api/wishlists/:wishlistId/games` — a nested
 * URL layout, inconsistent with the composite-key format here.
 */
const router = Router();

// All game routes require authentication
router.use(authenticate);

// Game endpoints (using composite key format: steamId+wishlistId)
// These routes pertain to the concept of a game in a wishlist. i.e. 'WishlistGame' in the database.
router.delete('/games/:gameId', deleteGameHandler);
router.post('/games/:gameId/move', moveGameHandler);

// Price history is per *game* (the Game row and its log are global, shared
// across wishlists/users), so it keys on steamId alone rather than the
// composite steamId+wishlistId used by the per-wishlist routes above.
router.get('/games/:steamId/price-history', getPriceHistoryHandler);

export default router;
