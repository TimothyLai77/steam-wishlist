import { prisma } from '../config/prisma.js';
import { fetchGameDetails, fetchGameDetailsBatch } from './steam.service.js';

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
    game = await prisma.game.upsert({
      where: { steamId },
      update: {
        name: steamData.name,
        currentPrice: steamData.currentPrice,
        originalPrice: steamData.originalPrice,
        discountPercent: steamData.discountPercent,
        currency: steamData.currency,
        imageUrl: steamData.imageUrl,
        priceUpdatedAt: new Date(),
      },
      create: {
        steamId,
        name: steamData.name,
        currentPrice: steamData.currentPrice,
        originalPrice: steamData.originalPrice,
        discountPercent: steamData.discountPercent,
        currency: steamData.currency,
        imageUrl: steamData.imageUrl,
        priceUpdatedAt: new Date(),
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

  const wishlistGames = await prisma.wishlistGame.findMany({
    where: { wishlistId },
    select: { gameId: true },
  });

  if (wishlistGames.length === 0) {
    return { refreshed: 0, failed: 0 };
  }

  const uniqueGameIds = [...new Set(wishlistGames.map((wg) => wg.gameId))];
  const steamIds = uniqueGameIds.map((id) => String(id));
  const steamData = await fetchGameDetailsBatch(steamIds);

  let refreshed = 0;
  let failed = 0;

  for (const gameId of uniqueGameIds) {
    const id = String(gameId);
    const data = steamData[id];

    if (data) {
      await prisma.game.update({
        where: { steamId: gameId },
        data: {
          name: data.name,
          currentPrice: data.currentPrice,
          originalPrice: data.originalPrice,
          discountPercent: data.discountPercent,
          currency: data.currency,
          imageUrl: data.imageUrl,
          priceUpdatedAt: new Date(),
        },
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

  const steamIds = uniqueGameIds.map((id) => String(id));
  const steamData = await fetchGameDetailsBatch(steamIds);

  let refreshed = 0;
  let failed = 0;

  for (const gameId of uniqueGameIds) {
    const id = String(gameId);
    const data = steamData[id];

    if (data) {
      await prisma.game.update({
        where: { steamId: gameId },
        data: {
          name: data.name,
          currentPrice: data.currentPrice,
          originalPrice: data.originalPrice,
          discountPercent: data.discountPercent,
          currency: data.currency,
          imageUrl: data.imageUrl,
          priceUpdatedAt: new Date(),
        },
      });
      refreshed++;
    } else {
      failed++;
    }
  }

  return { refreshed, failed };
};

export const refreshAllGames = async (): Promise<RefreshGamesResult> => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const games = await prisma.game.findMany({
    where: {
      OR: [
        { priceUpdatedAt: null },
        { priceUpdatedAt: { lt: oneHourAgo } },
      ],
    },
    select: { steamId: true },
  });

  if (games.length === 0) {
    return { refreshed: 0, failed: 0 };
  }

  const steamIds = games.map((g) => String(g.steamId));
  const steamData = await fetchGameDetailsBatch(steamIds);

  let refreshed = 0;
  let failed = 0;

  for (const game of games) {
    const id = String(game.steamId);
    const data = steamData[id];

    if (data) {
      await prisma.game.update({
        where: { steamId: game.steamId },
        data: {
          name: data.name,
          currentPrice: data.currentPrice,
          originalPrice: data.originalPrice,
          discountPercent: data.discountPercent,
          currency: data.currency,
          imageUrl: data.imageUrl,
          priceUpdatedAt: new Date(),
        },
      });
      refreshed++;
    } else {
      failed++;
    }
  }

  return { refreshed, failed };
};
