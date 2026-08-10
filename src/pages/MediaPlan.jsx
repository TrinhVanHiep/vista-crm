import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  getMediaSummary,
  listAllMediaReports,
  listClassroomsAll,
  updateMediaReport,
} from "../services/calendarService";
import "../styles/vista4.css";

const PAGE_SIZE = 12;
const TODAY = new Date();

const fmt = (n) => (Number(n) || 0).toLocaleString("vi-VN");
const pad2 = (n) => String(n).padStart(2, "0");

const CHANNEL_LABEL = {
  zalo: "Zalo OA",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
  website: "Website",
};
const CHANNEL_ICON = {
  zalo: "💬",
  facebook: "📘",
  youtube: "▶️",
  tiktok: "🎵",
  website: "🌐",
};
const CHANNEL_COLOR = {
  zalo: "#2E9E5B",
  facebook: "#3B82F6",
  youtube: "#E03131",
  tiktok: "#8B5CF6",
  website: "#F26522",
};

const CONTENT_TYPE_LABEL = {
  post: "Bài viết",
  short_video: "Video ngắn",
  album: "Album ảnh",
  livestream: "Livestream",
  message: "Tin nhắn",
};

const STATUS_META = {
  draft: { label: "Bản nháp", cls: "gray" },
  submitted: { label: "Chờ duyệt", cls: "orange" },
  approved: { label: "Đã duyệt", cls: "green" },
};

// 5 tiêu chí nghiệm thu — khớp MediaReport.ACCEPTANCE_KEYS ở backend.
const ACCEPTANCE_ITEMS = [
  ["on_plan", "Đăng đúng kế hoạch"],
  ["quality", "Nội dung đạt chất lượng"],
  ["accurate", "Thông tin chính xác"],
  ["right_channel", "Đúng kênh truyền thông"],
  ["engaged", "Có tương tác/phản hồi"],
];

const TABS = [
  ["month", "📅 Theo tháng"],
  ["week", "🗓️ Theo tuần"],
  ["program", "📚 Theo chương trình"],
  ["classroom", "🏫 Theo lớp"],
];

const WEEKDAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const WEEKS = [
  [1, "Tuần 1 (ngày 1-7)"],
  [2, "Tuần 2 (ngày 8-14)"],
  [3, "Tuần 3 (ngày 15-21)"],
  [4, "Tuần 4 (từ ngày 22)"],
];

const EMPTY_SUMMARY = {
  campaigns: 0,
  this_week: 0,
  pending_acceptance: 0,
  completion_rate: 0,
  classes_active: 0,
  programs_active: 0,
  by_channel: [],
  acceptance: {},
  upcoming: [],
};

const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};
// Thời điểm hiệu lực của một nội dung: ưu tiên lịch dự kiến, sau đó ngày báo cáo.
const effectiveDate = (row) => toDate(row?.planned_at) || toDate(row?.report_date);

const startOfWeek = (date) => {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // về thứ 2
  d.setHours(0, 0, 0, 0);
  return d;
};
const isoDay = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const dayLabel = (d) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
const timeLabel = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

const channelLabel = (row) =>
  row?.channel_display || CHANNEL_LABEL[row?.channel] || row?.channel || "—";
const contentTypeLabel = (row) =>
  row?.content_type_display || CONTENT_TYPE_LABEL[row?.content_type] || row?.content_type || "—";
const statusMeta = (row) =>
  STATUS_META[row?.status] || { label: row?.status_display || row?.status || "—", cls: "gray" };

const acceptedCount = (acceptance) =>
  ACCEPTANCE_ITEMS.reduce((n, [key]) => n + (acceptance && acceptance[key] === true ? 1 : 0), 0);

function Kpi({ ico, icoClass, label, value, sub }) {
  return (
    <div className="kpi">
      <div className={`ico ${icoClass}`} style={{ fontSize: 18 }}>{ico}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
        {sub ? <div className="small muted">{sub}</div> : null}
      </div>
    </div>
  );
}

function ChannelChip({ channel }) {
  const color = CHANNEL_COLOR[channel] || "var(--text-2)";
  return (
    <span className="chip" style={{ background: `${color}18`, color }}>
      {CHANNEL_ICON[channel] || "📣"} {CHANNEL_LABEL[channel] || channel || "—"}
    </span>
  );
}

