import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getMonthlyScorecard,
  getMonthlyScorecardSchema,
} from "../services/calendarService";
import ParentReportSheet from "./ParentReportSheet.jsx";
import ReportCardEditor from "../components/report/ReportCardEditor";
import { Button } from "../ui";
import "../styles/vista4.css";
import "../styles/parentReport.css";

/* ==========================================================================
   PHIẾU BÁO CÁO HỌC TẬP THÁNG — BẢN IN A4 gửi phụ huynh.
   Nguồn dữ liệu: GET /api/monthly-scorecards/{id}/
     - Các trường CŨ (student_name, attendance_*, score_components, ...) vẫn
       được dùng làm PHƯƠNG ÁN DỰ PHÒNG khi report_detail còn trống.
     - Trường MỚI "report_detail" là nguồn chính của bản in mẫu (10 mục).
   Nguyên tắc: mọi trường đều có thể null/rỗng -> giao diện phải không vỡ,
   thiếu thì hiện "—" hoặc ẩn hẳn mục đó.
   ========================================================================== */

/* ---------- Tiện ích nhỏ ---------- */

const pad2 = (v) => String(v).padStart(2, "0");

const isNum = (v) =>
  v !== null && v !== undefined && v !== "" && !Number.isNaN(Number(v));

/** Làm tròn 1 chữ số thập phân, bỏ ".0" thừa. */
const round1 = (v) => {
  const n = Math.round(Number(v) * 10) / 10;
  return Number.isInteger(n) ? n : n.toFixed(1);
};

/** Hiện số, thiếu thì "—". */
const showNum = (v, suffix = "") => (isNum(v) ? `${round1(v)}${suffix}` : "—");

/** Hiện chữ, thiếu thì "—". */
const showText = (v) => {
  const s = typeof v === "string" ? v.trim() : v;
  return s ? String(s) : "—";
};

/** Ngày ISO "2026-06-30" -> "30/06/2026". Chuỗi khác giữ nguyên. */
const fmtDate = (s) => {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(s);
};

