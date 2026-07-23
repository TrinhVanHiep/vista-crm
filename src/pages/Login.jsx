import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { resolveRouteForRole } from "../auth/roleRoutes";
import { login as requestLogin } from "../services/authService";
import styles from "../styles/auth.module.css";
import loginIllustration from "../assets/login-illustration.png";

function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fromPath = location.state?.from ?? "/";

  if (isAuthenticated) {
    return <Navigate to={fromPath} replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await requestLogin(form);
      login({ token: response.token, user: response.user });
      const targetRoute = resolveRouteForRole(response.user?.role, fromPath);
      navigate(targetRoute, { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Đăng nhập không thành công. Vui lòng thử lại."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles["auth-shell"]}>
      <div className={styles["auth-card"]}>
        <div className={styles["auth-panel"]}>
          <div className={styles["auth-brand"]}>
            <span className={styles["auth-brand-icon"]} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M12 2.5a6.5 6.5 0 0 1 6.5 6.5c0 5.1-6.5 12-6.5 12S5.5 14.1 5.5 9A6.5 6.5 0 0 1 12 2.5Zm0 3a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span>Your Logo</span>
          </div>

          <div className={styles["auth-heading"]}>
            <h1>
              Welcome back, <span>Mark</span>!
            </h1>
            <p className={styles["auth-subtitle"]}>
              Hãy đăng nhập để trải nghiệm
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles["auth-form"]}>
            <label className={styles["auth-field"]}>
              <span>Email</span>
              <input
                required
                name="email"
                type="email"
                value={form.email}
                placeholder="john.doe@gmail.com"
                onChange={handleChange}
              />
            </label>

            <label className={styles["auth-field"]}>
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

            <div className={styles["auth-remember"]}>
              <label>
                <input type="checkbox" />
                Remember me
              </label>
              <button type="button" className={styles["auth-link"]}>
                Forgot Password ?
              </button>
            </div>

            {error ? <p className={styles.error}>{error}</p> : null}

            <button
              type="submit"
              className={styles["auth-button"]}
              disabled={submitting}
            >
              {submitting ? "Đang đăng nhập..." : "Login"}
            </button>
          </form>

          <p className={styles["auth-signup"]}>
            Don&apos;t have an account? <Link to="/register">Sign up</Link>
          </p>
        </div>

        <div className={styles["auth-illustration"]}>
          <img src={loginIllustration} alt="Security illustration" />
          <div className={styles["auth-pager"]} aria-hidden="true">
            <span className={styles["auth-dot"]} />
            <span className={styles["auth-dot--muted"]} />
            <span className={styles["auth-dot--muted"]} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
