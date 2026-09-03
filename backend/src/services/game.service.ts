import { prisma } from '../config/prisma.js';
import { fetchGameDetails, fetchGameDetailsBatch } from './steam.service.js';

// How long (in hours) before game data is considered stale (from env, default 3 hours)
const STALE_THRESHOLD_HOURS = parseInt(process.env.STEAM_GAME_STALE_HOURS ?? '3', 10);
const STALE_THRESHOLD_MS = STALE_THRESHOLD_HOURS * 60 * 60 * 1000;

export interface GameSummary {
  id: string;
  steamId: string;
  wishlistId: string;
  name: string;
  image: string | null;
  currentPrice: number | null;
  discountPercent: number | null;
  currency: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface AddGameResult {
  game: GameSummary;
  wasFetched: boolean;
}

export const getGamesByWishlistId = async (
  wishlistId: string,
  userId: string,
): Promise<GameSummary[]> => {
  const wishlist = await prisma.wishlist.findFirst({
    where: { id: wishlistId, userId },
  });

  if (!wishlist) {
    throw new Error('Wishlist not found');
  }

  const wishlistGames = await prisma.wishlistGame.findMany({
    where: { wishlistId },
    include: {
      game: true,
    },
    orderBy: { addedAt: 'desc' },
  });

  return wishlistGames.map((wg) => ({
    id: `${wg.game.steamId}+${wg.wishlistId}`,
    steamId: String(wg.game.steamId),
    wishlistId: wg.wishlistId,
    name: wg.game.name,
    image: wg.game.imageUrl,
    currentPrice: wg.game.currentPrice?.toNumber() ?? null,
    discountPercent: wg.game.discountPercent ?? null,
    currency: wg.game.currency || null,
    notes: wg.notes,
    createdAt: wg.addedAt,
  }));
};

/**
 * Persist freshly fetched game data and, when `currentPrice` or
 * `discountPercent` changed, record the change in `PriceChangeLog`.
 *
 * - Row exists and price/discount changed: insert a `PriceChangeLog` row and
 *   update the `Game` row in a single interactive transaction.
 * - Row exists but price/discount unchanged: update only the mutable
 *   non-price fields (name/currency/imageUrl); no log entry.
 * - Row does not exist: create the `Game` row; no log entry.
 */
export const saveGameWithPriceLog = async (
  steamId: number,
  data: {
    name: string;
    currentPrice: number | null;
    originalPrice: number | null;
    discountPercent: number | null;
    currency: string;
    imageUrl: string | null;
  },
) => {
  const existing = await prisma.game.findUnique({ where: { steamId } });

  if (!existing) {
    return prisma.game.create({
      data: {
        steamId,
        name: data.name,
        currentPrice: data.currentPrice,
        originalPrice: data.originalPrice,
        discountPercent: data.discountPercent,
        currency: data.currency,
        imageUrl: data.imageUrl,
      },
    });
  }

  const oldPrice = existing.currentPrice === null ? null : existing.currentPrice.toNumber();
  const newPrice = data.currentPrice === null ? null : data.currentPrice;
  const oldDiscount = existing.discountPercent === null ? null : existing.discountPercent;
  const newDiscount = data.discountPercent === null ? null : data.discountPercent;

  if (oldPrice !== newPrice || oldDiscount !== newDiscount) {
    return prisma.$transaction(async (tx) => {
      await tx.priceChangeLog.create({
        data: {
          gameId: steamId,
          oldPrice: existing.currentPrice,
          newPrice: data.currentPrice,
          oldDiscount: existing.discountPercent,
          newDiscount: data.discountPercent,
        },
      });

      return tx.game.update({
        where: { steamId },
        data: {
          name: data.name,
          currentPrice: data.currentPrice,
          originalPrice: data.originalPrice,
          discountPercent: data.discountPercent,
          currency: data.currency,
          imageUrl: data.imageUrl,
        },
      });
    });
  }

  return prisma.game.update({
    where: { steamId },
    data: {
      name: data.name,
      currency: data.currency,
      imageUrl: data.imageUrl,
    },
  });
};

export const addGameToWishlist = async (
  wishlistId: string,
  steamId: number,
  userId: string,
): Promise<AddGameResult> => {
  const wishlist = await prisma.wishlist.findFirst({
    where: { id: wishlistId, userId },
  });

  if (!wishlist) {
    throw new Error('Wishlist not found');
  }

  const existingGame = await prisma.wishlistGame.findUnique({
    where: { gameId_wishlistId: { gameId: steamId, wishlistId } },
    include: { game: true },
  });

  if (existingGame) {
    return {
      game: {
        id: `${existingGame.gameId}+${existingGame.wishlistId}`,
        steamId: String(existingGame.gameId),
        wishlistId: existingGame.wishlistId,
        name: existingGame.game.name,
        image: existingGame.game.imageUrl,
        currentPrice: existingGame.game.currentPrice?.toNumber() ?? null,
        discountPercent: existingGame.game.discountPercent ?? null,
        currency: existingGame.game.currency || null,
        notes: existingGame.notes,
        createdAt: existingGame.addedAt,
      },
      wasFetched: false,
    };
  }

  const steamData = await fetchGameDetails(String(steamId));

  let game;

  if (steamData) {
    game = await saveGameWithPriceLog(steamId, {
      name: steamData.name,
      currentPrice: steamData.currentPrice,
      originalPrice: steamData.originalPrice,
      discountPercent: steamData.discountPercent,
      currency: steamData.currency,
      imageUrl: steamData.imageUrl,
    });

    const wg = await prisma.wishlistGame.create({
      data: {
        gameId: steamId,
        wishlistId,
      },
    });

    return {
      game: {
        id: `${wg.gameId}+${wg.wishlistId}`,
        steamId: String(wg.gameId),
        wishlistId: wg.wishlistId,
        name: game.name,
        image: game.imageUrl,
        currentPrice: game.currentPrice?.toNumber() ?? null,
        discountPercent: game.discountPercent ?? null,
        currency: game.currency || null,
        notes: wg.notes,
        createdAt: wg.addedAt,
      },
      wasFetched: true,
    };
  } else {
    game = await prisma.game.upsert({
      where: { steamId },
      update: {},
      create: {
        steamId,
        name: `Game ${steamId}`,
      },
    });

    const wg = await prisma.wishlistGame.create({
      data: {
        gameId: steamId,
        wishlistId,
      },
    });

    return {
      game: {
        id: `${wg.gameId}+${wg.wishlistId}`,
        steamId: String(wg.gameId),
        wishlistId: wg.wishlistId,
        name: game.name,
        image: null,
        currentPrice: null,
        discountPercent: null,
        currency: null,
        notes: null,
        createdAt: wg.addedAt,
      },
      wasFetched: false,
    };
  }
};

export const removeGameFromWishlist = async (
  wishlistId: string,
  steamId: number,
  userId: string,
): Promise<void> => {
  const wishlist = await prisma.wishlist.findFirst({
    where: { id: wishlistId, userId },
  });

  if (!wishlist) {
    throw new Error('Wishlist not found');
  }

  const existingGame = await prisma.wishlistGame.findUnique({
    where: { gameId_wishlistId: { gameId: steamId, wishlistId } },
  });

  if (!existingGame) {
    throw new Error('Game not found in wishlist');
  }

  await prisma.wishlistGame.delete({
    where: { gameId_wishlistId: { gameId: steamId, wishlistId } },
  });
};

export interface MoveGameResult {
  success: boolean;
  moved: boolean;
}

export const moveGameToWishlist = async (
  sourceWishlistId: string,
  targetWishlistId: string,
  steamId: number,
  userId: string,
): Promise<MoveGameResult> => {
  if (sourceWishlistId === targetWishlistId) {
    throw new Error('Source and target wishlists are the same');
  }

  return await prisma.$transaction(async (tx) => {
    const sourceWishlist = await tx.wishlist.findFirst({
      where: { id: sourceWishlistId, userId },
    });
    if (!sourceWishlist) {
      throw new Error('Source wishlist not found');
    }

    const targetWishlist = await tx.wishlist.findFirst({
      where: { id: targetWishlistId, userId },
    });
    if (!targetWishlist) {
      throw new Error('Target wishlist not found');
    }

    const sourceGame = await tx.wishlistGame.findUnique({
      where: { gameId_wishlistId: { gameId: steamId, wishlistId: sourceWishlistId } },
    });
    if (!sourceGame) {
      throw new Error('Game not found in source wishlist');
    }

    const existingInTarget = await tx.wishlistGame.findUnique({
      where: { gameId_wishlistId: { gameId: steamId, wishlistId: targetWishlistId } },
    });

    if (existingInTarget) {
      await tx.wishlistGame.delete({
        where: { gameId_wishlistId: { gameId: steamId, wishlistId: sourceWishlistId } },
      });
      return { success: true, moved: false };
    }

    await tx.wishlistGame.delete({
      where: { gameId_wishlistId: { gameId: steamId, wishlistId: sourceWishlistId } },
    });

    await tx.wishlistGame.create({
      data: {
        gameId: steamId,
        wishlistId: targetWishlistId,
        notes: sourceGame.notes,
        rank: sourceGame.rank,
      },
    });

    return { success: true, moved: true };
  });
};

export interface RefreshGamesResult {
  refreshed: number;
  failed: number;
}

export const refreshGamesInWishlist = async (
  wishlistId: string,
  userId: string,
): Promise<RefreshGamesResult> => {
  const wishlist = await prisma.wishlist.findFirst({
    where: { id: wishlistId, userId },
  });

  if (!wishlist) {
    throw new Error('Wishlist not found');
  }

  const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS);

