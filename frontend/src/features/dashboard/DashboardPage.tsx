import { useSelector } from 'react-redux';
import { useGetWishlistsQuery, useGetAllGamesQuery } from '../../app/services/wishlistApi';
import type { RootState } from '../../store/store';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { StatCard } from './StatCard';

interface DashboardStats {
  totalGames: number;
  totalValue: number;
  onSaleCount: number;
  totalSavings: number;
  recentGames: Array<{
    name: string;
    steamId: number;
    addedAt: string;
    price: number | null;
    wishlistName: string;
  }>;
}

const calculateDashboardStats = (allGames: Array<{
  steamId: number;
  name: string | null;
  currentPrice: number | null;
  originalPrice: number | null;
  discountPercent: number | null;
  addedAt: string;
  wishlistId: string;
  wishlistName: string;
}>): DashboardStats => {
  // Sort by addedAt descending, take the 5 most recent
  const sorted = [...allGames].sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
  const recentGames = sorted.slice(0, 5).map((game) => ({
    name: game.name || `Game #${game.steamId}`,
    steamId: game.steamId,
    addedAt: game.addedAt,
    price: game.currentPrice,
    wishlistName: game.wishlistName,
  }));

  const totalGames = allGames.length;
  const totalValue = allGames.reduce((sum, game) => {
    return sum + (game.currentPrice ?? 0);
  }, 0);

  const onSaleCount = allGames.filter((game) => (game.discountPercent ?? 0) > 0).length;

  // Calculate savings from originalPrice vs currentPrice
  const totalSavings = allGames.reduce((sum, game) => {
    if (game.originalPrice != null && game.currentPrice != null && game.originalPrice > game.currentPrice) {
      return sum + (game.originalPrice - game.currentPrice);
    }
    return sum;
  }, 0);

  return {
    totalGames,
    totalValue,
    onSaleCount,
    totalSavings,
    recentGames,
  };
};

const DashboardPage = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { isLoading: wishlistsLoading, error: wishlistsError } = useGetWishlistsQuery();
  const { data: allGames, isLoading: allGamesLoading, error: allGamesError } = useGetAllGamesQuery();

  const loading = wishlistsLoading || allGamesLoading;
  const hasError = wishlistsError || allGamesError;

  // Compute stats from all games (single static hook, no dynamic hook calls)
  const stats = calculateDashboardStats(allGames ?? []);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/20 border-t-foreground" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-medium text-foreground">Unable to load dashboard data</p>
          <p className="text-xs text-muted-foreground">
            The backend API may not be available yet. Check that the server is running.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {user?.username ?? 'User'}
          </p>
        </div>
        <Badge variant="secondary">
          {stats.totalGames} games tracked
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Games"
          value={stats.totalGames}
          description="Across all wishlists"
        />
        <StatCard
          title="Total Wishlist Value"
          value={`$${stats.totalValue.toFixed(2)}`}
          description="Current prices combined"
        />
        <StatCard
          title="On Sale"
          value={
            <span className="text-emerald-500">
              {stats.onSaleCount}
              <Badge
                variant="outline"
                className="ml-2 text-xs text-emerald-500 ring-1 ring-emerald-500/20"
              >
                {stats.totalGames > 0 ? ((stats.onSaleCount / stats.totalGames) * 100).toFixed(0) : 0}%
              </Badge>
            </span>
          }
          description="Games with active discounts"
        />
        <StatCard
          title="Estimated Savings"
          value={
            <span className="text-emerald-500">
              ${stats.totalSavings.toFixed(2)}
            </span>
          }
          description="From current discounts"
        />
      </div>

      {/* Recent Additions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Additions</CardTitle>
          <CardDescription>Latest games added to your wishlists</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentGames.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">No games added yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add your first game to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentGames.map((game) => (
                <div
                  key={`${game.steamId}-${game.wishlistName}`}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{game.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {game.wishlistName}
                      </Badge>
                      {game.price !== null && (
                        <span className="text-xs text-muted-foreground">
                          ${game.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <a
                    href={`https://store.steampowered.com/app/${game.steamId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Steam Store ↗
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
