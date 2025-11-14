import styles from '../styles/dashboard.module.css';

const qaSummaryCards = [
  {
    title: 'Tổng test case',
    value: '1.284',
    badge: 'Sprint 12',
    change: '+4,2%',
    changeLabel: 'so với sprint trước',
    tone: 'positive',
    accent: '#4263eb',
    accentSoft: 'rgba(66, 99, 235, 0.16)',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M4.75 3A1.75 1.75 0 0 0 3 4.75v14.5A1.75 1.75 0 0 0 4.75 21h14.5A1.75 1.75 0 0 0 21 19.25V4.75A1.75 1.75 0 0 0 19.25 3ZM7 6.5h10a.5.5 0 0 1 0 1H7a.5.5 0 0 1 0-1Zm0 4h10a.5.5 0 0 1 0 1H7a.5.5 0 0 1 0-1Zm0 4h6a.5.5 0 0 1 0 1H7a.5.5 0 0 1 0-1Z"
          fill="currentColor"
        />
      </svg>
    ),
    trend: [64, 72, 78, 82, 90, 96, 100],
  },
  {
    title: 'Test tự động',
    value: '842',
    badge: 'Automation',
    change: '+6,8%',
    changeLabel: 'đã cập nhật tuần này',
    tone: 'positive',
    accent: '#15aabf',
    accentSoft: 'rgba(21, 170, 191, 0.18)',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M11 2.05v1.54a5 5 0 0 1 0 9.82v1.54a1 1 0 0 0 1.52.85l1.33-.77a5 5 0 0 1 3.91 0l1.33.77a1 1 0 0 0 1.48-.87v-1.54a5 5 0 0 1 0-9.82V2.05a1 1 0 0 0-1.52-.85l-1.33.77a5 5 0 0 1-3.91 0l-1.33-.77A1 1 0 0 0 11 2.05Z"
          fill="currentColor"
        />
        <path
          d="M4 7.5h4.5a.75.75 0 0 1 0 1.5H4a.75.75 0 0 1 0-1.5Zm0 4H8a.75.75 0 0 1 0 1.5H4a.75.75 0 0 1 0-1.5Zm0 4h5.5a.75.75 0 0 1 0 1.5H4a.75.75 0 0 1 0-1.5Z"
          fill="currentColor"
        />
      </svg>
    ),
    trend: [28, 46, 58, 72, 84, 92, 98],
  },
  {
    title: 'Độ phủ kiểm thử',
    value: '82%',
    badge: 'Coverage',
    change: '+3,4%',
    changeLabel: 'tăng so với bản build trước',
    tone: 'neutral',
    accent: '#845ef7',
    accentSoft: 'rgba(132, 94, 247, 0.16)',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M11 2a1 1 0 0 0-1 1v3.26a6 6 0 1 0 2 0V3a1 1 0 0 0-1-1Zm0 8a4 4 0 1 1-4 4 4 4 0 0 1 4-4Z"
          fill="currentColor"
        />
      </svg>
    ),
    trend: [70, 72, 74, 78, 80, 82, 84],
  },
  {
    title: 'Lỗi nghiêm trọng',
    value: '5',
    badge: 'Critical',
    change: '-2',
    changeLabel: 'đã khắc phục trong 24h',
    tone: 'positive',
    accent: '#ffa94d',
    accentSoft: 'rgba(255, 169, 77, 0.2)',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M10.27 3.36 2.47 17.08A1.75 1.75 0 0 0 4 19.67h16a1.75 1.75 0 0 0 1.53-2.59L13.73 3.36a1.75 1.75 0 0 0-3.46 0ZM12 14.25a.75.75 0 0 1-.75-.75v-3.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-.75.75Zm0 3a1 1 0 1 1 1-1 1 1 0 0 1-1 1Z"
          fill="currentColor"
        />
      </svg>
    ),
    trend: [48, 42, 36, 30, 24, 18, 12],
  },
];

const recentRuns = [
  {
    name: 'Regression Suite',
    time: 'Hoàn tất 08:45 - 10/09',
    duration: '2h 14m',
    environment: 'Chrome, Edge, Safari',
    passRate: '98%',
    status: 'passed',
  },
  {
    name: 'Smoke build #312',
    time: 'Đang chạy - 09:20',
    duration: '18m',
    environment: 'Staging',
    passRate: 'Đang cập nhật',
    status: 'warning',
  },
  {
    name: 'API contract',
    time: 'Hoàn tất 21:10 - 09/09',
    duration: '42m',
    environment: 'Postman CI',
    passRate: '92%',
    status: 'passed',
  },
  {
    name: 'Cross-device UI',
    time: 'Thất bại 18:32 - 09/09',
    duration: '1h 05m',
    environment: 'iOS, Android',
    passRate: '78%',
    status: 'failed',
  },
];

