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
const STEAM_API_CC = process.env.STEAM_API_CC ?? 'US';

export const fetchGameDetails = async (
  steamId: string,
): Promise<SteamGameDetails | null> => {
  const results = await fetchGameDetailsBatch([steamId]);
  return results[steamId] ?? null;
};

export const fetchGameDetailsBatch = async (
  steamIds: string[],
): Promise<Record<string, SteamGameDetails | null>> => {
  const results: Record<string, SteamGameDetails | null> = {};
  const BATCH_SIZE = 10;

  for (let i = 0; i < steamIds.length; i += BATCH_SIZE) {
    const batch = steamIds.slice(i, i + BATCH_SIZE);
    try {
      const url = `${STEAM_STORE_BASE_URL}?appids=${batch.join(',')}&cc=${STEAM_API_CC}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(
          `Steam Store API error: ${response.status} ${response.statusText}`,
        );
        for (const id of batch) {
          results[id] = null;
        }
        continue;
      }

      const data = (await response.json()) as SteamApiResponse;

      for (const id of batch) {
        const appData = data[id];

        if (!appData?.success || !appData.data) {
          console.error(`Game ${id} not found or Steam API returned error`);
          results[id] = null;
          continue;
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

        results[id] = {
          success: true,
          name: name || 'Unknown Game',
          currentPrice,
          originalPrice,
          discountPercent,
          currency,
          imageUrl: tiny_image || '',
        };
      }
    } catch (error) {
      console.error(`Failed to fetch game details for batch:`, error);
      for (const id of batch) {
        results[id] = null;
      }
    }
  }

  return results;
};
