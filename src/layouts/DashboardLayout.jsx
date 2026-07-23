import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { ROUTE_PERMISSIONS } from "../auth/permissions";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notificationService";
import {
  listCentersAll,
  listStudents,
  listTeachers,
  listClassroomsAll,
} from "../services/calendarService";

const SCOPE_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const scopeNow = new Date();
const SCOPE_YEARS = Array.from({ length: 6 }, (_, i) => scopeNow.getFullYear() - 2 + i);
import {
  detachCurrentWebPushSubscription,
  disableWebPush,
  enableWebPush,
  loadWebPushState,
} from "../services/webPushService";
import styles from "../styles/dashboard.module.css";

const NOTIFICATION_POLL_MS = 5000;

const SIDEBAR_COLLAPSED_KEY = "vista-crm.sidebar-collapsed";

const getInitialCollapsed = () => {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
  if (stored !== null) return stored === "1";
  return window.innerWidth < 992;
};

const MY_PROFILE_ROLES = ['teacher', 'student'];

const navIcon = (children) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
  >
    {children}
  </svg>
);

const navItems = [
  {
    label: "Tổng quan",
    to: "/",
    allowedRoles: ROUTE_PERMISSIONS.dashboard,
    icon: navIcon(
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
  },
  {
    label: "Lịch làm việc",
    to: "/calendar-detail",
    allowedRoles: ROUTE_PERMISSIONS.calendar,
    icon: navIcon(
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 9.5h18" />
      </>
    ),
  },
  {
    label: "Truyền thông",
    to: "/truyen-thong",
    allowedRoles: ROUTE_PERMISSIONS.media,
    icon: navIcon(
      <>
        <path d="M3 10v4l9 4V6l-9 4zM12 8l8-3v14l-8-3" />
        <path d="M6.5 15.5V19a1.5 1.5 0 0 0 3 0v-2.3" />
      </>
    ),
  },
  {
    label: "Tài chính",
    to: "/finance",
    allowedRoles: ROUTE_PERMISSIONS.finance,
    icon: navIcon(
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6.5v11M15 8.8c-.6-1-1.7-1.5-3-1.5-1.6 0-3 .8-3 2.3 0 3 6 1.7 6 4.7 0 1.5-1.4 2.4-3 2.4-1.3 0-2.5-.6-3.1-1.6" />
      </>
    ),
  },
  {
    label: "Hành chính - Nhân sự",
    to: "/teachers",
    allowedRoles: ROUTE_PERMISSIONS.teachers,
    icon: navIcon(
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
        <circle cx="17" cy="9" r="2.6" />
        <path d="M17.5 14.6c2.3.4 3.7 1.9 4 4.4" />
      </>
    ),
  },
  {
    label: "Học sinh - Lớp học",
    to: "/students",
    allowedRoles: ROUTE_PERMISSIONS.students,
    icon: navIcon(
      <>
        <path d="M2 9.5 12 5l10 4.5L12 14 2 9.5z" />
        <path d="M6.5 11.7V16c0 1.4 2.5 2.8 5.5 2.8s5.5-1.4 5.5-2.8v-4.3M22 9.5V15" />
      </>
    ),
  },
  {
    label: "Điểm danh & Chấm công",
    to: "/attendance",
    allowedRoles: ROUTE_PERMISSIONS.attendance,
    icon: navIcon(
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12.5 2.7 2.7L16.5 9" />
      </>
    ),
  },
  {
    label: "Học phí 2026",
    to: "/hoc-phi",
    allowedRoles: ROUTE_PERMISSIONS.tuition,
    icon: navIcon(
      <>
        <rect x="3" y="6" width="18" height="14" rx="2.5" />
        <path d="M3 10h18M16.5 15h.1" />
      </>
    ),
  },
  {
    label: "Thi đua tháng",
    to: "/monthly-scorecards",
    allowedRoles: ROUTE_PERMISSIONS.monthlyScorecards,
    icon: navIcon(
      <>
        <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
        <path d="M7 5H4v2a3.5 3.5 0 0 0 3.5 3.5M17 5h3v2a3.5 3.5 0 0 1-3.5 3.5M12 14v4m-4 3h8m-6.5-3h5" />
      </>
    ),
  },
  {
    label: "Báo cáo",
    to: "/report-card",
    allowedRoles: ROUTE_PERMISSIONS.reportCard,
    icon: navIcon(<path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />),
  },
  {
    label: "Kho tài liệu",
    to: "/kho-tai-lieu",
    allowedRoles: ROUTE_PERMISSIONS.documents,
    icon: navIcon(
      <path d="M3 6a2 2 0 0 1 2-2h5l2 2.5h7a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" />
    ),
  },
  {
    label: "Cài đặt hệ thống",
    to: "/cai-dat",
    allowedRoles: ROUTE_PERMISSIONS.settings,
    icon: navIcon(
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" />
      </>
    ),
  },
];

function DashboardLayout() {
  const { user, role, hasRole, logout } = useAuth();
  const navigate = useNavigate();
  const visibleNavItems = navItems.filter((item) => hasRole(item.allowedRoles));
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  // Phạm vi dùng chung trên header: trung tâm + tháng/năm (chia sẻ cho các trang qua Outlet context).
  const [scopeCenterId, setScopeCenterId] = useState("");
  const [scopeMonth, setScopeMonth] = useState(scopeNow.getMonth() + 1);
  const [scopeYear, setScopeYear] = useState(scopeNow.getFullYear());
  const [scopeCenters, setScopeCenters] = useState([]);
  const [pushState, setPushState] = useState({
    loading: true,
    supported: true,
    needsHomeScreen: false,
    configured: false,
    publicKey: "",
    permission: "default",
    enabled: false,
  });
  const [pushUpdating, setPushUpdating] = useState(false);
  const [pushMessage, setPushMessage] = useState(null);
  const notifRef = useRef(null);
  const [isUserOpen, setIsUserOpen] = useState(false);
  const userRef = useRef(null);
  // Tìm kiếm học sinh / lớp / giáo viên trên header.
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState({ students: [], teachers: [], classrooms: [] });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef(null);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    listCentersAll()
      .then((data) => {
        if (!cancelled) setScopeCenters(Array.isArray(data) ? data : data?.results || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      getUnreadNotificationCount()
        .then((count) => {
          if (!cancelled) setUnreadCount(count);
        })
        .catch(() => {});
      if (isNotifOpen) {
        listNotifications({ page_size: 10 })
          .then((data) => {
            if (!cancelled) setNotifications(data.results);
          })
          .catch(() => {});
      }
    };
    poll();
    const timer = window.setInterval(poll, NOTIFICATION_POLL_MS);
    window.addEventListener("focus", poll);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", poll);
    };
  }, [isNotifOpen]);

  useEffect(() => {
    let cancelled = false;
    loadWebPushState({ sync: true })
      .then((state) => {
        if (!cancelled) setPushState({ ...state, loading: false });
      })
      .catch(() => {
        if (!cancelled) {
          setPushState((current) => ({ ...current, loading: false, error: true }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target)) {
        setIsUserOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) {
      setSearchResults({ students: [], teachers: [], classrooms: [] });
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    const asArray = (value) => (Array.isArray(value) ? value : value?.results || []);
    const timer = setTimeout(async () => {
      try {
        const [st, te, cl] = await Promise.allSettled([
          listStudents({ search: q, page_size: 6 }),
          listTeachers({ search: q, page_size: 6 }),
          listClassroomsAll(),
        ]);
        if (cancelled) return;
        const students = st.status === "fulfilled" ? asArray(st.value).slice(0, 5) : [];
        const teachers = te.status === "fulfilled" ? asArray(te.value).slice(0, 5) : [];
        const classrooms =
          cl.status === "fulfilled"
            ? asArray(cl.value)
                .filter((c) => String(c.name || "").toLowerCase().includes(q.toLowerCase()))
                .slice(0, 5)
            : [];
        setSearchResults({ students, teachers, classrooms });
      } catch (error) {
        if (!cancelled) setSearchResults({ students: [], teachers: [], classrooms: [] });
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQ]);

  const nameOfPerson = (obj) =>
    obj?.full_name ||
    obj?.name ||
    [obj?.user?.last_name || obj?.last_name, obj?.user?.first_name || obj?.first_name]
      .filter(Boolean)
      .join(" ") ||
    obj?.user?.email ||
    obj?.email ||
    obj?.user?.username ||
    "—";

  const goToResult = (path) => {
    setSearchOpen(false);
    setSearchQ("");
    navigate(path);
  };

  const toggleNotifDropdown = () => {
    const next = !isNotifOpen;
    setIsNotifOpen(next);
    if (next) {
      setNotifLoading(true);
      listNotifications({ page_size: 10 })
        .then((data) => setNotifications(data.results))
        .catch(() => {})
        .finally(() => setNotifLoading(false));
      loadWebPushState({ sync: true })
        .then((state) => setPushState({ ...state, loading: false }))
        .catch(() => {});
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await markNotificationRead(notification.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)),
        );
      } catch {
        // ignore
      }
    }
    setIsNotifOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
    } catch {
      // ignore
    }
  };

  const handlePushToggle = async () => {
    if (pushUpdating) return;
    setPushUpdating(true);
    setPushMessage(null);
    try {
      const nextState = pushState.enabled
        ? await disableWebPush(pushState.publicKey)
        : await enableWebPush(pushState.publicKey);
      setPushState({ ...nextState, loading: false });
      setPushMessage({
        type: "success",
        text: nextState.enabled
          ? nextState.testSent
            ? "Đã bật và gửi thông báo thử."
            : "Đã bật thông báo trên thiết bị này."
          : "Đã tắt thông báo trên thiết bị này.",
      });
    } catch (error) {
      setPushMessage({
        type: "error",
        text: error?.message || "Không thể cập nhật thông báo điện thoại.",
      });
    } finally {
      setPushUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await Promise.race([
        detachCurrentWebPushSubscription(),
        new Promise((resolve) => window.setTimeout(resolve, 1500)),
      ]);
    } catch {
      // Logging out must remain available when the device is offline.
    } finally {
      logout();
    }
  };

  const myProfilePath = (() => {
    if (role === 'teacher' && user?.teacher_id) return `/teachers/${user.teacher_id}`;
    if (role === 'student' && user?.student_id) return `/students/${user.student_id}`;
    return null;
  })();
  const roleLabel =
    {
      superadmin: "Super Admin",
      admin: "Quản trị",
      teacher: "Giảng viên",
      staff: "Nhân viên",
      student: "Học viên",
      center_manager: "Quản lý cơ sở",
      training_manager: "Quản lý đào tạo",
    }[role] || "Chưa có quyền";
  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "VA";
  const displayName = user?.name || "Người dùng";
  const pushStatus = (() => {
    if (pushState.loading) return "Đang kiểm tra...";
    if (pushState.error) return "Không kiểm tra được cấu hình";
    if (!pushState.supported) return "Trình duyệt không hỗ trợ";
    if (pushState.needsHomeScreen) return "Cần mở từ Màn hình chính";
    if (!pushState.configured) return "Máy chủ chưa cấu hình";
    if (pushState.permission === "denied") return "Đã bị chặn trong trình duyệt";
    return pushState.enabled ? "Đang bật trên thiết bị này" : "Đang tắt trên thiết bị này";
  })();
  const pushToggleDisabled = pushState.loading
    || pushUpdating
    || !pushState.supported
    || !pushState.configured
    || pushState.needsHomeScreen
    || pushState.permission === "denied";

  return (
    <div
      className={`${styles.dashboard}${collapsed ? ` ${styles["dashboard--collapsed"]}` : ""}`}
    >
      <aside
        className={`${styles["dashboard__sidebar"]}${
          collapsed ? ` ${styles["dashboard__sidebar--collapsed"]}` : ""
        }`}
      >
        <button
          type="button"
          className={styles["dashboard__sidebar-toggle"]}
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="m14.5 6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className={styles["dashboard__brand"]}>
          <span className={styles["dashboard__brand-mark"]}>
            <svg viewBox="0 0 120 102" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
              {[[14, 30, 4.6], [26, 17, 5.2], [42, 8, 5.8], [78, 8, 5.8], [94, 17, 5.2], [106, 30, 4.6]].map(
                ([x, y, s], i) => (
                  <polygon
                    key={i}
                    points="0,-1 0.224,-0.309 0.951,-0.309 0.363,0.118 0.588,0.809 0,0.382 -0.588,0.809 -0.363,0.118 -0.951,-0.309 -0.224,-0.309"
                    transform={`translate(${x},${y}) scale(${s})`}
                    fill="#F26522"
                  />
                )
              )}
              <path d="M60 6 114 48l-9 6L60 20 15 54l-9-6L60 6z" fill="#A93226" />
              <g stroke="#F26522" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" fill="none">
                <path d="M23 56 42 90 56 34" />
                <path d="M97 56 78 90 64 34" />
              </g>
              <circle cx="34" cy="44" r="9.5" fill="#F26522" />
              <circle cx="86" cy="44" r="9.5" fill="#F26522" />
            </svg>
          </span>
          <div className={styles["dashboard__brand-name"]}>
            <strong>VISTA</strong>
            <span>Perfect Your English</span>
          </div>
        </div>

        <nav className={styles["dashboard__nav"]} aria-label="Điều hướng chính">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `${styles["dashboard__nav-item"]}${
                  isActive ? ` ${styles["dashboard__nav-item--active"]}` : ""
                }`
              }
            >
              <span
                className={styles["dashboard__nav-icon"]}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span
                className={styles["dashboard__nav-indicator"]}
                aria-hidden="true"
              />
              <span className={styles["dashboard__nav-label"]}>
                {item.label}
              </span>
            </NavLink>
          ))}

          {myProfilePath && (
            <NavLink
              to={myProfilePath}
              title={collapsed ? "Hồ sơ của tôi" : undefined}
              className={({ isActive }) =>
                `${styles["dashboard__nav-item"]}${
                  isActive ? ` ${styles["dashboard__nav-item--active"]}` : ""
                }`
              }
            >
              <span className={styles["dashboard__nav-icon"]} aria-hidden="true">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M12 2a5.75 5.75 0 1 0 5.75 5.75A5.75 5.75 0 0 0 12 2Zm0 1.5A4.25 4.25 0 1 1 7.75 7.75 4.25 4.25 0 0 1 12 3.5ZM7.5 14.75A4.75 4.75 0 0 0 2.75 19.5v.75a.75.75 0 0 0 1.5 0V19.5a3.25 3.25 0 0 1 3.25-3.25h9a3.25 3.25 0 0 1 3.25 3.25v.75a.75.75 0 0 0 1.5 0V19.5A4.75 4.75 0 0 0 16.5 14.75Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span className={styles["dashboard__nav-indicator"]} aria-hidden="true" />
              <span className={styles["dashboard__nav-label"]}>Hồ sơ của tôi</span>
            </NavLink>
          )}
        </nav>

        <div className={styles["dashboard__support-card"]} role="presentation">
          <div
            className={styles["dashboard__support-illustration"]}
            aria-hidden="true"
          >
            <svg viewBox="0 0 140 110" focusable="false" aria-hidden="true">
              <defs>
                <linearGradient
                  id="supportGradient"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#a5c1ff" />
                  <stop offset="100%" stopColor="#5d83ff" />
                </linearGradient>
              </defs>
              <path
                d="M15 90c12-24 34-38 62-38s50 10 60 38"
                fill="url(#supportGradient)"
                opacity="0.15"
              />
              <circle cx="72" cy="32" r="18" fill="#ffd9ec" />
              <rect x="42" y="58" width="60" height="32" rx="12" fill="#fff" />
              <rect
                x="52"
                y="48"
                width="40"
                height="26"
                rx="8"
                fill="url(#supportGradient)"
                opacity="0.9"
              />
            </svg>
          </div>
        </div>
      </aside>

      <div className={styles["dashboard__main"]}>
        <header className={styles["dashboard__topbar"]}>
          <div className={styles["dashboard__topbar-scope"]}>
            <label className={styles["dashboard__scope-field"]}>
              <span>🏢</span>
              <select
                value={scopeCenterId}
                onChange={(event) => setScopeCenterId(event.target.value)}
                aria-label="Chọn trung tâm"
              >
                <option value="">Tất cả trung tâm</option>
                {scopeCenters.map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles["dashboard__scope-field"]}>
              <span>📅</span>
              <select
                value={scopeMonth}
                onChange={(event) => setScopeMonth(Number(event.target.value))}
                aria-label="Chọn tháng"
              >
                {SCOPE_MONTHS.map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
              <select
                value={scopeYear}
                onChange={(event) => setScopeYear(Number(event.target.value))}
                aria-label="Chọn năm"
              >
                {SCOPE_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles["dashboard__topbar-search"]} ref={searchRef}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.8-3.8" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm học sinh, lớp học, giáo viên..."
              aria-label="Tìm kiếm"
              value={searchQ}
              onChange={(e) => {
                setSearchQ(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
            />
            {searchQ.trim().length >= 2 && searchOpen && (
              <div className={styles["dashboard__search-pop"]}>
                {searchLoading &&
                !searchResults.students.length &&
                !searchResults.teachers.length &&
                !searchResults.classrooms.length ? (
                  <div className={styles["dashboard__search-empty"]}>Đang tìm…</div>
                ) : !searchResults.students.length &&
                  !searchResults.teachers.length &&
                  !searchResults.classrooms.length ? (
                  <div className={styles["dashboard__search-empty"]}>Không có kết quả</div>
                ) : (
                  <>
                    {searchResults.students.length > 0 && (
                      <div className={styles["dashboard__search-group"]}>
                        <div className={styles["dashboard__search-group-label"]}>Học sinh</div>
                        {searchResults.students.map((s) => (
                          <button
                            type="button"
                            key={`st-${s.id}`}
                            className={styles["dashboard__search-item"]}
                            onClick={() => goToResult(`/students/${s.id}`)}
                          >
                            <span className={styles["dashboard__search-item-name"]}>{nameOfPerson(s)}</span>
                            {(s.phone || s.user?.phone) && (
                              <span className={styles["dashboard__search-item-sub"]}>{s.phone || s.user?.phone}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.classrooms.length > 0 && (
                      <div className={styles["dashboard__search-group"]}>
                        <div className={styles["dashboard__search-group-label"]}>Lớp học</div>
                        {searchResults.classrooms.map((c) => (
                          <button
                            type="button"
                            key={`cl-${c.id}`}
                            className={styles["dashboard__search-item"]}
                            onClick={() => goToResult(`/students?classroom=${c.id}`)}
                          >
                            <span className={styles["dashboard__search-item-name"]}>{c.name}</span>
                            {c.center_name && (
                              <span className={styles["dashboard__search-item-sub"]}>{c.center_name}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.teachers.length > 0 && (
                      <div className={styles["dashboard__search-group"]}>
                        <div className={styles["dashboard__search-group-label"]}>Giáo viên</div>
                        {searchResults.teachers.map((t) => (
                          <button
                            type="button"
                            key={`te-${t.id}`}
                            className={styles["dashboard__search-item"]}
                            onClick={() => goToResult(`/teachers/${t.id}`)}
                          >
                            <span className={styles["dashboard__search-item-name"]}>{nameOfPerson(t)}</span>
                            {(t.user?.email || t.email) && (
                              <span className={styles["dashboard__search-item-sub"]}>{t.user?.email || t.email}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <div className={styles["dashboard__topbar-actions"]}>
            <div style={{ position: "relative" }} ref={notifRef}>
              <button
                type="button"
                className={`${styles["dashboard__icon-button"]} ${styles["dashboard__icon-button--notification"]}`}
                aria-label="Xem thông báo"
                onClick={toggleNotifDropdown}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M12 22a2.25 2.25 0 0 0 2.12-1.5H9.88A2.25 2.25 0 0 0 12 22Zm7-5.5h-.75a.75.75 0 0 1-.75-.75v-4a6.5 6.5 0 1 0-13 0v4a.75.75 0 0 1-.75.75H3a.75.75 0 0 0 0 1.5h18a.75.75 0 0 0 0-1.5Z"
                    fill="currentColor"
                  />
                </svg>
                {unreadCount > 0 && <span className={styles["dashboard__notification-dot"]} />}
              </button>
              {isNotifOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    width: "min(360px, calc(100vw - 32px))",
                    maxHeight: "min(520px, calc(100vh - 100px))",
                    overflowY: "auto",
                    background: "#ffffff",
                    border: "1px solid #e5edf5",
                    borderRadius: 12,
                    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.14)",
                    zIndex: 50,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 14px",
                      borderBottom: "1px solid #eef2f7",
                    }}
                  >
                    <strong style={{ fontSize: "0.9rem" }}>Thông báo</strong>
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#3b5bfd",
                        fontWeight: 600,
                        fontSize: "0.78rem",
                        cursor: "pointer",
                      }}
                    >
                      Đánh dấu tất cả đã đọc
                    </button>
                  </div>
                  <div className={styles["dashboard__push-settings"]}>
                    <div className={styles["dashboard__push-copy"]}>
                      <strong>Thông báo điện thoại</strong>
                      <span>{pushStatus}</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={pushState.enabled}
                      aria-label={pushState.enabled ? "Tắt thông báo điện thoại" : "Bật thông báo điện thoại"}
                      title={pushState.enabled ? "Tắt thông báo điện thoại" : "Bật thông báo điện thoại"}
                      disabled={pushToggleDisabled}
                      className={`${styles["dashboard__push-toggle"]} ${
                        pushState.enabled ? styles["dashboard__push-toggle--active"] : ""
                      }`}
                      onClick={handlePushToggle}
                    >
                      <span />
                    </button>
                    {pushMessage && (
                      <span
                        className={`${styles["dashboard__push-message"]} ${
                          pushMessage.type === "error"
                            ? styles["dashboard__push-message--error"]
                            : ""
                        }`}
                      >
                        {pushMessage.text}
                      </span>
                    )}
                  </div>
                  {notifLoading ? (
                    <div style={{ padding: 16, color: "#7d8592", fontSize: "0.85rem" }}>
                      Đang tải...
                    </div>
                  ) : notifications.length ? (
                    notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNotificationClick(item)}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "10px 14px",
                          border: "none",
                          borderBottom: "1px solid #f4f6f9",
                          background: item.is_read ? "#ffffff" : "#f2f6ff",
                          cursor: "pointer",
                        }}
                      >
                        <strong style={{ display: "block", fontSize: "0.85rem", color: "#0a1629" }}>
                          {item.title}
                        </strong>
                        {item.body && (
                          <span style={{ display: "block", fontSize: "0.78rem", color: "#7d8592", marginTop: 2 }}>
                            {item.body}
                          </span>
                        )}
                        <span style={{ display: "block", fontSize: "0.7rem", color: "#a6afbd", marginTop: 4 }}>
                          {new Date(item.created_at).toLocaleString("vi-VN")}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div style={{ padding: 16, color: "#7d8592", fontSize: "0.85rem" }}>
                      Chưa có thông báo nào.
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ position: "relative" }} ref={userRef}>
              <button
                type="button"
                className={styles["dashboard__user"]}
                onClick={() => setIsUserOpen((value) => !value)}
                aria-haspopup="menu"
                aria-expanded={isUserOpen}
              >
                <div className={styles["dashboard__user-avatar"]} aria-hidden="true">
                  <span>{initials}</span>
                </div>
                <div className={styles["dashboard__user-meta"]}>
                  <strong>{displayName}</strong>
                  <span>{roleLabel}</span>
                </div>
                <span className={styles["dashboard__user-arrow"]} aria-hidden="true">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="m7 10 5 5 5-5Z" fill="currentColor" />
                  </svg>
                </span>
              </button>
              {isUserOpen && (
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    minWidth: 210,
                    background: "#ffffff",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    boxShadow: "0 18px 40px rgba(120, 80, 40, 0.16)",
                    zIndex: 55,
                    padding: 6,
                  }}
                >
                  <div style={{ padding: "8px 12px 10px", borderBottom: "1px solid var(--color-border)" }}>
                    <strong style={{ display: "block", fontSize: "0.85rem", color: "#43301f" }}>
                      {displayName}
                    </strong>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{roleLabel}</span>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsUserOpen(false);
                      handleLogout();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      marginTop: 4,
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      color: "#c0392b",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      borderRadius: 8,
                    }}
                  >
                    <span aria-hidden="true">⎋</span> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className={styles["dashboard__content"]} aria-live="polite">
          <Outlet
            context={{
              centerId: scopeCenterId,
              setCenterId: setScopeCenterId,
              month: scopeMonth,
              setMonth: setScopeMonth,
              year: scopeYear,
              setYear: setScopeYear,
              centers: scopeCenters,
            }}
          />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
