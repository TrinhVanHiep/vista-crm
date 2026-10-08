import BulkImportModal from "../components/bulk/BulkImportModal";
import { VAI_QUAN_TRI } from "../auth/permissions";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listStudents,
  listCentersAll,
  listClassroomsAll,
  listClassroomsByCenter,
  listMonthlyScorecards,
  listStudentScores,
  listSchedules,
  layTongQuanLop,
  createStudent,
  importStudentsFile,
  importRosterFile,
  exportStudentsFile,
} from "../services/calendarService";
import { CenterField, useAutoCenter } from "../utils/centerField";
import "../styles/vista4.css";

const PAGE_SIZE = 12;
const fmt = (n) => (Number(n) || 0).toLocaleString("vi-VN");
const pct1 = (part, total) => (total ? Math.round((part / total) * 1000) / 10 : 0);
const vnPct = (v) => String(v).replace(".", ",");
const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

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
// Cùng ngưỡng với xếp loại trên phiếu điểm (Giỏi ≥ 8.5, Khá ≥ 7 thang 10).
const bandFromPercent = (p) => (p == null ? null : p >= 85 ? "gioi" : p >= 70 ? "kha" : "tb");

const HONORS = [
  ["Khánh An", "FP3-A1 · Finger Print + Phonics", "🥇 Chuyên cần 100% · Tiến bộ vượt bậc", "#E0538D"],
  ["Minh Khoa", "KET 01 · Cambridge", "🏅 Điểm TB 91/100 · Tư duy phản biện tốt", "#0E9F8F"],
  ["Khả Hân", "IELTS 4.0 Pre 01 · Global Success", "⭐ Kỹ năng Speaking xuất sắc", "#7C5CFA"],
];
const TRANG_THAI_VIEC = {
  todo: { label: "Chưa bắt đầu", cls: "gray" },
  in_progress: { label: "Đang làm", cls: "orange" },
  done: { label: "Hoàn thành", cls: "green" },
  delay: { label: "Chậm", cls: "red" },
  cancel: { label: "Đã huỷ", cls: "gray" },
};
const rutGon = (v) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1e9) return `${vnPct(Math.round(n / 1e8) / 10)} tỷ`;
  if (Math.abs(n) >= 1e6) return `${vnPct(Math.round(n / 1e5) / 10)} tr`;
  return fmt(n);
};

/** Thanh ngang: tên · thanh · số (dùng cho cấp học, chương trình, khu vực, xếp loại). */
function ThanhNgang({ rows, donVi = "" }) {
  const max = Math.max(1, ...rows.map((r) => r.so || 0));
  const tong = rows.reduce((a, r) => a + (r.so || 0), 0) || 1;
  if (!rows.length) return <div className="small muted">Chưa có dữ liệu.</div>;
  return rows.map((r, i) => (
    <div className="hbar-row" key={r.ten}>
      <span className="hb-label">{r.ten}</span>
      <span className="hb-bar"><i style={{ width: `${Math.round(((r.so || 0) / max) * 100)}%`, background: r.mau || PROGRAM_COLORS[i % PROGRAM_COLORS.length] }} /></span>
      <span className="hb-val">{fmt(r.so)}{donVi ? ` ${donVi}` : ""} ({vnPct(pct1(r.so || 0, tong))}%)</span>
    </div>
  ));
}

