# Price History Feature

Display the price history of a game added to a wishlist on the game detail page.

Stack (orientation): Express + Prisma + SQLite backend under `backend/`; Vite + React + Redux Toolkit/RTK Query SPA under `frontend/`. All backend references below are to `backend/src/...`.

## Goals

- Show the price history of a game on the game detail page (presentation TBD, see Phase 3). Note: no game detail page exists in the frontend yet — `documentation/FRONTEND_PLANNING.md` already plans one at `/game/:steamId`; Phase 3 builds (or reuses) it
- Track **deltas only** — a record is written when a price/discount actually changes, not on a daily schedule (games can go months without a price change)
- Default display window: 90 days, max: 365 days
- Prices display in the game's currency from the `Game` table (the app is single-currency by design)

## Schema Design

Reuse the existing **`PriceChangeLog`** table as the permanent, delta-based price history. No new table.

Rationale:

- The existing writer (`game.service.ts`) already inserts a row only when `oldPrice !== newPrice || oldDiscount !== newDiscount` — it is already delta-based.
- The existing indexes (`(gameId, timestamp)`, `(timestamp)`) already cover the chart query patterns.
- A UUID PK is correct for this use: multiple changes in one day are possible (flash sales), which a per-day composite PK would have forbidden.

### Change: new `originalPrice` column

| Field | Type | Description |
|---|---|---|
| `originalPrice` | `Decimal?` | List price at the moment of the change (NULL = not on sale / unknown). Used for the "~~$59.99~~" strikethrough display in chart tooltips |

