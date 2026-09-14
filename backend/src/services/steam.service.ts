import { steamQueue } from '../lib/steamQueue.js';
import { AppError } from '../middleware/error.middleware.js';

export interface SteamGameDetails {
  success: boolean;
  name: string;
  currentPrice: number;
  originalPrice: number | null;
  discountPercent: number;
  currency: string;
  imageUrl: string;
}

interface SteamApiResponse {
  [appId: string]: {
    success: boolean;
    data?: {
      name: string;
      is_free: boolean;
      tiny_image: string;
      price_overview?: {
        currency: string;
        initial: number;
        final: number;
        discount_percent: number;
      };
    };
  };
}

const STEAM_STORE_BASE_URL = 'https://store.steampowered.com/api/appdetails';

const getSteamApiCC = (): string => process.env.STEAM_API_CC ?? 'US';

/**
 * Tracks in-flight requests for each appID to avoid duplicate concurrent requests.
 */
const inFlightRequests = new Map<string, Promise<SteamGameDetails | null>>();

/**
 * Fetch details for a single game from Steam's API.
 * This is the low-level function that actually makes the HTTP request.
 */
const fetchSingleGameDetails = async (
  steamId: string,
): Promise<SteamGameDetails | null> => {
  try {
    const cc = getSteamApiCC();
    const url = `${STEAM_STORE_BASE_URL}?appids=${steamId}&cc=${cc}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `Steam Store API error for ${steamId}: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data = (await response.json()) as Record<
      string,
      {
        success: boolean;
        data?: SteamApiResponse[keyof SteamApiResponse]['data'];
      }
    >;
    const appData = data[steamId];

    if (!appData?.success || !appData.data) {
      console.error(`Game ${steamId} not found or Steam API returned error`);
      return null;
    }

    const { name, tiny_image, price_overview } = appData.data;

    let currentPrice = 0;
    let originalPrice: number | null = null;
    let discountPercent = 0;
    let currency = 'USD';

    if (price_overview) {
      currentPrice = price_overview.final / 100;
      discountPercent = price_overview.discount_percent || 0;
      currency = price_overview.currency || 'USD';

      if (discountPercent > 0) {
        originalPrice = price_overview.initial / 100;
      }
    }

    return {
      success: true,
      name: name || 'Unknown Game',
      currentPrice,
      originalPrice,
      discountPercent,
      currency,
      imageUrl: tiny_image || '',
    };
  } catch (error) {
    console.error(`Failed to fetch game details for ${steamId}:`, error);
    return null;
  }
};

/**
 * Fetch a single game's details, respecting rate limits and in-flight deduplication.
 * If a request for this appID is already pending, returns the existing promise.
 */
export const fetchGameDetails = async (
  steamId: string,
): Promise<SteamGameDetails | null> => {
  // Return existing in-flight promise if one is already pending
  if (inFlightRequests.has(steamId)) {
    return inFlightRequests.get(steamId)!;
  }

  const promise = steamQueue.add(() => fetchSingleGameDetails(steamId));

  // Track in-flight request
  inFlightRequests.set(steamId, promise);

  try {
    const result = await promise;
    return result;
  } finally {
    // Clean up in-flight tracking after completion
    inFlightRequests.delete(steamId);
  }
};

/**
 * Fetch details for multiple games. Each appID is an individual queued request.
 * Uses in-flight deduplication so concurrent callers share the same request.
 */
export const fetchGameDetailsBatch = async (
  steamIds: string[],
): Promise<Record<string, SteamGameDetails | null>> => {
  const results: Record<string, SteamGameDetails | null> = {};

  const tasks = steamIds.map((id) =>
    fetchGameDetails(id).then((result) => ({ id, result })),
  );

  const completed = await Promise.all(tasks);
  for (const { id, result } of completed) {
    results[id] = result;
  }

  return results;
};

// ---------------------------------------------------------------------------
// Steam wishlist (IWishlistService/GetWishlist/v1)
// ---------------------------------------------------------------------------

export interface SteamWishlistItem {
  appid: number;
  priority: number;
  date_added: number;
}

interface SteamWishlistApiResponse {
  response?: {
    items?: SteamWishlistItem[];
  };
}

const WISHLIST_API_URL = 'https://api.steampowered.com/IWishlistService/GetWishlist/v1/';

/**
 * Fetch the public Steam wishlist for a SteamID64.
 *
 * Steam's behaviour per input:
 * - valid 17-digit ID with a public wishlist -> `{ response: { items: [...] } }`
 * - public wishlist with zero games -> `{ response: { items: [] } }`
 * - private wishlist or unknown ID -> `{ response: {} }` (HTTP 200)
 * - malformed ID (not 17 digits) -> HTTP 400
 *
 * @param steamId - The user's SteamID64 as a string.
 * @returns The wishlist items (`appid`, `priority`, `date_added`), possibly empty.
 * @throws {AppError} 400 `INVALID_STEAM_ID` when the steamId is not 17 digits;
 *   502 `WISHLIST_NOT_PUBLIC` when the wishlist is private/unknown;
 *   502 `STEAM_API_ERROR` on HTTP/network failures.
 */
export const getSteamWishlist = async (
  steamId: string,
): Promise<SteamWishlistItem[]> => {
  if (!/^\d{17}$/.test(steamId)) {
    throw new AppError(400, 'Steam ID must be a 17-digit SteamID64', 'INVALID_STEAM_ID');
  }

  let data: SteamWishlistApiResponse;
  try {
    const response = await steamQueue.add(() =>
      fetch(`${WISHLIST_API_URL}?steamid=${encodeURIComponent(steamId)}`),
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    data = (await response.json()) as SteamWishlistApiResponse;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error(`Failed to fetch Steam wishlist for ${steamId}:`, error);
    throw new AppError(502, 'Could not reach the Steam API', 'STEAM_API_ERROR');
  }

  const items = data.response?.items;
  if (!Array.isArray(items)) {
    // `{ response: {} }` means the wishlist is private or the ID is unknown.
    throw new AppError(
      502,
      'Steam wishlist is not public or Steam ID is invalid',
      'WISHLIST_NOT_PUBLIC',
    );
  }

  return items;
};
