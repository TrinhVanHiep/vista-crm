import styles from '../styles/account.module.css';

const steps = [
  { label: 'Xác minh số điện thoại', active: true },
  { label: 'Giới thiệu về bạn', active: false },
  { label: 'Giới thiệu về doanh nghiệp', active: false },
  { label: 'Hoàn tất', active: false },
];

const codeSlots = [0, 1, 2, 3];

function CreateAccount() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <aside className={styles.sidebar}>
          <div>
            <span className={styles.brand}>Vista Academy</span>
            <h1>Bắt đầu</h1>
          </div>
          <ul className={styles.steps}>
            {steps.map((step, index) => (
              <li
                key={step.label}
                className={`${styles.step} ${step.active ? styles['step--active'] : ''}`}
              >
                <span className={styles.stepDot}>{index + 1}</span>
                <span>{step.label}</span>
              </li>
            ))}
          </ul>
        </aside>

        <section className={styles.content}>
          <span className={styles.badge}>STEP 1/4</span>
          <h2>Valid your phone</h2>
          <p className={styles.sub}>Xác thực thông tin để tiếp tục tạo tài khoản.</p>

          <form className={styles.form}>
            <div className={styles.field}>
              <span>Mobile Number</span>
              <div className={styles.phoneRow}>
                <button type="button" className={styles.countryButton}>
                  +1
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="m7 10 5 5 5-5" fill="currentColor" />
                  </svg>
                </button>
                <input type="tel" placeholder="345 567-23-56" />
              </div>
            </div>

            <div className={styles.field}>
              <span>Code from SMS</span>
              <div className={styles.codeRow}>
                {codeSlots.map((slot) => (
                  <input
                    key={slot}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    aria-label={`Mã số ${slot + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className={styles.infoBox}>
              <strong>SMS was sent to your number +1 345 673-56-67</strong>
              <span>It will be valid for 01:25</span>
            </div>

            <div className={styles.field}>
              <span>Email Address</span>
              <input type="email" placeholder="youremail@gmail.com" />
            </div>

            <div className={styles.field}>
              <span>Create Password</span>
              <div className={styles.passwordRow}>
                <input type="password" placeholder="••••••••" />
                <button type="button" className={styles.eyeButton} aria-label="Hiện mật khẩu">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="M12 6.5c5.2 0 9.4 4.3 10 5.5-.6 1.2-4.8 5.5-10 5.5S2.6 13.2 2 12c.6-1.2 4.8-5.5 10-5.5Zm0 2A3.5 3.5 0 1 0 15.5 12 3.5 3.5 0 0 0 12 8.5Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </form>

          <div className={styles.actions}>
            <button type="button" className={styles.nextButton}>
              Next Step
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="m9 6 6 6-6 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default CreateAccount;
