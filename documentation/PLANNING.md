# Steam Wishlist App - Planning Document

## 1. Project Overview

A private, self-hosted Steam wishlist management web application that allows 1-3 users to track their Steam game wishlists, prices, and discounts using Steam's official API.

### Core Goals
- Simple, private wishlist management separate from Steam's native system
- Support multi-user accounts (1-3 users) with secure login
- **Each user can create and manage multiple named wishlists (e.g., "Must Haves", "On Sale Watch", "Co-op Games")**
- Query real-time game data (price, discounts, release info) from Steam API
- Self-contained Docker Compose deployment
- Clean, modern UI with shadcn/ui and Tailwind CSS

---

## 2. Technology Stack

### Backend
- **Runtime:** Node.js (LTS)
- **Framework:** Express.js
- **Language:** TypeScript (ES modules, `module: "NodeNext"`)
- **ORM:** Prisma 7.x
- **Database:** SQLite (via LibSQL adapter)
- **Auth:** bcryptjs for password hashing, JWT for session management
- **HTTP Client:** axios for Steam API calls

### Frontend
- **Framework:** React 19
- **Language:** TypeScript ~6.0
- **State Management:** Redux Toolkit + RTK Query (using `fetchBaseQuery`)
- **Routing:** React Router v7
- **UI Components:** shadcn/ui (base-lyra style, phosphor icons) — added incrementally as needed
- **Styling:** Tailwind CSS v4
- **Build Tool:** Vite 8

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Database:** SQLite via Prisma migrations


---

## 3. Docker Compose Architecture

```
services:
  - app: Express + Node.js backend (includes Prisma)
  - frontend: React SPA (Vite dev / built static)
```

### Data Persistence
- SQLite database file mounted as a volume
- Prisma schema and migrations in `/prisma` folder

---

## 4. Database Schema (Prisma)

### Models

#### User
- `id`: String (UUID)
- `username`: String (unique)
- `passwordHash`: String
- `steamId`: String? (optional, for future Steam profile linking)
- `wishlists`: Wishlist[] — relation field to user's wishlists
- `createdAt`: DateTime
- `updatedAt`: DateTime

#### Wishlist
- `id`: String (UUID)
- `userId`: String (FK → User)
- `user`: User — relation back to owner
- `name`: String (e.g., "Must Haves", "On Sale Watch", "Co-op Games")
- `description`: String? (optional notes about the wishlist)
- `isDefault`: Boolean (default: false) — one default wishlist per user for quick adds
- `games`: WishlistGame[] — relation field to games in this wishlist
- `createdAt`: DateTime
- `updatedAt`: DateTime

