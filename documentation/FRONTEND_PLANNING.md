# Frontend Planning - Steam Wishlist App

A private, self-hosted web application for tracking Steam game wishlists, prices, and discounts. Users can create multiple named wishlists, add games by Steam AppID, and view real-time pricing data from the Steam Store API.

## Tech Stack

- **Framework:** React 19
- **Language:** TypeScript ~6.0
- **Build Tool:** Vite 8
- **State Management:** Redux Toolkit + RTK Query (using `fetchBaseQuery`)
- **Routing:** React Router v7
- **UI Components:** shadcn/ui (base-lyra style, phosphor icons) — added incrementally as needed
- **Styling:** Tailwind CSS v4

**Note:** shadcn/ui components are installed into your codebase (`src/components/ui/`) via CLI, not as a runtime dependency. Components are added incrementally as each feature requires them.

---

## Pages

1. **Login Page** — Username/password login form
2. **Register Page** — Create account form
3. **Dashboard** — Overview: game count, total wishlist value, active discounts, recent adds
4. **Wishlists Page** — Lists all user's wishlists with game counts; allows creating/editing/deleting wishlists
5. **Wishlist Games Page** — Table/Grid of games in a selected wishlist:
   - Name, image, current price, discount badge
   - Sort by: name, price, discount %, date added
   - Filter by: on sale / not on sale
   - Actions: view details, edit notes, remove, move to another wishlist
