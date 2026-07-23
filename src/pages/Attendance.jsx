import { useEffect, useMemo, useState } from "react";
import {
  getClassroomPreview,
  getPayrollPreview,
  listAttendanceDevices,
  listAttendanceEvents,
  listClassroomFinanceConfigs,
  listPayrollConfigs,
  probeAttendanceDevice,
  syncAttendanceDevice,
} from "../services/attendanceService";
import styles from "../styles/attendance.module.css";

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: `Tháng ${index + 1}`,
}));

const matchStatusOptions = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "matched", label: "Đã map nhân sự" },
  { value: "unmatched", label: "Chưa map nhân sự" },
  { value: "ignored", label: "Bỏ qua" },
];

const formatCurrency = (value) =>
  `${new Intl.NumberFormat("vi-VN").format(Math.round(Number(value) || 0))} ₫`;

const formatNumber = (value) =>
  new Intl.NumberFormat("vi-VN").format(Number(value) || 0);

const formatDateTime = (value) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatJson = (value) => {
  if (!value) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  fallback;

const toFilterDateTime = (year, month, endOfMonth = false) => {
  const date = endOfMonth
    ? new Date(year, month, 0, 23, 59, 59, 999)
    : new Date(year, month - 1, 1, 0, 0, 0, 0);
  const timezoneOffset = -date.getTimezoneOffset();
  const sign = timezoneOffset >= 0 ? "+" : "-";
  const absOffset = Math.abs(timezoneOffset);
  const hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
  const minutes = String(absOffset % 60).padStart(2, "0");
  const yearPart = date.getFullYear();
  const monthPart = String(date.getMonth() + 1).padStart(2, "0");
  const dayPart = String(date.getDate()).padStart(2, "0");
  const hourPart = String(date.getHours()).padStart(2, "0");
  const minutePart = String(date.getMinutes()).padStart(2, "0");
  const secondPart = String(date.getSeconds()).padStart(2, "0");
  return `${yearPart}-${monthPart}-${dayPart}T${hourPart}:${minutePart}:${secondPart}${sign}${hours}:${minutes}`;
};

function Attendance() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  const [selectedMatchStatus, setSelectedMatchStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [devices, setDevices] = useState([]);
  const [payrollConfigs, setPayrollConfigs] = useState([]);
  const [classroomConfigs, setClassroomConfigs] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventCount, setEventCount] = useState(0);
  const [eventPage, setEventPage] = useState(1);
  const [hasNextEvents, setHasNextEvents] = useState(false);
  const [hasPrevEvents, setHasPrevEvents] = useState(false);

  const [payrollPreview, setPayrollPreview] = useState(null);
  const [classroomPreview, setClassroomPreview] = useState(null);
  const [probeResult, setProbeResult] = useState(null);
  const [syncResult, setSyncResult] = useState(null);

  const [bootLoading, setBootLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [pageNotice, setPageNotice] = useState("");
  const [eventLoading, setEventLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [probing, setProbing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const selectedDevice = useMemo(
    () => devices.find((item) => String(item.id) === String(selectedDeviceId)) || null,
    [devices, selectedDeviceId],
  );

  const selectedPayrollConfig = useMemo(
    () =>
      payrollConfigs.find(
        (item) => String(item.teacher) === String(selectedTeacherId),
      ) || null,
    [payrollConfigs, selectedTeacherId],
  );

  const selectedClassroomConfig = useMemo(
    () =>
      classroomConfigs.find(
        (item) => String(item.classroom) === String(selectedClassroomId),
      ) || null,
    [classroomConfigs, selectedClassroomId],
  );

  const yearOptions = useMemo(() => {
    const startYear = currentYear - 2;
    return Array.from({ length: 6 }, (_, index) => startYear + index);
  }, [currentYear]);

  const timeline = payrollPreview?.attendance?.daily_timeline || [];
  const matchedEvents = events.filter((item) => item.match_status === "matched").length;
  const unmatchedEvents = events.filter((item) => item.match_status === "unmatched").length;

  useEffect(() => {
    let cancelled = false;

    const fetchBootstrap = async () => {
      setBootLoading(true);
      setPageError("");
      try {
        const [deviceResult, payrollResult, classroomResult] =
          await Promise.allSettled([
            listAttendanceDevices(),
            listPayrollConfigs(),
            listClassroomFinanceConfigs(),
          ]);

        if (cancelled) return;

        if (deviceResult.status === "fulfilled") {
          setDevices(deviceResult.value.results);
          setSelectedDeviceId((currentSelected) =>
            currentSelected || deviceResult.value.results[0]?.id || "",
          );
        }

        if (payrollResult.status === "fulfilled") {
          setPayrollConfigs(payrollResult.value.results);
          setSelectedTeacherId((currentSelected) =>
            currentSelected || payrollResult.value.results[0]?.teacher || "",
          );
        }

        if (classroomResult.status === "fulfilled") {
          setClassroomConfigs(classroomResult.value.results);
          setSelectedClassroomId((currentSelected) =>
            currentSelected || classroomResult.value.results[0]?.classroom || "",
          );
        }

        const failedParts = [deviceResult, payrollResult, classroomResult].filter(
          (item) => item.status === "rejected",
        );

        if (failedParts.length) {
          setPageError(
            "Một phần dữ liệu attendance chưa tải được. Kiểm tra API backend và quyền truy cập.",
          );
        }
      } catch (error) {
        if (!cancelled) {
          setPageError("Không thể khởi tạo màn hình chấm công.");
        }
      } finally {
        if (!cancelled) {
          setBootLoading(false);
        }
      }
    };

    fetchBootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedTeacherId) {
      setPayrollPreview(null);
      return;
    }

    let cancelled = false;
    const fetchPreview = async () => {
      setPreviewLoading(true);
      try {
        const payrollData = await getPayrollPreview(selectedTeacherId, {
          year,
          month,
        });
        if (!cancelled) {
          setPayrollPreview(payrollData);
        }
      } catch (error) {
        if (!cancelled) {
          setPayrollPreview(null);
          setPageError(
            getErrorMessage(error, "Không tải được lương tạm tính của giáo viên."),
          );
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    };

    fetchPreview();
    return () => {
      cancelled = true;
    };
  }, [selectedTeacherId, year, month]);

  useEffect(() => {
    if (!selectedClassroomId) {
      setClassroomPreview(null);
      return;
    }

    let cancelled = false;
    const fetchPreview = async () => {
      try {
        const classroomData = await getClassroomPreview(selectedClassroomId, {
          year,
          month,
        });
        if (!cancelled) {
          setClassroomPreview(classroomData);
        }
      } catch (error) {
        if (!cancelled) {
          setClassroomPreview(null);
          setPageError(
            getErrorMessage(error, "Không tải được học phí tạm tính theo lớp."),
          );
        }
      }
    };

    fetchPreview();
    return () => {
      cancelled = true;
    };
  }, [selectedClassroomId, year, month]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;

    const fetchEvents = async () => {
      setEventLoading(true);
      try {
        const response = await listAttendanceEvents({
          page: eventPage,
          device: selectedDeviceId || undefined,
          match_status:
            selectedMatchStatus !== "all" ? selectedMatchStatus : undefined,
          search: searchTerm || undefined,
          start_time: toFilterDateTime(year, month),
          end_time: toFilterDateTime(year, month, true),
        });

        if (cancelled) return;
        setEvents(response.results);
        setEventCount(response.count);
        setHasNextEvents(Boolean(response.next));
        setHasPrevEvents(Boolean(response.previous));
      } catch (error) {
        if (!cancelled) {
          setEvents([]);
          setEventCount(0);
          setHasNextEvents(false);
          setHasPrevEvents(false);
          setPageError(
            getErrorMessage(error, "Không tải được lịch sử event attendance."),
          );
        }
      } finally {
        if (!cancelled) {
          setEventLoading(false);
        }
      }
    };

    fetchEvents();

    return () => {
      cancelled = true;
    };
  }, [eventPage, month, searchTerm, selectedDeviceId, selectedMatchStatus, year]);

  useEffect(() => {
    setEventPage(1);
  }, [selectedDeviceId, selectedMatchStatus, searchTerm, year, month]);

  const handleProbe = async () => {
    if (!selectedDeviceId) return;
    setProbing(true);
    setPageError("");
    setPageNotice("");
    try {
      const result = await probeAttendanceDevice(selectedDeviceId);
      setProbeResult(result);
      setPageNotice("Đã probe thiết bị thành công.");
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Probe thiết bị thất bại. Kiểm tra IP, tài khoản và mạng nội bộ.",
      );
      setProbeResult({
        ok: false,
        message,
        details: error?.response?.data || null,
      });
      setPageError(message);
    } finally {
      setProbing(false);
    }
  };

  const handleSync = async () => {
    if (!selectedDeviceId) return;
    setSyncing(true);
    setPageError("");
    setPageNotice("");
    try {
      const result = await syncAttendanceDevice(selectedDeviceId, {
        start_time: toFilterDateTime(year, month),
        end_time: toFilterDateTime(year, month, true),
        max_results: 30,
        max_batches: 3,
      });
      setSyncResult(result);
      setPageNotice(
        `Đã đồng bộ ${formatNumber(result?.created_count)} event từ thiết bị.`,
      );
      setEventPage(1);
      const [payrollData, classroomData, eventData] = await Promise.all([
        selectedTeacherId
          ? getPayrollPreview(selectedTeacherId, { year, month })
          : Promise.resolve(null),
        selectedClassroomId
          ? getClassroomPreview(selectedClassroomId, { year, month })
          : Promise.resolve(null),
        listAttendanceEvents({
          page: 1,
          device: selectedDeviceId || undefined,
          match_status:
            selectedMatchStatus !== "all" ? selectedMatchStatus : undefined,
          start_time: toFilterDateTime(year, month),
          end_time: toFilterDateTime(year, month, true),
        }),
      ]);

      setPayrollPreview(payrollData);
      setClassroomPreview(classroomData);
      setEvents(eventData.results);
      setEventCount(eventData.count);
      setHasNextEvents(Boolean(eventData.next));
      setHasPrevEvents(Boolean(eventData.previous));
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Đồng bộ event thất bại. Kiểm tra endpoint ISAPI hoặc cấu hình thiết bị.",
      );
      setSyncResult({
        ok: false,
        message,
        details: error?.response?.data || null,
      });
      setPageError(message);
    } finally {
      setSyncing(false);
    }
  };

  const selectedProbeJson = formatJson(probeResult);
  const selectedSyncJson = formatJson(syncResult);
  const deviceWebhookUrl = selectedDevice?.webhook_url || "--";

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.badge}>Attendance Test View</span>
          <h1>Chấm công, lương và lịch sử event</h1>
          <p>
            Màn hình này dùng để kiểm tra luồng Hikvision từ thiết bị vào CRM:
            probe thiết bị, sync log, xem bảng công và theo dõi lương tạm tính
            theo tháng.
          </p>
        </div>

        <div className={styles.heroActions}>
          <label className={styles.select}>
            <span>Năm</span>
            <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
              {yearOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.select}>
            <span>Tháng</span>
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
            >
              {monthOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleSync}
            disabled={!selectedDeviceId || syncing}
          >
            {syncing ? "Đang sync..." : "Sync từ thiết bị"}
          </button>
        </div>
      </header>

      {pageNotice ? <div className={styles.notice}>{pageNotice}</div> : null}
      {pageError ? <div className={styles.error}>{pageError}</div> : null}

      <section className={styles.summaryRow}>
        <article className={styles.summaryCard}>
          <span>Thiết bị đang quản lý</span>
          <strong>{formatNumber(devices.length)}</strong>
          <small>{selectedDevice?.name || "Chưa chọn thiết bị"}</small>
        </article>
        <article className={styles.summaryCard}>
          <span>Event trong bộ lọc</span>
          <strong>{eventLoading ? "..." : formatNumber(eventCount)}</strong>
          <small>
            Match {formatNumber(matchedEvents)} | Unmatch {formatNumber(unmatchedEvents)}
          </small>
        </article>
        <article className={styles.summaryCard}>
          <span>Lương tạm tính giáo viên</span>
          <strong>
            {payrollPreview
              ? formatCurrency(payrollPreview.salary_components?.net_salary)
              : "--"}
          </strong>
          <small>
            {selectedPayrollConfig?.teacher_name || "Chưa có cấu hình giáo viên"}
          </small>
        </article>
        <article className={styles.summaryCard}>
          <span>Doanh thu lớp thực nhận</span>
          <strong>
            {classroomPreview
              ? formatCurrency(classroomPreview.actual_revenue)
              : "--"}
          </strong>
          <small>
            {selectedClassroomConfig?.classroom_name || "Chưa có cấu hình lớp"}
          </small>
        </article>
      </section>

      <section className={styles.grid}>
        <article className={`${styles.panel} ${styles.panelPrimary}`}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Kết nối thiết bị</h2>
              <p>Chọn terminal Hikvision để probe, sync và kiểm tra webhook.</p>
            </div>
            <div className={styles.panelActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleProbe}
                disabled={!selectedDeviceId || probing}
              >
                {probing ? "Đang probe..." : "Probe"}
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleSync}
                disabled={!selectedDeviceId || syncing}
              >
                {syncing ? "Đang sync..." : "Sync"}
              </button>
            </div>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.select}>
              <span>Thiết bị</span>
              <select
                value={selectedDeviceId}
                onChange={(event) => setSelectedDeviceId(event.target.value)}
              >
                <option value="">Chọn thiết bị</option>
                {devices.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.select}>
              <span>Trạng thái event</span>
              <select
                value={selectedMatchStatus}
                onChange={(event) => setSelectedMatchStatus(event.target.value)}
              >
                {matchStatusOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.deviceMeta}>
            <div>
              <span>Model</span>
              <strong>{selectedDevice?.model_name || "--"}</strong>
            </div>
            <div>
              <span>Base URL</span>
              <strong>{selectedDevice ? `${selectedDevice.protocol}://${selectedDevice.ip_address}:${selectedDevice.port}` : "--"}</strong>
            </div>
            <div>
              <span>Webhook</span>
              <strong className={styles.truncate}>{deviceWebhookUrl}</strong>
            </div>
          </div>

          <div className={styles.jsonGrid}>
            <div className={styles.jsonCard}>
              <div className={styles.jsonHeader}>
                <strong>Probe response</strong>
              </div>
              <pre className={styles.jsonViewer}>
                {selectedProbeJson || "Chưa có dữ liệu probe."}
              </pre>
            </div>
            <div className={styles.jsonCard}>
              <div className={styles.jsonHeader}>
                <strong>Sync response</strong>
              </div>
              <pre className={styles.jsonViewer}>
                {selectedSyncJson || "Chưa có dữ liệu sync."}
              </pre>
            </div>
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Bảng công và lương giáo viên</h2>
              <p>Xem số ngày có chấm công và lương tạm tính theo tháng.</p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.select}>
              <span>Giáo viên</span>
              <select
                value={selectedTeacherId}
                onChange={(event) => setSelectedTeacherId(event.target.value)}
              >
                <option value="">Chọn giáo viên</option>
                {payrollConfigs.map((item) => (
                  <option key={item.id} value={item.teacher}>
                    {item.teacher_name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {previewLoading ? (
            <div className={styles.empty}>Đang tải lương tạm tính...</div>
          ) : payrollPreview ? (
            <>
              <div className={styles.metricGrid}>
                <div className={styles.metricCard}>
                  <span>Thực lĩnh</span>
                  <strong>{formatCurrency(payrollPreview.salary_components?.net_salary)}</strong>
                </div>
                <div className={styles.metricCard}>
                  <span>Ngày công</span>
                  <strong>{formatNumber(payrollPreview.attendance?.attendance_days)}</strong>
                </div>
                <div className={styles.metricCard}>
                  <span>Lương dạy</span>
                  <strong>{formatCurrency(payrollPreview.salary_components?.teaching_salary)}</strong>
                </div>
                <div className={styles.metricCard}>
                  <span>Lương trực</span>
                  <strong>{formatCurrency(payrollPreview.salary_components?.duty_salary)}</strong>
                </div>
              </div>

              <div className={styles.breakdown}>
                <div className={styles.breakdownRow}>
                  <span>Lương cơ bản prorate</span>
                  <strong>{formatCurrency(payrollPreview.salary_components?.prorated_base_salary)}</strong>
                </div>
                <div className={styles.breakdownRow}>
                  <span>Phụ cấp + sale</span>
                  <strong>
                    {formatCurrency(
                      (Number(payrollPreview.salary_components?.allowance) || 0) +
                        (Number(payrollPreview.salary_components?.sale_bonus) || 0),
                    )}
                  </strong>
                </div>
                <div className={styles.breakdownRow}>
                  <span>Căn cứ lương dạy</span>
                  <strong>{formatCurrency(payrollPreview.salary_components?.salary_basis_revenue_total)}</strong>
                </div>
                <div className={styles.breakdownRow}>
                  <span>BHXH nhân sự</span>
                  <strong>{formatCurrency(payrollPreview.salary_components?.insurance_deduction)}</strong>
                </div>
                <div className={styles.breakdownRow}>
                  <span>Thưởng tháng</span>
                  <strong>{formatCurrency(payrollPreview.salary_components?.monthly_bonus)}</strong>
                </div>
                <div className={styles.breakdownRow}>
                  <span>Tổng thu nhập sau BHXH</span>
                  <strong>{formatCurrency(payrollPreview.salary_components?.total_income)}</strong>
                </div>
              </div>

              <div className={styles.timelineCard}>
                <div className={styles.timelineHeader}>
                  <strong>Lịch sử chấm công theo ngày</strong>
                  <span>{timeline.length} ngày có dữ liệu</span>
                </div>
                {timeline.length ? (
                  <ul className={styles.timeline}>
                    {timeline.map((item) => (
                      <li key={item.date} className={styles.timelineItem}>
                        <div>
                          <strong>{item.date}</strong>
                          <span>{item.events} event</span>
                        </div>
                        <div className={styles.timelineTimes}>
                          <span>{formatDateTime(item.first_event)}</span>
                          <span>{formatDateTime(item.last_event)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className={styles.empty}>Chưa có timeline chấm công.</div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.empty}>
              Chưa có payroll config. Hãy tạo `TeacherPayrollConfig` ở backend trước.
            </div>
          )}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Học phí theo lớp</h2>
              <p>Kiểm tra số học sinh, số buổi, doanh thu thực nhận và biên lợi nhuận.</p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.select}>
              <span>Lớp học</span>
              <select
                value={selectedClassroomId}
                onChange={(event) => setSelectedClassroomId(event.target.value)}
              >
                <option value="">Chọn lớp học</option>
                {classroomConfigs.map((item) => (
                  <option key={item.id} value={item.classroom}>
                    {item.classroom_name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {classroomPreview ? (
            <>
              <div className={styles.metricGrid}>
                <div className={styles.metricCard}>
                  <span>Số học sinh</span>
                  <strong>{formatNumber(classroomPreview.student_count)}</strong>
                </div>
                <div className={styles.metricCard}>
                  <span>Số buổi / tháng</span>
                  <strong>{formatNumber(classroomPreview.configured_sessions_per_month)}</strong>
                </div>
                <div className={styles.metricCard}>
                  <span>Gross revenue</span>
                  <strong>{formatCurrency(classroomPreview.gross_revenue)}</strong>
                </div>
                <div className={styles.metricCard}>
                  <span>Estimated margin</span>
                  <strong>{formatCurrency(classroomPreview.estimated_margin)}</strong>
                </div>
              </div>

              <div className={styles.breakdown}>
                <div className={styles.breakdownRow}>
                  <span>Học phí / buổi</span>
                  <strong>{formatCurrency(classroomPreview.tuition_per_session)}</strong>
                </div>
                <div className={styles.breakdownRow}>
                  <span>Thực nhận / buổi</span>
                  <strong>{formatCurrency(classroomPreview.actual_per_session)}</strong>
                </div>
                <div className={styles.breakdownRow}>
                  <span>Chi phí GV ước tính</span>
                  <strong>{formatCurrency(classroomPreview.estimated_teacher_cost)}</strong>
                </div>
                <div className={styles.breakdownRow}>
                  <span>Lượt đi học thực tế</span>
                  <strong>{formatNumber(classroomPreview.payable_student_attendance_count)}</strong>
                </div>
                <div className={styles.breakdownRow}>
                  <span>Mức tính lương GV</span>
                  <strong>{formatCurrency(classroomPreview.salary_basis_per_student)}</strong>
                </div>
                <div className={styles.breakdownRow}>
                  <span>% GV mặc định</span>
                  <strong>{classroomPreview.default_teacher_revenue_share_percent}%</strong>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.empty}>
              Chưa có classroom finance config. Hãy tạo `ClassroomFinanceConfig`
              ở backend trước.
            </div>
          )}
        </article>
      </section>

      <section className={`${styles.panel} ${styles.eventsPanel}`}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Lịch sử chấm công</h2>
            <p>Toàn bộ event chấm công của mọi giáo viên và học viên theo bộ lọc đang chọn.</p>
          </div>
          <div className={styles.panelMeta}>
            <span>{formatNumber(eventCount)} event</span>
            <span>{selectedMatchStatus === "all" ? "Tất cả" : selectedMatchStatus}</span>
          </div>
        </div>

        <div className={styles.formGrid}>
          <label className={styles.select}>
            <span>Tìm theo tên</span>
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Nhập tên giáo viên hoặc học viên..."
            />
          </label>
        </div>

        {bootLoading ? (
          <div className={styles.empty}>Đang tải dữ liệu attendance...</div>
        ) : events.length ? (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Nhân sự</th>
                    <th>Thiết bị</th>
                    <th>Xác thực</th>
                    <th>Sự kiện</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((item) => {
                    const personLabel =
                      item.teacher_name ||
                      item.student_name ||
                      item.person_name ||
                      item.employee_no ||
                      "--";
                    const actorType = item.teacher_name
                      ? "Giáo viên"
                      : item.student_name
                        ? "Học viên"
                        : "Chưa map";
                    return (
                      <tr key={item.id}>
                        <td>{formatDateTime(item.event_time)}</td>
                        <td>
                          <div className={styles.personCell}>
                            <strong>{personLabel}</strong>
                            <span>{actorType}</span>
                          </div>
                        </td>
                        <td>{item.device_name || "--"}</td>
                        <td>{item.verification_mode || "--"}</td>
                        <td>
                          <div className={styles.personCell}>
                            <strong>{item.event_type || "--"}</strong>
                            <span>
                              major {item.major || "--"} / minor {item.minor || "--"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`${styles.statusChip} ${
                              item.match_status === "matched"
                                ? styles.statusMatched
                                : item.match_status === "unmatched"
                                  ? styles.statusUnmatched
                                  : styles.statusIgnored
                            }`}
                          >
                            {item.match_status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.pagination}>
              <span>
                Trang {eventPage} {eventLoading ? "• đang tải" : ""}
              </span>
              <div className={styles.paginationButtons}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setEventPage((current) => Math.max(1, current - 1))}
                  disabled={!hasPrevEvents || eventLoading}
                >
                  Trang trước
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setEventPage((current) => current + 1)}
                  disabled={!hasNextEvents || eventLoading}
                >
                  Trang sau
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.empty}>
            Chưa có event trong khoảng thời gian đang chọn. Bạn có thể bấm
            `Sync từ thiết bị` để test ngay.
          </div>
        )}
      </section>
    </div>
  );
}

export default Attendance;