/** Ép mọi kiểu (mảng / chuỗi nhiều dòng / null) về mảng chuỗi sạch. */
const toList = (v) => {
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? x.trim() : x))
      .filter((x) => x !== null && x !== undefined && x !== "");
  }
  if (typeof v === "string") {
    return v
      .split(/\r?\n|(?:^|\s)[•\-–]\s+/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
};

/** Chữ cái đầu của họ tên -> dùng cho ảnh đại diện khi chưa có ảnh thật. */
const initialsOf = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---------- Khối dùng lại trong phiếu ---------- */

/** Tiêu đề mục: số thứ tự trong ô vuông bo góc cam + tên mục (+ ghi chú phải). */
function SecHead({ no, title, right }) {
  return (
    <div className="pr-sec__head">
      <span className="pr-sec__no">{no}</span>
      <h2 className="pr-sec__title">{title}</h2>
      {right ? <div className="pr-sec__right">{right}</div> : null}
    </div>
  );
}

function Section({ no, title, right, children, className = "" }) {
  return (
    <section className={`pr-sec ${className}`.trim()}>
      <SecHead no={no} title={title} right={right} />
      {children}
    </section>
  );
}

/** Mức đánh giá dạng sao (0..5). */
function Stars({ value, max = 5 }) {
  if (!isNum(value)) return <span className="pr-muted">—</span>;
  const filled = clamp(Math.round(Number(value)), 0, max);
  return (
    <span className="pr-stars" title={`${filled}/${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <i key={i} className={i < filled ? "on" : ""}>
          ★
        </i>
      ))}
    </span>
  );
}

/** Mức tăng/giảm so với tháng trước. */
function Delta({ value, unit = "" }) {
  if (!isNum(value) || Number(value) === 0) return null;
  const up = Number(value) > 0;
  return (
    <span className={`pr-delta ${up ? "up" : "down"}`}>
      {up ? "▲" : "▼"} {round1(Math.abs(Number(value)))}
      {unit}
    </span>
  );
}

/** Vòng tròn tiến độ / điểm số vẽ bằng SVG. */
function Donut({ percent, size = 88, stroke = 9, color = "#F26522", children }) {
  const p = isNum(percent) ? clamp(Number(percent), 0, 100) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="pr-donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EFE3D4" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(c * p) / 100} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="pr-donut__mid">{children}</div>
    </div>
  );
}

/** Biểu đồ radar 6 trục — tự vẽ bằng SVG, không dùng thư viện ngoài. */
function RadarChart({ skills }) {
  const list = (skills || []).filter((s) => isNum(s?.score));
  if (list.length < 3) return null;

  const W = 250;
  const H = 218;
  const cx = W / 2;
  const cy = H / 2 + 2;
  const R = 74;
  const n = list.length;

  const ang = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i, ratio) => {
    const r = R * clamp(ratio, 0, 1);
    return [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
  };
  const poly = (ratios) => ratios.map((v, i) => pt(i, v).join(",")).join(" ");

  // Thang điểm của hệ thống là 0-10 (đúng cách giáo viên đang chấm), không phải
// 0-100 như bản in mẫu. Mặc định phải là 10, nếu không mọi thanh kỹ năng sẽ chỉ
// dài ~8% chiều rộng.
const maxOf = (s) => (isNum(s?.max) && Number(s.max) > 0 ? Number(s.max) : 10);
  const cur = list.map((s) => Number(s.score) / maxOf(s));
  const hasPrev = list.some((s) => isNum(s?.delta));
  const prev = list.map((s) =>
    clamp((Number(s.score) - (isNum(s.delta) ? Number(s.delta) : 0)) / maxOf(s), 0, 1),
  );

  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <div className="pr-radar">
      <svg viewBox={`0 0 ${W} ${H}`} className="pr-radar__svg" role="img" aria-label="Biểu đồ radar kỹ năng">
        {rings.map((rg) => (
          <polygon
            key={rg}
            points={poly(list.map(() => rg))}
            fill="none"
            stroke="#EADCCB"
            strokeWidth="0.8"
          />
        ))}
        {list.map((s, i) => {
          const [x, y] = pt(i, 1);
          return <line key={s.key || i} x1={cx} y1={cy} x2={x} y2={y} stroke="#EADCCB" strokeWidth="0.8" />;
        })}

        {hasPrev ? (
          <polygon
            points={poly(prev)}
            fill="rgba(169,154,136,.14)"
            stroke="#A99A88"
            strokeWidth="1.4"
            strokeDasharray="4 3"
          />
        ) : null}

        <polygon points={poly(cur)} fill="rgba(242,101,34,.18)" stroke="#F26522" strokeWidth="1.8" />
        {cur.map((v, i) => {
          const [x, y] = pt(i, v);
          return <circle key={i} cx={x} cy={y} r="2.6" fill="#F26522" />;
        })}

        {list.map((s, i) => {
          const [x, y] = pt(i, 1.24);
          const anchor = Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end";
          return (
            <text
              key={`lb-${s.key || i}`}
              x={x}
              y={y + 3}
              textAnchor={anchor}
              className="pr-radar__label"
            >
              {s.label || s.key}
            </text>
          );
        })}
      </svg>
      <div className="pr-radar__legend">
        <span>
          <i className="dot now" /> Tháng này
        </span>
        {hasPrev ? (
          <span>
            <i className="dot prev" /> Tháng trước
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Logo VISTA (dùng lại hình dấu của sidebar để phiếu in đồng bộ nhận diện). */
function VistaLogo() {
  return (
    <div className="pr-logo">
      <svg viewBox="0 0 120 102" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        {[
          [14, 30, 4.6],
          [26, 17, 5.2],
          [42, 8, 5.8],
          [78, 8, 5.8],
          [94, 17, 5.2],
          [106, 30, 4.6],
        ].map(([x, y, s], i) => (
          <polygon
            key={i}
            points="0,-1 0.224,-0.309 0.951,-0.309 0.363,0.118 0.588,0.809 0,0.382 -0.588,0.809 -0.363,0.118 -0.951,-0.309 -0.224,-0.309"
            transform={`translate(${x},${y}) scale(${s})`}
            fill="#F26522"
          />
        ))}
        <path d="M60 6 114 48l-9 6L60 20 15 54l-9-6L60 6z" fill="#A93226" />
        <g stroke="#F26522" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M23 56 42 90 56 34" />
          <path d="M97 56 78 90 64 34" />
        </g>
        <circle cx="34" cy="44" r="9.5" fill="#F26522" />
        <circle cx="86" cy="44" r="9.5" fill="#F26522" />
      </svg>
      <div className="pr-logo__txt">
        <strong>VISTA</strong>
        <span>Perfect Your English</span>
      </div>
    </div>
  );
}

/* ---------- Chuẩn hoá dữ liệu (mới + dự phòng theo trường cũ) ---------- */

/** Chuyên cần lấy từ các trường CŨ — vẫn dùng khi report_detail chưa có số. */
const attendanceOf = (card) => {
  const total = Number(card?.attendance_total) || 0;
  const present = Number(card?.attendance_present) || 0;
  const late = Number(card?.attendance_late) || 0;
  const percent = total > 0 ? Math.round((present / total) * 100) : null;
  return { total, present, late, percent };
};

/** Đầu điểm cũ + nhãn từ schema — dùng dựng thanh kỹ năng khi thiếu rd.skills. */
const componentsOf = (card, schema) => {
  const defs = schema?.[card?.program_type]?.components || [];
  const values = card?.score_components || {};
  if (defs.length) {
    return defs
      .filter((d) => values[d.key] !== undefined && values[d.key] !== null && values[d.key] !== "")
      .map((d) => ({
        key: d.key,
        label: d.label || d.key,
        score: Number(values[d.key]),
        delta: null,
        max: d.max_score || 10,
      }));
  }
  return Object.entries(values)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([key, value]) => ({ key, label: key, score: Number(value), delta: null, max: 10 }));
};

/* ========================================================================== */

export default function ParentReport() {
  const { scorecardId } = useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState(null);
  const [moForm, setMoForm] = useState(false);
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      getMonthlyScorecard(scorecardId),
      getMonthlyScorecardSchema().catch(() => null),
    ])
      .then(([cardData, schemaData]) => {
        if (!active) return;
        setCard(cardData);
        setSchema(schemaData);
      })
      .catch(() => {
        if (active) setError("Không tải được phiếu báo cáo. Vui lòng thử lại.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [scorecardId]);

  const att = useMemo(() => attendanceOf(card), [card]);

  /* Gộp report_detail với các trường cũ thành một mô hình xem duy nhất. */
  const v = useMemo(() => {
    if (!card) return null;
    const rd = card.report_detail && typeof card.report_detail === "object" ? card.report_detail : {};

    const monthNum = isNum(card.period_month) ? pad2(card.period_month) : null;
    const periodShort =
      monthNum && card.period_year ? `${monthNum}/${card.period_year}` : card.period_label || "—";
    const periodLong =
      monthNum && card.period_year
        ? `Tháng ${monthNum}/${card.period_year}`
        : card.period_label || "—";

    const roadmap = rd.roadmap && typeof rd.roadmap === "object" ? rd.roadmap : {};
    const mock = rd.mock_test && typeof rd.mock_test === "object" ? rd.mock_test : {};
    const honor = rd.honor && typeof rd.honor === "object" ? rd.honor : {};
    const certificate = rd.certificate && typeof rd.certificate === "object" ? rd.certificate : {};

    /* Kỹ năng: ưu tiên rd.skills, thiếu thì dựng lại từ score_components cũ. */
    let skills = Array.isArray(rd.skills)
      ? rd.skills
          .filter((s) => s && (s.label || s.key))
          .map((s) => ({
            key: s.key || s.label,
            label: s.label || s.key,
            score: isNum(s.score) ? Number(s.score) : null,
            delta: isNum(s.delta) ? Number(s.delta) : null,
            max: isNum(s.max) && Number(s.max) > 0 ? Number(s.max) : 10,
          }))
      : [];
    if (!skills.length) skills = componentsOf(card, schema);

    /* Buổi học: rd.roadmap -> điểm danh cũ. */
    const sessDone = isNum(roadmap.sessions_done) ? Number(roadmap.sessions_done) : att.present || null;
    const sessTotal = isNum(roadmap.sessions_total) ? Number(roadmap.sessions_total) : att.total || null;
    const sessPercent = isNum(roadmap.sessions_percent)
      ? Number(roadmap.sessions_percent)
      : sessDone !== null && sessTotal
        ? (sessDone / sessTotal) * 100
        : null;

    const attPercent = isNum(rd.attendance_percent) ? Number(rd.attendance_percent) : att.percent;
    // Điểm hiển thị trên phiếu là thang 0-10 (total_score). total_percent (0-100)
    // chỉ dùng khi phiếu cũ chưa có total_score, và khi đó quy về thang 10.
    const totalScore = isNum(rd.total_score)
      ? Number(rd.total_score)
      : isNum(card.total_score)
        ? Number(card.total_score)
        : isNum(card.total_percent)
          ? Number(card.total_percent) / 10
          : null;
    const totalPercent = totalScore;

    const units = Array.isArray(roadmap.units) ? roadmap.units.filter(Boolean) : [];

    /* Lộ trình học = tiến độ buổi học theo 12 tháng năm học (05 -> 04).
       Backend trả sẵn đủ 12 mốc; ở đây chỉ ép kiểu, không tính lại. */
    const ry = rd.roadmap_year && typeof rd.roadmap_year === "object" ? rd.roadmap_year : {};
    const roadmapMonths = (Array.isArray(ry.months) ? ry.months : []).map((m) => ({
      month: m.month,
      year: m.year,
      label: m.label || `T${m.month}`,
      short: m.short || "",
      present: isNum(m.present) ? Number(m.present) : null,
      total: isNum(m.total) ? Number(m.total) : null,
      percent: isNum(m.percent) ? Number(m.percent) : null,
      state: m.state || "upcoming",
      hasData: Boolean(m.has_data),
    }));

    /* Khối cấp 2: chuyên cần chấm Đạt / Chưa đạt thay vì phần trăm. */
    const isSecondary = rd.grade_band === "secondary";
    const monthlyExams = (Array.isArray(rd.monthly_exams) ? rd.monthly_exams : []).map((x) => ({
      month: x.month,
      year: x.year,
      label: x.label || "",
      short: x.short || `T${x.month}`,
      score: isNum(x.score) ? Number(x.score) : null,
      delta: isNum(x.delta) ? Number(x.delta) : null,
      isCurrent: Boolean(x.is_current),
    }));

    return {
      /* Đầu phiếu */
      programLabel: (rd.program_label || card.program_type || "").toString().toUpperCase(),
      exportedAt: fmtDate(rd.exported_at),
      periodShort,
      periodLong,
      monthNum,

      /* Thanh thông tin */
      studentName: card.student_name || "",
      classCode: rd.class_code || card.classroom_name || "",
      teacherName: rd.teacher_name || card.teacher_name || "",
      levelName: rd.level_name || "",
      centerName: rd.center_name || card.center_name || "",
      avatarUrl: rd.avatar_url || card.student_avatar || "",

      /* 5 thẻ chỉ số */
      attPercent,
      sessDone,
      sessTotal,
      sessPercent,
      taskDone: isNum(rd.task_done) ? Number(rd.task_done) : null,
      taskTotal: isNum(rd.task_total) ? Number(rd.task_total) : null,
      taskPercent: isNum(rd.task_percent) ? Number(rd.task_percent) : null,
      totalPercent,
      totalScore,
      totalDelta: isNum(rd.total_score_delta) ? Number(rd.total_score_delta)
        : isNum(rd.total_delta) ? Number(rd.total_delta) / 10 : null,
      cefrCurrent: rd.cefr_current || "",
      cefrTarget: rd.cefr_target || "",
      cefrProgress: isNum(rd.cefr_progress) ? Number(rd.cefr_progress) : null,
      classRank: isNum(rd.class_rank) ? Number(rd.class_rank) : null,
      classSize: isNum(rd.class_size) ? Number(rd.class_size) : null,
      classTopPercent: isNum(rd.class_top_percent) ? Number(rd.class_top_percent) : null,

      /* Khối lớp — quyết định phiếu cấp 2 hay phiếu Cambridge */
      gradeLevel: isNum(rd.grade_level) ? Number(rd.grade_level) : null,
      isSecondary,
      attPass: typeof rd.attendance_pass === "boolean" ? rd.attendance_pass : null,
      attPassLabel: rd.attendance_pass_label || "",
      attPassThreshold: isNum(rd.attendance_pass_threshold) ? Number(rd.attendance_pass_threshold) : null,

      /* Mục 1 — lộ trình */
      units,
      roadmapMonths,
      roadmapYearLabel: ry.label || "",
      sessDoneYear: isNum(ry.sessions_done) ? Number(ry.sessions_done) : null,
      sessTotalYear: isNum(ry.sessions_total) ? Number(ry.sessions_total) : null,
      sessPercentYear: isNum(ry.percent) ? Number(ry.percent) : null,
      // "class" = số buổi do lớp khai; "estimate" = ước lượng từ số buổi trung
      // bình mỗi tháng. Phiếu phải nói rõ để không hiểu nhầm là con số chính thức.
      sessTotalSource: ry.sessions_total_source || "",
      // Tiến độ lộ trình đo bằng THÁNG (tháng 8 = mốc 4/12 -> 33%), khác với
      // tỉ lệ buổi học của riêng tháng đang xem.
      roadmapPercent: isNum(ry.progress_percent) ? Number(ry.progress_percent) : null,
      roadmapMonthsDone: isNum(ry.months_elapsed) ? Number(ry.months_elapsed) : null,
      roadmapMonthsTotal: isNum(ry.months_total) ? Number(ry.months_total) : null,

      /* Mục 3 (khối cấp 2) — điểm thi từng tháng đã lưu */
      monthlyExams,
      monthlyExamAverage: isNum(rd.monthly_exam_average) ? Number(rd.monthly_exam_average) : null,
      currentUnit: roadmap.current_unit || null,
      midterm: roadmap.midterm || null,
      checkpoint: roadmap.checkpoint || null,

      /* Mục 2 — kỹ năng */
      skills,

      /* Mục 3 — mock test */
      mockName: mock.name || "",
      mockDate: mock.date || "",
      mockRows: Array.isArray(mock.rows) ? mock.rows.filter(Boolean) : [],
      mockOverall: isNum(mock.overall) ? Number(mock.overall) : null,
      mockOverallLabel: mock.overall_label || "",
      mockOverallNote: mock.overall_note || "",
      mockFootnote: mock.footnote || "",

      /* Mục 4 — cấp độ tiếp theo */
      nextLevelReq: toList(rd.next_level_requirements),

      /* Mục 5 — chi tiết đánh giá */
      detailRows: Array.isArray(rd.detail_rows) ? rd.detail_rows.filter(Boolean) : [],

      /* Mục 6, 7, 8 */
      strengths: toList(rd.strengths).length ? toList(rd.strengths) : toList(card.strengths),
      improvements: toList(rd.improvements).length ? toList(rd.improvements) : toList(card.improvements),
      nextMonth: toList(rd.next_month).length ? toList(rd.next_month) : toList(card.next_goal),
      parentActions: toList(rd.parent_actions).length
        ? toList(rd.parent_actions)
        : toList(card.parent_support_note),
      parentNote: rd.parent_note || "",
      teacherComment: (card.teacher_comment || "").trim(),

      /* Mục 9, 10 */
      honorOn: honor.enabled !== false && Boolean(honor.title),
      honorTitle: honor.title || "",
      honorPeriod: honor.period || "",
      certOn: certificate.enabled !== false && Boolean(certificate.text),
      // Ép chuỗi ngay tại nguồn: bên dưới gọi .replace() VÔ ĐIỀU KIỆN trên
      // đường render chính, nên chỉ cần backend trả số hay object là ném lỗi và
      // TRẮNG CẢ TRANG chứ không chỉ hỏng riêng ô chứng nhận.
      certText: typeof certificate.text === "string" ? certificate.text : "",

      gradeLabel: card.grade_label || "",
    };
  }, [card, schema, att]);

  /* Bản chữ để dán vào Zalo — bám theo nội dung mới của phiếu. */
  const plainText = useMemo(() => {
    if (!card || !v) return "";
    const L = [];
    const bullet = (arr, mark = "•") => arr.forEach((x) => L.push(`${mark} ${x}`));

    L.push(`BÁO CÁO HỌC TẬP THÁNG ${v.periodShort}`);
    if (v.programLabel) L.push(`Chương trình ${v.programLabel}`);
    L.push(v.centerName || "VISTA Education");
    L.push("");
    L.push(`Học viên: ${showText(v.studentName)}`);
    L.push(`Lớp: ${showText(v.classCode)}`);
    if (v.levelName) L.push(`Cấp độ: ${v.levelName}`);
    if (v.teacherName) L.push(`Giáo viên: ${v.teacherName}`);
    L.push("");

    L.push("── CHỈ SỐ THÁNG ──");
    // Khối cấp 2 chấm chuyên cần Đạt / Chưa đạt, không đọc phần trăm.
    L.push(
      v.isSecondary && v.attPassLabel
        ? `• Chuyên cần: ${v.attPassLabel}${
            v.sessDone !== null && v.sessTotal ? ` (${v.sessDone}/${v.sessTotal} buổi)` : ""
          }`
        : `• Chuyên cần: ${showNum(v.attPercent, "%")}${
            v.sessDone !== null && v.sessTotal ? ` (${v.sessDone}/${v.sessTotal} buổi)` : ""
          }`,
    );
    if (v.taskPercent !== null || v.taskTotal) {
      L.push(
        `• Hoàn thành nhiệm vụ: ${showNum(v.taskPercent, "%")}${
          v.taskDone !== null && v.taskTotal ? ` (${v.taskDone}/${v.taskTotal} nhiệm vụ)` : ""
        }`,
      );
    }
    L.push(
      `• Điểm trung bình tổng thể: ${showNum(v.totalScore, "/10")}${
        v.totalDelta ? ` (${v.totalDelta > 0 ? "tăng" : "giảm"} ${round1(Math.abs(v.totalDelta))} điểm)` : ""
      }${v.gradeLabel ? ` — ${v.gradeLabel}` : ""}`,
    );
    if (v.cefrProgress !== null) {
      L.push(
        `• Tiến độ CEFR: ${showNum(v.cefrProgress, "%")}${v.cefrTarget ? ` — hướng tới ${v.cefrTarget}` : ""}`,
      );
    }
    if (v.classRank !== null) {
      L.push(
        `• Xếp hạng lớp: ${v.classRank}${v.classSize ? `/${v.classSize}` : ""}${
          v.classTopPercent !== null ? ` (Top ${round1(v.classTopPercent)}%)` : ""
        }`,
      );
    }

    if (v.roadmapMonths.length) {
      L.push("");
      L.push(`── LỘ TRÌNH NĂM HỌC ${v.roadmapYearLabel} ──`);
      if (v.roadmapMonthsDone) {
        L.push(
          `Tiến độ lộ trình: ${v.roadmapMonthsDone}/${v.roadmapMonthsTotal} tháng${
            v.roadmapPercent !== null ? ` (${v.roadmapPercent}%)` : ""
          }`,
        );
      }
      if (v.sessTotalYear) {
        L.push(
          `Đã học ${v.sessDoneYear ?? 0}/${v.sessTotalYear} buổi${
            v.sessPercentYear !== null ? ` (${round1(v.sessPercentYear)}%)` : ""
          }${v.sessTotalSource === "months" ? " — tổng buổi tạm cộng từ các tháng đã có phiếu" : ""}`,
        );
      }
      L.push(
        v.roadmapMonths
          .map((m) => `${m.label} ${m.present !== null && m.total ? `${m.present}/${m.total}` : "—"}`)
          .join("  |  "),
      );
    }

    if (v.isSecondary && v.monthlyExams.length) {
      L.push("");
      L.push("── ĐIỂM THI THÁNG ──");
      v.monthlyExams.forEach((x) => {
        const d = isNum(x.delta) && x.delta !== 0 ? ` (${x.delta > 0 ? "+" : "-"}${round1(Math.abs(x.delta))})` : "";
        L.push(`• ${x.label}: ${showNum(x.score, "/10")}${d}`);
      });
      if (v.monthlyExamAverage !== null) L.push(`→ Trung bình: ${round1(v.monthlyExamAverage)}/10`);
    }

    if (v.skills.length) {
      L.push("");
      L.push("── TỔNG QUAN KỸ NĂNG ──");
      v.skills.forEach((s) => {
        const d = isNum(s.delta) && s.delta !== 0 ? ` (${s.delta > 0 ? "+" : "-"}${round1(Math.abs(s.delta))})` : "";
        L.push(`• ${s.label}: ${showNum(s.score)}/${s.max || 10}${d}`);
      });
    }

    if (v.mockRows.length || v.mockOverall !== null) {
      L.push("");
      L.push(`── ${v.mockName || "KẾT QUẢ MOCK TEST"} ──`);
      if (v.mockDate) L.push(`Ngày thi: ${v.mockDate}`);
      v.mockRows.forEach((r) => {
        L.push(
          `• ${showText(r.skill)}: ${showNum(r.score, "/10")}${
            isNum(r.cambridge) ? ` — Cambridge ~${round1(r.cambridge)}` : ""
          }`,
        );
      });
      if (v.mockOverall !== null) {
        L.push(
          `→ Đánh giá chung: ${round1(v.mockOverall)}${v.mockOverallLabel ? ` — ${v.mockOverallLabel}` : ""}`,
        );
      }
      if (v.mockOverallNote) L.push(v.mockOverallNote);
    }

    if (v.cefrCurrent || v.cefrTarget || v.nextLevelReq.length) {
      L.push("");
      L.push("── TIẾN ĐỘ LÊN CẤP ĐỘ TIẾP THEO ──");
      if (v.cefrCurrent || v.cefrTarget) {
        L.push(`${showText(v.cefrCurrent)} → ${showText(v.cefrTarget)}${
          v.cefrProgress !== null ? ` (${round1(v.cefrProgress)}%)` : ""
        }`);
      }
      if (v.nextLevelReq.length) {
        L.push(`Để đạt ${v.cefrTarget || "cấp độ tiếp theo"}, cần:`);
        bullet(v.nextLevelReq, "✓");
      }
    }

    if (v.teacherComment) {
      L.push("");
      L.push("── NHẬN XÉT CHUNG ──");
      L.push(v.teacherComment);
    }
    if (v.strengths.length) {
      L.push("");
      L.push("── ĐIỂM MẠNH ──");
      bullet(v.strengths, "👍");
    }
    if (v.improvements.length) {
      L.push("");
      L.push("── CẦN CẢI THIỆN ──");
      bullet(v.improvements, "📈");
    }
    if (v.nextMonth.length) {
      L.push("");
      L.push("── ĐỊNH HƯỚNG THÁNG TỚI ──");
      bullet(v.nextMonth, "✓");
    }
    if (v.parentActions.length) {
      L.push("");
      L.push("── PHỤ HUYNH ĐỒNG HÀNH ──");
      bullet(v.parentActions, "•");
    }
    if (v.parentNote) L.push(v.parentNote);

    if (v.honorOn) {
      L.push("");
      L.push(`🏅 VINH DANH: ${showText(v.honorTitle)}${v.honorPeriod ? ` — ${v.honorPeriod}` : ""}`);
    }

    L.push("");
    L.push("VISTA EDUCATION — Perfect Your English · Perfect Your Future");
    L.push("Hotline: 024 7300 7788 | www.vistaedu.vn");
    return L.join("\n");
  }, [card, v]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied("Đã sao chép nội dung phiếu — dán vào Zalo để gửi phụ huynh.");
    } catch {
      setCopied("Trình duyệt không cho sao chép tự động. Anh/chị bôi đen nội dung phiếu để chép.");
    }
    setTimeout(() => setCopied(""), 4000);
  };

  if (loading) {
    return (
      <div className="pr-root">
        <div className="pr-state">Đang tải phiếu báo cáo...</div>
      </div>
    );
  }

  if (error || !card || !v) {
    return (
      <div className="pr-root">
        <div className="pr-state">
          <p style={{ marginBottom: 12 }}>{error || "Không tìm thấy phiếu báo cáo."}</p>
          <Button size="sm" onClick={() => navigate(-1)}>
            ‹ Quay lại
          </Button>
        </div>
      </div>
    );
  }

  /* Văn bản chứng nhận: thay chỗ giữ {tên} / {kỳ}. */
  const certText = v.certText
    .replace(/\{t[eê]n\}/gi, v.studentName || "học viên")
    .replace(/\{k[yỳ]\}/gi, v.periodLong);

  const infoRows = [
    { ico: "👤", label: "Họ tên", value: v.studentName },
    { ico: "🏫", label: "Lớp", value: v.classCode },
    { ico: "📘", label: "Chương trình", value: v.programLabel },
    { ico: "👩‍🏫", label: "Giáo viên", value: v.teacherName },
    { ico: "🎓", label: "Cấp độ", value: v.levelName },
    { ico: "📍", label: "Cơ sở", value: v.centerName },
  ];

  const stats = [
    {
      ico: "📅",
      tone: "green",
      label: "Tỷ lệ chuyên cần",
      value: showNum(v.attPercent, "%"),
      sub: v.sessDone !== null && v.sessTotal ? `${v.sessDone} / ${v.sessTotal} buổi` : "—",
    },
    {
      ico: "✅",
      tone: "blue",
      label: "Tỷ lệ hoàn thành nhiệm vụ",
      value: showNum(v.taskPercent, "%"),
      sub: v.taskDone !== null && v.taskTotal ? `${v.taskDone} / ${v.taskTotal} nhiệm vụ` : "—",
    },
    {
      ico: "⭐",
      tone: "orange",
      label: "Điểm trung bình tổng thể",
      value: (
        <>
          {showNum(v.totalPercent)}
          <small>/10</small>
        </>
      ),
      sub:
        isNum(v.totalDelta) && v.totalDelta !== 0 ? <Delta value={v.totalDelta} unit=" điểm" /> : "—",
    },
    {
      ico: "🎯",
      tone: "purple",
      label: "CEFR Progress",
      value: showNum(v.cefrProgress, "%"),
      sub: v.cefrTarget ? `Đang tiến gần đến ${v.cefrTarget}` : "—",
    },
    {
      ico: "🏆",
      tone: "red",
      label: "Xếp hạng lớp",
      value: (
        <>
          {v.classRank !== null ? v.classRank : "—"}
          {v.classSize ? <small>/{v.classSize}</small> : null}
        </>
      ),
      sub: v.classTopPercent !== null ? `Top ${round1(v.classTopPercent)}%` : "—",
    },
  ];

  const hasRoadmap = v.units.length || v.currentUnit || v.midterm || v.checkpoint || v.sessTotal;
  const hasSkills = v.skills.length > 0 || v.totalPercent !== null;
  const hasMock = v.mockRows.length > 0 || v.mockOverall !== null;
  const hasNextLevel = Boolean(v.cefrCurrent || v.cefrTarget || v.nextLevelReq.length);
  const hasDetail = v.detailRows.length > 0;
  const hasComment = v.strengths.length > 0 || v.improvements.length > 0 || Boolean(v.teacherComment);
  const hasNextMonth = v.nextMonth.length > 0;
  const hasParent = v.parentActions.length > 0 || Boolean(v.parentNote);

  return (
    // pr2-root là nền/khung của UI mới; pr2-noprint ẩn thanh công cụ khi in.
    <div className="pr2-root">
      {/* ---------- Thanh công cụ (không in) ---------- */}
      <div className="pr-toolbar pr-noprint pr2-noprint">
        <div className="pr-crumb">
          <Link to="/monthly-scorecards">Bảng điểm học viên</Link>
          <span> / </span>
          <span>Phiếu báo cáo phụ huynh</span>
        </div>
        <div className="pr-toolbar__btns">
          <Button size="sm" onClick={() => navigate(-1)}>
            ‹ Quay lại
          </Button>
          {/* Chỉ mở form khi phiếu chưa duyệt: duyệt rồi mà sửa được thì con số
              trên tờ đã gửi phụ huynh và trong hệ thống lệch nhau. */}
          {card.status !== "approved" ? (
            <Button size="sm" icon="✎" onClick={() => setMoForm(true)}>
              Nhập thông tin phiếu
            </Button>
          ) : null}
          <Button size="sm" icon="📋" onClick={handleCopy}>
            Sao chép để gửi Zalo
          </Button>
          <Button size="sm" variant="primary" icon="🖨️" onClick={() => window.print()}>
            In phiếu
          </Button>
        </div>
        {copied ? <div className="pr-note">{copied}</div> : null}
        {card.status !== "approved" ? (
          <div className="pr-note warn">
            ⚠️ Bảng điểm này chưa được duyệt (trạng thái: {card.status || "nháp"}). Nên gửi phụ huynh
            sau khi quản lý duyệt.
          </div>
        ) : null}
      </div>

      {/* ================= PHIẾU A4 ================= */}
      {/* Toàn bộ phần hiển thị chuyển sang ParentReportSheet (UI mới do chủ dự
          án cung cấp). Logic đọc API và chuẩn hoá dữ liệu ở trên GIỮ NGUYÊN —
          component chỉ nhận view-model v đã dựng sẵn. */}
      <ParentReportSheet v={v} />

      {/* Form nhập nằm TRONG cùng phần tử bọc: JSX chỉ trả về được một gốc. */}
      {moForm ? (
        <ReportCardEditor
          card={card}
          onDong={() => setMoForm(false)}
          onXong={(moi) => { setCard(moi); setMoForm(false); }}
        />
      ) : null}
    </div>
  );
}
