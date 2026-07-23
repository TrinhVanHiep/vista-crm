import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

function RoleGuard({ allowedRoles, children }) {
  const { isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!hasRole(allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

export default RoleGuard;
