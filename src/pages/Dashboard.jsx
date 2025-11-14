import styles from '../styles/dashboard.module.css';

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

const performanceHighlights = [
  {
    label: 'Học viên đang học',
    value: '2.480',
    change: '+12%',
  },
  {
    label: 'Học viên mới',
    value: '1.245',
    change: '+8%',
  },
  {
    label: 'Đã hoàn thành',
    value: '980',
    change: '+3%',
  },
];

const periodFilters = ['Ngày', 'Tuần', 'Tháng'];

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
          <div className={styles['dashboard-page__filters']} role="group" aria-label="Chọn giai đoạn thống kê">
            {periodFilters.map((option) => (
              <button
                key={option}
                type="button"
                className={`${styles['dashboard-segment']}${
                  option === 'Tháng' ? ` ${styles['dashboard-segment--active']}` : ''
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`${styles['dashboard__button']} ${styles['dashboard__button--primary']}`}
          >
            Xuất báo cáo
          </button>
        </div>
      </header>

      <div className={styles['dashboard-page__layout']}>
        <div className={styles['dashboard-page__column']}>
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
                Tải dữ liệu
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
            <div className={styles['dashboard-panel__footer']}>
              {performanceHighlights.map((item) => (
                <div key={item.label} className={styles['dashboard-panel__stat']}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.change}</small>
                </div>
              ))}
            </div>
          </article>

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
        </div>

        <aside className={styles['dashboard-page__aside']}>
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
