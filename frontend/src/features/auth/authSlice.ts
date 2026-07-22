import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '../../app/services/authApi';
import type { AuthUser } from '../../types/user';

/**
 * Auth state stores the AuthUser from login/register (id + username).
 * The full User type (with steamId, createdAt, updatedAt) is available
 * via the getProfile RTK Query endpoint and RTK Query's own cache.
 */
interface AuthState {
  user: AuthUser | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  status: 'idle',
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.status = 'idle';
      state.error = null;
      localStorage.removeItem('token');
    },
    setUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.status = 'succeeded';
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login pending
      .addMatcher(authApi.endpoints.postLogin.matchPending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      // Login fulfilled
      .addMatcher(authApi.endpoints.postLogin.matchFulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        localStorage.setItem('token', action.payload.token);
      })
      // Login rejected
      .addMatcher(authApi.endpoints.postLogin.matchRejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Login failed';
      })
      // Register fulfilled (same token/user flow as login)
      .addMatcher(authApi.endpoints.postRegister.matchFulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        localStorage.setItem('token', action.payload.token);
      })
      // Profile loaded — store the full User (User extends AuthUser, so type-safe)
      .addMatcher(authApi.endpoints.getProfile.matchFulfilled, (state, action) => {
        state.user = action.payload.user;
      });
  },
});

export const { logout, setUser, clearError } = authSlice.actions;
export default authSlice.reducer;
