import { api } from './api';

// TODO: Define proper types in types/wishlist.ts
export interface Wishlist {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  gameCount: number;
}

export interface CreateWishlistPayload {
  name: string;
}

export interface UpdateWishlistPayload {
  name?: string;
}

export interface WishlistWithGames extends Wishlist {
  games: GameSummary[];
}

export interface GameSummary {
  id: string;
  steamId: string;
  wishlistId: string;
  name?: string;
  image?: string;
  currentPrice?: number;
  discountPercent?: number;
  notes?: string;
  createdAt: string;
}

export interface AllGamesGame {
  steamId: number;
  name: string | null;
  currentPrice: number | null;
  originalPrice: number | null;
  discountPercent: number | null;
  addedAt: string;
  wishlistId: string;
  wishlistName: string;
}

export const wishlistApi = api.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get all wishlists for the current user
     */
    getWishlists: builder.query<Wishlist[], void>({
      query: () => '/wishlists',
      providesTags: ['Wishlist'],
    }),

    /**
     * Create a new wishlist
     */
    postWishlist: builder.mutation<Wishlist, CreateWishlistPayload>({
      query: (payload) => ({
        url: '/wishlists',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Wishlist'],
    }),

    /**
     * Get a single wishlist by ID (with games)
     */
    getWishlist: builder.query<WishlistWithGames, string>({
      query: (wishlistId) => `/wishlists/${wishlistId}`,
      providesTags: (_result, _error, wishlistId) => [
        { type: 'Wishlist' as const, id: wishlistId },
      ],
    }),

    /**
     * Update a wishlist
     */
    putWishlist: builder.mutation<Wishlist, { id: string; payload: UpdateWishlistPayload }>({
      query: ({ id, payload }) => ({
        url: `/wishlists/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Wishlist' as const, id }],
    }),

    /**
     * Delete a wishlist
     */
    deleteWishlist: builder.mutation<{ success: boolean }, string>({
      query: (wishlistId) => ({
        url: `/wishlists/${wishlistId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Wishlist', 'Game'],
    }),

    /**
     * Get games in a specific wishlist
     */
    getGames: builder.query<GameSummary[], string>({
      query: (wishlistId) => `/wishlists/${wishlistId}/games`,
      providesTags: (_result, _error, wishlistId) => [
        { type: 'Wishlist' as const, id: wishlistId },
      ],
    }),

    /**
     * Get all games across all wishlists for the current user (for dashboard)
     */
    getAllGames: builder.query<AllGamesGame[], void>({
      query: () => '/wishlists/all-games',
      providesTags: ['Wishlist', 'Game'],
    }),

    /**
     * Add a game to a wishlist
     */
    postGame: builder.mutation<GameSummary, { wishlistId: string; steamId: string }>({
      query: ({ wishlistId, steamId }) => ({
        url: `/wishlists/${wishlistId}/games`,
        method: 'POST',
        body: { steamId },
      }),
      invalidatesTags: (_result, _error, { wishlistId }) => [
        { type: 'Wishlist' as const, id: wishlistId },
        'Game',
      ],
    }),

    /**
     * Remove a game from a wishlist
     */
    deleteGame: builder.mutation<{ success: boolean }, { gameId: string; wishlistId: string }>({
      query: ({ gameId }) => ({
        url: `/games/${gameId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { wishlistId }) => [
        { type: 'Wishlist' as const, id: wishlistId },
        'Wishlist',
      ],
    }),

    /**
     * Move a game to a different wishlist
     */
    moveGame: builder.mutation<
      { success: boolean; moved: boolean },
      { gameId: string; targetWishlistId: string }
    >({
      query: ({ gameId, targetWishlistId }) => ({
        url: `/games/${gameId}/move`,
        method: 'POST',
        body: { targetWishlistId },
      }),
      invalidatesTags: (_result, _error, { gameId, targetWishlistId }) => {
        const sourceWishlistId = gameId.split('+')[1];
        return [
          { type: 'Wishlist' as const, id: sourceWishlistId },
          { type: 'Wishlist' as const, id: targetWishlistId },
          'Wishlist',
          'Game',
        ];
      },
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetWishlistsQuery,
  usePostWishlistMutation,
  useGetWishlistQuery,
  usePutWishlistMutation,
  useDeleteWishlistMutation,
  useGetGamesQuery,
  useGetAllGamesQuery,
  usePostGameMutation,
  useDeleteGameMutation,
  useMoveGameMutation,
} = wishlistApi;
