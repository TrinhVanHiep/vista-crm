import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listStudents,
  listCentersAll,
  listClassroomsAll,
  listClassroomsByCenter,
  listClassesOverview,
  listMonthlyScorecards,
  listStudentScores,
  listEvaluationItems,
  listAttendanceSummary,
  createStudent,
  importStudentsFile,
  importRosterFile,
  exportStudentsFile,
} from "../services/calendarService";
import { skillsFor } from "../utils/skills";
import "../styles/vista4.css";

const PAGE_SIZE = 12;
const fmt = (n) => (Number(n) || 0).toLocaleString("vi-VN");
const pct1 = (part, total) => (total ? Math.round((part / total) * 1000) / 10 : 0);
const vnPct = (v) => String(v).replace(".", ",");
const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
// Tổng số buổi của chương trình suy từ tên, vd "60 BUỔI STARTER" -> 60.
const buoiOf = (p) => { const m = /(\d+)\s*BUỔI/i.exec(p || ""); return m ? Number(m[1]) : null; };

const DELIVERY = { online: "Online", offline: "Trực tiếp", hybrid: "Kết hợp" };
const STUDENT_STATUS = {
  active: { label: "Đang học", cls: "green" },
  paused: { label: "Tạm nghỉ", cls: "orange" },
  graduated: { label: "Tốt nghiệp", cls: "blue" },
  withdrawn: { label: "Đã nghỉ", cls: "red" },
};
const CLASS_STATUS = {
  active: { label: "Đang hoạt động", cls: "green" },
  paused: { label: "Tạm dừng", cls: "orange" },
  draft: { label: "Nháp", cls: "gray" },
  completed: { label: "Hoàn thành", cls: "blue" },
  closed: { label: "Đã đóng", cls: "red" },
};
const PROGRAM_COLORS = ["#F26522", "#C0392B", "#2E9E5B", "#3B82F6", "#8B5CF6", "#D9822B"];

// Xếp loại 3 nhóm (backend chỉ có thang 5 bậc Xuất sắc/Tốt/Khá/Đạt/Cần hỗ trợ nên
// gộp lại: Xuất sắc+Tốt -> Giỏi, Khá -> Khá, còn lại -> Trung bình).
const GRADE_COLOR = { gioi: "#2E9E5B", kha: "#3B82F6", tb: "#D9822B" };
const bandFromLabel = (label) => {
  const s = (label || "").toString().trim().toLowerCase();
  if (!s) return null;
  if (s.includes("xuất sắc") || s.includes("tốt") || s.includes("giỏi")) return "gioi";
  if (s.includes("khá")) return "kha";
  return "tb"; // đạt / cần hỗ trợ / theo sát / cần củng cố...
};
const bandFromPercent = (p) => (p == null ? null : p >= 80 ? "gioi" : p >= 65 ? "kha" : "tb");

// ---- Demo data for the analytics sections that have no backend source yet ----
const PROGRESS_TOP5 = [["FP3-A1", 85, "Sắp cuối lộ trình"], ["Cambridge KET 01", 72, "Đang học"], ["GS Starter 02", 68, "Sắp kiểm tra giữa kỳ"], ["IELTS 4.0 Pre 01", 66, "Đang học"], ["FP2-B3", 62, "Đang học"]];
const ACTIVITIES = [
  ["10/05/2025", "Kiểm tra giữa kỳ", "Finger Print + Phonics (12 lớp)", "Hoàn thành", "green"],
  ["17/05/2025", "Cambridge Progress Test", "KET & PET (6 lớp)", "Hoàn thành", "green"],
  ["24/05/2025", "IELTS 4.0 Mock Test", "Pre 01, Pre 02 (2 lớp)", "Sắp diễn ra", "orange"],
  ["31/05/2025", "Global Success Speaking Day", "Starter, Movers (8 lớp)", "Sắp diễn ra", "orange"],
];
const HONORS = [
  ["Khánh An", "FP3-A1 · Finger Print + Phonics", "🥇 Chuyên cần 100% · Tiến bộ vượt bậc", "#E0538D"],
  ["Minh Khoa", "KET 01 · Cambridge", "🏅 Điểm TB 91/100 · Tư duy phản biện tốt", "#0E9F8F"],
  ["Khả Hân", "IELTS 4.0 Pre 01 · Global Success", "⭐ Kỹ năng Speaking xuất sắc", "#7C5CFA"],
];
const REMINDERS = [
  ["📋", "Điểm danh lớp sáng nay", "12 lớp chưa chấm điểm danh"],
  ["📝", "Kiểm tra bài tập về nhà", "23 lớp đang chờ đánh giá"],
  ["📅", "Lịch kiểm tra giữa kỳ", "08 lớp trong tuần tới"],
  ["🎓", "Xét học sinh tốt nghiệp", "05 lớp cuối lộ trình"],
];
const WATCH_CLASSES = [["FP1-C2 · Chuyên cần thấp", "82%", "red"], ["GS Movers 03 · Chuyên cần thấp", "61%", "red"], ["Cambridge PET 02 · Tiến độ chậm", "78%", "orange"], ["IELTS 4.0 Pre 02 · Tiến độ chậm", "70%", "orange"]];

function Kpi({ ico, icoClass, label, value, trend, demo }) {
  return (
    <div className="kpi">
      <div className={`ico ${icoClass}`} style={{ fontSize: 18 }}>{ico}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="kpi-label">
          {label}
          {demo ? <span className="badge gray" style={{ marginLeft: 6, padding: "1px 7px", fontSize: 9 }}>Demo</span> : null}
        </div>
        <div className="kpi-value">{value}</div>
        {trend ? <span className="trend up">▲ {trend}</span> : null}
      </div>
    </div>
  );
}

