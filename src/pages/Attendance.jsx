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
import {
  Page,
  PageHeader,
  Card,
  DataTable,
  Button,
  Badge,
  KpiGrid,
  Kpi,
  EmptyState,
  Field,
} from "../ui";
import "../styles/vista4.css";
import styles from "../styles/attendance.module.css";

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: `Tháng ${index + 1}`,
}));

const matchStatusOptions = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "matched", label: "Đã khớp nhân sự" },
  { value: "unmatched", label: "Chưa khớp nhân sự" },
  { value: "ignored", label: "Bỏ qua" },
];

const matchStatusLabels = {
  matched: "Đã khớp",
  unmatched: "Chưa khớp",
  ignored: "Bỏ qua",
};

const matchStatusTones = {
  matched: "green",
  unmatched: "orange",
  ignored: "gray",
};

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

/** Tiêu đề thẻ: dòng tên + dòng mô tả ngắn, dùng chung cho mọi Card của màn này. */
const cardTitle = (title, description) => (
  <div>
    <h3>{title}</h3>
    {description ? (
      <p className="small muted" style={{ marginTop: 3, fontWeight: 500 }}>
        {description}
      </p>
    ) : null}
  </div>
);

const kvRow = (label, value) => (
  <div className="kv">
    <span className="k">{label}</span>
    <span className="v">{value}</span>
  </div>
);

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
            "Một phần dữ liệu chấm công chưa tải được. Kiểm tra kết nối và quyền truy cập.",
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
            getErrorMessage(error, "Không tải được lịch sử chấm công."),
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
      setPageNotice("Đã kiểm tra kết nối thiết bị thành công.");
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Kiểm tra kết nối thiết bị thất bại. Kiểm tra địa chỉ, tài khoản và mạng nội bộ.",
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
        `Đã đồng bộ ${formatNumber(result?.created_count)} lượt chấm công từ thiết bị.`,
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
        "Đồng bộ dữ liệu thất bại. Kiểm tra kết nối hoặc cấu hình thiết bị.",
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

  const currentMatchStatusLabel =
    matchStatusOptions.find((item) => item.value === selectedMatchStatus)?.label ||
    "Tất cả trạng thái";

  const timelineColumns = [
    { key: "date", header: "Ngày", width: 130 },
    {
      key: "events",
      header: "Số lượt",
      align: "right",
      width: 100,
      render: (row) => formatNumber(row.events),
    },
    {
      key: "first_event",
      header: "Lần chấm đầu tiên",
      render: (row) => formatDateTime(row.first_event),
    },
    {
      key: "last_event",
      header: "Lần chấm cuối cùng",
      render: (row) => formatDateTime(row.last_event),
    },
  ];

  const eventColumns = [
    {
      key: "event_time",
      header: "Thời gian",
      width: 170,
      render: (row) => formatDateTime(row.event_time),
    },
    {
      key: "person",
      header: "Nhân sự",
      render: (row) => {
        const personLabel =
          row.teacher_name ||
          row.student_name ||
          row.person_name ||
          row.employee_no ||
          "--";
        const actorType = row.teacher_name
          ? "Giáo viên"
          : row.student_name
            ? "Học viên"
            : "Chưa map";
        return (
          <div>
            <strong>{personLabel}</strong>
            <div className="small muted">{actorType}</div>
          </div>
        );
      },
    },
    {
      key: "device_name",
      header: "Thiết bị",
      render: (row) => row.device_name || "--",
    },
    {
      key: "verification_mode",
      header: "Hình thức xác thực",
      render: (row) => row.verification_mode || "--",
    },
    {
      key: "event_type",
      header: "Loại sự kiện",
      render: (row) => (
        <div>
          <strong>{row.event_type || "--"}</strong>
          <div className="small muted">
            Mã {row.major || "--"} / {row.minor || "--"}
          </div>
        </div>
      ),
    },
    {
      key: "match_status",
      header: "Trạng thái",
      width: 120,
      render: (row) => (
        <Badge tone={matchStatusTones[row.match_status] || "gray"}>
          {matchStatusLabels[row.match_status] || row.match_status}
        </Badge>
      ),
    },
  ];

  return (
    <Page className={styles.page}>
      <PageHeader
        title="Điểm danh & Chấm công"
        description="Theo dõi chấm công, lương và lịch sử điểm danh theo tháng"
        actions={
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <Field label="Năm">
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                style={{ minWidth: 100 }}
              >
                {yearOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tháng">
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                style={{ minWidth: 120 }}
              >
                {monthOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
            <Button
              variant="primary"
              onClick={handleSync}
              disabled={!selectedDeviceId}
              loading={syncing}
              loadingText="Đang đồng bộ..."
            >
              Đồng bộ dữ liệu
            </Button>
          </div>
        }
      />

      {pageNotice ? <div className={styles.notice}>{pageNotice}</div> : null}
      {pageError ? <div className={styles.error}>{pageError}</div> : null}

      <KpiGrid cols={4}>
        <Kpi
          ico={<span style={{ fontSize: 18 }}>📟</span>}
          icoClass="orange"
          label="Thiết bị đang quản lý"
          value={formatNumber(devices.length)}
          sub={selectedDevice?.name || "Chưa chọn thiết bị"}
        />
        <Kpi
          ico={<span style={{ fontSize: 18 }}>🕒</span>}
          icoClass="blue"
          label="Lượt chấm công trong bộ lọc"
          value={eventLoading ? "..." : formatNumber(eventCount)}
          sub={`Đã khớp ${formatNumber(matchedEvents)} | Chưa khớp ${formatNumber(unmatchedEvents)}`}
        />
        <Kpi
          ico={<span style={{ fontSize: 18 }}>💰</span>}
          icoClass="green"
          label="Lương tạm tính giáo viên"
          value={
            payrollPreview
              ? formatCurrency(payrollPreview.salary_components?.net_salary)
              : "--"
          }
          sub={selectedPayrollConfig?.teacher_name || "Chưa có cấu hình giáo viên"}
        />
        <Kpi
          ico={<span style={{ fontSize: 18 }}>🏫</span>}
          icoClass="purple"
          label="Doanh thu lớp thực nhận"
          value={
            classroomPreview ? formatCurrency(classroomPreview.actual_revenue) : "--"
          }
          sub={selectedClassroomConfig?.classroom_name || "Chưa có cấu hình lớp"}
        />
      </KpiGrid>

      <div className="stack">
        <Card
          title={cardTitle(
            "Bảng công và lương giáo viên",
            "Xem số ngày có chấm công và lương tạm tính theo tháng.",
          )}
        >
          <div className="ui-form-grid" style={{ marginBottom: 14 }}>
            <Field label="Giáo viên">
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
            </Field>
          </div>

          {previewLoading ? (
            <EmptyState icon="⏳" title="Đang tải lương tạm tính..." />
          ) : payrollPreview ? (
            <>
              <KpiGrid cols={4}>
                <Kpi
                  ico={<span style={{ fontSize: 18 }}>💵</span>}
                  icoClass="green"
                  label="Thực lĩnh"
                  value={formatCurrency(payrollPreview.salary_components?.net_salary)}
                />
                <Kpi
                  ico={<span style={{ fontSize: 18 }}>📅</span>}
                  icoClass="orange"
                  label="Ngày công"
                  value={formatNumber(payrollPreview.attendance?.attendance_days)}
                />
                <Kpi
                  ico={<span style={{ fontSize: 18 }}>🧑‍🏫</span>}
                  icoClass="blue"
                  label="Lương dạy"
                  value={formatCurrency(
                    payrollPreview.salary_components?.teaching_salary,
                  )}
                />
                <Kpi
                  ico={<span style={{ fontSize: 18 }}>🛎️</span>}
                  icoClass="purple"
                  label="Lương trực"
                  value={formatCurrency(payrollPreview.salary_components?.duty_salary)}
                />
              </KpiGrid>

              <div>
                {kvRow(
                  "Lương cơ bản theo tỷ lệ ngày công",
                  formatCurrency(
                    payrollPreview.salary_components?.prorated_base_salary,
                  ),
                )}
                {kvRow(
                  "Phụ cấp + sale",
                  formatCurrency(
                    (Number(payrollPreview.salary_components?.allowance) || 0) +
                      (Number(payrollPreview.salary_components?.sale_bonus) || 0),
                  ),
                )}
                {kvRow(
                  "Căn cứ lương dạy",
                  formatCurrency(
                    payrollPreview.salary_components?.salary_basis_revenue_total,
                  ),
                )}
                {kvRow(
                  "BHXH nhân sự",
                  formatCurrency(
                    payrollPreview.salary_components?.insurance_deduction,
                  ),
                )}
                {kvRow(
                  "Thưởng tháng",
                  formatCurrency(payrollPreview.salary_components?.monthly_bonus),
                )}
                {kvRow(
                  "Tổng thu nhập sau BHXH",
                  formatCurrency(payrollPreview.salary_components?.total_income),
                )}
              </div>

              <div className="flex-between" style={{ margin: "18px 0 8px" }}>
                <div className="section-label" style={{ marginBottom: 0 }}>
                  Lịch sử chấm công theo ngày
                </div>
                <span className="small muted">
                  {timeline.length} ngày có dữ liệu
                </span>
              </div>
              <DataTable
                columns={timelineColumns}
                rows={timeline}
                rowKey={(row, index) => row.date ?? index}
                empty="Chưa có lịch sử chấm công theo ngày."
                minWidth={560}
              />
            </>
          ) : (
            <EmptyState
              icon="🧾"
              title="Chưa có cấu hình lương cho giáo viên"
              hint="Cần thiết lập cấu hình lương giáo viên trước khi xem lương tạm tính."
            />
          )}
        </Card>

        <Card
          title={cardTitle(
            "Học phí theo lớp",
            "Kiểm tra số học sinh, số buổi, doanh thu thực nhận và biên lợi nhuận.",
          )}
        >
          <div className="ui-form-grid" style={{ marginBottom: 14 }}>
            <Field label="Lớp học">
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
            </Field>
          </div>

          {classroomPreview ? (
            <>
              <KpiGrid cols={4}>
                <Kpi
                  ico={<span style={{ fontSize: 18 }}>👥</span>}
                  icoClass="orange"
                  label="Số học sinh"
                  value={formatNumber(classroomPreview.student_count)}
                />
                <Kpi
                  ico={<span style={{ fontSize: 18 }}>📆</span>}
                  icoClass="blue"
                  label="Số buổi / tháng"
                  value={formatNumber(
                    classroomPreview.configured_sessions_per_month,
                  )}
                />
                <Kpi
                  ico={<span style={{ fontSize: 18 }}>💳</span>}
                  icoClass="green"
                  label="Doanh thu gộp"
                  value={formatCurrency(classroomPreview.gross_revenue)}
                />
                <Kpi
                  ico={<span style={{ fontSize: 18 }}>📈</span>}
                  icoClass="purple"
                  label="Lợi nhuận ước tính"
                  value={formatCurrency(classroomPreview.estimated_margin)}
                />
              </KpiGrid>

              <div>
                {kvRow(
                  "Học phí / buổi",
                  formatCurrency(classroomPreview.tuition_per_session),
                )}
                {kvRow(
                  "Thực nhận / buổi",
                  formatCurrency(classroomPreview.actual_per_session),
                )}
                {kvRow(
                  "Chi phí GV ước tính",
                  formatCurrency(classroomPreview.estimated_teacher_cost),
                )}
                {kvRow(
                  "Lượt đi học thực tế",
                  formatNumber(classroomPreview.payable_student_attendance_count),
                )}
                {kvRow(
                  "Mức tính lương GV",
                  formatCurrency(classroomPreview.salary_basis_per_student),
                )}
                {kvRow(
                  "% GV mặc định",
                  `${classroomPreview.default_teacher_revenue_share_percent}%`,
                )}
              </div>
            </>
          ) : (
            <EmptyState
              icon="🏫"
              title="Chưa có cấu hình tài chính cho lớp học"
              hint="Cần thiết lập cấu hình học phí — chi phí của lớp trước khi xem số liệu."
            />
          )}
        </Card>

        <Card
          title={cardTitle(
            "Lịch sử chấm công",
            "Toàn bộ lượt chấm công của mọi giáo viên và học viên theo bộ lọc đang chọn.",
          )}
          action={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge tone="gray">{formatNumber(eventCount)} lượt</Badge>
              <Badge tone="blue">{currentMatchStatusLabel}</Badge>
            </div>
          }
        >
          <div className="ui-form-grid" style={{ marginBottom: 14 }}>
            <Field label="Trạng thái">
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
            </Field>
            <Field label="Tìm theo tên">
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Nhập tên giáo viên hoặc học viên..."
              />
            </Field>
          </div>

          <DataTable
            columns={eventColumns}
            rows={events}
            loading={bootLoading || eventLoading}
            rowKey={(row, index) => row.id ?? index}
            empty="Chưa có lượt chấm công trong khoảng thời gian đang chọn. Bấm Đồng bộ dữ liệu để lấy dữ liệu mới từ thiết bị."
            minWidth={880}
          />

          {events.length ? (
            <div className="flex-between" style={{ marginTop: 12, flexWrap: "wrap" }}>
              <span className="small muted">
                Trang {eventPage} {eventLoading ? "• đang tải" : ""}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  size="sm"
                  onClick={() => setEventPage((current) => Math.max(1, current - 1))}
                  disabled={!hasPrevEvents || eventLoading}
                >
                  Trang trước
                </Button>
                <Button
                  size="sm"
                  onClick={() => setEventPage((current) => current + 1)}
                  disabled={!hasNextEvents || eventLoading}
                >
                  Trang sau
                </Button>
              </div>
            </div>
          ) : null}
        </Card>

        <Card
          title={cardTitle(
            "Kết nối thiết bị điểm danh",
            "Chọn máy điểm danh để kiểm tra kết nối và lấy dữ liệu chấm công về hệ thống.",
          )}
          action={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button
                onClick={handleProbe}
                disabled={!selectedDeviceId}
                loading={probing}
                loadingText="Đang kiểm tra..."
              >
                Kiểm tra kết nối
              </Button>
              <Button
                variant="primary"
                onClick={handleSync}
                disabled={!selectedDeviceId}
                loading={syncing}
                loadingText="Đang đồng bộ..."
              >
                Đồng bộ dữ liệu
              </Button>
            </div>
          }
        >
          <div className="ui-form-grid" style={{ marginBottom: 14 }}>
            <Field
              label="Thiết bị"
              hint="Thiết bị đang chọn cũng là bộ lọc cho lịch sử chấm công phía trên."
            >
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
            </Field>
          </div>

          <div>
            {kvRow("Dòng máy", selectedDevice?.model_name || "--")}
            {kvRow(
              "Địa chỉ thiết bị trong mạng",
              selectedDevice
                ? `${selectedDevice.protocol}://${selectedDevice.ip_address}:${selectedDevice.port}`
                : "--",
            )}
            <div className="kv">
              <span className="k">Địa chỉ nhận dữ liệu tự động</span>
              <span className={`v ${styles.truncate}`} title={deviceWebhookUrl}>
                {deviceWebhookUrl}
              </span>
            </div>
          </div>

          <div className="ui-form-grid" style={{ marginTop: 16 }}>
            <div>
              <div className="section-label">Kết quả kiểm tra kết nối</div>
              <pre className={styles.logBox}>
                {selectedProbeJson || "Chưa có kết quả kiểm tra kết nối."}
              </pre>
            </div>
            <div>
              <div className="section-label">Kết quả đồng bộ gần nhất</div>
              <pre className={styles.logBox}>
                {selectedSyncJson || "Chưa có kết quả đồng bộ."}
              </pre>
            </div>
          </div>
        </Card>
      </div>
    </Page>
  );
}

export default Attendance;
