import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

// quyenRieng: tên cờ quyền cấp riêng trên user (vd. "quyen_ghi_tai_chinh") — có cờ thì vào được dù vai không nằm trong allowedRoles.
function RoleGuard({ allowedRoles, quyenRieng, children }) {
  const { isAuthenticated, hasRole, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!hasRole(allowedRoles) && !(quyenRieng && user?.[quyenRieng])) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

export default RoleGuard;
