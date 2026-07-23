import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listTeachingSessions,
  createSessionReport,
  listMediaReports,
  createMediaReport,
  importSessionReportsFile,
} from "../services/calendarService";
import "../styles/vista4.css";

const WEEKDAYS = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const pad2 = (v) => String(v).padStart(2, "0");
const dateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const longDate = (d) => `${WEEKDAYS[d.getDay()]}, ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
const shortDate = (d) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;

function startOfWeekMonday(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

// Khoảng ngày [from, to] theo chế độ ngày / tuần / tháng.
function rangeFor(date, tab) {
  if (tab === "week") {
    const start = startOfWeekMonday(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: dateKey(start), to: dateKey(end), start, end };
  }
  if (tab === "month") {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { from: dateKey(start), to: dateKey(end), start, end };
  }
  return { from: dateKey(date), to: dateKey(date), start: date, end: date };
}

function periodLabel(date, tab) {
  const r = rangeFor(date, tab);
  if (tab === "week") return `Tuần ${shortDate(r.start)} – ${shortDate(r.end)}/${r.end.getFullYear()}`;
  if (tab === "month") return `Tháng ${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
  return longDate(date);
}
const RANGE_WORD = { day: "ngày", week: "tuần", month: "tháng" };

function timeLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
const timeRange = (a, b) => `${timeLabel(a)} - ${timeLabel(b)}`;

const REPORT_META = {
  approved: { label: "Đã báo cáo", cls: "green" },
  submitted: { label: "Chờ duyệt", cls: "green" },
  draft: { label: "Bản nháp", cls: "blue" },
  revision_required: { label: "Cần sửa", cls: "red" },
  __none: { label: "Chưa báo cáo", cls: "orange" },
};
const reportMeta = (status) => REPORT_META[status] || REPORT_META.__none;
const isReported = (status) => ["draft", "submitted", "approved"].includes(status);

// Progress ring with % in center (no stray dot at 0%).
function RingDonut({ pct = 0, color = "#F26522", size = 54, thick = 7 }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const r = (size - thick) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (clamped / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="#F1E9DE" strokeWidth={thick} />
      {clamped > 0 && (
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thick}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
        />
      )}
      <text x={c} y={c + 3.5} textAnchor="middle" fontSize="11" fontWeight="800" fill="#43301F">{clamped}%</text>
    </svg>
  );
}