function Empty({ children }) {
  return (
    <div className="muted small" style={{ padding: "18px 4px", textAlign: "center" }}>
      {children}
    </div>
  );
}

function MediaPlan() {
  const scope = useOutletContext() || {};
  const scopeMonth = Number(scope.month) || TODAY.getMonth() + 1;
  const scopeYear = Number(scope.year) || TODAY.getFullYear();

  const [tab, setTab] = useState("month");
  const [month, setMonth] = useState(scopeMonth);
  const [year, setYear] = useState(scopeYear);
  const [week, setWeek] = useState(1);
  const [program, setProgram] = useState("");
  const [classroom, setClassroom] = useState("");
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [rows, setRows] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [weekRows, setWeekRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  // Chấm nghiệm thu: mở 1 nội dung để tick 5 tiêu chí + đổi trạng thái + nhập chỉ số.
  const [acceptTarget, setAcceptTarget] = useState(null);
  const [acceptForm, setAcceptForm] = useState({ status: "draft", acceptance: {}, reach: "", engagement: "" });
  const [acceptSaving, setAcceptSaving] = useState(false);
  const [acceptError, setAcceptError] = useState("");

  const openAcceptance = (row) => {
    setAcceptError("");
    setAcceptTarget(row);
    setAcceptForm({
      status: row.status || "draft",
      acceptance: { ...(row.acceptance || {}) },
      reach: row.reach ?? "",
      engagement: row.engagement ?? "",
    });
  };

  const saveAcceptance = async () => {
    if (!acceptTarget) return;
    setAcceptSaving(true);
    setAcceptError("");
    try {
      await updateMediaReport(acceptTarget.id, {
        status: acceptForm.status,
        acceptance: acceptForm.acceptance,
        reach: acceptForm.reach === "" ? null : Number(acceptForm.reach),
        engagement: acceptForm.engagement === "" ? null : Number(acceptForm.engagement),
      });
      setAcceptTarget(null);
      setReloadKey((k) => k + 1);
    } catch (error) {
      setAcceptError(
        error?.response?.data?.detail || "Không lưu được nghiệm thu. Vui lòng thử lại.",
      );
    } finally {
      setAcceptSaving(false);
    }
  };

  // Tháng/năm bám theo bộ chọn kỳ trên thanh trên cùng.
  useEffect(() => { setMonth(scopeMonth); }, [scopeMonth]);
  useEffect(() => { setYear(scopeYear); }, [scopeYear]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    listClassroomsAll()
      .then((list) => { if (!cancelled) setClassrooms(Array.isArray(list) ? list : []); })
      .catch(() => { if (!cancelled) setClassrooms([]); });
    return () => { cancelled = true; };
  }, []);

  const params = useMemo(() => {
    const next = { year, month, status, search };
    if (tab === "week") next.week = week;
    if (tab === "program") next.program = program;
    if (tab === "classroom") next.classroom = classroom;
    return next;
  }, [tab, year, month, week, program, classroom, status, search]);

  useEffect(() => { setPage(1); }, [params]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([
      getMediaSummary(params).catch(() => null),
      listAllMediaReports(params).catch(() => null),
    ])
      .then(([summaryData, listData]) => {
        if (cancelled) return;
        if (!summaryData && !listData) {
          setSummary(EMPTY_SUMMARY);
          setRows([]);
          setError("Không tải được dữ liệu truyền thông. Vui lòng thử lại.");
          return;
        }
        setSummary({ ...EMPTY_SUMMARY, ...(summaryData || {}) });
        setRows(Array.isArray(listData?.results) ? listData.results : []);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params, reloadKey]);

  // Lịch tuần hiện tại (thứ 2 -> CN) — độc lập với bộ lọc phía trên.
  const weekStart = useMemo(() => startOfWeek(TODAY), []);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [weekStart]);

  useEffect(() => {
    let cancelled = false;
    listAllMediaReports({ date_from: isoDay(weekStart), date_to: isoDay(weekEnd) }, 10)
      .then((data) => { if (!cancelled) setWeekRows(Array.isArray(data?.results) ? data.results : []); })
      .catch(() => { if (!cancelled) setWeekRows([]); });
    return () => { cancelled = true; };
  }, [weekStart, weekEnd, reloadKey]);

  const programs = useMemo(() => {
    const set = new Set();
    classrooms.forEach((c) => {
      const name = (c?.program_name || "").trim();
      if (name) set.add(name);
    });
    rows.forEach((r) => {
      const name = (r?.program_name || "").trim();
      if (name) set.add(name);
    });
    return [...set].sort((a, b) => a.localeCompare(b, "vi"));
  }, [classrooms, rows]);

  const classroomOptions = useMemo(
    () =>
      [...classrooms].sort((a, b) =>
        String(a?.class_code || a?.name || "").localeCompare(
          String(b?.class_code || b?.name || ""),
          "vi",
        ),
      ),
    [classrooms],
  );

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const da = effectiveDate(a);
      const db = effectiveDate(b);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db - da;
    });
  }, [rows]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sortedRows, page],
  );

  // Nội dung nằm trong tuần hiện tại, xếp theo thời gian tăng dần.
  const weekPlan = useMemo(() => {
    return weekRows
      .map((row) => ({ row, at: effectiveDate(row) }))
      .filter(({ at }) => at && at >= weekStart && at <= weekEnd)
      .sort((a, b) => a.at - b.at);
  }, [weekRows, weekStart, weekEnd]);

  const pendingRows = useMemo(
    () =>
      sortedRows
        .filter((row) => row.status !== "approved")
        .sort((a, b) => (a.status === "submitted" ? -1 : 0) - (b.status === "submitted" ? -1 : 0)),
    [sortedRows],
  );

  // Tổng hợp theo chương trình: gom từ chính danh sách nội dung đang lọc.
  const programStats = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const name = (row.program_name || "").trim();
      if (!name) return;
      const entry = map.get(name) || { name, total: 0, approved: 0, classes: new Set() };
      entry.total += 1;
      if (row.status === "approved") entry.approved += 1;
      if (row.classroom_name) entry.classes.add(row.classroom_name);
      map.set(name, entry);
    });
    return [...map.values()]
      .map((entry) => ({
        name: entry.name,
        total: entry.total,
        approved: entry.approved,
        classes: entry.classes.size,
        percent: entry.total ? Math.round((entry.approved / entry.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  const byChannel = Array.isArray(summary.by_channel) ? summary.by_channel : [];
  const hasChannelData = byChannel.some((c) => Number(c?.total) > 0);
  const acceptanceTotal = ACCEPTANCE_ITEMS.reduce(
    (n, [key]) => n + (Number(summary.acceptance?.[key]?.total) || 0),
    0,
  );
  const upcoming = Array.isArray(summary.upcoming) ? summary.upcoming : [];

  const scopeLabel = `Tháng ${pad2(month)}/${year}`;
  const filterLabel = useMemo(() => {
    if (tab === "week") return `${scopeLabel} · ${WEEKS.find(([w]) => w === week)?.[1] || `Tuần ${week}`}`;
    if (tab === "program") return `${scopeLabel} · ${program || "Tất cả chương trình"}`;
    if (tab === "classroom") {
      const found = classroomOptions.find((c) => String(c.id) === String(classroom));
      return `${scopeLabel} · ${found ? found.class_code || found.name : "Tất cả lớp"}`;
    }
    return scopeLabel;
  }, [tab, scopeLabel, week, program, classroom, classroomOptions]);

  const selectStyle = {
    padding: "8px 12px",
    border: "1px solid var(--border)",
    borderRadius: 9,
    fontSize: 12.5,
    fontFamily: "inherit",
    background: "var(--card)",
    color: "var(--text)",
  };

  return (
    <div className="v4page">
      <div className="content" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div className="content-col">
          {/* 1. Header */}
          <div className="page-head">
            <div className="flex-between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h1>Truyền thông</h1>
                <p>Theo dõi kế hoạch nội dung, tiến độ triển khai và nghiệm thu truyền thông</p>
              </div>
              <button type="button" className="btn ghost" onClick={() => setReloadKey((k) => k + 1)}>
                ↻ Làm mới
              </button>
            </div>
          </div>

          {error ? (
            <div className="alert red" style={{ marginBottom: 14 }}>
              <div>{error}</div>
            </div>
          ) : null}

          {/* 2. KPI */}
          <div className="kpi-grid">
            <Kpi ico="📣" icoClass="orange" label="Tổng nội dung tháng" value={fmt(summary.campaigns)} sub={scopeLabel} />
            <Kpi ico="🗓️" icoClass="blue" label="Nội dung trong tuần" value={fmt(summary.this_week)} sub={`${dayLabel(weekStart)} – ${dayLabel(weekEnd)}`} />
            <Kpi ico="⏳" icoClass="yellow" label="Chờ nghiệm thu" value={fmt(summary.pending_acceptance)} sub="chưa được duyệt" />
            <Kpi ico="✅" icoClass="green" label="Tỷ lệ hoàn thành" value={`${Number(summary.completion_rate) || 0}%`} sub="nội dung đã duyệt" />
            <Kpi ico="🏫" icoClass="purple" label="Lớp có hoạt động" value={fmt(summary.classes_active)} sub="lớp có nội dung" />
            <Kpi ico="📚" icoClass="red" label="Chương trình có nội dung" value={fmt(summary.programs_active)} sub="chương trình" />
          </div>

          <div className="stack">
            {/* 3. Bộ lọc + bảng kế hoạch nội dung */}
            <div className="card">
              <div className="card-head" style={{ flexWrap: "wrap" }}>
                <h3>Kế hoạch nội dung truyền thông</h3>
                <span className="small muted">{filterLabel}</span>
              </div>

              <div className="tabs" role="tablist" style={{ flexWrap: "wrap", marginBottom: 12 }}>
                {TABS.map(([key, label]) => (
                  <span
                    key={key}
                    role="tab"
                    tabIndex={0}
                    aria-selected={tab === key}
                    className={`tab${tab === key ? " active" : ""}`}
                    onClick={() => setTab(key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTab(key); }
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>

              <div className="flex mb12" style={{ gap: 10, flexWrap: "wrap" }}>
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={selectStyle} aria-label="Tháng">
                  {MONTHS.map((m) => <option key={m} value={m}>Tháng {pad2(m)}</option>)}
                </select>
                <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={selectStyle} aria-label="Năm">
                  {Array.from({ length: 5 }, (_, i) => TODAY.getFullYear() - 2 + i).map((y) => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </select>

                {tab === "week" ? (
                  <select value={week} onChange={(e) => setWeek(Number(e.target.value))} style={selectStyle} aria-label="Tuần">
                    {WEEKS.map(([w, label]) => <option key={w} value={w}>{label}</option>)}
                  </select>
                ) : null}

                {tab === "program" ? (
                  <select value={program} onChange={(e) => setProgram(e.target.value)} style={{ ...selectStyle, minWidth: 220 }} aria-label="Chương trình">
                    <option value="">Tất cả chương trình</option>
                    {programs.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : null}

                {tab === "classroom" ? (
                  <select value={classroom} onChange={(e) => setClassroom(e.target.value)} style={{ ...selectStyle, minWidth: 200 }} aria-label="Lớp">
                    <option value="">Tất cả lớp</option>
                    {classroomOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {(c.class_code || c.name) + (c.class_code && c.name && c.class_code !== c.name ? ` · ${c.name}` : "")}
                      </option>
                    ))}
                  </select>
                ) : null}

                <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle} aria-label="Trạng thái">
                  <option value="">Tất cả trạng thái</option>
                  <option value="draft">Bản nháp</option>
                  <option value="submitted">Chờ duyệt</option>
                  <option value="approved">Đã duyệt</option>
                </select>

                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Tìm tiêu đề, chương trình, lớp..."
                  aria-label="Tìm kiếm nội dung"
                  style={{ ...selectStyle, flex: "1 1 200px", minWidth: 160 }}
                />
              </div>

              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Chương trình</th>
                      <th>Lớp</th>
                      <th>Tiêu đề</th>
                      <th>Loại nội dung</th>
                      <th>Kênh đăng</th>
                      <th>Thời gian</th>
                      <th>Người phụ trách</th>
                      <th className="t-center">Trạng thái</th>
                      <th className="t-center">Nghiệm thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={9} className="muted" style={{ padding: 18, textAlign: "center" }}>Đang tải...</td></tr>
                    ) : pageRows.length ? (
                      pageRows.map((row) => {
                        const st = statusMeta(row);
                        const at = effectiveDate(row);
                        const planned = toDate(row.planned_at);
                        const done = acceptedCount(row.acceptance);
                        const accCls = done >= ACCEPTANCE_ITEMS.length ? "green" : done > 0 ? "orange" : "gray";
                        return (
                          <tr key={row.id}>
                            <td className="muted">{row.program_name || "—"}</td>
                            <td className="bold">{row.classroom_name || "—"}</td>
                            <td style={{ whiteSpace: "normal", minWidth: 220, maxWidth: 320 }}>
                              <div className="bold">{row.title}</div>
                              {row.description ? (
                                <div className="small muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>
                                  {row.description}
                                </div>
                              ) : null}
                            </td>
                            <td className="small">{contentTypeLabel(row)}</td>
                            <td><ChannelChip channel={row.channel} /></td>
                            <td className="small">
                              {at ? (
                                <>
                                  <div className="bold">{dayLabel(at)}/{at.getFullYear()}</div>
                                  <div className="muted" style={{ fontSize: 11 }}>
                                    {planned ? `${timeLabel(planned)} · dự kiến` : "theo ngày báo cáo"}
                                  </div>
                                </>
                              ) : "—"}
                            </td>
                            <td className="small">{row.assignee_name || row.created_by?.name || "—"}</td>
                            <td className="t-center"><span className={`badge ${st.cls}`}>{st.label}</span></td>
                            <td className="t-center">
                              <button
                                type="button"
                                className={`badge ${accCls}`}
                                style={{ border: "none", cursor: "pointer", font: "inherit" }}
                                title="Bấm để chấm nghiệm thu / cập nhật trạng thái"
                                onClick={() => openAcceptance(row)}
                              >
                                {done}/{ACCEPTANCE_ITEMS.length}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="muted" style={{ padding: 18, textAlign: "center" }}>
                          Chưa có nội dung truyền thông nào khớp bộ lọc này.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex-between mt12" style={{ flexWrap: "wrap", gap: 8 }}>
                <span className="small muted">
                  {sortedRows.length
                    ? `Hiển thị ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, sortedRows.length)} / ${fmt(sortedRows.length)} nội dung`
                    : "0 nội dung"}
                </span>
                {pageCount > 1 ? (
                  <div className="flex" style={{ gap: 8 }}>
                    <button type="button" className="btn ghost sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Trước</button>
                    <span className="small" style={{ alignSelf: "center" }}>Trang {page}/{pageCount}</span>
                    <button type="button" className="btn ghost sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>Sau ›</button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* 4. Lịch đăng nội dung trong tuần */}
            <div className="card">
              <div className="card-head" style={{ flexWrap: "wrap" }}>
                <h3>Lịch đăng nội dung trong tuần</h3>
                <span className="small muted">{dayLabel(weekStart)} – {dayLabel(weekEnd)}/{weekEnd.getFullYear()}</span>
              </div>
              {weekPlan.length ? (
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Giờ</th>
                        <th>Ngày</th>
                        <th>Tiêu đề</th>
                        <th>Kênh</th>
                        <th>Lớp</th>
                        <th className="t-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weekPlan.map(({ row, at }) => {
                        const st = statusMeta(row);
                        return (
                          <tr key={`w-${row.id}`}>
                            <td className="bold" style={{ color: "var(--primary)" }}>
                              {row.planned_at ? timeLabel(at) : "—"}
                            </td>
                            <td className="small">
                              <div className="bold">{WEEKDAYS[at.getDay()]}</div>
                              <div className="muted" style={{ fontSize: 11 }}>{dayLabel(at)}</div>
                            </td>
                            <td style={{ whiteSpace: "normal", minWidth: 220 }}>{row.title}</td>
                            <td><ChannelChip channel={row.channel} /></td>
                            <td className="small muted">{row.classroom_name || "—"}</td>
                            <td className="t-center"><span className={`badge ${st.cls}`}>{st.label}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <>
                  <Empty>Chưa có nội dung nào được lên lịch trong tuần này.</Empty>
                  {upcoming.length ? (
                    <>
                      <hr className="hr" />
                      <div className="section-label" style={{ fontSize: 12.5 }}>Nội dung sắp đăng</div>
                      <div className="list">
                        {upcoming.map((item) => {
                          const at = toDate(item.planned_at);
                          return (
                            <div className="li" key={`up-${item.id}`}>
                              <div className="ico-sm" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                                {CHANNEL_ICON[item.channel] || "📣"}
                              </div>
                              <div className="li-body">
                                <div className="li-title">{item.title}</div>
                                <div className="li-sub">
                                  {CHANNEL_LABEL[item.channel] || item.channel || "—"}
                                  {item.classroom_name ? ` · ${item.classroom_name}` : ""}
                                </div>
                              </div>
                              <span className="li-end small">{at ? `${timeLabel(at)} ${dayLabel(at)}` : "—"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : null}
                </>
              )}
            </div>

            {/* 5. Tổng hợp theo chương trình */}
            <div className="card">
              <div className="card-head" style={{ flexWrap: "wrap" }}>
                <h3>Tổng hợp theo chương trình</h3>
                <span className="small muted">{filterLabel}</span>
              </div>
              {loading ? (
                <Empty>Đang tải...</Empty>
              ) : programStats.length ? (
                <div className="grid c3">
                  {programStats.map((item) => (
                    <div
                      key={item.name}
                      style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 13, background: "#FFFDF9" }}
                    >
                      <div className="bold" style={{ fontSize: 12.5, marginBottom: 8 }}>{item.name}</div>
                      <div className="kv" style={{ padding: "4px 0" }}>
                        <span className="k">Số lượng nội dung</span>
                        <span className="v">{fmt(item.total)}</span>
                      </div>
                      <div className="kv" style={{ padding: "4px 0" }}>
                        <span className="k">Lớp có nội dung</span>
                        <span className="v">{fmt(item.classes)}</span>
                      </div>
                      <div className="flex-between small" style={{ margin: "6px 0 5px" }}>
                        <span className="muted bold">Tỷ lệ hoàn thành</span>
                        <span className="bold">{item.percent}%</span>
                      </div>
                      <div className={`prog ${item.percent >= 80 ? "green" : item.percent >= 50 ? "yellow" : "red"}`}>
                        <i style={{ width: `${item.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty>Chưa có nội dung nào gắn với chương trình trong kỳ này.</Empty>
              )}
            </div>
          </div>
        </div>

        {/* Cột phải */}
        <div className="rightbar">
          <div className="card">
            <div className="card-head">
              <h3>Nội dung chờ duyệt</h3>
              <span className="badge orange">{fmt(summary.pending_acceptance)}</span>
            </div>
            {loading ? (
              <Empty>Đang tải...</Empty>
            ) : pendingRows.length ? (
              <div className="list">
                {pendingRows.slice(0, 6).map((row) => {
                  const st = statusMeta(row);
                  const at = effectiveDate(row);
                  return (
                    <div className="li" key={`p-${row.id}`}>
                      <div className="ico-sm" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
                        {CHANNEL_ICON[row.channel] || "📣"}
                      </div>
                      <div className="li-body">
                        <div className="li-title" style={{ whiteSpace: "normal" }}>{row.title}</div>
                        <div className="li-sub">
                          {row.classroom_name || row.program_name || channelLabel(row)}
                          {at ? ` · ${dayLabel(at)}` : ""}
                        </div>
                      </div>
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty>Không còn nội dung nào chờ duyệt.</Empty>
            )}
            {pendingRows.length > 6 ? (
              <div className="card-foot small muted">và {fmt(pendingRows.length - 6)} nội dung khác</div>
            ) : null}
          </div>

          <div className="card">
            <div className="card-head">
              <h3>KPI kênh truyền thông</h3>
              <span className="small muted">đã duyệt / tổng</span>
            </div>
            {loading ? (
              <Empty>Đang tải...</Empty>
            ) : hasChannelData ? (
              <div>
                {byChannel.map((item) => {
                  const total = Number(item.total) || 0;
                  const approved = Number(item.approved) || 0;
                  const percent = Number(item.percent) || 0;
                  const color = CHANNEL_COLOR[item.channel] || "var(--primary)";
                  return (
                    <div key={item.channel} style={{ marginBottom: 11 }}>
                      <div className="flex-between small" style={{ marginBottom: 5 }}>
                        <span className="bold">
                          {CHANNEL_ICON[item.channel] || "📣"} {item.label || CHANNEL_LABEL[item.channel] || item.channel}
                        </span>
                        <span className="muted">{fmt(approved)}/{fmt(total)} · {percent}%</span>
                      </div>
                      <div className="prog">
                        <i style={{ width: `${Math.min(100, Math.max(0, percent))}%`, background: color }} />
                      </div>
                      {total > 0 && Number(item.reach) > 0 ? (
                        <div className="small muted" style={{ marginTop: 3, fontSize: 11 }}>
                          Tiếp cận: {fmt(item.reach)}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty>Chưa có nội dung nào theo kênh trong kỳ này.</Empty>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Checklist nghiệm thu</h3>
              <span className="small muted">{fmt(summary.campaigns)} nội dung</span>
            </div>
            {loading ? (
              <Empty>Đang tải...</Empty>
            ) : acceptanceTotal > 0 ? (
              <div>
                {ACCEPTANCE_ITEMS.map(([key, label]) => {
                  const entry = summary.acceptance?.[key] || {};
                  const done = Number(entry.done) || 0;
                  const total = Number(entry.total) || 0;
                  const percent = total ? Math.round((done / total) * 100) : 0;
                  return (
                    <div key={key} style={{ marginBottom: 11 }}>
                      <div className="flex-between small" style={{ marginBottom: 5 }}>
                        <span className="bold" style={{ whiteSpace: "normal" }}>{label}</span>
                        <span className="muted">{fmt(done)}/{fmt(total)}</span>
                      </div>
                      <div className={`prog ${percent >= 80 ? "green" : percent >= 50 ? "yellow" : "red"}`}>
                        <i style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty>Chưa có nội dung để nghiệm thu trong kỳ này.</Empty>
            )}
          </div>
        </div>
      </div>

      {/* Modal chấm nghiệm thu 1 nội dung */}
      {acceptTarget ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed", inset: 0, background: "rgba(30,20,10,.45)", zIndex: 60,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
          onClick={() => setAcceptTarget(null)}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(560px, 100%)", maxHeight: "90vh", overflow: "auto", padding: 22 }}
          >
            <h2 style={{ marginTop: 0, fontSize: 17 }}>Nghiệm thu nội dung</h2>
            <div className="small muted" style={{ marginBottom: 14 }}>
              {acceptTarget.title}
              {acceptTarget.classroom_name ? ` · Lớp ${acceptTarget.classroom_name}` : ""}
            </div>

            <div style={{ marginBottom: 14 }}>
              <div className="small bold" style={{ marginBottom: 6 }}>Tiêu chí nghiệm thu</div>
              {ACCEPTANCE_ITEMS.map(([key, label]) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={acceptForm.acceptance?.[key] === true}
                    onChange={(e) =>
                      setAcceptForm((p) => ({
                        ...p,
                        acceptance: { ...p.acceptance, [key]: e.target.checked },
                      }))
                    }
                  />
                  <span style={{ fontSize: 13 }}>{label}</span>
                </label>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
              <label>
                <span className="field-label">Trạng thái</span>
                <select
                  value={acceptForm.status}
                  onChange={(e) => setAcceptForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="draft">Bản nháp</option>
                  <option value="submitted">Chờ duyệt</option>
                  <option value="approved">Đã duyệt</option>
                </select>
              </label>
              <label>
                <span className="field-label">Lượt tiếp cận</span>
                <input
                  type="number" min="0" placeholder="0"
                  value={acceptForm.reach}
                  onChange={(e) => setAcceptForm((p) => ({ ...p, reach: e.target.value }))}
                />
              </label>
              <label>
                <span className="field-label">Lượt tương tác</span>
                <input
                  type="number" min="0" placeholder="0"
                  value={acceptForm.engagement}
                  onChange={(e) => setAcceptForm((p) => ({ ...p, engagement: e.target.value }))}
                />
              </label>
            </div>

            {acceptError ? (
              <div style={{ marginTop: 12, color: "#c0392b", fontSize: 13 }}>{acceptError}</div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
              <button type="button" className="btn ghost sm" onClick={() => setAcceptTarget(null)}>Đóng</button>
              <button type="button" className="btn primary" onClick={saveAcceptance} disabled={acceptSaving}>
                {acceptSaving ? "Đang lưu..." : "Lưu nghiệm thu"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default MediaPlan;
