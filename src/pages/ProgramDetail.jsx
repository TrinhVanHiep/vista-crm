import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  listClassesOverview,
  listClassroomsAll,
  listStudentScores,
  listClassTasks,
  createClassTask,
  getTuitionSummary,
} from "../services/calendarService";
import { tuitionByNormCode, normCode } from "../utils/classCode";
import "../styles/vista4.css";

const fmt = (n) => (Number(n) || 0).toLocaleString("vi-VN");
const vnd = (n) => `${fmt(Math.round(Number(n) || 0))} đ`;
const pct = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

const UNCLASSIFIED = "Chưa phân loại";

const CLASS_STATUS = {
  active: { label: "Đang hoạt động", cls: "green" },
  paused: { label: "Tạm dừng", cls: "orange" },
  draft: { label: "Nháp", cls: "gray" },
  completed: { label: "Hoàn thành", cls: "blue" },
  closed: { label: "Đã đóng", cls: "red" },
};

const DELIVERY = { online: "Online", offline: "Trực tiếp", hybrid: "Kết hợp" };

// Nhiệm vụ tháng / học kỳ theo lớp — trạng thái (REAL từ backend /class-tasks/).
const TASK_STATUS = {
  pending: { label: "Chưa làm", cls: "gray" },
  in_progress: { label: "Đang làm", cls: "orange" },
  review: { label: "Chờ nghiệm thu", cls: "blue" },
  done: { label: "Hoàn thành", cls: "green" },
  overdue: { label: "Trễ hạn", cls: "red" },
};

const emptyTaskForm = {
  classroom: "",
  title: "",
  term: "month",
  due_date: "",
  status: "pending",
  assignee: "",
};

// Số buổi tổng suy ra từ tên chương trình ("60 BUỔI STARTER" -> 60). Không match -> null (chưa rõ).
const parseTotalBuoi = (programName) => {
  const m = /(\d+)\s*BUỔI/i.exec(programName || "");
  return m ? Number(m[1]) : null;
};

const bandFromPercent = (p) => (p == null ? null : p >= 80 ? "gioi" : p >= 65 ? "kha" : "tb");
const GRADE_META = {
  gioi: { label: "Giỏi", color: "#2E9E5B" },
  kha: { label: "Khá", color: "#3B82F6" },
  tb: { label: "Trung bình", color: "#D9822B" },
};

function Kpi({ ico, icoClass, label, value, sub, demo }) {
  return (
    <div className="kpi">
      <div className={`ico ${icoClass}`} style={{ fontSize: 18 }}>{ico}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="kpi-label">
          {label}
          {demo ? (
            <span className="badge gray" style={{ marginLeft: 6, padding: "1px 7px", fontSize: 9 }}>Demo</span>
          ) : null}
        </div>
        <div className="kpi-value">{value}</div>
        {sub ? <div className="small muted">{sub}</div> : null}
      </div>
    </div>
  );
}

