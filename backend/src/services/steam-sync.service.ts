import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/error.middleware.js";
import { getSteamWishlist, type SteamWishlistItem } from "./steam.service.js";

export interface SyncFromSteamResult {
  wishlistId: string;
  imported: number;
}

/**
 * Find (or create) the user's "Synced from Steam" wishlist and replace its
 * contents entirely with the user's current public Steam wishlist.
 *
 * Games are imported with placeholder names (`Game <appid>`); the daily price
 * refresh job fills in real store data afterwards, which keeps this call to a
 * single Steam wishlist fetch regardless of wishlist size.
 *
 * @param userId - The user to sync.
 * @returns The synced wishlist id and the number of imported games.
 * @throws {AppError} 404 USER_NOT_FOUND, 400 NO_STEAM_ID when the user has no
 *   Steam ID64 saved, and the task-3 codes (INVALID_STEAM_ID 400,
 *   WISHLIST_NOT_PUBLIC / STEAM_API_ERROR 502) when the Steam fetch fails.
 */
export const syncFromSteam = async (userId: string): Promise<SyncFromSteamResult> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, steamId: true },
  });

  if (!user) {
    throw new AppError(404, "User not found.", "USER_NOT_FOUND");
  }
  if (!user.steamId) {
    throw new AppError(
      400,
      "No Steam ID64 saved. Set your Steam ID in Settings first.",
      "NO_STEAM_ID",
    );
  }

  const items: SteamWishlistItem[] = await getSteamWishlist(user.steamId);

  // Find the existing synced wishlist, or create one.
  let wishlist = await prisma.wishlist.findFirst({
    where: { userId, syncedFromSteam: true },
    select: { id: true },
  });
  if (!wishlist) {
    wishlist = await prisma.wishlist.create({
      data: { userId, name: "Synced from Steam", syncedFromSteam: true },
      select: { id: true },
    });
  }

  const wishlistId = wishlist.id;

  await prisma.$transaction(async (tx) => {
    // Concurrent syncs can race the find-or-create above and produce
    // duplicates; keep the first and drop the rest (games cascade-delete).
    const synced = await tx.wishlist.findMany({
      where: { userId, syncedFromSteam: true },
      select: { id: true },
    });
    if (synced.length > 1) {
      await tx.wishlist.deleteMany({
        where: { id: { in: synced.slice(1).map((w) => w.id) } },
      });
    }

    // Ensure Game rows exist for every appid (placeholder for new ones).
    const existingGames = await tx.game.findMany({
      where: { steamId: { in: items.map((i) => i.appid) } },
      select: { steamId: true },
    });
    const existing = new Set(existingGames.map((g) => g.steamId));
    const missing = items.filter((i) => !existing.has(i.appid));
    if (missing.length > 0) {
      await tx.game.createMany({
        data: missing.map((i) => ({
          steamId: i.appid,
          name: `Game ${i.appid}`,
          currency: "USD",
        })),
      });
    }

    // Replace the synced wishlist's games entirely.
    await tx.wishlistGame.deleteMany({ where: { wishlistId } });
    await tx.wishlistGame.createMany({
      data: items.map((i) => ({
        gameId: i.appid,
        wishlistId,
        rank: i.priority,
        addedAt: new Date(i.date_added * 1000),
      })),
    });
  });

  return { wishlistId, imported: items.length };
};

export interface SteamSyncSummary {
  /** Users that have a syncedFromSteam wishlist. */
  users: number;
  /** Users whose wishlist was (re)imported successfully. */
  synced: number;
  /** Total games imported across successful syncs. */
  totalGames: number;
  /** Per-user failures, isolated so one bad user never aborts the run. */
  failed: { userId: string; code: string | null; message: string }[];
}

/**
 * Daily job body: find every user with a Steam-synced wishlist and re-import
 * it. Runs sequentially through the shared steamQueue budget; per-user errors
 * (private wishlist, missing steamId, ...) are collected in the summary
 * instead of aborting the run.
 *
 * @returns Aggregated outcome for logging.
 */
export const syncAllSteamWishlists = async (): Promise<SteamSyncSummary> => {
  const users = await prisma.user.findMany({
    where: { wishlists: { some: { syncedFromSteam: true } } },
    select: { id: true },
  });

  const summary: SteamSyncSummary = {
    users: users.length,
    synced: 0,
    totalGames: 0,
    failed: [],
  };

  for (const user of users) {
    try {
      const result = await syncFromSteam(user.id);
      summary.synced += 1;
      summary.totalGames += result.imported;
    } catch (err) {
      summary.failed.push({
        userId: user.id,
        code: err instanceof AppError ? (err.code ?? null) : null,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return summary;
};
