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

  const games = await prisma.wishlistGame.findMany({
    where: { wishlistId },
    orderBy: { addedAt: 'desc' },
    select: {
      steamId: true,
      wishlistId: true,
      name: true,
      imageUrl: true,
      currentPrice: true,
      discountPercent: true,
      currency: true,
      notes: true,
      addedAt: true,
    },
  });

  return games.map((game) => ({
    id: `${game.steamId}+${game.wishlistId}`,
    steamId: String(game.steamId),
    wishlistId: game.wishlistId,
    name: game.name,
    image: game.imageUrl,
    currentPrice: game.currentPrice?.toNumber() ?? null,
    discountPercent: game.discountPercent ?? null,
    currency: game.currency || null,
    notes: game.notes,
    createdAt: game.addedAt,
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
    where: { steamId_wishlistId: { steamId, wishlistId } },
  });

  if (existingGame) {
    return {
      game: {
        id: `${existingGame.steamId}+${existingGame.wishlistId}`,
        steamId: String(existingGame.steamId),
        wishlistId: existingGame.wishlistId,
        name: existingGame.name,
        image: existingGame.imageUrl,
        currentPrice: existingGame.currentPrice?.toNumber() ?? null,
        discountPercent: existingGame.discountPercent ?? null,
        currency: existingGame.currency || null,
        notes: existingGame.notes,
        createdAt: existingGame.addedAt,
      },
      wasFetched: false,
    };
  }

  const steamData = await fetchGameDetails(String(steamId));

  if (steamData) {
    const game = await prisma.wishlistGame.create({
      data: {
        steamId,
        wishlistId,
        name: steamData.name,
        currentPrice: steamData.currentPrice,
        originalPrice: steamData.originalPrice,
        discountPercent: steamData.discountPercent,
        currency: steamData.currency,
        imageUrl: steamData.imageUrl,
        priceUpdatedAt: new Date(),
      },
    });

    return {
      game: {
        id: `${game.steamId}+${game.wishlistId}`,
        steamId: String(game.steamId),
        wishlistId: game.wishlistId,
        name: game.name,
        image: game.imageUrl,
        currentPrice: game.currentPrice?.toNumber() ?? null,
        discountPercent: game.discountPercent ?? null,
        currency: game.currency || null,
        notes: game.notes,
        createdAt: game.addedAt,
      },
      wasFetched: true,
    };
  } else {
    const game = await prisma.wishlistGame.create({
      data: {
        steamId,
        wishlistId,
        name: `Game ${steamId}`,
      },
    });

    return {
      game: {
        id: `${game.steamId}+${game.wishlistId}`,
        steamId: String(game.steamId),
        wishlistId: game.wishlistId,
        name: game.name,
        image: null,
        currentPrice: null,
        discountPercent: null,
        currency: null,
        notes: null,
        createdAt: game.addedAt,
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
    where: { steamId_wishlistId: { steamId, wishlistId } },
  });

  if (!existingGame) {
    throw new Error('Game not found in wishlist');
  }

  await prisma.wishlistGame.delete({
    where: { steamId_wishlistId: { steamId, wishlistId } },
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
      where: { steamId_wishlistId: { steamId, wishlistId: sourceWishlistId } },
    });
    if (!sourceGame) {
      throw new Error('Game not found in source wishlist');
    }

    const existingInTarget = await tx.wishlistGame.findUnique({
      where: { steamId_wishlistId: { steamId, wishlistId: targetWishlistId } },
    });

    if (existingInTarget) {
      await tx.wishlistGame.delete({
        where: { steamId_wishlistId: { steamId, wishlistId: sourceWishlistId } },
      });
      return { success: true, moved: false };
    }

    await tx.wishlistGame.update({
      where: { steamId_wishlistId: { steamId, wishlistId: sourceWishlistId } },
      data: { wishlistId: targetWishlistId },
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

  const games = await prisma.wishlistGame.findMany({
    where: { wishlistId },
    select: { steamId: true },
  });

  if (games.length === 0) {
    return { refreshed: 0, failed: 0 };
  }

  const steamIds = games.map((g) => String(g.steamId));
  const steamData = await fetchGameDetailsBatch(steamIds);

  let refreshed = 0;
  let failed = 0;

  await prisma.$transaction(async (tx) => {
    for (const game of games) {
      const id = String(game.steamId);
      const data = steamData[id];

      if (data) {
        await tx.wishlistGame.update({
          where: { steamId_wishlistId: { steamId: game.steamId, wishlistId } },
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
  });

  return { refreshed, failed };
};

export const refreshAllUserGames = async (
  userId: string,
): Promise<RefreshGamesResult> => {
  const wishlists = await prisma.wishlist.findMany({
    where: { userId },
    select: { id: true },
  });

  let totalRefreshed = 0;
  let totalFailed = 0;

  for (const wishlist of wishlists) {
    const result = await refreshGamesInWishlist(wishlist.id, userId);
    totalRefreshed += result.refreshed;
    totalFailed += result.failed;
  }

  return { refreshed: totalRefreshed, failed: totalFailed };
};

export const refreshAllGames = async (): Promise<RefreshGamesResult> => {
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  let totalRefreshed = 0;
  let totalFailed = 0;

  for (const user of users) {
    const result = await refreshAllUserGames(user.id);
    totalRefreshed += result.refreshed;
    totalFailed += result.failed;
  }

  return { refreshed: totalRefreshed, failed: totalFailed };
};
