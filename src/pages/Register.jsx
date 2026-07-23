import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getDefaultRouteForRole } from '../auth/roleRoutes';
import { register as requestRegister } from '../services/authService';
import styles from '../styles/auth.module.css';
import loginIllustration from '../assets/login-illustration.png';

function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await requestRegister(form);
      login({ token: response.token, user: response.user });
      const fallbackRoute = getDefaultRouteForRole(response.user?.role);
      navigate(fallbackRoute, { replace: true });
    } catch (err) {
      const apiError = err?.response?.data;
      const fieldError =
        apiError && typeof apiError === 'object'
          ? Object.values(apiError)?.[0]?.[0]
          : null;
      setError(
        apiError?.detail ||
          apiError?.message ||
          fieldError ||
          'Không thể tạo tài khoản. Vui lòng thử lại.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles['auth-shell']}>
      <div className={styles['auth-card']}>
        <div className={styles['auth-panel']}>
          <div className={styles['auth-brand']}>
            <span className={styles['auth-brand-icon']} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
                <path
                  d="M12 2.5a6.5 6.5 0 0 1 6.5 6.5c0 5.1-6.5 12-6.5 12S5.5 14.1 5.5 9A6.5 6.5 0 0 1 12 2.5Zm0 3a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span>Your Logo</span>
          </div>

          <div className={styles['auth-heading']}>
            <h1>
              Create your <span>account</span>
            </h1>
            <p className={styles['auth-subtitle']}>
              Bắt đầu hành trình học tập cùng Vista Academy.
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles['auth-form']}>
            <label className={styles['auth-field']}>
              <span>Full name</span>
              <input
                required
                name="name"
                type="text"
                value={form.name}
                placeholder="Nguyễn Văn A"
                onChange={handleChange}
              />
            </label>

            <label className={styles['auth-field']}>
              <span>Vai trò</span>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
              >
                <option value="student">Học sinh</option>
                <option value="teacher">Giáo viên</option>
              </select>
            </label>

            <label className={styles['auth-field']}>
              <span>Email</span>
              <input
                required
                name="email"
                type="email"
                value={form.email}
                placeholder="you@email.com"
                onChange={handleChange}
              />
            </label>

            <label className={styles['auth-field']}>
              <span>Password</span>
              <input
                required
                name="password"
                type="password"
                value={form.password}
                placeholder="••••••••"
                onChange={handleChange}
              />
            </label>

            <label className={styles['auth-field']}>
              <span>Confirm password</span>
              <input
                required
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                placeholder="••••••••"
                onChange={handleChange}
              />
            </label>

            <label className={styles['auth-terms']}>
              <input type="checkbox" required />
              <span>
                I agree to the Terms of Service and Privacy Policy.
              </span>
            </label>

            {error ? <p className={styles.error}>{error}</p> : null}

            <button type="submit" className={styles['auth-button']} disabled={submitting}>
              {submitting ? 'Đang tạo...' : 'Create account'}
            </button>
          </form>

          <p className={styles['auth-signup']}>
            Already have an account? <Link to="/login">Login</Link>
          </p>

          <div className={styles['auth-divider']}>Or Sign up with</div>

          <div className={styles['auth-socials']}>
            <button type="button" className={styles['auth-social']} aria-label="Sign up with Facebook">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                <path
                  d="M13.5 8.5h2V6h-2c-2.2 0-3.5 1.4-3.5 3.6V11H8v2.5h2V20h2.7v-6.5h2.1L15 11h-2.3V9.7c0-.8.4-1.2 1.3-1.2Z"
                  fill="#1877F2"
                />
              </svg>
            </button>
            <button type="button" className={styles['auth-social']} aria-label="Sign up with Google">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                <path
                  d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.2 3-7.2Z"
                  fill="#4285F4"
                />
                <path
                  d="M12 22c2.7 0 4.9-.9 6.5-2.5l-3.2-2.5c-.9.6-2.1 1-3.3 1-2.5 0-4.6-1.7-5.3-4H3.3v2.6A10 10 0 0 0 12 22Z"
                  fill="#34A853"
                />
                <path
                  d="M6.7 14c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9V7.6H3.3A10 10 0 0 0 2 12.1c0 1.6.4 3.1 1.3 4.4l3.4-2.5Z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.5c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.6 14.7 1.6 12 1.6A10 10 0 0 0 3.3 7.6l3.4 2.6c.7-2.3 2.8-4.7 5.3-4.7Z"
                  fill="#EA4335"
                />
              </svg>
            </button>
            <button type="button" className={styles['auth-social']} aria-label="Sign up with Apple">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                <path
                  d="M16.4 13.1c0-2 1.7-3 1.7-3-1-.9-2.6-1-2.6-1-1.1-.1-2.1.7-2.7.7-.5 0-1.4-.7-2.3-.7-1.2 0-2.3.7-2.9 1.8-1.2 2-.3 5 0 5.7.6 1 1.3 2.1 2.3 2 1 0 1.3-.6 2.5-.6 1.2 0 1.5.6 2.5.6 1 0 1.6-1 2.2-2 .7-1.2 1-2.3 1-2.3s-1.7-.7-1.7-3.2Zm-2.2-4.9c.5-.6.9-1.5.8-2.4-.8 0-1.7.6-2.2 1.2-.5.6-.9 1.5-.8 2.3.9.1 1.7-.4 2.2-1.1Z"
                  fill="#111827"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className={styles['auth-illustration']}>
          <img src={loginIllustration} alt="Security illustration" />
          <div className={styles['auth-pager']} aria-hidden="true">
            <span className={styles['auth-dot']} />
            <span className={styles['auth-dot--muted']} />
            <span className={styles['auth-dot--muted']} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