  // Get games in this wishlist that need refreshing (stale based on Game.updatedAt)
  const wishlistGames = await prisma.wishlistGame.findMany({
    where: { wishlistId },
    select: { gameId: true },
  });

  if (wishlistGames.length === 0) {
    return { refreshed: 0, failed: 0 };
  }

  const uniqueGameIds = [...new Set(wishlistGames.map((wg) => wg.gameId))];

  // Filter to only games that need refreshing based on Game.updatedAt
  const staleGames = await prisma.game.findMany({
    where: {
      steamId: { in: uniqueGameIds },
      updatedAt: { lt: staleThreshold },
    },
    select: { steamId: true },
  });

  if (staleGames.length === 0) {
    return { refreshed: 0, failed: 0 };
  }

  const staleGameIds = staleGames.map((g) => g.steamId);
  const steamIds = staleGameIds.map((id) => String(id));
  const steamData = await fetchGameDetailsBatch(steamIds);

  let refreshed = 0;
  let failed = 0;

  for (const gameId of staleGameIds) {
    const id = String(gameId);
    const data = steamData[id];

    if (data) {
      await saveGameWithPriceLog(gameId, {
        name: data.name,
        currentPrice: data.currentPrice,
        originalPrice: data.originalPrice,
        discountPercent: data.discountPercent,
        currency: data.currency,
        imageUrl: data.imageUrl,
      });
      refreshed++;
    } else {
      failed++;
    }
  }

