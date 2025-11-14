import styles from '../styles/dashboard.module.css';

const summaryCards = [
  {
    title: 'Tổng số học viên',
    value: '15.928',
    change: '+8,4%',
    changeLabel: 'so với tháng trước',
    tone: 'positive',
    accent: '#4c6ef5',
    accentSoft: 'rgba(76, 110, 245, 0.16)',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M5 10.25 12 5l7 5.25V19a1 1 0 0 1-1 1h-4.5a1 1 0 0 1-1-1v-3.75h-3V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1Z"
          fill="currentColor"
        />
      </svg>
    ),
    trend: [64, 72, 78, 82, 90, 96, 100],
  },
  {
    title: 'Học viên mới',
    value: '1.245',
    change: '+12,1%',
    changeLabel: 'đã ghi danh trong tháng',
    tone: 'positive',
    accent: '#22b8cf',
    accentSoft: 'rgba(34, 184, 207, 0.18)',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M12 12.5a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM5 20a1 1 0 0 1-1-1 6 6 0 0 1 12 0 1 1 0 0 1-1 1Z"
          fill="currentColor"
        />
        <path d="M19 11.25v-2a.75.75 0 0 0-1.5 0v2h-2a.75.75 0 0 0 0 1.5h2v2a.75.75 0 0 0 1.5 0v-2h2a.75.75 0 0 0 0-1.5Z" fill="currentColor" />
      </svg>
    ),
    trend: [28, 46, 58, 60, 72, 86, 92],
  },
  {
    title: 'Đã tốt nghiệp',
    value: '9.836',
    change: '+3,2%',
    changeLabel: 'hoàn thành chứng chỉ',
    tone: 'neutral',
    accent: '#845ef7',
    accentSoft: 'rgba(132, 94, 247, 0.16)',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="m12 3 9 4.5-9 4.5-9-4.5Zm0 8 5.7-2.85v3.82a3 3 0 0 1-1.76 2.73l-3.94 1.77a1 1 0 0 1-.79 0L7.26 14.7A3 3 0 0 1 5.5 12V8.17Z"
          fill="currentColor"
        />
        <path d="M7.5 15.92 12 18l4.5-2.08V21l-4.5 2-4.5-2Z" fill="currentColor" />
      </svg>
    ),
    trend: [74, 78, 80, 84, 86, 88, 90],
  },
  {
    title: 'Lớp học hoạt động',
    value: '128',
    change: '-1,4%',
    changeLabel: 'đang mở trong tuần',
    tone: 'negative',
    accent: '#ffa94d',
    accentSoft: 'rgba(255, 169, 77, 0.2)',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M5.25 4.5h13.5a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H5.25a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Zm.75 3v9h12V7.5ZM8 20.5h8"
          fill="currentColor"
        />
      </svg>
    ),
    trend: [94, 90, 86, 80, 76, 72, 68],
  },
];

const monthlyPerformance = [
  { label: 'Th1', value: 54 },
  { label: 'Th2', value: 62 },
  { label: 'Th3', value: 70 },
  { label: 'Th4', value: 66 },
  { label: 'Th5', value: 82 },
  { label: 'Th6', value: 78 },
  { label: 'Th7', value: 96 },
  { label: 'Th8', value: 88 },
  { label: 'Th9', value: 92 },
  { label: 'Th10', value: 86 },
  { label: 'Th11', value: 90 },
  { label: 'Th12', value: 94 },
];

const attendanceSplit = [
  { label: 'Đi học đầy đủ', value: 2000, color: '#4c6ef5' },
  { label: 'Đi học không đều', value: 420, color: '#ffa94d' },
  { label: 'Vắng', value: 215, color: '#ef5da8' },
];

const totalStudents = attendanceSplit.reduce((sum, item) => sum + item.value, 0);

const radialStops = attendanceSplit.reduce((acc, item, index) => {
  const start = index === 0 ? 0 : acc[index - 1].end;
  const end = start + (item.value / totalStudents) * 100;
  return [
    ...acc,
    {
      ...item,
      start,
      end,
    },
  ];
}, []);

const radialGradient = radialStops.map((item) => `${item.color} ${item.start}% ${item.end}%`).join(', ');