const defectBreakdown = [
  { label: 'Giao diện', count: 18, percentage: 36, color: '#4c6ef5' },
  { label: 'API & tích hợp', count: 14, percentage: 28, color: '#22b8cf' },
  { label: 'Logic nghiệp vụ', count: 10, percentage: 20, color: '#845ef7' },
  { label: 'Hiệu năng', count: 8, percentage: 16, color: '#ef5da8' },
];

const automationCoverage = {
  total: 82,
  change: '+3,4%',
  suites: [
    { label: 'UI end-to-end', value: 74, delta: '+6,2%' },
    { label: 'API', value: 96, delta: '+1,1%' },
    { label: 'Integration', value: 68, delta: '+4,5%' },
  ],
};

const qaTimeline = [
  {
    label: '12/09',
    title: 'Kiểm thử hồi quy',
    detail: 'Hoàn thành script mới cho module CRM',
    status: 'done',
  },
  {
    label: '13/09',
    title: 'Kiểm thử tải',
    detail: 'JMeter 5k users - chuẩn bị báo cáo hiệu năng',
    status: 'progress',
  },
  {
    label: '15/09',
    title: 'Kiểm thử chấp nhận',
    detail: 'Phiên UAT với khối vận hành',
    status: 'upcoming',
  },
];

const qaChecklist = [
  {
    title: 'Xác nhận build ổn định',
    detail: 'Đã kiểm tra chữ ký & version 3.12.4',
    state: 'done',
  },
  {
    title: 'Kiểm thử smoke sau deploy',
    detail: '6/8 test case đã hoàn thành',
    state: 'progress',
  },
  {
    title: 'Cập nhật test case hồi quy',
    detail: 'Chờ review từ đội sản phẩm',
    state: 'todo',
  },
];

const releaseHealth = [
  { label: 'Backend API', state: 'Ổn định', tone: 'success' },
  { label: 'Portal quản trị', state: 'Cần theo dõi', tone: 'warning' },
  { label: 'Ứng dụng di động', state: 'Kiểm thử lại', tone: 'danger' },
];

const statusLabels = {
  passed: 'Đạt',
  warning: 'Đang chạy',
  failed: 'Thất bại',
};

