import schedule from 'node-schedule';
import { prisma } from '../config/prisma.js';
import { refreshAllGames } from './game.service.js';

// PriceChangeLog entries are a short-lived notification log; purge after 30 days
const PRICE_CHANGE_LOG_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export function startPriceRefreshJob() {
    const hour = parseInt(process.env.PRICE_REFRESH_HOUR ?? '13', 10);
    const minute = parseInt(process.env.PRICE_REFRESH_MINUTE ?? '0', 10);
    const timezone = process.env.PRICE_REFRESH_TIMEZONE ?? 'America/New_York';

    if (isNaN(hour) || hour < 0 || hour > 23) {
        console.warn(`Invalid PRICE_REFRESH_HOUR: "${process.env.PRICE_REFRESH_HOUR}", using default 13`);
    }
    if (isNaN(minute) || minute < 0 || minute > 59) {
        console.warn(`Invalid PRICE_REFRESH_MINUTE: "${process.env.PRICE_REFRESH_MINUTE}", using default 0`);
    }

    console.log(
        `Scheduled price refresh: daily at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${timezone}`
    );

    const rule = new schedule.RecurrenceRule();
    rule.hour = hour;
    rule.minute = minute;
    rule.tz = timezone;

    const job = schedule.scheduleJob(rule, async () => {
        console.log('[PRICE-REFRESH] Starting scheduled price refresh...');
        try {
            const result = await refreshAllGames();
            console.log(
                `[PRICE-REFRESH] Completed: ${result.refreshed} refreshed, ${result.failed} failed`
            );
        } catch (error) {
            console.error('[PRICE-REFRESH] Error during scheduled refresh:', error);
        }

        try {
            const deleted = await prisma.priceChangeLog.deleteMany({
                where: { timestamp: { lt: new Date(Date.now() - PRICE_CHANGE_LOG_RETENTION_MS) } },
            });
            console.log(`[PRICE-REFRESH] Cleaned up ${deleted.count} old price change log entries`);
        } catch (error) {
            console.error('[PRICE-REFRESH] Error cleaning up price change log:', error);
        }
    }
    );

    return job;
}
