# RSS Feed Branch — Review Notes

Reviewed: `rss-feeds` (21 commits since `dev` @ `9d5f7df`) against `plans/rss-feed-feature-plan.md`.
Mode: static review only, **no code was modified**.
Verified read-only: `tsc --noEmit` (backend) ✅, `tsc -b` (frontend) ✅, ESLint on new/changed frontend files ✅.

---

## 🔴 Critical

### 1. Docker production no longer serves the frontend (regression)

`backend/src/index.ts:83` (commit `bb11cf4`):

```ts
const frontendDist = path.join(projectRoot, "frontend", "dist"); // projectRoot = path.resolve(__dirname, "../..")
```

This is correct for the local monorepo layouts (`backend/src` via tsx, `backend/dist` compiled),
but the **Dockerfile hoists the backend to `/app`** (code at `/app/dist`, frontend at `/app/frontend/dist`).
In the container, `__dirname` = `/app/dist`, so `projectRoot` resolves to `/` and
`frontendDist` = `/frontend/dist` — which does not exist.

Consequences with `APP_ENV=production` (docker-compose):

- `express.static('/frontend/dist')` serves nothing.
- The SPA fallback `res.sendFile('/frontend/dist/index.html')` (line 92) 404s **every** page route.
- The app's entire frontend is unreachable in the deployed image.

The old code (`path.resolve(__dirname, "../frontend/dist")` → `/app/frontend/dist`) was correct in
Docker and only broken locally — the "fix" traded the local bug for the production bug.
The comment at lines 78–82 ("correct for both the tsx (src/) and compiled (dist/) layouts") is wrong
for the Docker layout.

Suggested direction (when fixing): probe both candidates and take the first that exists, e.g.
`path.join(__dirname, "../frontend/dist")` (Docker + local `backend/dist`) vs
`path.join(projectRoot, "frontend", "dist")` (local tsx), or pass the dist location explicitly in the Dockerfile.

Note: `GET /rss` itself still resolves in Docker (registered before the fallback) — but the app behind it doesn't load.

---

## 🟠 Spec deviations

### 2. Reveal animation does not replay on "Regenerate link"

Plan Task 8 DoD: "Regenerate link → same confirm → **new URL shown with the reveal**".

`frontend/src/features/rss/RssSettingsDialog.tsx:183` — the chip carries
`justCreated ? 'animate-in fade-in-0 duration-150 …' : ''`, but the chip element stays mounted
across a regeneration and `justCreated` is already `true`, so the class never changes and the CSS
animation does not restart. First creation animates; regeneration does not.
Simplest fix: put `key={feedUrl}` on the chip wrapper so it remounts per link.

### 3. `@types/feed` not added (Task 2 DoD, literal)

Plan: "add `feed` + `@types/feed` … `@types/feed` in `devDependencies`".
Only `feed@^6.0.0` was installed. Harmless in practice: `feed@6` ships its own typings
(`"types": "lib/feed.d.ts"` in its package.json) and `tsc` passes — the spec's requirement predates
that. Either accept the deviation or install `@types/feed` to match the letter of the plan.

### 4. `priceUpdatedAt` is now never written anywhere

