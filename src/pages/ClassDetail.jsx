import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { listStudents, listClassroomsAll, listStudentScores, listEvaluationItems, getTuitionSummary, listAttendanceSummary } from "../services/calendarService";
import { useAuth } from "../auth/AuthProvider";
import { skillsFor } from "../utils/skills";
import { tuitionByNormCode, normCode } from "../utils/classCode";
import "../styles/vista4.css";

// ---- Nhãn / helper dùng chung với hệ thống VISTA 4.0 ----
const fmt = (n) => (Number(n) || 0).toLocaleString("vi-VN");
const money = (n) => `${(Number(n) || 0).toLocaleString("vi-VN")} đ`;

const DELIVERY = { online: "Online", offline: "Trực tiếp", hybrid: "Kết hợp" };

const CLASS_STATUS = {
  active: { label: "Đang hoạt động", cls: "green" },
  paused: { label: "Tạm dừng", cls: "orange" },
  draft: { label: "Nháp", cls: "gray" },
  completed: { label: "Hoàn thành", cls: "blue" },
  closed: { label: "Đã đóng", cls: "red" },
};

const STUDENT_STATUS = {
  active: { label: "Đang học", cls: "green" },
  paused: { label: "Tạm nghỉ", cls: "orange" },
  graduated: { label: "Tốt nghiệp", cls: "blue" },
  withdrawn: { label: "Đã nghỉ", cls: "red" },
};

const GENDER = { male: "Nam", female: "Nữ" };

// Ba nhóm năng lực — echo màn hình tham chiếu (Giỏi ≥ 80 / Khá 65–79 / TB < 65).
const BANDS = [
  { key: "gioi", label: "Giỏi", tag: "🏆 Top đầu", cls: "green", bar: "var(--success)" },
  { key: "kha", label: "Khá", tag: "🎖 Nhóm Khá", cls: "blue", bar: "var(--info)" },
  { key: "tb", label: "Trung bình", tag: "👥 Nhóm Trung bình", cls: "orange", bar: "var(--warn)" },
];

// Trạng thái theo dõi suy ra TỪ điểm thật (không phải demo).
const FOLLOW = {
  gioi: { label: "Ổn định", cls: "green" },
  kha: { label: "Theo dõi", cls: "blue" },
  tb: { label: "Cần hỗ trợ", cls: "orange" },
};

const bandOf = (pct) => (pct >= 80 ? "gioi" : pct >= 65 ? "kha" : "tb");

const fmtDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("vi-VN");
};

const dash = (v) => (v === null || v === undefined || v === "" ? "—" : v);

// Họ tên học sinh: last_name + first_name (thứ tự tiếng Việt), fallback username.
const studentName = (s) => {
  const u = s?.user || s || {};
  const full = `${u.last_name || ""} ${u.first_name || ""}`.trim();
  return full || u.username || "—";
};

const initials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase() || "?";

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

// Dòng key/value trong card tổng quan. `demo` gắn nhãn xám cho trường minh hoạ.
function KV({ k, demo, children }) {
  return (
    <div className="kv">
      <span className="k">
        {k}
        {demo ? (
          <span className="badge gray" style={{ padding: "1px 7px", fontSize: 9 }}>Demo</span>
        ) : null}
      </span>
      <span className="v">{children}</span>
    </div>
  );
}

// Thẻ vinh danh học sinh trong 1 nhóm năng lực.
function Honor({ name, pct, cls }) {
  return (
    <div className="honor">
      <div
        className="avatar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--primary-soft)",
          color: "var(--primary)",
          fontWeight: 700,
        }}
      >
        {initials(name)}
      </div>
      <b>{name}</b>
      <small>Điểm TB</small>
      <span className={`badge ${cls}`} style={{ marginTop: 8 }}>{Math.round(pct)}%</span>
    </div>
  );
}

