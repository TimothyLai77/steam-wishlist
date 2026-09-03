import { createHash, randomBytes } from 'node:crypto';

import { Feed } from 'feed';

import { prisma } from '../config/prisma.js';
import { getRssCache, setRssCache } from './rss-cache.js';

/** Days of price changes included in the feed (matches the log retention window). */
const FEED_WINDOW_DAYS = 30;

/** Maximum number of items per feed. */
const MAX_FEED_ITEMS = 50;

const FEED_TITLE = 'Steam Wishlist Price Updates';
const FEED_DESCRIPTION = 'Recent price changes for the games on your Steam wishlists.';

/** Placeholder for a missing price in titles/descriptions. */
const UNKNOWN_PRICE = '—';

/**
 * Base URL of the app (env `APP_URL`), used for the feed link and the
 * `feedUrl` returned to users. Trailing slashes are stripped so URLs
 * compose cleanly.
 *
 * @returns The normalized app base URL.
 */
const getAppUrl = (): string => (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/+$/, '');

/**
 * Computes the SHA-256 hash of a value as a lowercase hex string.
 *
 * @param value - The plaintext value to hash (an RSS token).
 * @returns The hex-encoded SHA-256 digest.
 */
const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

/**
 * Formats a numeric price using the game's currency code (e.g. `USD` → `$60.00`).
 *
 * @param value - The price amount.
 * @param currency - ISO 4217 currency code from the `Game` row.
 * @returns A locale-formatted price string.
 */
const formatPrice = (value: number, currency: string): string => {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(value);
  } catch {
    // Fall back to a plain "CODE 0.00" rendering if the currency code is invalid.
    return `${currency} ${value.toFixed(2)}`;
  }
};

/**
 * Formats a possibly-null price for display.
 *
 * @param price - The price, or null when unknown.
 * @param currency - ISO 4217 currency code from the `Game` row.
 * @returns The formatted price, or a dash when the price is null.
 */
const formatPriceOrUnknown = (price: number | null, currency: string): string =>
  price === null ? UNKNOWN_PRICE : formatPrice(price, currency);

/**
 * Builds the title for one feed item, e.g. `Game Name: $60.00 → $30.00 (-50%)`.
 * The discount suffix is only appended when the new discount is known.
 *
 * @param name - The game's name.
 * @param oldPrice - Price before the change, or null when unknown.
 * @param newPrice - Price after the change, or null when unknown.
 * @param newDiscount - Discount percent after the change, or null when none.
 * @param currency - ISO 4217 currency code from the `Game` row.
 * @returns The feed item title.
 */
const buildItemTitle = (
  name: string,
  oldPrice: number | null,
  newPrice: number | null,
  newDiscount: number | null,
  currency: string,
): string => {
  let title = `${name}: ${formatPriceOrUnknown(oldPrice, currency)} → ${formatPriceOrUnknown(newPrice, currency)}`;
  if (newDiscount !== null) {
    title += ` (-${newDiscount}%)`;
  }
  return title;
};

/**
 * Determines whether a price change is a drop worth notifying about: the new
 * price must be known and either lower than the old price, or the first known
 * price (old price was null).
 *
 * `currentPrice` stores Steam's final (post-discount) price, so a discount
 * appearing or deepening always shows up as a price drop — no separate
 * discount check is needed.
 *
 * Acts as a type guard: a drop always has a known new price.
 *
 * @param entry - An entry containing the old/new price pair from one `PriceChangeLog` row.
 * @returns True when the change should appear in the feed.
 */
const isPriceDrop = <T extends { oldPrice: number | null; newPrice: number | null }>(
  entry: T,
): entry is T & { newPrice: number } =>
  entry.newPrice !== null && (entry.oldPrice === null || entry.newPrice < entry.oldPrice);

/**
 * Builds the description for one feed item, e.g.
 * `Dropped from $60.00 to $30.00 (50% off). In your wishlists: A, B.`
 *
 * Only called for downward changes (see `isPriceDrop`); when the old price was
 * unknown, the description reads `Price changed to ...` instead.
 *
 * @param oldPrice - Price before the change, or null when unknown.
 * @param newPrice - Price after the change (always known for feed items).
 * @param newDiscount - Discount percent after the change, or null when none.
 * @param currency - ISO 4217 currency code from the `Game` row.
 * @param wishlistNames - Names of the user's wishlists containing the game.
 * @returns The description text for the feed item.
 */
