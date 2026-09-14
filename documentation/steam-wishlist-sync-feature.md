# Feature: Steam Wishlist Sync

Import a user's public Steam wishlist into the app as a new synced wishlist.

## Overview

Users provide their Steam ID64. The app fetches their public Steam wishlist and creates/updates a new wishlist in the app called "Synced from Steam" (or similar). This is a **one-way sync**: the app reads from Steam, it doesn't push changes back.

## User Flow

1. User navigates to their Settings page
2. User enters their Steam ID64 and saves
3. User clicks "Import from Steam" button (in Settings or wishlist list)
4. App fetches the public Steam wishlist for that ID
5. App creates a new wishlist called "Synced from Steam" (or updates existing one)
6. App shows a confirmation: "Imported X games from Steam"

## Backend Changes

### Database Schema

The `User` model already has a `steamId` field. Add a field to the `Wishlist` model to track the Steam-synced wishlist:

```prisma
model Wishlist {
  // ... existing fields
  syncedFromSteam Boolean @default(false)
}
```

### New Endpoint: `POST /api/wishlists/sync-from-steam`

- **Auth:** Requires authentication
- **Input:** None (uses the user's saved `steamId`)
- **Logic:**
  1. Validate the user has a `steamId` saved
  2. Fetch the public wishlist from `https://api.steampowered.com/IWishlistService/GetWishlist/v1/?steamid={steamId}`
  3. Check for an existing wishlist with `syncedFromSteam: true` for this user
  4. If it exists, replace its games entirely with the new Steam wishlist contents
  5. If it doesn't exist, create a new wishlist called "Synced from Steam" and populate it with the Steam games
  6. Return the count of imported games
- **Errors:**
  - 400 if no `steamId` is saved
  - 502 if the Steam API request fails (e.g., wishlist is private or invalid ID)

### Steam API Integration

Create a new service function in `steam.service.ts`:

```typescript
export async function getSteamWishlist(steamId: string): Promise<{ game_ids: number[] }> {
  const response = await fetch(
    `https://api.steampowered.com/IWishlistService/GetWishlist/v1/?steamid=${steamId}`
  );
  // ... handle response, check for errors like "Wishlist is not public"
}
```

## Frontend Changes

### Settings Page

Add an input field for Steam ID64 in the existing Settings page:
- Label: "Steam ID64"
- Type: text
- Help text: "Your 17-digit Steam ID. Used for importing your public Steam wishlist."

### Import Button

Add a button to trigger the sync:
- Location: Settings page (primary) or wishlist list page (secondary)
- Label: "Import from Steam"
- Behavior: Call `POST /api/wishlists/sync-from-steam`

### Wishlist List Page

Display the synced wishlist with a visual indicator:
- Badge or icon next to the name to show it's Steam-synced
- Optional: "Last synced" timestamp

## Error Handling

- **Wishlist not public:** Show message "Your Steam wishlist must be set to Public to import it."
- **Invalid Steam ID:** Show message "Invalid Steam ID. Please check your 17-digit Steam ID64."
- **Network/API failure:** Show generic error message with retry option.

## Automated Daily Sync

The app should automatically re-import synced wishlists on a daily schedule to keep them up to date.

### Implementation

**Refactor:** Before adding the wishlist sync job, refactor the existing price refresh job (`src/services/price-refresh-job.ts`) into a general scheduler service (`src/services/scheduler.service.ts`). This new service should:

- Register multiple jobs
- Centralize scheduling configuration and environment variable handling
- Provide consistent logging and error handling for all scheduled tasks

Then add the wishlist sync as a new job to the scheduler:
1. Finds all users with `syncedFromSteam` wishlists
2. For each user, calls the same import logic as the manual sync endpoint
3. Logs the results (games imported, errors, etc.)

### Scheduling

Use the same `node-schedule` library and `RecurrenceRule` pattern as the existing price refresh job. The Steam sync job should run at a **different time** than the game price refresh to avoid hammering the Steam API:

- Game price refresh: 13:00 (default, configurable)
- Steam wishlist sync: 14:00 (default, configurable — offset 1 hour after price refresh)

### Environment Variables

Add new environment variables to configure the sync time, following the same pattern as `PRICE_REFRESH_HOUR`/`PRICE_REFRESH_MINUTE`:

```
# Steam wishlist sync schedule
STEAM_SYNC_HOUR=14          # Default: 14:00 (2 PM)
STEAM_SYNC_MINUTE=0         # Default: minute 0
STEAM_SYNC_TIMEZONE=America/New_York  # Same default as price refresh
```

This allows admins to adjust the sync time without code changes.

## Implementation Tasks

1. **Refactor price refresh job into general scheduler service**
   - Create `src/services/scheduler.service.ts`
   - Migrate existing price refresh job to use new scheduler
   - Centralize configuration and error handling

2. **Add `syncedFromSteam` field to Wishlist model**
   - Update Prisma schema
   - Run migration (migration might have to be manually run by the user. Prisma requires the migration to be run interactively)

3. **Implement Steam wishlist API service**
   - Add `getSteamWishlist` function to `src/services/steam.service.ts`
   - Handle error cases (private wishlist, invalid ID)

4. **Create sync-from-steam endpoint**
   - `POST /api/wishlists/sync-from-steam`
   - Find or create synced wishlist
   - Import games from Steam API

5. **Add automated daily sync job**
   - Register wishlist sync job with scheduler
   - Process all users with synced wishlists
   - Add `STEAM_SYNC_HOUR`, `STEAM_SYNC_MINUTE`, `STEAM_SYNC_TIMEZONE` env vars

6. **Update frontend: Settings page**
   - Add Steam ID64 input field
   - Add "Import from Steam" button

7. **Update frontend: Wishlist list page**
   - Show synced wishlist indicator
   - Optional: "Last synced" timestamp

## Future Enhancements (Not in Scope)

- Manual re-import button on the synced wishlist
