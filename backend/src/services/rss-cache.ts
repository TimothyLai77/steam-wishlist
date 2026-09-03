// In-memory TTL cache for generated RSS feed XML (one entry per user).
// Intentionally not persisted: a cold start (e.g. after a restart) just means
// one extra feed generation per user. No invalidation is needed on token
// rotation because entries are keyed by userId and the feed content is
// unaffected by rotation.

const RSS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RSS_CACHE_MAX_ENTRIES = 500;

interface RssCacheEntry {
  xml: string;
  expiresAt: number;
}

const cache = new Map<string, RssCacheEntry>();

const evictExpired = (now: number): void => {
  for (const [userId, entry] of cache) {
    if (entry.expiresAt <= now) {
      cache.delete(userId);
    }
  }
};

/**
 * Returns the cached RSS XML for a user if it is still fresh, or `undefined`
 * on a miss or after expiry. Expired entries are removed on access.
 */
export const getRssCache = (userId: string): string | undefined => {
  const entry = cache.get(userId);
  if (!entry) {
    return undefined;
  }
  if (entry.expiresAt <= Date.now()) {
    cache.delete(userId);
    return undefined;
  }
  return entry.xml;
};

/**
 * Stores the RSS XML for a user with a 5-minute TTL. Enforces the entry cap:
 * expired entries are evicted first; if the cache is still at the cap, the
 * entry with the earliest `expiresAt` is evicted (repeatedly, if needed).
 */
export const setRssCache = (userId: string, xml: string): void => {
  const now = Date.now();
  const entry: RssCacheEntry = { xml, expiresAt: now + RSS_CACHE_TTL_MS };

  // Refreshing an existing entry does not grow the map.
  if (cache.has(userId)) {
    cache.set(userId, entry);
    return;
  }

  evictExpired(now);

  // Still at the cap: drop entries, starting with the one that expires earliest.
  while (cache.size >= RSS_CACHE_MAX_ENTRIES) {
    let oldestKey: string | undefined;
    let oldestExpiry = Number.POSITIVE_INFINITY;
    for (const [key, cached] of cache) {
      if (cached.expiresAt < oldestExpiry) {
        oldestExpiry = cached.expiresAt;
        oldestKey = key;
      }
    }
    if (oldestKey === undefined) {
      break;
    }
    cache.delete(oldestKey);
  }

  cache.set(userId, entry);
};

/** Number of entries currently stored (including expired ones not yet evicted). */
export const getRssCacheSize = (): number => cache.size;

/** Removes all cached entries (intended for tests). */
export const clearRssCache = (): void => {
  cache.clear();
};
