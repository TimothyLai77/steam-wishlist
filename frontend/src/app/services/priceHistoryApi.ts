import { api } from './api';

/**
 * One contiguous sale period for a game (as returned by the backend).
 *
 * `start` is when the sale began (discount went 0/null → >0); `end` is when
 * it ended, or `null` while the sale is still ongoing. `price` /
 * `discountPercent` / `originalPrice` reflect the latest state within the
 * period (e.g. after a mid-sale deepening); `deepenedAt` is the timestamp of
 * the latest such mid-sale change, or `null` if the period never changed.
 *
 * Dates are ISO 8601 strings.
 */
export interface SalePeriod {
  start: string;
  end: string | null;
  price: number | null;
  discountPercent: number;
  originalPrice: number | null;
  deepenedAt: string | null;
}

/**
 * Default response of `GET /api/games/:steamId/price-history`.
 *
 * `salePeriods` is in chronological order (oldest first); the last entry has
 * `end: null` when a sale is still ongoing. `trackingStartedAt` is the
 * timestamp of the earliest logged price change, or `null` when the game has
 * no price history at all (used for the "tracking started <date>" edge state).
 */
export interface PriceHistory {
  salePeriods: SalePeriod[];
  trackingStartedAt: string | null;
}

/**
 * The effective price state of a game at a point in time: the state
 * established by the most recent price change at or before that point.
 * `since` is the timestamp of the change that established it.
 *
 * Dates are ISO 8601 strings.
 */
export interface PriceState {
  price: number | null;
  originalPrice: number | null;
  discountPercent: number | null;
  since: string;
}

/**
 * Response of the point-in-time lookup: `{ state }` is the effective price
 * state at the requested point in time.
 */
export interface PriceAtDateResult {
  state: PriceState;
}

/**
 * Arguments for the point-in-time lookup. `date` is a local calendar date in
 * `YYYY-MM-DD` form (as produced by the date picker); the query serializes it
 * to the end of that day so changes logged on the picked day are included.
 */
export interface PriceAtDateArgs {
  steamId: string;
  date: string;
}

/**
 * Price-history domain endpoints, injected into the shared RTK Query API
 * instance. The shared `baseUrl` is already `/api` and `prepareHeaders`
 * injects the JWT.
 *
 * History is per *game* (global, shared across wishlists/users), so both
 * queries key on `steamId` alone.
 */
export const priceHistoryApi = api.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get a game's full price history: all contiguous sale periods plus the
     * date price tracking started for the game.
     *
     * @param steamId - The Steam App ID of the game.
     */
    getPriceHistory: builder.query<PriceHistory, string>({
      query: (steamId) => `/games/${steamId}/price-history`,
      providesTags: ['PriceHistory'],
    }),

    /**
     * Look up the effective price state of a game at a point in time (the
     * latest price change at or before the end of the picked day).
     *
     * Returns 404 when no price change has been logged at or before the
     * requested date (i.e. the lookup predates the game's tracking start).
     *
     * @param steamId - The Steam App ID of the game.
     * @param date - A `YYYY-MM-DD` local calendar date.
     */
    getPriceAtDate: builder.query<PriceAtDateResult, PriceAtDateArgs>({
      query: ({ steamId, date }) =>
        `/games/${steamId}/price-history?date=${date}T23:59:59.999`,
    }),
  }),
});

// Export hooks for usage in components
export const { useGetPriceHistoryQuery, useGetPriceAtDateQuery } = priceHistoryApi;