The plan calls the staleness quirk "pre-existing, out of scope" — but the **only** place that ever
wrote `priceUpdatedAt` was the `addGameToWishlist` upsert, which Task 3's `saveGameWithPriceLog`
replaced (the helper's data shape has no `priceUpdatedAt`). After this branch the column is always
`null`. No frontend code reads it (only echoed in the wishlist API DTO from
`wishlist.service.ts:106`), so impact is low — but it is a behaviour change beyond the plan's stated
scope, and the plan's "pre-existing quirk" note is factually wrong. Decide: restore the write in the
helper, or drop the field from the DTO and note the spec correction.

---

## 🟠 Setup footgun (will bite on first manual test)

### 5. Default `APP_URL` produces a 404ing feed link in the default dev setup

`rss.service.ts` `getAppUrl()` defaults to `http://localhost:5173`, so the one-time link handed to
the user is `http://localhost:5173/rss?token=…`. But `frontend/vite.config.ts` only proxies `/api`
to the backend — `/rss` on :5173 is not proxied and 404s. The implementation matches the spec
exactly (spec Open Questions even call this out), but the spec's default is wrong for the only
configuration that works out of the box. Two cheap options:

- add `/rss` to the vite `proxy` (one line, mirrors `/api`), or
- default `APP_URL` to the backend origin in dev.

---

## Scope creep (not in the plan; judgement calls)

6. **`frontend/vite.config.ts:12` — `host: true`** binds the dev server to all interfaces with no
   `allowedHosts` (added in `7b4eb3d`, allowlist removed in `edb6a34`). Exposes the dev app to the
   LAN. Fine if intentional for VM testing; consider scoping to the LAN IP or restoring
   `allowedHosts` before this pattern is copied elsewhere.
7. **`backend/src/index.ts:84` — SPA serving extended to dev mode** (`isProduction || hasFrontendBuild`).
   Not in the plan. Side effect: if a developer has ever run `npm run build` in `frontend/`, the
   backend in dev mode now serves that stale build + SPA fallback on :4000, which can mask what the
   vite dev server is doing. Useful for "build + serve" testing, but be aware.
8. **`rss.service.ts:227-230` — `orderBy` adds `{ id: 'desc' }`** as a tie-breaker beyond the spec's
   `orderBy: { timestamp: 'desc' }`. Harmless determinism improvement; noting for completeness.

---

## Standards findings

Repo standards checked: `AGENTS.md` (ES6+/arrow functions) + global doc standard (JSDoc with
explicit `@param`/`@returns`).

9. **Missing `@param`/`@returns` JSDoc tags** (documented standard; judgement call because the
   pre-existing codebase uses zero `@param` tags and `rss.service.ts` in this same diff follows the
   standard fully — the new code is inconsistent with itself):
   - `backend/src/services/rss-cache.ts` — `getRssCache`, `setRssCache`, `getRssCacheSize`,
     `clearRssCache` have summaries only; `evictExpired` has no JSDoc.
   - `backend/src/controllers/rss.controller.ts` — both handlers: summary, no `@param`/`@returns`.
   - `backend/src/services/game.service.ts` — `saveGameWithPriceLog`: summary, no tags.
   - `frontend/src/features/rss/RssSettingsDialog.tsx` — `reset`, `handleGenerate`,
     `handleConfirmCreate`, `handleCopy` have `@returns` but no `@param`.
10. **Arrow-function standard: ✅** all new backend/frontend code uses arrow-function consts;
    nothing to flag. (Pre-existing `export function startPriceRefreshJob` untouched.)

Smell baseline (all judgement calls):

11. **Duplicated domain constant** — the 30-day window is encoded twice: `FEED_WINDOW_DAYS`
    (`rss.service.ts:9`) and `PRICE_CHANGE_LOG_RETENTION_MS` (`price-refresh-job.ts:6`). One shared
    constant would keep retention and feed window from drifting apart.
12. **Speculative generality (minor)** — `getRssCacheSize`/`clearRssCache` are exported "intended
    for tests" but this branch has no tests; `validateToken` selects `username`
    (`rss.service.ts:199`) which is never used.
13. **Similar-name state** — `hasCopied` (lives until the link is copied/reset) vs `copied`
    (1.5 s button feedback) in `RssSettingsDialog.tsx`. One word apart, different lifetimes; a
    rename (e.g. `copyFlash`) would prevent future mix-ups.
14. **Style blemish** — `import { existsSync } from "fs"` sits mid-file after executable statements
    in `index.ts:18` (works via ESM hoisting, but breaks the file's top-imports pattern).
    Quote style is also mixed (new files single-quoted, `index.ts`/middleware double-quoted);
    pre-existing, no tooling enforces it — noted only.

Performance note (not a defect): `saveGameWithPriceLog` does `findUnique` + write per game, doubling
query count vs the old single `update` in the three refresh paths. Fine for wishlist-sized N on
local SQLite; worth remembering if the daily job ever grows.

---

## Verified OK (spot-checked against the spec)

- Schema + migration match the plan exactly (model, indexes, `onDelete: Cascade`, `rssTokenHash @unique`).
- `saveGameWithPriceLog` wired into **all four** price-write paths; transactional log+update; null-safe comparisons.
- Daily-job cleanup matches (`deleteMany` older than 30 days, logged, isolated try/catch).
- Cache module: 5-min TTL, 500-entry cap, evict-expired-then-earliest-expiring; keyed by `userId`.
- Token flow: `randomBytes(32).hex`, SHA-256 stored, rotation overwrites hash; 401 via `AppError`
  for missing *and* invalid tokens; `Content-Type`/`Cache-Control` headers as specified.
- Route order: `/rss` registered before the SPA fallback in `index.ts`.
- Feed query: 30-day window, user's wishlists only, `take: 50`, includes wishlist names (deduped, ordered).
- Feed content: generic title, currency-aware prices, store link, drop-only filter (increases stay logged).
- Frontend: trigger above Logout inside `sidebarContent()` (both desktop + mobile), collapsed
  icon-only + tooltip, `sm:max-w-md`, ticket chip styling per contract (dashed `--accent-border`,
  `--code-bg`, `font-heading`, "shown once" tag), `role="status"` copy feedback, exact confirm
  copy for create/rotate and close guard, error line under description on both faces,
  no localStorage, mobile-sheet close callback wired.
- Stacked-dialog concern (ConfirmDialog over an open Dialog): Base UI routes dismiss (Esc/outside
  click) to the topmost layer only, and the close guard re-opens the confirm if the dialog ever
  closes underneath — so an un-copied link cannot be silently lost. Still worth a manual pass.

---

## Manual test checklist (branch is untested)

- [ ] **Docker**: `docker compose up` → load `/` and a wishlist page (expected: **404** — finding #1).
- [ ] **Dev feed link**: create a link and paste into a reader (expected: 404 on :5173 — finding #5).
- [ ] Refresh with a real price change → `PriceChangeLog` row; unchanged → no row.
- [ ] Game in two wishlists → one feed item listing both names.
- [ ] Second `GET /rss` within 5 min served from cache (no log line exists for cache hits — verify via DB query count or temp logging).
- [ ] Regenerate → old token 401s; **check whether the reveal animation plays** (expected: it doesn't — finding #2).
- [ ] Close guard: X / Esc / backdrop with an un-copied link; unguarded after copy.
- [ ] Esc while a ConfirmDialog is stacked over the dialog (should close only the confirm).
- [ ] Copy on a plain-`http` origin (LAN IP, enabled by `host: true`): Clipboard API is unavailable — Copy currently fails **silently**; confirm that's acceptable or surface a hint.
- [ ] `prefers-reduced-motion` skips the chip fade.
