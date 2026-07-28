import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    useGetGamesQuery,
    useGetWishlistsQuery,
} from '../../app/services/wishlistApi';
import type { GameSummary } from '../../app/services/wishlistApi';
import { Button } from '../../../components/ui/button';
import {
    Card,
    CardContent,
} from '../../../components/ui/card';
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
    PlusIcon,
    ListIcon,
    ArrowLeftIcon,
    ArrowClockwiseIcon,
    CaretUpDownIcon,
    CaretUpIcon,
    CaretDownIcon,
} from '@phosphor-icons/react';

type SortKey = 'name' | 'currentPrice' | 'discountPercent' | 'createdAt';
type SortDir = 'asc' | 'desc';

const WishlistGamesPage = () => {
    const { id: wishlistId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: wishlists } = useGetWishlistsQuery();
    const { data: games = [], isLoading, refetch } = useGetGamesQuery(wishlistId || '');

    const [sortKey, setSortKey] = useState<SortKey>('createdAt');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [filterOnSale, setFilterOnSale] = useState(false);

    const wishlist = wishlists?.find((w) => w.id === wishlistId);

    const filteredGames = filterOnSale
        ? games.filter((g) => g.discountPercent !== undefined && g.discountPercent > 0)
        : games;

    const sortedGames = [...filteredGames].sort((a, b) => {
        let comparison = 0;

        switch (sortKey) {
            case 'name':
                comparison = (a.name || '').localeCompare(b.name || '');
                break;
            case 'currentPrice':
                comparison = (a.currentPrice || 0) - (b.currentPrice || 0);
                break;
            case 'discountPercent':
                comparison = (a.discountPercent || 0) - (b.discountPercent || 0);
                break;
            case 'createdAt':
                comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                break;
        }

        return sortDir === 'asc' ? comparison : -comparison;
    });

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortKey !== column) {
            return <CaretUpDownIcon size={14} weight="light" className="text-muted-foreground" />;
        }
        return sortDir === 'asc'
            ? <CaretUpIcon size={14} weight="bold" />
            : <CaretDownIcon size={14} weight="bold" />;
    };

    const formatPrice = (price: number | undefined) => {
        if (price == null) return '—';
        return `$${price.toFixed(2)}`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading games...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/wishlists')}>
                            <ArrowLeftIcon size={24} />
                        </Button>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-semibold">
                                {wishlist?.name || 'Wishlist'}
                            </h1>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">
                                {sortedGames.length === filteredGames.length
                                    ? `${games.length} ${games.length === 1 ? 'game' : 'games'}`
                                    : `${filteredGames.length} of ${games.length} games on sale`}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                    >
                        <ArrowClockwiseIcon size={16} className="mr-1" />
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => navigate(`/wishlists/${wishlistId}/add`)}
                    >
                        <PlusIcon size={16} weight="bold" className="mr-1" />
                        Add Game
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filterOnSale}
                            onChange={(e) => setFilterOnSale(e.target.checked)}
                            className="rounded border-input"
                        />
                        <span className="text-sm text-foreground">Show only on sale</span>
                    </label>
                </div>
            </div>

            {/* Table */}
            {sortedGames.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <ListIcon size={48} weight="light" className="text-muted-foreground mb-4" />
                        <p className="text-lg font-medium text-foreground">
                            {games.length === 0 ? 'No games yet' : 'No games match your filter'}
                        </p>
                        <p className="text-muted-foreground mt-1 max-w-xs">
                            {games.length === 0
                                ? 'Add your first game to this wishlist.'
                                : 'Try adjusting your filters.'}
                        </p>
                        {games.length === 0 && (
                            <Button className="mt-4" onClick={() => navigate(`/wishlists/${wishlistId}/add`)}>
                                <PlusIcon size={18} weight="bold" className="mr-2" />
                                Add Game
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead
                                    className="cursor-pointer select-none hover:text-foreground transition-colors"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center gap-1">
                                        Game
                                        <SortIcon column="name" />
                                    </div>
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer select-none hover:text-foreground transition-colors"
                                    onClick={() => handleSort('currentPrice')}
                                >
                                    <div className="flex items-center gap-1">
                                        Price
                                        <SortIcon column="currentPrice" />
                                    </div>
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer select-none hover:text-foreground transition-colors"
                                    onClick={() => handleSort('discountPercent')}
                                >
                                    <div className="flex items-center gap-1">
                                        Discount
                                        <SortIcon column="discountPercent" />
                                    </div>
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer select-none hover:text-foreground transition-colors"
                                    onClick={() => handleSort('createdAt')}
                                >
                                    <div className="flex items-center gap-1">
                                        Added
                                        <SortIcon column="createdAt" />
                                    </div>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedGames.map((game: GameSummary, index) => {
                                const hasDiscount = game.discountPercent !== undefined && game.discountPercent > 0;
                                return (
                                    <TableRow
                                        key={game.steamId}
                                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => navigate(`/game/${game.steamId}`)}
                                    >
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
                                                <Badge variant="destructive" className="text-xs">
                                                    -{game.discountPercent}%
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {new Date(game.createdAt).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
};

export default WishlistGamesPage;
