import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/error.middleware.js";

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
    games: wishlist.games.map((g) => ({
      steamId: g.steamId,
      name: g.name,
      currentPrice: g.currentPrice?.toNumber() ?? null,
      originalPrice: g.originalPrice?.toNumber() ?? null,
      discountPercent: g.discountPercent,
      imageUrl: g.imageUrl,
      notes: g.notes,
      addedAt: g.addedAt,
      priceUpdatedAt: g.priceUpdatedAt,
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