6. **Add Game Page** — Simple form to enter a Steam AppID or Steam store URL, then add to a selected wishlist (or default wishlist)
7. **Game Detail Page** — Full game info (description, screenshots, which wishlists it's in) with links to:
   - Steam Store page
   - SteamDB price history

---

## Routing (React Router)

```
/login              → LoginPage
/register           → RegisterPage
/dashboard          → DashboardPage (protected)
/wishlists          → WishlistsPage (protected)          # Lists all user's wishlists
/wishlists/:id      → WishlistGamesPage (protected)     # Games in a specific wishlist
/wishlists/:id/add  → AddGamePage (protected)           # Add game to specific wishlist
/game/:steamId      → GameDetailPage (protected)
```

---

## State Management (Redux Toolkit)

- **app/services/api.ts** — Central `createApi()` with shared `fetchBaseQuery` configuration (base URL, token injection, tag types). No endpoints defined here.
- **app/services/*.ts** — Domain-specific API modules (authApi, wishlistApi, gameApi) using `injectEndpoints()` on the central API instance. Keeps endpoints organized by domain while sharing one baseQuery and reducer path.
- **features/auth/authSlice.ts** — Dedicated slice for authentication state (user, status, error). Uses `extraReducers` with `addMatcher()` on RTK Query endpoints (e.g., `authApi.endpoints.postLogin.matchPending`) to keep auth-related UI state in sync with API operations.
- **uiSlice** — Global UI state (modals, notifications, theme)

**RTK Query + authSlice Pattern:** RTK Query manages cached API data (loading, error, query results) via generated hooks. The `authSlice` stores derived/auth-related state needed across the app:
- Current user object (persisted across navigation)
- Authentication status (idle/loading/succeeded/failed)
- Error messages for login failures

This avoids having to rely on `useGetProfileQuery()` state everywhere while still leveraging RTK Query's caching and invalidation for the actual API calls.

---

## Key UI Components (shadcn/ui — added as needed)

- **Layout:** Sidebar + Header layout
- **Forms:** Controlled inputs with `useState` + shadcn/ui `Input`, `Button`, `Select`, `Textarea`, `Label`
- **Tables:** Basic shadcn/ui `Table` (minimal implementation for now)
- **Cards:** shadcn/ui `Card`
- **Modals:** shadcn/ui `Dialog`
- **Notifications:** shadcn/ui `Toast`
- **Navigation:** shadcn/ui `Sheet` (mobile menu), `DropdownMenu`
- **Badges/Tags:** shadcn/ui `Badge` for discount indicators

---

## Authentication Flow

### Backend
1. User registers with username/password
2. Password is hashed using bcryptjs (cost factor 12)
3. On login, server validates credentials and issues JWT
4. JWT stored in localStorage (for SPA simplicity)
5. Express middleware validates JWT on protected routes
6. Token expiry: 7 days, with optional refresh

### Frontend (Client-Side)
1. User registers/logs in via form → POST to backend using RTK Query mutation
2. On success, store JWT in localStorage
3. `fetchBaseQuery` `prepareHeaders` callback reads token from localStorage and attaches `Authorization: Bearer <token>` to all requests
4. On `401` response from RTK Query, clear token and redirect to `/login`
5. Protected routes check for token before rendering page

---

## Project Structure

```
frontend/
├── Dockerfile
├── package.json
├── tsconfig.json
├── vite.config.ts
├── components.json        # shadcn/ui config
├── index.html
├── public/
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── router.tsx         # React Router setup + protected route guards
    ├── app/
    │   └── services/
    │       ├── api.ts             # Central createApi() with baseQuery + tagTypes
    │       ├── authApi.ts         # injectEndpoints for auth (register, login, profile)
    │       ├── wishlistApi.ts     # injectEndpoints for wishlists CRUD
    │       └── gameApi.ts         # injectEndpoints for games CRUD
    ├── store/
    │   └── store.ts       # Redux store config (api reducer + authSlice + middleware)
    ├── features/
    │   ├── auth/
    │   │   ├── authSlice.ts       # Auth state with matchers on authApi endpoints
    │   │   ├── LoginPage.tsx
    │   │   └── RegisterPage.tsx
    │   ├── wishlists/
    │   │   ├── WishlistsPage.tsx
    │   │   ├── WishlistGamesPage.tsx
    │   │   └── AddGamePage.tsx
    │   ├── games/
    │   │   └── GameDetailPage.tsx
    │   └── dashboard/
    │       └── DashboardPage.tsx
    ├── components/
    │   ├── ui/            # shadcn/ui components (auto-generated, added incrementally)
    │   ├── Layout/
    │   │   ├── AppLayout.tsx    # Main layout with sidebar + header
    │   │   └── ProtectedRoute.tsx
    │   ├── GameCard.tsx
    │   ├── GameTable.tsx
    │   └── ...            # Shared components
    ├── hooks/
    │   ├── useAuth.ts
    │   └── ...
    ├── types/
    │   ├── game.ts
    │   ├── wishlist.ts
    │   └── user.ts
    └── index.css          # Tailwind base + shadcn/ui theme variables
```

**Architecture Notes:**
- **API Layer**: Single `createApi()` in [`api.ts`](frontend/src/app/services/api.ts) with `fetchBaseQuery`. Domain endpoints injected via `injectEndpoints()` in separate service files. This avoids monolithic API definitions while sharing one baseQuery, reducer path, and tagTypes registry.
- **Features**: React components organized by feature domain. Each feature imports hooks from centralized API services (e.g., `features/auth/LoginPage.tsx` uses `usePostLoginMutation` from `app/services/authApi.ts`).
- **AuthSlice**: Uses RTK Query's `addMatcher()` pattern to sync auth state with API operations. Example:

```ts
// features/auth/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '../../app/services/authApi';
import type { User } from '../../types/user';

interface AuthState {
  user: User | null;
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
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.status = 'succeeded';
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(authApi.endpoints.postLogin.matchPending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addMatcher(authApi.endpoints.postLogin.matchFulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        localStorage.setItem('token', action.payload.token);
      })
      .addMatcher(authApi.endpoints.postLogin.matchRejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Login failed';
      })
      .addMatcher(authApi.endpoints.postRegister.matchFulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        localStorage.setItem('token', action.payload.token);
      });
  },
});

export const { logout, setUser } = authSlice.actions;
export default authSlice.reducer;
```

**Note:** Removed `tailwind.config.ts` and `postcss.config.js` from structure — Tailwind v4 with `@tailwindcss/vite` plugin doesn't require these.

---

## API Integration (RTK Query)

Base URL from env: `VITE_API_URL=http://localhost:4000/api`

### Endpoints needed:

**Auth:**
- `postRegister` — `/api/auth/register`
- `postLogin` — `/api/auth/login`
- `getProfile` — `/api/auth/profile`

**Wishlists:**
- `getWishlists` — `/api/wishlists`
- `getAllGames` — `/api/wishlists/all-games` (dashboard: all games across all user wishlists)
- `postWishlist` — `/api/wishlists`
- `getWishlist` — `/api/wishlists/:wishlistId`
- `putWishlist` — `/api/wishlists/:wishlistId`
- `deleteWishlist` — `/api/wishlists/:wishlistId`

**Games:**
- `getGames` — `/api/wishlists/:wishlistId/games`
- `postGame` — `/api/wishlists/:wishlistId/games`
- `getGame` — `/api/games/:gameId`
- `putGame` — `/api/games/:gameId`
- `deleteGame` — `/api/games/:gameId`
- `moveGame` — `/api/games/:gameId/move`

---

## Development Tasks

### Phase 1: Setup
- [x] Initialize Vite + React + TypeScript project
- [x] Install and configure Tailwind CSS v4
- [x] Initialize shadcn/ui (`npx shadcn@latest init`)
- [x] Install Redux Toolkit, RTK Query, React Router v7
- [x] Create centralized API instance in `app/services/api.ts` with `createApi()` + `fetchBaseQuery`
- [x] Create `app/services/authApi.ts` with `injectEndpoints()` for auth endpoints
- [x] Create `app/services/wishlistApi.ts` with `injectEndpoints()` for wishlist endpoints
- [x] Create `app/services/gameApi.ts` with `injectEndpoints()` for game endpoints
- [x] Create `features/auth/authSlice.ts` with matchers pattern for auth state
- [x] Update Redux store to use new API path and include authSlice
- [x] Set up React Router with protected route guard
- [x] Create basic auth pages (Login, Register) in features/auth/ wired to backend

### Phase 2: Core Features
- [ ] Implement Dashboard layout (Sidebar + Header)
- [x] Add required shadcn/ui components (button, input, label — installed incrementally)
- [x] Dashboard page with summary stats (total games, total value, on sale count, estimated savings)
- [ ] Wishlists Page (list, create, delete wishlists)
- [ ] Wishlist Games Page (table view with shadcn/ui Table)
- [ ] Add Game Page (form to add by AppID/URL)
- [ ] Wire up RTK Query endpoints for all CRUD operations
- [ ] Move game between wishlists functionality

### Phase 3: Polish
- [ ] Responsive design improvements
- [ ] User notes on games
- [ ] Error handling and loading states
- [ ] Theme support (dark/light mode)
- [ ] Add SteamDB price history links on game detail page

---

## Implementation Notes

### React Hooks Fix (DashboardPage)
- DashboardPage originally called `useGetGamesQuery()` inside `.map()` over dynamic wishlist IDs, violating the Rules of Hooks (hook count changed between renders as wishlists loaded).
- Fixed by adding `GET /api/wishlists/all-games` backend endpoint backed by `getAllGamesForUser()` service, which fetches all games across all user wishlists in a single Prisma query.
- Frontend now uses a single static `useGetAllGamesQuery()` hook call at the top level, compliant with React's Rules of Hooks.
- Bonus: Dashboard `totalSavings` now accurately calculates from `originalPrice - currentPrice` since the combined endpoint returns both fields.

### Current Progress
- [x] Frontend initialized with Vite + React + Redux Toolkit + shadcn/ui + Tailwind CSS
- [x] Basic routing and protected route guards
- [x] Auth pages (Login/Register) with Redux auth slice
- [x] RTK Query API modules: `authApi.ts`, `wishlistApi.ts`, `gameApi.ts`
- [x] Dashboard page with summary stats (total games, total value, on sale count, estimated savings)
- [x] StatCard component for dashboard metrics
- [ ] Wishlists management page (CRUD UI)
- [ ] Wishlist games page (table view)
- [ ] Add game flow (AppID/URL input)
- [ ] Move game between wishlists UI

### Next Steps
- Connect frontend wishlistApi.ts to backend wishlist endpoints
- Implement wishlists management page UI (list, create, edit, delete)
- Implement wishlist games page UI (table view with sorting/filtering)
- Implement add game flow (AppID/URL input → Steam fetch → add to wishlist)
