import { api } from './api';

/**
 * Response of the public `GET /api/version` endpoint.
 */
export interface AppVersion {
  name: string;
  version: string;
}

/**
 * App-version endpoint, injected into the shared RTK Query API instance.
 *
 * The version is fixed per deployment and never changes at runtime, so the
 * default RTK Query cache (fetch once per session, no invalidation) is the
 * right behavior here — no `providesTags` needed.
 */
export const versionApi = api.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get the deployed app name and version.
     *
     * @returns `{ name, version }` from the backend, e.g. `{ name: "steam-wishlist", version: "1.0.0" }`.
     */
    getVersion: builder.query<AppVersion, void>({
      query: () => '/version',
    }),
  }),
});

// Export hooks for usage in components
export const { useGetVersionQuery } = versionApi;
