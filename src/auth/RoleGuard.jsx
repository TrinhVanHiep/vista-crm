import { Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { napCaiDat, useCaiDat } from '../utils/caiDat';

// quyenRieng: tên cờ quyền cấp riêng trên user (vd. "quyen_ghi_tai_chinh") — có cờ thì vào được dù vai không nằm trong allowedRoles.
function RoleGuard({ allowedRoles, quyenRieng, children }) {
  const { isAuthenticated, hasRole, user } = useAuth();
  const location = useLocation();
  // Ma trận quyền ở Cài đặt (13/11/2026) có thể mở thêm vai: chờ nạp xong rồi mới chặn.
  const { da_nap: daNap } = useCaiDat();
  useEffect(() => { if (isAuthenticated) napCaiDat(); }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!hasRole(allowedRoles) && !(quyenRieng && user?.[quyenRieng])) {
    if (!daNap) return null;
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

export default RoleGuard;
