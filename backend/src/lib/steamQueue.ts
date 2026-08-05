import PQueue from 'p-queue';

/**
 * Singleton queue for all Steam API requests.
 * - concurrency: 3 simultaneous requests max (avoids overwhelming Steam's API)
 * - intervalCap: 150 requests per 5-minute window (safely below Steam's 200 limit)
 * - interval: 5 minutes (300,000 ms)
 *
 * Tasks will wait if the interval cap is reached rather than failing,
 * preventing rate limit errors from Steam.
 */
export const steamQueue = new PQueue({
    concurrency: 3,
    intervalCap: 150,
    interval: 5 * 60_000,
});
