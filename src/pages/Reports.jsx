import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  getScheduleSummary,
  listSchedules,
} from "../services/calendarService";
import styles from "../styles/reports.module.css";

const now = new Date();

const categoryOptions = [
  { value: "", label: "Tất cả loại lịch", color: "#5b697d" },
  { value: "student", label: "Học sinh - Lớp học", color: "#2f6fe4" },
  { value: "marketing", label: "Truyền thông - Bán hàng", color: "#de5555" },
  { value: "finance", label: "Tài chính - Kế toán", color: "#1f8f55" },
  { value: "hr", label: "Hành chính - Nhân sự", color: "#7656d9" },
];

const statusOptions = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "todo", label: "Chưa bắt đầu", tone: "neutral" },
  { value: "in_progress", label: "Đang thực hiện", tone: "info" },
  { value: "done", label: "Hoàn thành", tone: "success" },
  { value: "delay", label: "Chậm tiến độ", tone: "warning" },
  { value: "cancel", label: "Đã hủy", tone: "danger" },
];

const sourceOptions = [
  { value: "", label: "Tất cả nguồn lịch" },
  { value: "monthly_work_plan", label: "Kế hoạch làm việc" },
  { value: "teaching_session", label: "Lịch báo giảng" },
];

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: `Tháng ${index + 1}`,
}));

const weekKeyToIndex = {
  week48: 1,
  week49: 2,
  week50: 3,
  week51: 4,
};

const defaultWeekColumns = [
  { id: "week48", label: "Tuần 1", subtitle: "01-07" },
  { id: "week49", label: "Tuần 2", subtitle: "08-14" },
  { id: "week50", label: "Tuần 3", subtitle: "15-21" },
  { id: "week51", label: "Tuần 4", subtitle: "22-cuối tháng" },
];

const categoryMeta = categoryOptions.reduce((acc, item) => {
  if (item.value) acc[item.value] = item;
  return acc;
}, {});

const statusMeta = statusOptions.reduce((acc, item) => {
  if (item.value) acc[item.value] = item;
  return acc;
}, {});

const sourceMeta = sourceOptions.reduce((acc, item) => {
  if (item.value) acc[item.value] = item;
  return acc;
}, {});

const formatNumber = (value) =>
  new Intl.NumberFormat("vi-VN").format(Number(value) || 0);

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

const formatDate = (value) => {
  if (!value) return "--";
  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (data?.detail) return data.detail;
  if (data?.message) return data.message;
  return fallback;
};

const getSortTime = (row) => {
  if (row.eventDate) {
    return new Date(`${row.eventDate}T00:00:00`).getTime();
  }
  return (Number(row.weekIndex) || 99) * 1000000000;
};

