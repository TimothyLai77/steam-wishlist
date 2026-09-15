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
/**
 * One logged price change, as it appears in a range-window report: the new
 * state the row establishes, with the timestamp it was logged.
 */
export interface PriceChangeEntry {
  timestamp: Date;
  price: number | null;
  originalPrice: number | null;
  discountPercent: number | null;
}

/**
 * Point-in-time lookup result for a date range.
 *
 * - `state` is the effective price state at the *end* of the range.
 * - `constant` is `true` when no change row falls strictly inside the range
 *   (i.e. the state held unchanged across the whole span).
 * - `startState` is the state in effect at the *start* of the range (the
 *   latest change at or before `from`), or `null` when tracking of the game
 *   began after `from` (i.e. the first logged change falls inside the range).
 * - `changes` lists every change row strictly inside the range
 *   (`from` < timestamp ≤ `to`), oldest first — the windowed price history.
 */
export interface PriceRangeReport {
  state: PriceState;
  constant: boolean;
  startState: PriceState | null;
  changes: PriceChangeEntry[];
}

/**
 * Structural shape of a `PriceChangeLog` row as consumed by the converters
 * below (the "new" fields are the state after the change; `Decimal` fields
 * are matched structurally via `toNumber`).
 */
interface PriceChangeLogRow {
  newPrice: { toNumber(): number } | null;
  originalPrice: { toNumber(): number } | null;
  newDiscount: number | null;
  timestamp: Date;
}

/**
 * Convert a delta log row into the effective price state it establishes.
 *
 * @param row - A `PriceChangeLog` row (the "new" fields are the state after the change).
 * @returns The {@link PriceState} in effect from `row.timestamp` onward.
 */
const toPriceState = (row: PriceChangeLogRow): PriceState => ({
  price: row.newPrice?.toNumber() ?? null,
  originalPrice: row.originalPrice?.toNumber() ?? null,
  discountPercent: row.newDiscount,
  since: row.timestamp,
});

/**
 * Convert a delta log row into a {@link PriceChangeEntry} for range reports.
 *
 * @param row - A `PriceChangeLog` row (the "new" fields are the state after the change).
 * @returns The change as a flat, JSON-friendly entry.
 */
const toChangeEntry = (row: PriceChangeLogRow): PriceChangeEntry => ({
  timestamp: row.timestamp,
  price: row.newPrice?.toNumber() ?? null,
  originalPrice: row.originalPrice?.toNumber() ?? null,
  discountPercent: row.newDiscount,
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
 * Look up the effective price state of a game over a date range, including
 * the windowed price history (every change that happened inside the range).
 *
 * The reported `state` is the one in effect at `to`. `constant` is `true` when
 * no change row falls strictly inside the range (`from` < timestamp ≤ `to`),
 * meaning the state held unchanged across the whole span; a change row
 * exactly at `from` does *not* count as a change within the range because the
 * new state applies for the entire span after it. `startState` is the state
 * in effect at `from` (latest change at or before it), and `changes` lists
 * every change strictly inside the range, oldest first.
 *
 * All derivations come from a single query of the rows at or before `to`.
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
  const rows = await prisma.priceChangeLog.findMany({
    where: { gameId: steamId, timestamp: { lte: to } },
    orderBy: { timestamp: 'desc' },
  });

  const latest = rows[0];
  if (!latest) {
    return null;
  }

  const changes = rows.filter((row) => row.timestamp > from).reverse().map(toChangeEntry);
  const startRow = rows.find((row) => row.timestamp <= from) ?? null;

  return {
    state: toPriceState(latest),
    constant: changes.length === 0,
    startState: startRow ? toPriceState(startRow) : null,
    changes,
  };
};