  return { refreshed, failed };
};

export const refreshAllUserGames = async (
  userId: string,
): Promise<RefreshGamesResult> => {
  const wishlistGames = await prisma.wishlistGame.findMany({
    where: {
      wishlist: { userId },
    },
    select: { gameId: true },
  });

  const uniqueGameIds = [...new Set(wishlistGames.map((wg) => wg.gameId))];

  if (uniqueGameIds.length === 0) {
    return { refreshed: 0, failed: 0 };
  }

  const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS);

  // Filter to only games that need refreshing
  const staleGames = await prisma.game.findMany({
    where: {
      steamId: { in: uniqueGameIds },
      updatedAt: { lt: staleThreshold },
    },
    select: { steamId: true },
  });

  if (staleGames.length === 0) {
    return { refreshed: 0, failed: 0 };
  }

  const staleGameIds = staleGames.map((g) => g.steamId);
  const steamIds = staleGameIds.map((id) => String(id));
  const steamData = await fetchGameDetailsBatch(steamIds);

  let refreshed = 0;
  let failed = 0;

  for (const gameId of staleGameIds) {
    const id = String(gameId);
    const data = steamData[id];

    if (data) {
      await saveGameWithPriceLog(gameId, {
        name: data.name,
        currentPrice: data.currentPrice,
        originalPrice: data.originalPrice,
        discountPercent: data.discountPercent,
        currency: data.currency,
        imageUrl: data.imageUrl,
      });
      refreshed++;
    } else {
      failed++;
    }
  }

  return { refreshed, failed };
};

export const refreshAllGames = async (): Promise<RefreshGamesResult> => {
  const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS);

  const staleGames = await prisma.game.findMany({
    where: {
      updatedAt: { lt: staleThreshold },
    },
    select: { steamId: true },
  });

  if (staleGames.length === 0) {
    return { refreshed: 0, failed: 0 };
  }

  const staleGameIds = staleGames.map((g) => g.steamId);
  const steamIds = staleGameIds.map((id) => String(id));
  const steamData = await fetchGameDetailsBatch(steamIds);

  let refreshed = 0;
  let failed = 0;

  for (const game of staleGames) {
    const id = String(game.steamId);
    const data = steamData[id];

    if (data) {
      await saveGameWithPriceLog(game.steamId, {
        name: data.name,
        currentPrice: data.currentPrice,
        originalPrice: data.originalPrice,
        discountPercent: data.discountPercent,
        currency: data.currency,
        imageUrl: data.imageUrl,
      });
      refreshed++;
    } else {
      failed++;
    }
  }

  return { refreshed, failed };
};
