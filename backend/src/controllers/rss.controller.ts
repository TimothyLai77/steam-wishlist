import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error.middleware.js';
import { generateToken, validateToken, buildFeedXml } from '../services/rss.service.js';

/**
 * Issues (or rotates) the authenticated user's RSS token.
 *
 * The plaintext token is returned exactly once — only its SHA-256 hash is
 * stored server-side, so it cannot be recovered later.
 */
export const generateTokenHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req.user!;

    const result = await generateToken(userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Serves the RSS feed for a valid `?token=` query parameter.
 *
 * Responds with `401` when the token is missing or unknown, otherwise with
 * the generated RSS XML (RSS content type + short HTTP cache).
 */
export const getFeedHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { token } = req.query as { token?: unknown };

    if (typeof token !== 'string' || !token) {
      throw new AppError(401, 'Unauthorized: RSS token is required');
    }

    const user = await validateToken(token);
    if (!user) {
      throw new AppError(401, 'Unauthorized: Invalid RSS token');
    }

    const xml = await buildFeedXml(user.id);
    res
      .set('Content-Type', 'application/rss+xml; charset=utf-8')
      .set('Cache-Control', 'max-age=300')
      .send(xml);
  } catch (err) {
    next(err);
  }
};
