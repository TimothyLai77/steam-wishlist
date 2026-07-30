import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    useGetGamesQuery,
    useGetWishlistsQuery,
    useDeleteGameMutation,
} from '../../app/services/wishlistApi';
import { AddGameDialog } from './AddGameDialog';
import { MoveGameDialog } from './MoveGameDialog';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button } from '../../../components/ui/button';
import {
    Card,
    CardContent,
} from '../../../components/ui/card';
import { toast } from '../../../components/ui/toast';
import {
    PlusIcon,
    ListIcon,
    ArrowLeftIcon,
    ArrowClockwiseIcon,
    TrashIcon,
} from '@phosphor-icons/react';
import WishlistGamesTable, {
    type SortKey,
    type SortDir,
} from './WishlistGamesTable';

const WishlistGamesPage = () => {
    const { id: wishlistId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: wishlists } = useGetWishlistsQuery();
    const { data: games = [], isLoading, refetch } = useGetGamesQuery(wishlistId || '');

    const [sortKey, setSortKey] = useState<SortKey>('createdAt');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [filterOnSale, setFilterOnSale] = useState(false);

    const [removingGame, setRemovingGame] = useState<{ id: string; name: string } | null>(null);
    const [movingGame, setMovingGame] = useState<{ id: string; name: string } | null>(null);
    const [deleteGame, { isLoading: deleting }] = useDeleteGameMutation();

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

    const handleRemoveGame = (gameId: string, gameName: string) => {
        setRemovingGame({ id: gameId, name: gameName });
    };

    const confirmDeleteGame = async () => {
        if (!removingGame || !wishlistId) return;
        try {
            await deleteGame({ gameId: removingGame.id, wishlistId }).unwrap();
            setRemovingGame(null);
            toast.add({
                title: 'Game removed',
                description: `${removingGame.name} was removed from your wishlist.`,
                type: 'success',
            });
        } catch {
            toast.add({
                title: 'Failed to remove game',
                description: 'Could not remove the game from your wishlist. Please try again.',
                type: 'destructive',
            });
        }
    };

    const handleMoveGame = (gameId: string, gameName: string) => {
        setMovingGame({ id: gameId, name: gameName });
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
                    <AddGameDialog wishlistId={wishlistId || ''} triggerNode={
                        <Button size="sm">
                            <PlusIcon size={16} weight="bold" className="mr-1" />
                            Add Game
                        </Button>
                    } />
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
                            <AddGameDialog wishlistId={wishlistId || ''} triggerNode={
                                <Button className="mt-4">
                                    <PlusIcon size={18} weight="bold" className="mr-2" />
                                    Add Game
                                </Button>
                            } />
                        )}
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <WishlistGamesTable
                        games={sortedGames}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                        formatPrice={formatPrice}
                        onRemoveGame={handleRemoveGame}
                        onMoveGame={handleMoveGame}
                        showMoveButton={(wishlists?.length ?? 0) > 1}
                    />
                </Card>
            )}

            {removingGame && wishlistId && (
                <ConfirmDialog
                    open={!!removingGame}
                    onOpenChange={(open) => {
                        if (!open) {
                            setRemovingGame(null);
                        }
                    }}
                    title={
                        <div className="flex items-center gap-2">
                            <TrashIcon size={20} weight="bold" className="text-red-500" />
                            Remove Game
                        </div>
                    }
                    description={
                        <>
                            Are you sure you want to remove <strong>{removingGame.name}</strong> from your wishlist? This cannot be undone.
                        </>
                    }
                    confirmLabel="Remove"
                    confirmVariant="destructive"
                    onConfirm={confirmDeleteGame}
                    isLoading={deleting}
                />
            )}

            {movingGame && wishlistId && (
                <MoveGameDialog
                    gameId={movingGame.id}
                    gameName={movingGame.name}
                    sourceWishlistId={wishlistId}
                    open={!!movingGame}
                    onOpenChange={(open) => {
                        if (!open) {
                            setMovingGame(null);
                        }
                    }}
                />
            )}
        </div>
    );
};

export default WishlistGamesPage;