function Testing() {
  return (
    <div className={styles['dashboard-page']}>
      <header className={styles['dashboard-page__header']}>
        <div>
          <p className={styles['dashboard-page__welcome']}>Trung tâm kiểm thử</p>
          <h1>Testing &amp; QA</h1>
          <p className={styles['dashboard-page__subtitle']}>
            Theo dõi tiến độ kiểm thử, độ phủ tự động hóa và sức khỏe bản build hiện tại.
          </p>
        </div>
        <div className={styles['dashboard-page__actions']}>
          <button
            type="button"
            className={`${styles['dashboard__button']} ${styles['dashboard__button--ghost']}`}
          >
            Sprint 12
          </button>
          <button
            type="button"
            className={`${styles['dashboard__button']} ${styles['dashboard__button--primary']}`}
          >
            Tải báo cáo QA
          </button>
        </div>
      </header>

      <div className={styles['dashboard-page__layout']}>
        <div className={styles['dashboard-page__main']}>
          <section className={styles['dashboard-summary']} aria-label="Tổng quan kiểm thử">
            {qaSummaryCards.map((card) => (
              <article
                key={card.title}
                className={styles['summary-card']}
                style={{ '--card-accent': card.accent, '--card-accent-soft': card.accentSoft }}
              >
                <header className={styles['summary-card__header']}>
                  <span className={styles['summary-card__icon']} aria-hidden="true">
                    {card.icon}
                  </span>
                  <span className={styles['summary-card__badge']}>{card.badge}</span>
                </header>
                <div className={styles['summary-card__content']}>
                  <strong>{card.value}</strong>
                  <p>{card.title}</p>
                </div>
                <p
                  className={`${styles['summary-card__change']} ${styles[`summary-card__change--${card.tone}`]}`}
                >
                  {card.change}
                  <span>{card.changeLabel}</span>
                </p>
                <div className={styles['summary-card__trend']} aria-hidden="true">
                  {card.trend.map((value, index) => (
                    <span
                      key={`${card.title}-${index}`}
                      className={styles['summary-card__trend-bar']}
                      style={{ '--bar-value': `${value}%` }}
                    />
                  ))}
                </div>
              </article>
            ))}
          </section>

          <section className={styles['dashboard-panels']} aria-label="Chi tiết bản build">
            <article className={styles['dashboard-panel']}>
              <header className={styles['dashboard-panel__header']}>
                <div>
                  <h2>Lượt chạy gần đây</h2>
                  <p>Theo dõi trạng thái các bộ kiểm thử quan trọng.</p>
                </div>
                <button
                  type="button"
                  className={`${styles['dashboard__button']} ${styles['dashboard__button--ghost']}`}
                >
                  Xem lịch sử
                </button>
              </header>
              <ul className={styles['testing-runs__list']}>
                {recentRuns.map((run) => (
                  <li key={run.name} className={styles['testing-runs__item']}>
                    <div className={styles['testing-runs__meta']}>
                      <h3>{run.name}</h3>
                      <span>{run.time}</span>
                      <div className={styles['testing-runs__summary']}>
                        <span>{run.duration}</span>
                        <span>{run.environment}</span>
                        <span>Tỷ lệ đạt: {run.passRate}</span>
                      </div>
                    </div>
                    <span
                      className={`${styles['status-pill']} ${styles[`status-pill--${run.status}`]}`}
                    >
                      {statusLabels[run.status]}
                    </span>
                  </li>
                ))}
              </ul>
            </article>

            <article className={styles['dashboard-panel']}>
              <header className={styles['dashboard-panel__header']}>
                <div>
                  <h2>Phân loại lỗi</h2>
                  <p>Tập trung xử lý các nhóm lỗi có ảnh hưởng lớn.</p>
                </div>
                <span className={`${styles.pill} ${styles['pill--info']}`}>57 lỗi mở</span>
              </header>
              <ul className={styles['defect-list']}>
                {defectBreakdown.map((item) => (
                  <li key={item.label} className={styles['defect-list__item']}>
                    <div className={styles['defect-list__meta']}>
                      <span>{item.label}</span>
                      <strong>{item.count}</strong>
                    </div>
                    <div
                      className={styles['defect-list__progress']}
                      style={{ '--defect-progress': `${item.percentage}%`, '--defect-color': item.color }}
                    >
                      <span aria-hidden="true" />
                    </div>
                    <span className={styles['defect-list__percentage']}>
                      {item.percentage}% tổng lỗi
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className={styles['dashboard-insights']} aria-label="Thông tin kiểm thử">
            <article className={styles['dashboard-panel']}>
              <header className={styles['dashboard-panel__header']}>
                <div>
                  <h2>Độ phủ tự động hóa</h2>
                  <p>Tổng quan độ phủ kiểm thử theo từng bộ script.</p>
                </div>
                <span className={`${styles.pill} ${styles['pill--success']}`}>{automationCoverage.change}</span>
              </header>
              <div className={styles['coverage-summary']}>
                <div className={styles['coverage-summary__chart']} aria-hidden="true">
                  <div className={styles['coverage-summary__ring']}>
                    <svg viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="54" className={styles['coverage-summary__ring-track']} />
                      <circle
                        cx="60"
                        cy="60"
                        r="54"
                        className={styles['coverage-summary__ring-progress']}
                        style={{ '--coverage-progress': automationCoverage.total }}
                      />
                    </svg>
                    <div className={styles['coverage-summary__value']}>
                      <strong>{automationCoverage.total}%</strong>
                      <span>Độ phủ chung</span>
                    </div>
                  </div>
                </div>
                <ul className={styles['coverage-summary__list']}>
                  {automationCoverage.suites.map((suite) => (
                    <li key={suite.label}>
                      <div>
                        <strong>{suite.value}%</strong>
                        <span>{suite.label}</span>
                      </div>
                      <span className={styles['coverage-summary__delta']}>{suite.delta}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <article className={styles['dashboard-panel']}>
              <header className={styles['dashboard-panel__header']}>
                <div>
                  <h2>Kế hoạch kiểm thử</h2>
                  <p>Lịch trình công việc của đội QA trong tuần.</p>
                </div>
              </header>
              <ul className={styles['qa-timeline']}>
                {qaTimeline.map((item) => (
                  <li key={item.title} data-status={item.status}>
                    <span className={styles['qa-timeline__date']}>{item.label}</span>
                    <div className={styles['qa-timeline__content']}>
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        </div>

        <aside className={styles['dashboard-page__aside']}>
          <section className={styles['dashboard-aside-card']} aria-label="Checklist QA">
            <header>
              <h2>Checklist sprint</h2>
              <p>Đảm bảo các hạng mục quan trọng được hoàn thành trước UAT.</p>
            </header>
            <ul className={styles['qa-checklist']}>
              {qaChecklist.map((item) => (
                <li key={item.title} data-state={item.state}>
                  <span className={styles['qa-checklist__status']} aria-hidden="true">
                    {item.state === 'done' ? '✓' : item.state === 'progress' ? '•' : ''}
                  </span>
                  <div className={styles['qa-checklist__content']}>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles['dashboard-aside-card']} aria-label="Sức khỏe bản build">
            <header>
              <h2>Build health</h2>
              <p>Trạng thái của các khu vực quan trọng trước khi release.</p>
            </header>
            <ul className={styles['release-health']}>
              {releaseHealth.map((item) => (
                <li key={item.label}>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.state}</span>
                  </div>
                  <span className={`${styles['status-pill']} ${styles[`status-pill--${item.tone}`]}`}>
                    {item.tone === 'success' && 'Ổn định'}
                    {item.tone === 'warning' && 'Cần theo dõi'}
                    {item.tone === 'danger' && 'Cảnh báo'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default Testing;
