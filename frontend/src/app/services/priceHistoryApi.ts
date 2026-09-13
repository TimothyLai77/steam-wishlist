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
 * One logged price change within a range window (as returned by the backend):
 * the new state the change establishes, with the timestamp it was logged.
 * Dates are ISO 8601 strings.
 */
export interface PriceChangeEntry {
  timestamp: string;
  price: number | null;
  originalPrice: number | null;
  discountPercent: number | null;
}

/**
 * Response of the date-range lookup: the windowed price history between two
 * dates.
 *
 * - `state` is the state in effect at the end of the range.
 * - `constant` is `true` when no change fell strictly inside the range.
 * - `startState` is the state in effect at the start of the range, or `null`
 *   when tracking began after the range start (i.e. the first change is
 *   inside the window).
 * - `changes` lists every change strictly inside the range, oldest first.
 * - `trackingStartedAt` is the earliest logged change, or `null` when the
 *   game has no price history at all.
 */
export interface PriceRangeResult {
  state: PriceState;
  constant: boolean;
  startState: PriceState | null;
  changes: PriceChangeEntry[];
  trackingStartedAt: string | null;
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
 * Arguments for the date-range lookup. `from` / `to` are local calendar dates
 * in `YYYY-MM-DD` form; the query serializes them to the start of `from` and
 * the end of `to` (server-local) so both picked days are fully covered.
 */
export interface PriceRangeArgs {
  steamId: string;
  from: string;
  to: string;
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

    /**
     * Look up the windowed price history between two dates: the state in
     * effect at the start of the range (or `null` when tracking began inside
     * it) plus every change strictly inside the range, oldest first.
     *
     * Returns 404 when no price change has been logged at or before the end
     * of the range (i.e. the whole range predates the game's tracking start).
     *
     * @param steamId - The Steam App ID of the game.
     * @param from - A `YYYY-MM-DD` local calendar date (range start).
     * @param to - A `YYYY-MM-DD` local calendar date (range end, ≥ from).
     */
    getPriceRange: builder.query<PriceRangeResult, PriceRangeArgs>({
      query: ({ steamId, from, to }) =>
        `/games/${steamId}/price-history?from=${from}T00:00:00&to=${to}T23:59:59.999`,
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetPriceHistoryQuery,
  useGetPriceAtDateQuery,
  useGetPriceRangeQuery,
} = priceHistoryApi;
