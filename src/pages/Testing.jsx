import styles from '../styles/employeeList.module.css';

const employees = [
  {
    name: 'Evan Yates',
    email: 'evanyates@gmail.com',
    gender: 'Nam',
    birthday: 'Apr 12, 1995',
    age: '25',
    role: 'Giảng viên Tiếng Anh',
    initials: 'EY',
    color: '#3f8cff',
  },
  {
    name: 'Lenora Fowler',
    email: 'erav@lpc.gov',
    gender: 'Nữ',
    birthday: 'Apr 28, 1998',
    age: '23',
    role: 'Quản lý trung tâm',
    initials: 'LF',
    color: '#ff9f43',
  },
  {
    name: 'Winnie McGuire',
    email: 'winnie3498@gmail.com',
    gender: 'Nữ',
    birthday: 'Apr 12, 1995',
    age: '25',
    role: 'Trợ giảng',
    initials: 'WM',
    color: '#6c63ff',
  },
  {
    name: 'James Williamson',
    email: 'williamsonj@gmail.com',
    gender: 'Nam',
    birthday: 'Sep 23, 1992',
    age: '28',
    role: 'Giảng viên Tiếng Anh',
    initials: 'JW',
    color: '#10b981',
  },
  {
    name: 'Emily Tyler',
    email: 'tyleremily24@gmail.com',
    gender: 'Nữ',
    birthday: 'May 16, 1996',
    age: '24',
    role: 'Biên tập nội dung',
    initials: 'ET',
    color: '#f97316',
  },
  {
    name: 'Thomas Schneider',
    email: 'thomass.g@gmail.com',
    gender: 'Nam',
    birthday: 'Apr 28, 1998',
    age: '23',
    role: 'Giảng viên Tiếng Anh',
    initials: 'TS',
    color: '#0ea5e9',
  },
];

const tabs = ['Danh sách', 'Hoạt động'];

function Testing() {
  return (
    <div className={styles.page}>
      <div className={styles.searchRow}>
        <label className={styles.search}>
          <span className={styles.searchIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="m20.25 19.19-3.9-3.9a6.5 6.5 0 1 0-1.06 1.06l3.9 3.9a.75.75 0 1 0 1.06-1.06ZM6.75 11a4.25 4.25 0 1 1 4.25 4.25A4.25 4.25 0 0 1 6.75 11Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <input type="search" placeholder="Tìm kiếm" aria-label="Tìm kiếm nhân sự" />
        </label>
      </div>

      <header className={styles.header}>
        <div>
          <h1>
            Đội ngũ nhân sự <span>(28)</span>
          </h1>
        </div>
        <div className={styles.tabs} role="tablist" aria-label="Chế độ hiển thị">
          {tabs.map((tab, index) => (
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
        <div className={styles.actions}>
          <button type="button" className={styles.iconButton} aria-label="Bộ lọc">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M4 6.5h16a.75.75 0 0 1 .58 1.23L14 15.5v4a.75.75 0 0 1-1.12.66l-2-1.1a.75.75 0 0 1-.38-.66v-2.9L3.42 7.73A.75.75 0 0 1 4 6.5Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <button type="button" className={styles.primaryButton}>
            + Thêm nhân sự
          </button>
        </div>
      </header>

      <section className={styles.list}>
        {employees.map((employee) => (
          <article key={employee.email} className={styles.card}>
            <div className={styles.user}>
              <div className={styles.avatar} style={{ background: employee.color }}>
                {employee.initials}
              </div>
              <div>
                <strong>{employee.name}</strong>
                <span>{employee.email}</span>
              </div>
            </div>
            <div className={styles.field}>
              <span>Giới tính</span>
              <strong>{employee.gender}</strong>
            </div>
            <div className={styles.field}>
              <span>Ngày sinh</span>
              <strong>{employee.birthday}</strong>
            </div>
            <div className={styles.field}>
              <span>Tuổi</span>
              <strong>{employee.age}</strong>
            </div>
            <div className={styles.field}>
              <span>Vị trí</span>
              <strong>{employee.role}</strong>
            </div>
            <button type="button" className={styles.menuButton} aria-label="Tùy chọn">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M12 6.75a1.25 1.25 0 1 1-1.25 1.25A1.25 1.25 0 0 1 12 6.75Zm0 7a1.25 1.25 0 1 1-1.25 1.25A1.25 1.25 0 0 1 12 13.75Zm0-3.5A1.25 1.25 0 1 1 10.75 12 1.25 1.25 0 0 1 12 10.25Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </article>
        ))}
      </section>

      <div className={styles.pagination}>
        <span>1-8 of 28</span>
        <div className={styles.paginationButtons}>
          <button type="button" className={styles.iconButton} aria-label="Trang trước">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="m14 7-5 5 5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button type="button" className={styles.iconButton} aria-label="Trang sau">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="m10 7 5 5-5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Testing;
