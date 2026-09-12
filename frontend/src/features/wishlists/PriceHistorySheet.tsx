import { useMemo, useRef, useState } from 'react';
import type { GameSummary } from '../../app/services/wishlistApi';
import {
    useGetPriceHistoryQuery,
    useGetPriceAtDateQuery,
    type SalePeriod,
} from '../../app/services/priceHistoryApi';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '../../../components/ui/sheet';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Calendar } from '../../../components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '../../../components/ui/popover';
import {
    CalendarBlankIcon,
    CaretDownIcon,
    ChartLineUpIcon,
} from '@phosphor-icons/react';

interface PriceHistorySheetProps {
    /** The game whose price history is shown (a row from the games table). */
    game: GameSummary;
    /** Whether the sheet is open (controlled by the parent). */
    open: boolean;
    /** Called when the user closes the sheet. */
    onOpenChange: (open: boolean) => void;
}

const DAY_MS = 86_400_000;

/**
 * Format a date as a local `YYYY-MM-DD` key (the form the date picker and
 * the price-at-date API use).
 *
 * @param date - The date to convert.
 * @returns A `YYYY-MM-DD` string in local time.
 */
const toDateKey = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/**
 * Convert a local `YYYY-MM-DD` key back to a local `Date` (midnight).
 *
 * @param key - A `YYYY-MM-DD` string.
 * @returns The local date at midnight.
 */
const keyToDate = (key: string): Date => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
};

/**
 * Format an ISO timestamp as a short day label ("Aug 1"), appending the year
 * when it differs from the current year.
 *
 * @param iso - An ISO 8601 timestamp.
 * @returns A short human-readable day label.
 */
const formatDay = (iso: string): string => {
    const date = new Date(iso);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    if (date.getFullYear() !== new Date().getFullYear()) {
        options.year = 'numeric';
    }
    return date.toLocaleDateString(undefined, options);
};

/**
 * Format a span of time as a short duration ("9 days", "under a day").
 *
 * @param startIso - Start of the span (ISO timestamp).
 * @param endIso - End of the span (ISO timestamp), or `null` to use "now" (ongoing).
 * @returns A short human-readable duration.
 */
const formatDuration = (startIso: string, endIso: string | null): string => {
    const end = endIso ? new Date(endIso) : new Date();
    const days = Math.floor((end.getTime() - new Date(startIso).getTime()) / DAY_MS);
    if (days < 1) return 'under a day';
    if (days === 1) return '1 day';
    return `${days} days`;
};

/**
 * Format a monetary amount using the game's currency via
 * `Intl.NumberFormat`, falling back to a plain `$` prefix when the currency
 * code is not recognized.
 *
 * @param amount - The amount to format.
 * @param currency - ISO 4217 currency code (e.g. "USD"); defaults to "USD".
 * @returns A locale-formatted currency string, or "—" when the amount is missing.
 */
const formatPrice = (amount: number | null | undefined, currency?: string): string => {
    if (amount == null) return '—';
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: currency || 'USD',
        }).format(amount);
    } catch {
        return `$${amount.toFixed(2)}`;
    }
};

/**
 * Format the date range of a sale period ("Aug 1 – Aug 9", or
 * "Aug 1 – present" while ongoing).
 *
 * @param period - The sale period to label.
 * @returns A human-readable date range.
 */
const formatRange = (period: SalePeriod): string => {
    const start = formatDay(period.start);
    return period.end ? `${start} – ${formatDay(period.end)}` : `${start} – present`;
};

const DiscountBadge = ({ percent }: { percent: number }) => (
    <Badge className="bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400">
        -{percent}%
    </Badge>
);

/**
 * One node in the sale-history timeline (a single contiguous sale period).
 * Clicking it reports the sale's start date to the point-in-time lookup.
 */
