# Price Tracking Feature Plan

## Goal

Turn the existing `PriceChangeLog` into a permanent price history, so users can:

- See when a game's last sale was and what the sale price was.
- Look up what a game's price was at a point in the past (e.g. "what was it during last year's winter sale?").

## Design Decisions

- **Reuse `PriceChangeLog`; no new table.** It is already a delta log (one row only when `currentPrice` or `discountPercent` changed), which is exactly the shape needed for sale events and point-in-time lookups. A dense daily table would be ~90% duplicate rows and buys nothing these questions require.
- **Delta-only, kept forever.** Remove the 30-day purge so rows accumulate indefinitely.
- **One new column:** `originalPrice` (nullable Decimal) on `PriceChangeLog` — the list price at the moment of the change. Lets past rows render "was $60.00, $30.00 (-50%)" directly instead of back-calculating from the discount percent.
- **Write path stays as-is.** `saveGameWithPriceLog` is already the single helper used by all four price-update paths (fetch-on-add, per-wishlist refresh, per-user refresh, daily job). It only gains the new `originalPrice` field on the row it writes.
- **Sales are derived, not stored.** A sale period is any span where `discountPercent > 0`. Periods are computed at query time by folding that game's delta rows in order: a period starts when the discount goes 0/null → >0 and ends when it returns to 0/null (or is still ongoing). No `event`/`type` discriminator column — keeps the write path trivial.
- **Sale duration is implicit.** A period ends at the timestamp of the next change row (or is "ongoing" if there is none). Derived at read time, not stored.
- **RSS feed is unaffected.** It queries its own 30-day window; removing retention doesn't change feed behavior or its window.

## Components

### 1. Schema Change

- Add `originalPrice Decimal?` to `PriceChangeLog` (Prisma migration, SQLite).
- Existing rows backfill as `null` — fine, they're ≤30 days old and the column is optional.

### 2. Stop the Purge

- Remove the 30-day `deleteMany` retention step (and its constant) from the daily job in `price-refresh-job.ts`. The refresh itself is unchanged.

### 3. Write Path

- In `saveGameWithPriceLog`, include `originalPrice` (the incoming/new list price) in the `priceChangeLog.create` data alongside the existing old/new price and discount fields.

### 4. Price History Service (reads)

A new service (e.g. `price-history.service.ts`) with two read-only derivations from the delta rows, both per game:

- **Sale periods:** fold the game's rows (ordered by `timestamp`) into periods of `{ start, end | null (ongoing), price, discountPercent, originalPrice }`. Answers "last sale + how much" (most recent period) and the full sale history list.
- **Price at / during a date:** the effective price state at a date is defined by the latest change row at or before that date (`price`, `originalPrice`, `discountPercent`, and when it started). A date-range variant reports whether the state was constant across the range or changed within it. Answers "how much was it during last year's winter sale".

### 5. API

- New authenticated endpoint on `game.routes.ts`, e.g. `GET /games/:steamId/price-history` with optional query params (`date`, or `from`/`to`).
- Note: price history is per *game* (the `Game` row and its log are global, shared across wishlists/users), so this endpoint keys on `steamId` directly — unlike the existing delete/move routes, which key on the composite `steamId+wishlistId` because those are per-wishlist operations.

### 6. Frontend

- Per-game price history view, entered from the wishlist games table (row action opening a detail drawer or page).
- Shows:
  - Sale history: list of past sale periods (date range, sale price, discount, original price), most recent first; highlights the last sale.
  - Point-in-time lookup: a date picker returning the effective price state for that date.
- New API client method in `frontend/src/app/services` following the existing pattern.

### 7. Tests

- Unit tests for the history service: sale-period folding (start/end/ongoing, discount deepening mid-sale) and price-at-date lookup (before first row, between rows, after last row).
- Update/extend coverage for `saveGameWithPriceLog` now that it writes `originalPrice`.

## Known Limitations / Caveats

- **History starts now.** Rows older than 30 days were already purged and are unrecoverable from this database — the earliest lookups possible are from the day retention is removed. Backfilling from third parties (SteamDB, IsThereAnyDeal) is out of scope.
- **Daily polling can miss very short sales** (sub-day weekend deals). Multi-day sales are captured reliably. Polling more frequently during known sale windows is a config choice, not a schema change.
- **No continuous chart.** A delta log can't render a dense price-over-time line without forward-filling; that was explicitly de-prioritized.

## Out of Scope

- Dense daily price table / price charting.
- Historical backfill from external sources.
- Any RSS feed changes.

## Rough Task Breakdown

1. Migration: add `originalPrice` to `PriceChangeLog`.
2. Remove the purge from the daily price refresh job.
3. Write `originalPrice` in `saveGameWithPriceLog`.
4. Price history service: sale-period folding + price-at-date lookup.
5. API endpoint(s) + controller wiring.
6. Frontend price history view + API client.
7. Tests + documentation updates.
