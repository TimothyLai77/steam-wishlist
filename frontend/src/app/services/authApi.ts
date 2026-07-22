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
  }),
});

// Export hooks for usage in components
export const {
  usePostRegisterMutation,
  usePostLoginMutation,
  useGetProfileQuery,
} = authApi;
