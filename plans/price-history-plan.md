# Price History Feature

Display the price history of a game added to a wishlist on the game detail page.

## Goals

- Show the price history of a game on the game detail page (presentation TBD, see Phase 3)
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
- Backfilled **initial rows** (`oldPrice` = NULL) represent "price as of first tracked", stamped with `Game.createdAt` (`priceUpdatedAt` is never written by any code path, so it is not a usable anchor).
- The table becomes **permanent**: the 30-day retention purge in `price-refresh-job.ts` is removed. Growth is negligible — a row only exists when something actually changed (Steam prices change a few times per year per game).

## Migration Plan (Phase 1)

1. **Pre-check:** `prisma migrate status` — confirm the dev DB is in sync. Known quirk: the init migration DDL declares `steam_id ... AUTOINCREMENT` while the schema declares a plain `Int @id`; if Prisma reports drift, decide whether to fix or ignore before proceeding.
2. **Schema:** add `originalPrice Decimal?` to the `PriceChangeLog` model in `backend/prisma/schema.prisma`.
3. **Generate:** `prisma migrate dev --name add_original_price_to_price_change_log` → `ALTER TABLE "PriceChangeLog" ADD COLUMN "originalPrice" DECIMAL` (safe on SQLite, no table rebuild) + regenerated client.
4. **Backfill** (one-time data migration, appended to the same migration file so DDL + data commit atomically):
   - One row per game where `currentPrice IS NOT NULL`
   - `oldPrice` / `oldDiscount` = NULL, `newPrice` = `currentPrice`, `newDiscount` = `discountPercent`
   - `originalPrice` = `Game.originalPrice` only when `discountPercent > 0`, else NULL
   - `timestamp` = `Game.createdAt`
   - Safe alongside real log rows: the backfilled row is chronologically first (`createdAt` ≤ any log timestamp) and becomes the chart's starting point.
   - Assumption (accepted): the backfilled price has been unchanged since the game was first tracked — earlier history is unknowable.

### Companion code changes (same step, or immediately after)

- **Remove the 30-day purge** in `price-refresh-job.ts` (the `deleteMany` block, `PRICE_CHANGE_LOG_RETENTION_MS`, and the "short-lived notification log" comment). Without this, chart history silently caps at 30 days.
- **Extend the writer** in `game.service.ts` to populate `originalPrice` on change (only when the new state is on sale, else NULL).

### Verification

- `prisma migrate status` clean, client regenerated
- Backfill row count = existing log rows + number of games with non-null `currentPrice`
- Spot-check one game: backfilled row first, then real change rows, values consistent with `Game`
- RSS feed still renders — backfilled rows have `oldPrice` = NULL and are excluded by the feed's price-drop filter, so no feed change needed
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
    { "date": "2026-01-15", "price": 59.99, "originalPrice": 59.99, "discountPercent": 0 },
    { "date": "2026-02-01", "price": 19.99, "originalPrice": 59.99, "discountPercent": 67 }
  ]
}
```

Implementation: `priceChangeLog.findMany({ where: { gameId, timestamp: { gte: since } }, orderBy: { timestamp: 'asc' } })`, each row mapped to a point from `newPrice` / `newDiscount` / `originalPrice`. `currency` comes from the `Game` row. Served entirely by the existing `(gameId, timestamp)` index; a game has very few points per year, so no pagination is needed.

## Frontend (Phase 3) — TBD

Stub: the frontend approach is still being decided. Whatever form it takes, it will consume `GET /api/games/:steamId/price-history` from Phase 2.

## Implementation Notes

- **No new daily job needed** — the existing daily price refresh plus the delta writer *is* the history recorder.
- Chart data is a step function: each point holds until the next change.
- The RSS feed reads a 30-day window from the same table; it is unaffected by the table becoming unbounded.
- Storage growth is negligible (deltas only).

## Phasing

- **Phase 1:** Migration (`originalPrice` column + backfill), remove 30-day purge, extend writer
- **Phase 2:** API endpoint
- **Phase 3:** Frontend (stub — design undecided)

## Edge Cases

- Game with no known price (`currentPrice` NULL): no backfill row; the chart is empty until the writer logs the first known price (oldPrice NULL → newPrice).
- Multiple changes in one day: supported (UUID PK, one row per change).
- Backfilled price may not reflect the true price at `Game.createdAt` time — accepted limitation.
- Single-currency app: per-point currency is not stored; historical points use the game's current `Game.currency`.