function Kpi({ icon, iconBg, iconColor, label, value, sub, ringPct, ringColor }) {
  return (
    <div className="kpi">
      <div className="ico" style={{ background: iconBg, color: iconColor, fontSize: 18 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
        {sub ? <div className="small muted">{sub}</div> : null}
      </div>
      <RingDonut pct={ringPct} color={ringColor} />
    </div>
  );
}

function Stars() {
  return <span className="stars" style={{ color: "#F5A623" }}>{[1, 2, 3, 4, 5].map((i) => <span key={i}>★</span>)}</span>;
}

const CHANNEL_OPTS = [["zalo", "Zalo OA"], ["facebook", "Facebook"], ["youtube", "YouTube"], ["tiktok", "TikTok"], ["website", "Website"]];
const CONTENT_OPTS = [["post", "Bài viết"], ["short_video", "Video ngắn"], ["album", "Album ảnh"], ["livestream", "Livestream"], ["message", "Tin nhắn"]];
const emptyMediaForm = { title: "", channel: "facebook", content_type: "post", description: "", reach: "", engagement: "", responses: "", shares: "" };
const PERFORMANCE = [["Giảng dạy", 88], ["Truyền thông", 90], ["Báo cáo đầy đủ, đúng hạn", 95], ["Tuân thủ quy trình", 92]];
const DOCS = [["Mẫu báo cáo giảng dạy", "PDF"], ["Mẫu báo cáo truyền thông", "DOCX"], ["Hướng dẫn báo cáo ngày", "PDF"]];
const FORM_TABS = [["general", "Thông tin chung"], ["result", "Kết quả & Đánh giá"], ["students", "Học sinh"], ["files", "Đính kèm"]];

function DailyReport() {
  const navigate = useNavigate();
  const role = (() => {
    try {
      const r = JSON.parse(localStorage.getItem("vista_user") || "{}").role;
      return (typeof r === "string" ? r : r?.name) || "";
    } catch (error) {
      return "";
    }
  })();
  const canReviewReports = ["superadmin", "admin", "center_manager", "training_manager"].includes(role);
  const [reportDate, setReportDate] = useState(() => new Date());
  const [rangeTab, setRangeTab] = useState("day");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [formTab, setFormTab] = useState("general");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [form, setForm] = useState({ student_count: "", topic: "", activities: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Media report state.
  const [mediaReports, setMediaReports] = useState([]);
  const [mediaForm, setMediaForm] = useState(emptyMediaForm);
  const [mediaSaving, setMediaSaving] = useState(false);
  const [mediaError, setMediaError] = useState("");

  // Import báo cáo (tuần / tháng).
  const [reportImporting, setReportImporting] = useState(false);
  const [reportImportError, setReportImportError] = useState("");
  const reportFileRef = useRef(null);

  const isDay = rangeTab === "day";
  const range = useMemo(() => rangeFor(reportDate, rangeTab), [reportDate, rangeTab]);
  const { from: rangeFrom, to: rangeTo } = range;

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const [sessionData, mediaData] = await Promise.all([
          listTeachingSessions({ date_from: rangeFrom, date_to: rangeTo, page_size: 500 }),
          listMediaReports({ date_from: rangeFrom, date_to: rangeTo, page_size: 500 }).catch(() => ({ results: [] })),
        ]);
        const items = Array.isArray(sessionData?.results) ? sessionData.results : [];
        items.sort((a, b) => String(a.start_at || "").localeCompare(String(b.start_at || "")));
        if (!active) return;
        setSessions(items);
        setMediaReports(Array.isArray(mediaData?.results) ? mediaData.results : []);
        // default to the first session that still needs a report
        const target = items.find((s) => !isReported(s.report_status)) || items[0];
        setSelectedSessionId(target ? String(target.id) : "");
      } catch (error) {
        if (active) {
          setSessions([]);
          setMediaReports([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [rangeFrom, rangeTo, reloadKey]);

  const totalTeaching = sessions.length;
  const reportedTeaching = sessions.filter((s) => isReported(s.report_status)).length;
  const teachingPct = totalTeaching ? Math.round((reportedTeaching / totalTeaching) * 100) : 0;
  const mediaTotal = mediaReports.length;
  const mediaReported = mediaReports.filter((m) => m.status === "submitted" || m.status === "approved").length;
  const mediaPct = mediaTotal ? Math.round((mediaReported / mediaTotal) * 100) : 0;
  const totalTasks = totalTeaching + mediaTotal;
  const doneTasks = reportedTeaching + mediaReported;
  const completionPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const pendingTasks = totalTasks - doneTasks;

  const pendingReminders = useMemo(
    () =>
      sessions
        .filter((s) => !isReported(s.report_status))
        .map((s) => ({ id: s.id, title: `Báo cáo lớp ${s.classroom_name || "--"} (${timeLabel(s.start_at)})`, due: `Cần nộp trước ${timeLabel(s.end_at)}` })),
    [sessions]
  );

  const shiftPeriod = (delta) =>
    setReportDate((prev) => {
      const next = new Date(prev);
      if (rangeTab === "week") next.setDate(prev.getDate() + delta * 7);
      else if (rangeTab === "month") next.setMonth(prev.getMonth() + delta);
      else next.setDate(prev.getDate() + delta);
      return next;
    });

  const handleReportImport = async () => {
    setReportImportError("");
    const file = reportFileRef.current?.files?.[0];
    if (!file) {
      setReportImportError("Vui lòng chọn file Excel báo cáo.");
      return;
    }
    setReportImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("date_from", rangeFrom);
      fd.append("date_to", rangeTo);
      const res = await importSessionReportsFile(fd);
      setNotice(`Đã import ${res.created || 0} báo cáo giảng dạy (khớp ${res.matched || 0} buổi, bỏ qua ${res.skipped || 0} dòng).`);
      if (reportFileRef.current) reportFileRef.current.value = "";
      setReloadKey((k) => k + 1);
    } catch (error) {
      setReportImportError(error?.response?.data?.detail || "Không import được file. Vui lòng kiểm tra lại.");
    } finally {
      setReportImporting(false);
    }
  };

  const selectedSession = sessions.find((s) => String(s.id) === String(selectedSessionId)) || null;
  const selectedReported = selectedSession && isReported(selectedSession.report_status);

  const saveReport = async (advance) => {
    setFormError("");
    if (!selectedSessionId) {
      setFormError("Vui lòng chọn lớp học.");
      return;
    }
    if (!form.topic.trim()) {
      setFormError("Vui lòng nhập chủ đề bài học.");
      return;
    }
    setSaving(true);
    try {
      await createSessionReport({
        session: Number(selectedSessionId),
        objective_status: "achieved",
        student_count: form.student_count ? Number(form.student_count) : undefined,
        content_taught: form.topic.trim(),
        session_evaluation: form.activities.trim() || "Hoàn thành nội dung buổi học.",
        attendance_summary: form.student_count ? `${form.student_count} học sinh đi học` : "Đã điểm danh",
        homework_assigned: "Xem lại nội dung bài học.",
      });
      setNotice("Đã lưu báo cáo buổi dạy.");
      setForm({ student_count: "", topic: "", activities: "" });
      if (advance) {
        const next = sessions.find((s) => !isReported(s.report_status) && String(s.id) !== String(selectedSessionId));
        if (next) setSelectedSessionId(String(next.id));
      }
      setReloadKey((k) => k + 1);
    } catch (error) {
      setFormError(
        error?.response?.data?.detail ||
          (error?.response?.status === 400
            ? "Buổi dạy này có thể đã có báo cáo hoặc thiếu thông tin."
            : "Không lưu được báo cáo. Vui lòng thử lại.")
      );
    } finally {
      setSaving(false);
    }
  };

  const saveMediaReport = async () => {
    setMediaError("");
    if (!mediaForm.title.trim()) {
      setMediaError("Vui lòng nhập tiêu đề / caption.");
      return;
    }
    setMediaSaving(true);
    try {
      const numeric = (v) => (v === "" || v == null ? undefined : Number(v));
      await createMediaReport({
        title: mediaForm.title.trim(),
        channel: mediaForm.channel,
        content_type: mediaForm.content_type,
        description: mediaForm.description.trim(),
        report_date: dateKey(reportDate),
        reach: numeric(mediaForm.reach),
        engagement: numeric(mediaForm.engagement),
        responses: numeric(mediaForm.responses),
        shares: numeric(mediaForm.shares),
      });
      setNotice("Đã lưu báo cáo truyền thông.");
      setMediaForm(emptyMediaForm);
      setReloadKey((k) => k + 1);
    } catch (error) {
      setMediaError(
        error?.response?.data?.title?.[0] ||
          error?.response?.data?.detail ||
          "Không lưu được báo cáo truyền thông. Vui lòng thử lại."
      );
    } finally {
      setMediaSaving(false);
    }
  };

  return (
    <div className="v4page">
      <div className="content-col">
        {/* Header */}
        <div className="page-head">
          <div className="flex-between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="flex" style={{ gap: 8, marginBottom: 6 }}>
                <button type="button" className="btn ghost" style={{ padding: "6px 11px" }} onClick={() => shiftPeriod(-1)} aria-label={`${RANGE_WORD[rangeTab]} trước`}>‹</button>
                <span className="btn ghost" style={{ cursor: "default" }}>📅 {periodLabel(reportDate, rangeTab)}</span>
                <button type="button" className="btn ghost" style={{ padding: "6px 11px" }} onClick={() => shiftPeriod(1)} aria-label={`${RANGE_WORD[rangeTab]} sau`}>›</button>
              </div>
              <h1>BÁO CÁO {RANGE_WORD[rangeTab].toUpperCase()}</h1>
              <p>Báo cáo giảng dạy &amp; truyền thông — {periodLabel(reportDate, rangeTab)}</p>
            </div>
            <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn ghost">❔ Hướng dẫn</button>
              <button type="button" className="btn ghost" onClick={() => navigate("/calendar-detail")}>📅 Xem lịch dạy</button>
              {canReviewReports ? (
                <button type="button" className="btn ghost" onClick={() => navigate("/monthly-reports")}>✓ Duyệt báo cáo</button>
              ) : null}
              <button type="button" className="btn primary" onClick={() => setNotice(`Đã gửi báo cáo ${RANGE_WORD[rangeTab]} cho quản lý.`)}>➤ Gửi báo cáo {RANGE_WORD[rangeTab]}</button>
            </div>
          </div>
        </div>

        <div className="tabs" style={{ marginBottom: 16 }} role="tablist">
          {[["day", "Báo cáo ngày"], ["week", "Báo cáo tuần"], ["month", "Báo cáo tháng"]].map(([key, label]) => (
            <span
              key={key}
              className={`tab${rangeTab === key ? " active" : ""}`}
              role="tab"
              tabIndex={0}
              aria-selected={rangeTab === key}
              onClick={() => setRangeTab(key)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRangeTab(key); } }}
            >
              {label}
            </span>
          ))}
        </div>

        {notice ? (
          <div className="alert green" style={{ marginBottom: 16 }}>
            {notice}{" "}
            <button type="button" onClick={() => setNotice("")} style={{ border: "none", background: "none", cursor: "pointer", color: "inherit", fontWeight: 800 }} aria-label="Đóng">✕</button>
          </div>
        ) : null}

        <div className="kpi-grid cols-4">
          <Kpi icon="📄" iconBg="#eef2fb" iconColor="#3b82f6" label="Tổng buổi dạy" value={totalTeaching} sub={`Đã báo cáo: ${reportedTeaching}`} ringPct={teachingPct} ringColor="#3b82f6" />
          <Kpi icon="📢" iconBg="#e9f7ef" iconColor="#2e9e5b" label="Tổng buổi truyền thông" value={mediaTotal} sub={`Đã báo cáo: ${mediaReported}`} ringPct={mediaPct} ringColor="#2e9e5b" />
          <Kpi icon="👥" iconBg="#f1ecfb" iconColor="#8b5cf6" label="Hoàn thành báo cáo" value={`${completionPct}%`} sub={`${doneTasks}/${totalTasks} nhiệm vụ`} ringPct={completionPct} ringColor="#8b5cf6" />
          <Kpi icon="🏆" iconBg="#fdf2e3" iconColor="#d9822b" label="Điểm thi đua tạm tính" value={<>92<small>/100</small></>} sub="Xuất sắc" ringPct={92} ringColor="#F26522" />
        </div>

        {(
          <div className="dr-layout">
            {/* Column 1 */}
            <div className="stack">
              <div className="card">
                <div className="card-head">
                  <h3>LỊCH DẠY {isDay ? "HÔM NAY" : rangeTab === "week" ? "TRONG TUẦN" : "TRONG THÁNG"}</h3>
                  <button type="button" className="card-link" style={{ cursor: "pointer", background: "none", border: "none", font: "inherit" }} onClick={() => navigate("/calendar-detail")}>Xem lịch →</button>
                </div>
                {loading ? (
                  <div className="small muted" style={{ padding: 10 }}>Đang tải lịch dạy…</div>
                ) : sessions.length ? (
                  <div className="tbl-wrap">
                    <table className="tbl">
                      <thead><tr>{!isDay && <th>Ngày</th>}<th>Ca học</th><th>Lớp học</th><th>Giáo viên</th><th>Trạng thái báo cáo</th></tr></thead>
                      <tbody>
                        {sessions.map((s) => {
                          const meta = reportMeta(s.report_status);
                          return (
                            <tr key={s.id}>
                              {!isDay && <td className="muted">{s.session_date ? `${s.session_date.slice(8)}/${s.session_date.slice(5, 7)}` : "--"}</td>}
                              <td className="muted">{timeRange(s.start_at, s.end_at)}</td>
                              <td className="bold" style={{ color: "var(--primary)" }}>{s.classroom_name || "--"}</td>
                              <td>{s.teacher_name || "--"}</td>
                              <td><span className={`badge ${meta.cls}`}>{meta.label}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="small muted" style={{ padding: 10 }}>Không có lịch dạy trong {RANGE_WORD[rangeTab]} này.</div>
                )}
              </div>

              <div className="card">
                <div className="card-head">
                  <h3>TRUYỀN THÔNG {isDay ? "HÔM NAY" : rangeTab === "week" ? "TRONG TUẦN" : "TRONG THÁNG"}</h3>
                  <span className="small muted">{mediaReports.length} nội dung</span>
                </div>
                {mediaReports.length ? (
                  <div className="tbl-wrap">
                    <table className="tbl">
                      <thead><tr><th>Nội dung</th><th>Kênh</th><th>Loại</th><th>Tiếp cận</th><th>Trạng thái</th></tr></thead>
                      <tbody>
                        {mediaReports.map((m) => {
                          const meta = reportMeta(m.status);
                          return (
                            <tr key={m.id}>
                              <td className="bold">{m.title}</td>
                              <td>{m.channel_display}</td>
                              <td className="muted">{m.content_type_display}</td>
                              <td className="muted">{m.reach != null ? Number(m.reach).toLocaleString("vi-VN") : "--"}</td>
                              <td><span className={`badge ${meta.cls}`}>{meta.label}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="small muted" style={{ padding: 10 }}>Chưa có báo cáo truyền thông trong ngày này.</div>
                )}
              </div>

              <div className="card">
                <div className="card-head"><h3>TIẾN ĐỘ BÁO CÁO TRONG NGÀY</h3></div>
                <div className="grid c4">
                  {[
                    ["Tổng nhiệm vụ", totalTasks, "#43301F"],
                    ["Đã hoàn thành", `${doneTasks} (${completionPct}%)`, "#2e9e5b"],
                    ["Đang làm", 0, "#3b82f6"],
                    ["Chưa báo cáo", `${pendingTasks} (${100 - completionPct}%)`, "#d9822b"],
                  ].map((r) => (
                    <div key={r[0]} style={{ background: "#FBF7F1", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                      <div className="small muted bold">{r[0]}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: r[2] }}>{r[1]}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 2 — forms (ngày) hoặc import (tuần / tháng) */}
            <div className="stack">
              {isDay ? (
              <>
              <div className="card rp-form">
                <div className="card-head" style={{ flexWrap: "wrap" }}>
                  <h3>NHẬP BÁO CÁO THEO LỚP HỌC</h3>
                  <div className="flex" style={{ gap: 8 }}>
                    <span className="small muted">Chọn lớp:</span>
                    <select value={selectedSessionId} onChange={(e) => setSelectedSessionId(e.target.value)} style={{ width: "auto", fontWeight: 700 }}>
                      {sessions.length === 0 ? <option value="">Không có lớp trong ngày</option> : null}
                      {sessions.map((s) => (
                        <option key={s.id} value={s.id}>{`${s.classroom_name || "Lớp"} (${timeRange(s.start_at, s.end_at)})`}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="tabs ghost" style={{ marginBottom: 12 }}>
                  {FORM_TABS.map(([key, label]) => (
                    <span key={key} className={`tab${formTab === key ? " active" : ""}`} style={{ padding: "6px 12px", fontSize: 11.5 }} role="tab" tabIndex={0} aria-selected={formTab === key}
                      onClick={() => setFormTab(key)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFormTab(key); } }}>{label}</span>
                  ))}
                </div>
                {selectedReported ? (
                  <div className="alert" style={{ background: "var(--info-soft, #eef2fb)", color: "#3b82f6", margin: "0 0 12px" }}>
                    Buổi dạy này đã có báo cáo ({reportMeta(selectedSession.report_status).label}). Chọn lớp khác để nhập báo cáo mới.
                  </div>
                ) : null}
                <div className="dr-pane">
                  {formTab === "general" ? (
                    <div className="grid c2">
                      <label>
                        <span className="field-label">Sĩ số học sinh đi học *</span>
                        <input type="number" min="0" placeholder="12" value={form.student_count} onChange={(e) => setForm((p) => ({ ...p, student_count: e.target.value }))} />
                      </label>
                      <label>
                        <span className="field-label">Chủ đề bài học *</span>
                        <input type="text" placeholder="Unit 6: The City (Phonics: ch / sh)" value={form.topic} onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))} />
                      </label>
                      <label style={{ gridColumn: "1 / -1" }}>
                        <span className="field-label">Hoạt động chính / Nhận xét</span>
                        <textarea rows={3} placeholder="Mô tả hoạt động, mục tiêu đạt được..." value={form.activities} onChange={(e) => setForm((p) => ({ ...p, activities: e.target.value }))} />
                      </label>
                    </div>
                  ) : (
                    <div className="small muted" style={{ padding: "8px 2px" }}>Nhập thông tin ở tab “Thông tin chung” rồi lưu báo cáo.</div>
                  )}
                </div>
                {formError ? <div className="alert red" style={{ marginTop: 10 }}>{formError}</div> : null}
                <div className="flex mt16" style={{ justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="btn ghost" disabled={saving || selectedReported} onClick={() => saveReport(false)}>💾 Lưu tạm</button>
                  <button type="button" className="btn ghost" onClick={() => { setForm({ student_count: "", topic: "", activities: "" }); setFormError(""); }}>Xóa</button>
                  <button type="button" className="btn primary" disabled={saving || selectedReported || !sessions.length} onClick={() => saveReport(true)}>{saving ? "Đang lưu..." : "Lưu & Tiếp tục"}</button>
                </div>
              </div>

              <div className="card rp-form">
                <div className="card-head"><h3>NHẬP BÁO CÁO TRUYỀN THÔNG</h3></div>
                <div className="grid c2">
                  <label>
                    <span className="field-label">Kênh truyền thông</span>
                    <select value={mediaForm.channel} onChange={(e) => setMediaForm((p) => ({ ...p, channel: e.target.value }))}>
                      {CHANNEL_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Loại nội dung</span>
                    <select value={mediaForm.content_type} onChange={(e) => setMediaForm((p) => ({ ...p, content_type: e.target.value }))}>
                      {CONTENT_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                  <label style={{ gridColumn: "1 / -1" }}>
                    <span className="field-label">Tiêu đề / Caption *</span>
                    <input type="text" placeholder="Tiêu đề bài đăng..." value={mediaForm.title} onChange={(e) => setMediaForm((p) => ({ ...p, title: e.target.value }))} />
                  </label>
                  <label style={{ gridColumn: "1 / -1" }}>
                    <span className="field-label">Mô tả nội dung</span>
                    <textarea rows={2} placeholder="Mô tả ngắn về nội dung đã đăng..." value={mediaForm.description} onChange={(e) => setMediaForm((p) => ({ ...p, description: e.target.value }))} />
                  </label>
                </div>
                <div className="mt12">
                  <span className="field-label">Kết quả đạt được</span>
                  <div className="grid c4">
                    {[["reach", "Lượt tiếp cận"], ["engagement", "Lượt tương tác"], ["responses", "Lượt phản hồi"], ["shares", "Lượt chia sẻ"]].map(([key, l]) => (
                      <input key={key} type="number" min="0" placeholder={l} value={mediaForm[key]} onChange={(e) => setMediaForm((p) => ({ ...p, [key]: e.target.value }))} />
                    ))}
                  </div>
                </div>
                {mediaError ? <div className="alert red" style={{ marginTop: 10 }}>{mediaError}</div> : null}
                <div className="flex mt16" style={{ justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="btn ghost" onClick={() => { setMediaForm(emptyMediaForm); setMediaError(""); }}>Xóa</button>
                  <button type="button" className="btn primary" disabled={mediaSaving} onClick={saveMediaReport}>{mediaSaving ? "Đang lưu..." : "Lưu báo cáo"}</button>
                </div>
              </div>
              </>
              ) : (
              <div className="card rp-form">
                <div className="card-head"><h3>IMPORT BÁO CÁO {RANGE_WORD[rangeTab].toUpperCase()}</h3></div>
                <p className="small muted" style={{ marginTop: 0 }}>
                  Tải lên file Excel báo cáo giảng dạy cho {RANGE_WORD[rangeTab]} này. Mỗi dòng gồm các cột: <b>Ngày</b>, <b>Lớp</b>, <b>Sĩ số</b>, <b>Chủ đề</b>, <b>Nhận xét</b>. Hệ thống khớp theo <b>ngày + lớp</b> và tạo báo cáo cho buổi dạy tương ứng.
                </p>
                <label>
                  <span className="field-label">Chọn file (.xlsx) — {periodLabel(reportDate, rangeTab)}</span>
                  <input ref={reportFileRef} type="file" accept=".xlsx,.xls" />
                </label>
                {reportImportError ? <div className="alert red" style={{ marginTop: 10 }}>{reportImportError}</div> : null}
                <div className="flex mt16" style={{ justifyContent: "flex-end" }}>
                  <button type="button" className="btn primary" disabled={reportImporting} onClick={handleReportImport}>
                    {reportImporting ? "Đang import..." : "📥 Import file báo cáo"}
                  </button>
                </div>
                <div className="card-foot" style={{ marginTop: 16 }}>
                  <span className="small muted">Chỉ tạo báo cáo cho buổi dạy có trong {RANGE_WORD[rangeTab]} đang xem ({periodLabel(reportDate, rangeTab)}).</span>
                </div>
              </div>
              )}
            </div>

            {/* Column 3 — sidebar */}
            <div className="stack">
              <div className="card">
                <div className="card-head"><h3>TỔNG QUAN TRONG NGÀY</h3></div>
                {[
                  ["Buổi dạy đã báo cáo", `${reportedTeaching}/${totalTeaching}`, teachingPct],
                  ["Buổi truyền thông đã báo cáo", `${mediaReported}/${mediaTotal}`, mediaPct],
                  ["Nhiệm vụ đã hoàn thành", `${doneTasks}/${totalTasks}`, completionPct],
                  ["Điểm thi đua tạm tính", "92/100", 92],
                ].map((r) => (
                  <div key={r[0]} style={{ padding: "7px 0" }}>
                    <div className="flex-between"><span className="small">{r[0]}</span><span className="small bold">{r[1]}</span></div>
                    <div className="prog green" style={{ marginTop: 5 }}><i style={{ width: `${r[2]}%` }} /></div>
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="card-head"><h3>HIỆU SUẤT HÔM NAY</h3><span className="badge orange">Demo</span></div>
                {PERFORMANCE.map((r) => (
                  <div key={r[0]} className="flex-between" style={{ padding: "7px 0" }}>
                    <span className="small">{r[0]}</span>
                    <span className="flex" style={{ gap: 8 }}><Stars /><b className="small">{r[1]}%</b></span>
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="card-head"><h3>NHẮC VIỆC CẦN HOÀN THÀNH</h3></div>
                <div className="list">
                  {pendingReminders.length ? pendingReminders.map((r) => (
                    <div className="li" key={r.id}>
                      <div className="ico-sm" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>⏰</div>
                      <div className="li-body"><div className="li-title">{r.title}</div><div className="li-sub">{r.due}</div></div>
                    </div>
                  )) : <div className="small muted" style={{ padding: "8px 2px" }}>Đã báo cáo hết các buổi dạy hôm nay 🎉</div>}
                </div>
                <div className="card-foot"><span className="small muted">Còn {pendingReminders.length} việc cần hoàn thành</span></div>
              </div>

              <div className="card">
                <div className="card-head"><h3>TÀI LIỆU &amp; MẪU THAM KHẢO</h3><span className="badge orange">Demo</span></div>
                <div className="list">
                  {DOCS.map((d) => (
                    <div className="li" key={d[0]}>
                      <div className="ico-sm" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>📄</div>
                      <div className="li-body"><div className="li-title">{d[0]}</div></div>
                      <span className="badge gray">{d[1]}</span>
                    </div>
                  ))}
                </div>
                <div className="card-foot"><span className="small muted">Xem tất cả tài liệu →</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DailyReport;
