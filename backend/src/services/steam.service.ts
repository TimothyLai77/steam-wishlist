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

/**
 * Service to fetch data from Steam's public API
 */

const STEAM_STORE_BASE_URL = 'https://store.steampowered.com/api/appdetails';

export const fetchGameDetails = async (
  steamId: string,
): Promise<SteamGameDetails | null> => {
  try {
    const url = `${STEAM_STORE_BASE_URL}?appids=${steamId}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `Steam Store API error: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data = (await response.json()) as SteamApiResponse;
    const appData = data[steamId];

    if (!appData?.success || !appData.data) {
      console.error(`Game ${steamId} not found or Steam API returned error`);
      return null;
    }

    const { name, is_free, tiny_image, price_overview } = appData.data;

    let currentPrice = 0;
    let originalPrice: number | null = null;
    let discountPercent = 0;
    let currency = 'USD';

    if (price_overview) {
      // Steam prices are in cents
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