const SalePeriodNode = ({
    period,
    isOngoing,
    isFirstFinished,
    currency,
    onSelect,
    showConnector,
}: {
    period: SalePeriod;
    isOngoing: boolean;
    isFirstFinished: boolean;
    currency?: string;
    onSelect: (period: SalePeriod) => void;
    showConnector: boolean;
}) => (
    <li className="relative pl-7 pb-2 last:pb-0">
        {showConnector && (
            <span
                aria-hidden
                className="absolute top-5 -bottom-2 left-[6.5px] w-px bg-border"
            />
        )}
        <span
            aria-hidden
            className={
                isOngoing
                    ? 'absolute top-1.5 left-0 size-3.5 rounded-full bg-green-500 ring-4 ring-green-500/20'
                    : isFirstFinished
                        ? 'absolute top-1.5 left-0 size-3.5 rounded-full bg-foreground'
                        : 'absolute top-1.5 left-0 size-3.5 rounded-full border-2 border-foreground/30 bg-background'
            }
        />
        <button
            type="button"
            onClick={() => onSelect(period)}
            title="View the price on the sale start date"
            className={`w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/50 ${
                isFirstFinished ? 'border border-border bg-muted/30' : ''
            }`}
        >
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">{formatRange(period)}</span>
                <div className="flex items-center gap-1.5">
                    {isOngoing && (
                        <Badge className="bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400">
                            On sale now
                        </Badge>
                    )}
                    <DiscountBadge percent={period.discountPercent} />
                </div>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
                <span className="text-sm font-semibold">
                    {formatPrice(period.price, currency)}
                </span>
                {period.originalPrice != null &&
                    period.originalPrice !== period.price && (
                        <span className="text-xs text-muted-foreground line-through">
                            {formatPrice(period.originalPrice, currency)}
                        </span>
                    )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                <span className="whitespace-nowrap">
                    {isOngoing
                        ? `Ongoing · ${formatDuration(period.start, null)}`
                        : formatDuration(period.start, period.end)}
                </span>
                {period.deepenedAt && (
                    <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
                        ·
                        <CaretDownIcon size={12} className="text-green-500" />
                        dropped to −{period.discountPercent}% on{' '}
                        {formatDay(period.deepenedAt)}
                    </span>
                )}
            </div>
        </button>
    </li>
);

/**
 * Right-side sheet showing a game's price history: a price-tag header, a
 * vertical sale timeline (most recent first, ongoing pinned to the top), and
 * a point-in-time price lookup with a date picker defaulting to today.
 *
 * Data is fetched lazily via RTK Query `skip` — nothing loads while the
 * sheet is closed, so the games table never fires one fetch per row.
 */
const PriceHistorySheet: React.FC<PriceHistorySheetProps> = ({
    game,
    open,
    onOpenChange,
}) => {
    const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
    const lookupRef = useRef<HTMLDivElement>(null);

    const { data: history, isLoading: historyLoading } = useGetPriceHistoryQuery(
        game.steamId,
        { skip: !open }
    );

    const {
        data: stateResult,
        isLoading: stateLoading,
        isError: stateError,
    } = useGetPriceAtDateQuery(
        { steamId: game.steamId, date: selectedDate },
        { skip: !open }
    );
    const priceState = stateResult?.state;

    // Newest first; the last backend entry is the ongoing sale (if any).
    const periods = useMemo(
        () => (history?.salePeriods ?? []).slice().reverse(),
        [history]
    );
    const ongoing = !periods[0]?.end ? periods[0] : undefined;
    const firstFinishedIndex = ongoing != null ? 1 : 0;

    const onSale = (game.discountPercent ?? 0) > 0;
    const originalPrice = ongoing?.originalPrice ?? priceState?.originalPrice;
    const showOriginal =
        onSale && originalPrice != null && originalPrice !== game.currentPrice;

    const handlePeriodSelect = (period: SalePeriod) => {
        setSelectedDate(toDateKey(new Date(period.start)));
        lookupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    // How long the looked-up state had held: from its establishing change to
    // the end of the picked day (capped at now when a future date is picked).
    const heldUntil = useMemo(() => {
        const lookupEnd = keyToDate(selectedDate);
        lookupEnd.setDate(lookupEnd.getDate() + 1);
        // "now" is intentionally read at render time: it only caps the
        // duration when a future date is picked, and re-renders keep it fresh.
        // eslint-disable-next-line react-hooks/purity -- intentional render-time "now"
        return new Date(Math.min(lookupEnd.getTime(), Date.now())).toISOString();
    }, [selectedDate]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right">
                <SheetHeader className="border-b pr-10">
                    <SheetTitle>{game.name || `Game ${game.steamId}`}</SheetTitle>
                    <SheetDescription>Price history for this game.</SheetDescription>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-semibold">
                            {formatPrice(game.currentPrice, game.currency)}
                        </span>
                        {showOriginal && (
                            <span className="text-sm text-muted-foreground line-through">
                                {formatPrice(originalPrice, game.currency)}
                            </span>
                        )}
                        {onSale && <DiscountBadge percent={game.discountPercent!} />}
                    </div>
                    {ongoing && (
                        <p className="text-xs font-medium text-green-600 dark:text-green-400">
                            On sale now · since {formatDay(ongoing.start)}
                        </p>
                    )}
                </SheetHeader>

                <div className="flex-1 space-y-6 overflow-y-auto p-4">
                    {historyLoading ? (
                        <p className="py-8 text-center text-muted-foreground">
                            Loading price history...
                        </p>
                    ) : (
                        <>
                            {/* Sale history timeline */}
                            <section>
                                <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium">
                                    <ChartLineUpIcon size={16} className="text-muted-foreground" />
                                    Sale history
                                </h2>
                                {periods.length === 0 ? (
                                    <p className="rounded-md bg-muted/40 px-3 py-4 text-center text-muted-foreground">
                                        No sales yet · prices are checked daily
                                    </p>
                                ) : (
                                    <ol>
                                        {periods.map((period, index) => (
                                            <SalePeriodNode
                                                key={period.start}
                                                period={period}
                                                isOngoing={period === ongoing}
                                                isFirstFinished={index === firstFinishedIndex}
                                                currency={game.currency}
                                                onSelect={handlePeriodSelect}
                                                showConnector={index < periods.length - 1}
                                            />
                                        ))}
                                    </ol>
                                )}
                            </section>

                            {/* Point-in-time lookup */}
                            <section ref={lookupRef} className="scroll-mt-4">
                                <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium">
                                    <CalendarBlankIcon size={16} className="text-muted-foreground" />
                                    Price on a date
                                </h2>
                                <div className="space-y-3">
                                    <Popover>
                                        <PopoverTrigger
                                            render={
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="justify-between"
                                                >
                                                    {keyToDate(selectedDate).toLocaleDateString(
                                                        undefined,
                                                        {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                        }
                                                    )}
                                                    <CalendarBlankIcon size={14} />
                                                </Button>
                                            }
                                        />
                                        <PopoverContent
                                            className="w-auto p-2"
                                            align="start"
                                            sideOffset={6}
                                        >
                                            <Calendar
                                                mode="single"
                                                selected={keyToDate(selectedDate)}
                                                defaultMonth={keyToDate(selectedDate)}
                                                onSelect={(day) => {
                                                    if (day) {
                                                        setSelectedDate(toDateKey(day));
                                                    }
                                                }}
                                            />
                                        </PopoverContent>
                                    </Popover>

                                    {stateLoading ? (
                                        <p className="text-muted-foreground">Looking up...</p>
                                    ) : stateError ? (
                                        <p className="text-muted-foreground">
                                            No data for this date
                                            {history?.trackingStartedAt
                                                ? ` · tracking started ${formatDay(history.trackingStartedAt)}`
                                                : ''}
                                        </p>
                                    ) : priceState ? (
                                        <div className="space-y-1">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-lg font-semibold">
                                                    {formatPrice(priceState.price, game.currency)}
                                                </span>
                                                {priceState.originalPrice != null &&
                                                    priceState.originalPrice !== priceState.price && (
                                                        <span className="text-xs text-muted-foreground line-through">
                                                            {formatPrice(priceState.originalPrice, game.currency)}
                                                        </span>
                                                    )}
                                                {(priceState.discountPercent ?? 0) > 0 ? (
                                                    <DiscountBadge percent={priceState.discountPercent!} />
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">
                                                        No discount
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Held for {formatDuration(priceState.since, heldUntil)} ·
                                                since {formatDay(priceState.since)}
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default PriceHistorySheet;
