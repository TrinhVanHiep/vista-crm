import styles from '../styles/courses.module.css';

const summaryCards = [
  {
    label: 'Khóa học đã đăng ký',
    value: '12',
    meta: '4 khóa mới trong tuần',
    tone: 'primary',
  },
  {
    label: 'Khóa học đang tham gia',
    value: '05',
    meta: '2 khóa đang diễn ra',
    tone: 'info',
  },
  {
    label: 'Khóa học đã hoàn thành',
    value: '07',
    meta: 'Hoàn thành 92% mục tiêu',
    tone: 'success',
  },
];

const topCourses = [
  {
    title: 'Khóa học IELTS Nền tảng',
    level: 'Beginner',
    teacher: 'Ms. Helen',
    duration: '12 tuần',
    rating: '4.9',
    students: '2.3k',
    progress: 65,
    tag: 'Popular',
    color: '#3f8cff',
  },
  {
    title: 'Business English Communication',
    level: 'Intermediate',
    teacher: 'Mr. Jason',
    duration: '10 tuần',
    rating: '4.7',
    students: '1.4k',
    progress: 48,
    tag: 'Trending',
    color: '#6c63ff',
  },
  {
    title: 'IELTS Writing Intensive',
    level: 'Advanced',
    teacher: 'Ms. Natalie',
    duration: '8 tuần',
    rating: '4.8',
    students: '980',
    progress: 72,
    tag: 'Top Rated',
    color: '#f59e0b',
  },
];

const myCourses = [
  {
    title: 'IELTS Speaking Bootcamp',
    teacher: 'Mr. Evan Yates',
    schedule: 'Mon, Wed • 18:30 - 20:00',
    progress: 58,
    status: 'Đang học',
  },
  {
    title: 'Khóa học IELTS Nền tảng',
    teacher: 'Ms. Helen',
    schedule: 'Tue, Thu • 19:00 - 20:30',
    progress: 34,
    status: 'Đang học',
  },
  {
    title: 'Business English Communication',
    teacher: 'Mr. Jason',
    schedule: 'Sat • 09:00 - 11:00',
    progress: 92,
    status: 'Hoàn thành',
  },
];

const filterTabs = ['Khóa học hàng đầu', 'Khóa học đã đăng ký', 'Khóa học đang tham gia', 'Khóa học đã hoàn thành'];

function Courses() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Quản lý khóa học</p>
          <h1>Khóa học của tôi</h1>
          <p className={styles.sub}>
            Theo dõi tiến độ, danh sách khóa học và các lớp đang hoạt động.
          </p>
        </div>
        <div className={styles.headerActions}>
          <label className={styles.search}>
            <span className={styles.searchIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="m20.25 19.19-3.9-3.9a6.5 6.5 0 1 0-1.06 1.06l3.9 3.9a.75.75 0 1 0 1.06-1.06ZM6.75 11a4.25 4.25 0 1 1 4.25 4.25A4.25 4.25 0 0 1 6.75 11Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <input type="search" placeholder="Tìm khóa học" aria-label="Tìm khóa học" />
          </label>
          <button type="button" className={styles.primaryButton}>
            + Thêm khóa học
          </button>
        </div>
      </header>

      <section className={styles.summary}>
        {summaryCards.map((card) => (
          <article key={card.label} className={styles.summaryCard} data-tone={card.tone}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.meta}</p>
          </article>
        ))}
      </section>

      <div className={styles.tabRow} role="tablist" aria-label="Danh mục khóa học">
        {filterTabs.map((tab, index) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tab} ${index === 0 ? styles['tab--active'] : ''}`}
            aria-pressed={index === 0}
          >
            {tab}
          </button>
        ))}
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Khóa học hàng đầu</h2>
          <button type="button" className={styles.linkButton}>
            Xem tất cả
          </button>
        </div>
        <div className={styles.cardGrid}>
          {topCourses.map((course) => (
            <article key={course.title} className={styles.courseCard}>
              <div className={styles.courseCardHeader}>
                <span className={styles.courseTag} style={{ background: course.color }}>
                  {course.tag}
                </span>
                <span className={styles.courseLevel}>{course.level}</span>
              </div>
              <h3>{course.title}</h3>
              <p className={styles.courseMeta}>Giảng viên: {course.teacher}</p>
              <div className={styles.courseStats}>
                <span>{course.duration}</span>
                <span>{course.students} học viên</span>
                <span>{course.rating} ★</span>
              </div>
              <div className={styles.progress}>
                <div className={styles.progressTrack}>
                  <span className={styles.progressValue} style={{ width: `${course.progress}%` }} />
                </div>
                <span>{course.progress}%</span>
              </div>
              <button type="button" className={styles.ghostButton}>
                Xem chi tiết
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Khóa học đang tham gia</h2>
          <button type="button" className={styles.linkButton}>
            Xem lịch học
          </button>
        </div>
        <div className={styles.courseList}>
          {myCourses.map((course) => (
            <article key={course.title} className={styles.courseRow}>
              <div className={styles.courseMain}>
                <strong>{course.title}</strong>
                <span>{course.teacher}</span>
              </div>
              <div className={styles.courseSchedule}>
                <span>Lịch học</span>
                <strong>{course.schedule}</strong>
              </div>
              <div className={styles.courseProgress}>
                <span>Tiến độ</span>
                <div className={styles.progressTrack}>
                  <span
                    className={styles.progressValue}
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
                <strong>{course.progress}%</strong>
              </div>
              <span className={styles.status} data-status={course.status}>
                {course.status}
              </span>
              <button type="button" className={styles.iconButton} aria-label="Tùy chọn">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M12 6.75a1.25 1.25 0 1 1-1.25 1.25A1.25 1.25 0 0 1 12 6.75Zm0 7a1.25 1.25 0 1 1-1.25 1.25A1.25 1.25 0 0 1 12 13.75Zm0-3.5A1.25 1.25 0 1 1 10.75 12 1.25 1.25 0 0 1 12 10.25Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Courses;
