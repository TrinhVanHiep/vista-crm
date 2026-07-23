import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import {
  createSessionReport,
  createMonthlyReportSubmission,
  listMonthlyReportSubmissions,
  listSessionReports,
  listTeachingSessions,
  reviewApprovalEntity,
  reviewMonthlyReportSubmission,
  submitSessionReport,
  submitMonthlyReportSubmission,
  updateMonthlyReportSubmission,
  updateSessionReport,
} from "../services/calendarService";
import styles from "../styles/reports.module.css";

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: `Tháng ${String(index + 1).padStart(2, "0")}`,
}));

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, index) => currentYear - 2 + index);

const statusMeta = {
  draft: { label: "Nháp", tone: "neutral" },
  submitted: { label: "Chờ duyệt", tone: "info" },
  approved: { label: "Đã duyệt", tone: "success" },
  rejected: { label: "Từ chối", tone: "danger" },
  revision_required: { label: "Cần sửa", tone: "warning" },
};

const decisionLabels = {
  approve: "Duyệt",
  reject: "Từ chối",
  "request-revision": "Yêu cầu sửa",
};

const pad2 = (value) => String(value).padStart(2, "0");

const safeArray = (value) => (Array.isArray(value) ? value : []);

const upsertById = (items, updatedItem) => {
  if (!updatedItem?.id) return items;
  const exists = items.some((item) => item.id === updatedItem.id);
  if (!exists) return [updatedItem, ...items];
  return items.map((item) => (item.id === updatedItem.id ? updatedItem : item));
};

const getLastDayOfMonth = (year, month) => new Date(year, month, 0).getDate();

const formatTimeRange = (startAt, endAt) => {
  if (!startAt && !endAt) return "--";
  const formatter = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return [startAt, endAt]
    .filter(Boolean)
    .map((value) => {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? String(value) : formatter.format(parsed);
    })
    .join(" - ");
};

const formatDate = (value) => {
  if (!value) return "--";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("vi-VN");
};

const getChecklistFlag = (items, key) =>
  safeArray(items).some((item) => {
    if (typeof item === "string") return item === key;
    return (
      item?.key === key &&
      Boolean(
        item.completed ||
          item.checked ||
          item.value === true ||
          item.status === "done",
      )
    );
  });

const buildManualChecklist = (isReported) => [
  {
    key: "manual_reported",
    label: "Đã báo cáo",
    completed: Boolean(isReported),
  },
];

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  fallback;