const studentTrends = [
  { label: 'Mon', value: 74 },
  { label: 'Tue', value: 68 },
  { label: 'Wed', value: 80 },
  { label: 'Thu', value: 88 },
  { label: 'Fri', value: 76 },
  { label: 'Sat', value: 66 },
  { label: 'Sun', value: 58 },
];

const financeHighlights = [
  { label: 'Doanh thu tháng', value: '152.588.000 ₫' },
  { label: 'Chi phí vận hành', value: '36.120.000 ₫' },
  { label: 'Tỉ lệ chuyển đổi', value: '68,4%' },
];

const reminders = [
  {
    title: 'Phê duyệt học viên mới',
    detail: '08 hồ sơ đang chờ xét duyệt',
  },
  {
    title: 'Gửi báo cáo định kỳ',
    detail: 'Cần hoàn thành trước 17:00 hôm nay',
  },
  {
    title: 'Theo dõi feedback khóa B2',
    detail: '12 phản hồi chưa phản hồi',
  },
];

const calendarWeekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const calendarDays = [
  { date: 29, isMuted: true },
  { date: 30, isMuted: true },
  { date: 31, isMuted: true },
  { date: 1, events: [{ label: 'Khai giảng IELTS', color: 'blue' }] },
  { date: 2 },
  { date: 3, events: [{ label: 'Báo cáo tháng', color: 'orange' }] },
  { date: 4, events: [{ label: 'Workshop nội bộ', color: 'purple' }] },
  { date: 5 },
  { date: 6, events: [{ label: 'Định hướng học viên', color: 'green' }] },
  {
    date: 7,
    events: [
      { label: 'Thi thử TOEIC', color: 'blue' },
      { label: 'Họp CLB', color: 'orange' },
    ],
  },
  {
    date: 8,
    badge: 3,
    isHighlighted: true,
    events: [
      { label: 'Lịch tư vấn 1:1', color: 'purple' },
      { label: 'Đào tạo giáo viên', color: 'green' },
    ],
  },
  { date: 9 },
  { date: 10, events: [{ label: 'Workshop Speaking', color: 'blue' }] },
  { date: 11 },
  { date: 12 },
  { date: 13, events: [{ label: 'Gặp gỡ phụ huynh', color: 'orange' }] },
  { date: 14 },
  { date: 15, events: [{ label: 'Demo lớp mới', color: 'purple' }] },
  { date: 16 },
  {
    date: 17,
    events: [
      { label: 'Thuyết trình học viên', color: 'blue' },
      { label: 'Báo cáo tuần', color: 'orange' },
    ],
  },
  { date: 18 },
  { date: 19 },
  { date: 20, events: [{ label: 'Họp chiến lược', color: 'green' }] },
  { date: 21 },
  { date: 22, events: [{ label: 'Thi thử IELTS', color: 'blue' }] },
  { date: 23 },
  { date: 24, events: [{ label: 'Workshop kỹ năng mềm', color: 'purple' }] },
  { date: 25 },
  { date: 26 },
  { date: 27, events: [{ label: 'Coaching nhóm', color: 'green' }] },
  { date: 28 },
  { date: 29, events: [{ label: 'Đánh giá học viên', color: 'orange' }] },
  { date: 30, events: [{ label: 'Gặp gỡ phụ huynh', color: 'purple' }] },
  { date: 31, events: [{ label: 'Bế giảng', color: 'blue' }] },
  { date: 1, isMuted: true },
  { date: 2, isMuted: true },
  { date: 3, isMuted: true },
  { date: 4, isMuted: true },
  { date: 5, isMuted: true },
  { date: 6, isMuted: true },
  { date: 7, isMuted: true },
];

