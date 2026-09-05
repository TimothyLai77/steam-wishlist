# Price History Plan

## Context

SteamDB was acquired, so the app will track its own price history instead of
linking out. We're still alpha, which is the cheapest moment to restructure
the price-change data model.

## Decisions

- New `PriceHistory` table: one row per **price change event**
  (old/new price, old/new discount, timestamp). A step-line chart through the
  `newPrice` points is all a history view needs.
- **Drop `PriceChangeLog`.** `PriceHistory` is a superset of it, and the RSS
  feed is its only reader. The feed refactors to read from `PriceHistory`;
  nothing else in the app touches the table.
- **Retention: forever.** The 30-day purge goes away. The RSS feed's 30-day
  window is just a query filter and is unaffected.
- **All-time low** (lowest price + date) is *computed from history on demand*,
  not stored. Infinite retention means it's always derivable (an indexed
  `MIN` over one game's rows), and at this scale denormalizing buys nothing
  while adding a second source of truth.
- **Scope this round:** backend + exact RSS feature parity. UI is stubbed only
  (chart library and placement undecided).

## Steps

1. **Schema + migration** — add `PriceHistory`, remove `PriceChangeLog`;
   existing log rows migrate into history.
2. **Write path** — the single shared price-save helper writes the history
   row, also recording the *first* known price when a game is added (chart
   starting point).
3. **RSS parity** — feed query points at `PriceHistory`; rendered feed output
   is unchanged (only real drops shown — first-observation rows are excluded
   so adding a game doesn't create a spurious feed item).
4. **Remove the purge** — the daily job stops deleting old entries.
5. **History API** — one new authed endpoint: a game's price points plus its
   all-time low, ready for a future chart.
6. **UI stub** — frontend data hook + a placeholder per-game "Price history"
   affordance. No chart yet.
7. **Verify** — type-check/build both apps; smoke-test that the RSS feed and
   price behavior are identical to before, and the history endpoint returns
   correct data.

## Out of scope (for now)

- Chart rendering — pick a library later (leaning: not recharts).
- Final chart UI placement (per-game dialog vs. dedicated page).
- Updating the older planning docs to reflect the SteamDB decision.