function MonthlyReports() {
  const { role } = useAuth();
  // Quản lý đào tạo duyệt báo cáo ca dạy; quản lý cơ sở duyệt báo cáo tháng.
  const canReviewSession = ["superadmin", "admin", "training_manager"].includes(role);
  const canReviewMonthly = ["superadmin", "admin", "center_manager"].includes(role);
  // Người duyệt (quản lý/admin) không nhập báo cáo — chỉ giáo viên/nhân viên nhập.
  const isReportManager = [
    "superadmin",
    "admin",
    "center_manager",
    "training_manager",
  ].includes(role);

  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [liveReloadKey, setLiveReloadKey] = useState(0);
  const monthlyLoadedRef = useRef(false);

  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [uploadForm, setUploadForm] = useState({
    month: new Date().getMonth() + 1,
    year: currentYear,
    note: "",
    file: null,
  });
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [editingSubmissionId, setEditingSubmissionId] = useState(null);
  const [uploadInputKey, setUploadInputKey] = useState(0);
  const monthlyUploadRef = useRef(null);

  const [reviewLoadingId, setReviewLoadingId] = useState(null);
  const [manualSessions, setManualSessions] = useState([]);
  const [manualReports, setManualReports] = useState([]);
  const [manualLoading, setManualLoading] = useState(true);
  const [manualError, setManualError] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [manualReviewLoadingId, setManualReviewLoadingId] = useState(null);
  const [manualReloadKey, setManualReloadKey] = useState(0);
  const manualFormRef = useRef(null);
  const manualLoadedRef = useRef(false);
  const [manualForm, setManualForm] = useState({
    month: new Date().getMonth() + 1,
    year: currentYear,
    session: "",
    student_count: "",
    content_taught: "",
    session_evaluation: "",
    next_session_plan: "",
    is_reported: false,
    reported_on_zalo: false,
  });

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        setLiveReloadKey((prev) => prev + 1);
      }
    };
    const timer = window.setInterval(refresh, 5000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!monthlyLoadedRef.current) setIsLoading(true);
    setError("");
    listMonthlyReportSubmissions({
      month: filterMonth || undefined,
      year: filterYear || undefined,
      status: filterStatus || undefined,
    })
      .then((data) => {
        if (!cancelled) setSubmissions(data.results);
      })
      .catch(() => {
        if (!cancelled) setError("Không thể tải danh sách báo cáo tháng.");
      })
      .finally(() => {
        if (!cancelled) {
          monthlyLoadedRef.current = true;
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filterMonth, filterYear, filterStatus, liveReloadKey, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    const month = Number(manualForm.month);
    const year = Number(manualForm.year);
    const dateFrom = `${year}-${pad2(month)}-01`;
    const dateTo = `${year}-${pad2(month)}-${pad2(getLastDayOfMonth(year, month))}`;

    if (!manualLoadedRef.current) setManualLoading(true);
    setManualError("");

    Promise.all([
      listTeachingSessions({
        page_size: 500,
        date_from: dateFrom,
        date_to: dateTo,
      }),
      listSessionReports({ page_size: 500 }),
    ])
      .then(([sessionData, reportData]) => {
        if (cancelled) return;
        const sessionItems = safeArray(sessionData.results);
        const sessionIds = new Set(sessionItems.map((item) => item.id));
        const reportItems = safeArray(reportData.results).filter((item) =>
          sessionIds.has(item.session),
        );
        setManualSessions(sessionItems);
        setManualReports(reportItems);
        setManualForm((prev) => {
          if (!prev.session || sessionIds.has(Number(prev.session))) return prev;
          return {
            ...prev,
            session: "",
            student_count: "",
            content_taught: "",
            session_evaluation: "",
            next_session_plan: "",
            is_reported: false,
            reported_on_zalo: false,
          };
        });
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setManualSessions([]);
        setManualReports([]);
        setManualError(
          getErrorMessage(fetchError, "Không thể tải danh sách ca dạy để nhập tay."),
        );
      })
      .finally(() => {
        if (!cancelled) {
          manualLoadedRef.current = true;
          setManualLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [liveReloadKey, manualForm.month, manualForm.year, manualReloadKey]);

  const summary = useMemo(() => {
    const pending = submissions.filter((item) => item.status === "submitted").length;
    const approved = submissions.filter((item) => item.status === "approved").length;
    const revision = submissions.filter((item) => item.status === "revision_required").length;
    return { pending, approved, revision, total: submissions.length };
  }, [submissions]);

  const manualReportBySessionId = useMemo(() => {
    const mapping = new Map();
    manualReports.forEach((item) => {
      mapping.set(item.session, item);
    });
    return mapping;
  }, [manualReports]);

  const selectedManualSession = useMemo(
    () =>
      manualSessions.find((item) => String(item.id) === String(manualForm.session)) ||
      null,
    [manualForm.session, manualSessions],
  );

  const selectedManualReport = manualForm.session
    ? manualReportBySessionId.get(Number(manualForm.session))
    : null;

  const manualReportLocked =
    !isReportManager &&
    selectedManualReport &&
    !["draft", "revision_required"].includes(selectedManualReport.report_status);

  const manualSummary = useMemo(() => {
    const submitted = manualReports.filter((item) => item.report_status === "submitted").length;
    const approved = manualReports.filter((item) => item.report_status === "approved").length;
    const revision = manualReports.filter((item) => item.report_status === "revision_required").length;
    return {
      total: manualReports.length,
      submitted,
      approved,
      revision,
    };
  }, [manualReports]);

  const handleUploadSubmit = async (event) => {
    event.preventDefault();
    if (!uploadForm.file && !editingSubmissionId) {
      setUploadError("Vui lòng chọn file báo cáo tháng.");
      return;
    }
    setUploadLoading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("month", uploadForm.month);
      formData.append("year", uploadForm.year);
      formData.append("note", uploadForm.note);
      if (uploadForm.file) formData.append("file", uploadForm.file);
      const saved = editingSubmissionId
        ? await updateMonthlyReportSubmission(editingSubmissionId, formData)
        : await createMonthlyReportSubmission(formData);
      const submitted = await submitMonthlyReportSubmission(saved.id);
      setSubmissions((prev) => upsertById(prev, submitted));
      setNotice(
        editingSubmissionId
          ? "Đã cập nhật và gửi lại báo cáo tháng cho quản lý."
          : "Đã nộp báo cáo tháng, chờ quản lý duyệt.",
      );
      setUploadForm((prev) => ({ ...prev, note: "", file: null }));
      setEditingSubmissionId(null);
      setUploadInputKey((prev) => prev + 1);
      setReloadKey((prev) => prev + 1);
    } catch (submitError) {
      setUploadError(
        submitError?.response?.data?.detail || "Không thể nộp báo cáo tháng. Vui lòng thử lại.",
      );
    } finally {
      setUploadLoading(false);
    }
  };

  const handleEditMonthlySubmission = (submission) => {
    setEditingSubmissionId(submission.id);
    setUploadError("");
    setUploadForm({
      month: submission.month,
      year: submission.year,
      note: submission.note || "",
      file: null,
    });
    setUploadInputKey((prev) => prev + 1);
    window.requestAnimationFrame(() => {
      monthlyUploadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const handleCancelMonthlyEdit = () => {
    setEditingSubmissionId(null);
    setUploadError("");
    setUploadForm((prev) => ({ ...prev, note: "", file: null }));
    setUploadInputKey((prev) => prev + 1);
  };

  const handleManualSessionChange = (sessionId) => {
    const existingReport = manualReportBySessionId.get(Number(sessionId));
    setManualError("");
    setManualForm((prev) => ({
      ...prev,
      session: sessionId,
      student_count: existingReport?.student_count ?? "",
      content_taught: existingReport?.content_taught || "",
      session_evaluation: existingReport?.session_evaluation || "",
      next_session_plan: existingReport?.next_session_plan || "",
      is_reported: existingReport
        ? getChecklistFlag(existingReport.completion_checklist, "manual_reported")
        : false,
      reported_on_zalo: Boolean(existingReport?.reported_on_zalo),
    }));
  };

  const handleManualReportSubmit = async ({ thenSubmit }) => {
    if (!manualForm.session) {
      setManualError("Vui lòng chọn ca dạy cần nhập báo cáo.");
      return;
    }
    if (manualReportLocked) {
      setManualError("Báo cáo đã gửi/đã duyệt nên không thể sửa ở tài khoản giáo viên.");
      return;
    }
    if (manualForm.student_count === "" || Number(manualForm.student_count) < 0) {
      setManualError("Vui lòng nhập sĩ số hợp lệ.");
      return;
    }
    if (
      !manualForm.content_taught.trim() ||
      !manualForm.session_evaluation.trim() ||
      !manualForm.next_session_plan.trim()
    ) {
      setManualError("Vui lòng nhập nội dung dạy, đánh giá sau buổi học và định hướng buổi sau.");
      return;
    }
    if (thenSubmit && !manualForm.is_reported) {
      setManualError("Vui lòng tích Đã báo cáo trước khi gửi quản lý duyệt.");
      return;
    }

    setManualSaving(true);
    setManualError("");
    try {
      const existingReport = manualReportBySessionId.get(Number(manualForm.session));
      const preservedChecklist = safeArray(existingReport?.completion_checklist).filter(
        (item) => item?.key !== "manual_reported",
      );
      const payload = {
        session: Number(manualForm.session),
        objective_status: "achieved",
        attendance_summary: `Sĩ số: ${Number(manualForm.student_count) || 0}`,
        student_count: Number(manualForm.student_count) || 0,
        content_taught: manualForm.content_taught.trim(),
        session_evaluation: manualForm.session_evaluation.trim(),
        next_session_plan: manualForm.next_session_plan.trim(),
        homework_assigned: manualForm.next_session_plan.trim(),
        student_risk_summary: "",
        completion_checklist: [
          ...preservedChecklist,
          ...buildManualChecklist(manualForm.is_reported),
        ],
        reported_on_zalo: Boolean(manualForm.reported_on_zalo),
      };

      let savedReport;
      if (existingReport) {
        savedReport = await updateSessionReport(existingReport.id, payload);
      } else {
        savedReport = await createSessionReport(payload);
      }
      if (thenSubmit) {
        const submitted = await submitSessionReport(savedReport.id);
        savedReport = submitted.report || savedReport;
      }
      setManualReports((prev) => upsertById(prev, savedReport));
      setNotice(
        thenSubmit
          ? "Đã gửi báo cáo nhập tay cho quản lý duyệt."
          : "Đã lưu nháp báo cáo nhập tay.",
      );
      setManualReloadKey((prev) => prev + 1);
    } catch (saveError) {
      setManualError(
        getErrorMessage(saveError, "Không thể lưu báo cáo nhập tay. Vui lòng thử lại."),
      );
    } finally {
      setManualSaving(false);
    }
  };

  const handleEditManualReport = (report) => {
    handleManualSessionChange(report.session);
    window.requestAnimationFrame(() => {
      manualFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleReview = async (submissionId, decision) => {
    let note = "";
    if (decision !== "approve") {
      note = window.prompt(`Nhập lý do ${decisionLabels[decision].toLowerCase()}:`, "") || "";
      if (note === null) return;
    }
    setReviewLoadingId(submissionId);
    setError("");
    try {
      const reviewed = await reviewMonthlyReportSubmission(submissionId, { decision, note });
      setSubmissions((prev) => upsertById(prev, reviewed));
      setNotice(`Đã ${decisionLabels[decision].toLowerCase()} báo cáo tháng.`);
      setReloadKey((prev) => prev + 1);
    } catch (reviewError) {
      setError(
        reviewError?.response?.data?.detail || "Không thể cập nhật trạng thái báo cáo tháng.",
      );
    } finally {
      setReviewLoadingId(null);
    }
  };

  const handleManualReportReview = async (reportId, decision) => {
    let comment = "";
    if (decision !== "approve") {
      comment = window.prompt(`Nhập lý do ${decisionLabels[decision].toLowerCase()}:`, "") || "";
      if (!comment.trim()) return;
    }
    setManualReviewLoadingId(reportId);
    setManualError("");
    try {
      const reviewed = await reviewApprovalEntity("session_report", reportId, decision, {
        comment: comment.trim() || "Quản lý duyệt báo cáo buổi học.",
        payroll_eligible: decision === "approve",
      });
      setManualReports((prev) =>
        prev.map((report) =>
          report.id === reportId
            ? {
                ...report,
                report_status: reviewed.entity_status,
                rejected_reason: decision === "approve" ? "" : comment.trim(),
              }
            : report,
        ),
      );
      setNotice(`Đã ${decisionLabels[decision].toLowerCase()} báo cáo nhập tay.`);
      setManualReloadKey((prev) => prev + 1);
    } catch (reviewError) {
      setManualError(
        getErrorMessage(reviewError, "Không thể cập nhật trạng thái báo cáo nhập tay."),
      );
    } finally {
      setManualReviewLoadingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.badge}>Báo cáo</span>
          <h1>BÁO CÁO</h1>
          <p>Báo cáo ngày theo từng ca dạy và báo cáo tổng kết tháng.</p>
        </div>
      </header>

      {notice && <div className={styles.badge}>{notice}</div>}
      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Báo cáo ngày</h2>
            <p>
              {canReviewSession
                ? "Quản lý đào tạo duyệt hoặc yêu cầu sửa các báo cáo giáo viên nhập tay theo từng ca dạy."
                : isReportManager
                ? "Theo dõi báo cáo ngày của giáo viên (quản lý đào tạo phụ trách duyệt)."
                : "Nhập báo cáo sau buổi học, tick trạng thái đã báo cáo và gửi quản lý duyệt."}
            </p>
          </div>
          <span className={styles.statusChip} data-tone="info">
            {manualSummary.submitted} chờ duyệt
          </span>
        </div>

        <div className={styles.filters}>
          <label className={styles.field}>
            <span>Tháng</span>
            <select
              value={manualForm.month}
              onChange={(event) =>
                setManualForm((prev) => ({
                  ...prev,
                  month: Number(event.target.value),
                  session: "",
                  student_count: "",
                  content_taught: "",
                  session_evaluation: "",
                  next_session_plan: "",
                  is_reported: false,
                  reported_on_zalo: false,
                }))
              }
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Năm</span>
            <select
              value={manualForm.year}
              onChange={(event) =>
                setManualForm((prev) => ({
                  ...prev,
                  year: Number(event.target.value),
                  session: "",
                  student_count: "",
                  content_taught: "",
                  session_evaluation: "",
                  next_session_plan: "",
                  is_reported: false,
                  reported_on_zalo: false,
                }))
              }
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!isReportManager && (
          <div className={styles.manualForm} ref={manualFormRef}>
            <div className={styles.formGrid}>
              <label className={`${styles.field} ${styles.formGroupFull}`}>
                <span>Chọn ca dạy</span>
                <select
                  value={manualForm.session}
                  disabled={manualLoading}
                  onChange={(event) => handleManualSessionChange(event.target.value)}
                >
                  <option value="">
                    {manualLoading ? "Đang tải ca dạy..." : "Chọn lớp / ca dạy"}
                  </option>
                  {manualSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {formatDate(session.session_date)} - {session.classroom_name} -{" "}
                      {formatTimeRange(session.start_at, session.end_at)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Tên lớp</span>
                <input type="text" value={selectedManualSession?.classroom_name || ""} readOnly />
              </label>
              <label className={styles.field}>
                <span>Ca dạy</span>
                <input
                  type="text"
                  value={
                    selectedManualSession
                      ? formatTimeRange(selectedManualSession.start_at, selectedManualSession.end_at)
                      : ""
                  }
                  readOnly
                />
              </label>
              <label className={styles.field}>
                <span>Sĩ số</span>
                <input
                  type="number"
                  min="0"
                  value={manualForm.student_count}
                  disabled={manualReportLocked}
                  onChange={(event) =>
                    setManualForm((prev) => ({
                      ...prev,
                      student_count: event.target.value,
                    }))
                  }
                />
              </label>
              <label className={`${styles.field} ${styles.formGroupFull}`}>
                <span>Nội dung dạy</span>
                <textarea
                  rows={3}
                  value={manualForm.content_taught}
                  disabled={manualReportLocked}
                  onChange={(event) =>
                    setManualForm((prev) => ({
                      ...prev,
                      content_taught: event.target.value,
                    }))
                  }
                />
              </label>
              <label className={`${styles.field} ${styles.formGroupFull}`}>
                <span>Đánh giá sau buổi học</span>
                <textarea
                  rows={3}
                  value={manualForm.session_evaluation}
                  disabled={manualReportLocked}
                  onChange={(event) =>
                    setManualForm((prev) => ({
                      ...prev,
                      session_evaluation: event.target.value,
                    }))
                  }
                />
              </label>
              <label className={`${styles.field} ${styles.formGroupFull}`}>
                <span>Định hướng buổi sau dạy gì</span>
                <textarea
                  rows={3}
                  value={manualForm.next_session_plan}
                  disabled={manualReportLocked}
                  onChange={(event) =>
                    setManualForm((prev) => ({
                      ...prev,
                      next_session_plan: event.target.value,
                    }))
                  }
                />
              </label>
              <div className={`${styles.checkboxGroup} ${styles.formGroupFull}`}>
                <label className={styles.checkOption}>
                  <input
                    type="checkbox"
                    checked={manualForm.is_reported}
                    disabled={manualReportLocked}
                    onChange={(event) =>
                      setManualForm((prev) => ({
                        ...prev,
                        is_reported: event.target.checked,
                      }))
                    }
                  />
                  <span>Đã báo cáo</span>
                </label>
                <label className={styles.checkOption}>
                  <input
                    type="checkbox"
                    checked={manualForm.reported_on_zalo}
                    disabled={manualReportLocked}
                    onChange={(event) =>
                      setManualForm((prev) => ({
                        ...prev,
                        reported_on_zalo: event.target.checked,
                      }))
                    }
                  />
                  <span>Đã báo cáo trên Zalo</span>
                </label>
              </div>
            </div>
            {manualReportLocked && (
              <p className={styles.helpText}>
                Báo cáo này đã gửi quản lý hoặc đã được duyệt, giáo viên không thể sửa trực tiếp.
              </p>
            )}
            {selectedManualReport?.report_status === "revision_required" && (
              <p className={styles.helpText}>
                Phản hồi quản lý: {selectedManualReport.rejected_reason || "Vui lòng chỉnh sửa và gửi lại báo cáo."}
              </p>
            )}
            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={manualSaving || manualReportLocked}
                onClick={() => handleManualReportSubmit({ thenSubmit: false })}
              >
                {manualSaving ? "Đang lưu..." : "Lưu nháp"}
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={manualSaving || manualReportLocked}
                onClick={() => handleManualReportSubmit({ thenSubmit: true })}
              >
                {manualSaving ? "Đang gửi..." : "Gửi quản lý duyệt"}
              </button>
            </div>
          </div>
        )}

        {manualError && <div className={styles.error}>{manualError}</div>}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Giáo viên</th>
                <th>Lớp / ca dạy</th>
                <th>Sĩ số</th>
                <th>Nội dung</th>
                <th>Đã báo cáo</th>
                <th>Zalo</th>
                <th>Trạng thái</th>
                <th>Phản hồi</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {manualLoading ? (
                <tr>
                  <td colSpan={9} className={styles.emptyCell}>
                    Đang tải báo cáo nhập tay...
                  </td>
                </tr>
              ) : manualReports.length ? (
                manualReports.map((report) => {
                  const session =
                    report.session_detail ||
                    manualSessions.find((item) => item.id === report.session) ||
                    {};
                  const isReported = getChecklistFlag(
                    report.completion_checklist,
                    "manual_reported",
                  );
                  return (
                    <tr key={report.id}>
                      <td>{report.teacher_name || session.teacher_name || "--"}</td>
                      <td>
                        <div className={styles.titleCell}>
                          <strong>{session.classroom_name || "--"}</strong>
                          <span>
                            {formatDate(session.session_date)} •{" "}
                            {formatTimeRange(session.start_at, session.end_at)}
                          </span>
                        </div>
                      </td>
                      <td>{report.student_count ?? "--"}</td>
                      <td>
                        <div className={styles.titleCell}>
                          <strong>{report.content_taught || "--"}</strong>
                          {report.session_evaluation ? (
                            <span>{report.session_evaluation}</span>
                          ) : null}
                          {report.next_session_plan ? (
                            <span>Buổi sau: {report.next_session_plan}</span>
                          ) : null}
                        </div>
                      </td>
                      <td>{isReported ? "Đã báo cáo" : "Chưa tick"}</td>
                      <td>{report.reported_on_zalo ? "Đã báo cáo" : "--"}</td>
                      <td>
                        <span className={styles.statusChip} data-tone={statusMeta[report.report_status]?.tone || "neutral"}>
                          {statusMeta[report.report_status]?.label || report.report_status}
                        </span>
                      </td>
                      <td>{report.rejected_reason || "--"}</td>
                      <td>
                        {canReviewSession ? (
                          report.report_status === "submitted" ? (
                            <div className={styles.actionGroup}>
                              <button
                                type="button"
                                className={styles.secondaryButton}
                                disabled={manualReviewLoadingId === report.id}
                                onClick={() => handleManualReportReview(report.id, "approve")}
                              >
                                Duyệt
                              </button>
                              <button
                                type="button"
                                className={styles.secondaryButton}
                                disabled={manualReviewLoadingId === report.id}
                                onClick={() => handleManualReportReview(report.id, "request-revision")}
                              >
                                Yêu cầu sửa
                              </button>
                              <button
                                type="button"
                                className={styles.secondaryButton}
                                disabled={manualReviewLoadingId === report.id}
                                onClick={() => handleManualReportReview(report.id, "reject")}
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            "--"
                          )
                        ) : report.report_status === "revision_required" ? (
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => handleEditManualReport(report)}
                          >
                            Chỉnh sửa
                          </button>
                        ) : (
                          "--"
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className={styles.emptyCell}>
                    Chưa có báo cáo nhập tay trong tháng này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Báo cáo tháng</h2>
            <p>
              {canReviewMonthly
                ? "Quản lý cơ sở duyệt hoặc từ chối báo cáo tháng do giáo viên/nhân viên nộp."
                : isReportManager
                ? "Theo dõi báo cáo tháng (quản lý cơ sở phụ trách duyệt)."
                : "Nộp file báo cáo tổng kết tháng và theo dõi trạng thái duyệt."}
            </p>
          </div>
        </div>

        {!isReportManager && (
          <div className={styles.filters} ref={monthlyUploadRef}>
            {editingSubmissionId && (
              <div className={styles.helpText} style={{ width: "100%" }}>
                Đang chỉnh sửa báo cáo được yêu cầu sửa. Có thể giữ file cũ hoặc chọn file mới.
              </div>
            )}
            <form onSubmit={handleUploadSubmit} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <label className={styles.field}>
                <span>Tháng</span>
                <select
                  value={uploadForm.month}
                  onChange={(event) =>
                    setUploadForm((prev) => ({ ...prev, month: Number(event.target.value) }))
                  }
                >
                  {monthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Năm</span>
                <select
                  value={uploadForm.year}
                  onChange={(event) =>
                    setUploadForm((prev) => ({ ...prev, year: Number(event.target.value) }))
                  }
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              <label className={`${styles.field} ${styles.searchField}`}>
                <span>Ghi chú</span>
                <input
                  type="text"
                  value={uploadForm.note}
                  onChange={(event) =>
                    setUploadForm((prev) => ({ ...prev, note: event.target.value }))
                  }
                  placeholder="Ghi chú cho quản lý (tuỳ chọn)"
                />
              </label>
              <label className={styles.field}>
                <span>File báo cáo</span>
                <input
                  key={uploadInputKey}
                  type="file"
                  onChange={(event) =>
                    setUploadForm((prev) => ({ ...prev, file: event.target.files?.[0] || null }))
                  }
                />
              </label>
              <button type="submit" className={styles.primaryButton} disabled={uploadLoading}>
                {uploadLoading
                  ? "Đang nộp..."
                  : editingSubmissionId
                  ? "Cập nhật và gửi lại"
                  : "Nộp báo cáo tháng"}
              </button>
              {editingSubmissionId && (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={uploadLoading}
                  onClick={handleCancelMonthlyEdit}
                >
                  Hủy chỉnh sửa
                </button>
              )}
            </form>
            {uploadError && <div className={styles.error} style={{ marginTop: 10 }}>{uploadError}</div>}
          </div>
        )}

        <section className={styles.summaryGrid}>
        <article className={styles.summaryItem}>
          <span>Tổng số</span>
          <strong>{summary.total}</strong>
        </article>
        <article className={styles.summaryItem}>
          <span>Chờ duyệt</span>
          <strong>{summary.pending}</strong>
        </article>
        <article className={styles.summaryItem}>
          <span>Đã duyệt</span>
          <strong>{summary.approved}</strong>
        </article>
        <article className={styles.summaryItem}>
          <span>Cần sửa</span>
          <strong>{summary.revision}</strong>
        </article>
        </section>

        <section className={styles.filters}>
        <label className={styles.field}>
          <span>Tháng</span>
          <select value={filterMonth} onChange={(event) => setFilterMonth(event.target.value)}>
            <option value="">Tất cả</option>
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Năm</span>
          <select value={filterYear} onChange={(event) => setFilterYear(event.target.value)}>
            <option value="">Tất cả</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Trạng thái</span>
          <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
            <option value="">Tất cả</option>
            {Object.entries(statusMeta).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
        </label>
        </section>

        <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Giáo viên</th>
              <th>Tháng/Năm</th>
              <th>File</th>
              <th>Ghi chú</th>
              <th>Phản hồi</th>
              <th>Trạng thái</th>
              <th>Ngày nộp</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className={styles.emptyCell}>
                  Đang tải...
                </td>
              </tr>
            ) : submissions.length ? (
              submissions.map((item) => (
                <tr key={item.id}>
                  <td>{item.teacher_name}</td>
                  <td>
                    {String(item.month).padStart(2, "0")}/{item.year}
                  </td>
                  <td>
                    {item.file ? (
                      <a className={styles.tableLink} href={item.file} target="_blank" rel="noreferrer">
                        Xem file
                      </a>
                    ) : (
                      "--"
                    )}
                  </td>
                  <td>{item.note || "--"}</td>
                  <td>{item.review_note || "--"}</td>
                  <td>
                    <span className={styles.statusChip} data-tone={statusMeta[item.status]?.tone || "neutral"}>
                      {statusMeta[item.status]?.label || item.status}
                    </span>
                  </td>
                  <td>{item.submitted_at ? new Date(item.submitted_at).toLocaleString("vi-VN") : "--"}</td>
                  <td>
                    {canReviewMonthly ? (
                      item.status === "submitted" ? (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            disabled={reviewLoadingId === item.id}
                            onClick={() => handleReview(item.id, "approve")}
                          >
                            Duyệt
                          </button>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            disabled={reviewLoadingId === item.id}
                            onClick={() => handleReview(item.id, "request-revision")}
                          >
                            Yêu cầu sửa
                          </button>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            disabled={reviewLoadingId === item.id}
                            onClick={() => handleReview(item.id, "reject")}
                          >
                            Từ chối
                          </button>
                        </div>
                      ) : (
                        "--"
                      )
                    ) : item.status === "revision_required" ? (
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => handleEditMonthlySubmission(item)}
                      >
                        Chỉnh sửa
                      </button>
                    ) : (
                      "--"
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className={styles.emptyCell}>
                  Chưa có báo cáo tháng nào.
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

export default MonthlyReports;
