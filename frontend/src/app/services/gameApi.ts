import { api } from './api';

// Re-export GameSummary from wishlistApi for convenience
export type { GameSummary } from './wishlistApi';

// TODO: Define proper types in types/game.ts
export interface GameDetail {
  id: string;
  steamId: string;
  name: string;
  description: string;
  developer: string;
  publisher: string;
  releaseDate: string;
  image: string;
  screenshots: string[];
  currentPrice: number | null;
  originalPrice: number | null;
  discountPercent: number;
  isOnSale: boolean;
  wishlistId: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateGamePayload {
  notes?: string;
}

export interface MoveGamePayload {
  wishlistId: string;
}

export const gameApi = api.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get a single game by ID
     */
    getGame: builder.query<GameDetail, string>({
      query: (gameId) => `/games/${gameId}`,
      providesTags: (_result, _error, gameId) => [
        { type: 'Game' as const, id: gameId },
      ],
    }),

    /**
     * Update a game (e.g., notes)
     */
    putGame: builder.mutation<GameDetail, { gameId: string; payload: UpdateGamePayload }>({
      query: ({ gameId, payload }) => ({
        url: `/games/${gameId}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { gameId }) => [
        { type: 'Game' as const, id: gameId },
      ],
    }),

    /**
     * Delete a game from a wishlist
     */
    deleteGame: builder.mutation<{ success: boolean }, string>({
      query: (gameId) => ({
        url: `/games/${gameId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Game', 'Wishlist'],
    }),

    /**
     * Move a game to another wishlist
     */
    moveGame: builder.mutation<GameDetail, { gameId: string; payload: MoveGamePayload }>({
      query: ({ gameId, payload }) => ({
        url: `/games/${gameId}/move`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['Game', 'Wishlist'],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetGameQuery,
  usePutGameMutation,
  useDeleteGameMutation,
  useMoveGameMutation,
} = gameApi;