function Dashboard() {
  return (
    <div className={styles['dashboard-page']}>
      <header className={styles['dashboard-page__header']}>
        <div>
          <p className={styles['dashboard-page__welcome']}>Chào mừng trở lại, Evan! 👋</p>
          <h1>Tổng quan</h1>
          <p className={styles['dashboard-page__subtitle']}>
            Theo dõi hiệu suất đào tạo, lịch học và tình trạng học viên của toàn bộ hệ thống.
          </p>
        </div>
        <div className={styles['dashboard-page__actions']}>
          <button
            type="button"
            className={`${styles['dashboard__button']} ${styles['dashboard__button--ghost']}`}
          >
            Tuần này
          </button>
          <button
            type="button"
            className={`${styles['dashboard__button']} ${styles['dashboard__button--primary']}`}
          >
            Báo cáo chi tiết
          </button>
        </div>
      </header>

      <div className={styles['dashboard-page__layout']}>
        <div className={styles['dashboard-page__main']}>
          <section className={styles['dashboard-summary']} aria-label="Thống kê nhanh">
            {summaryCards.map((card) => (
              <article
                key={card.title}
                className={styles['summary-card']}
                style={{ '--card-accent': card.accent, '--card-accent-soft': card.accentSoft }}
              >
                <header className={styles['summary-card__header']}>
                  <span className={styles['summary-card__icon']} aria-hidden="true">
                    {card.icon}
                  </span>
                  <span className={styles['summary-card__badge']}>2024</span>
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

          <section className={styles['dashboard-panels']} aria-label="Phân tích tổng quan">
            <article className={`${styles['dashboard-panel']} ${styles['dashboard-panel--performance']}`}>
              <header className={styles['dashboard-panel__header']}>
                <div>
                  <h2>Thống kê số lượng học viên</h2>
                  <p>Biểu đồ tăng trưởng theo từng tháng trong năm 2024.</p>
                </div>
                <button
                  type="button"
                  className={`${styles['dashboard__button']} ${styles['dashboard__button--ghost']}`}
                >
                  Xuất dữ liệu
                </button>
              </header>
              <div className={styles['chart-bars']} role="img" aria-label="Biểu đồ cột thống kê học viên theo tháng">
                {monthlyPerformance.map((item) => (
                  <div key={item.label} className={styles['chart-bars__column']}>
                    <div
                      className={styles['chart-bars__value']}
                      style={{ '--bar-height': `${item.value}%` }}
                    />
                    <span className={styles['chart-bars__label']}>{item.label}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className={`${styles['dashboard-panel']} ${styles['dashboard-panel--radial']}`}>
              <header className={styles['dashboard-panel__header']}>
                <div>
                  <h2>Tỷ lệ học sinh</h2>
                  <p>Phân bổ mức độ tham gia học tập của học viên.</p>
                </div>
              </header>
              <div className={styles['dashboard-panel__body']}>
                <div className={styles['dashboard-panel__radial']} role="img" aria-label="Phân bổ tình trạng học viên">
                  <div
                    className={styles['dashboard-panel__radial-progress']}
                    style={{ backgroundImage: `conic-gradient(${radialGradient})` }}
                  >
                    <strong>{totalStudents.toLocaleString('vi-VN')}</strong>
                    <span>Tổng học viên</span>
                  </div>
                  <div className={styles['dashboard-panel__radial-indicator']}>
                    <span className={`${styles.pill} ${styles['pill--info']}`}>+214 mới</span>
                    <p>So với tháng trước</p>
                  </div>
                </div>
                <ul className={styles['dashboard-panel__legend']}>
                  {radialStops.map((item) => (
                    <li key={item.label}>
                      <span
                        className={styles['legend-dot']}
                        aria-hidden="true"
                        style={{ '--legend-color': item.color }}
                      />
                      <div>
                        <strong>{item.value.toLocaleString('vi-VN')}</strong>
                        <span>{item.label}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </section>

          <section className={styles['dashboard-insights']} aria-label="Thông tin chi tiết">
            <article className={`${styles['dashboard-panel']} ${styles['dashboard-panel--sparkline']}`}>
              <header className={styles['dashboard-panel__header']}>
                <div>
                  <h2>Biến động số lượng học viên</h2>
                  <p>Thống kê số lớp tham gia theo từng ngày trong tuần.</p>
                </div>
                <div className={styles['dashboard-panel__meta']}>
                  <span className={`${styles.pill} ${styles['pill--success']}`}>+5,4%</span>
                  <span>so với tuần trước</span>
                </div>
              </header>
              <div className={styles['dashboard-panel__sparkline']} role="img" aria-label="Biểu đồ đường biến động học viên">
                <svg viewBox="0 0 320 120" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(76, 110, 245, 0.6)" />
                      <stop offset="100%" stopColor="rgba(76, 110, 245, 0)" />
                    </linearGradient>
                  </defs>
                  <polyline
                    fill="url(#sparklineGradient)"
                    stroke="rgba(76, 110, 245, 0.4)"
                    strokeWidth="2"
                    points="0,100 40,90 80,82 120,70 160,52 200,60 240,74 280,92 320,110 320,120 0,120"
                  />
                  <polyline
                    fill="none"
                    stroke="rgb(76, 110, 245)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points="0,100 40,90 80,82 120,70 160,52 200,60 240,74 280,92 320,110"
                  />
                </svg>
                <ul className={styles['dashboard-panel__sparkline-legend']}>
                  {studentTrends.map((item) => (
                    <li key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <article className={`${styles['dashboard-panel']} ${styles['dashboard-panel--finance']}`}>
              <header className={styles['dashboard-panel__header']}>
                <div>
                  <h2>Quản lý tài chính</h2>
                  <p>Tổng quan các chỉ số tài chính quan trọng.</p>
                </div>
                <button
                  type="button"
                  className={`${styles['dashboard__button']} ${styles['dashboard__button--secondary']}`}
                >
                  Xem chi tiết
                </button>
              </header>
              <ul className={styles['dashboard-panel__highlights']}>
                {financeHighlights.map((item) => (
                  <li key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </li>
                ))}
              </ul>
              <div className={styles['dashboard-panel__progress']}>
                <div className={styles['dashboard-panel__progress-bar']} style={{ '--progress': '62%' }}>
                  <span>62% ngân sách đã sử dụng</span>
                </div>
              </div>
            </article>
          </section>
        </div>

        <aside className={styles['dashboard-page__aside']}>
          <section className={`${styles['dashboard-aside-card']} ${styles['dashboard-aside-card--calendar']}`}>
            <header className={styles['dashboard-panel__header']}>
              <div>
                <h2>Lịch công tác</h2>
                <p>Tổng quan hoạt động đào tạo trong tháng 08.</p>
              </div>
              <div className={styles['dashboard-calendar__switcher']}>
                <button type="button" aria-label="Tháng trước">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="m14.5 7-5 5 5 5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                <span>Tháng 08</span>
                <button type="button" aria-label="Tháng sau">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="m9.5 7 5 5-5 5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </header>
            <div className={styles['dashboard-calendar']}>
              <div className={styles['dashboard-calendar__weekdays']}>
                {calendarWeekdays.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className={styles['dashboard-calendar__grid']}>
                {calendarDays.map((day, index) => (
                  <div
                    key={`${day.date}-${index}`}
                    className={`${styles['dashboard-calendar__day']}${
                      day.isMuted ? ` ${styles['dashboard-calendar__day--muted']}` : ''
                    }${day.isHighlighted ? ` ${styles['dashboard-calendar__day--highlighted']}` : ''}`}
                  >
                    <div className={styles['dashboard-calendar__date']}>
                      <span>{day.date}</span>
                      {day.badge ? (
                        <span className={styles['dashboard-calendar__badge']}>{day.badge}</span>
                      ) : null}
                    </div>
                    <div className={styles['dashboard-calendar__events']}>
                      {day.events?.map((event, eventIndex) => (
                        <span
                          key={`${event.label}-${eventIndex}`}
                          className={`${styles['dashboard-calendar__event']} ${styles[`dashboard-calendar__event--${event.color}`]}`}
                        >
                          {event.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className={styles['dashboard-aside-card']}>
            <header className={styles['dashboard-panel__header']}>
              <div>
                <h2>Nhắc việc</h2>
                <p>Các tác vụ quan trọng cần xử lý hôm nay.</p>
              </div>
            </header>
            <ul className={styles['dashboard-panel__reminders']}>
              {reminders.map((item) => (
                <li key={item.title}>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.detail}</p>
                  </div>
                  <button
                    type="button"
                    className={`${styles['dashboard__button']} ${styles['dashboard__button--secondary']}`}
                  >
                    Đánh dấu xong
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default Dashboard;
