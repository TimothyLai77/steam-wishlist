import { prisma } from '../config/prisma.js';

/**
 * One contiguous sale period for a game: a span of time during which the
 * effective `discountPercent` was greater than 0.
 *
 * - `start` is the timestamp of the change row that opened the period
 *   (discount went 0/null → >0).
 * - `end` is the timestamp of the change row that closed the period
 *   (discount returned to 0/null), or `null` if the sale is still ongoing.
 * - `price` / `discountPercent` / `originalPrice` reflect the *latest* state
 *   within the period (e.g. after a mid-sale discount deepening).
 * - `deepenedAt` is the timestamp of the latest mid-sale change that updated
 *   the period after it opened (e.g. a discount deepening), or `null` when
 *   the period's state never changed after it opened.
 */
export interface SalePeriod {
  start: Date;
  end: Date | null;
  price: number | null;
  discountPercent: number;
  originalPrice: number | null;
  deepenedAt: Date | null;
}

/**
 * The effective price state of a game as of a point in time: the state
 * established by the most recent change row at or before that point.
 *
 * `since` is the timestamp of the change row that established this state.
 */
export interface PriceState {
  price: number | null;
  originalPrice: number | null;
  discountPercent: number | null;
  since: Date;
}

/**
 * Point-in-time lookup result for a date range.
 *
 * `state` is the effective price state at the *end* of the range.
 * `constant` is `true` when no change row falls strictly inside the range
 * (i.e. the state held unchanged across the whole span).
 */
export interface PriceRangeReport {
  state: PriceState;
  constant: boolean;
}

/**
 * Convert a delta log row into the effective price state it establishes.
 *
 * @param row - A `PriceChangeLog` row (the "new" fields are the state after the change).
 * @returns The {@link PriceState} in effect from `row.timestamp` onward.
 */
const toPriceState = (row: {
  newPrice: { toNumber(): number } | null;
  originalPrice: { toNumber(): number } | null;
  newDiscount: number | null;
  timestamp: Date;
}): PriceState => ({
  price: row.newPrice?.toNumber() ?? null,
  originalPrice: row.originalPrice?.toNumber() ?? null,
  discountPercent: row.newDiscount,
  since: row.timestamp,
});

/**
 * Derive the game's sale periods by folding its delta log rows (ordered by
 * `timestamp`, ascending) into contiguous spans where the effective discount
 * was greater than 0.
 *
 * Rules:
 * - A period opens at the first row whose `newDiscount > 0` and no period is
 *   currently open.
 * - While a period is open, subsequent rows with `newDiscount > 0` update the
 *   period's price/discount/original price (e.g. a mid-sale price cut).
 * - A row with `newDiscount` of 0/null closes the open period, with `end` set
 *   to that row's timestamp.
 * - If the last row still has `newDiscount > 0`, the final period is ongoing
 *   (`end: null`).
 *
 * @param steamId - The Steam App ID of the game.
 * @returns Sale periods in chronological order (oldest first); the most
 *   recent period is the last element (and has `end: null` if still on sale).
 *   Returns an empty array if the game has no logged price changes.
 */
export const getSalePeriods = async (steamId: number): Promise<SalePeriod[]> => {
  const rows = await prisma.priceChangeLog.findMany({
    where: { gameId: steamId },
    orderBy: { timestamp: 'asc' },
  });

  const periods: SalePeriod[] = [];
  let current: SalePeriod | null = null;

  for (const row of rows) {
    const discount = row.newDiscount;

    if (discount !== null && discount > 0) {
      if (current) {
        // Mid-sale update (e.g. discount deepened): refresh the open period.
        current.price = row.newPrice?.toNumber() ?? null;
        current.discountPercent = discount;
        current.originalPrice = row.originalPrice?.toNumber() ?? null;
        current.deepenedAt = row.timestamp;
      } else {
        current = {
          start: row.timestamp,
          end: null,
          price: row.newPrice?.toNumber() ?? null,
          discountPercent: discount,
          originalPrice: row.originalPrice?.toNumber() ?? null,
          deepenedAt: null,
        };
      }
    } else if (current) {
      // Discount returned to 0/null: close the open period.
      current.end = row.timestamp;
      periods.push(current);
      current = null;
    }
  }

  if (current) {
    // Sale still ongoing as of the last change row.
    periods.push(current);
  }

  return periods;
};

/**
 * Find the timestamp of the earliest logged price change for a game, i.e. the
 * date from which point-in-time lookups can return data for it.
 *
 * @param steamId - The Steam App ID of the game.
 * @returns The earliest change timestamp, or `null` if the game has no
 *   logged price changes at all.
 */
export const getTrackingStartedAt = async (steamId: number): Promise<Date | null> => {
  const row = await prisma.priceChangeLog.findFirst({
    where: { gameId: steamId },
    orderBy: { timestamp: 'asc' },
    select: { timestamp: true },
  });

  return row?.timestamp ?? null;
};

/**
 * Look up the effective price state of a game at a given point in time,
 * defined by the latest change row at or before `date`.
 *
 * @param steamId - The Steam App ID of the game.
 * @param date - The point in time to look up.
 * @returns The {@link PriceState} in effect at `date`, or `null` if no price
 *   change has been logged for the game at or before that date (i.e. the
 *   game's history starts after `date`).
 */
export const getPriceAtDate = async (steamId: number, date: Date): Promise<PriceState | null> => {
  const row = await prisma.priceChangeLog.findFirst({
    where: { gameId: steamId, timestamp: { lte: date } },
    orderBy: { timestamp: 'desc' },
  });

  return row ? toPriceState(row) : null;
};

/**
 * Look up the effective price state of a game over a date range.
 *
 * The reported state is the one in effect at `to`. `constant` is `true` when
 * no change row falls strictly inside the range (`from` < timestamp ≤ `to`),
 * meaning the state held unchanged across the whole span; a change row
 * exactly at `from` does *not* count as a change within the range because the
 * new state applies for the entire span after it.
 *
 * @param steamId - The Steam App ID of the game.
 * @param from - Start of the range (inclusive).
 * @param to - End of the range (inclusive).
 * @returns A {@link PriceRangeReport}, or `null` if no price change has been
 *   logged for the game at or before `to`.
 */
export const getPriceRange = async (
  steamId: number,
  from: Date,
  to: Date,
): Promise<PriceRangeReport | null> => {
  const row = await prisma.priceChangeLog.findFirst({
    where: { gameId: steamId, timestamp: { lte: to } },
    orderBy: { timestamp: 'desc' },
  });

  if (!row) {
    return null;
  }

  return {
    state: toPriceState(row),
    constant: row.timestamp <= from,
  };
};
