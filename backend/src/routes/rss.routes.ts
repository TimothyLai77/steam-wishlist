import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { generateTokenHandler, getFeedHandler } from '../controllers/rss.controller.js';

/**
 * Authenticated RSS management routes. Mounted at `/api/rss`
 * (e.g. `POST /api/rss/token`).
 */
const rssApiRoutes = Router();

rssApiRoutes.post('/token', authenticate, generateTokenHandler);

/**
 * Public RSS feed routes. Mounted at `/rss` and must be registered in
 * `index.ts` BEFORE the production SPA fallback, otherwise the fallback
 * swallows the route.
 */
const rssFeedRoutes = Router();

rssFeedRoutes.get('/', getFeedHandler);

export default rssApiRoutes;
export { rssFeedRoutes };
