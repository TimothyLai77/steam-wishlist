import { api } from './api';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  User,
} from '../../types/user';

interface ProfileResponse {
  user: User;
}

export const authApi = api.injectEndpoints({
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

    /**
     * Save or clear the current user's Steam ID64.
     */
    updateProfile: builder.mutation<ProfileResponse, { steamId: string | null }>({
      query: (payload) => ({
        url: '/auth/profile',
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

// Export hooks for usage in components
export const {
  usePostRegisterMutation,
  usePostLoginMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
} = authApi;
