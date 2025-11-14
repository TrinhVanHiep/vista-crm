import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { label: 'Tổng quan', to: '/' },
  { label: 'Khóa học', to: '/courses' },
  { label: 'Học viên', to: '/students' },
  { label: 'Giảng viên', to: '/teachers' },
  { label: 'Doanh thu', to: '/finance' },
  { label: 'Cài đặt', to: '/settings' },
];

function DashboardLayout() {
  return (
    <div className="dashboard">
      <aside className="dashboard__sidebar">
        <div className="dashboard__brand">
          <span className="dashboard__brand-mark">V</span>
          <div className="dashboard__brand-name">
            <strong>Vista CRM</strong>
            <span>Academy Suite</span>
          </div>
        </div>

        <nav className="dashboard__nav" aria-label="Điều hướng chính">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `dashboard__nav-item${isActive ? ' dashboard__nav-item--active' : ''}`
              }
            >
              <span className="dashboard__nav-indicator" aria-hidden="true" />
              <span className="dashboard__nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="dashboard__support-card" role="presentation">
          <div className="dashboard__support-illustration" aria-hidden="true" />
          <h3>Hỗ trợ 24/7</h3>
          <p>
            Đội ngũ Vista CRM luôn sẵn sàng giúp bạn xây dựng trải nghiệm học tập tốt
            nhất.
          </p>
          <button type="button" className="dashboard__support-button">
            Liên hệ ngay
          </button>
        </div>
      </aside>

      <div className="dashboard__main">
        <header className="dashboard__topbar">
          <div className="dashboard__search" role="search">
            <span className="dashboard__search-icon" aria-hidden="true">🔍</span>
            <input type="search" placeholder="Tìm kiếm học viên, khóa học..." />
          </div>
          <div className="dashboard__topbar-actions">
            <button type="button" className="dashboard__button dashboard__button--secondary">
              + Tạo lịch học
            </button>
            <button
              type="button"
              className="dashboard__icon-button"
              aria-label="Xem thông báo"
            >
              🔔
            </button>
            <div className="dashboard__user">
              <div className="dashboard__user-avatar" aria-hidden="true">
                <span>EV</span>
              </div>
              <div className="dashboard__user-meta">
                <strong>Evan Torres</strong>
                <span>Quản trị viên</span>
              </div>
            </div>
          </div>
        </header>
        <main className="dashboard__content" aria-live="polite">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
