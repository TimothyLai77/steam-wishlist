import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from './store/store';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import AppLayout from './components/Layout/AppLayout';

// Public pages
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';

// Protected pages
import DashboardPage from './features/dashboard/DashboardPage';
import WishlistsPage from './features/wishlists/WishlistsPage';
import WishlistGamesPage from './features/wishlists/WishlistGamesPage';
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

        {/* Protected routes wrapped in AppLayout */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/wishlists" element={<WishlistsPage />} />
          <Route path="/wishlists/:id" element={<WishlistGamesPage />} />
          <Route path="/game/:steamId" element={<GameDetailPage />} />
        </Route>

        {/* Catch-all 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default Router;