const buildItemDescription = (
  oldPrice: number | null,
  newPrice: number,
  newDiscount: number | null,
  currency: string,
  wishlistNames: string[],
): string => {
  let description =
    oldPrice === null
      ? `Price changed to ${formatPrice(newPrice, currency)}`
      : `Dropped from ${formatPrice(oldPrice, currency)} to ${formatPrice(newPrice, currency)}`;

  if (newDiscount !== null) {
    description += ` (${newDiscount}% off)`;
  }
  description += '.';

  if (wishlistNames.length > 0) {
    description += ` In your wishlists: ${wishlistNames.join(', ')}.`;
  }

  return description;
};

export interface RssTokenResult {
  /** The plaintext RSS token, shown to the user exactly once. */
  token: string;
  /** The full feed URL for the user to subscribe with. */
  feedUrl: string;
}

export interface RssUser {
  id: string;
  username: string;
}

/**
 * Generates a new opaque RSS token for a user, storing only its SHA-256 hash.
 * Issuing a new token overwrites the stored hash, which invalidates any
 * previously issued token (rotation).
 *
 * @param userId - The user to issue the token for.
 * @returns The plaintext token (returned once) and the full feed URL.
 * @throws When no user exists with the given id.
 */
export const generateToken = async (userId: string): Promise<RssTokenResult> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new Error('User not found');
  }

  const token = randomBytes(32).toString('hex');

  await prisma.user.update({
    where: { id: userId },
    data: { rssTokenHash: sha256(token) },
  });

  return {
    token,
    feedUrl: `${getAppUrl()}/rss?token=${token}`,
  };
};

/**
 * Validates an RSS token by matching its SHA-256 hash against stored hashes.
 *
 * @param token - The plaintext token (from the `?token=` query parameter).
 * @returns The user the token belongs to, or null when the token is empty or unknown.
 */
export const validateToken = async (token: string): Promise<RssUser | null> => {
  if (!token) {
    return null;
  }

  return prisma.user.findUnique({
    where: { rssTokenHash: sha256(token) },
    select: { id: true, username: true },
  });
};

/**
 * Returns the RSS XML for a user's price-change feed, using the in-memory
 * cache (Task 5) so the feed is not regenerated within the TTL.
 *
 * The feed shows price drops from the last 30 days for games in at least one
 * of the user's wishlists, newest first. Up to 50 recent changes are fetched
 * and price increases are filtered out before rendering, so the feed may
 * contain fewer than 50 items.
 *
 * @param userId - The user whose feed is requested.
 * @returns The generated RSS 2.0 XML document.
 */
export const buildFeedXml = async (userId: string): Promise<string> => {
  const cached = getRssCache(userId);
  if (cached !== undefined) {
    return cached;
  }

  const since = new Date(Date.now() - FEED_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const changes = await prisma.priceChangeLog.findMany({
    where: {
      timestamp: { gte: since },
      game: {
        wishlistGames: {
          some: {
            wishlist: { userId },
          },
        },
      },
    },
    include: {
      game: {
        include: {
          // Only the user's own wishlist links, to list the wishlist names.
          // Ordered so the rendered name list is deterministic across regenerations.
          wishlistGames: {
            where: { wishlist: { userId } },
            orderBy: { wishlist: { name: 'asc' } },
            include: { wishlist: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: [
      { timestamp: 'desc' },
      { id: 'desc' },
    ],
    take: MAX_FEED_ITEMS,
  });

  const appUrl = getAppUrl();
  const feed = new Feed({
    title: FEED_TITLE,
    description: FEED_DESCRIPTION,
    id: `${appUrl}/rss`,
    link: appUrl,
    language: 'en',
    updated: new Date(),
    ttl: 5,
  });

  const drops = changes
    .map((change) => ({
      change,
      oldPrice: change.oldPrice === null ? null : change.oldPrice.toNumber(),
      newPrice: change.newPrice === null ? null : change.newPrice.toNumber(),
    }))
    .filter(isPriceDrop);

  for (const { change, oldPrice, newPrice } of drops) {
    const game = change.game;

    // De-duplicate wishlist names while preserving order.
    const wishlistNames = [...new Set(game.wishlistGames.map((wg) => wg.wishlist.name))];

    feed.addItem({
      id: change.id,
      title: buildItemTitle(game.name, oldPrice, newPrice, change.newDiscount, game.currency),
      link: `https://store.steampowered.com/app/${game.steamId}/`,
      date: change.timestamp,
      description: buildItemDescription(oldPrice, newPrice, change.newDiscount, game.currency, wishlistNames),
    });
  }

  const xml = feed.rss2();
  setRssCache(userId, xml);
  return xml;
};
