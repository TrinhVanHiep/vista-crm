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
import {
  Page,
  PageHeader,
  Card,
  DataTable,
  Modal,
  Button,
  Badge,
  KpiGrid,
  Kpi,
  Field,
} from "../ui";

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: `Tháng ${String(index + 1).padStart(2, "0")}`,
}));

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, index) => currentYear - 2 + index);

const statusMeta = {
  draft: { label: "Nháp", tone: "gray" },
  submitted: { label: "Chờ duyệt", tone: "blue" },
  approved: { label: "Đã duyệt", tone: "green" },
  rejected: { label: "Từ chối", tone: "red" },
  revision_required: { label: "Cần sửa", tone: "orange" },
};

const decisionLabels = {
  approve: "Duyệt",
  reject: "Từ chối",
  "request-revision": "Yêu cầu sửa",
};

const fullSpan = { gridColumn: "1 / -1" };

const checkOptionStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 12px",
  border: "1px solid var(--border)",
  borderRadius: 9,
  background: "var(--card)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const checkInputStyle = { width: 16, height: 16, accentColor: "var(--primary)" };

const cellStackStyle = { display: "grid", gap: 4, whiteSpace: "normal", maxWidth: 340 };

const actionGroupStyle = { display: "flex", gap: 6, flexWrap: "wrap" };

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

  // Hộp thoại nhập lý do khi Từ chối / Yêu cầu sửa (thay cho window.prompt).
  const [reviewDialog, setReviewDialog] = useState(null);
  const [reviewNote, setReviewNote] = useState("");

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

  const runMonthlyReview = async (submissionId, decision, note) => {
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

  const runManualReportReview = async (reportId, decision, comment) => {
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

  const handleReview = (submissionId, decision) => {
    if (decision === "approve") {
      runMonthlyReview(submissionId, decision, "");
      return;
    }
    setReviewNote("");
    setReviewDialog({ scope: "monthly", id: submissionId, decision });
  };

  const handleManualReportReview = (reportId, decision) => {
    if (decision === "approve") {
      runManualReportReview(reportId, decision, "");
      return;
    }
    setReviewNote("");
    setReviewDialog({ scope: "session", id: reportId, decision });
  };

  const closeReviewDialog = () => {
    setReviewDialog(null);
    setReviewNote("");
  };

  const confirmReviewDialog = () => {
    if (!reviewDialog) return;
    const note = reviewNote.trim();
    if (!note) return;
    const { scope, id, decision } = reviewDialog;
    closeReviewDialog();
    if (scope === "monthly") {
      runMonthlyReview(id, decision, note);
    } else {
      runManualReportReview(id, decision, note);
    }
  };

  const resolveManualSession = (report) =>
    report.session_detail ||
    manualSessions.find((item) => item.id === report.session) ||
    {};

  const manualColumns = [
    {
      key: "teacher",
      header: "Giáo viên",
      render: (report) =>
        report.teacher_name || resolveManualSession(report).teacher_name || "--",
    },
    {
      key: "session",
      header: "Lớp / ca dạy",
      render: (report) => {
        const session = resolveManualSession(report);
        return (
          <div style={cellStackStyle}>
            <strong>{session.classroom_name || "--"}</strong>
            <span className="small muted">
              {formatDate(session.session_date)} •{" "}
              {formatTimeRange(session.start_at, session.end_at)}
            </span>
          </div>
        );
      },
    },
    {
      key: "student_count",
      header: "Sĩ số",
      align: "center",
      render: (report) => report.student_count ?? "--",
    },
    {
      key: "content",
      header: "Nội dung",
      render: (report) => (
        <div style={cellStackStyle}>
          <strong>{report.content_taught || "--"}</strong>
          {report.session_evaluation ? (
            <span className="small muted">{report.session_evaluation}</span>
          ) : null}
          {report.next_session_plan ? (
            <span className="small muted">Buổi sau: {report.next_session_plan}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "reported",
      header: "Đã báo cáo",
      render: (report) =>
        getChecklistFlag(report.completion_checklist, "manual_reported")
          ? "Đã báo cáo"
          : "Chưa tick",
    },
    {
      key: "zalo",
      header: "Zalo",
      render: (report) => (report.reported_on_zalo ? "Đã báo cáo" : "--"),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (report) => (
        <Badge tone={statusMeta[report.report_status]?.tone || "gray"}>
          {statusMeta[report.report_status]?.label || report.report_status}
        </Badge>
      ),
    },
    {
      key: "feedback",
      header: "Phản hồi",
      render: (report) => (
        <div style={cellStackStyle}>{report.rejected_reason || "--"}</div>
      ),
    },
    {
      key: "actions",
      header: "Hành động",
      render: (report) =>
        canReviewSession ? (
          report.report_status === "submitted" ? (
            <div style={actionGroupStyle}>
              <Button
                variant="primary"
                size="sm"
                disabled={manualReviewLoadingId === report.id}
                onClick={() => handleManualReportReview(report.id, "approve")}
              >
                Duyệt
              </Button>
              <Button
                size="sm"
                disabled={manualReviewLoadingId === report.id}
                onClick={() => handleManualReportReview(report.id, "request-revision")}
              >
                Yêu cầu sửa
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={manualReviewLoadingId === report.id}
                onClick={() => handleManualReportReview(report.id, "reject")}
              >
                Từ chối
              </Button>
            </div>
          ) : (
            "--"
          )
        ) : !isReportManager && report.report_status === "revision_required" ? (
          <Button size="sm" onClick={() => handleEditManualReport(report)}>
            Chỉnh sửa
          </Button>
        ) : (
          "--"
        ),
    },
  ];

  const monthlyColumns = [
    { key: "teacher_name", header: "Giáo viên" },
    {
      key: "period",
      header: "Tháng/Năm",
      render: (item) => `${String(item.month).padStart(2, "0")}/${item.year}`,
    },
    {
      key: "file",
      header: "File",
      render: (item) =>
        item.file ? (
          <a className="card-link" href={item.file} target="_blank" rel="noreferrer">
            Xem file
          </a>
        ) : (
          "--"
        ),
    },
    {
      key: "note",
      header: "Ghi chú",
      render: (item) => <div style={cellStackStyle}>{item.note || "--"}</div>,
    },
    {
      key: "review_note",
      header: "Phản hồi",
      render: (item) => <div style={cellStackStyle}>{item.review_note || "--"}</div>,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (item) => (
        <Badge tone={statusMeta[item.status]?.tone || "gray"}>
          {statusMeta[item.status]?.label || item.status}
        </Badge>
      ),
    },
    {
      key: "submitted_at",
      header: "Ngày nộp",
      render: (item) =>
        item.submitted_at ? new Date(item.submitted_at).toLocaleString("vi-VN") : "--",
    },
    {
      key: "actions",
      header: "Hành động",
      render: (item) =>
        canReviewMonthly ? (
          item.status === "submitted" ? (
            <div style={actionGroupStyle}>
              <Button
                variant="primary"
                size="sm"
                disabled={reviewLoadingId === item.id}
                onClick={() => handleReview(item.id, "approve")}
              >
                Duyệt
              </Button>
              <Button
                size="sm"
                disabled={reviewLoadingId === item.id}
                onClick={() => handleReview(item.id, "request-revision")}
              >
                Yêu cầu sửa
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={reviewLoadingId === item.id}
                onClick={() => handleReview(item.id, "reject")}
              >
                Từ chối
              </Button>
            </div>
          ) : (
            "--"
          )
        ) : item.status === "revision_required" ? (
          <Button size="sm" onClick={() => handleEditMonthlySubmission(item)}>
            Chỉnh sửa
          </Button>
        ) : (
          "--"
        ),
    },
  ];

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: "Báo cáo" }]}
        title="BÁO CÁO"
        description="Báo cáo ngày theo từng ca dạy và báo cáo tổng kết tháng."
      />

      {notice ? (
        <div
          className="alert green"
          style={{ background: "#e9f7ef", color: "#1c7a45", marginBottom: 14 }}
        >
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="alert red" style={{ marginBottom: 14 }}>
          {error}
        </div>
      ) : null}

      <Card
        title="Báo cáo ngày"
        action={<Badge tone="blue">{manualSummary.submitted} chờ duyệt</Badge>}
      >
        <p className="small muted" style={{ marginBottom: 12 }}>
          {canReviewSession
            ? "Quản lý đào tạo duyệt hoặc yêu cầu sửa các báo cáo giáo viên nhập tay theo từng ca dạy."
            : isReportManager
            ? "Theo dõi báo cáo ngày của giáo viên (quản lý đào tạo phụ trách duyệt)."
            : "Nhập báo cáo sau buổi học, tick trạng thái đã báo cáo và gửi quản lý duyệt."}
        </p>

        <div className="ui-form-grid">
          <Field label="Tháng">
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
          </Field>
          <Field label="Năm">
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
          </Field>
        </div>

        {!isReportManager && (
          <div
            ref={manualFormRef}
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: "1px solid var(--border-soft)",
            }}
          >
            <div className="ui-form-grid">
              <div style={fullSpan}>
                <Field label="Chọn ca dạy">
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
                </Field>
              </div>
              <Field label="Tên lớp">
                <input type="text" value={selectedManualSession?.classroom_name || ""} readOnly />
              </Field>
              <Field label="Ca dạy">
                <input
                  type="text"
                  value={
                    selectedManualSession
                      ? formatTimeRange(selectedManualSession.start_at, selectedManualSession.end_at)
                      : ""
                  }
                  readOnly
                />
              </Field>
              <Field label="Sĩ số">
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
              </Field>
              <div style={fullSpan}>
                <Field label="Nội dung dạy">
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
                </Field>
              </div>
              <div style={fullSpan}>
                <Field label="Đánh giá sau buổi học">
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
                </Field>
              </div>
              <div style={fullSpan}>
                <Field label="Định hướng buổi sau dạy gì">
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
                </Field>
              </div>
              <div style={{ ...fullSpan, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <label style={checkOptionStyle}>
                  <input
                    type="checkbox"
                    style={checkInputStyle}
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
                <label style={checkOptionStyle}>
                  <input
                    type="checkbox"
                    style={checkInputStyle}
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
              <p className="alert orange" style={{ marginTop: 10 }}>
                Báo cáo này đã gửi quản lý hoặc đã được duyệt, giáo viên không thể sửa trực tiếp.
              </p>
            )}
            {selectedManualReport?.report_status === "revision_required" && (
              <p className="alert orange" style={{ marginTop: 10 }}>
                Phản hồi quản lý: {selectedManualReport.rejected_reason || "Vui lòng chỉnh sửa và gửi lại báo cáo."}
              </p>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 12,
              }}
            >
              <Button
                disabled={manualSaving || manualReportLocked}
                onClick={() => handleManualReportSubmit({ thenSubmit: false })}
              >
                {manualSaving ? "Đang lưu..." : "Lưu nháp"}
              </Button>
              <Button
                variant="primary"
                disabled={manualSaving || manualReportLocked}
                onClick={() => handleManualReportSubmit({ thenSubmit: true })}
              >
                {manualSaving ? "Đang gửi..." : "Gửi quản lý duyệt"}
              </Button>
            </div>
          </div>
        )}

        {manualError && (
          <div className="alert red" style={{ marginTop: 12 }}>
            {manualError}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <DataTable
            columns={manualColumns}
            rows={manualReports}
            loading={manualLoading}
            empty="Chưa có báo cáo nhập tay trong tháng này."
            minWidth={1180}
          />
        </div>
      </Card>

      <Card title="Báo cáo tháng">
        <p className="small muted" style={{ marginBottom: 12 }}>
          {canReviewMonthly
            ? "Quản lý cơ sở duyệt hoặc từ chối báo cáo tháng do giáo viên/nhân viên nộp."
            : isReportManager
            ? "Theo dõi báo cáo tháng (quản lý cơ sở phụ trách duyệt)."
            : "Nộp file báo cáo tổng kết tháng và theo dõi trạng thái duyệt."}
        </p>

        {!isReportManager && (
          <div ref={monthlyUploadRef} style={{ marginBottom: 14 }}>
            {editingSubmissionId && (
              <div className="alert orange" style={{ marginBottom: 10 }}>
                Đang chỉnh sửa báo cáo được yêu cầu sửa. Có thể giữ file cũ hoặc chọn file mới.
              </div>
            )}
            <form onSubmit={handleUploadSubmit}>
              <div className="ui-form-grid">
                <Field label="Tháng">
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
                </Field>
                <Field label="Năm">
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
                </Field>
                <Field label="Ghi chú">
                  <input
                    type="text"
                    value={uploadForm.note}
                    onChange={(event) =>
                      setUploadForm((prev) => ({ ...prev, note: event.target.value }))
                    }
                    placeholder="Ghi chú cho quản lý (tuỳ chọn)"
                  />
                </Field>
                <Field label="File báo cáo">
                  <input
                    key={uploadInputKey}
                    type="file"
                    onChange={(event) =>
                      setUploadForm((prev) => ({ ...prev, file: event.target.files?.[0] || null }))
                    }
                  />
                </Field>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 12,
                }}
              >
                {editingSubmissionId && (
                  <Button disabled={uploadLoading} onClick={handleCancelMonthlyEdit}>
                    Hủy chỉnh sửa
                  </Button>
                )}
                <Button type="submit" variant="primary" disabled={uploadLoading}>
                  {uploadLoading
                    ? "Đang nộp..."
                    : editingSubmissionId
                    ? "Cập nhật và gửi lại"
                    : "Nộp báo cáo tháng"}
                </Button>
              </div>
            </form>
            {uploadError && (
              <div className="alert red" style={{ marginTop: 10 }}>
                {uploadError}
              </div>
            )}
          </div>
        )}

        <KpiGrid cols={4}>
          <Kpi ico="📄" icoClass="blue" label="Tổng số" value={summary.total} />
          <Kpi ico="⏳" icoClass="orange" label="Chờ duyệt" value={summary.pending} />
          <Kpi ico="✅" icoClass="green" label="Đã duyệt" value={summary.approved} />
          <Kpi ico="✏️" icoClass="yellow" label="Cần sửa" value={summary.revision} />
        </KpiGrid>

        <div className="ui-form-grid" style={{ marginBottom: 14 }}>
          <Field label="Tháng">
            <select value={filterMonth} onChange={(event) => setFilterMonth(event.target.value)}>
              <option value="">Tất cả</option>
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Năm">
            <select value={filterYear} onChange={(event) => setFilterYear(event.target.value)}>
              <option value="">Tất cả</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Trạng thái">
            <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
              <option value="">Tất cả</option>
              {Object.entries(statusMeta).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <DataTable
          columns={monthlyColumns}
          rows={submissions}
          loading={isLoading}
          empty="Chưa có báo cáo tháng nào."
          minWidth={1080}
        />
      </Card>

      <Modal
        open={Boolean(reviewDialog)}
        onClose={closeReviewDialog}
        title={reviewDialog ? decisionLabels[reviewDialog.decision] : ""}
        subtitle={
          reviewDialog?.scope === "monthly" ? "Báo cáo tháng" : "Báo cáo ngày"
        }
        size="sm"
        footer={
          <>
            <Button onClick={closeReviewDialog}>Hủy</Button>
            <Button
              variant={reviewDialog?.decision === "reject" ? "danger" : "primary"}
              disabled={!reviewNote.trim()}
              onClick={confirmReviewDialog}
            >
              {reviewDialog ? decisionLabels[reviewDialog.decision] : ""}
            </Button>
          </>
        }
      >
        <div className="ui-form-grid">
          <div style={fullSpan}>
            <Field
              label={
                reviewDialog
                  ? `Nhập lý do ${decisionLabels[reviewDialog.decision].toLowerCase()}:`
                  : ""
              }
              required
            >
              <textarea
                rows={4}
                autoFocus
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
              />
            </Field>
          </div>
        </div>
      </Modal>
    </Page>
  );
}

export default MonthlyReports;