function GenderDonut({ male, female, total }) {
  const t = total || male + female || 1;
  const size = 108, thick = 17, r = (size - thick) / 2, c = size / 2, circ = 2 * Math.PI * r;
  const maleDash = (male / t) * circ;
  const femaleDash = (female / t) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="#EFE7DB" strokeWidth={thick} />
      {female > 0 && (
        <circle cx={c} cy={c} r={r} fill="none" stroke="#C0392B" strokeWidth={thick}
          strokeDasharray={`${femaleDash} ${circ - femaleDash}`} strokeDashoffset={-maleDash}
          transform={`rotate(-90 ${c} ${c})`} />
      )}
      {male > 0 && (
        <circle cx={c} cy={c} r={r} fill="none" stroke="#F26522" strokeWidth={thick}
          strokeDasharray={`${maleDash} ${circ - maleDash}`} transform={`rotate(-90 ${c} ${c})`} />
      )}
      <text x={c} y={c - 1} textAnchor="middle" fontSize="19" fontWeight="800" fill="#43301F">{fmt(t)}</text>
      <text x={c} y={c + 15} textAnchor="middle" fontSize="10" fill="#8a7a66">học sinh</text>
    </svg>
  );
}

function Modal({ title, onClose, children, width = 620 }) {
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

// Nhận xét + trạng thái theo dõi suy TỪ phân bố điểm THẬT của lớp.
const classReview = (g) => {
  if (!g || !g.graded) return { note: "Chưa có điểm đánh giá", status: { label: "Chưa đánh giá", cls: "gray" } };
  const good = g.gioi + g.kha; // đạt Khá trở lên
  const ratio = good / g.graded;
  if (ratio >= 0.8) return { note: `${good}/${g.graded} HS đạt Khá–Giỏi`, status: { label: "Tốt", cls: "green" } };
  if (ratio >= 0.5) return { note: `${good}/${g.graded} HS đạt Khá–Giỏi`, status: { label: "Ổn định", cls: "blue" } };
  return { note: `${g.tb}/${g.graded} HS ở mức Trung bình`, status: { label: "Cần theo dõi", cls: "orange" } };
};

// Ô hiển thị 1 nhóm điểm: số HS đạt loại + tỉ lệ trên tổng sĩ số lớp.
function GradeCell({ count, size, band }) {
  if (count == null) return <td className="t-center muted">—</td>;
  return (
    <td className="t-center">
      <b style={{ color: GRADE_COLOR[band] }}>{count}</b>
      <span className="small muted"> ({size ? Math.round((count / size) * 100) : 0}%)</span>
    </td>
  );
}

const emptyForm = {
  student_code: "", first_name: "", last_name: "", email: "", phone_number: "",
  gender: "", date_of_birth: "", current_status: "active", parent_name: "", parent_phone: "",
};

function Students() {
  const role = (() => {
    try {
      const r = JSON.parse(localStorage.getItem("vista_user") || "{}").role;
      return (typeof r === "string" ? r : r?.name) || "";
    } catch (error) {
      return "";
    }
  })();
  const canManage = ["superadmin", "admin"].includes(role);
  const navigate = useNavigate();

  // Aggregates / overview
  const [totalStudents, setTotalStudents] = useState(0);
  const [genderCounts, setGenderCounts] = useState({ male: 0, female: 0 });
  const [classes, setClasses] = useState([]);
  const [overview, setOverview] = useState([]);
  const [centers, setCenters] = useState([]);
  const [scorecards, setScorecards] = useState([]);
  const [scores, setScores] = useState([]);
  const [evalItems, setEvalItems] = useState([]);
  const [attendance, setAttendance] = useState([]); // [{classroom_id, classroom_name, program_name, rate, ...}]
  const [attendanceOverall, setAttendanceOverall] = useState(null); // overall_rate (0-100) hoặc null
  const [aggLoading, setAggLoading] = useState(true);

  // Section 6 filters
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterCenter, setFilterCenter] = useState("");
  const [classPage, setClassPage] = useState(1);

  // Modals / actions
  const [modal, setModal] = useState(null); // 'create' | 'import'
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [exporting, setExporting] = useState(false);

  // Create form
  const [form, setForm] = useState(emptyForm);
  const [createCenter, setCreateCenter] = useState("");
  const [createClassroom, setCreateClassroom] = useState("");
  const [createClassrooms, setCreateClassrooms] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Import (danh sách học viên phẳng)
  const importFileRef = useRef(null);
  const [importCenter, setImportCenter] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Import bảng danh sách lớp + học sinh (file nhiều sheet)
  const rosterFileRef = useRef(null);
  const [rosterCenter, setRosterCenter] = useState("");
  const [rosterReplace, setRosterReplace] = useState(false);
  const [rosterImporting, setRosterImporting] = useState(false);
  const [rosterResult, setRosterResult] = useState(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset paging when filters change
  useEffect(() => { setClassPage(1); }, [search, filterCenter]);

  // Aggregates: total, gender, classrooms, per-class overview, centers, scorecards, scores
  useEffect(() => {
    let active = true;
    setAggLoading(true);
    (async () => {
      try {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const [all, male, female, classAll, ovw, ctrs, cards, rawScores, evItems, attend] = await Promise.all([
          listStudents({ page_size: 1 }),
          listStudents({ gender: "male", page_size: 1 }).catch(() => ({ count: 0 })),
          listStudents({ gender: "female", page_size: 1 }).catch(() => ({ count: 0 })),
          listClassroomsAll().catch(() => []),
          listClassesOverview({ month, year }).catch(() => ({ results: [] })),
          listCentersAll().catch(() => []),
          listMonthlyScorecards({ month, year, page_size: 100 }).catch(() => ({ results: [] })),
          listStudentScores({ page_size: 100 }).catch(() => ({ results: [] })),
          listEvaluationItems().catch(() => []),
          listAttendanceSummary().catch(() => ({ results: [], overall_rate: null })),
        ]);
        if (!active) return;
        setTotalStudents(all.count || 0);
        setGenderCounts({ male: male.count || 0, female: female.count || 0 });
        setClasses(Array.isArray(classAll) ? classAll : []);
        setOverview(Array.isArray(ovw?.results) ? ovw.results : []);
        setCenters(Array.isArray(ctrs) ? ctrs : []);
        setScorecards(Array.isArray(cards?.results) ? cards.results : []);
        setScores(Array.isArray(rawScores?.results) ? rawScores.results : []);
        setEvalItems(Array.isArray(evItems) ? evItems : []);
        setAttendance(Array.isArray(attend?.results) ? attend.results : []);
        setAttendanceOverall(attend?.overall_rate ?? null);
      } catch (error) {
        if (active) { setClasses([]); setOverview([]); setCenters([]); setScorecards([]); setScores([]); setEvalItems([]); setAttendance([]); setAttendanceOverall(null); }
      } finally {
        if (active) setAggLoading(false);
      }
    })();
    return () => { active = false; };
  }, [reloadKey]);

  // Chỉ có 1 trung tâm -> mặc định chọn sẵn để khỏi phải chọn khi nhập/thêm.
  useEffect(() => {
    if (centers.length === 1) {
      const id = String(centers[0].id);
      setRosterCenter((v) => v || id);
      setImportCenter((v) => v || id);
      setCreateCenter((v) => v || id);
    }
  }, [centers]);

  // Create form center → classroom cascade
  useEffect(() => {
    let active = true;
    setCreateClassroom("");
    if (!createCenter) { setCreateClassrooms([]); return undefined; }
    listClassroomsByCenter(createCenter)
      .then((rows) => { if (active) setCreateClassrooms(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (active) setCreateClassrooms([]); });
    return () => { active = false; };
  }, [createCenter]);

  // Derived aggregates
  const activeClasses = useMemo(() => classes.filter((c) => c.status === "active").length, [classes]);
  const countById = useMemo(() => {
    const m = {};
    overview.forEach((o) => { m[o.id] = o.student_count; });
    return m;
  }, [overview]);
  const programAgg = useMemo(() => {
    const map = new Map();
    overview.forEach((o) => {
      const key = o.program_name || "Chưa phân loại";
      map.set(key, (map.get(key) || 0) + (o.student_count || 0));
    });
    const rows = [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    const sum = rows.reduce((s, r) => s + r.count, 0) || 1;
    const max = rows[0]?.count || 1;
    return { rows: rows.slice(0, 5), sum, max };
  }, [overview]);

  // Tiến độ buổi học THẬT theo chương trình = tổng buổi đã học / tổng buổi kế hoạch
  // (số buổi kế hoạch suy từ tên chương trình "N BUỔI...").
  const progressByProgram = useMemo(() => {
    const map = new Map();
    overview.forEach((o) => {
      const key = o.program_name || "Chưa phân loại";
      const total = buoiOf(o.program_name);
      const e = map.get(key) || { classes: 0, done: 0, total: 0 };
      e.classes += 1;
      if (total) { e.done += (o.session_count || 0); e.total += total; }
      map.set(key, e);
    });
    return [...map.entries()]
      .map(([name, e]) => ({ name, classes: e.classes, pct: e.total ? Math.min(100, Math.round((e.done / e.total) * 100)) : null }))
      .sort((a, b) => b.classes - a.classes)
      .slice(0, 6);
  }, [overview]);

  // Phân bố xếp loại Giỏi/Khá/TB theo lớp — ưu tiên bảng điểm tháng, fallback điểm thô.
  const gradeByClass = useMemo(() => {
    const studentGrade = {}; // `${classId}:${studentId}` -> band
    scorecards.forEach((sc) => {
      if (sc.classroom == null || sc.student == null) return;
      const band = bandFromLabel(sc.grade_label) || bandFromPercent(toNum(sc.total_percent));
      if (band) studentGrade[`${sc.classroom}:${sc.student}`] = band;
    });
    const acc = {}; // key -> {sum,n} percent trung bình các bài của HS trong lớp
    scores.forEach((r) => {
      if (r.classroom == null || r.student == null) return;
      const val = toNum(r.numeric_score);
      if (val == null) return;
      const maxS = toNum(r.assessment_max_score) || 100;
      if (maxS <= 0) return;
      const key = `${r.classroom}:${r.student}`;
      if (!acc[key]) acc[key] = { sum: 0, n: 0 };
      acc[key].sum += (val / maxS) * 100;
      acc[key].n += 1;
    });
    Object.entries(acc).forEach(([key, { sum, n }]) => {
      if (!studentGrade[key]) { const band = bandFromPercent(sum / n); if (band) studentGrade[key] = band; }
    });
    const byClass = {};
    Object.entries(studentGrade).forEach(([key, band]) => {
      const cls = key.split(":")[0];
      if (!byClass[cls]) byClass[cls] = { gioi: 0, kha: 0, tb: 0, graded: 0 };
      byClass[cls][band] += 1;
      byClass[cls].graded += 1;
    });
    return byClass;
  }, [scorecards, scores]);
  const hasGradeData = Object.keys(gradeByClass).length > 0;

  // Chuyên cần THẬT (chỉ vài lớp có dữ liệu) — tổng hợp từ /attendance-summary/.
  const hasAttendance = attendance.length > 0;
  // Tỷ lệ chuyên cần trung bình theo chương trình (từ program_name + rate).
  const attendByProgram = useMemo(() => {
    const map = new Map(); // program_name -> { sum, n }
    attendance.forEach((a) => {
      const rate = toNum(a.rate);
      if (rate == null) return;
      const key = a.program_name || "Chưa phân loại";
      const e = map.get(key) || { sum: 0, n: 0 };
      e.sum += rate; e.n += 1;
      map.set(key, e);
    });
    const out = new Map();
    map.forEach((e, k) => out.set(k, Math.round((e.sum / e.n) * 10) / 10));
    return out;
  }, [attendance]);
  // Top 5 lớp theo tỉ lệ chuyên cần THẬT.
  const attendTop5 = useMemo(() => (
    attendance
      .filter((a) => toNum(a.rate) != null && a.classroom_name)
      .map((a) => ({ name: a.classroom_name, rate: Math.round(toNum(a.rate) * 10) / 10 }))
      .sort((x, y) => y.rate - x.rate)
      .slice(0, 5)
  ), [attendance]);

  const classesFiltered = useMemo(() => {
    const q = search.toLowerCase();
    return classes.filter((c) => {
      if (filterCenter && String(c.center?.id) !== String(filterCenter)) return false;
      if (q && !`${c.name || ""} ${c.class_code || ""} ${c.program_name || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [classes, filterCenter, search]);

  const classPages = Math.max(1, Math.ceil(classesFiltered.length / PAGE_SIZE));
  const classPageRows = classesFiltered.slice((classPage - 1) * PAGE_SIZE, classPage * PAGE_SIZE);
  useEffect(() => { if (classPage > classPages) setClassPage(classPages); }, [classPages, classPage]);

  const submitCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      setFormError("Vui lòng nhập họ, tên và email học viên.");
      return;
    }
    const base = form.phone_number || form.email || "Student@2025";
    const password = base.length >= 8 ? base : `${base}12345678`;
    const payload = {
      student_code: form.student_code.trim() || undefined,
      user: {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        username: (form.phone_number || form.email).trim(),
        password,
      },
      gender: form.gender || null,
      date_of_birth: form.date_of_birth || null,
      phone_number: form.phone_number || null,
      current_status: form.current_status || "active",
      parent_name: form.parent_name || null,
      parent_phone: form.parent_phone || null,
    };
    if (createCenter) payload.center_id = createCenter;
    if (createClassroom) payload.classroom_id = createClassroom;
    setSaving(true);
    try {
      await createStudent(payload);
      setNotice("Đã thêm học viên mới.");
      setForm(emptyForm);
      setCreateCenter("");
      setModal(null);
      setReloadKey((k) => k + 1);
    } catch (error) {
      const d = error?.response?.data;
      setFormError(d?.detail || (d && typeof d === "object" ? Object.values(d)?.[0]?.[0] : null) || "Không thể thêm học viên. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const submitImport = async () => {
    setImportResult(null);
    const file = importFileRef.current?.files?.[0];
    if (!file) { setImportResult({ error: "Vui lòng chọn file Excel để nhập." }); return; }
    const fd = new FormData();
    fd.append("file", file);
    const cn = centers.find((c) => String(c.id) === String(importCenter))?.name;
    if (cn) fd.append("center_name", cn);
    setImporting(true);
    try {
      const res = await importStudentsFile(fd);
      setImportResult({ success: res.success_count ?? 0, errors: res.errors || [], errorCount: res.error_count ?? 0 });
      setReloadKey((k) => k + 1);
    } catch (error) {
      setImportResult({ error: error?.response?.data?.detail || "Không thể nhập dữ liệu. Vui lòng thử lại." });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportStudentsFile({
        search: search || undefined,
        center: filterCenter || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "hoc-sinh.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setNotice("Đã xuất file danh sách học sinh.");
    } catch (error) {
      setNotice("Không thể xuất file. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  };

  const submitRoster = async () => {
    setRosterResult(null);
    const file = rosterFileRef.current?.files?.[0];
    if (!file) { setRosterResult({ error: "Vui lòng chọn file Excel danh sách lớp." }); return; }
    const cn = centers.find((c) => String(c.id) === String(rosterCenter));
    if (!rosterCenter) { setRosterResult({ error: "Vui lòng chọn cơ sở cho danh sách lớp." }); return; }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("center_id", rosterCenter);
    if (cn?.name) fd.append("center_name", cn.name);
    if (rosterReplace) fd.append("replace", "true");
    setRosterImporting(true);
    try {
      const res = await importRosterFile(fd);
      setRosterResult({
        classesCreated: res.classrooms_created ?? 0,
        classesUpdated: res.classrooms_updated ?? 0,
        studentsDeleted: res.students_deleted ?? 0,
        studentsCreated: res.students_created ?? 0,
        studentsUpdated: res.students_updated ?? 0,
        studentsSkipped: res.students_skipped ?? 0,
        errors: res.errors || [],
      });
      setReloadKey((k) => k + 1);
    } catch (error) {
      setRosterResult({ error: error?.response?.data?.detail || "Không thể nhập danh sách lớp. Vui lòng thử lại." });
    } finally {
      setRosterImporting(false);
    }
  };

  return (
    <div className="v4page">
      <div className="content" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div className="content-col">
          {/* Header */}
          <div className="page-head">
            <div className="flex-between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h1>Học sinh - Lớp học</h1>
                <p>Quản lý sĩ số, chuyên cần, tiến độ học tập và kết quả đào tạo toàn trung tâm</p>
              </div>
              <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn ghost" onClick={() => navigate("/chuong-trinh")}>📚 Chi tiết theo chương trình →</button>
                {canManage ? (
                  <>
                    <button type="button" className="btn ghost" onClick={handleExport} disabled={exporting}>{exporting ? "Đang xuất..." : "⬇ Xuất Excel"}</button>
                    <button type="button" className="btn ghost" onClick={() => { setImportResult(null); setModal("import"); }}>📥 Nhập HS</button>
                    <button type="button" className="btn ghost" onClick={() => { setRosterResult(null); setModal("roster"); }}>🗂️ Nhập lớp + HS</button>
                    <button type="button" className="btn primary" onClick={() => { setFormError(""); setModal("create"); }}>+ Thêm học viên</button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {notice ? (
            <div className="alert green" style={{ background: "#e9f7ef", color: "#1c7a45", marginBottom: 14 }}>
              {notice} <button type="button" onClick={() => setNotice("")} style={{ border: "none", background: "none", cursor: "pointer", color: "inherit", fontWeight: 800, float: "right" }} aria-label="Đóng">✕</button>
            </div>
          ) : null}

          {/* KPI row */}
          <div className="kpi-grid">
            <Kpi ico="👥" icoClass="orange" label="Tổng sĩ số" value={fmt(totalStudents)} />
            <Kpi ico="🏫" icoClass="orange" label="Lớp đang hoạt động" value={fmt(activeClasses)} />
            {attendanceOverall != null
              ? <Kpi ico="✅" icoClass="green" label="Tỷ lệ chuyên cần" value={`${vnPct(Math.round(attendanceOverall * 10) / 10)}%`} />
              : <Kpi ico="✅" icoClass="green" label="Tỷ lệ chuyên cần" value="—" demo />}
            <Kpi ico="📈" icoClass="orange" label="Hoàn thành lộ trình" value="72,3%" trend="3,8% so với T4" demo />
            <Kpi ico="⭐" icoClass="yellow" label="Học sinh nổi bật tháng" value="18" trend="20,0% so với T4" demo />
            <Kpi ico="🗂️" icoClass="blue" label="File đã nhập/xuất" value="24 / 18" trend="15,2% so với T4" demo />
          </div>

          <div className="stack">
            {/* 1. Tổng quan nhập học */}
            <div className="card">
              <div className="card-head"><h3>1. Tổng quan nhập học</h3></div>
              <div className="grid c3">
                <div>
                  <div className="small muted bold">Tổng sĩ số</div>
                  <div className="big-num">{fmt(totalStudents)} <span className="small muted" style={{ fontWeight: 600 }}>học sinh</span></div>
                  <div className="donut-wrap mt12" style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <GenderDonut male={genderCounts.male} female={genderCounts.female} total={totalStudents} />
                    <div className="donut-legend">
                      <div className="dl" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, marginBottom: 6 }}>
                        <i style={{ width: 10, height: 10, borderRadius: 3, background: "#F26522", display: "inline-block" }} />
                        Nam <b style={{ marginLeft: 4 }}>{vnPct(pct1(genderCounts.male, totalStudents))}% ({fmt(genderCounts.male)})</b>
                      </div>
                      <div className="dl" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, marginBottom: 6 }}>
                        <i style={{ width: 10, height: 10, borderRadius: 3, background: "#C0392B", display: "inline-block" }} />
                        Nữ <b style={{ marginLeft: 4 }}>{vnPct(pct1(genderCounts.female, totalStudents))}% ({fmt(genderCounts.female)})</b>
                      </div>
                      {totalStudents - genderCounts.male - genderCounts.female > 0 ? (
                        <div className="dl" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                          <i style={{ width: 10, height: 10, borderRadius: 3, background: "#EFE7DB", display: "inline-block" }} />
                          Chưa rõ <b style={{ marginLeft: 4 }}>{vnPct(pct1(totalStudents - genderCounts.male - genderCounts.female, totalStudents))}% ({fmt(totalStudents - genderCounts.male - genderCounts.female)})</b>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="small muted bold mb12">Sĩ số theo chương trình</div>
                  {programAgg.rows.length ? programAgg.rows.map((r, i) => (
                    <div className="hbar-row" key={r.name}>
                      <span className="hb-label">{r.name}</span>
                      <span className="hb-bar"><i style={{ width: `${Math.round((r.count / programAgg.max) * 100)}%`, background: PROGRAM_COLORS[i % PROGRAM_COLORS.length] }} /></span>
                      <span className="hb-val">{fmt(r.count)} ({vnPct(pct1(r.count, programAgg.sum))}%)</span>
                    </div>
                  )) : <div className="small muted">Chưa có dữ liệu sĩ số theo chương trình.</div>}
                  <div className="chart-note small muted mt8">Tổng: {fmt(programAgg.sum)} học sinh (đang học)</div>
                </div>
                <div>
                  <div className="flex-between mb12">
                    <span className="small muted bold">Biến động học sinh</span>
                    <span className="badge gray" style={{ fontSize: 9 }}>Demo</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120, padding: "0 4px" }}>
                    {[980, 1020, 1110, 1108, totalStudents || 1248].map((v, i, arr) => {
                      const mx = Math.max(...arr);
                      return (
                        <div key={i} style={{ flex: 1, textAlign: "center" }}>
                          <div style={{ height: `${(v / mx) * 92}px`, background: i === arr.length - 1 ? "#F26522" : "#F2C9A8", borderRadius: "6px 6px 0 0" }} />
                          <div className="small muted" style={{ fontSize: 10, marginTop: 3 }}>T{i + 1}/25</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 2 & 3 */}
            <div className="grid c2">
              <div className="card">
                <div className="card-head"><h3>2. Chuyên cần</h3>{hasAttendance ? null : <span className="badge gray" style={{ fontSize: 9 }}>Demo</span>}</div>
                <div className="small muted bold mb12">Theo chương trình</div>
                {programAgg.rows.length ? programAgg.rows.map((r) => {
                  const rate = attendByProgram.get(r.name);
                  return (
                    <div key={r.name} style={{ marginBottom: 9 }}>
                      <div className="flex-between"><span className="small bold">{r.name}</span><span className="small muted">{rate == null ? "—" : `${vnPct(rate)}%`}</span></div>
                      {rate == null ? null : <div className="prog green" style={{ marginTop: 4 }}><i style={{ width: `${rate}%` }} /></div>}
                    </div>
                  );
                }) : <div className="small muted">Chưa có dữ liệu.</div>}
                <div className="hr" style={{ margin: "12px 0" }} />
                <div className="small muted bold mb12">Theo lớp (Top 5)</div>
                <div className="list">
                  {attendTop5.length ? attendTop5.map((c) => (
                    <div className="li" key={c.name}>
                      <div className="ico-sm" style={{ background: "var(--success-soft)", color: "var(--success)" }}>✅</div>
                      <div className="li-body"><div className="li-title">{c.name}</div></div>
                      <span className="badge green">{vnPct(c.rate)}%</span>
                    </div>
                  )) : <div className="small muted">Chưa có dữ liệu chuyên cần.</div>}
                </div>
              </div>
              <div className="card">
                <div className="card-head"><h3>3. Tiến độ học tập theo lộ trình</h3></div>
                <div className="flex-between mb12"><span className="small muted bold">Theo chương trình</span><span className="small muted">Buổi đã học / kế hoạch</span></div>
                {progressByProgram.length ? progressByProgram.map((r) => (
                  <div key={r.name} style={{ marginBottom: 10 }}>
                    <div className="flex-between"><span className="small bold">{r.name} <span className="muted" style={{ fontWeight: 400 }}>({r.classes} lớp)</span></span><span className="small muted">{r.pct == null ? "—" : `${r.pct}%`}</span></div>
                    <div className="prog" style={{ marginTop: 4 }}><i style={{ width: `${r.pct || 0}%` }} /></div>
                  </div>
                )) : <div className="small muted">Chưa có dữ liệu.</div>}
                <div className="hr" style={{ margin: "12px 0" }} />
                <div className="flex-between mb12"><span className="small muted bold">Theo lớp (Top 5)</span><span className="badge gray" style={{ fontSize: 9 }}>Demo</span></div>
                {PROGRESS_TOP5.map(([name, val, note]) => (
                  <div key={name} style={{ marginBottom: 10 }}>
                    <div className="flex-between"><span className="small bold">{name}</span><span className="small muted">{note}</span></div>
                    <div className="prog" style={{ marginTop: 4 }}><i style={{ width: `${val}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4 & 5 */}
            <div className="grid c2">
              <div className="card">
                <div className="card-head"><h3>4. Hoạt động tháng</h3><span className="badge gray" style={{ fontSize: 9 }}>Demo</span></div>
                <div className="list">
                  {ACTIVITIES.map(([date, title, sub, status, cls]) => (
                    <div className="li" key={title}>
                      <div className="ico-sm" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>📅</div>
                      <div className="li-body"><div className="li-title">{title}</div><div className="li-sub">{date} · {sub}</div></div>
                      <span className={`badge ${cls}`}>{status}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="card-head"><h3>5. Vinh danh học sinh tiêu biểu</h3><span className="badge gray" style={{ fontSize: 9 }}>Demo</span></div>
                <div className="grid c3">
                  {HONORS.map(([name, sub, badge, color]) => (
                    <div className="honor" key={name} style={{ textAlign: "center" }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: color, color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px" }}>
                        {name.split(" ").map((w) => w[0]).slice(-2).join("")}
                      </div>
                      <b style={{ fontSize: 12.5 }}>{name}</b>
                      <small className="muted" style={{ display: "block", fontSize: 11 }}>{sub}</small>
                      <span className="badge orange" style={{ marginTop: 8, fontSize: 10 }}>{badge}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 6. Kết quả học tập (Tổng quan) — theo lớp */}
            <div className="card">
              <div className="card-head" style={{ flexWrap: "wrap", gap: 8 }}>
                <h3>6. Kết quả học tập (Tổng quan)</h3>
                <span className="small muted">Giỏi ≥ 80% · Khá 65–79% · TB &lt; 65% (trên tổng sĩ số lớp)</span>
              </div>

              {/* Filters */}
              <div className="flex" style={{ gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <input placeholder="Tìm lớp, mã lớp, chương trình..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                  style={{ flex: "1 1 220px", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 9, fontSize: 13 }} />
                <select value={filterCenter} onChange={(e) => setFilterCenter(e.target.value)}
                  style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 9, fontSize: 13 }}>
                  <option value="">Tất cả cơ sở</option>
                  {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {!aggLoading && !hasGradeData ? (
                <div className="alert orange" style={{ marginBottom: 12 }}>Chưa có dữ liệu điểm số để tổng hợp xếp loại. Bảng hiển thị sĩ số lớp; cột Giỏi/Khá/TB sẽ có khi có điểm.</div>
              ) : null}

              {/* Table */}
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Chương trình</th><th>Lớp</th><th className="t-center">Sĩ số</th>
                      <th className="t-center">Giỏi</th><th className="t-center">Khá</th><th className="t-center">Trung bình</th>
                      <th>Kỹ năng / đầu mục</th><th>Nhận xét</th><th className="t-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggLoading ? (
                      <tr><td colSpan={9} className="muted" style={{ padding: 16, textAlign: "center" }}>Đang tải...</td></tr>
                    ) : classPageRows.length ? classPageRows.map((c) => {
                      const g = gradeByClass[c.id];
                      const active = countById[c.id];
                      // Tổng sĩ số = sĩ số đang học, nhưng ít nhất bằng số HS có điểm
                      // (có thể có HS đã nghỉ nhưng vẫn còn điểm) -> tránh vượt 100%.
                      const size = active != null || (g && g.graded) ? Math.max(active || 0, g ? g.graded : 0) : null;
                      const rv = classReview(g);
                      return (
                        <tr key={c.id}>
                          <td className="muted">{c.program_name || "—"}</td>
                          <td className="bold">{c.class_code || c.name}<div className="small muted" style={{ fontWeight: 400 }}>{c.class_code ? c.name : (c.center?.name || "")}</div></td>
                          <td className="t-center">{size != null ? fmt(size) : "—"}</td>
                          <GradeCell count={g ? g.gioi : null} size={size} band="gioi" />
                          <GradeCell count={g ? g.kha : null} size={size} band="kha" />
                          <GradeCell count={g ? g.tb : null} size={size} band="tb" />
                          <td className="small muted">{skillsFor(c.program_name, evalItems).join(" · ")}</td>
                          <td className="small muted">{rv.note}</td>
                          <td className="t-center"><span className={`badge ${rv.status.cls}`}>{rv.status.label}</span></td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={9} className="muted" style={{ padding: 16, textAlign: "center" }}>Không có lớp học phù hợp.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex-between mt12" style={{ flexWrap: "wrap", gap: 8 }}>
                <span className="small muted">{classesFiltered.length ? `Hiển thị ${(classPage - 1) * PAGE_SIZE + 1}–${Math.min(classPage * PAGE_SIZE, classesFiltered.length)} / ${fmt(classesFiltered.length)} lớp` : "0 lớp"}</span>
                {classPages > 1 ? (
                  <div className="flex" style={{ gap: 8 }}>
                    <button type="button" className="btn ghost sm" disabled={classPage <= 1} onClick={() => setClassPage((p) => p - 1)}>‹ Trước</button>
                    <span className="small" style={{ alignSelf: "center" }}>Trang {classPage}/{classPages}</span>
                    <button type="button" className="btn ghost sm" disabled={classPage >= classPages} onClick={() => setClassPage((p) => p + 1)}>Sau ›</button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="rightbar">
          <div className="card">
            <div className="card-head"><h3>Nhắc việc học vụ</h3><span className="badge gray" style={{ fontSize: 9 }}>Demo</span></div>
            <div className="list">
              {REMINDERS.map(([ico, title, sub]) => (
                <div className="li" key={title}>
                  <div className="ico-sm" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>{ico}</div>
                  <div className="li-body"><div className="li-title">{title}</div><div className="li-sub">{sub}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3>Lớp cần theo dõi</h3><span className="badge gray" style={{ fontSize: 9 }}>Demo</span></div>
            <div className="list">
              {WATCH_CLASSES.map(([title, val, cls]) => (
                <div className="li" key={title}>
                  <div className="ico-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>⚠️</div>
                  <div className="li-body"><div className="li-title" style={{ fontSize: 12 }}>{title}</div></div>
                  <span className={`badge ${cls}`}>{val}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="stack">
            <div className="alert red"><div>Cần theo dõi và nhắc nhở <b>12 lớp chuyên cần dưới 90%</b></div></div>
            <div className="alert orange"><div>Cần hỗ trợ học tập kịp thời <b>18 lớp tiến độ dưới 65%</b></div></div>
          </div>
        </div>
      </div>

      {/* Create modal */}
      {modal === "create" ? (
        <Modal title="Thêm học viên mới" onClose={() => setModal(null)}>
          <form onSubmit={submitCreate}>
            <div className="grid c2">
              <label><span className="field-label">Họ *</span><input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Nguyễn" /></label>
              <label><span className="field-label">Tên *</span><input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="Minh Anh" /></label>
              <label><span className="field-label">Email *</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="hocvien@vista.edu.vn" /></label>
              <label><span className="field-label">Số điện thoại</span><input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="09xxxxxxxx" /></label>
              <label><span className="field-label">Mã học viên</span><input value={form.student_code} onChange={(e) => setForm({ ...form, student_code: e.target.value })} placeholder="HV001" /></label>
              <label><span className="field-label">Giới tính</span>
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="">--</option><option value="male">Nam</option><option value="female">Nữ</option>
                </select>
              </label>
              <label><span className="field-label">Ngày sinh</span><input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></label>
              <label><span className="field-label">Trạng thái</span>
                <select value={form.current_status} onChange={(e) => setForm({ ...form, current_status: e.target.value })}>
                  {Object.entries(STUDENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </label>
              <label><span className="field-label">Cơ sở</span>
                <select value={createCenter} onChange={(e) => setCreateCenter(e.target.value)}>
                  <option value="">-- Chọn cơ sở --</option>
                  {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label><span className="field-label">Lớp học</span>
                <select value={createClassroom} onChange={(e) => setCreateClassroom(e.target.value)} disabled={!createCenter}>
                  <option value="">{createCenter ? "-- Chọn lớp --" : "Chọn cơ sở trước"}</option>
                  {createClassrooms.map((c) => <option key={c.id} value={c.id}>{c.class_code || c.name}</option>)}
                </select>
              </label>
              <label><span className="field-label">Tên phụ huynh</span><input value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} /></label>
              <label><span className="field-label">SĐT phụ huynh</span><input value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} /></label>
            </div>
            {formError ? <div className="alert red" style={{ marginTop: 10 }}>{formError}</div> : null}
            <div className="flex mt16" style={{ justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className="btn ghost" onClick={() => setModal(null)}>Huỷ</button>
              <button type="submit" className="btn primary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu học viên"}</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {/* Import modal */}
      {modal === "import" ? (
        <Modal title="Nhập học viên từ Excel" onClose={() => setModal(null)} width={560}>
          <p className="small muted" style={{ marginTop: 0 }}>Chọn file Excel (.xlsx) theo mẫu học viên. Có thể gán vào một cơ sở nếu file không ghi rõ.</p>
          <label><span className="field-label">Cơ sở (tuỳ chọn)</span>
            <select value={importCenter} onChange={(e) => setImportCenter(e.target.value)}>
              <option value="">-- Không gán --</option>
              {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label style={{ display: "block", marginTop: 10 }}><span className="field-label">File Excel (.xlsx)</span>
            <input ref={importFileRef} type="file" accept=".xlsx,.xls" />
          </label>
          {importResult?.error ? <div className="alert red" style={{ marginTop: 10 }}>{importResult.error}</div> : null}
          {importResult && !importResult.error ? (
            <div className="alert green" style={{ marginTop: 10, background: "#e9f7ef", color: "#1c7a45" }}>
              Đã nhập {importResult.success} học viên{importResult.errorCount ? `, lỗi ${importResult.errorCount}` : ""}.
              {importResult.errors?.length ? <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{importResult.errors.slice(0, 5).map((er, i) => <li key={i} className="small">{typeof er === "string" ? er : JSON.stringify(er)}</li>)}</ul> : null}
            </div>
          ) : null}
          <div className="flex mt16" style={{ justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn ghost" onClick={() => setModal(null)}>Đóng</button>
            <button type="button" className="btn primary" disabled={importing} onClick={submitImport}>{importing ? "Đang nhập..." : "📥 Nhập file"}</button>
          </div>
        </Modal>
      ) : null}

      {/* Roster import: bảng danh sách lớp (nhiều sheet) -> tạo lớp + học sinh */}
      {modal === "roster" ? (
        <Modal title="Nhập danh sách lớp + học sinh" onClose={() => setModal(null)} width={580}>
          <p className="small muted" style={{ marginTop: 0 }}>
            Tải lên file Excel danh sách lớp (nhiều sheet, mỗi sheet là một lớp theo mẫu VISTA). Hệ thống đọc sheet <b>"TỔNG HỢP CÁC CHƯƠNG TRÌNH"</b> để gán chương trình, tạo/cập nhật <b>lớp học</b> và <b>học sinh</b> (tên + SĐT) trong từng sheet. Chạy lại cùng file sẽ không tạo trùng.
          </p>
          <label><span className="field-label">Cơ sở *</span>
            <select value={rosterCenter} onChange={(e) => setRosterCenter(e.target.value)}>
              <option value="">-- Chọn cơ sở --</option>
              {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label style={{ display: "block", marginTop: 10 }}><span className="field-label">File Excel (.xlsx)</span>
            <input ref={rosterFileRef} type="file" accept=".xlsx,.xls" />
          </label>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={rosterReplace} onChange={(e) => setRosterReplace(e.target.checked)} style={{ marginTop: 3 }} />
            <span className="small">Xoá toàn bộ <b>học sinh cũ của cơ sở này</b> trước khi nhập (chỉ giữ học sinh trong file). Không ảnh hưởng cơ sở khác.</span>
          </label>
          {rosterResult?.error ? <div className="alert red" style={{ marginTop: 10 }}>{rosterResult.error}</div> : null}
          {rosterResult && !rosterResult.error ? (
            <div className="alert green" style={{ marginTop: 10, background: "#e9f7ef", color: "#1c7a45" }}>
              {rosterResult.studentsDeleted ? `Đã xoá ${rosterResult.studentsDeleted} học sinh cũ. ` : ""}Lớp: tạo mới {rosterResult.classesCreated}, cập nhật {rosterResult.classesUpdated}. Học sinh: tạo mới {rosterResult.studentsCreated}, cập nhật {rosterResult.studentsUpdated}{rosterResult.studentsSkipped ? `, bỏ qua ${rosterResult.studentsSkipped}` : ""}.
              {rosterResult.errors?.length ? <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{rosterResult.errors.slice(0, 5).map((er, i) => <li key={i} className="small">{typeof er === "string" ? er : JSON.stringify(er)}</li>)}</ul> : null}
            </div>
          ) : null}
          <div className="flex mt16" style={{ justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn ghost" onClick={() => setModal(null)}>Đóng</button>
            <button type="button" className="btn primary" disabled={rosterImporting} onClick={submitRoster}>{rosterImporting ? "Đang nhập..." : "🗂️ Nhập danh sách"}</button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export default Students;
