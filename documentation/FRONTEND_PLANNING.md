# Frontend Planning - Steam Wishlist App

A private, self-hosted web application for tracking Steam game wishlists, prices, and discounts. Users can create multiple named wishlists, add games by Steam AppID, and view real-time pricing data from the Steam Store API.

## Tech Stack

- **Framework:** React 18+
- **Language:** TypeScript
- **Build Tool:** Vite
- **State Management:** Redux Toolkit + RTK Query
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **UI Components:** CultUI (built on shadcn/ui + Radix UI primitives)
- **Styling:** Tailwind CSS v4

**Note:** shadcn/ui components are installed into your codebase (`src/components/ui/`) via CLI, not as a runtime dependency. CultUI provides higher-level layout components on top of shadcn/ui primitives. Components are added incrementally as needed.

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

- **authSlice** — User session state, JWT token
- **useWishlistApi** — RTK Query for wishlist/game CRUD operations
- **uiSlice** — Global UI state (modals, notifications, theme)

---

## Key UI Components

- **Layout:** CultUI Dashboard layout (Sidebar + Header) + Tailwind CSS utility classes
- **Forms:** Controlled inputs with `useState` + shadcn/ui `Input`, `Button`, `Select`, `Textarea`
- **Tables:** Basic shadcn/ui `Table` (minimal implementation for now)
- **Cards:** shadcn/ui `Card` + CultUI dashboard cards
- **Modals:** shadcn/ui `Dialog`
- **Notifications:** shadcn/ui `Toast`
- **Navigation:** CultUI Sidebar/Header + shadcn/ui `Sheet` (mobile menu), `DropdownMenu`
- **Badges/Tags:** shadcn/ui `Badge` for discount indicators

---

## Authentication Flow (Client-Side)

1. User registers/logs in via form → POST to backend
2. On success, store JWT in localStorage
3. Axios interceptor attaches JWT (`Authorization: Bearer <token>`) to all protected requests
4. On `/api/401` response, clear token and redirect to `/login`
5. Protected routes check for token before rendering page

---

## Project Structure

```
frontend/
├── Dockerfile
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── components.json        # shadcn/ui config
├── index.html
├── public/
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── router.tsx         # React Router setup + protected route guards
    ├── store/
    │   ├── store.ts       # Redux store config
    │   ├── authSlice.ts   # Auth state + JWT handling
    │   ├── api/
    │   │   ├── wishlistApi.ts   # RTK Query endpoints
    │   │   └── gameApi.ts       # RTK Query endpoints
    │   └── uiSlice.ts     # UI state (modals, toasts, theme)
    ├── components/
    │   ├── ui/            # shadcn/ui components (auto-generated)
    │   ├── Layout/
    │   │   ├── AppLayout.tsx    # Main layout with sidebar + header
    │   │   └── ProtectedRoute.tsx
    │   ├── GameCard.tsx
    │   ├── GameTable.tsx
    │   └── ...            # Feature-specific components
    ├── pages/
    │   ├── LoginPage.tsx
    │   ├── RegisterPage.tsx
    │   ├── DashboardPage.tsx
    │   ├── WishlistsPage.tsx
    │   ├── WishlistGamesPage.tsx
    │   ├── AddGamePage.tsx
    │   └── GameDetailPage.tsx
    ├── hooks/
    │   ├── useAuth.ts
    │   └── ...
    ├── services/
    │   └── axiosInstance.ts  # Axios with auth interceptor
    ├── types/
    │   ├── game.ts
    │   ├── wishlist.ts
    │   └── user.ts
    └── index.css          # Tailwind base + shadcn/ui theme variables
```

---

## API Integration (RTK Query)

Base URL from env: `VITE_API_URL=http://localhost:4000/api`

### Endpoints needed:

**Auth:**
- `postRegister` — `/auth/register`
- `postLogin` — `/auth/login`
- `getProfile` — `/auth/profile`

**Wishlists:**
- `getWishlists` — `/wishlists`
- `postWishlist` — `/wishlists`
- `getWishlist` — `/wishlists/:wishlistId`
- `putWishlist` — `/wishlists/:wishlistId`
- `deleteWishlist` — `/wishlists/:wishlistId`

**Games:**
- `getGames` — `/wishlists/:wishlistId/games`
- `postGame` — `/wishlists/:wishlistId/games`
- `getGame` — `/games/:gameId`
- `putGame` — `/games/:gameId`
- `deleteGame` — `/games/:gameId`
- `moveGame` — `/games/:gameId/move`

---

## Development Tasks

### Phase 1: Setup
- [ ] Initialize Vite + React + TypeScript project
- [ ] Install and configure Tailwind CSS v4
- [ ] Initialize shadcn/ui (`npx shadcn@latest init`)
- [ ] Install and configure CultUI
- [ ] Install Redux Toolkit, RTK Query, React Router v6, Axios
- [ ] Set up Redux store, RTK Query api slice with base query
- [ ] Set up React Router with protected route guard
- [ ] Create axios instance with auth interceptor
- [ ] Create basic auth pages (Login, Register) wired to backend

### Phase 2: Core Features
- [ ] Implement CultUI Dashboard layout (Sidebar + Header)
- [ ] Wishlists Page (list, create, delete wishlists)
- [ ] Wishlist Games Page (table view with shadcn/ui Table)
- [ ] Add Game Page (form to add by AppID/URL)
- [ ] Wire up RTK Query endpoints for all CRUD operations
- [ ] Move game between wishlists functionality

### Phase 3: Polish
- [ ] Dashboard with summary stats
- [ ] Game Detail Page with screenshots + external links
- [ ] Responsive design improvements
- [ ] User notes on games
- [ ] Error handling and loading states
- [ ] Theme support (dark/light mode via CultUI)