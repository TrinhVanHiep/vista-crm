import { NavLink, Outlet } from 'react-router-dom';
import styles from '../styles/dashboard.module.css';

const navItems = [
  {
    label: 'Tổng quan',
    to: '/',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M4.75 10.25 12 4l7.25 6.25v8a1 1 0 0 1-1 1h-4.5a1 1 0 0 1-1-1v-3.75h-2.5V19a1 1 0 0 1-1 1H5.75a1 1 0 0 1-1-1z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    label: 'Khóa học',
    to: '/courses',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M4 6.75a1 1 0 0 1 .62-.92l6.75-2.7a1 1 0 0 1 .76 0l6.75 2.7a1 1 0 0 1 .62.92v10.5a1 1 0 0 1-1.38.92L12 15.56l-6.12 2.61A1 1 0 0 1 4 17.25z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    label: 'Học viên',
    to: '/students',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M16 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-8.5-2.25A3.25 3.25 0 1 0 4.25 6.5 3.25 3.25 0 0 0 7.5 9.75Zm.25 2.25A4.75 4.75 0 0 0 3 16.75v.5a2 2 0 0 0 2 2h6.39a5.94 5.94 0 0 1-.39-2.12 5.88 5.88 0 0 1 2.27-4.63A4.73 4.73 0 0 0 7.75 12Zm8.25 2a4 4 0 0 0-4 4 4 4 0 1 0 4-4Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    label: 'Giảng viên',
    to: '/teachers',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M4.75 5.5 12 2l7.25 3.5v3.75l-7.25 3.5-5.54-2.67V14a1 1 0 0 0 .63.92l4.91 1.96a3.25 3.25 0 1 0 6.25.62 3.24 3.24 0 0 0-2.5-3.15v-1.9l2.75-1.33V18a1 1 0 0 1-.63.92l-6 2.4a1 1 0 0 1-.74 0l-6-2.4A1 1 0 0 1 4 18V5.5a1 1 0 0 1 .75-.97Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    label: 'Kiểm thử',
    to: '/testing',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M9.75 3a.75.75 0 0 0-1.5 0v4.19L5.2 13a5.25 5.25 0 0 0 4.55 7.94h4.5A5.25 5.25 0 0 0 18.8 13l-3.05-5.81V3a.75.75 0 0 0-1.5 0v3.75h-4.5Z"
          fill="currentColor"
        />
        <path
          d="M9 15.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75 3.75 3.75 0 0 1-3.75 3.75A3.75 3.75 0 0 1 9 15.75Zm2.25-1.5a.75.75 0 1 1 0-1.5h1.5a.75.75 0 1 1 0 1.5Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    label: 'Doanh thu',
    to: '/finance',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M5 18.25a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1h2.5a1 1 0 0 1 1 1v7.75a1 1 0 0 1-1 1Zm6 0a1 1 0 0 1-1-1V5.75a1 1 0 0 1 1-1h2.5a1 1 0 0 1 1 1v11.5a1 1 0 0 1-1 1Zm6 0a1 1 0 0 1-1-1v-4.5a1 1 0 0 1 1-1H19a1 1 0 0 1 1 1v4.5a1 1 0 0 1-1 1Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    label: 'Cài đặt',
    to: '/settings',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M20.37 13.06a8.32 8.32 0 0 0 .07-1.06 8.32 8.32 0 0 0-.07-1.06l1.63-1.28a1 1 0 0 0 .24-1.25l-1.54-2.67a1 1 0 0 0-1.2-.44l-1.93.78a7.88 7.88 0 0 0-1.84-1.06l-.3-2.08A1 1 0 0 0 14.38 2h-3.08a1 1 0 0 0-1 .86l-.3 2.08a7.88 7.88 0 0 0-1.84 1.06l-1.93-.78a1 1 0 0 0-1.2.44L2.5 7.41a1 1 0 0 0 .24 1.25l1.63 1.28a8.32 8.32 0 0 0-.07 1.06 8.32 8.32 0 0 0 .07 1.06l-1.63 1.28a1 1 0 0 0-.24 1.25l1.54 2.67a1 1 0 0 0 1.2.44l1.93-.78a7.88 7.88 0 0 0 1.84 1.06l.3 2.08a1 1 0 0 0 1 .86h3.08a1 1 0 0 0 1-.86l.3-2.08a7.88 7.88 0 0 0 1.84-1.06l1.93.78a1 1 0 0 0 1.2-.44l1.54-2.67a1 1 0 0 0-.24-1.25ZM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

function DashboardLayout() {
  return (
    <div className={styles.dashboard}>
      <aside className={styles['dashboard__sidebar']}>
        <div className={styles['dashboard__brand']}>
          <span className={styles['dashboard__brand-mark']}>V</span>
          <div className={styles['dashboard__brand-name']}>
            <strong>Vista CRM</strong>
            <span>Academy Suite</span>
          </div>
        </div>

        <nav className={styles['dashboard__nav']} aria-label="Điều hướng chính">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `${styles['dashboard__nav-item']}${
                  isActive ? ` ${styles['dashboard__nav-item--active']}` : ''
                }`
              }
            >
              <span className={styles['dashboard__nav-icon']} aria-hidden="true">
                {item.icon}
              </span>
              <span className={styles['dashboard__nav-indicator']} aria-hidden="true" />
              <span className={styles['dashboard__nav-label']}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles['dashboard__support-card']} role="presentation">
          <div className={styles['dashboard__support-illustration']} aria-hidden="true" />
          <h3>Hỗ trợ 24/7</h3>
          <p>
            Đội ngũ Vista CRM luôn sẵn sàng giúp bạn xây dựng trải nghiệm học tập tốt
            nhất.
          </p>
          <button type="button" className={styles['dashboard__support-button']}>
            Liên hệ ngay
          </button>
        </div>
      </aside>

      <div className={styles['dashboard__main']}>
        <header className={styles['dashboard__topbar']}>
          <div className={styles['dashboard__search']} role="search">
            <span className={styles['dashboard__search-icon']} aria-hidden="true">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="m20.25 19.19-3.9-3.9a6.5 6.5 0 1 0-1.06 1.06l3.9 3.9a.75.75 0 1 0 1.06-1.06ZM6.75 11a4.25 4.25 0 1 1 4.25 4.25A4.25 4.25 0 0 1 6.75 11Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <input type="search" placeholder="Tìm kiếm học viên, khóa học..." />
          </div>
          <div className={styles['dashboard__topbar-actions']}>
            <button
              type="button"
              className={`${styles['dashboard__button']} ${styles['dashboard__button--secondary']}`}
            >
              + Tạo lịch học
            </button>
            <button
              type="button"
              className={`${styles['dashboard__icon-button']} ${styles['dashboard__icon-button--notification']}`}
              aria-label="Xem thông báo"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M12 22a2.25 2.25 0 0 0 2.12-1.5H9.88A2.25 2.25 0 0 0 12 22Zm7-5.5h-.75a.75.75 0 0 1-.75-.75v-4a6.5 6.5 0 1 0-13 0v4a.75.75 0 0 1-.75.75H3a.75.75 0 0 0 0 1.5h18a.75.75 0 0 0 0-1.5Z"
                  fill="currentColor"
                />
              </svg>
              <span className={styles['dashboard__notification-dot']} />
            </button>
            <div className={styles['dashboard__user']}>
              <div className={styles['dashboard__user-avatar']} aria-hidden="true">
                <span>EV</span>
              </div>
              <div className={styles['dashboard__user-meta']}>
                <strong>Evan Torres</strong>
                <span>Quản trị viên</span>
              </div>
              <span className={styles['dashboard__user-arrow']} aria-hidden="true">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="m7 10 5 5 5-5Z" fill="currentColor" />
                </svg>
              </span>
            </div>
          </div>
        </header>
        <main className={styles['dashboard__content']} aria-live="polite">
          <Outlet />
        </main>
        <button type="button" className={styles['dashboard__support-floating']}>
          <span className={styles['dashboard__support-floating-icon']} aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M12 2a10 10 0 0 0-7.07 17.07L4 22l2.93-.93A10 10 0 1 0 12 2Zm0 2a8 8 0 0 1 6.19 12.95.75.75 0 0 0-.16.7l.7 2.17-2.17-.7a.75.75 0 0 0-.7.16A8 8 0 1 1 12 4Zm-.5 4a1.5 1.5 0 1 0 1.5 1.5A1.5 1.5 0 0 0 11.5 8Zm0 3a.75.75 0 0 0-.75.75v3a.75.75 0 0 0 1.5 0v-3A.75.75 0 0 0 11.5 11Z"
                fill="currentColor"
              />
            </svg>
          </span>
          Hỗ trợ
        </button>
      </div>
    </div>
  );
}

export default DashboardLayout;
