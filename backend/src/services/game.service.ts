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

export interface GameDetail extends GameSummary {
  wishlistName: string;
  originalPrice: number | null;
  currency: string;
  addedAt: Date;
  priceUpdatedAt: Date | null;
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

export const getGameDetail = async (
  wishlistId: string,
  steamId: number,
  userId: string,
): Promise<GameDetail | null> => {
  const wishlist = await prisma.wishlist.findFirst({
    where: { id: wishlistId, userId },
  });

  if (!wishlist) {
    throw new Error('Wishlist not found');
  }

  const game = await prisma.wishlistGame.findUnique({
    where: { steamId_wishlistId: { steamId, wishlistId } },
  });

  if (!game) {
    return null;
  }

  return {
    id: `${game.steamId}+${game.wishlistId}`,
    steamId: String(game.steamId),
    wishlistId: game.wishlistId,
    wishlistName: wishlist.name,
    name: game.name,
    image: game.imageUrl,
    currentPrice: game.currentPrice?.toNumber() ?? null,
    originalPrice: game.originalPrice?.toNumber() ?? null,
    discountPercent: game.discountPercent ?? null,
    currency: game.currency,
    notes: game.notes,
    addedAt: game.addedAt,
    priceUpdatedAt: game.priceUpdatedAt,
    createdAt: game.addedAt,
  };
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

export const updateGameNotes = async (
  wishlistId: string,
  steamId: number,
  notes: string | null,
  userId: string,
): Promise<GameSummary> => {
  const wishlist = await prisma.wishlist.findFirst({
    where: { id: wishlistId, userId },
  });

  if (!wishlist) {
    throw new Error('Wishlist not found');
  }

  const game = await prisma.wishlistGame.update({
    where: { steamId_wishlistId: { steamId, wishlistId } },
    data: { notes },
  });

  if (!game) {
    throw new Error('Game not found in wishlist');
  }

  return {
    id: `${game.steamId}+${game.wishlistId}`,
    steamId: String(game.steamId),
    wishlistId: game.wishlistId,
    name: game.name,
    image: game.imageUrl,
    currentPrice: game.currentPrice?.toNumber() ?? null,
    discountPercent: game.discountPercent ?? null,
    notes: game.notes,
    createdAt: game.addedAt,
  };
};

export const removeGameFromWishlist = async (
  wishlistId: string,
  steamId: number,
  userId: string,
): Promise<boolean> => {
  const wishlist = await prisma.wishlist.findFirst({
    where: { id: wishlistId, userId },
  });

  if (!wishlist) {
    throw new Error('Wishlist not found');
  }

  await prisma.wishlistGame.delete({
    where: { steamId_wishlistId: { steamId, wishlistId } },
  });

  return true;
};

export const moveGameToWishlist = async (
  fromWishlistId: string,
  toWishlistId: string,
  steamId: number,
  userId: string,
): Promise<GameSummary> => {
  const fromWishlist = await prisma.wishlist.findFirst({
    where: { id: fromWishlistId, userId },
  });

  if (!fromWishlist) {
    throw new Error('Source wishlist not found');
  }

  const toWishlist = await prisma.wishlist.findFirst({
    where: { id: toWishlistId, userId },
  });

  if (!toWishlist) {
    throw new Error('Target wishlist not found');
  }

  const game = await prisma.wishlistGame.findUnique({
    where: { steamId_wishlistId: { steamId, wishlistId: fromWishlistId } },
  });

  if (!game) {
    throw new Error('Game not found in source wishlist');
  }

  const existingGame = await prisma.wishlistGame.findUnique({
    where: { steamId_wishlistId: { steamId, wishlistId: toWishlistId } },
  });

  if (existingGame) {
    throw new Error('Game already exists in target wishlist');
  }

  await prisma.wishlistGame.delete({
    where: { steamId_wishlistId: { steamId, wishlistId: fromWishlistId } },
  });

  const movedGame = await prisma.wishlistGame.create({
    data: {
      steamId: game.steamId,
      wishlistId: toWishlistId,
      name: game.name,
      currentPrice: game.currentPrice,
      originalPrice: game.originalPrice,
      discountPercent: game.discountPercent,
      currency: game.currency,
      imageUrl: game.imageUrl,
      notes: game.notes,
      priceUpdatedAt: game.priceUpdatedAt,
    },
  });

  return {
    id: `${movedGame.steamId}+${movedGame.wishlistId}`,
    steamId: String(movedGame.steamId),
    wishlistId: movedGame.wishlistId,
    name: movedGame.name,
    image: movedGame.imageUrl,
    currentPrice: movedGame.currentPrice?.toNumber() ?? null,
    discountPercent: movedGame.discountPercent ?? null,
    notes: movedGame.notes,
    createdAt: movedGame.addedAt,
  };
};
