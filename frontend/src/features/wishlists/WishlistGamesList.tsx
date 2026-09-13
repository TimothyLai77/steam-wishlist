import type { GameSummary } from '../../app/services/wishlistApi';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import {
    CaretUpDownIcon,
    CaretUpIcon,
    CaretDownIcon,
    ChartLineUpIcon,
    DatabaseIcon,
    LinkIcon,
    TrashIcon,
    ListPlusIcon,
    FireIcon,
} from '@phosphor-icons/react';

export type SortKey = 'name' | 'currentPrice' | 'discountPercent' | 'createdAt';
export type SortDir = 'asc' | 'desc';

interface WishlistGamesListProps {
    games: GameSummary[];
    sortKey: SortKey;
    sortDir: SortDir;
    onSort: (key: SortKey) => void;
    formatPrice: (price: number | undefined) => string;
    onRemoveGame: (gameId: string, gameName: string) => void;
    onMoveGame: (gameId: string, gameName: string) => void;
    onShowHistory: (game: GameSummary) => void;
    showMoveButton: boolean;
}

const WishlistGamesList: React.FC<WishlistGamesListProps> = ({
    games,
    sortKey,
    sortDir,
    onSort,
    formatPrice,
    onRemoveGame,
    onMoveGame,
    onShowHistory,
    showMoveButton,
}) => {
    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortKey !== column) {
            return <CaretUpDownIcon size={14} weight="light" className="text-muted-foreground" />;
        }
        return sortDir === 'asc'
            ? <CaretUpIcon size={14} weight="bold" />
            : <CaretDownIcon size={14} weight="bold" />;
    };

    return (
        <div className="space-y-3">
            {/* Sort header */}
            <div className="flex items-center justify-between text-sm text-muted-foreground px-4">
                <div className="flex items-center gap-4">
                    <span>Game</span>
                    <button
                        onClick={() => onSort('currentPrice')}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                        Price <SortIcon column="currentPrice" />
                    </button>
                    <button
                        onClick={() => onSort('createdAt')}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                        Added <SortIcon column="createdAt" />
                    </button>
                </div>
            </div>

            {/* Games */}
            {games.map((game: GameSummary) => {
                const hasDiscount = game.discountPercent !== undefined && game.discountPercent > 0;
                return (
                    <Card
                        key={game.steamId}
                        className="group hover:shadow-md transition-all duration-200"
                    >
                        <CardContent className="p-4">
                            {/* Main row: name + price */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-medium truncate">
                                        {game.name || `Game ${game.steamId}`}
                                    </span>
                                    {hasDiscount && (
                                        <FireIcon size={16} weight="fill" className="text-orange-500 flex-shrink-0" />
                                    )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={hasDiscount ? 'font-semibold' : ''}>
                                        {formatPrice(game.currentPrice)}
                                    </span>
                                    {game.currency && (
                                        <span className="text-xs text-muted-foreground">
                                            {game.currency}
                                        </span>
                                    )}
                                    {hasDiscount && (
                                        <Badge className="text-xs bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400">
                                            -{game.discountPercent}%
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Action links */}
                            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                                <a
                                    href={`https://store.steampowered.com/app/${game.steamId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                                >
                                    <LinkIcon size={12} /> Steam Store
                                </a>
                                <a
                                    href={`https://steamdb.info/app/${game.steamId}/`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                                >
                                    <DatabaseIcon size={12} /> SteamDB
                                </a>
                                <button
                                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onShowHistory(game);
                                    }}
                                >
                                    <ChartLineUpIcon size={12} /> History
                                </button>
                                {showMoveButton && (
                                    <button
                                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onMoveGame(game.id, game.name || `Game ${game.steamId}`);
                                        }}
                                    >
                                        <ListPlusIcon size={12} /> Move
                                    </button>
                                )}
                                <button
                                    className="inline-flex items-center gap-1 hover:text-red-500 transition-colors ml-auto"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveGame(game.id, game.name || `Game ${game.steamId}`);
                                    }}
                                >
                                    <TrashIcon size={12} /> Delete
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};

export default WishlistGamesList;
