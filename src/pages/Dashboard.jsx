import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import apiClient from "../services/apiClient";
import {
  listClassroomsAll,
  getStaffRequestPendingSummary,
  listTeachingSessions,
} from "../services/calendarService";
import "../styles/vista4.css";

const defaultDistrictSplit = [
  { label: "Xuân Thu", value: 500, color: "#f59f45" },
  { label: "Kim Lũ", value: 500, color: "#3f8cff" },
  { label: "Hòa Tiến", value: 500, color: "#f4c247" },
  { label: "Đông Xuân", value: 500, color: "#3da172" },
];

const defaultStudentActivity = [
  { label: "T1", active: 9, inactive: 6 },
  { label: "FEB", active: 24, inactive: 19 },
  { label: "MAR", active: 22, inactive: 15 },
  { label: "APR", active: 9, inactive: 5 },
  { label: "MAY", active: 9, inactive: 5 },
  { label: "JUN", active: 9, inactive: 5 },
  { label: "JUL", active: 9, inactive: 5 },
  { label: "AUG", active: 9, inactive: 5 },
  { label: "SEP", active: 9, inactive: 5 },
  { label: "OCT", active: 9, inactive: 5 },
  { label: "NOV", active: 9, inactive: 5 },
  { label: "DEC", active: 9, inactive: 5 },
];

const financeMonthLabels = [
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "T8",
  "T9",
  "T10",
  "T11",
  "T12",
];
const financeQuarterLabels = ["Q1", "Q2", "Q3", "Q4"];
const defaultMonthlyIncome = [
  32000000, 28500000, 35200000, 33800000, 38500000, 42000000, 39800000,
  45200000, 37600000, 43800000, 48600000, 51200000,
];
const defaultMonthlyExpense = [
  18000000, 16200000, 20400000, 19600000, 22800000, 24500000, 23600000,
  26800000, 21800000, 25400000, 27200000, 29500000,
];

const buildFinanceSeries = (monthlyIncome, monthlyExpense, year) => {
  const safeIncome = [...monthlyIncome, ...Array(12).fill(0)].slice(0, 12);
  const safeExpense = [...monthlyExpense, ...Array(12).fill(0)].slice(0, 12);
  const months = financeMonthLabels.map((label, index) => ({
    label,
    income: safeIncome[index],
    expense: safeExpense[index],
  }));
  const quarters = financeQuarterLabels.map((label, index) => {
    const start = index * 3;
    const income = safeIncome
      .slice(start, start + 3)
      .reduce((sum, val) => sum + val, 0);
    const expense = safeExpense
      .slice(start, start + 3)
      .reduce((sum, val) => sum + val, 0);
    return { label, income, expense };
  });
  const totalIncome = months.reduce((sum, item) => sum + item.income, 0);
  const totalExpense = months.reduce((sum, item) => sum + item.expense, 0);
  const yearLabel = `Năm ${year}`;
  return {
    series: {
      Tháng: months,
      Quý: quarters,
      Năm: [{ label: yearLabel, income: totalIncome, expense: totalExpense }],
    },
    totals: {
      income: totalIncome,
      expense: totalExpense,
      net: totalIncome - totalExpense,
    },
    year,
  };
};

