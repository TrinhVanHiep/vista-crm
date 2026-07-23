import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getDefaultRouteForRole } from '../auth/roleRoutes';
import styles from '../styles/auth.module.css';

function Unauthorized() {
  const { role } = useAuth();
  const fallbackRoute = getDefaultRouteForRole(role);
  const safeRoute = fallbackRoute === '/unauthorized' ? '/login' : fallbackRoute;

  return (
    <div className={styles['auth-shell']}>
      <div className={`${styles['auth-card']} ${styles['auth-card--simple']}`}>
        <span className={styles['auth-badge']}>Truy cập bị hạn chế</span>
        <h1>Không đủ quyền</h1>
        <p className={styles.muted}>
          Bạn không có quyền truy cập vào trang này. Vui lòng chọn tính năng khác hoặc đăng nhập với
          vai trò phù hợp.
        </p>
        <Link className={styles['auth-button']} to={safeRoute}>
          Quay về trang chủ
        </Link>
      </div>
    </div>
  );
}

export default Unauthorized;
