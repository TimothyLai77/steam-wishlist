import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const token = localStorage.getItem('token');
  const { status } = useSelector((state: RootState) => state.auth);

  // No token → redirect to login immediately
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Token exists but auth failed → redirect to login
  if (status === 'failed') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