/** Cột đứng cuộn ngang được khi nhiều cột (sĩ số các lớp, doanh thu theo tháng). */
function CotDung({ rows, cao = 140 }) {
  const max = Math.max(1, ...rows.map((r) => r.so || 0));
  if (!rows.length) return <div className="small muted">Chưa có dữ liệu.</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: cao + 34, minWidth: rows.length * 34 }}>
        {rows.map((r) => (
          <div key={r.ten} style={{ flex: "1 0 28px", textAlign: "center" }} title={`${r.ten}: ${r.nhan || fmt(r.so)}`}>
            <div className="small" style={{ fontSize: 10, fontWeight: 700 }}>{r.nhan || fmt(r.so)}</div>
            <div style={{ height: `${((r.so || 0) / max) * cao}px`, minHeight: r.so ? 2 : 0, background: "#F26522", borderRadius: "5px 5px 0 0" }} />
            <div className="small muted" style={{ fontSize: 10, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.ten}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Theo chương trình (Kid → TACB → Cambridge → IELTS); bấm một chương trình để xem từng lớp. */
function TheoNhomMoRong({ nhom, giaTri, giaTriLop, nhanLop, mau = "" }) {
  const [mo, setMo] = useState("");
  if (!nhom.length) return <div className="small muted">Chưa có dữ liệu.</div>;
  return nhom.map((n) => {
    const v = giaTri(n);
    return (
      <div key={n.ma} style={{ marginBottom: 10 }}>
        <button type="button" onClick={() => setMo((x) => (x === n.ma ? "" : n.ma))}
          style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}>
          <div className="flex-between"><span className="small bold">{mo === n.ma ? "▾" : "▸"} {n.ten} <span className="muted" style={{ fontWeight: 400 }}>({n.lop.length} lớp)</span></span><span className="small muted">{v == null ? "—" : `${vnPct(v)}%`}</span></div>
          {v == null ? null : <div className={`prog ${mau}`} style={{ marginTop: 4 }}><i style={{ width: `${v}%` }} /></div>}
        </button>
        {mo === n.ma ? (
          <div style={{ margin: "8px 0 4px 16px" }}>
            {n.lop.map((l) => {
              const lv = giaTriLop(l);
              return (
                <div key={l.id} style={{ marginBottom: 6 }}>
                  <div className="flex-between"><span className="small">{l.class_code || l.name}</span><span className="small muted">{lv == null ? "—" : `${vnPct(lv)}%`} · {nhanLop(l)}</span></div>
                  {lv == null ? null : <div className={`prog ${mau}`} style={{ marginTop: 3, height: 5 }}><i style={{ width: `${lv}%` }} /></div>}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  });
}

function Kpi({ ico, icoClass, label, value, trend, demo, onClick, active }) {
  return (
    <div
      className="kpi"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      style={onClick ? { cursor: "pointer", outline: active ? "2px solid var(--primary)" : undefined } : undefined}
    >
      <div className={`ico ${icoClass}`} style={{ fontSize: 18 }}>{ico}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="kpi-label">
          {label}
          {demo ? <span className="badge gray" style={{ marginLeft: 6, padding: "1px 7px", fontSize: 9 }}>Demo</span> : null}
        </div>
        <div className="kpi-value">{value}</div>
        {trend ? <span className={onClick ? "small muted" : "trend up"}>{onClick ? trend : `▲ ${trend}`}</span> : null}
      </div>
    </div>
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
  const canManage = VAI_QUAN_TRI.includes(role);
  const navigate = useNavigate();

  // Aggregates / overview
  const [totalStudents, setTotalStudents] = useState(0);
  const [classes, setClasses] = useState([]);
  const [centers, setCenters] = useState([]);
  const [scorecards, setScorecards] = useState([]);
  const [scores, setScores] = useState([]);
  const [tq, setTq] = useState(null); // /classrooms/classrooms/tong-quan/
  const [hoatDong, setHoatDong] = useState([]);
  const [moTienDo, setMoTienDo] = useState(false);
  const [aggLoading, setAggLoading] = useState(true);
  const homNay = new Date();
  const thang = homNay.getMonth() + 1;
  const nam = homNay.getFullYear();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterCenter, setFilterCenter] = useState("");

  // Modals / actions
  const [modal, setModal] = useState(null); // 'create' | 'import'
  const [moNhapExcel, setMoNhapExcel] = useState(false);
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

  // Số liệu tổng hợp. Sĩ số / chuyên cần / lộ trình / học phí lấy từ một
  // endpoint (classrooms/tong_quan.py) để mọi con số cùng một luật.
  useEffect(() => {
    let active = true;
    setAggLoading(true);
    (async () => {
      try {
        const [all, classAll, ctrs, cards, rawScores, tongQuan, viec] = await Promise.all([
          listStudents({ dang_hoc: true, page_size: 1 }),
          listClassroomsAll().catch(() => []),
          listCentersAll().catch(() => []),
          // 1000 chứ không phải 100: một tháng có cỡ 20 em x 23 lớp phiếu.
          listMonthlyScorecards({ month: thang, year: nam, page_size: 1000 }).catch(() => ({ results: [] })),
          listStudentScores({ page_size: 100 }).catch(() => ({ results: [] })),
          layTongQuanLop({ month: thang, year: nam }).catch(() => null),
          listSchedules({ year: nam, month: thang, page_size: 200 }).catch(() => []),
        ]);
        if (!active) return;
        setTotalStudents(all.count || 0);
        setClasses(Array.isArray(classAll) ? classAll : []);
        setCenters(Array.isArray(ctrs) ? ctrs : []);
        setScorecards(Array.isArray(cards?.results) ? cards.results : []);
        setScores(Array.isArray(rawScores?.results) ? rawScores.results : []);
        setTq(tongQuan);
        const dsViec = Array.isArray(viec) ? viec : viec?.results || [];
        setHoatDong(dsViec.filter((v) => v.category === "student")
          .sort((a, b) => String(a.event_date || "").localeCompare(String(b.event_date || ""))));
      } catch (error) {
        if (active) { setClasses([]); setCenters([]); setScorecards([]); setScores([]); setTq(null); setHoatDong([]); }
      } finally {
        if (active) setAggLoading(false);
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  // Chỉ có 1 trung tâm -> mặc định chọn sẵn để khỏi phải chọn khi nhập/thêm.
  useAutoCenter(centers, setFilterCenter);
  useAutoCenter(centers, setRosterCenter);
  useAutoCenter(centers, setImportCenter);
  useAutoCenter(centers, setCreateCenter);

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
  const lopDong = useMemo(() => tq?.lop || [], [tq]);

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

  // Xếp loại toàn trung tâm (tháng này) từ các lớp đã có điểm.
  const xepLoaiChung = useMemo(() => {
    const o = { gioi: 0, kha: 0, tb: 0, tong: 0 };
    Object.values(gradeByClass).forEach((g) => { o.gioi += g.gioi; o.kha += g.kha; o.tb += g.tb; o.tong += g.graded; });
    return o;
  }, [gradeByClass]);

  // Nhóm chương trình theo thứ tự chuẩn Kid → TACB → Cambridge → IELTS.
  const theoNhom = useMemo(() => {
    const thuTu = ["kid", "tacb", "cam", "ielts", ""];
    const m = new Map();
    lopDong.forEach((l) => {
      const e = m.get(l.nhom) || { ma: l.nhom || "khac", ten: l.ten_nhom, lop: [], siSo: 0, ccCoMat: 0, ccTong: 0, daHoc: 0, tongBuoi: 0 };
      e.lop.push(l);
      e.siSo += l.si_so;
      if (l.chuyen_can != null) { e.ccCoMat += l.chuyen_can * (l.so_ca_chuyen_can || 1); e.ccTong += (l.so_ca_chuyen_can || 1); }
      if (l.tong_buoi) { e.daHoc += Math.min(l.buoi_da_hoc, l.tong_buoi); e.tongBuoi += l.tong_buoi; }
      m.set(l.nhom, e);
    });
    return thuTu.filter((k) => m.has(k)).map((k) => {
      const e = m.get(k);
      return {
        ...e,
        chuyenCan: e.ccTong ? Math.round((e.ccCoMat / e.ccTong) * 10) / 10 : null,
        loTrinh: e.tongBuoi ? Math.round((e.daHoc / e.tongBuoi) * 1000) / 10 : null,
      };
    });
  }, [lopDong]);

  const loTrinhChung = useMemo(() => {
    const da = theoNhom.reduce((a, n) => a + n.daHoc, 0);
    const tong = theoNhom.reduce((a, n) => a + n.tongBuoi, 0);
    return tong ? Math.round((da / tong) * 1000) / 10 : null;
  }, [theoNhom]);
  const tongNo = lopDong.length && lopDong[0].hoc_phi_phai_thu !== null
    ? lopDong.reduce((a, l) => a + (l.hoc_phi_phai_thu || 0), 0) : null;

  const luuY = (l, g) => [
    l.chuyen_can != null && l.chuyen_can < 90 ? `Chuyên cần ${vnPct(l.chuyen_can)}%` : "",
    !l.tong_buoi ? "Chưa khai tổng số buổi" : "",
    g && g.graded && g.tb / g.graded > 0.5 ? "Nhiều HS mức TB" : "",
    l.hoc_phi_phai_thu ? "Còn nợ học phí" : "",
    !l.si_so ? "Chưa có học sinh" : "",
  ].filter(Boolean);

  const canTheoDoi = useMemo(() => lopDong
    .map((l) => ({ ...l, lyDo: luuY(l, gradeByClass[l.id]).filter((x) => x !== "Chưa khai tổng số buổi").join(" · ") }))
    .filter((l) => l.lyDo), [lopDong, gradeByClass]); // eslint-disable-line react-hooks/exhaustive-deps

  const lopLoc = useMemo(() => {
    const q = search.toLowerCase();
    return lopDong.filter((l) => !q || `${l.name || ""} ${l.class_code || ""} ${l.program_name || ""}`.toLowerCase().includes(q));
  }, [lopDong, search]);

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
                    <button type="button" className="btn ghost" onClick={() => navigate("/quan-ly-lop")}>⚙️ Quản lý lớp</button>
                    <button type="button" className="btn ghost" onClick={handleExport} disabled={exporting}>{exporting ? "Đang xuất..." : "⬇ Xuất Excel"}</button>
                    <button type="button" className="btn ghost" onClick={() => setMoNhapExcel(true)}>📥 Nhập Excel</button>
                    
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

          {/* KPI row — toàn số thật (08/10/2026: bỏ các ô demo "File đã nhập/xuất"…). */}
          <div className="kpi-grid">
            <Kpi ico="👥" icoClass="orange" label="Tổng sĩ số" value={fmt(tq?.tong_si_so ?? totalStudents)} />
            <Kpi ico="🏫" icoClass="orange" label="Lớp đang hoạt động" value={fmt(activeClasses)} />
            <Kpi ico="✅" icoClass="green" label={`Chuyên cần T${thang}`} value={tq?.chuyen_can != null ? `${vnPct(tq.chuyen_can)}%` : "—"} />
            <Kpi ico="📈" icoClass="orange" label="Hoàn thành lộ trình" value={loTrinhChung != null ? `${vnPct(loTrinhChung)}%` : "—"} />
            {tongNo != null ? <Kpi ico="💰" icoClass="blue" label="Học phí phải thu" value={rutGon(tongNo)} /> : null}
            {/* Ô bấm đóng / mở bảng tiến độ lộ trình + hoạt động tháng (08/10/2026). */}
            <Kpi
              ico="🗓️" icoClass="yellow" label="Tiến độ & hoạt động tháng"
              value={`${hoatDong.length} việc`}
              trend={moTienDo ? "▾ Bấm để đóng" : "▸ Bấm để xem"}
              onClick={() => setMoTienDo((v) => !v)} active={moTienDo}
            />
          </div>

          <div className="stack">
            {/* Bảng tiến độ lộ trình + hoạt động tháng — chỉ hiện khi bấm ô KPI
                "Tiến độ & hoạt động tháng" ở dải trên. */}
            {moTienDo ? (
            <div className="card">
              <div className="card-head">
                <h3>Tiến độ lộ trình &amp; hoạt động tháng {thang}/{nam}</h3>
                <button type="button" className="btn ghost sm" onClick={() => setMoTienDo(false)}>Đóng ✕</button>
              </div>
              <div className="grid c2">
                <div>
                  <div className="small muted bold mb12">Tiến độ theo lộ trình — buổi đã dạy theo lịch báo giảng / tổng buổi</div>
                  <TheoNhomMoRong
                nhom={theoNhom}
                giaTri={(n) => n.loTrinh}
                giaTriLop={(l) => (l.tong_buoi ? Math.min(100, Math.round((l.buoi_da_hoc / l.tong_buoi) * 1000) / 10) : null)}
                nhanLop={(l) => `${l.buoi_da_hoc}/${l.tong_buoi || "?"} buổi`}
              />
                </div>
                <div>
                  <div className="small muted bold mb12">Hoạt động tháng — từ Lịch làm việc</div>
                  <div className="list">
                {hoatDong.length ? hoatDong.map((h) => (
                  <div className="li" key={h.id}>
                    <div className="ico-sm" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>📅</div>
                    <div className="li-body">
                      <div className="li-title">{h.title}</div>
                      <div className="li-sub">{h.event_date ? new Date(h.event_date).toLocaleDateString("vi-VN") : ""}{h.assigned_to?.name ? ` · ${h.assigned_to.name}` : ""}</div>
                    </div>
                    <span className={`badge ${TRANG_THAI_VIEC[h.status]?.cls || "gray"}`}>{TRANG_THAI_VIEC[h.status]?.label || h.status}</span>
                  </div>
                )) : <div className="small muted">Tháng này chưa có việc nào ở mảng Học sinh - Lớp học trên Lịch làm việc.</div>}
              </div>
              <button type="button" className="btn ghost sm mt12" onClick={() => navigate("/calendar-detail")}>Mở Lịch làm việc →</button>
                </div>
              </div>
            </div>
            ) : null}

            {/* 1. Tổng quan sĩ số */}
            <div className="card">
              <div className="card-head"><h3>1. Tổng quan sĩ số</h3><span className="small muted">Học sinh đang học, theo lớp đang chạy</span></div>
              <div className="grid c3">
                <div>
                  <div className="small muted bold mb12">Theo cấp học</div>
                  <ThanhNgang rows={(tq?.cap_hoc || []).map((c) => ({ ten: c.ten, so: c.so }))} donVi="HS" />
                </div>
                <div>
                  <div className="small muted bold mb12">Theo chương trình</div>
                  <ThanhNgang rows={theoNhom.map((n) => ({ ten: n.ten, so: n.siSo }))} donVi="HS" />
                </div>
                <div>
                  <div className="small muted bold mb12">Theo khu vực</div>
                  <ThanhNgang rows={(tq?.khu_vuc || []).map((k) => ({ ten: k.ten, so: k.so }))} donVi="HS" />
                </div>
              </div>
            </div>

            {/* 2. Biểu đồ: sĩ số các lớp · phân loại học lực · doanh thu */}
            <div className={`grid ${tq?.doanh_thu?.length ? "c3" : "c2"}`}>
              <div className="card">
                <div className="card-head"><h3>Sĩ số học sinh các lớp</h3></div>
                <CotDung rows={lopDong.map((l) => ({ ten: l.class_code || l.name, so: l.si_so }))} cao={150} />
              </div>
              <div className="card">
                <div className="card-head"><h3>Phân loại học sinh</h3><span className="small muted">Giỏi ≥ 85% · Khá ≥ 70%</span></div>
                {xepLoaiChung.tong ? (
                  <ThanhNgang
                    rows={[
                      { ten: "Giỏi", so: xepLoaiChung.gioi, mau: GRADE_COLOR.gioi },
                      { ten: "Khá", so: xepLoaiChung.kha, mau: GRADE_COLOR.kha },
                      { ten: "Trung bình", so: xepLoaiChung.tb, mau: GRADE_COLOR.tb },
                    ]}
                    donVi="HS"
                  />
                ) : <div className="small muted">Chưa có bảng điểm tháng này.</div>}
              </div>
              {tq?.doanh_thu?.length ? (
                <div className="card">
                  <div className="card-head"><h3>Tổng doanh thu</h3><span className="small muted">Tiền đã thu theo tháng</span></div>
                  <CotDung rows={tq.doanh_thu.map((d) => ({ ten: `T${d.thang}`, so: d.da_thu, nhan: rutGon(d.da_thu) }))} cao={150} />
                </div>
              ) : null}
            </div>

            {/* 3. Chuyên cần — đóng mở; theo chương trình, bấm để xem từng lớp */}
            <details className="card fold" open>
              <summary><h3>Tỷ lệ chuyên cần tháng {thang}/{nam}</h3><span className="small muted">Có mặt ÷ sĩ số mỗi ca dạy đã báo cáo</span></summary>
              <TheoNhomMoRong
                nhom={theoNhom}
                giaTri={(n) => n.chuyenCan}
                giaTriLop={(l) => l.chuyen_can}
                nhanLop={(l) => (l.so_ca_chuyen_can ? `${l.so_ca_chuyen_can} ca` : "chưa có ca")}
                mau="green"
              />
            </details>

            {/* 6. Tổng quan lớp học — thay cho danh sách học viên + bảng kết quả cũ */}
            <div className="card">
              <div className="card-head" style={{ flexWrap: "wrap", gap: 8 }}>
                <h3>Tổng quan lớp học</h3>
                <input placeholder="Tìm lớp, mã lớp, chương trình..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                  style={{ flex: "0 1 260px", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 9, fontSize: 13 }} />
              </div>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Lớp</th><th className="t-center">Sĩ số</th><th>Lộ trình học</th><th className="t-center">Trạng thái</th>
                      <th>Tình hình học tập</th><th>Lưu ý</th>{tongNo != null ? <th className="t-right">Học phí phải thu</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {aggLoading && !tq ? (
                      <tr><td colSpan={7} className="muted" style={{ padding: 16, textAlign: "center" }}>Đang tải...</td></tr>
                    ) : lopLoc.length ? lopLoc.map((l) => {
                      const g = gradeByClass[l.id];
                      const st = CLASS_STATUS[l.status] || { label: l.status, cls: "gray" };
                      const pt = l.tong_buoi ? Math.min(100, Math.round((l.buoi_da_hoc / l.tong_buoi) * 100)) : null;
                      return (
                        <tr key={l.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/classrooms/${l.id}`)}>
                          <td className="bold">{l.class_code || l.name}<div className="small muted" style={{ fontWeight: 400 }}>{l.ten_nhom}{l.level_name ? ` · ${l.level_name}` : ""}</div></td>
                          <td className="t-center">{fmt(l.si_so)}</td>
                          <td style={{ minWidth: 140 }}>
                            <div className="small">{l.buoi_da_hoc}/{l.tong_buoi || "?"} buổi</div>
                            {pt != null ? <div className="prog" style={{ marginTop: 4 }}><i style={{ width: `${pt}%` }} /></div> : null}
                          </td>
                          <td className="t-center"><span className={`badge ${st.cls}`}>{st.label}</span></td>
                          <td className="small">
                            {g && g.graded ? (
                              <>
                                <b style={{ color: GRADE_COLOR.gioi }}>{g.gioi}</b> Giỏi · <b style={{ color: GRADE_COLOR.kha }}>{g.kha}</b> Khá · <b style={{ color: GRADE_COLOR.tb }}>{g.tb}</b> TB
                              </>
                            ) : <span className="muted">Chưa có điểm</span>}
                          </td>
                          <td className="small">{luuY(l, g).join(" · ") || <span className="muted">—</span>}</td>
                          {tongNo != null ? <td className="t-right">{l.hoc_phi_phai_thu ? <b style={{ color: "var(--danger)" }}>{fmt(Math.round(l.hoc_phi_phai_thu))}</b> : <span className="muted">0</span>}</td> : null}
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={7} className="muted" style={{ padding: 16, textAlign: "center" }}>Không có lớp học phù hợp.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="card-head"><h3>Vinh danh học sinh tiêu biểu</h3><span className="badge gray" style={{ fontSize: 9 }}>Demo</span></div>
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
        </div>

        {/* Right sidebar — lớp cần theo dõi suy từ số thật */}
        <div className="rightbar">
          <div className="card">
            <div className="card-head"><h3>Lớp cần theo dõi</h3><span className="small muted">{canTheoDoi.length} lớp</span></div>
            <div className="list">
              {canTheoDoi.length ? canTheoDoi.slice(0, 12).map((l) => (
                <div className="li" key={l.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/classrooms/${l.id}`)}>
                  <div className="ico-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>⚠️</div>
                  <div className="li-body"><div className="li-title" style={{ fontSize: 12.5 }}>{l.class_code || l.name}</div><div className="li-sub">{l.lyDo}</div></div>
                </div>
              )) : <div className="small muted">Không có lớp nào cần chú ý.</div>}
            </div>
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
                <CenterField centers={centers} value={createCenter} onChange={(e) => setCreateCenter(e.target.value)} placeholder="-- Chọn cơ sở --" />
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
            <CenterField centers={centers} value={importCenter} onChange={(e) => setImportCenter(e.target.value)} placeholder="-- Không gán --" />
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
            <CenterField centers={centers} value={rosterCenter} onChange={(e) => setRosterCenter(e.target.value)} placeholder="-- Chọn cơ sở --" />
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

      <BulkImportModal
        loai="hocSinh"
        open={moNhapExcel}
        onClose={() => setMoNhapExcel(false)}
        onXong={() => setReloadKey((v) => v + 1)}
      />
    </div>
  );
}

export default Students;
