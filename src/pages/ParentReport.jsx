import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getMonthlyScorecard,
  getMonthlyScorecardSchema,
} from "../services/calendarService";
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

      /* Mục 1 — lộ trình */
      units,
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
    L.push(
      `• Chuyên cần: ${showNum(v.attPercent, "%")}${
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
    <div className="pr-root">
      {/* ---------- Thanh công cụ (không in) ---------- */}
      <div className="pr-toolbar pr-noprint">
        <div className="pr-crumb">
          <Link to="/monthly-scorecards">Bảng điểm học viên</Link>
          <span> / </span>
          <span>Phiếu báo cáo phụ huynh</span>
        </div>
        <div className="pr-toolbar__btns">
          <Button size="sm" onClick={() => navigate(-1)}>
            ‹ Quay lại
          </Button>
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
      <div className="pr-sheet">
        {/* ---------- ĐẦU PHIẾU ---------- */}
        <header className="pr-head">
          <VistaLogo />
          <div className="pr-head__mid">
            <h1>BÁO CÁO HỌC TẬP THÁNG</h1>
            <div className="pr-head__prog">CHƯƠNG TRÌNH {v.programLabel || "—"}</div>
          </div>
          <div className="pr-head__box">
            <span className="pr-head__boxlb">THÁNG BÁO CÁO</span>
            <strong>{v.periodShort}</strong>
            <span className="pr-head__boxsub">Ngày xuất báo cáo: {v.exportedAt || "—"}</span>
          </div>
        </header>

        {/* ---------- THANH THÔNG TIN ---------- */}
        <div className="pr-infobar">
          <div className="pr-ident">
            <div className="pr-avatar">
              {v.avatarUrl ? (
                <img src={v.avatarUrl} alt={v.studentName || "Học viên"} />
              ) : (
                <span>{initialsOf(v.studentName)}</span>
              )}
            </div>
            <div className="pr-ident__grid">
              {infoRows.map((r) => (
                <div className="pr-ident__row" key={r.label}>
                  <i aria-hidden="true">{r.ico}</i>
                  <span className="pr-ident__lb">{r.label}</span>
                  <b className="pr-ident__val" title={r.value || ""}>
                    {showText(r.value)}
                  </b>
                </div>
              ))}
            </div>
          </div>

          <div className="pr-stats">
            {stats.map((s) => (
              <div className={`pr-stat ${s.tone}`} key={s.label}>
                <div className="pr-stat__ico" aria-hidden="true">
                  {s.ico}
                </div>
                <div className="pr-stat__lb">{s.label}</div>
                <div className="pr-stat__val">{s.value}</div>
                <div className="pr-stat__sub">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ---------- MỤC 1: LỘ TRÌNH HỌC TẬP ---------- */}
        {hasRoadmap ? (
          <Section
            no={1}
            title={`LỘ TRÌNH HỌC TẬP THÁNG ${v.monthNum || v.periodShort}`}
            right={
              v.sessTotal ? (
                <>
                  Số buổi đã học:{" "}
                  <b>
                    {v.sessDone !== null ? v.sessDone : "—"} / {v.sessTotal} buổi
                  </b>
                  {v.sessPercent !== null ? ` (${round1(v.sessPercent)}%)` : ""}
                </>
              ) : null
            }
          >
            {v.units.length ? (
              <div className="pr-tl">
                {v.units.map((u, i) => {
                  const st =
                    u.state === "done" ? "is-done" : u.state === "current" ? "is-current" : "is-upcoming";
                  return (
                    <div className={`pr-tl__item ${st}`} key={`${u.code || "u"}-${i}`}>
                      <span className="pr-tl__dot">{u.state === "done" ? "✓" : ""}</span>
                      <span className="pr-tl__code">{showText(u.code)}</span>
                      <span className="pr-tl__title">{u.title || ""}</span>
                    </div>
                  );
                })}
                <div className="pr-tl__item is-flag">
                  <span className="pr-tl__dot">🏁</span>
                  <span className="pr-tl__code">{typeof v.cefrTarget === "string" && v.cefrTarget ? v.cefrTarget : "Hoàn thành"}</span>
                  <span className="pr-tl__title">(Mục tiêu)</span>
                </div>
              </div>
            ) : (
              <div className="pr-empty">Chưa có dữ liệu lộ trình bài học.</div>
            )}

            <div className="pr-3box">
              <div className="pr-box b-orange">
                <div className="pr-box__lb">Đang học</div>
                <div className="pr-box__title">{showText(v.currentUnit?.title)}</div>
                <div className="pr-box__note">{v.currentUnit?.note || ""}</div>
              </div>
              <div className="pr-box b-blue">
                <div className="pr-box__lb">Bài kiểm tra giữa tháng</div>
                <div className="pr-box__title">{showText(v.midterm?.title)}</div>
                <div className="pr-box__note">{v.midterm?.note || ""}</div>
              </div>
              <div className="pr-box b-green">
                <div className="pr-box__lb">
                  Đánh giá giữa khóa
                  {v.checkpoint?.badge ? <em className="pr-badge">{v.checkpoint.badge}</em> : null}
                </div>
                <div className="pr-box__title">{showText(v.checkpoint?.title)}</div>
                <div className="pr-box__note">{v.checkpoint?.note || ""}</div>
              </div>
            </div>
          </Section>
        ) : null}

        {/* ---------- MỤC 2: TỔNG QUAN KỸ NĂNG ---------- */}
        {hasSkills ? (
          <Section no={2} title="TỔNG QUAN KỸ NĂNG">
            <div className="pr-skillwrap">
              <div className="pr-bigscore">
                <div className="pr-bigscore__lb">Điểm trung bình tổng thể</div>
                <div className="pr-bigscore__val">
                  {showNum(v.totalPercent)}
                  <small>/10</small>
                </div>
                <Delta value={v.totalDelta} unit=" điểm so với tháng trước" />
                {v.gradeLabel ? <div className="pr-bigscore__grade">{v.gradeLabel}</div> : null}
              </div>

              <div className="pr-bars">
                {v.skills.length ? (
                  v.skills.map((s) => {
                    const max = s.max || 10;
                    const w = isNum(s.score) ? clamp((Number(s.score) / max) * 100, 0, 100) : 0;
                    return (
                      <div className="pr-bar" key={s.key || s.label}>
                        <div className="pr-bar__lb">{s.label}</div>
                        <div className="pr-bar__track">
                          <i style={{ width: `${w}%` }} />
                        </div>
                        <div className="pr-bar__val">{showNum(s.score)}</div>
                        <div className="pr-bar__delta">
                          <Delta value={s.delta} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="pr-empty">Chưa nhập điểm kỹ năng cho kỳ này.</div>
                )}
              </div>

              <RadarChart skills={v.skills} />
            </div>
          </Section>
        ) : null}

        {/* ---------- MỤC 3: SẴN SÀNG KỲ THI CAMBRIDGE ---------- */}
        {hasMock ? (
          <Section
            no={3}
            title="SẴN SÀNG KỲ THI CAMBRIDGE"
            right={
              v.mockName || v.mockDate ? (
                <>
                  {v.mockName}
                  {v.mockDate ? ` · ${v.mockDate}` : ""}
                </>
              ) : null
            }
          >
            <div className="pr-mock">
              <div className="pr-mock__tblwrap">
                <table className="pr-tbl">
                  <thead>
                    <tr>
                      <th>Kỹ năng</th>
                      <th className="c">Điểm đạt được (/100)</th>
                      <th className="c">Điểm Cambridge (ước tính)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.mockRows.length ? (
                      v.mockRows.map((r, i) => (
                        <tr key={`${r.skill || "r"}-${i}`}>
                          <td>{showText(r.skill)}</td>
                          <td className="c">
                            <b className="pr-score">{showNum(r.score)}</b>
                            <Stars value={r.stars} />
                          </td>
                          <td className="c">{showNum(r.cambridge)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="c pr-muted">
                          Chưa có kết quả bài thi thử.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {v.mockFootnote ? <div className="pr-foot-note">{showText(v.mockFootnote)}</div> : null}
              </div>

              <div className="pr-overall">
                <div className="pr-overall__lb">ĐÁNH GIÁ CHUNG</div>
                <Donut percent={v.mockOverall} size={92} color="#2E9E5B">
                  <b>{showNum(v.mockOverall)}</b>
                  <span>/100</span>
                </Donut>
                <div className="pr-overall__tag">{showText(v.mockOverallLabel)}</div>
                <div className="pr-overall__note">{v.mockOverallNote || ""}</div>
              </div>
            </div>
          </Section>
        ) : null}

        {/* ---------- MỤC 4: TIẾN ĐỘ HƯỚNG TỚI CẤP ĐỘ TIẾP THEO ---------- */}
        {hasNextLevel ? (
          <Section no={4} title="TIẾN ĐỘ HƯỚNG TỚI CẤP ĐỘ TIẾP THEO">
            <div className="pr-level">
              <div className="pr-level__track">
                <div className="pr-medal cur">
                  <span className="pr-medal__ico" aria-hidden="true">
                    🎖️
                  </span>
                  <span className="pr-medal__lb">Cấp độ hiện tại</span>
                  <b>{showText(v.cefrCurrent || v.levelName)}</b>
                </div>
                <Donut percent={v.cefrProgress} size={82} color="#F26522">
                  <b>{showNum(v.cefrProgress, "%")}</b>
                  <span>tiến độ</span>
                </Donut>
                <div className="pr-medal next">
                  <span className="pr-medal__ico" aria-hidden="true">
                    🏅
                  </span>
                  <span className="pr-medal__lb">Cấp độ tiếp theo</span>
                  <b>{showText(v.cefrTarget)}</b>
                </div>
              </div>

              <div className="pr-level__req">
                <div className="pr-level__reqhd">
                  Để đạt {typeof v.cefrTarget === "string" && v.cefrTarget ? v.cefrTarget : "cấp độ tiếp theo"}, cần:
                </div>
                {v.nextLevelReq.length ? (
                  <ul className="pr-ticks">
                    {v.nextLevelReq.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="pr-empty">Giáo viên chưa ghi yêu cầu lên cấp độ.</div>
                )}
              </div>
            </div>
          </Section>
        ) : null}

        {/* ---------- MỤC 5: CHI TIẾT ĐÁNH GIÁ ---------- */}
        {hasDetail ? (
          <Section no={5} title="CHI TIẾT ĐÁNH GIÁ">
            <table className="pr-tbl pr-tbl--detail">
              <thead>
                <tr>
                  <th>Hạng mục đánh giá</th>
                  <th className="c">Điểm số (/100)</th>
                  <th className="c">Mức đánh giá</th>
                  <th className="c">Đạt được</th>
                  <th className="c">Cần cải thiện</th>
                  <th>Nhận xét của giáo viên</th>
                </tr>
              </thead>
              <tbody>
                {v.detailRows.map((r, i) => (
                  <tr key={`${r.label || "d"}-${i}`}>
                    <td>{showText(r.label)}</td>
                    <td className="c">
                      <b className="pr-score">{showNum(r.score)}</b>
                    </td>
                    <td className="c">
                      <Stars value={r.stars} />
                    </td>
                    <td className="c">{r.passed ? <span className="pr-ok">✓</span> : <span className="pr-muted">—</span>}</td>
                    <td className="c">
                      {r.need_improve ? <span className="pr-warn">⚠</span> : <span className="pr-muted">—</span>}
                    </td>
                    <td className="pr-cmt">{r.comment || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        ) : null}

        {/* ---------- MỤC 6: NHẬN XÉT CỦA GIÁO VIÊN ---------- */}
        {hasComment ? (
          <Section no={6} title="NHẬN XÉT CỦA GIÁO VIÊN">
            {v.teacherComment ? <p className="pr-para">{v.teacherComment}</p> : null}
            <div className="pr-2box">
              <div className="pr-cbox good">
                <div className="pr-cbox__hd">
                  <i aria-hidden="true">👍</i> Điểm mạnh
                </div>
                {v.strengths.length ? (
                  <ul className="pr-ticks">
                    {v.strengths.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="pr-empty">—</div>
                )}
              </div>
              <div className="pr-cbox improve">
                <div className="pr-cbox__hd">
                  <i aria-hidden="true">📈</i> Điểm cần cải thiện
                </div>
                {v.improvements.length ? (
                  <ul className="pr-ticks warn">
                    {v.improvements.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="pr-empty">—</div>
                )}
              </div>
            </div>
          </Section>
        ) : null}

        {/* ---------- MỤC 7: ĐỊNH HƯỚNG PHÁT TRIỂN THÁNG TỚI ---------- */}
        {hasNextMonth ? (
          <Section no={7} title="ĐỊNH HƯỚNG PHÁT TRIỂN THÁNG TỚI">
            <ul className="pr-ticks pr-ticks--2col">
              {v.nextMonth.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </Section>
        ) : null}

        {/* ---------- MỤC 8: PHỤ HUYNH ĐỒNG HÀNH ---------- */}
        {hasParent ? (
          <Section no={8} title="PHỤ HUYNH ĐỒNG HÀNH">
            {v.parentActions.length ? (
              <ul className="pr-ticks pr-ticks--2col">
                {v.parentActions.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            ) : null}
            {v.parentNote ? <div className="pr-parentnote">{showText(v.parentNote)}</div> : null}
          </Section>
        ) : null}

        {/* ---------- MỤC 9 + 10 + CHỮ KÝ ---------- */}
        <div className="pr-tail">
          <div className="pr-tail__awards">
            {v.honorOn ? (
              <Section no={9} title="VINH DANH" className="pr-sec--mini">
                <div className="pr-award honor">
                  <span className="pr-award__ico" aria-hidden="true">
                    🏅
                  </span>
                  <div>
                    <b>{showText(v.honorTitle)}</b>
                    <span>{v.honorPeriod || v.periodLong}</span>
                  </div>
                </div>
              </Section>
            ) : null}

            {v.certOn ? (
              <Section no={10} title="CHỨNG NHẬN THÀNH TÍCH" className="pr-sec--mini">
                <div className="pr-award cert">
                  <span className="pr-award__ico" aria-hidden="true">
                    🎖️
                  </span>
                  <div>
                    <b>{certText}</b>
                    <span>{v.centerName || "VISTA Education"}</span>
                  </div>
                </div>
              </Section>
            ) : null}
          </div>

          <div className="pr-signs">
            {[
              { t: "GIÁO VIÊN", n: v.teacherName },
              { t: "QUẢN LÝ ĐÀO TẠO", n: "" },
              { t: "PHỤ HUYNH", n: "" },
            ].map((s) => (
              <div className="pr-sign" key={s.t}>
                <div className="pr-sign__t">{s.t}</div>
                <div className="pr-sign__space" />
                <div className="pr-sign__n">{s.n || "(Ký, ghi rõ họ tên)"}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ---------- CHÂN PHIẾU ---------- */}
        <footer className="pr-foot">
          <strong>VISTA EDUCATION</strong>
          <span>Perfect Your English · Perfect Your Future</span>
          <span>Hotline: 024 7300 7788 | www.vistaedu.vn</span>
        </footer>
      </div>
    </div>
  );
}
