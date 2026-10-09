import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  listClassesOverview,
  normalizePrograms,
  listClassroomsAll,
  listStudentScores,
  listClassTasks,
  createClassTask,
  layTongQuanLop,
} from "../services/calendarService";
import { nhomChuongTrinh } from "../utils/thuTuLop";
import "../styles/vista4.css";

const fmt = (n) => (Number(n) || 0).toLocaleString("vi-VN");
const vnd = (n) => `${fmt(Math.round(Number(n) || 0))} đ`;
// Số tiền gọn cho ô KPI: 19.470.000 -> "19,5 tr".
const gon = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e9) return `${String(Math.round(v / 1e8) / 10).replace(".", ",")} tỷ`;
  if (Math.abs(v) >= 1e6) return `${String(Math.round(v / 1e5) / 10).replace(".", ",")} tr`;
  return fmt(v);
};
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

// Số buổi của khoá. Ưu tiên ô total_sessions của lớp; chỉ khi lớp chưa có mới
// bới ra từ tên chương trình như trước ("60 BUỔI STARTER" -> 60), để những lớp
// chưa chuẩn hoá vẫn chạy đúng.
const parseTotalBuoi = (nguon) => {
  if (nguon && typeof nguon === "object") {
    if (nguon.total_sessions) return Number(nguon.total_sessions);
    const m = /(\d+)\s*BUỔI/i.exec(nguon.program_name || "");
    return m ? Number(m[1]) : null;
  }
  const m = /(\d+)\s*BUỔI/i.exec(nguon || "");
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
  // Gộp chương trình trùng nghĩa ngay tại màn. Trước đây chỉ chạy được bằng
  // lệnh trên máy chủ nên người dùng không có cách nào tự làm.
  const [xemTruocGop, setXemTruocGop] = useState(null);
  const [dangGop, setDangGop] = useState(false);
  const [loiGop, setLoiGop] = useState("");
  // Khoá nạp lại DANH SÁCH LỚP. reloadKey sẵn có chỉ nạp lại nhiệm vụ tháng,
  // gộp chương trình xong mà không có khoá này thì các tab vẫn y nguyên.
  const [taiLaiLop, setTaiLaiLop] = useState(0);

  // Tổng quan lớp (buổi đã dạy thực tế, chuyên cần, học phí phải thu) — classrooms/tong_quan.py.
  const [tqLop, setTqLop] = useState({});

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
      const [overview, classAll, rawScores, tq] = await Promise.all([
        listClassesOverview({ month, year }).catch(() => ({ results: [] })),
        listClassroomsAll().catch(() => []),
        listStudentScores({ page_size: 100 }).catch(() => ({ results: [] })),
        layTongQuanLop({ month, year }).catch(() => null),
      ]);
      if (!active) return;
      setTqLop(Object.fromEntries((tq?.lop || []).map((l) => [String(l.id), l])));
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
  }, [month, year, taiLaiLop]);

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

  // Group classes by program_name (null -> "Chưa phân loại")
  const programs = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const key = r.program_name || UNCLASSIFIED;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    // Thứ tự chủ trung tâm chốt: Kid → TACB → Cambridge → IELTS.
    const hang = { kid: 1, tacb: 2, cam: 3, ielts: 4 };
    return [...map.entries()].sort(([a], [b]) => (
      (hang[nhomChuongTrinh(a)] || 9) - (hang[nhomChuongTrinh(b)] || 9) || a.localeCompare(b, "vi")
    )); // [ [name, classes[]], ... ]
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
    // Buổi đã dạy THỰC TẾ theo lịch báo giảng (classrooms/tong_quan.py).
    const daDay = (c) => (tqLop[String(c.id)] ? tqLop[String(c.id)].buoi_da_hoc : Number(c.session_count) || 0);
    activeClasses.forEach((c) => {
      const tb = tqLop[String(c.id)]?.tong_buoi ?? parseTotalBuoi(c) ?? totalBuoi;
      if (tb) {
        sessionsKnown += Math.min(daDay(c), tb);
        totalKnown += tb;
        knownClasses += 1;
      }
    });
    const sessionsAll = activeClasses.reduce((s, c) => s + daDay(c), 0);
    return { totalClasses, totalStudents, sessionsKnown, totalKnown, knownClasses, sessionsAll };
  }, [activeClasses, totalBuoi, tqLop]);

  const gradePctSub = pct(kpis.sessionsKnown, kpis.totalKnown);

  // Số liệu thời gian thực của chương trình đang chọn (thay bảng demo cũ).
  const thucTe = useMemo(() => {
    const ds = activeClasses.map((c) => tqLop[String(c.id)]).filter(Boolean);
    let ccSum = 0;
    let ccN = 0;
    ds.forEach((l) => { if (l.chuyen_can != null) { ccSum += l.chuyen_can * (l.so_ca_chuyen_can || 1); ccN += l.so_ca_chuyen_can || 1; } });
    const coTong = ds.filter((l) => l.tong_buoi);
    return {
      chuyenCan: ccN ? Math.round((ccSum / ccN) * 10) / 10 : null,
      lopDuoi90: ds.filter((l) => l.chuyen_can != null && l.chuyen_can < 90),
      coTong: coTong.length,
      dangChay: coTong.filter((l) => l.buoi_da_hoc > 0).length,
      no: ds.reduce((a, l) => a + (l.hoc_phi_phai_thu || 0), 0),
      lopNo: ds.filter((l) => l.hoc_phi_phai_thu > 0),
      chuaCoDiem: activeClasses.filter((c) => !gradeByClass[String(c.id)]?.graded).length,
    };
  }, [activeClasses, tqLop, gradeByClass]);
  const canTheoDoi = useMemo(() => activeClasses.map((c) => {
    const l = tqLop[String(c.id)];
    const ly = [
      l?.chuyen_can != null && l.chuyen_can < 90 ? `Chuyên cần ${l.chuyen_can}%` : "",
      l?.hoc_phi_phai_thu > 0 && !isTeacher ? `Nợ HP ${vnd(l.hoc_phi_phai_thu)}` : "",
      !gradeByClass[String(c.id)]?.graded ? "Chưa có điểm" : "",
    ].filter(Boolean);
    return { cls: c, ly };
  }).filter((x) => x.ly.length), [activeClasses, tqLop, gradeByClass, isTeacher]);

  return (
    <div className="v4page">
      <div className="content" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
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
          {programs.length > 6 ? (
            <button
              type="button"
              className="btn ghost sm"
              style={{ marginTop: 10 }}
              disabled={dangGop}
              onClick={async () => {
                setLoiGop("");
                setDangGop(true);
                try {
                  setXemTruocGop(await normalizePrograms({ apply: false }));
                } catch (e) {
                  setLoiGop(e?.response?.data?.detail || "Không xem trước được.");
                } finally {
                  setDangGop(false);
                }
              }}
            >
              {dangGop ? "Đang kiểm tra..." : `Gộp chương trình trùng nghĩa (${programs.length} nhóm)`}
            </button>
          ) : null}
          {loiGop ? (
            <div className="alert red" style={{ marginTop: 10 }}><span>⚠️</span><div>{loiGop}</div></div>
          ) : null}
        </div>

        {xemTruocGop ? (
          <div className="card" style={{ marginBottom: 16, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>
              {xemTruocGop.applied ? "Đã gộp xong" : "Xem trước — chưa ghi gì"}
            </h3>
            {xemTruocGop.changed_count ? (
              <>
                <p className="small muted" style={{ lineHeight: 1.6 }}>
                  {xemTruocGop.changed_count} lớp sẽ đổi. Tên chương trình đang gộp lẫn
                  cả gói số buổi và cấp độ nên cùng một chương trình bị tách thành nhiều
                  nhóm — gộp lại sẽ tách ra ba ô riêng.
                </p>
                <div style={{ maxHeight: 260, overflow: "auto", marginBottom: 12 }}>
                  <table className="tbl" style={{ width: "100%" }}>
                    <thead>
                      <tr><th>Lớp</th><th>Tên cũ</th><th>Chương trình</th><th>Cấp độ</th><th>Số buổi</th></tr>
                    </thead>
                    <tbody>
                      {xemTruocGop.changed.map((r) => (
                        <tr key={r.lop}>
                          <td>{r.lop}</td><td>{r.cu || "—"}</td>
                          <td><strong>{r.chuong_trinh}</strong></td>
                          <td>{r.cap_do || "—"}</td><td>{r.so_buoi || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="small muted">Không có lớp nào cần gộp.</p>
            )}
            {xemTruocGop.unrecognized?.length ? (
              <p className="small muted">
                Không nhận ra, giữ nguyên để bạn đặt tay:{" "}
                <strong>{xemTruocGop.unrecognized.join(", ")}</strong>
              </p>
            ) : null}
            {xemTruocGop.no_program?.length ? (
              <p className="small muted">
                Chưa có chương trình:{" "}
                <strong>{xemTruocGop.no_program.join(", ")}</strong> — điền bằng file
                nhập lớp ở màn Quản lý lớp.
              </p>
            ) : null}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" className="btn ghost" onClick={() => setXemTruocGop(null)}>
                Đóng
              </button>
              {!xemTruocGop.applied && xemTruocGop.changed_count ? (
                <button
                  type="button"
                  className="btn primary"
                  disabled={dangGop}
                  onClick={async () => {
                    setDangGop(true);
                    try {
                      setXemTruocGop(await normalizePrograms({ apply: true }));
                      setTaiLaiLop((k) => k + 1);
                    } catch (e) {
                      setLoiGop(e?.response?.data?.detail || "Không gộp được.");
                    } finally {
                      setDangGop(false);
                    }
                  }}
                >
                  {dangGop ? "Đang gộp..." : "Gộp ngay"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

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
            {/* Lưới tự giãn: cột phải (nhiệm vụ / lớp cần theo dõi) chiếm chỗ nên 6 cột
                cố định ép mỗi ô còn ~90px, chữ bẻ dọc từng từ (09/10/2026). */}
            <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
              <Kpi ico="🏫" icoClass="orange" label="Tổng số lớp" value={fmt(kpis.totalClasses)} sub={activeProgram} />
              <Kpi ico="👥" icoClass="blue" label="Tổng sĩ số" value={fmt(kpis.totalStudents)} sub="học sinh đang học" />
              <Kpi
                ico="📚"
                icoClass="purple"
                label="Số buổi đã học"
                value={kpis.totalKnown > 0 ? <span style={{ whiteSpace: "nowrap" }}>{fmt(kpis.sessionsKnown)}/{fmt(kpis.totalKnown)}</span> : "—"}
                sub={kpis.totalKnown > 0
                  ? `${gradePctSub}% lộ trình · ${fmt(kpis.knownClasses)}/${fmt(kpis.totalClasses)} lớp có tổng buổi`
                  : `Đã học ${fmt(kpis.sessionsAll)} buổi · chưa rõ tổng số buổi`}
              />
              {!isTeacher ? (
                <Kpi
                  ico="💰"
                  icoClass="green"
                  label="Học phí phải thu"
                  value={gon(thucTe.no)}
                  sub={`${fmt(thucTe.lopNo.length)}/${fmt(activeClasses.length)} lớp còn nợ`}
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
                        <th className="t-center">Số buổi đã dạy/tổng</th>
                        <th className="t-center">Chuyên cần T{month}</th>
                        {!isTeacher ? <th className="t-center">Học phí phải thu</th> : null}
                        <th className="t-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeClasses.length ? activeClasses.map((cls) => {
                        const st = CLASS_STATUS[cls.status] || { label: cls.status || "—", cls: "gray" };
                        const teachers = Array.isArray(cls.teacher_names) && cls.teacher_names.length
                          ? cls.teacher_names.join(", ")
                          : "—";
                        const tq = tqLop[String(cls.id)];
                        // Lộ trình theo buổi đã dạy THỰC TẾ trên lịch báo giảng (toàn khoá),
                        // không phải số ca của riêng tháng này.
                        const tb = tq?.tong_buoi ?? parseTotalBuoi(cls) ?? totalBuoi;
                        const sess = tq ? tq.buoi_da_hoc : Number(cls.session_count) || 0;
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
                            <td className="t-center">
                              {tq?.chuyen_can != null
                                ? <span className={`badge ${tq.chuyen_can >= 90 ? "green" : "orange"}`}>{String(tq.chuyen_can).replace(".", ",")}%</span>
                                : <span className="muted">—</span>}
                            </td>
                            {!isTeacher ? (
                              <td className="t-center">
                                {tq?.hoc_phi_phai_thu > 0
                                  ? <span className="badge orange">{vnd(tq.hoc_phi_phai_thu)}</span>
                                  : <span className="badge green">Không nợ</span>}
                              </td>
                            ) : null}
                            <td className="t-center"><span className={`badge ${st.cls}`}>{st.label}</span></td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={isTeacher ? 6 : 7} className="muted" style={{ padding: 16, textAlign: "center" }}>
                            Chưa có lớp học cho chương trình này.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 6 + 8: B. Tình trạng học phí (REAL) | Tổng quan thời gian thực (DEMO) */}
              <div>
                {/* Tổng quan theo thời gian thực — đóng mở (08/10/2026), số thật. */}
                <details className="card fold" open>
                  <summary><h3>Tổng quan theo thời gian thực</h3><span className="small muted">{activeProgram} · tháng {month}/{year}</span></summary>
                  {[
                    ["✅", "Chuyên cần trung bình", thucTe.chuyenCan != null ? `${String(thucTe.chuyenCan).replace(".", ",")}%` : "—"],
                    ["⚠️", "Lớp chuyên cần dưới 90%", `${fmt(thucTe.lopDuoi90.length)} lớp`],
                    ["🎯", "Lớp đang chạy lộ trình", `${fmt(thucTe.dangChay)}/${fmt(thucTe.coTong)} lớp có tổng buổi`],
                    ["📝", "Lớp chưa có điểm đánh giá", `${fmt(thucTe.chuaCoDiem)}/${fmt(kpis.totalClasses)} lớp`],
                    ...(!isTeacher ? [["💰", "Học phí phải thu", `${vnd(thucTe.no)} · ${fmt(thucTe.lopNo.length)} lớp`]] : []),
                  ].map(([ico, label, value]) => (
                    <div className="flex-between" key={label} style={{ padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                      <span className="small"><span style={{ marginRight: 8 }}>{ico}</span>{label}</span>
                      <span className="bold">{value}</span>
                    </div>
                  ))}
                </details>
              </div>

            </div>
          </>
        )}
      </div>

        {/* Cột phải: nhiệm vụ + lớp cần theo dõi của chương trình đang chọn. */}
        <div className="rightbar">
          <div className="card">
            <div className="card-head">
              <h3>Nhiệm vụ tháng &amp; học kỳ</h3>
              {canManage ? (
                <button type="button" className="btn primary sm"
                  onClick={() => { setTaskForm(emptyTaskForm); setTaskError(""); setTaskModal(true); }}>
                  + Thêm
                </button>
              ) : null}
            </div>
            <div className="list">
              {programTasks.length ? programTasks.map((t) => {
                const st = TASK_STATUS[t.status] || { label: t.status || "—", cls: "gray" };
                return (
                  <div className="li" key={t.id}>
                    <div className="ico-sm" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>📋</div>
                    <div className="li-body">
                      <div className="li-title" style={{ fontSize: 12.5 }}>{t.title}</div>
                      <div className="li-sub">
                        {t.classroom_name || t.class_code || "—"} · {t.term === "semester" ? "Học kỳ" : "Tháng"}
                        {t.due_date ? ` · hạn ${t.due_date}` : ""}{t.assignee ? ` · ${t.assignee}` : ""}
                      </div>
                    </div>
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                  </div>
                );
              }) : <div className="small muted">Chưa có nhiệm vụ cho chương trình này.</div>}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3>Lớp cần theo dõi</h3><span className="small muted">{canTheoDoi.length} lớp</span></div>
            <div className="list">
              {canTheoDoi.length ? canTheoDoi.map(({ cls, ly }) => (
                <div className="li" key={cls.id} style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/classrooms/${cls.id}`, { state: { classroom: cls } })}>
                  <div className="ico-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>⚠️</div>
                  <div className="li-body"><div className="li-title" style={{ fontSize: 12.5 }}>{cls.class_code || cls.name}</div><div className="li-sub">{ly.join(" · ")}</div></div>
                </div>
              )) : <div className="small muted">Không có lớp nào cần chú ý.</div>}
            </div>
          </div>
        </div>
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
