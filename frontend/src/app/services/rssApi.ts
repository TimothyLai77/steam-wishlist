import { api } from './api';

/**
 * Response of `POST /api/rss/token`.
 *
 * The plaintext token is returned exactly once — the server only stores
 * its SHA-256 hash, so it cannot be retrieved again later.
 */
export interface RssTokenResult {
  /** The plaintext RSS token (64-char hex), shown to the user once. */
  token: string;
  /** The full feed URL to subscribe with in an RSS reader. */
  feedUrl: string;
}

/**
 * RSS domain endpoints, injected into the shared RTK Query API instance.
 * The shared `baseUrl` is already `/api` and `prepareHeaders` injects the JWT.
 */
export const rssApi = api.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Generates (or rotates) the current user's RSS token.
     *
     * Rotation overwrites the stored hash, so the returned `feedUrl` is
     * the only valid subscription link from that point on.
     */
    generateToken: builder.mutation<RssTokenResult, void>({
      query: () => ({
        url: '/rss/token',
        method: 'POST',
      }),
    }),
  }),
});

export const { useGenerateTokenMutation } = rssApi;