const pad2 = (value) => String(value).padStart(2, "0");
/* ===== VISTA 4.0 dashboard clone helpers (from reference source) ===== */
const DASH_ICON_PATHS = {
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M17.5 14.6c2.3.4 3.7 1.9 4 4.4" />
    </>
  ),
  book: <path d="M4 19V5a2 2 0 0 1 2-2h13v16H6.5A2.5 2.5 0 0 0 4 21.5V19zM4 19a2.5 2.5 0 0 1 2.5-2.5H19" />,
  dollar: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.5v11M15 8.8c-.6-1-1.7-1.5-3-1.5-1.6 0-3 .8-3 2.3 0 3 6 1.7 6 4.7 0 1.5-1.4 2.4-3 2.4-1.3 0-2.5-.6-3.1-1.6" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.2" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </>
  ),
  clip: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 2.5h6v3H9zM9 11h6M9 15h4" />
    </>
  ),
  star: <path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8L12 3z" />,
  cal: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M8 2v4M16 2v4M3 9.5h18" />
    </>
  ),
  mega: (
    <>
      <path d="M3 10v4l9 4V6l-9 4zM12 8l8-3v14l-8-3" />
      <path d="M6.5 15.5V19a1.5 1.5 0 0 0 3 0v-2.3" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="14" rx="2.5" />
      <path d="M3 10h18M16.5 15h.1" />
    </>
  ),
  receipt: (
    <>
      <path d="M5 3h14v18l-2.3-1.6L14.4 21l-2.4-1.6L9.6 21l-2.3-1.6L5 21z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  trendUp: (
    <>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  gradcap: (
    <>
      <path d="M2 9.5 12 5l10 4.5L12 14 2 9.5z" />
      <path d="M6.5 11.7V16c0 1.4 2.5 2.8 5.5 2.8s5.5-1.4 5.5-2.8v-4.3M22 9.5V15" />
    </>
  ),
  folder: <path d="M3 6a2 2 0 0 1 2-2h5l2 2.5h7a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" />,
  brief: (
    <>
      <rect x="3" y="7.5" width="18" height="13" rx="2" />
      <path d="M9 7.5V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2.5M3 13h18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  doc: (
    <>
      <path d="M6 2.5h8l5 5V21.5H6z" />
      <path d="M14 2.5v5h5M9 13h6M9 17h6" />
    </>
  ),
  checkC: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.7 2.7L16.5 9" />
    </>
  ),
  arrowR: <path d="M4 12h16m-6-6 6 6-6 6" />,
  up: <path d="M12 19V5m-6 6 6-6 6 6" />,
  down: <path d="M12 5v14m6-6-6 6-6-6" />,
};

function DashIcon({ name }) {
  return (
    <svg
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {DASH_ICON_PATHS[name]}
    </svg>
  );
}

function DashTrend({ dir = "up", text }) {
  return (
    <span className={`trend ${dir}`}>
      <DashIcon name={dir === "up" ? "up" : "down"} /> {text}
    </span>
  );
}

function DashKpi({ icon, color, label, value, dir, change, sub }) {
  return (
    <div className="kpi">
      <div className={`ico ${color}`}>
        <DashIcon name={icon} />
      </div>
      <div>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
        {change ? <DashTrend dir={dir || "up"} text={change} /> : sub ? <span className="small muted">{sub}</span> : null}
      </div>
    </div>
  );
}

// SVG donut: segs = [{pct, color}]
function DashDonut({ size = 130, thick = 20, segs = [], center, centerSub }) {
  const r = (size - thick) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  let off = circ * 0.25;
  const arcs = segs.map((s, i) => {
    const len = (circ * s.pct) / 100;
    const el = (
      <circle
        key={i}
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={s.color}
        strokeWidth={thick}
        strokeDasharray={`${Math.max(len - 2, 0)} ${circ - len + 2}`}
        strokeDashoffset={off}
        strokeLinecap="butt"
      />
    );
    off -= len;
    return el;
  });
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, flexShrink: 0 }} aria-hidden="true">
      <circle cx={c} cy={c} r={r} fill="none" stroke="#F6EFE6" strokeWidth={thick} />
      {arcs}
      <text x={c} y={c - 2} textAnchor="middle" fontSize={size / 7.5} fontWeight="800" fill="#43301F">
        {center}
      </text>
      {centerSub ? (
        <text x={c} y={c + 14} textAnchor="middle" fontSize="9.5" fill="#A99A88">
          {centerSub}
        </text>
      ) : null}
    </svg>
  );
}

