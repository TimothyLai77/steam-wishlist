import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from './store/store';
import ProtectedRoute from './components/Layout/ProtectedRoute';

// Public pages
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';

// Protected pages
import DashboardPage from './features/dashboard/DashboardPage';
import WishlistsPage from './features/wishlists/WishlistsPage';
import WishlistGamesPage from './features/wishlists/WishlistGamesPage';
import AddGamePage from './features/wishlists/AddGamePage';
import GameDetailPage from './features/games/GameDetailPage';

// Redirect authenticated users away from login/register
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  const { status } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  if (token && (status === 'succeeded' || status === 'idle')) {
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Root path redirect based on auth status
const RootRedirect = () => {
  const token = localStorage.getItem('token');
  const { status } = useSelector((state: RootState) => state.auth);

  if (token && (status === 'succeeded' || status === 'idle')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

const Router = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* Public routes */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wishlists"
          element={
            <ProtectedRoute>
              <WishlistsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wishlists/:id"
          element={
            <ProtectedRoute>
              <WishlistGamesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wishlists/:id/add"
          element={
            <ProtectedRoute>
              <AddGamePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/:steamId"
          element={
            <ProtectedRoute>
              <GameDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default Router;