function Reports() {
  const [filters, setFilters] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    category: "",
    status: "",
    source: "",
    search: "",
  });
  const [summary, setSummary] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const yearOptions = useMemo(() => {
    const currentYear = now.getFullYear();
    return Array.from({ length: 5 }, (_, index) => currentYear - 2 + index);
  }, []);

  useEffect(() => {
    let isActive = true;

    const fetchReport = async () => {
      setLoading(true);
      setError("");
      try {
        const params = {
          year: filters.year,
          month: filters.month,
        };
        const [summaryData, scheduleData] = await Promise.all([
          getScheduleSummary(params),
          listSchedules({ ...params, page_size: 100 }),
        ]);
        if (!isActive) return;
        setSummary(summaryData);
        setSchedules(scheduleData.results || []);
      } catch (fetchError) {
        if (!isActive) return;
        setSummary(null);
        setSchedules([]);
        setError(getErrorMessage(fetchError, "Không thể tải báo cáo lịch."));
      } finally {
        if (isActive) setLoading(false);
      }
    };

    fetchReport();

    return () => {
      isActive = false;
    };
  }, [filters.year, filters.month, reloadKey]);

  const scheduleMap = useMemo(() => {
    return new Map(schedules.map((item) => [String(item.id), item]));
  }, [schedules]);

  const columns = useMemo(() => {
    const apiColumns = Array.isArray(summary?.columns) ? summary.columns : [];
    return apiColumns.length ? apiColumns : defaultWeekColumns;
  }, [summary]);

  const rows = useMemo(() => {
    const weekMeta = new Map(
      columns.map((column, index) => [
        column.id,
        {
          label: column.label || `Tuần ${index + 1}`,
          subtitle: column.subtitle || "",
          index: weekKeyToIndex[column.id] || index + 1,
        },
      ]),
    );

    const flattened = [];
    const events = summary?.events || {};
    Object.entries(events).forEach(([category, weekGroups]) => {
      Object.entries(weekGroups || {}).forEach(([weekKey, weekEvents]) => {
        if (!Array.isArray(weekEvents)) return;
        weekEvents.forEach((event, eventIndex) => {
          const sourceType = event.source_type || "monthly_work_plan";
          const matchedSchedule =
            sourceType === "monthly_work_plan"
              ? scheduleMap.get(String(event.id))
              : null;
          const weekInfo = weekMeta.get(weekKey) || {
            label: weekKey,
            subtitle: "",
            index: weekKeyToIndex[weekKey] || 1,
          };
          flattened.push({
            uid: `${sourceType}-${event.id || eventIndex}-${category}-${weekKey}`,
            id: event.id,
            title: event.title || matchedSchedule?.title || "Chưa đặt tên",
            description: event.description || matchedSchedule?.description || "",
            category,
            categoryLabel: categoryMeta[category]?.label || category,
            categoryColor: categoryMeta[category]?.color || "#5b697d",
            weekKey,
            weekLabel: weekInfo.label,
            weekSubtitle: weekInfo.subtitle,
            weekIndex: weekInfo.index,
            timeLabel: event.time_label || matchedSchedule?.time_label || "",
            status: event.status || matchedSchedule?.status || "todo",
            eventDate: event.event_date || matchedSchedule?.event_date || "",
            sourceType,
            sourceLabel: sourceMeta[sourceType]?.label || "Kế hoạch làm việc",
            assignedName: matchedSchedule?.assigned_to?.name || "",
            createdByName: matchedSchedule?.created_by?.name || "",
          });
        });
      });
    });

    return flattened.sort((first, second) => {
      const dateDiff = getSortTime(first) - getSortTime(second);
      if (dateDiff) return dateDiff;
      return first.title.localeCompare(second.title, "vi");
    });
  }, [columns, scheduleMap, summary]);

  const filteredRows = useMemo(() => {
    const searchText = normalizeText(filters.search);
    return rows.filter((row) => {
      if (filters.category && row.category !== filters.category) return false;
      if (filters.status && row.status !== filters.status) return false;
      if (filters.source && row.sourceType !== filters.source) return false;
      if (!searchText) return true;
      return normalizeText(
        [
          row.title,
          row.description,
          row.categoryLabel,
          row.sourceLabel,
          row.assignedName,
          row.createdByName,
        ].join(" "),
      ).includes(searchText);
    });
  }, [filters, rows]);

  const reportStats = useMemo(() => {
    const total = filteredRows.length;
    const done = filteredRows.filter((row) => row.status === "done").length;
    const inProgress = filteredRows.filter((row) => row.status === "in_progress").length;
    const delayed = filteredRows.filter((row) => row.status === "delay").length;
    const teachingSessions = filteredRows.filter(
      (row) => row.sourceType === "teaching_session",
    ).length;
    const completionRate = total ? Math.round((done / total) * 100) : 0;

    return {
      total,
      done,
      inProgress,
      delayed,
      teachingSessions,
      completionRate,
    };
  }, [filteredRows]);

  const categoryBreakdown = useMemo(() => {
    const maxValue = Math.max(
      1,
      ...categoryOptions
        .filter((item) => item.value)
        .map((item) => filteredRows.filter((row) => row.category === item.value).length),
    );
    return categoryOptions
      .filter((item) => item.value)
      .map((item) => {
        const total = filteredRows.filter((row) => row.category === item.value).length;
        const done = filteredRows.filter(
          (row) => row.category === item.value && row.status === "done",
        ).length;
        return {
          ...item,
          total,
          done,
          percent: Math.round((total / maxValue) * 100),
        };
      });
  }, [filteredRows]);

  const weeklyBreakdown = useMemo(() => {
    const maxValue = Math.max(
      1,
      ...columns.map(
        (column) => filteredRows.filter((row) => row.weekKey === column.id).length,
      ),
    );
    return columns.map((column, index) => {
      const total = filteredRows.filter((row) => row.weekKey === column.id).length;
      const done = filteredRows.filter(
        (row) => row.weekKey === column.id && row.status === "done",
      ).length;
      return {
        key: column.id,
        label: column.label || `Tuần ${index + 1}`,
        subtitle: column.subtitle || "",
        total,
        done,
        percent: Math.round((total / maxValue) * 100),
      };
    });
  }, [columns, filteredRows]);

  const statusBreakdown = useMemo(() => {
    return statusOptions
      .filter((item) => item.value)
      .map((item) => ({
        ...item,
        total: filteredRows.filter((row) => row.status === item.value).length,
      }));
  }, [filteredRows]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const buildCalendarDetailUrl = (row = {}) => {
    const params = new URLSearchParams({
      category: row.category || filters.category || "student",
      year: String(filters.year),
      month: String(filters.month),
    });

    if (row.eventDate) {
      params.set("view", "day");
      params.set("date", row.eventDate);
    } else if (row.weekIndex) {
      params.set("view", "week");
      params.set("week", String(row.weekIndex));
    } else {
      params.set("view", "month");
    }

    return `/calendar-detail?${params.toString()}`;
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.badge}>Báo cáo lịch</span>
          <h1>Báo cáo lịch tháng</h1>
          <p>
            Tổng hợp kế hoạch làm việc, lịch báo giảng và trạng thái xử lý trong
            tháng {filters.month}/{filters.year}.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setReloadKey((value) => value + 1)}
            disabled={loading}
          >
            Tải lại
          </button>
          <Link to={buildCalendarDetailUrl()} className={styles.primaryButton}>
            Mở lịch chi tiết
          </Link>
        </div>
      </header>

      <section className={styles.filters} aria-label="Bộ lọc báo cáo lịch">
        <label className={styles.field}>
          Năm
          <select
            value={filters.year}
            onChange={(event) => handleFilterChange("year", Number(event.target.value))}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Tháng
          <select
            value={filters.month}
            onChange={(event) => handleFilterChange("month", Number(event.target.value))}
          >
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Loại lịch
          <select
            value={filters.category}
            onChange={(event) => handleFilterChange("category", event.target.value)}
          >
            {categoryOptions.map((item) => (
              <option key={item.value || "all"} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Nguồn lịch
          <select
            value={filters.source}
            onChange={(event) => handleFilterChange("source", event.target.value)}
          >
            {sourceOptions.map((item) => (
              <option key={item.value || "all"} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Trạng thái
          <select
            value={filters.status}
            onChange={(event) => handleFilterChange("status", event.target.value)}
          >
            {statusOptions.map((item) => (
              <option key={item.value || "all"} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className={`${styles.field} ${styles.searchField}`}>
          Tìm kiếm
          <input
            type="search"
            value={filters.search}
            onChange={(event) => handleFilterChange("search", event.target.value)}
            placeholder="Tên lịch, mô tả, người phụ trách"
          />
        </label>
      </section>

      {error ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.summaryGrid} aria-label="Chỉ số lịch tháng">
        <article className={styles.summaryItem}>
          <span>Tổng đầu mục lịch</span>
          <strong>{loading ? "--" : formatNumber(reportStats.total)}</strong>
          <small>Kế hoạch tổng quát và lịch báo giảng trong tháng</small>
        </article>
        <article className={styles.summaryItem}>
          <span>Đã hoàn thành</span>
          <strong>{loading ? "--" : formatNumber(reportStats.done)}</strong>
          <small>{reportStats.completionRate}% trên dữ liệu đang lọc</small>
        </article>
        <article className={styles.summaryItem}>
          <span>Đang thực hiện</span>
          <strong>{loading ? "--" : formatNumber(reportStats.inProgress)}</strong>
          <small>Các lịch cần tiếp tục theo dõi</small>
        </article>
        <article className={styles.summaryItem}>
          <span>Chậm tiến độ</span>
          <strong>{loading ? "--" : formatNumber(reportStats.delayed)}</strong>
          <small>Đầu mục cần quản lý xử lý</small>
        </article>
        <article className={styles.summaryItem}>
          <span>Lịch báo giảng</span>
          <strong>{loading ? "--" : formatNumber(reportStats.teachingSessions)}</strong>
          <small>Các ca dạy đã được đồng bộ vào lịch</small>
        </article>
      </section>

      <div className={styles.reportGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Theo loại lịch</h2>
              <p>Phân bổ số lượng đầu mục theo nhóm công việc.</p>
            </div>
          </div>
          <div className={styles.barList}>
            {categoryBreakdown.map((item) => (
              <Link
                key={item.value}
                to={buildCalendarDetailUrl({ category: item.value })}
                className={styles.barRow}
              >
                <span
                  className={styles.colorDot}
                  style={{ "--dot-color": item.color }}
                  aria-hidden="true"
                />
                <div>
                  <strong>{item.label}</strong>
                  <small>{formatNumber(item.done)} hoàn thành</small>
                </div>
                <div className={styles.meter} aria-hidden="true">
                  <span style={{ "--bar-width": `${item.percent}%` }} />
                </div>
                <b>{formatNumber(item.total)}</b>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Theo tuần</h2>
              <p>Tiến độ lịch được chia theo các tuần trong tháng.</p>
            </div>
          </div>
          <div className={styles.weekGrid}>
            {weeklyBreakdown.map((item) => (
              <article key={item.key} className={styles.weekItem}>
                <span>{item.subtitle || item.label}</span>
                <strong>{item.label}</strong>
                <div className={styles.meter} aria-hidden="true">
                  <span style={{ "--bar-width": `${item.percent}%` }} />
                </div>
                <small>
                  {formatNumber(item.total)} đầu mục, {formatNumber(item.done)} hoàn thành
                </small>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Theo trạng thái</h2>
              <p>Số lượng lịch theo tình trạng xử lý hiện tại.</p>
            </div>
          </div>
          <div className={styles.statusGrid}>
            {statusBreakdown.map((item) => (
              <article key={item.value} className={styles.statusItem}>
                <span className={styles.statusChip} data-tone={item.tone}>
                  {item.label}
                </span>
                <strong>{formatNumber(item.total)}</strong>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Danh sách lịch trong tháng</h2>
            <p>{formatNumber(filteredRows.length)} đầu mục theo bộ lọc hiện tại.</p>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Đầu mục</th>
                <th>Loại lịch</th>
                <th>Nguồn</th>
                <th>Trạng thái</th>
                <th>Phụ trách</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className={styles.emptyCell}>
                    Đang tải báo cáo lịch...
                  </td>
                </tr>
              ) : filteredRows.length ? (
                filteredRows.map((row) => (
                  <tr key={row.uid}>
                    <td>
                      <div className={styles.dateCell}>
                        <strong>{formatDate(row.eventDate)}</strong>
                        <span>
                          {row.weekLabel}
                          {row.timeLabel ? ` | ${row.timeLabel}` : ""}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.titleCell}>
                        <strong>{row.title}</strong>
                        {row.description ? <span>{row.description}</span> : null}
                      </div>
                    </td>
                    <td>
                      <span className={styles.categoryLabel}>
                        <i
                          style={{ "--dot-color": row.categoryColor }}
                          aria-hidden="true"
                        />
                        {row.categoryLabel}
                      </span>
                    </td>
                    <td>{row.sourceLabel}</td>
                    <td>
                      <span
                        className={styles.statusChip}
                        data-tone={statusMeta[row.status]?.tone || "neutral"}
                      >
                        {statusMeta[row.status]?.label || row.status}
                      </span>
                    </td>
                    <td>
                      <div className={styles.ownerCell}>
                        <strong>{row.assignedName || "--"}</strong>
                        {row.createdByName ? <span>Tạo bởi {row.createdByName}</span> : null}
                      </div>
                    </td>
                    <td>
                      <Link to={buildCalendarDetailUrl(row)} className={styles.tableLink}>
                        Chi tiết
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className={styles.emptyCell}>
                    Chưa có dữ liệu lịch phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Reports;
