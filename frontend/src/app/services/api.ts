import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

/**
 * Central RTK Query API instance with shared baseQuery configuration.
 *
 * - fetchBaseQuery: handles HTTP requests
 * - prepareHeaders: injects JWT from localStorage automatically
 * - tagTypes: global registry for cache invalidation
 *
 * Domain-specific endpoints are injected via injectEndpoints() in separate
 * service files (authApi.ts, wishlistApi.ts).
 */
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['User', 'Wishlist', 'Game'],
  endpoints: () => ({
    // No endpoints defined here. Injected in domain service files.
  }),
});
