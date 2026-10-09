import BulkImportModal from "../components/bulk/BulkImportModal";
import { VAI_QUAN_TRI } from "../auth/permissions";
import DanhSachHocVien from "../components/students/DanhSachHocVien";
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

/** "↑ +18 so với T9" — xanh khi tăng, đỏ khi giảm. */
const soSanh = (chenh, sau, donVi = "") => {
  if (chenh == null || Number.isNaN(chenh)) return null;
  const tang = chenh >= 0;
  return (
    <span className="small" style={{ color: tang ? "var(--success)" : "var(--danger)", fontWeight: 700 }}>
      {tang ? "↑" : "↓"} {tang ? "+" : ""}{vnPct(chenh)}{donVi} <span className="muted" style={{ fontWeight: 400 }}>{sau}</span>
    </span>
  );
};

const MAU_VONG = ["#F26522", "#C0392B", "#2E9E5B", "#3B82F6", "#8B5CF6", "#D9822B"];

/** Vòng tròn có tổng ở giữa + chú thích (cấp học, chương trình). */
function VongTron({ rows, tong }) {
  const t = rows.reduce((a, r) => a + (r.so || 0), 0) || 1;
  const size = 130, day = 22, r = (size - day) / 2, c = size / 2, chuVi = 2 * Math.PI * r;
  let lech = 0;
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="#EFE7DB" strokeWidth={day} />
        {rows.map((x, i) => {
          const dai = ((x.so || 0) / t) * chuVi;
          const el = (
            <circle key={x.ten} cx={c} cy={c} r={r} fill="none" stroke={MAU_VONG[i % MAU_VONG.length]} strokeWidth={day}
              strokeDasharray={`${dai} ${chuVi - dai}`} strokeDashoffset={-lech} transform={`rotate(-90 ${c} ${c})`} />
          );
          lech += dai;
          return el;
        })}
        <text x={c} y={c} textAnchor="middle" fontSize="22" fontWeight="800" fill="#43301F">{fmt(tong ?? t)}</text>
        <text x={c} y={c + 16} textAnchor="middle" fontSize="10.5" fill="#8a7a66">học sinh</text>
      </svg>
      <div style={{ width: "100%" }}>
        {rows.map((x, i) => (
          <div key={x.ten} className="flex-between small" style={{ marginBottom: 3 }}>
            <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: MAU_VONG[i % MAU_VONG.length], marginRight: 6 }} />{x.ten}</span>
            <b>{fmt(x.so)} ({vnPct(pct1(x.so || 0, t))}%)</b>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Học sinh vào / ra theo tháng: hai cột + đường biến động ròng. */
function BieuDoVaoRa({ rows }) {
  if (!rows.length) return <div className="small muted">Chưa có dữ liệu.</div>;
  const W = 360, H = 150, dem = 22, cot = (W - dem) / rows.length;
  const max = Math.max(1, ...rows.flatMap((r) => [r.vao, r.ra, Math.abs(r.vao - r.ra)]));
  const y = (v) => H - 18 - (v / max) * (H - 34);
  const diem = rows.map((r, i) => `${dem + i * cot + cot / 2},${y(Math.max(0, r.vao - r.ra))}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      {rows.map((r, i) => {
        const x0 = dem + i * cot + cot * 0.18;
        const w = cot * 0.3;
        return (
          <g key={`${r.nam}-${r.thang}`}>
            <rect x={x0} y={y(r.vao)} width={w} height={H - 18 - y(r.vao)} rx="3" fill="#F26522"><title>{`Vào: ${r.vao}`}</title></rect>
            <rect x={x0 + w + 2} y={y(r.ra)} width={w} height={H - 18 - y(r.ra)} rx="3" fill="#F8C9A8"><title>{`Ra: ${r.ra}`}</title></rect>
            <text x={dem + i * cot + cot / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="#8a7a66">T{r.thang}</text>
          </g>
        );
      })}
      <polyline points={diem} fill="none" stroke="#C0392B" strokeWidth="2" />
      {rows.map((r, i) => <circle key={i} cx={dem + i * cot + cot / 2} cy={y(Math.max(0, r.vao - r.ra))} r="3.5" fill="#C0392B" />)}
      <g fontSize="10" fill="#8a7a66">
        <rect x={dem} y="2" width="9" height="9" fill="#F26522" /><text x={dem + 13} y="10">Vào</text>
        <rect x={dem + 48} y="2" width="9" height="9" fill="#F8C9A8" /><text x={dem + 61} y="10">Ra</text>
        <line x1={dem + 92} y1="6" x2={dem + 108} y2="6" stroke="#C0392B" strokeWidth="2" /><text x={dem + 112} y="10">Biến động ròng</text>
      </g>
    </svg>
  );
}

/** Sĩ số từng lớp (cam) cạnh sức chứa tối đa (cam nhạt, nếu lớp có khai). */
function SiSoCacLop({ rows }) {
  if (!rows.length) return <div className="small muted">Chưa có lớp.</div>;
  const max = Math.max(1, ...rows.map((r) => Math.max(r.si_so, r.max_students || 0)));
  const cao = 130;
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, minWidth: rows.length * 40, height: cao + 40 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ flex: "1 0 32px", textAlign: "center" }} title={`${r.class_code || r.name}: ${r.si_so}${r.max_students ? `/${r.max_students}` : ""} HS`}>
            <div className="small" style={{ fontSize: 10.5, fontWeight: 800 }}>{r.si_so}</div>
            <div style={{ position: "relative", height: cao, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
              {r.max_students ? <div style={{ position: "absolute", bottom: 0, width: "70%", height: `${(r.max_students / max) * cao}px`, background: "#F8D2B8", borderRadius: "5px 5px 0 0" }} /> : null}
              <div style={{ position: "relative", width: "48%", height: `${(r.si_so / max) * cao}px`, background: "#F26522", borderRadius: "5px 5px 0 0" }} />
            </div>
            <div className="small muted" style={{ fontSize: 10, marginTop: 3, whiteSpace: "nowrap" }}>{r.class_code || r.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
        {trend == null || trend === "" ? null
          : typeof trend === "string" ? <span className="small muted">{trend}</span>
            : trend}
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
  const [tab, setTab] = useState("tq"); // tq = Tổng quan phân tích, ds = Danh sách & Quản lý
  const [nhomLoc, setNhomLoc] = useState("");
  const [trangThaiLoc, setTrangThaiLoc] = useState("");
  const [aggLoading, setAggLoading] = useState(true);
  const homNay = new Date();
  const thang = homNay.getMonth() + 1;
  const nam = homNay.getFullYear();
  const thangTruoc = thang === 1 ? 12 : thang - 1;

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
    return lopDong.filter((l) => (!q || `${l.name || ""} ${l.class_code || ""} ${l.program_name || ""}`.toLowerCase().includes(q))
      && (!trangThaiLoc || l.status === trangThaiLoc));
  }, [lopDong, search, trangThaiLoc]);
  const lopTheoNhom = useMemo(
    () => lopDong.filter((l) => l.status === "active" && (!nhomLoc || (l.nhom || "khac") === nhomLoc)),
    [lopDong, nhomLoc],
  );

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
                <p>Quản trị đào tạo • Student &amp; Class Management</p>
                <div className="flex" style={{ gap: 8, marginTop: 12 }}>
                  <button type="button" className={`btn ${tab === "tq" ? "primary" : "ghost"}`} onClick={() => setTab("tq")}>Tổng quan phân tích</button>
                  <button type="button" className={`btn ${tab === "ds" ? "primary" : "ghost"}`} onClick={() => setTab("ds")}>Danh sách &amp; Quản lý</button>
                </div>
              </div>
              <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn ghost" onClick={() => navigate("/chuong-trinh")}>📊 Chi tiết theo chương trình</button>
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

          {tab === "ds" ? (
            <DanhSachHocVien
              lops={classes}
              coQuyenChoNghi={["superadmin", "admin", "center_manager"].includes(role)}
              onNotice={setNotice}
            />
          ) : (
          <>
          {/* KPI — theo mẫu thiết kế 09/10/2026, có so với tháng trước. */}
          <div className="kpi-grid hs-kpi">
            <Kpi ico="👥" icoClass="orange" label="Tổng số HS" value={fmt(tq?.tong_si_so ?? totalStudents)}
              trend={tq ? soSanh(tq.tong_si_so - tq.tong_si_so_truoc, `so với T${thangTruoc}`) : null} />
            <Kpi ico="🏫" icoClass="orange" label="Lớp đang hoạt động" value={fmt(activeClasses)}
              trend={`/ ${fmt(classes.length)} lớp trên hệ thống`} />
            <Kpi ico="✅" icoClass="green" label={`Chuyên cần T${thang}`} value={tq?.chuyen_can != null ? `${vnPct(tq.chuyen_can)}%` : "—"}
              trend={tq?.chuyen_can != null && tq?.chuyen_can_truoc != null
                ? soSanh(Math.round((tq.chuyen_can - tq.chuyen_can_truoc) * 10) / 10, `so với T${thangTruoc}`, "%") : null} />
            <Kpi ico="📊" icoClass="blue" label="Biến động HS" value={tq ? `+${tq.vao_thang} / -${tq.ra_thang}` : "—"} trend="HS vào / HS ra" />
            {tongNo != null ? <Kpi ico="💰" icoClass="yellow" label="Học phí phải thu" value={rutGon(tongNo)} trend={`${lopDong.filter((l) => l.hoc_phi_phai_thu > 0).length} lớp còn nợ`} /> : null}
            <Kpi
              ico="🗓️" icoClass="orange" label="Công việc cần theo dõi" value={`${tq?.viec_can_theo_doi ?? hoatDong.length} việc`}
              trend={moTienDo ? "▾ Bấm để đóng" : "▸ Tiến độ & hoạt động tháng"}
              onClick={() => setMoTienDo((v) => !v)} active={moTienDo}
            />
          </div>

          {moTienDo ? (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-head">
                <h3>Tiến độ lộ trình &amp; hoạt động tháng {thang}/{nam}</h3>
                <span className="small muted">Hoàn thành lộ trình chung: {loTrinhChung != null ? `${vnPct(loTrinhChung)}%` : "—"}</span>
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

          {/* Hàng biểu đồ 1 + cột "Cần theo dõi" bên phải */}
          <div className="hs-grid">
            <div className="card hs-a">
              <div className="card-head"><h3>Biến động học sinh vào / ra</h3><span className="small muted">6 tháng gần nhất</span></div>
              <BieuDoVaoRa rows={tq?.bien_dong || []} />
              <div className="small muted" style={{ marginTop: 6 }}>Vào = hồ sơ mới tạo trong tháng (kể cả đợt nhập file) · Ra = ngày cho nghỉ.</div>
            </div>
            <div className="card hs-b">
              <div className="card-head"><h3>Phân tích theo cấp học</h3></div>
              <VongTron tong={tq?.tong_si_so} rows={(tq?.cap_hoc || []).map((c) => ({ ten: c.ten, so: c.so }))} />
            </div>
            <div className="card hs-c">
              <div className="card-head"><h3>Phân tích theo chương trình</h3></div>
              <VongTron tong={tq?.tong_si_so} rows={theoNhom.map((n) => ({ ten: n.ten, so: n.siSo }))} />
            </div>
            <div className="card hs-d">
              <div className="card-head"><h3>Phân tích theo khu vực</h3></div>
              <CotDung rows={(tq?.khu_vuc || []).filter((k) => k.ten !== "Khác" && k.ten !== "Chưa có địa chỉ").slice(0, 6).map((k) => ({ ten: k.ten, so: k.so }))} cao={110} />
              <div className="small muted" style={{ marginTop: 4 }}>
                {(tq?.khu_vuc || []).filter((k) => k.ten === "Khác" || k.ten === "Chưa có địa chỉ").map((k) => `${k.ten}: ${k.so}`).join(" · ")}
              </div>
            </div>
            <div className="card hs-e">
              <div className="card-head"><h3>Cần theo dõi</h3><span className="small muted">{canTheoDoi.length} lớp</span></div>
              <div className="list" style={{ maxHeight: 420, overflowY: "auto" }}>
                {canTheoDoi.length ? canTheoDoi.map((l) => (
                  <div className="li" key={l.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/classrooms/${l.id}`)}>
                    <div className="ico-sm" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>⚠️</div>
                    <div className="li-body"><div className="li-title" style={{ fontSize: 12.5 }}>{l.class_code || l.name}</div><div className="li-sub">{l.lyDo}</div></div>
                    <span className="muted">›</span>
                  </div>
                )) : <div className="small muted">Không có lớp nào cần chú ý.</div>}
              </div>
            </div>
            <div className="card hs-f">
              <div className="card-head"><h3>Phân loại học sinh</h3></div>
              <ThanhNgang
                rows={[
                  { ten: "Giỏi", so: xepLoaiChung.gioi, mau: GRADE_COLOR.gioi },
                  { ten: "Khá", so: xepLoaiChung.kha, mau: GRADE_COLOR.kha },
                  { ten: "Trung bình", so: xepLoaiChung.tb, mau: GRADE_COLOR.tb },
                  { ten: "Chưa đánh giá", so: Math.max(0, (tq?.tong_si_so || 0) - xepLoaiChung.tong), mau: "#C9BBA8" },
                ]}
                donVi="HS"
              />
            </div>
            {tq?.doanh_thu?.length ? (
              <div className="card hs-g">
                <div className="card-head"><h3>Doanh thu theo tháng</h3><span className="small muted">Đơn vị: triệu đồng</span></div>
                <CotDung rows={tq.doanh_thu.map((d) => ({ ten: `T${d.thang}`, so: d.da_thu, nhan: vnPct(Math.round(d.da_thu / 1e5) / 10) }))} cao={110} />
              </div>
            ) : null}
            <div className="card hs-h">
              <div className="card-head"><h3>Tỷ lệ chuyên cần theo chương trình</h3><span className="small muted">Bấm để xem từng lớp</span></div>
              <TheoNhomMoRong
                nhom={theoNhom}
                giaTri={(n) => n.chuyenCan}
                giaTriLop={(l) => l.chuyen_can}
                nhanLop={(l) => (l.so_ca_chuyen_can ? `${l.so_ca_chuyen_can} ca` : "chưa có ca")}
                mau="green"
              />
            </div>
          </div>

          {/* Sĩ số các lớp đang hoạt động — so với sức chứa tối đa của lớp */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-head" style={{ flexWrap: "wrap", gap: 8 }}>
              <h3 style={{ color: "var(--primary)" }}>👥 Sĩ số {lopTheoNhom.length} lớp đang hoạt động</h3>
              <div className="flex" style={{ gap: 12, alignItems: "center" }}>
                <span className="small"><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 9, background: "#F26522", marginRight: 5 }} />Sĩ số hiện tại</span>
                <span className="small"><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 9, background: "#F8D2B8", marginRight: 5 }} />Sức chứa tối đa</span>
                <select value={nhomLoc} onChange={(e) => setNhomLoc(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <option value="">Tất cả chương trình</option>
                  {theoNhom.map((n) => <option key={n.ma} value={n.ma}>{n.ten}</option>)}
                </select>
              </div>
            </div>
            <SiSoCacLop rows={lopTheoNhom} />
            {!lopTheoNhom.some((l) => l.max_students) ? (
              <div className="small muted">Chưa lớp nào khai sức chứa tối đa — điền ở Quản lý lớp → Sửa lớp.</div>
            ) : null}
          </div>

          {/* Tổng quan lớp học */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-head" style={{ flexWrap: "wrap", gap: 8 }}>
              <h3>Tổng quan lớp học</h3>
              <div className="flex" style={{ gap: 8 }}>
                <input placeholder="Tìm lớp, mã lớp, chương trình..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                  style={{ width: 240, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 9, fontSize: 13 }} />
                <select value={trangThaiLoc} onChange={(e) => setTrangThaiLoc(e.target.value)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--border)" }}>
                  <option value="">Tất cả trạng thái</option>
                  {Object.entries(CLASS_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Lớp</th><th className="t-center">Sĩ số</th><th>Lộ trình học</th><th className="t-center">Trạng thái</th>
                    <th>Tình hình học tập</th><th className="t-center">Chuyên cần</th>{tongNo != null ? <th className="t-center">Học phí</th> : null}
                    <th>Ghi chú</th><th className="t-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {aggLoading && !tq ? (
                    <tr><td colSpan={9} className="muted" style={{ padding: 16, textAlign: "center" }}>Đang tải...</td></tr>
                  ) : lopLoc.length ? lopLoc.map((l) => {
                    const g = gradeByClass[l.id];
                    const st = CLASS_STATUS[l.status] || { label: l.status, cls: "gray" };
                    const pt = l.tong_buoi ? Math.min(100, Math.round((l.buoi_da_hoc / l.tong_buoi) * 100)) : null;
                    return (
                      <tr key={l.id}>
                        <td className="bold" style={{ cursor: "pointer" }} onClick={() => navigate(`/classrooms/${l.id}`)}>
                          {l.class_code || l.name}<div className="small muted" style={{ fontWeight: 400 }}>{l.ten_nhom}{l.level_name ? ` - ${l.level_name}` : ""}</div>
                        </td>
                        <td className="t-center">{fmt(l.si_so)}{l.max_students ? <span className="small muted">/{l.max_students}</span> : null}</td>
                        <td style={{ minWidth: 130 }}>
                          <div className="small">{l.buoi_da_hoc}/{l.tong_buoi || "?"} buổi</div>
                          {pt != null ? <div className="prog" style={{ marginTop: 4 }}><i style={{ width: `${pt}%` }} /></div> : null}
                        </td>
                        <td className="t-center"><span className={`badge ${st.cls}`}>{st.label}</span></td>
                        <td className="small">
                          {g && g.graded ? (
                            <><b style={{ color: GRADE_COLOR.gioi }}>{g.gioi}</b> Giỏi · <b style={{ color: GRADE_COLOR.kha }}>{g.kha}</b> Khá · <b style={{ color: GRADE_COLOR.tb }}>{g.tb}</b> TB</>
                          ) : <span className="muted">Chưa có điểm</span>}
                        </td>
                        <td className="t-center">
                          {l.chuyen_can != null ? <span className={`badge ${l.chuyen_can >= 90 ? "green" : "orange"}`}>{vnPct(l.chuyen_can)}%</span> : <span className="muted">—</span>}
                        </td>
                        {tongNo != null ? (
                          <td className="t-center">
                            {l.hoc_phi_phai_thu > 0
                              ? <span className="badge red" title={fmt(Math.round(l.hoc_phi_phai_thu))}>Còn nợ học phí</span>
                              : <span className="badge green">Đã thu đủ</span>}
                          </td>
                        ) : null}
                        <td className="small">{luuY(l, g).filter((x) => x !== "Còn nợ học phí").join(" · ") || <span className="muted">—</span>}</td>
                        <td className="t-center">
                          <select value="" onChange={(e) => {
                            if (e.target.value === "xem") navigate(`/classrooms/${l.id}`);
                            if (e.target.value === "sua") navigate(`/quan-ly-lop?lop=${l.id}&tab=hocvien`);
                          }} style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 800 }} aria-label="Thao tác">
                            <option value="">⋯</option>
                            <option value="xem">Xem chi tiết lớp</option>
                            {canManage ? <option value="sua">Sửa lớp / học viên</option> : null}
                          </select>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={9} className="muted" style={{ padding: 16, textAlign: "center" }}>Không có lớp học phù hợp.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </>
          )}
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
