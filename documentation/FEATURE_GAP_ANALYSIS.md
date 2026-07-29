# Feature Gap Analysis - Steam Wishlist App

Generated: 2026-07-29 (Updated for final scope)

Comparison of [`PLANNING.md`](PLANNING.md:1) against actual implementation.

---

## Database Schema (Section 4) - COMPLETE

All three models match the plan exactly:

| Model | Planned Fields | Implementation Status |
|-------|---------------|----------------------|
| [`User`](backend/prisma/schema.prisma:12) | id, username, passwordHash, steamId?, wishlists[], createdAt, updatedAt | ✅ Complete |
| [`Wishlist`](backend/prisma/schema.prisma:22) | id, userId, user, name, description?, isDefault, games[], createdAt, updatedAt | ✅ Complete |
| [`WishlistGame`](backend/prisma/schema.prisma:34) | steamId, wishlistId, wishlist, name, currentPrice?, originalPrice?, discountPercent?, currency, imageUrl?, addedAt, priceUpdatedAt?, notes?, unique(steamId, wishlistId) | ✅ Complete |

---

## API Endpoints (Section 5) - CORE COMPLETE

### Authentication - CORE COMPLETE

| Endpoint | Planned | Status |
|----------|---------|--------|
| POST /api/auth/register | [`auth.routes.ts:7`](backend/src/routes/auth.routes.ts:7) | ✅ Implemented |
| POST /api/auth/login | [`auth.routes.ts:8`](backend/src/routes/auth.routes.ts:8) | ✅ Implemented |
| GET /api/auth/profile | [`auth.routes.ts:9`](backend/src/routes/auth.routes.ts:9) | ✅ Implemented |
| POST /api/auth/logout | Planned | ⚠️ Client-side only (plan notes client-side token removal) |

### Wishlists - COMPLETE

| Endpoint | Planned | Status |
|----------|---------|--------|
| GET /api/wishlists | [`wishlist.routes.ts:17`](backend/src/routes/wishlist.routes.ts:17) | ✅ Implemented |
| GET /api/wishlists/all-games | [`wishlist.routes.ts:18`](backend/src/routes/wishlist.routes.ts:18) | ✅ Implemented |
| POST /api/wishlists | [`wishlist.routes.ts:20`](backend/src/routes/wishlist.routes.ts:20) | ✅ Implemented |
| GET /api/wishlists/:wishlistId | [`wishlist.routes.ts:19`](backend/src/routes/wishlist.routes.ts:19) | ✅ Implemented |
| PUT /api/wishlists/:wishlistId | [`wishlist.routes.ts:21`](backend/src/routes/wishlist.routes.ts:21) | ✅ Implemented |
| DELETE /api/wishlists/:wishlistId | [`wishlist.routes.ts:22`](backend/src/routes/wishlist.routes.ts:22) | ✅ Implemented |

### Games - CORE COMPLETE

| Endpoint | Planned | Status |
|----------|---------|--------|
| GET /api/wishlists/:wishlistId/games | [`game.routes.ts:11`](backend/src/routes/game.routes.ts:11) | ✅ Implemented |
| POST /api/wishlists/:wishlistId/games | [`game.routes.ts:12`](backend/src/routes/game.routes.ts:12) | ✅ Implemented |
| GET /api/games/:gameId | Planned | ❌ Not implemented (dropped from scope) |
| PUT /api/games/:gameId | Planned | ❌ Not implemented (dropped with notes feature) |
| DELETE /api/games/:gameId | [`game.routes.ts:15`](backend/src/routes/game.routes.ts:15) | ✅ Implemented |
| POST /api/games/:gameId/move | [`game.routes.ts:16`](backend/src/routes/game.routes.ts:16) | ✅ Implemented |

### Admin - DROPPED FROM SCOPE

| Endpoint | Planned | Status |
|----------|---------|--------|
| GET /api/admin/users | Planned | ❌ Dropped (admin not needed) |
| DELETE /api/admin/users/:id | Planned | ❌ Dropped (admin not needed) |

---

## Frontend Pages (Section 7) - COMPLETE

| Page | Planned | Status |
|------|---------|--------|
| Login Page | [`LoginPage.tsx`](frontend/src/features/auth/LoginPage.tsx:1) | ✅ Implemented |
| Register Page | [`RegisterPage.tsx`](frontend/src/features/auth/RegisterPage.tsx:1) | ✅ Implemented |
| Dashboard | [`DashboardPage.tsx`](frontend/src/features/dashboard/DashboardPage.tsx:1) | ✅ Implemented |
| Wishlists Page | [`WishlistsPage.tsx`](frontend/src/features/wishlists/WishlistsPage.tsx:1) | ✅ Implemented |
| Wishlist Games Page | [`WishlistGamesPage.tsx`](frontend/src/features/wishlists/WishlistGamesPage.tsx:1) | ✅ Implemented |
| Add Game Dialog | [`AddGameDialog.tsx`](frontend/src/features/wishlists/AddGameDialog.tsx:1) | ✅ Implemented |

---

## Summary: Final Scope as of 2026-07-29

After discussion with the owner, the app scope has been finalized. **All Phase 3 and Phase 4 items are dropped.** The core wishlist management features (Phase 1-2) are complete.

### Intentionally Out of Scope (Dropped)

- User notes on games (Phase 3) - DB `notes` field remains but unused
- PUT /api/games/:gameId - Notes update endpoint not needed
- GET /api/games/:gameId - Single game detail page not needed (Steam/SteamDB links suffice)
- Admin routes - Not needed for 1-3 user private app
- Responsive design improvements - Current mobile support is sufficient
- Theme support (dark/light mode) - Phase 3, dropped
- Error handling polish - Current basic handling is acceptable
- Wishlist sharing links - Phase 4, dropped
- Export to CSV - Phase 4, dropped
- Steam profile integration - Phase 4, dropped
- Email notifications - Phase 4, dropped

### Minor Structural Gaps (Low Impact)

These are structural items from the plan that were never implemented but are not blocking:

- **uiSlice** - Planned global UI state. Currently: modals use inline useState (works fine).
- **hooks/useAuth.ts** - Planned convenience hook. Currently: components use useSelector directly.
- **types/wishlist.ts and types/game.ts** - Types are inline in [`wishlistApi.ts`](frontend/src/app/services/wishlistApi.ts:1) instead of dedicated files.

These are cosmetic/architectural preferences, not missing functionality.

---

## Conclusion

**The app is feature-complete for the agreed scope.** All core wishlist management features from Phase 1-2 are implemented and working:

- Multi-user auth with JWT
- Multiple named wishlists per user
- Add games via Steam AppID or URL
- Game details from Steam Store API (price, discount, image)
- Sort/filter games (on-sale filter, sort by name/price/discount/date)
- Remove games with confirmation
- Move games between wishlists
- Dashboard with summary stats
- Clean sidebar navigation with wishlist counts
