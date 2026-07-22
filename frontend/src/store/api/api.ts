import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { AuthResponse, LoginCredentials, RegisterCredentials, User } from '../../types/user';

interface ProfileResponse {
  user: User;
}

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

/**
 * Base RTK Query API with fetchBaseQuery.
 * Handles JWT auth headers automatically from localStorage.
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
  tagTypes: ['User'],
  endpoints: (builder) => ({
    /**
     * Register a new user
     */
    postRegister: builder.mutation<AuthResponse, RegisterCredentials>({
      query: (credentials) => ({
        url: '/auth/register',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),

    /**
     * Login with username and password
     */
    postLogin: builder.mutation<AuthResponse, LoginCredentials>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),

    /**
     * Get current authenticated user profile
     */
    getProfile: builder.query<ProfileResponse, void>({
      query: () => '/auth/profile',
      providesTags: ['User'],
    }),
  }),
});

// Export hooks for usage in components
export const { usePostRegisterMutation, usePostLoginMutation, useGetProfileQuery } = api;
