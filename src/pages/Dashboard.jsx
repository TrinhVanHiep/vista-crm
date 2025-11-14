const summaryCards = [
  {
    title: 'Tổng số học viên',
    value: '15.928',
    change: '+8,4%',
    changeLabel: 'so với tháng trước',
    trend: [65, 72, 80, 68, 94, 86, 100],
    tone: 'positive',
  },
  {
    title: 'Học viên mới',
    value: '1.245',
    change: '+12,1%',
    changeLabel: 'đã ghi danh trong tháng',
    trend: [40, 48, 52, 64, 58, 72, 84],
    tone: 'positive',
  },
  {
    title: 'Đã tốt nghiệp',
    value: '9.836',
    change: '+3,2%',
    changeLabel: 'hoàn thành chứng chỉ',
    trend: [80, 78, 82, 86, 88, 84, 90],
    tone: 'neutral',
  },
  {
    title: 'Lớp học hoạt động',
    value: '128',
    change: '-1,4%',
    changeLabel: 'đang mở trong tuần',
    trend: [92, 88, 84, 80, 78, 76, 74],
    tone: 'negative',
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
  { label: 'Đi học đầy đủ', value: '2.000' },
  { label: 'Đi học không đều', value: '420' },
  { label: 'Vắng', value: '215' },
];

const attendanceColors = ['#4c6ef5', '#ffa94d', '#ef5da8'];

const studentTrends = [
  { label: 'Mon', value: 74 },
  { label: 'Tue', value: 68 },
  { label: 'Wed', value: 80 },
  { label: 'Thu', value: 88 },
  { label: 'Fri', value: 76 },
  { label: 'Sat', value: 66 },
  { label: 'Sun', value: 58 },
];

const schedule = [
  {
    time: '08:00 - 09:30',
    title: 'Lớp IELTS Foundation',
    type: 'Lớp học',
    color: 'cyan',
    meta: 'Phòng 402 - Cơ sở A',
  },
  {
    time: '10:00 - 11:30',
    title: 'Coaching 1:1',
    type: 'Tư vấn',
    color: 'purple',
    meta: 'Đào tạo giáo viên mới',
  },
  {
    time: '13:30 - 15:00',
    title: 'Workshop Speaking',
    type: 'Sự kiện',
    color: 'orange',
    meta: 'Khối cộng đồng',
  },
  {
    time: '16:00 - 17:00',
    title: 'Báo cáo tài chính',
    type: 'Cuộc họp',
    color: 'green',
    meta: 'Ban điều hành',
  },
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

function Dashboard() {
  return (
    <div className="dashboard-page">
      <header className="dashboard-page__header">
        <div>
          <p className="dashboard-page__welcome">Chào mừng trở lại, Evan! 👋</p>
          <h1>Tổng quan</h1>
          <p className="dashboard-page__subtitle">
            Theo dõi hiệu suất đào tạo, lịch học và tình trạng học viên của toàn bộ hệ thống.
          </p>
        </div>
        <div className="dashboard-page__filters">
          <button type="button" className="dashboard__button dashboard__button--ghost">
            Tuần này
          </button>
          <button type="button" className="dashboard__button dashboard__button--primary">
            Báo cáo chi tiết
          </button>
        </div>
      </header>

      <section className="dashboard-grid dashboard-grid--summary" aria-label="Thống kê nhanh">
        {summaryCards.map((card) => (
          <article key={card.title} className="dashboard-card dashboard-card--summary">
            <header>
              <h2>{card.title}</h2>
              <span className="dashboard-card__tag">2024</span>
            </header>
            <p className="dashboard-card__value">{card.value}</p>
            <div className="dashboard-card__trend" role="img" aria-hidden="true">
              {card.trend.map((value, index) => (
                <span key={`${card.title}-${index}`} style={{ '--bar-value': `${value}%` }} />
              ))}
            </div>
            <p className={`dashboard-card__change dashboard-card__change--${card.tone}`}>
              {card.change}{' '}
              <span>{card.changeLabel}</span>
            </p>
          </article>
        ))}
      </section>

      <section className="dashboard-grid dashboard-grid--analytics">
        <article className="dashboard-panel dashboard-panel--wide">
          <header className="dashboard-panel__header">
            <div>
              <h2>Thống kê số lượng học viên</h2>
              <p>Biểu đồ tăng trưởng theo từng tháng trong năm 2024.</p>
            </div>
            <button type="button" className="dashboard__button dashboard__button--ghost">
              Xuất dữ liệu
            </button>
          </header>
          <div className="dashboard-panel__chart" role="img" aria-label="Biểu đồ cột thống kê học viên theo tháng">
            {monthlyPerformance.map((item) => (
              <div key={item.label} className="chart-bar">
                <div className="chart-bar__value" style={{ '--bar-height': `${item.value}%` }} />
                <span className="chart-bar__label">{item.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="dashboard-panel dashboard-panel--focus">
          <header className="dashboard-panel__header">
            <div>
              <h2>Tỷ lệ học sinh</h2>
              <p>Phân bổ mức độ tham gia học tập của học viên.</p>
            </div>
          </header>
          <div className="dashboard-panel__split">
            <div className="dashboard-panel__radial" role="img" aria-label="76 phần trăm học viên đi học đầy đủ">
              <div className="dashboard-panel__radial-progress" style={{ '--progress': '76' }}>
                <strong>76%</strong>
                <span>Đi học đầy đủ</span>
              </div>
            </div>
            <ul className="dashboard-panel__legend">
              {attendanceSplit.map((item, index) => (
                <li key={item.label}>
                  <span
                    className="legend-dot"
                    aria-hidden="true"
                    style={{ '--legend-color': attendanceColors[index] }}
                  />
                  <div>
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--insights">
        <article className="dashboard-panel dashboard-panel--wide">
          <header className="dashboard-panel__header">
            <div>
              <h2>Biến động số lượng học viên</h2>
              <p>Thống kê số lớp tham gia theo từng ngày trong tuần.</p>
            </div>
            <div className="dashboard-panel__meta">
              <span className="pill pill--success">+5,4%</span>
              <span>so với tuần trước</span>
            </div>
          </header>
          <div className="dashboard-panel__sparkline" role="img" aria-label="Biểu đồ đường biến động học viên">
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
            <ul className="dashboard-panel__sparkline-legend">
              {studentTrends.map((item) => (
                <li key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <article className="dashboard-panel dashboard-panel--finance">
          <header className="dashboard-panel__header">
            <div>
              <h2>Quản lý tài chính</h2>
              <p>Tổng quan các chỉ số tài chính quan trọng.</p>
            </div>
            <button type="button" className="dashboard__button dashboard__button--secondary">
              Xem chi tiết
            </button>
          </header>
          <ul className="dashboard-panel__highlights">
            {financeHighlights.map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </li>
            ))}
          </ul>
          <div className="dashboard-panel__progress">
            <div className="dashboard-panel__progress-bar" style={{ '--progress': '62%' }}>
              <span>62% ngân sách đã sử dụng</span>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--schedule">
        <article className="dashboard-panel dashboard-panel--schedule">
          <header className="dashboard-panel__header">
            <div>
              <h2>Lịch công tác</h2>
              <p>Danh sách hoạt động trong tuần hiện tại.</p>
            </div>
            <button type="button" className="dashboard__button dashboard__button--ghost">
              Lọc lịch
            </button>
          </header>
          <ul className="dashboard-panel__schedule">
            {schedule.map((item) => (
              <li key={item.title}>
                <div className={`schedule-dot schedule-dot--${item.color}`} aria-hidden="true" />
                <div className="schedule-meta">
                  <strong>{item.time}</strong>
                  <span>{item.type}</span>
                </div>
                <div className="schedule-content">
                  <h3>{item.title}</h3>
                  <p>{item.meta}</p>
                </div>
                <button type="button" className="dashboard__button dashboard__button--ghost">
                  Chi tiết
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="dashboard-panel dashboard-panel--reminders">
          <header className="dashboard-panel__header">
            <div>
              <h2>Nhắc việc</h2>
              <p>Các tác vụ quan trọng cần xử lý hôm nay.</p>
            </div>
          </header>
          <ul className="dashboard-panel__reminders">
            {reminders.map((item) => (
              <li key={item.title}>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </div>
                <button type="button" className="dashboard__button dashboard__button--secondary">
                  Đánh dấu xong
                </button>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}

export default Dashboard;
