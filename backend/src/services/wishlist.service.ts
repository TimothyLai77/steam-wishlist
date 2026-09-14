import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/error.middleware.js";
import { getSteamWishlist, type SteamWishlistItem } from "../services/steam.service.js";

export interface CreateWishlistInput {
  name: string;
  description?: string;
}

export interface UpdateWishlistInput {
  name?: string;
  description?: string;
}

export interface WishlistResponse {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  gameCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WishlistWithGames extends WishlistResponse {
  games: Array<{
    steamId: number;
    name: string;
    currentPrice: number | null;
    originalPrice: number | null;
    discountPercent: number | null;
    imageUrl: string | null;
    notes: string | null;
    addedAt: Date;
    priceUpdatedAt: Date | null;
  }>;
}

/**
 * Get all wishlists for a user (with game counts).
 */
export const getWishlistsByUser = async (userId: string): Promise<WishlistResponse[]> => {
  const wishlists = await prisma.wishlist.findMany({
    where: { userId },
    include: {
      _count: {
        select: { games: true },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return wishlists.map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description,
    userId: w.userId,
    gameCount: w._count.games,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  }));
};

/**
 * Get a single wishlist by ID (with games).
 */
export const getWishlistById = async (
  wishlistId: string,
  userId: string
): Promise<WishlistWithGames | null> => {
  const wishlist = await prisma.wishlist.findFirst({
    where: { id: wishlistId, userId },
    include: {
      games: {
        include: { game: true },
        orderBy: { addedAt: "desc" },
      },
      _count: {
        select: { games: true },
      },
    },
  });

  if (!wishlist) {
    return null;
  }

  return {
    id: wishlist.id,
    name: wishlist.name,
    description: wishlist.description,
    userId: wishlist.userId,
    gameCount: wishlist._count.games,
    createdAt: wishlist.createdAt,
    updatedAt: wishlist.updatedAt,
    games: wishlist.games.map((wg) => ({
      steamId: wg.game.steamId,
      name: wg.game.name,
      currentPrice: wg.game.currentPrice?.toNumber() ?? null,
      originalPrice: wg.game.originalPrice?.toNumber() ?? null,
      discountPercent: wg.game.discountPercent,
      imageUrl: wg.game.imageUrl,
      notes: wg.notes,
      addedAt: wg.addedAt,
      priceUpdatedAt: wg.game.priceUpdatedAt,
    })),
  };
};

/**
 * Create a new wishlist.
 */
export const createWishlist = async (
  userId: string,
  input: CreateWishlistInput
): Promise<WishlistResponse> => {
  const trimmedName = input.name?.trim();
  if (!trimmedName || trimmedName.length === 0) {
    throw new AppError(400, "Wishlist name is required.");
  }

  const wishlist = await prisma.wishlist.create({
    data: {
      name: trimmedName,
      description: input.description?.trim() || null,
      userId,
    },
    include: {
      _count: {
        select: { games: true },
      },
    },
  });

  return {
    id: wishlist.id,
    name: wishlist.name,
    description: wishlist.description,
    userId: wishlist.userId,
    gameCount: wishlist._count.games,
    createdAt: wishlist.createdAt,
    updatedAt: wishlist.updatedAt,
  };
};

/**
 * Update a wishlist name or description
 */
export const updateWishlist = async (
  wishlistId: string,
  userId: string,
  input: UpdateWishlistInput
): Promise<WishlistResponse | null> => {
  const existing = await prisma.wishlist.findFirst({
    where: { id: wishlistId, userId },
  });

  if (!existing) {
    throw new AppError(404, "Wishlist not found.");
  }

  const wishlist = await prisma.wishlist.update({
    where: { id: wishlistId },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.description !== undefined && { description: input.description?.trim() || null }),
    },
    include: {
      _count: {
        select: { games: true },
      },
    },
  });

  return {
    id: wishlist.id,
    name: wishlist.name,
    description: wishlist.description,
    userId: wishlist.userId,
    gameCount: wishlist._count.games,
    createdAt: wishlist.createdAt,
    updatedAt: wishlist.updatedAt,
  };
};

/**
 * Get all games across all wishlists for a user (for dashboard stats).
 */
export const getAllGamesForUser = async (userId: string) => {
  const wishlists = await prisma.wishlist.findMany({
    where: { userId },
    include: {
      games: {
        include: { game: true },
        orderBy: { addedAt: "desc" },
      },
    },
  });

  // Flatten games with their wishlist info
  const allGames: Array<{
    steamId: number;
    name: string | null;
    currentPrice: number | null;
    originalPrice: number | null;
    discountPercent: number | null;
    addedAt: Date;
    wishlistId: string;
    wishlistName: string;
  }> = [];

  for (const wishlist of wishlists) {
    for (const wg of wishlist.games) {
      allGames.push({
        steamId: wg.game.steamId,
        name: wg.game.name,
        currentPrice: wg.game.currentPrice?.toNumber() ?? null,
        originalPrice: wg.game.originalPrice?.toNumber() ?? null,
        discountPercent: wg.game.discountPercent,
        addedAt: wg.addedAt,
        wishlistId: wishlist.id,
        wishlistName: wishlist.name,
      });
    }
  }

  return allGames;
};

/**
 * Delete a wishlist.
 */
export const deleteWishlist = async (
  wishlistId: string,
  userId: string
): Promise<{ success: boolean }> => {
  const existing = await prisma.wishlist.findFirst({
    where: { id: wishlistId, userId },
  });

  if (!existing) {
    throw new AppError(404, "Wishlist not found.");
  }

  await prisma.wishlist.delete({
    where: { id: wishlistId },
  });

  return { success: true };
};

export interface SyncFromSteamResult {
  wishlistId: string;
  imported: number;
}

/**
 * Find (or create) the user's "Synced from Steam" wishlist and replace its
 * contents entirely with the user's current public Steam wishlist.
 *
 * Games are imported with placeholder names (`Game <appid>`); the daily price
 * refresh job fills in real store data afterwards, which keeps this endpoint
 * well within Steam's rate limits (a single wishlist fetch per call).
 *
 * @param userId - Authenticated user performing the sync.
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
