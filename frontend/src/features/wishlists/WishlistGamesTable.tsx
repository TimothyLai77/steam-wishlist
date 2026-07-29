import type { GameSummary } from '../../app/services/wishlistApi';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import {
    CaretUpDownIcon,
    CaretUpIcon,
    CaretDownIcon,
    DatabaseIcon,
    LinkIcon,
    TrashIcon,
    ListPlusIcon,
} from '@phosphor-icons/react';

export type SortKey = 'name' | 'currentPrice' | 'discountPercent' | 'createdAt';
export type SortDir = 'asc' | 'desc';

interface WishlistGamesTableProps {
    games: GameSummary[];
    sortKey: SortKey;
    sortDir: SortDir;
    onSort: (key: SortKey) => void;
    formatPrice: (price: number | undefined) => string;
    onRemoveGame: (gameId: string, gameName: string) => void;
    onMoveGame: (gameId: string, gameName: string) => void;
    showMoveButton: boolean;
}

const WishlistGamesTable: React.FC<WishlistGamesTableProps> = ({
    games,
    sortKey,
    sortDir,
    onSort,
    formatPrice,
    onRemoveGame,
    onMoveGame,
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
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead
                        className="cursor-pointer select-none hover:text-foreground transition-colors"
                        onClick={() => onSort('name')}
                    >
                        <div className="flex items-center gap-1">
                            Game
                            <SortIcon column="name" />
                        </div>
                    </TableHead>
                    <TableHead
                        className="cursor-pointer select-none hover:text-foreground transition-colors"
                        onClick={() => onSort('currentPrice')}
                    >
                        <div className="flex items-center gap-1">
                            Price
                            <SortIcon column="currentPrice" />
                        </div>
                    </TableHead>
                    <TableHead
                        className="cursor-pointer select-none hover:text-foreground transition-colors"
                        onClick={() => onSort('discountPercent')}
                    >
                        <div className="flex items-center gap-1">
                            Discount
                            <SortIcon column="discountPercent" />
                        </div>
                    </TableHead>
                    <TableHead
                        className="cursor-pointer select-none hover:text-foreground transition-colors"
                        onClick={() => onSort('createdAt')}
                    >
                        <div className="flex items-center gap-1">
                            Added
                            <SortIcon column="createdAt" />
                        </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {games.map((game: GameSummary, index) => {
                    const hasDiscount = game.discountPercent !== undefined && game.discountPercent > 0;
                    return (
                        <TableRow key={game.steamId}>
                            <TableCell className="text-muted-foreground">
                                {index + 1}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    {game.image && (
                                        <img
                                            src={game.image}
                                            alt={game.name || `Game ${game.steamId}`}
                                            className="w-20 h-12 object-cover rounded"
                                        />
                                    )}
                                    <span className="font-medium">
                                        {game.name || `Game ${game.steamId}`}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className={hasDiscount ? 'text-foreground font-medium' : ''}>
                                    {formatPrice(game.currentPrice)}
                                </span>
                            </TableCell>
                            <TableCell>
                                {hasDiscount ? (
                                    <Badge className="text-xs bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400">
                                        -{game.discountPercent}%
                                    </Badge>
                                ) : (
                                    <span className="text-muted-foreground">—</span>
                                )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                                {new Date(game.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <a
                                        href={`https://store.steampowered.com/app/${game.steamId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                        title="Open in Steam Store"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <LinkIcon size={14} />
                                    </a>
                                    <a
                                        href={`https://steamdb.info/app/${game.steamId}/`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                        title="Open in SteamDB"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <DatabaseIcon size={14} />
                                    </a>
                                    {showMoveButton && (
                                        <button
                                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                            title="Move to another wishlist"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onMoveGame(game.id, game.name || `Game ${game.steamId}`);
                                            }}
                                        >
                                            <ListPlusIcon size={14} />
                                        </button>
                                    )}
                                    <button
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                        title="Remove from wishlist"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveGame(game.id, game.name || `Game ${game.steamId}`);
                                        }}
                                    >
                                        <TrashIcon size={14} />
                                    </button>
                                </div>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
};

export default WishlistGamesTable;