// SVG line chart: data numbers + labels
function DashLine({ w = 300, h = 130, data = [], labels = [], color = "#F26522", unit = "" }) {
  if (!data.length) return null;
  const max = Math.max(...data) * 1.15 || 1;
  const px = (i) => 30 + i * ((w - 46) / Math.max(data.length - 1, 1));
  const py = (v) => 14 + (h - 44) * (1 - v / max);
  const pts = data.map((v, i) => `${px(i)},${py(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }} aria-hidden="true">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1="26" x2={w - 14} y1={py(max * f)} y2={py(max * f)} stroke="#F3EBE0" strokeWidth="1" />
      ))}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      <polygon points={`30,${py(0)} ${pts} ${px(data.length - 1)},${py(0)}`} fill={color} opacity="0.07" />
      {data.map((v, i) => (
        <g key={i}>
          <circle cx={px(i)} cy={py(v)} r="3.5" fill="#fff" stroke={color} strokeWidth="2.5" />
          <text x={px(i)} y={py(v) - 9} fontSize="9.5" fontWeight="700" fill="#43301F" textAnchor="middle">
            {v.toLocaleString("vi-VN")}
            {unit}
          </text>
        </g>
      ))}
      {labels.map((l, i) => (
        <text key={i} x={px(i)} y={h - 6} fontSize="9" fill="#A99A88" textAnchor="middle">
          {l}
        </text>
      ))}
    </svg>
  );
}

function DashOpsCard({ icon, title, rows, to, onNavigate }) {
  return (
    <button
      type="button"
      className="card"
      style={{
        boxShadow: "none",
        background: "#FBF7F1",
        display: "block",
        width: "100%",
        textAlign: "left",
        border: "none",
        font: "inherit",
        cursor: "pointer",
      }}
      onClick={() => onNavigate && onNavigate(to)}
    >
      <div className="flex mb12">
        <div className="ico-sm" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
          <DashIcon name={icon} />
        </div>
        <b style={{ fontSize: 13 }}>{title}</b>
      </div>
      {rows.map((r, i) => (
        <div className="kv" key={i}>
          <span className="k">{r[0]}</span>
          <span className="v">{r[1]}</span>
        </div>
      ))}
    </button>
  );
}

function DashMiniKpi({ icon, label, value, dir, change }) {
  return (
    <div className="card" style={{ boxShadow: "none", background: "#FBF7F1" }}>
      <div className="flex">
        <div className="ico-sm" style={{ background: "var(--card)", color: "var(--primary)" }}>
          <DashIcon name={icon} />
        </div>
        <div>
          <div className="small muted bold">{label}</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{value}</div>
          {change ? <DashTrend dir={dir} text={change} /> : null}
        </div>
      </div>
    </div>
  );
}

function DashHbar({ label, val, pct, color }) {
  return (
    <div className="hbar-row">
      <span className="hb-label">{label}</span>
      <span className="hb-bar">
        <i style={{ width: `${pct}%`, background: color }} />
      </span>
      <span className="hb-val">{val}</span>
    </div>
  );
}

const WEEKDAY_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MINI_LES_TINTS = ["#FDEEE4", "#E8F6EE", "#EAF2FE", "#FEF6E7", "#F3EEFB"];

function startOfWeekMonday(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=CN .. 6=T7
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function toLocalDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function sessionTimeLabel(startAt) {
  if (!startAt) return "";
  const d = new Date(startAt);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function DashMiniWeek({ weekStart, sessionsByDate }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const MAX = 4;
  return (
    <div className="mini-week">
      {days.map((d, i) => (
        <div className="mw-h" key={`h-${i}`}>
          {WEEKDAY_SHORT[i]}
          <small>
            {`${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`}
          </small>
        </div>
      ))}
      {days.map((d, i) => {
        const items = sessionsByDate.get(toLocalDateKey(d)) || [];
        return (
          <div className="mw-cell" key={`c-${i}`}>
            {items.slice(0, MAX).map((s, j) => (
              <div
                className="mini-les"
                key={s.id ?? j}
                style={{ background: MINI_LES_TINTS[j % MINI_LES_TINTS.length], color: "#43301F" }}
              >
                <b>
                  {sessionTimeLabel(s.start_at)} · {s.classroom_name || "Lớp"}
                </b>
                {s.teacher_name ? <small>GV. {s.teacher_name}</small> : null}
              </div>
            ))}
            {items.length > MAX ? (
              <div className="small muted" style={{ fontSize: 8.5 }}>
                +{items.length - MAX} lịch
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const [studentSummary, setStudentSummary] = useState({
    totalActive: 0,
    delta: 0,
  });
  const [studentDistribution, setStudentDistribution] = useState(
    defaultDistrictSplit
  );
  const [studentActivity, setStudentActivity] = useState(
    defaultStudentActivity
  );
  const financeInitial = buildFinanceSeries(
    defaultMonthlyIncome,
    defaultMonthlyExpense,
    new Date().getFullYear()
  );
  const financeView = "Tháng";
  const [financeSeries, setFinanceSeries] = useState(financeInitial.series);
  const [financeTotals, setFinanceTotals] = useState(financeInitial.totals);
  const [classroomCount, setClassroomCount] = useState(null);
  const [staffPending, setStaffPending] = useState({ leave_shift: 0, proposal: 0, total: 0 });
  const [weekSessions, setWeekSessions] = useState([]);
  const weekStart = startOfWeekMonday(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekFrom = toLocalDateKey(weekStart);
  const weekTo = toLocalDateKey(weekEnd);
  const weekSessionsByDate = useMemo(() => {
    const map = new Map();
    weekSessions.forEach((session) => {
      const key =
        session.session_date ||
        (session.start_at ? toLocalDateKey(new Date(session.start_at)) : null);
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(session);
    });
    map.forEach((arr) =>
      arr.sort((a, b) => String(a.start_at || "").localeCompare(String(b.start_at || "")))
    );
    return map;
  }, [weekSessions]);
  const financeData = financeSeries[financeView] || [];
  const financeValues = financeData.flatMap((item) => [
    Number(item.income) || 0,
    Number(item.expense) || 0,
  ]);
  const financeMax = Math.max(1, ...financeValues);
  const distributionTotal = useMemo(
    () =>
      studentDistribution.reduce((sum, item) => sum + (item.value || 0), 0),
    [studentDistribution]
  );
  const radialStops = useMemo(() => {
    if (!distributionTotal) return [];
    return studentDistribution.reduce((acc, item, index) => {
      const start = index === 0 ? 0 : acc[index - 1].end;
      const end = start + ((item.value || 0) / distributionTotal) * 100;
      return [...acc, { ...item, start, end }];
    }, []);
  }, [distributionTotal, studentDistribution]);
  const deltaLabel = useMemo(() => {
    const value = Number(studentSummary.delta) || 0;
    return `${value >= 0 ? "+" : ""}${value}`;
  }, [studentSummary.delta]);

  const formatCompact = (value) =>
    new Intl.NumberFormat("vi-VN", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value || 0);

  const fetchFinanceSummary = async (targetYear) => {
    try {
      const params = targetYear ? { year: targetYear } : undefined;
      const response = await apiClient.get("/finances/entries/summary/", {
        params,
      });
      const data = response.data || {};
      if (
        Array.isArray(data.monthly_income) &&
        Array.isArray(data.monthly_expense)
      ) {
        const summary = buildFinanceSeries(
          data.monthly_income,
          data.monthly_expense,
          data.year || targetYear
        );
        setFinanceSeries(summary.series);
        setFinanceTotals(summary.totals);
        return true;
      }
    } catch (error) {
      return false;
    }
    return false;
  };

  useEffect(() => {
    fetchFinanceSummary();
  }, []);

  // Dữ liệu thật bổ sung cho KPI tổng quan: số lớp + số việc chờ duyệt.
  useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        const classrooms = await listClassroomsAll();
        if (isActive) setClassroomCount(Array.isArray(classrooms) ? classrooms.length : null);
      } catch (error) {
        if (isActive) setClassroomCount(null);
      }
      try {
        const summary = await getStaffRequestPendingSummary();
        if (isActive) setStaffPending(summary || { leave_shift: 0, proposal: 0, total: 0 });
      } catch (error) {
        if (isActive) setStaffPending({ leave_shift: 0, proposal: 0, total: 0 });
      }
    })();
    return () => {
      isActive = false;
    };
  }, []);

  // Lịch dạy tuần hiện tại (dữ liệu thật từ teaching-sessions).
  useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        const data = await listTeachingSessions({
          date_from: weekFrom,
          date_to: weekTo,
          page_size: 300,
        });
        if (isActive) setWeekSessions(Array.isArray(data?.results) ? data.results : []);
      } catch (error) {
        if (isActive) setWeekSessions([]);
      }
    })();
    return () => {
      isActive = false;
    };
  }, [weekFrom, weekTo]);

  useEffect(() => {
    let isActive = true;

    const fetchStudentSummary = async () => {
      try {
        const response = await apiClient.get("/dashboard/student_counts/", {
          params: { year: currentYear, month: currentMonth },
        });
        if (!isActive) return;
        const data = response.data || {};
        setStudentSummary({
          totalActive: data.total_active || 0,
          delta: data.delta || 0,
        });
      } catch (error) {
        if (!isActive) return;
      }
    };

    const fetchStudentDistribution = async () => {
      try {
        const response = await apiClient.get(
          "/dashboard/student_distribution/"
        );
        if (!isActive) return;
        const data = response.data || {};
        if (Array.isArray(data.items)) {
          setStudentDistribution(data.items);
        }
      } catch (error) {
        if (!isActive) return;
      }
    };

    const fetchStudentActivity = async () => {
      try {
        const response = await apiClient.get("/dashboard/student_activity/", {
          params: { year: currentYear },
        });
        if (!isActive) return;
        const data = response.data || {};
        if (Array.isArray(data.items)) {
          setStudentActivity(data.items);
        }
      } catch (error) {
        if (!isActive) return;
      }
    };

    fetchStudentSummary();
    fetchStudentDistribution();
    fetchStudentActivity();

    return () => {
      isActive = false;
    };
  }, [currentYear, currentMonth]);

  const greetingName = (() => {
    try {
      const stored = JSON.parse(localStorage.getItem("vista_user") || "{}");
      return stored.name || stored.full_name || stored.email || "bạn";
    } catch (error) {
      return "bạn";
    }
  })();
  const weekdayNames = [
    "Chủ nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];
  const todayLabel = `${weekdayNames[now.getDay()]}, ${pad2(now.getDate())}/${pad2(
    currentMonth
  )}/${currentYear}`;
  const monthIncome =
    (financeSeries?.["Tháng"]?.[currentMonth - 1]?.income) || 0;
  const totalStudents = studentSummary.totalActive || distributionTotal || 0;
  const distributionSegs = radialStops.map((stop) => ({
    pct: stop.end - stop.start,
    color: stop.color,
  }));
  const activitySlice = studentActivity.slice(-6);
  const activityData = activitySlice.map((item) => Number(item.active) || 0);
  const activityLabels = activitySlice.map((item) => item.label);
  const studentTrendDir = (Number(studentSummary.delta) || 0) >= 0 ? "up" : "down";

  return (
    <div className="v4page">
      <div className="page-head">
        <h1>Dashboard Tổng quan</h1>
        <p>Tổng hợp vận hành trung tâm theo thời gian thực</p>
      </div>

      <div className="hero">
        <span className="hero-spark" style={{ top: 12, left: "38%" }}>
          ✦
        </span>
        <span
          className="hero-spark"
          style={{ bottom: 16, left: "56%", animationDelay: "1.2s" }}
        >
          ✦
        </span>
        <div className="hero-body">
          <h2>Chào {greetingName} 👋 — VISTA vận hành ổn định hôm nay!</h2>
          <p>Perfect Your English · {todayLabel} · Theo dõi toàn hệ thống theo thời gian thực</p>
          <div className="hero-chips">
            <span className="hchip">
              <DashIcon name="users" /> {totalStudents.toLocaleString("vi-VN")} học viên
            </span>
            <span className="hchip">
              <DashIcon name="book" /> {classroomCount ?? "—"} lớp hoạt động
            </span>
            <span className="hchip">
              <DashIcon name="clip" /> {staffPending.total} việc chờ duyệt
            </span>
            <span className="hchip">
              <DashIcon name="trendUp" /> Doanh thu {formatCompact(monthIncome)}₫
            </span>
          </div>
        </div>
        <div className="hero-illo">
          <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" style={{ width: 92, height: 92 }} aria-hidden="true">
            <circle cx="40" cy="40" r="38" fill="#F26522" opacity=".12" />
            <path d="M40 14c-9 0-14 6-14 13 0 3 .8 5 .8 5l2-1 1.5-6 19 .5 1.8 6.5 2.2 1s.7-2.5.7-6c0-7-5-13-14-13z" fill="#4A3728" />
            <circle cx="40" cy="32" r="11" fill="#FFD9B3" />
            <circle cx="36" cy="31" r="1.4" fill="#43301F" />
            <circle cx="44" cy="31" r="1.4" fill="#43301F" />
            <path d="M36.5 36.5c2 1.8 5 1.8 7 0" stroke="#C86A3B" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M24 66c0-11 7-17 16-17s16 6 16 17" fill="#F26522" />
            <path d="M58 40l6-3m-6 7l7 0" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" />
            <path d="M22 40l-6-3m6 7l-7 0" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <svg className="hero-mark" viewBox="0 0 120 102" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M60 6 114 48l-9 6L60 20 15 54l-9-6L60 6z" fill="#fff" />
          <g stroke="#fff" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M23 56 42 90 56 34" />
            <path d="M97 56 78 90 64 34" />
          </g>
          <circle cx="34" cy="44" r="9.5" fill="#fff" />
          <circle cx="86" cy="44" r="9.5" fill="#fff" />
        </svg>
      </div>

      <div className="kpi-grid">
        <DashKpi
          icon="users"
          color="orange"
          label="Tổng học viên"
          value={totalStudents.toLocaleString("vi-VN")}
          dir={studentTrendDir}
          change={`${deltaLabel} so với tháng trước`}
        />
        <DashKpi
          icon="book"
          color="orange"
          label="Lớp đang hoạt động"
          value={classroomCount ?? "—"}
        />
        <DashKpi
          icon="dollar"
          color="orange"
          label="Doanh thu tháng"
          value={`${formatCompact(monthIncome)}₫`}
        />
        <DashKpi
          icon="target"
          color="green"
          label="Tỷ lệ chuyên cần"
          value="—"
          sub="Chưa có dữ liệu"
        />
        <DashKpi
          icon="clip"
          color="red"
          label="Công việc chờ duyệt"
          value={staffPending.total}
        />
        <DashKpi
          icon="star"
          color="yellow"
          label="Điểm thi đua TB"
          value="—"
          sub="Chưa có dữ liệu"
        />
      </div>

      <div className="stack">
        <div className="card">
          <div className="card-head">
            <h3>Vận hành trọng tâm hôm nay</h3>
          </div>
          <div className="grid c4">
            <DashOpsCard
              icon="users"
              title="Học sinh – Lớp học"
              rows={[
                ["Tổng học viên", totalStudents.toLocaleString("vi-VN")],
                ["Số lớp học", classroomCount ?? "—"],
                ["Xem chi tiết", "→"],
              ]}
              to="/students"
              onNavigate={navigate}
            />
            <DashOpsCard
              icon="cal"
              title="Lịch dạy & báo giảng"
              rows={[
                ["Đơn chờ duyệt", staffPending.total],
                ["Nghỉ / đổi ca", staffPending.leave_shift],
                ["Mở lịch làm việc", "→"],
              ]}
              to="/calendar-detail"
              onNavigate={navigate}
            />
            <DashOpsCard
              icon="mega"
              title="Truyền thông"
              rows={[
                ["Chiến dịch đang chạy", "—"],
                ["Nội dung chờ duyệt", "—"],
                ["Bài đăng hôm nay", "—"],
              ]}
              to="/calendar-detail"
              onNavigate={navigate}
            />
            <DashOpsCard
              icon="dollar"
              title="Tài chính & hành chính"
              rows={[
                ["Doanh thu tháng", `${formatCompact(monthIncome)}₫`],
                ["Đề xuất chờ duyệt", staffPending.proposal],
                ["Mở tài chính", "→"],
              ]}
              to="/finance"
              onNavigate={navigate}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Lịch làm việc tuần</h3>
            <button
              type="button"
              className="card-link"
              style={{ cursor: "pointer", background: "none", border: "none", font: "inherit" }}
              onClick={() => navigate("/calendar-detail")}
            >
              Xem tất cả <DashIcon name="arrowR" />
            </button>
          </div>
          <div className="small muted mb12">
            {`Tuần ${weekFrom.slice(8)}/${weekFrom.slice(5, 7)} – ${weekTo.slice(8)}/${weekTo.slice(
              5,
              7
            )} · lịch dạy theo ngày`}
          </div>
          {weekSessions.length ? (
            <DashMiniWeek weekStart={weekStart} sessionsByDate={weekSessionsByDate} />
          ) : (
            <div className="small muted" style={{ padding: "10px 2px" }}>
              Không có lịch dạy trong tuần này.
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Học sinh – Lớp học snapshot</h3>
            <button
              type="button"
              className="card-link"
              style={{ cursor: "pointer", background: "none", border: "none", font: "inherit" }}
              onClick={() => navigate("/students")}
            >
              Xem chi tiết <DashIcon name="arrowR" />
            </button>
          </div>
          <div className="grid c4">
            <div>
              <div className="small muted bold">Tổng sĩ số cơ sở</div>
              <div className="big-num mt8">
                {totalStudents.toLocaleString("vi-VN")}{" "}
                <span style={{ display: "inline-flex", width: 26, height: 26, color: "var(--primary)" }}>
                  <DashIcon name="users" />
                </span>
              </div>
              <DashTrend dir={studentTrendDir} text={`${deltaLabel} so với tháng trước`} />
              <hr className="hr" />
              {radialStops.slice(0, 3).map((stop, i) => (
                <div className="kv" key={`${stop.label}-${i}`}>
                  <span className="k">
                    <i style={{ width: 8, height: 8, borderRadius: "50%", background: stop.color }} />
                    {stop.label}
                  </span>
                  <span className="v">{Number(stop.value || 0).toLocaleString("vi-VN")}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="small muted bold mb12">Phân bổ theo khu vực</div>
              <div className="donut-wrap">
                <DashDonut
                  size={120}
                  thick={19}
                  segs={distributionSegs}
                  center={totalStudents.toLocaleString("vi-VN")}
                  centerSub="Tổng"
                />
                <div className="donut-legend">
                  {radialStops.map((stop, i) => (
                    <div className="dl" key={`${stop.label}-${i}`}>
                      <i style={{ background: stop.color }} />
                      {stop.label}{" "}
                      <b>{Number(stop.value || 0).toLocaleString("vi-VN")}</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="small muted bold mb12">Biến động học viên</div>
              {activityData.length ? (
                <DashLine w={300} h={130} data={activityData} labels={activityLabels} />
              ) : (
                <div className="small muted">Chưa có dữ liệu biến động.</div>
              )}
            </div>
            <div>
              <div className="small muted bold mb12">Chuyên cần trung bình</div>
              <div style={{ display: "flex", justifyContent: "center", opacity: 0.55 }}>
                <DashDonut
                  size={118}
                  thick={17}
                  segs={[{ pct: 100, color: "#E6DED2" }]}
                  center="—"
                  centerSub="Chưa có dữ liệu"
                />
              </div>
              <div className="kv mt8">
                <span className="k">Cần kết nối module điểm danh</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid c2">
          <div className="card">
            <div className="card-head">
              <h3>Truyền thông overview</h3>
              <span className="badge orange">Demo</span>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Chương trình</th>
                    <th>Lớp học</th>
                    <th>Tiêu đề</th>
                    <th>Nghiệm thu</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["FP Starter", "Khai giảng lớp FP Starter", '<green>Đạt'],
                    ["KET", "Lộ trình Cambridge KET 2025", '<orange>Chờ duyệt'],
                    ["GS 3", "Bứt phá tiếng Anh cùng GS 3", '<green>Đạt'],
                    ["IELTS 4.0", "Bí quyết đạt IELTS 4.0", '<red>Không đạt'],
                  ].map((row, i) => {
                    const [tone, text] = row[2].startsWith("<")
                      ? [row[2].slice(1).split(">")[0], row[2].split(">")[1]]
                      : ["orange", row[2]];
                    return (
                      <tr key={i}>
                        <td>
                          <span className="chip">{row[0]}</span>
                        </td>
                        <td className="bold">{row[1]}</td>
                        <td className="muted">05/2025</td>
                        <td>
                          <span className={`badge ${tone}`}>{text}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="card-foot">
              <span className="small muted">Chưa kết nối module truyền thông — dữ liệu minh hoạ.</span>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Tài chính overview</h3>
            </div>
            <div className="grid c3">
              <DashMiniKpi
                icon="wallet"
                label="Tổng thu (năm)"
                value={`${formatCompact(financeTotals.income)}₫`}
              />
              <DashMiniKpi
                icon="receipt"
                label="Tổng chi (năm)"
                value={`${formatCompact(financeTotals.expense)}₫`}
              />
              <DashMiniKpi
                icon="dollar"
                label="Lợi nhuận (năm)"
                value={`${formatCompact(financeTotals.net)}₫`}
              />
            </div>
            <div className="grid c2 mt16">
              <div>
                <div className="section-label">Doanh thu 6 tháng gần nhất</div>
                {(financeSeries?.["Tháng"] || [])
                  .slice(Math.max(0, currentMonth - 6), currentMonth)
                  .map((item) => {
                    const max = financeMax || 1;
                    return (
                      <DashHbar
                        key={item.label}
                        label={item.label}
                        val={`${formatCompact(item.income)}₫`}
                        pct={Math.round(((Number(item.income) || 0) / max) * 100)}
                        color="#F26522"
                      />
                    );
                  })}
              </div>
              <div>
                <div className="card" style={{ background: "#FBF7F1", boxShadow: "none" }}>
                  <div className="small muted bold">Doanh thu tháng này</div>
                  <div className="big-num">{`${formatCompact(monthIncome)}₫`}</div>
                </div>
                <div className="card mt12" style={{ background: "#FBF7F1", boxShadow: "none" }}>
                  <div className="small muted bold">Lợi nhuận thuần (năm)</div>
                  <div className="big-num">{`${formatCompact(financeTotals.net)}₫`}</div>
                </div>
              </div>
            </div>
            <div className="card-foot">
              <button
                type="button"
                className="card-link"
                style={{ cursor: "pointer", background: "none", border: "none", font: "inherit" }}
                onClick={() => navigate("/finance")}
              >
                Xem chi tiết tài chính <DashIcon name="arrowR" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid c2">
          <div className="card">
            <div className="card-head">
              <h3>Hành chính – Nhân sự overview</h3>
              <span className="badge orange">Demo</span>
            </div>
            <div className="list">
              {[
                ["gradcap", "primary", "Đào tạo nội bộ", "3 khóa"],
                ["users", "primary", "Tuyển dụng", "5 vị trí"],
                ["folder", "primary", "Hồ sơ nhân sự", "85 hồ sơ"],
                ["brief", "danger", "Công việc hành chính cần xử lý", "17 việc"],
                ["clock", "danger", "Yêu cầu chờ duyệt", `${staffPending.total} yêu cầu`],
              ].map((row, i) => (
                <div className="li" key={i}>
                  <div
                    className="ico-sm"
                    style={{
                      background: `var(--${row[1]}-soft)`,
                      color: `var(--${row[1] === "danger" ? "danger" : "primary"})`,
                    }}
                  >
                    <DashIcon name={row[0]} />
                  </div>
                  <div className="li-body">
                    <div className="li-title">{row[2]}</div>
                  </div>
                  <div className="li-end">{row[3]}</div>
                </div>
              ))}
            </div>
            <div className="card-foot">
              <span className="small muted">Yêu cầu chờ duyệt là dữ liệu thật; các mục khác minh hoạ.</span>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Báo cáo &amp; duyệt</h3>
            </div>
            <div className="list">
              <div className="li">
                <div className="ico-sm" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
                  <DashIcon name="clock" />
                </div>
                <div className="li-body">
                  <div className="li-title">Đơn nhân sự chờ duyệt</div>
                </div>
                <div className="li-end">{staffPending.total} đơn</div>
              </div>
              <div className="li">
                <div className="ico-sm" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                  <DashIcon name="doc" />
                </div>
                <div className="li-body">
                  <div className="li-title">Nghỉ / đổi ca chờ duyệt</div>
                </div>
                <div className="li-end">{staffPending.leave_shift} đơn</div>
              </div>
              <div className="li">
                <div className="ico-sm" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
                  <DashIcon name="checkC" />
                </div>
                <div className="li-body">
                  <div className="li-title">Đề xuất – yêu cầu chờ duyệt</div>
                </div>
                <div className="li-end">{staffPending.proposal} đơn</div>
              </div>
            </div>
            <div className="mt12">
              <div className="small muted bold mb12">Xử lý đơn chờ duyệt</div>
              <div className="flex">
                <div className="prog green" style={{ height: 10 }}>
                  <i style={{ width: staffPending.total ? "35%" : "100%" }} />
                </div>
                <b>{staffPending.total ? `${staffPending.total} chờ` : "Sạch"}</b>
              </div>
            </div>
            <div className="card-foot">
              <button
                type="button"
                className="card-link"
                style={{ cursor: "pointer", background: "none", border: "none", font: "inherit" }}
                onClick={() => navigate("/monthly-reports")}
              >
                Xem tất cả báo cáo <DashIcon name="arrowR" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
