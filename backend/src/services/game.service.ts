import { prisma } from '../config/prisma.js';
import { fetchGameDetails } from './steam.service.js';

export interface GameSummary {
  id: string;
  steamId: string;
  wishlistId: string;
  name: string;
  image: string | null;
  currentPrice: number | null;
  discountPercent: number | null;
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
        notes: null,
        createdAt: game.addedAt,
      },
      wasFetched: false,
    };
  }
};