export default function ClassDetail() {
  const { classroomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isTeacher = role === "teacher";

  // Lớp truyền qua state từ ProgramDetail (ưu tiên) — nếu không có sẽ tự tra cứu.
  const [cls, setCls] = useState(location.state?.classroom || null);
  const [clsLoading, setClsLoading] = useState(!location.state?.classroom);

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [scores, setScores] = useState([]);
  const [scoresLoading, setScoresLoading] = useState(true);

  const [evalItems, setEvalItems] = useState([]);

  // Học phí (thật) — Map(normCode -> {total_fee, remaining, paid, students}).
  const [tuitionMap, setTuitionMap] = useState(null);
  // Chuyên cần (thật) — Map(classroom_id -> {rate, total, attended, absent}).
  const [attendanceMap, setAttendanceMap] = useState(null);

  // Tra cứu lớp (fallback) khi mở trực tiếp bằng URL, không có location.state.
  useEffect(() => {
    let active = true;
    if (location.state?.classroom) {
      setCls(location.state.classroom);
      setClsLoading(false);
      return () => { active = false; };
    }
    setClsLoading(true);
    listClassroomsAll()
      .then((rows) => {
        if (!active) return;
        const list = Array.isArray(rows) ? rows : rows?.results || [];
        const found = list.find((c) => String(c.id) === String(classroomId)) || null;
        setCls(found);
      })
      .catch(() => { if (active) setCls(null); })
      .finally(() => { if (active) setClsLoading(false); });
    return () => { active = false; };
  }, [classroomId, location.state?.classroom]);

  // Danh sách học sinh trong lớp.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    listStudents({ classroom: classroomId, page_size: 100 })
      .then((res) => {
        if (!active) return;
        setStudents(Array.isArray(res?.results) ? res.results : []);
      })
      .catch(() => {
        if (!active) return;
        setStudents([]);
        setError("Không thể tải danh sách học sinh của lớp.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [classroomId]);

  // Điểm học sinh của lớp (thật) — nhiều lớp import chưa có điểm => xử lý rỗng gọn gàng.
  useEffect(() => {
    let active = true;
    setScoresLoading(true);
    listStudentScores({ classroom: classroomId, page_size: 100 })
      .then((res) => {
        if (!active) return;
        setScores(Array.isArray(res?.results) ? res.results : []);
      })
      .catch(() => { if (active) setScores([]); })
      .finally(() => { if (active) setScoresLoading(false); });
    return () => { active = false; };
  }, [classroomId]);

  // Đầu mục đánh giá / kỹ năng THẬT từ API (fallback hardcode nếu chưa tải được).
  useEffect(() => {
    let active = true;
    listEvaluationItems()
      .then((rows) => { if (active) setEvalItems(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (active) setEvalItems([]); });
    return () => { active = false; };
  }, []);

  // Học phí (toàn khoá 2026) + chuyên cần của lớp này — THẬT, tải 1 lần.
  useEffect(() => {
    let active = true;
    // Giáo viên không có quyền xem học phí (backend 403) -> không gọi API.
    if (!isTeacher) {
      getTuitionSummary({ year: 2026 })
        .then((data) => { if (active) setTuitionMap(tuitionByNormCode(data?.by_class || [])); })
        .catch(() => { if (active) setTuitionMap(new Map()); });
    }
    listAttendanceSummary({ classroom: classroomId })
      .then((data) => {
        if (!active) return;
        const m = new Map();
        (data?.results || []).forEach((r) => { m.set(String(r.classroom_id), r); });
        setAttendanceMap(m);
      })
      .catch(() => { if (active) setAttendanceMap(new Map()); });
    return () => { active = false; };
  }, [classroomId, isTeacher]);

  // ---- Trường hiển thị của lớp (chịu được cả 2 shape: overview & classroomsAll) ----
  const info = useMemo(() => {
    const c = cls || {};
    const teacherNames = Array.isArray(c.teacher_names) ? c.teacher_names.filter(Boolean) : [];
    return {
      name: c.name || c.class_name || `Lớp #${classroomId}`,
      code: c.class_code || "",
      program: c.program_name || "",
      level: c.level_name || "",
      center: c.center?.name || c.center_name || (typeof c.center === "string" ? c.center : ""),
      delivery: c.delivery_mode ? DELIVERY[c.delivery_mode] || c.delivery_mode : "",
      status: c.status || "",
      teachers: teacherNames,
      // student_count từ overview nếu có; nếu không dùng số HS thực tế tải được.
      count: Number.isFinite(Number(c.student_count)) && c.student_count != null ? Number(c.student_count) : null,
      // session_count chỉ có ở shape overview.
      sessionCount:
        Number.isFinite(Number(c.session_count)) && c.session_count != null ? Number(c.session_count) : null,
    };
  }, [cls, classroomId]);

  // Lớp có DUY NHẤT một chương trình -> 4 nhãn kỹ năng dùng cho cột & key skill_scores.
  const skills = useMemo(() => skillsFor(info.program, evalItems), [info.program, evalItems]);

  const total = students.length || info.count || 0;
  const statusMeta = CLASS_STATUS[info.status] || null;
  const statusBadge = statusMeta ? (
    <span className={`badge ${statusMeta.cls}`}>{statusMeta.label}</span>
  ) : (
    <span className="badge gray">—</span>
  );

  // Tổng số buổi của chương trình: "60 BUỔI STARTER" -> 60. Không khớp -> null (không bịa).
  const totalBuoi = useMemo(() => {
    const m = /(\d+)\s*BUỔI/i.exec(info.program || "");
    return m ? Number(m[1]) : null;
  }, [info.program]);

  const buoiKnown = info.sessionCount != null && totalBuoi != null;
  const buoiValue = buoiKnown ? `${info.sessionCount}/${totalBuoi}` : "—";
  const buoiSub = totalBuoi != null
    ? `Đã học ${info.sessionCount ?? "—"} / ${totalBuoi} buổi`
    : "Chương trình chưa gắn tổng số buổi";

  // ---- Học phí lớp (THẬT) — tra theo normCode(mã lớp); ~18/23 lớp có dữ liệu. ----
  const tuition = useMemo(
    () => (tuitionMap ? tuitionMap.get(normCode(info.code)) || null : null),
    [tuitionMap, info.code],
  );

  // ---- Chuyên cần lớp (THẬT) — tỉ lệ theo classroom_id; chỉ vài lớp có điểm danh. ----
  const attendance = useMemo(
    () => (attendanceMap ? attendanceMap.get(String(classroomId)) || null : null),
    [attendanceMap, classroomId],
  );
  const attendanceRate =
    attendance && attendance.rate != null && Number.isFinite(Number(attendance.rate))
      ? Number(attendance.rate)
      : null;

  // ---- Phân nhóm năng lực (THẬT từ listStudentScores) ----
  // Gom điểm theo học sinh: pct trung bình = numeric_score / assessment_max_score * 100.
  const scoreAgg = useMemo(() => {
    const acc = new Map();
    scores.forEach((r) => {
      const id = r?.student;
      if (id == null) return;
      const val = Number(r.numeric_score);
      const maxS = Number(r.assessment_max_score);
      const hasNumeric = Number.isFinite(val) && Number.isFinite(maxS) && maxS > 0;
      const sk = r.skill_scores;
      const hasSkills = sk && typeof sk === "object" && !Array.isArray(sk) && Object.keys(sk).length > 0;
      if (!hasNumeric && !hasSkills) return;
      if (!acc.has(id)) {
        acc.set(id, {
          sum: 0, n: 0, name: r.student_name || "", grade_label: "", comment: "", status: r.status || "",
          skillSums: {}, skillN: {},
        });
      }
      const e = acc.get(id);
      if (hasNumeric) {
        e.sum += (val / maxS) * 100;
        e.n += 1;
      }
      // Cộng dồn từng kỹ năng qua các hàng điểm; bỏ qua giá trị thiếu/không phải số.
      if (hasSkills) {
        Object.entries(sk).forEach(([label, raw]) => {
          const num = Number(raw);
          if (!Number.isFinite(num)) return;
          e.skillSums[label] = (e.skillSums[label] || 0) + num;
          e.skillN[label] = (e.skillN[label] || 0) + 1;
        });
      }
      if (r.student_name) e.name = r.student_name;
      if (r.grade_label) e.grade_label = r.grade_label;
      if (r.teacher_comment) e.comment = r.teacher_comment;
      if (r.status) e.status = r.status;
    });
    const map = new Map();
    acc.forEach((e, id) => {
      // Chốt điểm TB mỗi kỹ năng của học sinh (trung bình các hàng có kỹ năng đó).
      const skillsAvg = {};
      Object.keys(e.skillN).forEach((label) => {
        if (e.skillN[label] > 0) skillsAvg[label] = e.skillSums[label] / e.skillN[label];
      });
      // Giữ nguyên hành vi cũ cho phân nhóm/điểm tổng: chỉ tính HS có điểm số hợp lệ.
      if (e.n > 0) map.set(id, { ...e, avg: e.sum / e.n, skills: skillsAvg });
    });
    return map;
  }, [scores]);

  const scoredCount = scoreAgg.size;

  // Tên học sinh lấy từ roster thật (listStudents) — vì listStudentScores không trả student_name.
  const nameById = useMemo(() => {
    const m = new Map();
    students.forEach((s) => m.set(s.id, studentName(s)));
    return m;
  }, [students]);

  const groups = useMemo(() => {
    const g = { gioi: [], kha: [], tb: [] };
    scoreAgg.forEach((e, id) => { g[bandOf(e.avg)].push({ id, ...e, name: nameById.get(id) || e.name || `HS #${id}` }); });
    Object.values(g).forEach((arr) => arr.sort((a, b) => b.avg - a.avg));
    return g;
  }, [scoreAgg, nameById]);

  const classAvg = useMemo(() => {
    if (!scoreAgg.size) return null;
    let s = 0;
    scoreAgg.forEach((e) => { s += e.avg; });
    return s / scoreAgg.size;
  }, [scoreAgg]);

  // Có bất kỳ học sinh nào đã nhập điểm kỹ năng chưa (để tránh dán nhãn "Demo" lên dữ liệu rỗng).
  const anySkillScores = useMemo(() => {
    for (const e of scoreAgg.values()) {
      if (e.skills && Object.keys(e.skills).length) return true;
    }
    return false;
  }, [scoreAgg]);

  // Điểm TB lớp theo từng kỹ năng (0-100): trung bình trên các HS có kỹ năng đó.
  const skillAvgs = useMemo(() => {
    const out = {};
    skills.forEach((label) => {
      let sum = 0, n = 0;
      scoreAgg.forEach((e) => {
        const v = e.skills ? e.skills[label] : undefined;
        if (Number.isFinite(v)) { sum += v; n += 1; }
      });
      out[label] = n > 0 ? sum / n : null;
    });
    return out;
  }, [scoreAgg, skills]);

  // Bảng "Kết quả học tập chi tiết": ưu tiên roster thật; nếu roster rỗng nhưng có điểm thì
  // dùng chính danh sách điểm (để không giấu dữ liệu thật).
  const detailRows = useMemo(() => {
    if (students.length) {
      return students.map((s) => ({ id: s.id, name: studentName(s), agg: scoreAgg.get(s.id) || null }));
    }
    return [...scoreAgg.entries()].map(([id, e]) => ({ id, name: e.name || `HS #${id}`, agg: e }));
  }, [students, scoreAgg]);

  const groupPct = (n) => (scoredCount ? Math.round((n / scoredCount) * 100) : 0);
  const groupAvg = (arr) => (arr.length ? arr.reduce((s, x) => s + x.avg, 0) / arr.length : 0);

  return (
    <div className="v4page cd-print">
      {/* CSS in ấn cục bộ cho trang này. DashboardLayout dùng CSS module (tên class bị hash)
          nên không thể nhắm .sidebar/.topbar từ đây — dùng kỹ thuật ẩn toàn bộ rồi chỉ hiện
          lại vùng .cd-print, đồng thời gỡ giới hạn cuộn (dashboard: height:100vh + overflow)
          để báo cáo in được nhiều trang thay vì cắt cụt 1 màn hình. */}
      <style>{`
        @media print {
          html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
          body * { visibility: hidden !important; }
          .cd-print, .cd-print * { visibility: visible !important; }
          .cd-print .no-print { display: none !important; }
          .cd-print .tbl-wrap { overflow: visible !important; }
          .cd-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
          }
        }
      `}</style>
      <div className="content-col">
        {/* 1. Header + breadcrumb + hành động */}
        <div className="page-head">
          <div className="crumb">
            <Link to="/students">Học sinh - Lớp học</Link>{" / "}
            <Link to="/chuong-trinh">Chi tiết theo chương trình</Link>{" / "}
            <span>{info.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <h1>Chi tiết lớp {info.name}</h1>
              <p>
                Sĩ số, thông tin lớp, phân nhóm năng lực và danh sách học sinh
                {info.program ? ` · ${info.program}` : ""}
                {info.center ? ` · ${info.center}` : ""}
              </p>
            </div>
            <button type="button" className="btn ghost no-print" onClick={() => window.print()}>
              🖨️ In báo cáo
            </button>
          </div>
        </div>

        {error ? (
          <div className="alert orange" style={{ marginBottom: 14 }}>
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        ) : null}

        {/* 2. KPI row */}
        <div className="kpi-grid">
          <Kpi ico="👥" icoClass="orange" label="Tổng sĩ số" value={fmt(total)} sub="học sinh" />
          <Kpi ico="📚" icoClass="blue" label="Số buổi đã học" value={buoiValue} sub={buoiSub} />
          <Kpi
            ico="✅"
            icoClass="green"
            label="Tỷ lệ chuyên cần"
            value={attendanceRate != null ? `${attendanceRate}%` : "—"}
            sub={
              attendanceRate != null
                ? (Number.isFinite(Number(attendance?.total)) && Number(attendance?.total) > 0
                    ? `${fmt(attendance.attended)}/${fmt(attendance.total)} lượt có mặt`
                    : "Tỉ lệ có mặt")
                : "Chưa có dữ liệu điểm danh"
            }
          />
          {!isTeacher ? (
            <Kpi
              ico="💰"
              icoClass="yellow"
              label="Học phí đã thu / còn thiếu"
              value={tuition ? money(tuition.paid) : "—"}
              sub={tuition ? `Còn thiếu: ${money(tuition.remaining)}` : "Chưa có dữ liệu học phí"}
            />
          ) : null}
          <Kpi ico="⚠️" icoClass="red" label="Số HS cảnh báo" value="—" sub="Đang cập nhật" demo />
          <Kpi ico="💬" icoClass="purple" label="Số HS cần chăm sóc" value="—" sub="Đang cập nhật" demo />
        </div>

        <div className="stack">
          {/* 3. Thông tin tổng quan lớp */}
          <div className="card">
            <div className="card-head">
              <h3>Thông tin tổng quan lớp</h3>
              {clsLoading ? <span className="small muted">Đang tải…</span> : null}
            </div>
            <div className="grid c2">
              <div>
                <KV k="Tên lớp">{dash(info.name)}</KV>
                <KV k="Mã lớp">{dash(info.code)}</KV>
                <KV k="Chương trình">{dash(info.program)}</KV>
                <KV k="Cơ sở">{dash(info.center)}</KV>
                <KV k="Hình thức">{dash(info.delivery)}</KV>
              </div>
              <div>
                <KV k="Trạng thái">{statusBadge}</KV>
                <KV k="Lịch học" demo>—</KV>
                <KV k="Giáo viên">{info.teachers.length ? info.teachers.join(", ") : "—"}</KV>
                <KV k="Sĩ số">{fmt(total)} học sinh</KV>
                <KV k="Trạng thái lớp">{statusMeta ? statusMeta.label : "—"}</KV>
              </div>
            </div>
          </div>

          {/* 4. Phân nhóm năng lực học sinh (THẬT) */}
          <div className="card">
            <div className="card-head">
              <h3>Phân nhóm năng lực học sinh</h3>
              <span className="small muted">Giỏi ≥ 80% · Khá 65–79% · TB &lt; 65%</span>
            </div>
            {scoresLoading ? (
              <div className="muted small" style={{ padding: 12 }}>Đang tải điểm…</div>
            ) : scoredCount === 0 ? (
              <div className="muted small" style={{ padding: 12 }}>Chưa có dữ liệu điểm để phân nhóm.</div>
            ) : (
              <div className="grid c3">
                {BANDS.map((b) => {
                  const arr = groups[b.key];
                  return (
                    <div
                      key={b.key}
                      style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 14, background: "#FFF9F3" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <b style={{ fontSize: 13 }}>{b.tag}</b>
                        <span className={`badge ${b.cls}`}>{b.label}</span>
                      </div>
                      <div className="small muted mt8">
                        {fmt(arr.length)} học sinh ({groupPct(arr.length)}%)
                      </div>
                      {arr.length ? (
                        <div className="grid c3" style={{ gap: 10, marginTop: 12 }}>
                          {arr.slice(0, 3).map((st) => (
                            <Honor key={st.id} name={st.name} pct={st.avg} cls={b.cls} />
                          ))}
                        </div>
                      ) : (
                        <div className="small muted mt8">Chưa có học sinh trong nhóm này.</div>
                      )}
                      <div className="kv mt12" style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 10 }}>
                        <span className="k">Điểm TB nhóm</span>
                        <span className="v">{arr.length ? `${Math.round(groupAvg(arr))}%` : "—"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. Kết quả học tập chi tiết */}
          <div className="card">
            <div className="card-head">
              <h3>Kết quả học tập chi tiết</h3>
              {!scoresLoading && !anySkillScores ? (
                <span className="small muted">Chưa nhập điểm kỹ năng</span>
              ) : null}
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Học sinh</th>
                    <th className="t-center">Điểm tổng</th>
                    {skills.map((label) => (
                      <th key={label} className="t-center">{label}</th>
                    ))}
                    <th>Nhận xét</th>
                    <th className="t-center">Trạng thái theo dõi</th>
                  </tr>
                </thead>
                <tbody>
                  {scoresLoading || loading ? (
                    <tr>
                      <td colSpan={skills.length + 4} className="t-center muted" style={{ padding: 22 }}>Đang tải kết quả học tập…</td>
                    </tr>
                  ) : detailRows.length === 0 ? (
                    <tr>
                      <td colSpan={skills.length + 4} className="t-center muted" style={{ padding: 22 }}>Chưa có dữ liệu học sinh.</td>
                    </tr>
                  ) : (
                    detailRows.map((row) => {
                      const agg = row.agg;
                      const band = agg ? bandOf(agg.avg) : null;
                      const follow = band ? FOLLOW[band] : null;
                      return (
                        <tr key={row.id}>
                          <td className="bold">{row.name}</td>
                          <td className="t-center bold">{agg ? `${Math.round(agg.avg)}%` : "—"}</td>
                          {skills.map((label) => {
                            const v = agg && agg.skills ? agg.skills[label] : undefined;
                            return (
                              <td key={label} className="t-center">
                                {Number.isFinite(v) ? Math.round(v) : <span className="muted">—</span>}
                              </td>
                            );
                          })}
                          <td className="muted">{agg ? (agg.grade_label || agg.comment || "—") : "—"}</td>
                          <td className="t-center">
                            {follow ? <span className={`badge ${follow.cls}`}>{follow.label}</span> : <span className="muted">—</span>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6. Danh sách học sinh (core — THẬT, hàng bấm được) */}
          <div className="card">
            <div className="card-head">
              <h3>Danh sách học sinh</h3>
              <span className="small muted">Sĩ số: {fmt(total)} học sinh</span>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Mã HV</th>
                    <th>Họ tên</th>
                    <th className="t-center">Giới tính</th>
                    <th>Ngày sinh</th>
                    <th>SĐT</th>
                    <th className="t-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="t-center muted" style={{ padding: 22 }}>Đang tải danh sách học sinh…</td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="t-center muted" style={{ padding: 22 }}>Chưa có học sinh trong lớp này.</td>
                    </tr>
                  ) : (
                    students.map((s) => {
                      const st = STUDENT_STATUS[s.current_status] || null;
                      return (
                        <tr
                          key={s.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => navigate(`/students/${s.id}`, { state: { student: s } })}
                          title="Xem chi tiết học sinh"
                        >
                          <td className="bold">{dash(s.student_code)}</td>
                          <td className="bold">{studentName(s)}</td>
                          <td className="t-center">{GENDER[s.gender] || "—"}</td>
                          <td>{fmtDate(s.date_of_birth)}</td>
                          <td>{dash(s.phone_number)}</td>
                          <td className="t-center">
                            {st ? <span className={`badge ${st.cls}`}>{st.label}</span> : <span className="badge gray">—</span>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 7. Tổng quan năng lực lớp */}
          <div className="card">
            <div className="card-head">
              <h3>Tổng quan năng lực lớp</h3>
            </div>
            <div className="grid c3">
              {/* 7a. Phân bổ nhóm (THẬT) */}
              <div>
                <div className="small muted" style={{ fontWeight: 700, marginBottom: 10 }}>Phân bổ nhóm</div>
                {scoredCount === 0 ? (
                  <div className="muted small">—</div>
                ) : (
                  BANDS.map((b) => {
                    const n = groups[b.key].length;
                    const p = groupPct(n);
                    return (
                      <div className="hbar-row" key={b.key}>
                        <span className="hb-label">{b.label}</span>
                        <span className="hb-bar"><i style={{ width: `${p}%`, background: b.bar }} /></span>
                        <span className="hb-val">{fmt(n)} · {p}%</span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* 7b. Điểm TB theo kỹ năng (THẬT) */}
              <div>
                <div className="small muted" style={{ fontWeight: 700, marginBottom: 10 }}>
                  Điểm TB theo kỹ năng
                </div>
                {!anySkillScores ? (
                  <div className="muted small">—</div>
                ) : (
                  skills.map((label) => {
                    const v = skillAvgs[label];
                    const pct = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
                    return (
                      <div className="hbar-row" key={label}>
                        <span className="hb-label">{label}</span>
                        <span className="hb-bar"><i style={{ width: `${pct}%`, background: "var(--primary)" }} /></span>
                        <span className={`hb-val${Number.isFinite(v) ? "" : " muted"}`}>
                          {Number.isFinite(v) ? Math.round(v) : "—"}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* 7c. Điểm TB lớp (THẬT) */}
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
                <div className="small muted" style={{ fontWeight: 700, marginBottom: 6 }}>Điểm TB lớp</div>
                <div className="big-num" style={{ color: "var(--primary)" }}>
                  {classAvg != null ? `${Math.round(classAvg)}%` : "—"}
                </div>
                <div className="small muted mt8">
                  {scoredCount ? `Trên ${fmt(scoredCount)} HS đã có điểm` : "Chưa có điểm"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
