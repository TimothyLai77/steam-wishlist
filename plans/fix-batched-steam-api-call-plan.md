# Database Schema Refactor: Introduce Global Game Table

## Goal

Introduce a global `Game` table to centralize Steam game metadata and eliminate redundant data across wishlists. This enables:

- Single source of truth per Steam AppID
- No duplicate price refreshes for the same game across wishlists
- Cleaner separation between game metadata and wishlist-specific data

## Target Schema

### New Model: Game

Global table. One row per Steam AppID across all users.

```prisma
model Game {
  steamId          Int              @id @map("steam_id")
  name             String
  currentPrice     Decimal?         @map("current_price")
  originalPrice    Decimal?         @map("original_price")
  discountPercent  Int?             @map("discount_percent")
  currency         String           @default("USD") @map("currency")
  imageUrl         String?          @map("image_url")
  priceUpdatedAt   DateTime?        @map("price_updated_at")
  wishlistGames    WishlistGame[]
  createdAt        DateTime         @default(now()) @map("created_at")
  updatedAt        DateTime         @updatedAt      @map("updated_at")
}
```

### Updated Model: WishlistGame

Becomes a join/link table between `Wishlist` and `Game`. Only stores wishlist-specific data.

```prisma
model WishlistGame {
  gameId           Int
  wishlistId       String
  game             Game       @relation(fields: [gameId], references: [steamId], onDelete: Cascade)
  wishlist         Wishlist   @relation(fields: [wishlistId], references: [id], onDelete: Cascade)
  addedAt          DateTime   @default(now()) @map("added_at")
  notes            String?
  rank             Int        @default(0) @map("rank")

  @@id([gameId, wishlistId])
  @@map("wishlist_games")
}
```

### Unchanged Models

- `User` - no changes
- `Wishlist` - no changes

## Implementation Steps

### Step 1: Reset Prisma Migrations (Rebase to New Schema as Initial) ✅ COMPLETED

Since the app is in development with no deployed instances or real data, reset the migration history so the new schema becomes the "starting point":

1. Delete existing migration folders inside `backend/prisma/migrations/` (keep `migration_lock.toml`)
2. Update [`schema.prisma`](backend/prisma/schema.prisma) directly with the final target schema (new `Game` model, updated `WishlistGame` model)
3. Run `npx prisma migrate dev --create-only --name init` to generate a fresh initial migration
4. Verify the generated migration SQL creates:
   - `games` table with `steam_id` as primary key
   - `wishlist_games` table with composite key `(game_id, wishlist_id)` and foreign keys to both `games` and `wishlist`
5. Run `npx prisma migrate deploy` (or `npx prisma db push` in dev) to apply against the local database

This avoids writing a data migration script and gives a clean single migration as the project baseline.

**Notes:**
- Ran `prisma migrate reset --force` to clear drift from old migration history before generating new migration
- Generated migration: `20260803194039_init/migration.sql`

### Step 2: Update game.service.ts ✅ COMPLETED

Key changes in [`game.service.ts`](backend/src/services/game.service.ts):

1. **getGamesByWishlistId**
   - Query `WishlistGame` with `include: { game: true }`
   - Map response using `game.*` fields for metadata instead of `WishlistGame` columns
   - Keep `addedAt`, `notes` from `WishlistGame`

2. **addGameToWishlist**
   - First, upsert `Game` record by `steamId` (fetch from Steam API if not found or stale)
   - Then create `WishlistGame` linking the `wishlistId` and `gameId` (which is `steamId`)
   - Check uniqueness via `gameId_wishlistId` composite key instead of `steamId_wishlistId`

3. **refreshGamePrice / refreshWishlistPrices**
   - Query `Game` records where `priceUpdatedAt` is older than threshold (e.g., 1 hour)
   - Fetch fresh data from Steam API and update `Game` record only
   - All wishlists referencing that game automatically see updated prices

4. **Update GameSummary interface**
   - Change `steamId` source from `WishlistGame.steamId` to `Game.steamId`
   - Pull metadata fields from `Game` instead of `WishlistGame`

**Additional changes:**
- Updated `removeGameFromWishlist` to use `gameId_wishlistId` composite key
- Updated `moveGameToWishlist` to delete old `WishlistGame` and create new one with target wishlist (since composite key includes `wishlistId`), preserving `notes` and `rank`
- Updated `refreshAllUserGames` to deduplicate games across wishlists before refreshing
- Updated `refreshAllGames` to query `Game` records where `priceUpdatedAt` is null or older than 1 hour

### Step 3: Update wishlist.service.ts ✅ COMPLETED

Key changes in [`wishlist.service.ts`](backend/src/services/wishlist.service.ts):

1. **getWishlistById**
   - Include games via `games: { include: { game: true } }`
   - Map response to include game metadata from nested `game` object

2. **getAllGamesForUser**
   - Update flatten logic to read game metadata from `game` relation

3. **Update WishlistWithGames interface**
   - Game objects in the response now derive metadata from `Game`, not `WishlistGame`

### Step 4: Update Controllers ✅ COMPLETED (NO CHANGES NEEDED)

1. **game.controller.ts**
   - No changes needed. Service layer preserved external API contracts.
   - Endpoints still pass `steamId` (semantically same as `gameId` since `Game.steamId` is the PK)
   - Response shapes (`GameSummary`, `MoveGameResult`, `RefreshGamesResult`) unchanged

2. **wishlist.controller.ts**
   - No changes needed. Response shapes (`WishlistWithGames`, game arrays) unchanged

**Verification:** Backend TypeScript compiler (`npx tsc --noEmit`) passes with zero errors.

### Step 5: Update steam.service.ts ✅ COMPLETED (NO CHANGES NEEDED)

1. No fundamental changes required to Steam API calling logic
2. The batching/rate-limiting improvements (p-queue) mentioned in the issue are a separate but related enhancement
3. Ensure `fetchGameDetails` and `fetchGameDetailsBatch` return shapes compatible with `Game` model fields

**Verification:** `SteamGameDetails` interface fields are fully compatible with `Game` model fields.

### Step 6: Update Frontend Types and API Clients ✅ COMPLETED (NO CHANGES NEEDED)

1. **frontend/src/types/** - No changes needed (only `user.ts` exists)
2. **frontend/src/app/services/wishlistApi.ts** - Types (`GameSummary`, `WishlistWithGames`, `AllGamesGame`) match backend response shapes exactly
3. **frontend/src/features/wishlists/** - Components consume the same field names

**Verification:** Frontend TypeScript compiler (`npx tsc --noEmit`) passes with zero errors.

### Step 7: Testing ⏳ PENDING

1. Run existing tests and fix failures
2. Verify:
   - Adding a game to multiple wishlists creates one `Game` row and multiple `WishlistGame` rows
   - Refreshing price updates only the `Game` row
   - Deleting a `WishlistGame` does not delete the `Game` (use `onDelete: NoAction` or similar if needed, or keep `Cascade` only from `Game` → `WishlistGame`)
   - Queries for wishlist games still return correct, complete data

## Notes

- `Game.steamId` is the primary key, so `gameId` in `WishlistGame` is both a foreign key and semantically the Steam AppID
- The `rank` field on `WishlistGame` is added in preparation for future wishlist ranking/sorting features
- `priceUpdatedAt` on `Game` enables a simple staleness check for refresh logic without worrying about duplicates across wishlists