#### WishlistGame
- `steamId`: Int (Steam AppID, primary key)
- `wishlistId`: String (FK → Wishlist)
- `wishlist`: Wishlist — relation back to owning wishlist
- `name`: String (cached from Steam API)
- `currentPrice`: Decimal? (cached)
- `originalPrice`: Decimal? (cached, for discounts)
- `discountPercent`: Int? (cached)
- `currency`: String (e.g., "USD")
- `imageUrl`: String? (cached small capsule image)
- `addedAt`: DateTime
- `priceUpdatedAt`: DateTime
- `notes`: String? (user's personal notes)
- **Unique constraint:** `(steamId, wishlistId)` — a game can appear only once per wishlist

### Relations
- User → Wishlist (one-to-many)
- Wishlist → WishlistGame (one-to-many)

---

## 5. API Endpoints

### Authentication
- `POST /api/auth/register` — Create new user (username/password)
- `POST /api/auth/login` — Authenticate and receive JWT
- `GET /api/auth/profile` — Get current user profile (protected)
- `POST /api/auth/logout` — Invalidate session / client-side token removal

### Wishlists
- `GET /api/wishlists` — List all wishlists for current user (protected)
- `GET /api/wishlists/all-games` — Get all games across all user wishlists (protected, for dashboard)
- `POST /api/wishlists` — Create a new wishlist (protected)
- `GET /api/wishlists/:wishlistId` — Get single wishlist with games (protected)
- `PUT /api/wishlists/:wishlistId` — Update wishlist name/description (protected)
- `DELETE /api/wishlists/:wishlistId` — Delete wishlist and all games (protected)

### Games
- `GET /api/wishlists/:wishlistId/games` — List games in a wishlist (protected)
- `POST /api/wishlists/:wishlistId/games` — Add a game to a wishlist by Steam AppID (protected)
- `GET /api/games/:gameId` — Get game details (protected)
- `PUT /api/games/:gameId` — Update notes or metadata (protected)
- `DELETE /api/games/:gameId` — Remove from wishlist (protected)
- `POST /api/games/:gameId/move` — Move game to a different wishlist (protected)

### Admin (optional, for multi-user)
- `GET /api/admin/users` — List all users (admin only)
- `DELETE /api/admin/users/:id` — Delete user (admin only)

---

## 6. Steam API Integration

### APIs Used

#### Store API (Public, No Key Required)
- Endpoint: `https://store.steampowered.com/api/appdetails`
- Use: Fetch game details (name, description, images, price, discounts)
- Call: `GET https://store.steampowered.com/api/appdetails?appids={appid}`

### External Links
- For price history, provide a link to SteamDB: `https://steamdb.info/app/{appid}/history/`

---

## 7. Frontend Architecture

### Pages
1. **Login Page** — Username/password login form
2. **Register Page** — Create account form
3. **Dashboard** — Overview: game count, total wishlist value, active discounts, recent adds
4. **Wishlists Page** — Lists all user's wishlists with game counts; allows creating/editing/deleting wishlists
5. **Wishlist Games Page** — Table/Grid of games in a selected wishlist:
   - Name, image, current price, discount badge
   - Sort by: name, price, discount %, date added
   - Filter by: on sale / not on sale
   - Actions: view details, edit notes, remove, move to another wishlist
6. **Add Game Dialog** — Modal dialog (on Wishlist Games Page) to enter a Steam AppID or Steam store URL, then add to the current wishlist

### State Management (Redux Toolkit)
- **app/services/api.ts** — Central `createApi()` with shared `fetchBaseQuery` configuration (base URL, token injection, tag types). No endpoints defined here.
- **app/services/\*.ts** — Domain-specific API modules (authApi, wishlistApi, gameApi) using `injectEndpoints()` on the central API instance. Keeps endpoints organized by domain while sharing one baseQuery and reducer path.
- **features/auth/authSlice.ts** — Dedicated slice for authentication state (user, status, error). Uses `extraReducers` with `addMatcher()` on RTK Query endpoints (e.g., `authApi.endpoints.postLogin.matchPending`) to keep auth-related UI state in sync with API operations.
- **uiSlice** — Global UI state (modals, notifications, theme)

**RTK Query + authSlice Pattern:** RTK Query manages cached API data (loading, error, query results) via generated hooks. The `authSlice` stores derived/auth-related state needed across the app:
- Current user object (persisted across navigation)
- Authentication status (idle/loading/succeeded/failed)
- Error messages for login failures

This avoids having to rely on `useGetProfileQuery()` state everywhere while still leveraging RTK Query's caching and invalidation for the actual API calls.

### Key UI Components (shadcn/ui)
- Layout: Collapsible sidebar layout (`AppLayout`) + responsive mobile drawer (`Sheet`) with Tailwind CSS utility classes
- Forms: Controlled inputs with `useState` + shadcn/ui `Input`, `Button`, `Select`, `Textarea`, `Label`
- Tables: Basic shadcn/ui `Table` (minimal implementation for now)
- Cards: shadcn/ui `Card`
- Modals: shadcn/ui `Dialog`
- Notifications: shadcn/ui `Toast`
- Navigation: shadcn/ui `Sheet` (mobile menu), `DropdownMenu` (collapsed sidebar wishlists), `Collapsible` (wishlist section expansion)
- Badges/Tags: shadcn/ui `Badge` for discount indicators

**Currently installed components** (`src/components/ui/`): `badge`, `button`, `card`, `collapsible`, `dialog`, `dropdown-menu`, `input`, `label`, `sheet`, `table`, `toast`

**Note:** shadcn/ui components are installed into your codebase (`src/components/ui/`) via CLI, not as a runtime dependency. Components are added incrementally as each feature requires them.

### Routing (React Router)
```
/login              → LoginPage
/register           → RegisterPage
/dashboard          → DashboardPage (protected)
/wishlists          → WishlistsPage (protected)          # Lists all user's wishlists
/wishlists/:id      → WishlistGamesPage (protected)     # Games in a specific wishlist
```

---

## 8. Authentication Flow

1. User registers with username/password
2. Password is hashed using bcryptjs (cost factor 10-12)
3. On login, server validates credentials and issues JWT
4. JWT stored in HttpOnly cookie or localStorage (recommend localStorage for SPA simplicity)
5. Frontend `fetchBaseQuery` `prepareHeaders` callback reads JWT from localStorage and attaches `Authorization: Bearer <token>` to all requests
6. Express middleware validates JWT on protected routes
7. Token expiry: 7 days, with optional refresh

---

## 9. Project Structure

```
/
├── docker-compose.yml
├── PLANNING.md
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── index.ts                 # Express app entry
│   │   ├── config/
│   │   │   ├── env.ts               # Environment config
│   │   │   └── prisma.ts            # Prisma client instance
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── wishlist.routes.ts
│   │   │   ├── game.routes.ts
│   │   │   └── admin.routes.ts
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── wishlist.controller.ts
│   │   │   ├── game.controller.ts
│   │   │   └── admin.controller.ts
│   │   ├── services/
│   │   │   ├── steam.service.ts     # Steam Store API calls
│   │   │   ├── user.service.ts
│   │   │   ├── wishlist.service.ts
│   │   │   └── game.service.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts   # JWT validation
│   │   │   └── error.middleware.ts
│   │   ├── utils/│   │   │   ├── jwt.ts
│   │   │   └── bcrypt.ts
│

├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── components.json        # shadcn/ui config
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── router.tsx         # React Router setup + protected route guards
│       ├── app/
│       │   └── services/
│       │       ├── api.ts             # Central createApi() with baseQuery + tagTypes
│       │       ├── authApi.ts         # injectEndpoints for auth (register, login, profile)
│       │       ├── wishlistApi.ts     # injectEndpoints for wishlists CRUD
│       │       └── gameApi.ts         # injectEndpoints for games CRUD
│       ├── store/
│       │   └── store.ts       # Redux store config (api reducer + authSlice + middleware)
│       ├── features/
│       │   ├── auth/
│       │   │   ├── authSlice.ts       # Auth state with matchers on authApi endpoints
│       │   │   ├── LoginPage.tsx
│       │   │   └── RegisterPage.tsx
│       │   ├── wishlists/
│       │   │   ├── WishlistsPage.tsx
│       │   │   ├── WishlistGamesPage.tsx
│       │   │   └── AddGameDialog.tsx
│       │   └── dashboard/
│       │       └── DashboardPage.tsx
│       ├── components/
│       │   ├── ui/            # shadcn/ui components (auto-generated, added incrementally)
│       │   ├── Layout/
│       │   │   ├── AppLayout.tsx    # Main layout with sidebar + header
│       │   │   └── ProtectedRoute.tsx
│       │   ├── GameCard.tsx
│       │   ├── GameTable.tsx
│       │   └── ...            # Shared components
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   └── ...
│       ├── types/
│       │   ├── game.ts
│       │   ├── wishlist.ts
│       │   └── user.ts
│       └── index.css          # Tailwind base + shadcn/ui theme variables
```

---

## 10. Environment Variables

### Backend
```
NODE_ENV=development
PORT=4000
DATABASE_URL=file:./dev.db
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=7d
```

### Frontend
```
VITE_API_URL=http://localhost:4000/api
```

---

## 11. Development Phases

### Phase 1: Foundation
- [ ] Set up Docker Compose structure
- [x] Initialize backend with Express + TypeScript + Prisma
- [x] Define and migrate database schema
- [x] Implement user registration and login with JWT
- [x] Initialize frontend with Vite + React + Redux Toolkit + shadcn/ui + Tailwind CSS
- [x] Create basic routing and protected route guards

### Phase 2: Core Wishlist Features
- [x] Implement Steam API integration (fetch game details by AppID)
- [x] CRUD endpoints for wishlists (create, list, update, delete)
- [x] CRUD endpoints for wishlist games (add by AppID/URL, remove with confirmation dialog)
- [x] AppLayout sidebar with collapsible navigation and mobile Sheet drawer
- [x] WishlistSection component for sidebar wishlist navigation
- [x] CreateWishlistDialog integrated into sidebar for quick wishlist creation
- [x] Sidebar displays wishlists with game counts via RTK Query
- [x] Frontend wishlists management page (list, create, rename, delete wishlists)
- [x] Frontend wishlist games page with table view (sorting, on-sale filter)
- [x] Add game flow (paste AppID or URL → add via modal dialog)
- [x] Default wishlist creation on user registration
- [ ] Move game between wishlists functionality

### Phase 3: Polish & UX
- [x] Dashboard with summary stats
- [ ] Responsive design improvements
- [ ] User notes on games
- [ ] Error handling and loading states
- [ ] Theme support (dark/light mode)

### Phase 4: Optional Enhancements
- [ ] Wishlist sharing links (read-only view)
- [ ] Export wishlist to CSV
- [ ] Steam profile integration (import existing wishlist)
- [ ] Email notifications for price drops


---

## 12. Key Considerations

### Security
- Passwords hashed with bcrypt (never stored plain)
- JWT with reasonable expiry
- Rate limiting on Steam API calls to avoid abuse
- CORS configured for frontend origin only

### Steam API Constraints
- Store API is public but undocumented rate limits apply
- Consider adding caching and retry logic for API calls
- Game data is cached to reduce API load

### Scalability Notes
- Designed for 1-3 users, so SQLite is appropriate
- If scaling beyond, swap to PostgreSQL with minimal schema changes

### Data Backup
- SQLite file is single-file; easy to backup
- Mount as Docker volume for persistence
- Consider adding a simple export endpoint

---

## 13. Implementation Notes

### Current Progress (Phase 1 Complete, Phase 2 Backend Complete)

#### Phase 1: Backend Foundation — Completed
- [x] Backend initialized with Express + TypeScript + ES modules (`"type": "module"`)
- [x] TypeScript configured with `module: "NodeNext"`, `verbatimModuleSyntax: true`
- [x] Prisma schema defined (`User`, `Wishlist`, `WishlistGame` models)
- [x] Database migrated successfully with Prisma 7
- [x] Prisma client singleton set up with LibSQL adapter (`@prisma/adapter-libsql`)
- [x] Basic Express app running with `/health` and `/db` endpoints
- [x] Backend configured to run on port `4000`
- [x] Auth utilities created:
  - `utils/bcrypt.ts` — password hashing (`hashPassword`, `comparePassword`) with bcryptjs (cost factor 12)
  - `utils/jwt.ts` — JWT signing/verification (`signToken`, `verifyToken`) with typed `JwtPayload`
- [x] Error handling middleware (`middleware/error.middleware.ts`) — custom `AppError`, global handler
- [x] Auth middleware (`middleware/auth.middleware.ts`) — JWT validation, attaches typed `req.user`
- [x] Auth routes (`routes/auth.routes.ts`) — `POST /register`, `POST /login`, `GET /profile`
- [x] Auth controller (`controllers/auth.controller.ts`) — thin HTTP layer, delegates to service
- [x] User service (`services/user.service.ts`) — business logic for register/login/profile
  - Creates default "My Wishlist" on user registration

#### Phase 2: Backend Core Features — Completed

**Wishlist Module:**
- [x] Wishlist service (`services/wishlist.service.ts`) — Prisma operations for wishlist CRUD
  - `getWishlistsByUser(userId)` — lists all user's wishlists with game counts
  - `getWishlistById(wishlistId, userId)` — single wishlist with games
  - `createWishlist(userId, input)` — creates new wishlist
  - `updateWishlist(wishlistId, userId, input)` — updates wishlist fields
  - `deleteWishlist(wishlistId, userId)` — deletes wishlist and all games (cascading)
  - `getAllGamesForUser(userId)` — fetches all games across all user wishlists in one query (for dashboard)
- [x] Wishlist controller (`controllers/wishlist.controller.ts`) — Express handlers
- [x] Wishlist routes (`routes/wishlist.routes.ts`) — mounted at `/api/wishlists`
  - `GET /api/wishlists` — list wishlists
  - `GET /api/wishlists/all-games` — all games across all wishlists (dashboard endpoint)
  - `GET /api/wishlists/:wishlistId` — get single wishlist with games
  - `POST /api/wishlists` — create wishlist
  - `PUT /api/wishlists/:wishlistId` — update wishlist
  - `DELETE /api/wishlists/:wishlistId` — delete wishlist

**Steam API Integration:**
- [x] Steam service (`services/steam.service.ts`) — fetches game details from Steam Store API
  - Calls `https://store.steampowered.com/api/appdetails?appids={appid}`
  - Parses: name, currentPrice, originalPrice, discountPercent, currency, imageUrl
  - Converts price from cents to dollars (Steam returns cents)
  - Returns `null` if game not found or API fails

**Game Module:**
- [x] Game service (`services/game.service.ts`) — Prisma operations for WishlistGame CRUD
  - `getGamesByWishlistId(wishlistId)` — lists games with wishlist name
  - `getGameDetail(wishlistId, steamId, userId)` — single game with wishlist context
  - `addGameToWishlist(wishlistId, steamId, userId)` — fetches Steam data on add, creates entry
    - Verifies wishlist ownership
    - Checks for duplicate (composite key: steamId + wishlistId)
    - Falls back to "Game {steamId}" if Steam fetch fails
  - `updateGameNotes(wishlistId, steamId, notes, userId)` — update notes field (planned)
  - `removeGameFromWishlist(wishlistId, steamId, userId)` — delete by composite key (implemented)
  - `moveGameToWishlist(sourceWishlistId, targetWishlistId, steamId, userId)` — move between wishlists (planned)
- [x] Game controller (`controllers/game.controller.ts`) — Express handlers
- [x] Game routes (`routes/game.routes.ts`) — mounted at `/api`
  - `GET /api/wishlists/:wishlistId/games` — list games in wishlist
  - `POST /api/wishlists/:wishlistId/games` — add game by Steam AppID
  - `DELETE /api/games/:gameId` — remove from wishlist (gameId format: `steamId+wishlistId`, implemented)
  - `GET /api/games/:gameId` — game detail (planned)
  - `PUT /api/games/:gameId` — update game notes (planned)
  - `PUT /api/games/:gameId/move` — move game to another wishlist (planned)

**Composite Key Routing:**
- GameId encoding format: `steamId+wishlistId` (e.g., `1234567+abc-uuid`)
- Route handlers parse by splitting on `+` delimiter
- Required due to Prisma composite primary key `@@id([steamId, wishlistId])` on WishlistGame

#### Phase 2: Frontend — Partially Completed
- [x] Frontend initialized with Vite + React + Redux Toolkit + shadcn/ui + Tailwind CSS
- [x] Basic routing and protected route guards
- [x] Auth pages (Login/Register) with Redux auth slice
- [x] RTK Query API modules: `authApi.ts`, `wishlistApi.ts`, `gameApi.ts`
- [x] Dashboard page with summary stats (total games, total value, on sale count, estimated savings)
- [x] StatCard component for dashboard metrics
- [x] Fixed React Hooks violation: replaced dynamic `.map(() => useGetGamesQuery())` with single static `useGetAllGamesQuery()` hook using combined backend endpoint
- [x] AppLayout sidebar with collapsible navigation (desktop) and Sheet drawer (mobile)
- [x] WishlistSection component with collapsible wishlist list and dropdown menu for collapsed sidebar
- [x] CreateWishlistDialog component integrated into sidebar
- [x] Sidebar integrates `useGetWishlistsQuery` to display wishlists with game counts
- [x] Sidebar integrates `usePostWishlistMutation` for creating wishlists directly from navigation
- [x] Router fully configured with all planned routes, public route guards, root redirect, and 404 catch-all
- [x] Wishlists management page (CRUD UI) — grid of cards with create modal and kebab menus
- [x] Wishlist games page (table view) — sortable columns with on-sale filter
- [x] Add game flow (AppID/URL input via AddGameDialog modal)
- [x] Remove game from wishlist with confirmation dialog and toast notifications
- [ ] Move game between wishlists UI

#### Architecture Pattern
Backend follows a consistent layering pattern:
- **Controllers**: parse HTTP requests, basic input checks, call services, return responses
- **Services**: business logic, DB operations, token/password handling
- **Utils**: pure helpers (bcrypt, jwt)
- **Middleware**: cross-cutting concerns (auth, error handling)

#### Prisma 7 Specifics
- Datasource `url` moved from `schema.prisma` to `prisma.config.ts`
- PrismaClient requires a driver adapter for database connections
- Using `@prisma/adapter-libsql` with config object `{ url: DATABASE_URL }`
- Schema uses Prisma's `Int` type (no `@db.Int` native type for SQLite)

#### Module System
- Backend uses ES modules (`"type": "module"` in package.json)
- TypeScript config: `module: "NodeNext"`, `moduleResolution: "NodeNext"`, `verbatimModuleSyntax: true`
- `dotenv` loaded in both `index.ts` and `prisma.ts` to ensure env vars are available at import time
- ES module imports require explicit `.js` extensions on relative paths

#### Next Steps
- Implement move game between wishlists functionality

#### React Hooks Fix (DashboardPage)
- DashboardPage originally called `useGetGamesQuery(id)` inside `.map()` over dynamic wishlist IDs, violating the Rules of Hooks (hook count changed between renders as wishlists loaded).
- Fixed by adding `GET /api/wishlists/all-games` backend endpoint backed by `getAllGamesForUser()` service, which fetches all games across all user wishlists in a single Prisma query.
- Frontend now uses a single static `useGetAllGamesQuery()` hook call at the top level, compliant with React's Rules of Hooks.
- Bonus: Dashboard `totalSavings` now accurately calculates from `originalPrice - currentPrice` since the combined endpoint returns both fields.

#### AppLayout Sidebar Implementation
- Fully implemented collapsible sidebar layout in [`AppLayout.tsx`](frontend/src/components/Layout/AppLayout.tsx:20) with responsive behavior:
  - **Desktop**: Fixed sidebar that collapses from 260px to 64px width via state management. Shows icons only when collapsed.
  - **Mobile**: Sheet component slides in from the left as a mobile navigation drawer (triggered by hamburger button in top header bar).
- Sidebar navigation includes:
  - Dashboard link (HouseIcon, active when on `/dashboard`)
  - Wishlists section via [`WishlistSection.tsx`](frontend/src/components/Layout/WishlistSection.tsx:21) — collapsible group with "All Wishlists" link
  - Logout button (SignOutIcon) at bottom
- WishlistSection behavior:
  - When sidebar is expanded: Collapsible list showing all user wishlists with game counts (ListIcon + name + count badge)
  - When sidebar is collapsed: DropdownMenu showing wishlist items
  - When mobile: Always shows full list inside Sheet content
- CreateWishlistDialog integration via [`CreateWishlistDialog.tsx`](frontend/src/components/Layout/CreateWishlistDialog.tsx:24):
  - Triggered from sidebar ("+ New Wishlist" button within WishlistSection area)
  - Dialog with single text input for name, keyboard support (Enter to submit)
  - Calls `usePostWishlistMutation`, navigates to newly created wishlist on success
- Active route/wishlist highlighting via `bg-accent text-accent-foreground` styling with dynamic path matching
- Uses Phosphor icons throughout (SteamLogoIcon, ListIcon, CaretLeftIcon, CaretRightIcon, HouseIcon, PlusIcon, SignOutIcon)

#### WishlistsPage Implementation
- Fully implemented wishlists management page in [`WishlistsPage.tsx`](frontend/src/features/wishlists/WishlistsPage.tsx:1):
  - **Header**: "Wishlists" title with subtitle and "New Wishlist" button (top-right)
  - **Grid layout**: Responsive grid of wishlist cards (1/2/3 columns based on viewport)
  - **Per-card interaction**:
    - Whole card is clickable → navigates to `/wishlists/:id` (detail view)
    - ⋮ (kebab) menu in card corner appears on hover for rename/delete actions; `stopPropagation` prevents navigation
  - **Create dialog**: Modal with name input, keyboard support (Enter to submit), calls `usePostWishlistMutation`
  - **Rename dialog**: Modal pre-filled with current name, calls `usePutWishlistMutation`
  - **Delete**: Confirmation prompt before calling `useDeleteWishlistMutation`
  - **Toast notifications**: Success/error feedback via [`toast.add()`](frontend/src/components/ui/toast.tsx:8) for all CRUD operations
  - **Empty state**: Illustrative placeholder with CTA when no wishlists exist

#### WishlistGamesPage Implementation
- Fully implemented wishlist games page in [`WishlistGamesPage.tsx`](frontend/src/features/wishlists/WishlistGamesPage.tsx:1):
  - **Header**: Wishlist name, game count ("X of Y games on sale" when filtered), Refresh and "Add Game" buttons
  - **Back navigation**: ListIcon button returns to `/wishlists`
  - **Filter**: "Show only on sale" checkbox
  - **Sortable table columns**: Game (name), Price, Discount, Added — click to toggle asc/desc sort with visual indicators
  - **Table rows**: Game image thumbnail, name, price, discount badge, date added; clickable → opens Steam Store page in new tab
  - **Actions column**: External links (Steam Store, SteamDB) + TrashIcon delete button
  - **Empty states**: Contextual messages for "no games yet" vs "no games match filter" with CTA buttons

#### Router Configuration
- [`router.tsx`](frontend/src/router.tsx:1) fully configured with:
  - Public routes: `/login`, `/register` wrapped in `PublicRoute` component (redirects to `/dashboard` if authenticated)
  - Protected routes: `/dashboard`, `/wishlists`, `/wishlists/:id` wrapped in `ProtectedRoute` + `AppLayout`
  - Root path `/` uses `RootRedirect` component: authenticated → `/dashboard`, unauthenticated → `/login`
  - Catch-all `*` route redirects to `/`

#### AddGameDialog Implementation
- Modal dialog component in [`AddGameDialog.tsx`](frontend/src/features/wishlists/AddGameDialog.tsx:1) integrated into WishlistGamesPage:
  - Triggered by "Add Game" button in the page header and empty state
  - Input field accepts Steam AppID (e.g., "123456") or Steam store URL (e.g., "https://store.steampowered.com/app/123456/Game_Name")
  - URL/AppID parsing via `/app\/(\d+)/` regex, falling back to plain number parsing
  - Calls `usePostGameMutation` from [`wishlistApi.ts`](frontend/src/app/services/wishlistApi.ts:147)
  - On success: closes dialog, clears input, shows toast notification
  - On error: displays error toast (invalid input, game not found, duplicate, etc.)
- Replaced separate AddGamePage route with inline modal for simpler UX

#### RemoveGameDialog Implementation
- Confirmation dialog component in [`RemoveGameDialog.tsx`](frontend/src/features/wishlists/RemoveGameDialog.tsx:27) integrated into WishlistGamesPage:
  - Triggered by TrashIcon button in each row's Actions column
  - Shows game name in confirmation text with destructive styling (red TrashIcon, destructive button variant)
  - Calls `useDeleteGameMutation` from [`wishlistApi.ts`](frontend/src/app/services/wishlistApi.ts:137) with `{ gameId, wishlistId }`
  - Mutation invalidates `{ type: 'Wishlist', id: wishlistId }` (refreshes table) and `'Wishlist'` (refreshes sidebar game counts)
  - On success: closes dialog, shows success toast with game name
  - On error: displays error toast prompting retry