// Multi-segment donut (used by the tuition status card).
function Donut({ segments, total, size = 118, thick = 18, centerTop, centerBottom }) {
  const r = (size - thick) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const denom = total || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="#EFE7DB" strokeWidth={thick} />
      {segments.map((s, i) => {
        if (!s.value) return null;
        const dash = (s.value / denom) * circ;
        const el = (
          <circle
            key={i}
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={thick}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${c} ${c})`}
          />
        );
        offset += dash;
        return el;
      })}
      <text x={c} y={c - 1} textAnchor="middle" fontSize="15" fontWeight="800" fill="#43301F">{centerTop}</text>
      <text x={c} y={c + 14} textAnchor="middle" fontSize="10" fill="#8a7a66">{centerBottom}</text>
    </svg>
  );
}

// Fixed-overlay modal (same shape as Students.jsx / Tuition.jsx).
function Modal({ title, onClose, children, width = 560 }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(40,26,12,0.42)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }}>
      <div className="card rp-form" onClick={(e) => e.stopPropagation()} style={{ width, maxWidth: "100%", boxShadow: "0 20px 60px rgba(40,26,12,0.3)" }}>
        <div className="card-head" style={{ marginBottom: 6 }}>
          <h3>{title}</h3>
          <button type="button" className="btn ghost" style={{ padding: "4px 10px" }} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function ProgramDetail() {
  const navigate = useNavigate();

  // Role -> quyền quản lý (thêm nhiệm vụ).
  const role = (() => {
    try {
      const r = JSON.parse(localStorage.getItem("vista_user") || "{}").role;
      return (typeof r === "string" ? r : r?.name) || "";
    } catch (e) {
      return "";
    }
  })();
  // Backend ClassTaskViewSet.create dùng IsTeacherOrAdmin -> is_teaching_planner_user,
  // TEACHING_PLANNER_ROLE_NAMES có "teacher" => giáo viên được tạo nhiệm vụ lớp.
  const canManage = ["superadmin", "admin", "teacher"].includes(role);
  // Học phí: backend CanManageTuition chỉ cho {superadmin, admin, staff, center_manager,
  // training_manager} — role teacher bị 403, nên ẩn hẳn mọi khối học phí cho teacher.
  const isTeacher = role === "teacher";

  const [rows, setRows] = useState([]);
  const [deliveryById, setDeliveryById] = useState({});
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProgram, setActiveProgram] = useState("");

  // Học phí thực theo lớp (REAL từ getTuitionSummary) — Map(normCode -> {total_fee, remaining, paid, students}).
  const [tuitionMap, setTuitionMap] = useState(() => new Map());

  // Nhiệm vụ tháng / học kỳ (REAL) + form thêm mới.
  const [tasks, setTasks] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [taskModal, setTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [taskError, setTaskError] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const [overview, classAll, rawScores] = await Promise.all([
        listClassesOverview({ month, year }).catch(() => ({ results: [] })),
        listClassroomsAll().catch(() => []),
        listStudentScores({ page_size: 100 }).catch(() => ({ results: [] })),
      ]);
      if (!active) return;
      setRows(Array.isArray(overview?.results) ? overview.results : []);
      const dmap = {};
      (Array.isArray(classAll) ? classAll : []).forEach((c) => {
        if (c?.id != null) dmap[String(c.id)] = c.delivery_mode || "";
      });
      setDeliveryById(dmap);
      setScores(Array.isArray(rawScores?.results) ? rawScores.results : []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [month, year]);

  // Nhiệm vụ tháng / học kỳ theo lớp (REAL) — nạp 1 lần, refetch khi reloadKey đổi.
  useEffect(() => {
    let active = true;
    (async () => {
      const res = await listClassTasks({ page_size: 200 }).catch(() => ({ results: [] }));
      if (!active) return;
      setTasks(Array.isArray(res?.results) ? res.results : []);
    })();
    return () => { active = false; };
  }, [reloadKey]);

  // Học phí năm 2026 (REAL) — nạp 1 lần khi mount, dựng Map theo mã lớp chuẩn hoá.
  // Bỏ qua với role teacher (API trả 403) để không gọi thừa.
  useEffect(() => {
    if (isTeacher) return undefined;
    let active = true;
    (async () => {
      const summary = await getTuitionSummary({ year: 2026 }).catch(() => ({ by_class: [] }));
      if (!active) return;
      setTuitionMap(tuitionByNormCode(summary?.by_class || []));
    })();
    return () => { active = false; };
  }, [isTeacher]);

  // Group classes by program_name (null -> "Chưa phân loại")
  const programs = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const key = r.program_name || UNCLASSIFIED;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    return [...map.entries()]; // [ [name, classes[]], ... ]
  }, [rows]);

  // Default the active program to the first once data lands / changes.
  useEffect(() => {
    if (!programs.length) { setActiveProgram(""); return; }
    if (!programs.some(([name]) => name === activeProgram)) {
      setActiveProgram(programs[0][0]);
    }
  }, [programs, activeProgram]);

  const activeClasses = useMemo(() => {
    const found = programs.find(([name]) => name === activeProgram);
    return found ? found[1] : [];
  }, [programs, activeProgram]);

  const totalBuoi = parseTotalBuoi(activeProgram); // số buổi tổng theo chương trình (REAL từ tên) hoặc null

  // Nhiệm vụ của các lớp thuộc chương trình đang chọn (REAL).
  const programTasks = useMemo(() => {
    const ids = new Set(activeClasses.map((c) => String(c.id)));
    return tasks.filter((t) => ids.has(String(t.classroom)));
  }, [tasks, activeClasses]);

  // KPI: nhiệm vụ THÁNG đang mở (term==='month' & chưa hoàn thành).
  const openMonthTasks = useMemo(
    () => programTasks.filter((t) => t.term === "month" && t.status !== "done").length,
    [programTasks],
  );

  const submitTask = async (e) => {
    e.preventDefault();
    if (!taskForm.classroom || !taskForm.title.trim()) {
      setTaskError("Vui lòng chọn lớp và nhập đầu mục nhiệm vụ.");
      return;
    }
    setSavingTask(true);
    setTaskError("");
    const due = taskForm.due_date;
    try {
      await createClassTask({
        classroom: Number(taskForm.classroom),
        title: taskForm.title.trim(),
        term: taskForm.term,
        due_date: due || null,
        status: taskForm.status,
        assignee: taskForm.assignee,
        month: due ? Number(due.slice(5, 7)) : null,
        year: due ? Number(due.slice(0, 4)) : null,
      });
      setReloadKey((k) => k + 1);
      setTaskModal(false);
      setTaskForm(emptyTaskForm);
    } catch (err) {
      setTaskError("Không thể tạo nhiệm vụ. Vui lòng thử lại.");
    } finally {
      setSavingTask(false);
    }
  };

  // Grade distribution per class from raw scores (REAL). key = String(classroomId).
  const gradeByClass = useMemo(() => {
    const acc = {}; // `${classroom}:${student}` -> {sum,n}
    scores.forEach((r) => {
      if (r.classroom == null || r.student == null) return;
      const val = Number(r.numeric_score);
      if (!Number.isFinite(val)) return;
      const maxS = Number(r.assessment_max_score) || 100;
      if (maxS <= 0) return;
      const key = `${r.classroom}:${r.student}`;
      if (!acc[key]) acc[key] = { sum: 0, n: 0 };
      acc[key].sum += (val / maxS) * 100;
      acc[key].n += 1;
    });
    const byClass = {};
    Object.entries(acc).forEach(([key, { sum, n }]) => {
      const cls = key.split(":")[0];
      const band = bandFromPercent(sum / n);
      if (!byClass[cls]) byClass[cls] = { gioi: 0, kha: 0, tb: 0, graded: 0 };
      byClass[cls][band] += 1;
      byClass[cls].graded += 1;
    });
    return byClass;
  }, [scores]);

  // KPIs for the active program (REAL where noted).
  const kpis = useMemo(() => {
    const totalClasses = activeClasses.length;
    const totalStudents = activeClasses.reduce((s, c) => s + (Number(c.student_count) || 0), 0);
    let sessionsKnown = 0;
    let totalKnown = 0;
    let knownClasses = 0;
    activeClasses.forEach((c) => {
      const tb = parseTotalBuoi(c.program_name) ?? totalBuoi;
      if (tb) {
        sessionsKnown += Number(c.session_count) || 0;
        totalKnown += tb;
        knownClasses += 1;
      }
    });
    const sessionsAll = activeClasses.reduce((s, c) => s + (Number(c.session_count) || 0), 0);
    return { totalClasses, totalStudents, sessionsKnown, totalKnown, knownClasses, sessionsAll };
  }, [activeClasses, totalBuoi]);

  // Program grade rollup (REAL). Denominator = tổng sĩ số chương trình.
  const programGrade = useMemo(() => {
    let gioi = 0;
    let kha = 0;
    let tb = 0;
    let classesWithScores = 0;
    activeClasses.forEach((c) => {
      const g = gradeByClass[String(c.id)];
      if (g && g.graded > 0) {
        gioi += g.gioi;
        kha += g.kha;
        tb += g.tb;
        classesWithScores += 1;
      }
    });
    const graded = gioi + kha + tb;
    const ungraded = Math.max(0, kpis.totalStudents - graded);
    return { gioi, kha, tb, graded, ungraded, classesWithScores };
  }, [activeClasses, gradeByClass, kpis.totalStudents]);

  // Học phí thực của các lớp trong chương trình đang chọn (REAL). Chỉ cộng lớp khớp dữ liệu học phí.
  const programTuition = useMemo(() => {
    let paid = 0;
    let remaining = 0;
    let matched = 0;
    activeClasses.forEach((c) => {
      const t = tuitionMap.get(normCode(c.class_code));
      if (t) {
        paid += t.paid;
        remaining += t.remaining;
        matched += 1;
      }
    });
    return { paid, remaining, total: paid + remaining, matched };
  }, [activeClasses, tuitionMap]);

  const gradePctSub = pct(kpis.sessionsKnown, kpis.totalKnown);

  return (
    <div className="v4page">
      <div className="content-col">
        {/* 1. Header + breadcrumb */}
        <div className="page-head">
          <div className="crumb">
            <Link to="/students">Học sinh - Lớp học</Link> /{" "}
            <Link to="/chuong-trinh">Chi tiết theo chương trình</Link>
            {activeProgram ? <> / <span>{activeProgram}</span></> : null}
          </div>
          <h1>Chi tiết theo chương trình</h1>
          <p>Chọn một chương trình để xem danh sách lớp, sĩ số, tiến độ lộ trình và tình hình học phí. Nhấp vào một lớp để xem chi tiết lớp học.</p>
        </div>

        {loading ? (
          <div className="card">
            <div className="muted" style={{ padding: 24, textAlign: "center" }}>Đang tải...</div>
          </div>
        ) : !programs.length ? (
          <div className="card">
            <div className="muted" style={{ padding: 24, textAlign: "center" }}>Chưa có chương trình nào có lớp học trong tháng này.</div>
          </div>
        ) : (
          <>
            {/* 2. Program tabs */}
            <div className="tabs" role="tablist" style={{ flexWrap: "wrap", marginBottom: 16 }}>
              {programs.map(([name, list]) => (
                <span
                  key={name}
                  className={`tab${activeProgram === name ? " active" : ""}`}
                  role="tab"
                  tabIndex={0}
                  aria-selected={activeProgram === name}
                  onClick={() => setActiveProgram(name)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveProgram(name); }
                  }}
                >
                  {name} <span className="small" style={{ opacity: 0.75 }}>({list.length})</span>
                </span>
              ))}
            </div>

            {/* 3. KPI row for the active program */}
            <div className={`kpi-grid${isTeacher ? " cols-4" : ""}`}>
              <Kpi ico="🏫" icoClass="orange" label="Tổng số lớp" value={fmt(kpis.totalClasses)} sub={activeProgram} />
              <Kpi ico="👥" icoClass="blue" label="Tổng sĩ số" value={fmt(kpis.totalStudents)} sub="học sinh đang học" />
              <Kpi
                ico="📚"
                icoClass="purple"
                label="Số buổi đã học"
                value={kpis.totalKnown > 0 ? `${fmt(kpis.sessionsKnown)} / ${fmt(kpis.totalKnown)}` : "—"}
                sub={kpis.totalKnown > 0
                  ? `${gradePctSub}% lộ trình · ${fmt(kpis.knownClasses)}/${fmt(kpis.totalClasses)} lớp có tổng buổi`
                  : `Đã học ${fmt(kpis.sessionsAll)} buổi · chưa rõ tổng số buổi`}
              />
              {!isTeacher ? (
                <Kpi
                  ico="💰"
                  icoClass="green"
                  label="Học phí đã thu / còn tồn"
                  value={programTuition.matched > 0 ? vnd(programTuition.paid) : "—"}
                  sub={programTuition.matched > 0
                    ? `Còn tồn: ${vnd(programTuition.remaining)}`
                    : "Chưa có dữ liệu học phí"}
                />
              ) : null}
              <Kpi
                ico="📋"
                icoClass="yellow"
                label="Nhiệm vụ tháng đang mở"
                value={fmt(openMonthTasks)}
                sub="đầu mục cần hoàn thành"
              />
            </div>

            <div className="stack">
              {/* 4. Class list for the active program */}
              <div className="card">
                <div className="card-head">
                  <h3>Danh sách lớp học theo chương trình</h3>
                  <span className="small muted">{activeProgram} · {fmt(activeClasses.length)} lớp</span>
                </div>
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Tên lớp</th>
                        <th>Giáo viên</th>
                        <th className="t-center">Sĩ số</th>
                        <th className="t-center">Số buổi đã học/tổng</th>
                        {!isTeacher ? <th className="t-center">Tình trạng học phí</th> : null}
                        <th className="t-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeClasses.length ? activeClasses.map((cls) => {
                        const st = CLASS_STATUS[cls.status] || { label: cls.status || "—", cls: "gray" };
                        const teachers = Array.isArray(cls.teacher_names) && cls.teacher_names.length
                          ? cls.teacher_names.join(", ")
                          : "—";
                        const tb = parseTotalBuoi(cls.program_name) ?? totalBuoi;
                        const sess = Number(cls.session_count) || 0;
                        const tui = tuitionMap.get(normCode(cls.class_code));
                        const dm = deliveryById[String(cls.id)];
                        const openRow = () => navigate(`/classrooms/${cls.id}`, { state: { classroom: cls } });
                        return (
                          <tr
                            key={cls.id}
                            style={{ cursor: "pointer" }}
                            title="Xem chi tiết lớp học"
                            onClick={openRow}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openRow(); }
                            }}
                          >
                            <td className="bold">
                              {cls.class_code || cls.name || "—"}
                              {(cls.name && cls.class_code && cls.name !== cls.class_code) || dm ? (
                                <div className="small muted" style={{ fontWeight: 400 }}>
                                  {cls.name && cls.class_code && cls.name !== cls.class_code ? cls.name : null}
                                  {cls.name && cls.class_code && cls.name !== cls.class_code && dm ? " · " : null}
                                  {dm ? (DELIVERY[dm] || dm) : null}
                                </div>
                              ) : null}
                            </td>
                            <td className="muted">{teachers}</td>
                            <td className="t-center bold">{fmt(cls.student_count)}</td>
                            <td className="t-center">
                              {tb
                                ? `${fmt(sess)} / ${fmt(tb)}`
                                : <span className="muted">{fmt(sess)} / —</span>}
                            </td>
                            {!isTeacher ? (
                              <td className="t-center">
                                {tui
                                  ? (tui.remaining > 0
                                    ? <span className="badge orange">Còn thiếu · {vnd(tui.remaining)}</span>
                                    : <span className="badge green">Đã đủ</span>)
                                  : <span className="muted">—</span>}
                              </td>
                            ) : null}
                            <td className="t-center"><span className={`badge ${st.cls}`}>{st.label}</span></td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={isTeacher ? 5 : 6} className="muted" style={{ padding: 16, textAlign: "center" }}>
                            Chưa có lớp học cho chương trình này.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {!isTeacher ? (
                  <div className="small muted" style={{ marginTop: 8 }}>
                    Học phí năm 2026 (thực) · {fmt(programTuition.matched)}/{fmt(activeClasses.length)} lớp có dữ liệu học phí.
                  </div>
                ) : null}
              </div>

              {/* 5 + grade: A. Tiến độ lộ trình (REAL) | Phân bố xếp loại (REAL) */}
              <div className="grid c2">
                {/* 5. A. Tiến độ lớp học theo lộ trình — REAL (session_count / totalBuoi) */}
                <div className="card">
                  <div className="card-head">
                    <h3>A. Tiến độ lớp học theo lộ trình</h3>
                    <span className="small muted">buổi đã học / tổng số buổi</span>
                  </div>
                  {activeClasses.length ? activeClasses.map((cls) => {
                    const tb = parseTotalBuoi(cls.program_name) ?? totalBuoi;
                    const sess = Number(cls.session_count) || 0;
                    const p = tb ? Math.min(100, pct(sess, tb)) : 0;
                    const color = p >= 80 ? "#2E9E5B" : p >= 50 ? "#F26522" : "#C0392B";
                    return (
                      <div className="hbar-row" key={cls.id}>
                        <span className="hb-label" title={cls.name || cls.class_code}>{cls.class_code || cls.name}</span>
                        <span className="hb-bar"><i style={{ width: `${p}%`, background: color }} /></span>
                        <span className="hb-val">
                          {tb ? `${fmt(sess)}/${fmt(tb)} · ${p}%` : <span className="muted">— chưa rõ tổng buổi</span>}
                        </span>
                      </div>
                    );
                  }) : (
                    <div className="muted small" style={{ padding: 8 }}>Chưa có lớp học.</div>
                  )}
                  {!totalBuoi && !activeClasses.some((c) => parseTotalBuoi(c.program_name)) ? (
                    <div className="small muted" style={{ marginTop: 6 }}>
                      Tên chương trình không chứa số buổi (vd “TACB5”) nên chưa xác định được tổng số buổi.
                    </div>
                  ) : null}
                </div>

                {/* Phân bố xếp loại học tập — REAL from listStudentScores */}
                <div className="card">
                  <div className="card-head">
                    <h3>Phân bố xếp loại học tập</h3>
                    <span className="small muted">{fmt(programGrade.classesWithScores)}/{fmt(kpis.totalClasses)} lớp đã có điểm</span>
                  </div>
                  {programGrade.graded > 0 ? (
                    <>
                      {[["gioi", programGrade.gioi], ["kha", programGrade.kha], ["tb", programGrade.tb]].map(([band, count]) => {
                        const meta = GRADE_META[band];
                        const p = pct(count, programGrade.graded);
                        return (
                          <div className="hbar-row" key={band}>
                            <span className="hb-label">{meta.label}</span>
                            <span className="hb-bar"><i style={{ width: `${p}%`, background: meta.color }} /></span>
                            <span className="hb-val">{fmt(count)} ({p}%)</span>
                          </div>
                        );
                      })}
                      <div className="small muted" style={{ marginTop: 6 }}>
                        Đã chấm {fmt(programGrade.graded)}/{fmt(kpis.totalStudents)} học sinh
                        {programGrade.ungraded > 0 ? ` · ${fmt(programGrade.ungraded)} HS chưa có điểm` : ""}.
                      </div>
                    </>
                  ) : (
                    <div className="muted small" style={{ padding: 8 }}>
                      Các lớp trong chương trình này chưa có điểm nhập — chưa thể tính phân bố xếp loại.
                    </div>
                  )}
                </div>
              </div>

              {/* 6 + 8: B. Tình trạng học phí (REAL) | Tổng quan thời gian thực (DEMO) */}
              <div className={`grid${isTeacher ? "" : " c2"}`}>
                {/* 6. B. Tình trạng học phí — REAL donut (getTuitionSummary năm 2026).
                    Ẩn với role teacher: API học phí trả 403 cho giáo viên. */}
                {!isTeacher ? (
                <div className="card">
                  <div className="card-head">
                    <h3>B. Tình trạng học phí</h3>
                    <span className="small muted">{fmt(programTuition.matched)}/{fmt(activeClasses.length)} lớp có dữ liệu</span>
                  </div>
                  {programTuition.matched > 0 ? (
                    <div className="donut-wrap">
                      <Donut
                        total={programTuition.total}
                        centerTop={`${pct(programTuition.paid, programTuition.total)}%`}
                        centerBottom="đã thu"
                        segments={[
                          { value: programTuition.paid, color: "#2E9E5B" },
                          { value: programTuition.remaining, color: "#F26522" },
                        ]}
                      />
                      <div className="donut-legend">
                        <div className="dl"><i style={{ background: "#2E9E5B" }} /> Đã thu <b>{vnd(programTuition.paid)}</b></div>
                        <div className="dl"><i style={{ background: "#F26522" }} /> Còn tồn <b>{vnd(programTuition.remaining)}</b></div>
                        <div className="dl" style={{ borderTop: "1px solid var(--border)", paddingTop: 6 }}>
                          Tổng học phí <b>{vnd(programTuition.total)}</b>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="muted small" style={{ padding: 8 }}>
                      Các lớp trong chương trình này chưa có dữ liệu học phí năm 2026.
                    </div>
                  )}
                </div>
                ) : null}

                {/* 8. Tổng quan theo thời gian thực — DEMO stat rows */}
                <div className="card">
                  <div className="card-head">
                    <h3>Tổng quan theo thời gian thực</h3>
                    <span className="badge gray" style={{ fontSize: 9 }}>Demo</span>
                  </div>
                  {[
                    ["📈", "Tỷ lệ chuyên cần trung bình", "94,2%", "up"],
                    ["📝", "Tỷ lệ hoàn thành bài tập", "88,5%", "up"],
                    ["⚠️", "Học sinh cần chăm sóc", "6 học sinh", "down"],
                    ["🎯", "Lớp đạt tiến độ lộ trình", `${fmt(Math.round(kpis.totalClasses * 0.7))}/${fmt(kpis.totalClasses)} lớp`, "up"],
                  ].map(([ico, label, value]) => (
                    <div className="flex-between" key={label} style={{ padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                      <span className="small"><span style={{ marginRight: 8 }}>{ico}</span>{label}</span>
                      <span className="bold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7. Nhiệm vụ tháng & học kỳ — REAL từ /class-tasks/ */}
              <div className="card">
                <div className="card-head">
                  <h3>Nhiệm vụ tháng &amp; học kỳ</h3>
                  {canManage ? (
                    <button
                      type="button"
                      className="btn primary sm"
                      onClick={() => { setTaskForm(emptyTaskForm); setTaskError(""); setTaskModal(true); }}
                    >
                      + Thêm nhiệm vụ
                    </button>
                  ) : null}
                </div>
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Lớp</th>
                        <th>Đầu mục</th>
                        <th className="t-center">Kỳ</th>
                        <th className="t-center">Hạn nộp</th>
                        <th className="t-center">Trạng thái</th>
                        <th>Người phụ trách</th>
                      </tr>
                    </thead>
                    <tbody>
                      {programTasks.length ? programTasks.map((t) => {
                        const st = TASK_STATUS[t.status] || { label: t.status || "—", cls: "gray" };
                        return (
                          <tr key={t.id}>
                            <td className="bold">{t.classroom_name || t.class_code || "—"}</td>
                            <td>{t.title}</td>
                            <td className="t-center">{t.term === "semester" ? "Học kỳ" : "Tháng"}</td>
                            <td className="t-center muted">{t.due_date || "—"}</td>
                            <td className="t-center"><span className={`badge ${st.cls}`}>{st.label}</span></td>
                            <td className="muted">{t.assignee || "—"}</td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={6} className="muted" style={{ padding: 16, textAlign: "center" }}>
                            Chưa có nhiệm vụ cho chương trình này.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal: thêm nhiệm vụ tháng / học kỳ */}
      {taskModal ? (
        <Modal title="Thêm nhiệm vụ" onClose={() => setTaskModal(false)} width={560}>
          <form onSubmit={submitTask}>
            <div className="grid c2">
              <label><span className="field-label">Lớp *</span>
                <select value={taskForm.classroom} onChange={(e) => setTaskForm({ ...taskForm, classroom: e.target.value })}>
                  <option value="">-- Chọn lớp --</option>
                  {activeClasses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name || c.class_code}</option>
                  ))}
                </select>
              </label>
              <label><span className="field-label">Đầu mục *</span>
                <input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Chấm điểm giữa kỳ" />
              </label>
              <label><span className="field-label">Kỳ</span>
                <select value={taskForm.term} onChange={(e) => setTaskForm({ ...taskForm, term: e.target.value })}>
                  <option value="month">Tháng</option>
                  <option value="semester">Học kỳ</option>
                </select>
              </label>
              <label><span className="field-label">Hạn nộp</span>
                <input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
              </label>
              <label><span className="field-label">Trạng thái</span>
                <select value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}>
                  {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </label>
              <label><span className="field-label">Người phụ trách</span>
                <input value={taskForm.assignee} onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })} placeholder="GV chủ nhiệm" />
              </label>
            </div>
            {taskError ? <div className="alert red" style={{ marginTop: 10 }}>{taskError}</div> : null}
            <div className="flex mt16" style={{ justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className="btn ghost" onClick={() => setTaskModal(false)}>Huỷ</button>
              <button type="submit" className="btn primary" disabled={savingTask}>{savingTask ? "Đang lưu..." : "Lưu nhiệm vụ"}</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
