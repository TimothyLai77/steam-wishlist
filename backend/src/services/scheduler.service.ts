import schedule from 'node-schedule';
import { refreshAllGames } from './game.service.js';

/**
 * Options describing a daily scheduled job.
 */
export interface DailyJobOptions {
  /** Log tag for the job, e.g. 'PRICE-REFRESH'. Used in all runtime log lines. */
  name: string;
  /**
   * Environment variable prefix for schedule configuration, e.g. 'PRICE_REFRESH'
   * reads PRICE_REFRESH_HOUR, PRICE_REFRESH_MINUTE and PRICE_REFRESH_TIMEZONE.
   */
  envPrefix: string;
  /** Default hour (0-23) used when the HOUR env var is missing or invalid. */
  defaultHour: number;
  /** Default minute (0-59) used when the MINUTE env var is missing or invalid. */
  defaultMinute: number;
  /** Default IANA timezone used when the TIMEZONE env var is missing. */
  defaultTimezone: string;
  /**
   * Job body. Runs on the daily schedule; a returned string is appended to the
   * completion log (e.g. "12 refreshed, 1 failed"). Thrown errors are caught and
   * logged, never crashing the process.
   */
  handler: () => Promise<string | void>;
}

/**
 * Zero-pads a number to two digits for log output.
 *
 * @param value - Number to pad (0-59).
 * @returns Two-digit string, e.g. 3 → '03'.
 */
const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * Reads and validates the `<ENV_PREFIX>_HOUR` and `<ENV_PREFIX>_MINUTE` env vars.
 * Invalid values log a warning and fall back to the defaults, matching the
 * previous price-refresh behavior.
 *
 * @param envPrefix - Environment variable prefix, e.g. 'PRICE_REFRESH'.
 * @param defaultHour - Fallback hour (0-23).
 * @param defaultMinute - Fallback minute (0-59).
 * @returns The resolved `{ hour, minute }` to schedule the job at.
 */
const parseDailyTime = (
  envPrefix: string,
  defaultHour: number,
  defaultMinute: number
): { hour: number; minute: number } => {
  let hour = defaultHour;
  let minute = defaultMinute;

  const rawHour = process.env[`${envPrefix}_HOUR`];
  if (rawHour !== undefined) {
    const parsed = parseInt(rawHour, 10);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 23) {
      console.warn(`Invalid ${envPrefix}_HOUR: "${rawHour}", using default ${defaultHour}`);
    } else {
      hour = parsed;
    }
  }

  const rawMinute = process.env[`${envPrefix}_MINUTE`];
  if (rawMinute !== undefined) {
    const parsed = parseInt(rawMinute, 10);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 59) {
      console.warn(`Invalid ${envPrefix}_MINUTE: "${rawMinute}", using default ${defaultMinute}`);
    } else {
      minute = parsed;
    }
  }

  return { hour, minute };
};

/**
 * Registers a daily job with the scheduler. Centralizes env var handling,
 * RecurrenceRule construction, and consistent `[NAME]` start/completion/error
 * logging for all scheduled tasks.
 *
 * @param options - Job configuration and handler (see {@link DailyJobOptions}).
 * @returns The created `schedule.Job` handle.
 */
export const registerDailyJob = (options: DailyJobOptions): schedule.Job => {
  const { name, envPrefix, defaultHour, defaultMinute, defaultTimezone, handler } = options;

  const { hour, minute } = parseDailyTime(envPrefix, defaultHour, defaultMinute);
  const timezone = process.env[`${envPrefix}_TIMEZONE`] ?? defaultTimezone;

  console.log(`Scheduled ${name} job: daily at ${pad(hour)}:${pad(minute)} ${timezone}`);

  const rule = new schedule.RecurrenceRule();
  rule.hour = hour;
  rule.minute = minute;
  rule.tz = timezone;

  return schedule.scheduleJob(rule, async () => {
    console.log(`[${name}] Starting scheduled job...`);
    try {
      const summary = await handler();
      console.log(summary ? `[${name}] Completed: ${summary}` : `[${name}] Completed`);
    } catch (error) {
      console.error(`[${name}] Error during scheduled job:`, error);
    }
  });
};

/**
 * Starts all scheduled jobs. New daily jobs (e.g. the Steam wishlist sync from
 * task 5 of the Steam wishlist sync feature) should be registered here via
 * {@link registerDailyJob}.
 *
 * @returns void.
 */
export const startScheduler = (): void => {
  registerDailyJob({
    name: 'PRICE-REFRESH',
    envPrefix: 'PRICE_REFRESH',
    defaultHour: 13,
    defaultMinute: 0,
    defaultTimezone: 'America/New_York',
    handler: async () => {
      const result = await refreshAllGames();
      return `${result.refreshed} refreshed, ${result.failed} failed`;
    },
  });
};
