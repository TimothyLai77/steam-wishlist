# Steam Wishlist App - Planning Document

## 1. Project Overview

A private, self-hosted Steam wishlist management web application that allows 1-3 users to track their Steam game wishlists, prices, and discounts using Steam's official API.

### Core Goals
- Simple, private wishlist management separate from Steam's native system
- Support multi-user accounts (1-3 users) with secure login
- **Each user can create and manage multiple named wishlists (e.g., "Must Haves", "On Sale Watch", "Co-op Games")**
- Query real-time game data (price, discounts, release info) from Steam API
- Self-contained Docker Compose deployment
- Clean, modern UI with Ant Design

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
- **Framework:** React 18+
- **Language:** TypeScript
- **State Management:** Redux Toolkit + RTK Query
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **UI Library:** Ant Design 5.x
- **Build Tool:** Vite

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
- `GET /api/auth/me` — Get current user profile (protected)
- `POST /api/auth/logout` — Invalidate session / client-side token removal

### Wishlists
- `GET /api/wishlists` — List all wishlists for current user (protected)
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
6. **Add Game Page** — Simple form to enter a Steam AppID or Steam store URL, then add to a selected wishlist (or default wishlist)
7. **Game Detail Page** — Full game info (description, screenshots, which wishlists it's in) with links to:
   - Steam Store page
   - SteamDB price history

### State Management (Redux Toolkit)
- **authSlice** — User session state, JWT token
- **wishlistSlice / useWishlistApi** — RTK Query for CRUD operations on games
- **uiSlice** — Global UI state (modals, notifications, theme)

### Key UI Components (Ant Design)
- Layout: `Layout`, `Sider`, `Header`, `Content`
- Forms: `Form`, `Input`, `Button`, `Select`
- Tables: `Table` with pagination and sorting
- Cards: `Card` for game details and dashboard stats
- Modals: `Modal` for add/edit actions
- Notifications: `message`, `notification` for feedback
- Links: `Link`, `Button` for external links (Steam Store, SteamDB)
- Badges: `Tag` for discount indicators

### Routing (React Router)
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

## 8. Authentication Flow

1. User registers with username/password
2. Password is hashed using bcryptjs (cost factor 10-12)
3. On login, server validates credentials and issues JWT
4. JWT stored in HttpOnly cookie or localStorage (recommend localStorage for SPA simplicity)
5. Frontend Axios interceptor attaches JWT to protected requests
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
│   │   │   ├── games.routes.ts
│   │   │   └── admin.routes.ts
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── games.controller.ts
│   │   │   └── admin.controller.ts
│   │   ├── services/
│   │   │   ├── steam.service.ts     # Steam API calls
│   │   │   └── user.service.ts
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
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── router.tsx               # React Router setup
│       ├── store/                   # Redux Toolkit
│       │   ├── store.ts
│       │   ├── authSlice.ts
│       │   ├── api/
│       │   │   └── wishlistApi.ts   # RTK Query for games
│       │   └── uiSlice.ts
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   ├── RegisterPage.tsx
│       │   ├── DashboardPage.tsx
│       │   ├── WishlistPage.tsx
│       │   └── GameDetailPage.tsx
│       ├── components/
│       │   ├── Layout/
│       │   ├── GameCard.tsx
│       │   └── GameTable.tsx
│       ├── hooks/
│       │   └── useAuth.ts
│       ├── services/
│       │   └── axiosInstance.ts
│       └── types/
│           ├── game.ts
│           └── user.ts
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
- [ ] Implement user registration and login with JWT
- [ ] Initialize frontend with Vite + React + Redux Toolkit + Ant Design
- [ ] Create basic routing and protected route guards

### Phase 2: Core Wishlist Features
- [ ] Implement Steam API integration (fetch game details by AppID)
- [ ] CRUD endpoints for wishlists (create, list, update, delete)
- [ ] CRUD endpoints for wishlist games (add by AppID/URL)
- [ ] Frontend wishlists management page (list, create, delete wishlists)
- [ ] Frontend wishlist games page with table view
- [ ] Add game flow (paste AppID or URL → select wishlist → add)
- [ ] Default wishlist creation on user registration
- [ ] Move game between wishlists functionality

### Phase 3: Polish & UX
- [ ] Dashboard with summary stats
- [ ] Responsive design improvements
- [ ] User notes on games
- [ ] Error handling and loading states
- [ ] Theme support (dark/light mode)
- [ ] Add SteamDB price history links on game detail page

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
- Input validation with zod on all endpoints
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

### Current Progress (Phase 1 - Backend Foundation)

#### Completed
- [x] Backend initialized with Express + TypeScript + ES modules (`"type": "module"`)
- [x] TypeScript configured with `module: "NodeNext"`, `verbatimModuleSyntax: true`
- [x] Prisma schema defined (`User`, `Wishlist`, `WishlistGame` models)
- [x] Database migrated successfully with Prisma 7
- [x] Prisma client singleton set up with LibSQL adapter (`@prisma/adapter-libsql`)
- [x] Basic Express app running with `/health` and `/db` endpoints
- [x] Backend configured to run on port `4000`
- [x] Auth utilities created:
  - `utils/bcrypt.ts` — password hashing (`hashPassword`, `comparePassword`) with bcryptjs (cost factor 12)
  - `utils/jwt.ts` — JWT signing (`signToken`, `verifyToken`) using `jsonwebtoken` with 7-day expiry

#### Prisma 7 Specifics
- Datasource `url` moved from `schema.prisma` to `prisma.config.ts`
- PrismaClient requires a driver adapter for database connections
- Using `@prisma/adapter-libsql` with config object `{ url: DATABASE_URL }`
- Schema uses Prisma's `Int` type (no `@db.Int` native type for SQLite)

#### Module System
- Backend uses ES modules (`"type": "module"` in package.json)
- TypeScript config: `module: "NodeNext"`, `moduleResolution: "NodeNext"`, `verbatimModuleSyntax: true`
- `dotenv` loaded in both `index.ts` and `prisma.ts` to ensure env vars are available at import time

#### Next Steps
- Create auth middleware (`middleware/auth.middleware.ts`) — JWT validation for protected routes
- Implement auth routes (`routes/auth.routes.ts`) — register, login, me, logout
- Implement auth controller (`controllers/auth.controller.ts`) — user registration, login logic
- Set up input validation with zod on auth endpoints