No PK change, no index changes. No `currency` column — currency is read from `Game` (accepted flaw: if a game's currency ever changes, historical points inherit the new label; the app only works in a single currency anyway).

### Semantics

- Each row = one price/discount change. A row's `newPrice` is the price in effect from its `timestamp` until the next row → the chart is a step function over the log rows.
- `timestamp` is when the change was **detected** (at add time, or by the daily refresh), not when Steam changed the price. Detection lag of up to ~1 day is inherent to the refresh model and is accepted.
- Backfilled **initial rows** (`oldPrice` = NULL) represent "price as of first tracked", stamped with `Game.createdAt` (`priceUpdatedAt` is never written by any code path, so it is not a usable anchor).
- The table becomes **permanent**: the 30-day retention purge in `price-refresh-job.ts` is removed. Growth is negligible — a row only exists when something actually changed (Steam prices change a few times per year per game).

## Migration Plan (Phase 1)

1. **Pre-check:** `prisma migrate status` — confirm the dev DB is in sync (verified 2026-09-05: "Database schema is up to date!", no drift). Known quirk: the init migration DDL declares `steam_id ... AUTOINCREMENT` while the schema declares a plain `Int @id`. If Prisma ever reports drift, decide whether to fix or ignore before proceeding — and use `migrate dev --create-only` + `migrate deploy` rather than a plain `migrate dev` so a drift finding cannot trigger a dev DB reset.
2. **Schema:** add `originalPrice Decimal?` to the `PriceChangeLog` model in `backend/prisma/schema.prisma`.
3. **Generate:** `prisma migrate dev --name add_original_price_to_price_change_log` → `ALTER TABLE "PriceChangeLog" ADD COLUMN "originalPrice" DECIMAL` (safe on SQLite, no table rebuild) + regenerated client.
4. **Backfill** (one-time data migration, appended to the same migration file so DDL + data commit atomically):
   - One row per game where `currentPrice IS NOT NULL`
   - `oldPrice` / `oldDiscount` = NULL, `newPrice` = `currentPrice`, `newDiscount` = `discountPercent`
   - `originalPrice` = `Game.originalPrice` only when `discountPercent > 0`, else NULL
   - `timestamp` = `Game.createdAt`
   - Safe alongside real log rows: the backfilled row is chronologically first (`createdAt` ≤ any log timestamp) and becomes the chart's starting point.
   - Assumption (accepted): the backfilled price has been unchanged since the game was first tracked — earlier history is unknowable.
   - **Feed side effect (accepted):** a backfilled row matches the feed's "first known price" pattern (`oldPrice` NULL + known `newPrice`), and `isPriceDrop` in `rss.service.ts` *includes* that case. So every game whose `createdAt` falls inside the feed's 30-day window produces one "Price changed to…" feed item after the backfill. Accepted as one-time, bounded noise — no feed code change, no discriminator column.

### Companion code changes (same step, or immediately after)

- **Remove the 30-day purge** in `price-refresh-job.ts` (the `deleteMany` block, `PRICE_CHANGE_LOG_RETENTION_MS`, and the "short-lived notification log" comment). Without this, chart history silently caps at 30 days.
- **Extend the writer** in `game.service.ts` to populate `originalPrice` on change (only when the new state is on sale, else NULL). The Steam fetch already returns `originalPrice` as NULL when not on sale (`steam.service.ts`), so the log insert can use it directly.
- **Fix the stale comment** in `rss.service.ts`: `FEED_WINDOW_DAYS` says "(matches the log retention window)", which is false once the purge is removed — reword it to describe the feed window as an independent choice.

### Verification

- `prisma migrate status` clean, client regenerated
- Backfill row count = existing log rows + number of games with non-null `currentPrice`
- Spot-check one game: backfilled row first, then real change rows, values consistent with `Game`
- RSS feed still renders. The only new feed items are the accepted one-time "Price changed to…" entries for games whose `createdAt` is inside the last 30 days (see backfill note above) — verify the count matches exactly those games
- Refresh job runs without the purge block

## API Design (Phase 2)

### `GET /api/games/:steamId/price-history`

Query params:

| Param | Default | Max | Description |
|---|---|---|---|
| `days` | 90 | 365 | How many days of history to return |

Response:

```json
{
  "gameId": 12345,
  "currency": "USD",
  "points": [
    { "timestamp": "2026-01-15T13:00:00.000Z", "price": 59.99, "originalPrice": 59.99, "discountPercent": 0 },
    { "timestamp": "2026-02-01T13:00:05.000Z", "price": 19.99, "originalPrice": 59.99, "discountPercent": 67 }
  ]
}
```

Points carry full ISO **timestamps** (not date-only) so multiple changes on the same day keep distinct positions and order in the step chart.

Implementation: new route on the existing Express app — add `GET /games/:steamId/price-history` to `backend/src/routes/game.routes.ts` (mounted at `/api`, so the full path is `/api/games/:steamId/price-history`), handler in `backend/src/controllers/game.controller.ts`. All game routes already sit behind the `authenticate` middleware; this endpoint inherits JWT auth (the frontend's RTK Query base query injects the token automatically). Prisma query in `game.service.ts`: `priceChangeLog.findMany({ where: { gameId, timestamp: { gte: since } }, orderBy: { timestamp: 'asc' } })`, each row mapped to a point from `newPrice` / `newDiscount` / `originalPrice` (Prisma `Decimal` → number via `.toNumber()`). `currency` comes from the `Game` row; unknown `steamId` (no `Game` row) → 404. Served entirely by the existing `(gameId, timestamp)` index; a game has very few points per year, so no pagination is needed.

## Frontend (Phase 3) — TBD

Stub: the presentation approach is still being decided. Whatever form it takes, it will consume `GET /api/games/:steamId/price-history` from Phase 2.

Orientation for whoever picks this up — the frontend is a Vite + React Router + Redux Toolkit/RTK Query SPA under `frontend/` (not Next.js):

- No game detail page exists yet (routes are only `/dashboard`, `/wishlists`, `/wishlists/:id`). `documentation/FRONTEND_PLANNING.md` already plans a Game Detail Page at `/game/:steamId` — build that page here, or embed the chart in an existing page if the design lands elsewhere.
- API access goes through the central RTK Query instance (`frontend/src/app/services/api.ts`, base URL `/api`, JWT auto-injection); add the price-history endpoint via `injectEndpoints` in a domain service file (e.g. a new `frontend/src/app/services/gameApi.ts` alongside `wishlistApi.ts`).

## Implementation Notes

- **No new daily job needed** — the existing daily price refresh plus the delta writer *is* the history recorder.
- Chart data is a step function: each point holds until the next change.
- The RSS feed reads a 30-day window from the same table; it is unaffected by the table becoming unbounded.
- Storage growth is negligible (deltas only).

## Phasing

- **Phase 1:** Migration (`originalPrice` column + backfill), remove 30-day purge, extend writer, fix stale feed-window comment
- **Phase 2:** API endpoint (Express route on the existing authenticated game router)
- **Phase 3:** Frontend (stub — design undecided; the game detail page it lives on doesn't exist yet)

## Edge Cases

- Game with no known price (`currentPrice` NULL): no backfill row; the chart is empty until the writer logs the first known price (oldPrice NULL → newPrice).
- Multiple changes in one day: supported (UUID PK, one row per change). The API returns full timestamps so same-day points don't collapse (see Phase 2).
- Backfilled price may not reflect the true price at `Game.createdAt` time — accepted limitation.
- Single-currency app: per-point currency is not stored; historical points use the game's current `Game.currency`.
