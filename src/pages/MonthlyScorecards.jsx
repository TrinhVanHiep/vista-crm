import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import {
  createMonthlyScorecard,
  getMonthlyScorecardSchema,
  listCentersAll,
  listClassesOverview,
  listClassroomsAll,
  listClassroomsByCenter,
  listMonthlyScorecards,
  listStudents,
  listTeachers,
  listTeacherCentersClassrooms,
  listTeacherStudentsByCenterClassroom,
  listTuitionStatuses,
  reviewMonthlyScorecard,
  submitMonthlyScorecard,
  syncMonthlyScorecardsFromScores,
  updateMonthlyScorecard,
  upsertTuitionStatus,
} from "../services/calendarService";
import styles from "../styles/monthlyScorecards.module.css";

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: `Tháng ${index + 1}`,
}));

const programOptions = [
  { value: "", label: "Tất cả chương trình" },
  { value: "basic", label: "Cơ bản" },
  { value: "fingerprint", label: "Finger Print" },
  { value: "cambridge", label: "Cambridge" },
];

const reportTypeOptions = [
  { value: "month", label: "Cuối tháng" },
  { value: "midterm", label: "Giữa kỳ" },
  { value: "semester", label: "Cuối kỳ" },
];

const statusOptions = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "draft", label: "Nháp" },
  { value: "submitted", label: "Chờ duyệt" },
  { value: "approved", label: "Đã duyệt" },
  { value: "revision_required", label: "Cần sửa" },
  { value: "rejected", label: "Từ chối" },
  { value: "locked", label: "Đã khóa" },
];

const studentStatusLabels = {
  active: "Đang học",
  paused: "Bảo lưu",
  graduated: "Hoàn thành",
  withdrawn: "Nghỉ học",
};

const statusMeta = {
  draft: { label: "Nháp", tone: "neutral" },
  submitted: { label: "Chờ duyệt", tone: "warning" },
  approved: { label: "Đã duyệt", tone: "success" },
  revision_required: { label: "Cần sửa", tone: "danger" },
  rejected: { label: "Từ chối", tone: "danger" },
  locked: { label: "Đã khóa", tone: "info" },
};

const formatNumber = (value) =>
  new Intl.NumberFormat("vi-VN").format(Number(value) || 0);

const pad2 = (value) => String(value).padStart(2, "0");

const buildPeriodLabel = (month, year) => `Tháng ${pad2(month)}/${year}`;

const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (data?.detail) return data.detail;
  if (data?.message) return data.message;
  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue)) return firstValue[0];
    if (typeof firstValue === "string") return firstValue;
  }
  return fallback;
};

const getUserFullName = (user) => {
  const name = [user?.last_name, user?.first_name].filter(Boolean).join(" ").trim();
  return name || user?.username || user?.email || "";
};

const getStudentName = (student) =>
  student?.student_name || getUserFullName(student?.user) || student?.name || "--";

const getStudentClassroomId = (student) =>
  student?.classroom?.id || student?.classroom || null;

const getStudentCode = (student) => student?.student_code || student?.code || "--";

const getClassroomLabel = (classroom) => {
  const code = classroom?.class_code ? `${classroom.class_code} | ` : "";
  const centerName = classroom?.center?.name ? ` - ${classroom.center.name}` : "";
  return `${code}${classroom?.name || "Lớp chưa đặt tên"}${centerName}`;
};

const toNullableNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const toScoreValue = (value) => {
  const numericValue = toNullableNumber(value);
  return numericValue === null ? "" : String(numericValue);
};

const round2 = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }
  return Number(Number(value).toFixed(2));
};

const getBasicGrade = (score) => {
  if (score === null || score === undefined) return "";
  if (score >= 9) return "Xuất sắc";
  if (score >= 8) return "Tốt";
  if (score >= 6.5) return "Khá";
  if (score >= 5) return "Đạt";
  return "Cần hỗ trợ";
};

const getFingerprintGrade = (score) => {
  if (score === null || score === undefined) return "";
  if (score >= 90) return "Xuất sắc";
  if (score >= 80) return "Tốt";
  if (score >= 65) return "Đạt";
  if (score >= 50) return "Cần hỗ trợ";
  return "Theo sát";
};

const getCambridgeGrade = (percent) => {
  if (percent === null || percent === undefined) return "";
  if (percent >= 90) return "Xuất sắc";
  if (percent >= 80) return "Tốt";
  if (percent >= 65) return "Khá";
  if (percent >= 50) return "Cần củng cố";
  return "Cần hỗ trợ";
};

const getCambridgeShield = (percent) => {
  const value = toNullableNumber(percent);
  if (value === null || value === undefined) return null;
  if (value >= 90) return 5;
  if (value >= 80) return 4;
  if (value >= 65) return 3;
  if (value >= 50) return 2;
  if (value >= 35) return 1;
  return 0;
};

const buildDefaultForm = ({ month, year, classroom = "", programType = "basic" }) => ({
  id: null,
  status: "draft",
  student: "",
  student_name: "",
  classroom,
  classroom_name: "",
  teacher: "",
  teacher_name: "",
  period_label: buildPeriodLabel(month, year),
  period_month: month,
  period_year: year,
  program_type: programType || "basic",
  report_type: "month",
  attendance_total: "",
  attendance_present: "",
  attendance_late: "",
  score_components: {},
  grade_label: "",
  student_group: "",
  crm_warning: "",
  highlighted_keywords: "",
  support_points: "",
  teacher_comment: "",
  strengths: "",
  improvements: "",
  next_goal: "",
  parent_support_note: "",
});

const buildFormFromScorecard = (scorecard) => ({
  id: scorecard.id,
  status: scorecard.status || "draft",
  student: scorecard.student || "",
  student_name: scorecard.student_name || "",
  classroom: scorecard.classroom || "",
  classroom_name: scorecard.classroom_name || "",
  teacher: scorecard.teacher || "",
  teacher_name: scorecard.teacher_name || "",
  period_label: scorecard.period_label || "",
  period_month: scorecard.period_month || "",
  period_year: scorecard.period_year || "",
  program_type: scorecard.program_type || "basic",
  report_type: scorecard.report_type || "month",
  attendance_total: scorecard.attendance_total ?? "",
  attendance_present: scorecard.attendance_present ?? "",
  attendance_late: scorecard.attendance_late ?? "",
  score_components: Object.fromEntries(
    Object.entries(scorecard.score_components || {}).map(([key, value]) => [
      key,
      toScoreValue(value),
    ]),
  ),
  grade_label: scorecard.grade_label || "",
  student_group: scorecard.student_group || "",
  crm_warning: scorecard.crm_warning || "",
  highlighted_keywords: scorecard.highlighted_keywords || "",
  support_points: scorecard.support_points || "",
  teacher_comment: scorecard.teacher_comment || "",
  strengths: scorecard.strengths || "",
  improvements: scorecard.improvements || "",
  next_goal: scorecard.next_goal || "",
  parent_support_note: scorecard.parent_support_note || "",
});

const calculateScoreSummary = (programType, scoreComponents, schema) => {
  const components = schema?.[programType]?.components || [];
  const filledComponents = components
    .map((component) => ({
      ...component,
      value: toNullableNumber(scoreComponents?.[component.key]),
    }))
    .filter((component) => component.value !== null);

  if (!filledComponents.length) {
    return {
      totalScore: null,
      totalPercent: null,
      shieldCount: null,
      suggestedGrade: "",
    };
  }

  if (programType === "basic") {
    const weightedComponents = filledComponents.filter(
      (component) => Number(component.weight) > 0,
    );
    const totalWeight = weightedComponents.reduce(
      (sum, component) => sum + Number(component.weight || 0),
      0,
    );
    const weightedAverage = totalWeight
      ? weightedComponents.reduce((sum, component) => {
          const maxScore = Number(component.max_score) || 10;
          const normalizedScore = (Number(component.value) / maxScore) * 10;
          return sum + normalizedScore * Number(component.weight || 0);
        }, 0) / totalWeight
      : null;
    const totalPercent = weightedAverage === null ? null : weightedAverage * 10;
    return {
      totalScore: round2(weightedAverage),
      totalPercent: round2(totalPercent),
      shieldCount: null,
      suggestedGrade: getBasicGrade(weightedAverage),
    };
  }

  if (programType === "fingerprint") {
    const totalRaw = filledComponents.reduce(
      (sum, component) => sum + Number(component.value || 0),
      0,
    );
    const totalMax = filledComponents.reduce(
      (sum, component) => sum + (Number(component.max_score) || 10),
      0,
    );
    const totalPercent = totalMax ? (totalRaw / totalMax) * 100 : null;
    return {
      totalScore: round2(totalRaw),
      totalPercent: round2(totalPercent),
      shieldCount: null,
      suggestedGrade: getFingerprintGrade(totalRaw),
    };
  }

  const readingWriting =
    toNullableNumber(scoreComponents?.reading_writing_percent) ??
    (() => {
      const reading = toNullableNumber(scoreComponents?.reading_percent);
      const writing = toNullableNumber(scoreComponents?.writing_percent);
      return reading !== null && writing !== null ? (reading + writing) / 2 : null;
    })();
  const percentValues = [
    toNullableNumber(scoreComponents?.listening_percent),
    toNullableNumber(scoreComponents?.speaking_percent),
    readingWriting,
    toNullableNumber(scoreComponents?.exam_skills_percent),
    toNullableNumber(scoreComponents?.project_percent),
  ].filter((value) => value !== null);
  const totalPercent = percentValues.length
    ? percentValues.reduce((sum, value) => sum + value, 0) / percentValues.length
    : null;
  const shieldValues = [
    toNullableNumber(scoreComponents?.listening_shield) ??
      getCambridgeShield(scoreComponents?.listening_percent),
    toNullableNumber(scoreComponents?.speaking_shield) ??
      getCambridgeShield(scoreComponents?.speaking_percent),
    toNullableNumber(scoreComponents?.reading_writing_shield) ??
      getCambridgeShield(readingWriting),
  ].filter((value) => value !== null);
  const shieldCount = shieldValues.length
    ? shieldValues.reduce((sum, value) => sum + Number(value), 0)
    : null;

  return {
    totalScore: round2(totalPercent),
    totalPercent: round2(totalPercent),
    shieldCount,
    suggestedGrade: getCambridgeGrade(totalPercent),
  };
};

function MonthlyScorecards() {
  const { role } = useAuth();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const isManager = ["superadmin", "admin"].includes(role);
  const canManageScorecards = ["superadmin", "admin", "teacher"].includes(role);
  const isTeacher = role === "teacher";

  const [filters, setFilters] = useState({
    year: currentYear,
    month: currentMonth,
    center: "",
    classroom: "",
    program_type: "",
    status: "",
    page: 1,
  });
  const [schema, setSchema] = useState({});
  const [centers, setCenters] = useState([]);
  const [teacherGroups, setTeacherGroups] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [scorecards, setScorecards] = useState([]);
  const [scorecardCount, setScorecardCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [scorecardLoading, setScorecardLoading] = useState(false);
  const [studentLoading, setStudentLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncingFromScores, setSyncingFromScores] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState(() =>
    buildDefaultForm({
      month: currentMonth,
      year: currentYear,
    }),
  );
  const [reviewState, setReviewState] = useState({
    target: null,
    decision: "approve",
    note: "",
  });
  const [reloadKey, setReloadKey] = useState(0);

  const navigate = useNavigate();
  const [pageView, setPageView] = useState("overview");
  const [overviewPeriod, setOverviewPeriod] = useState({
    month: currentMonth,
    year: currentYear,
  });
  const [classOverview, setClassOverview] = useState([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const [overviewReloadKey, setOverviewReloadKey] = useState(0);
  const [selectedOverviewClassId, setSelectedOverviewClassId] = useState(null);
  const [classDetailStudents, setClassDetailStudents] = useState([]);
  const [classDetailScorecards, setClassDetailScorecards] = useState([]);
  const [classDetailTuition, setClassDetailTuition] = useState([]);
  const [classDetailLoading, setClassDetailLoading] = useState(false);
  const [classDetailError, setClassDetailError] = useState("");
  const [tuitionSavingId, setTuitionSavingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setOverviewLoading(true);
    setOverviewError("");
    listClassesOverview({ month: overviewPeriod.month, year: overviewPeriod.year })
      .then((data) => {
        if (!cancelled) setClassOverview(data.results || []);
      })
      .catch(() => {
        if (!cancelled) setOverviewError("Không thể tải danh sách lớp học.");
      })
      .finally(() => {
        if (!cancelled) setOverviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [overviewPeriod.month, overviewPeriod.year, overviewReloadKey]);

  const selectedOverviewClass = useMemo(
    () => classOverview.find((item) => item.id === selectedOverviewClassId) || null,
    [classOverview, selectedOverviewClassId],
  );

  useEffect(() => {
    if (!selectedOverviewClassId) return;
    let cancelled = false;
    setClassDetailLoading(true);
    setClassDetailError("");
    Promise.allSettled([
      listStudents({ classroom: selectedOverviewClassId, page_size: 200 }),
      listMonthlyScorecards({
        classroom: selectedOverviewClassId,
        month: overviewPeriod.month,
        year: overviewPeriod.year,
        page_size: 200,
      }),
      listTuitionStatuses({
        classroom: selectedOverviewClassId,
        month: overviewPeriod.month,
        year: overviewPeriod.year,
      }),
    ]).then(([studentResult, scorecardResult, tuitionResult]) => {
      if (cancelled) return;
      setClassDetailStudents(
        studentResult.status === "fulfilled" ? studentResult.value.results : [],
      );
      setClassDetailScorecards(
        scorecardResult.status === "fulfilled" ? scorecardResult.value.results : [],
      );
      setClassDetailTuition(
        tuitionResult.status === "fulfilled" ? tuitionResult.value.results : [],
      );
      if (
        studentResult.status === "rejected" ||
        scorecardResult.status === "rejected" ||
        tuitionResult.status === "rejected"
      ) {
        setClassDetailError("Một phần dữ liệu chi tiết lớp chưa tải được.");
      }
      setClassDetailLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedOverviewClassId, overviewPeriod.month, overviewPeriod.year]);

  const tuitionByStudentId = useMemo(() => {
    const map = new Map();
    classDetailTuition.forEach((item) => map.set(item.student, item));
    return map;
  }, [classDetailTuition]);

  const latestScorecardByStudentId = useMemo(() => {
    const map = new Map();
    classDetailScorecards.forEach((item) => {
      const existing = map.get(item.student);
      if (!existing || new Date(item.updated_at) > new Date(existing.updated_at)) {
        map.set(item.student, item);
      }
    });
    return map;
  }, [classDetailScorecards]);

  const overviewSummary = useMemo(() => {
    return classOverview.reduce(
      (acc, item) => {
        acc.classCount += 1;
        acc.studentCount += item.student_count || 0;
        acc.sessionCount += item.session_count || 0;
        const overdue =
          (item.tuition_summary?.unpaid || 0) + (item.tuition_summary?.overdue || 0);
        acc.overdueClassCount += overdue > 0 ? 1 : 0;
        return acc;
      },
      { classCount: 0, studentCount: 0, sessionCount: 0, overdueClassCount: 0 },
    );
  }, [classOverview]);

  const handleOpenClassDetail = (classroomId) => {
    setSelectedOverviewClassId(classroomId);
  };

  const handleBackToClassList = () => {
    setSelectedOverviewClassId(null);
  };

  const handleUpdateTuitionStatus = async (studentId, classroomId, statusValue) => {
    setTuitionSavingId(studentId);
    try {
      await upsertTuitionStatus({
        student: studentId,
        classroom: classroomId,
        period_month: overviewPeriod.month,
        period_year: overviewPeriod.year,
        status: statusValue,
      });
      setOverviewReloadKey((prev) => prev + 1);
      const refreshed = await listTuitionStatuses({
        classroom: classroomId,
        month: overviewPeriod.month,
        year: overviewPeriod.year,
      });
      setClassDetailTuition(refreshed.results || []);
    } catch (tuitionError) {
      setClassDetailError("Không thể cập nhật trạng thái học phí.");
    } finally {
      setTuitionSavingId(null);
    }
  };

  const handleOpenStudentProfile = (student) => {
    navigate(`/students/${student.id}`, {
      state: { profileType: "student", student },
    });
  };

  const handleOpenScorecardForStudent = (classroomId, centerId) => {
    setFilters((prev) => ({
      ...prev,
      center: centerId ? String(centerId) : prev.center,
      classroom: String(classroomId),
      month: overviewPeriod.month,
      year: overviewPeriod.year,
      page: 1,
    }));
    setPageView("scorecards");
  };

  const yearOptions = useMemo(() => {
    const startYear = currentYear - 1;
    return Array.from({ length: 5 }, (_, index) => startYear + index);
  }, [currentYear]);

  const visibleProgram = editorOpen
    ? form.program_type || "basic"
    : filters.program_type || "basic";
  const activeProgramSchema = schema?.[visibleProgram] || null;

  const scoreSummary = useMemo(
    () => calculateScoreSummary(form.program_type, form.score_components, schema),
    [form.program_type, form.score_components, schema],
  );

  const selectedClassroomName = useMemo(
    () =>
      classrooms.find((item) => String(item.id) === String(filters.classroom))
        ?.name || "",
    [classrooms, filters.classroom],
  );

  const statusCounts = useMemo(
    () =>
      scorecards.reduce(
        (acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        },
        {},
      ),
    [scorecards],
  );

  const approvedCount = statusCounts.approved || 0;
  const waitingCount = statusCounts.submitted || 0;
  const averagePercent = useMemo(() => {
    const values = scorecards
      .map((item) => Number(item.total_percent))
      .filter((value) => Number.isFinite(value));
    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, [scorecards]);

  useEffect(() => {
    let cancelled = false;

    const fetchBootstrap = async () => {
      setBootLoading(true);
      setError("");
      try {
        const requests = [
          getMonthlyScorecardSchema(),
          isTeacher ? listTeacherCentersClassrooms() : listCentersAll(),
        ];
        if (isManager) {
          requests.push(listClassroomsAll());
          requests.push(listTeachers({ page_size: 100 }));
        }
        const [schemaResult, centerResult, classroomResult, teacherResult] =
          await Promise.allSettled(requests);

        if (cancelled) return;

        if (schemaResult.status === "fulfilled") {
          setSchema(schemaResult.value || {});
        }

        if (centerResult.status === "fulfilled") {
          if (isTeacher) {
            const groups = centerResult.value || [];
            setTeacherGroups(groups);
            setCenters(
              groups.map((group) => ({
                id: group.center_id,
                name: group.center_name,
              })),
            );
            const firstGroup = groups[0];
            const firstClassroom = firstGroup?.classrooms?.[0];
            if (firstGroup && firstClassroom) {
              setFilters((current) => ({
                ...current,
                center: current.center || String(firstGroup.center_id),
                classroom:
                  current.classroom || String(firstClassroom.classroom_id),
              }));
            }
          } else {
            setCenters(centerResult.value || []);
          }
        }

        if (classroomResult?.status === "fulfilled") {
          setClassrooms(classroomResult.value || []);
        }

        if (teacherResult?.status === "fulfilled") {
          setTeachers(teacherResult.value.results || []);
        }

        const hasFailure = [schemaResult, centerResult, classroomResult, teacherResult].some(
          (result) => result && result.status === "rejected",
        );
        if (hasFailure) {
          setError("Một phần dữ liệu khởi tạo bảng điểm chưa tải được.");
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(getErrorMessage(fetchError, "Không thể tải dữ liệu bảng điểm."));
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
  }, [isManager, isTeacher]);

  useEffect(() => {
    let cancelled = false;

    if (!filters.center) {
      if (isManager) {
        listClassroomsAll()
          .then((data) => {
            if (!cancelled) setClassrooms(data);
          })
          .catch(() => {
            if (!cancelled) {
              setClassrooms([]);
              setError("Không tải được danh sách lớp.");
            }
          });
      } else {
        setClassrooms([]);
      }
      return undefined;
    }

    if (isTeacher) {
      const group = teacherGroups.find(
        (item) => String(item.center_id) === String(filters.center),
      );
      const nextClassrooms = (group?.classrooms || []).map((item) => ({
        id: item.classroom_id,
        name: item.classroom_name,
      }));
      setClassrooms(nextClassrooms);
      if (
        nextClassrooms.length &&
        !nextClassrooms.some((item) => String(item.id) === String(filters.classroom))
      ) {
        setFilters((current) => ({
          ...current,
          classroom: String(nextClassrooms[0].id),
          page: 1,
        }));
      }
      return undefined;
    }

    const fetchClassrooms = async () => {
      try {
        const data = await listClassroomsByCenter(filters.center);
        if (!cancelled) {
          setClassrooms(data);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setClassrooms([]);
          setError("Không tải được danh sách lớp theo trung tâm.");
        }
      }
    };

    fetchClassrooms();
    return () => {
      cancelled = true;
    };
  }, [filters.center, filters.classroom, isTeacher, teacherGroups]);

  useEffect(() => {
    let cancelled = false;

    if (!filters.classroom) {
      setStudents([]);
      return undefined;
    }

    const fetchStudents = async () => {
      setStudentLoading(true);
      try {
        const data =
          isTeacher && filters.center
            ? await listTeacherStudentsByCenterClassroom(
                filters.center,
                filters.classroom,
              )
            : await listStudents({
                center: filters.center || undefined,
                classroom: filters.classroom,
                page_size: 100,
              }).then((response) => response.results);
        if (!cancelled) {
          setStudents(data);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setStudents([]);
          setError(getErrorMessage(fetchError, "Không tải được học viên của lớp."));
        }
      } finally {
        if (!cancelled) {
          setStudentLoading(false);
        }
      }
    };

    fetchStudents();
    return () => {
      cancelled = true;
    };
  }, [filters.center, filters.classroom, isTeacher]);

  useEffect(() => {
    let cancelled = false;

    const fetchScorecards = async () => {
      setScorecardLoading(true);
      setError("");
      try {
        const response = await listMonthlyScorecards({
          page: filters.page,
          page_size: 20,
          month: filters.month,
          year: filters.year,
          center: filters.center || undefined,
          classroom: filters.classroom || undefined,
          program_type: filters.program_type || undefined,
          status: filters.status || undefined,
        });
        if (!cancelled) {
          setScorecards(response.results);
          setScorecardCount(response.count);
          setHasNextPage(Boolean(response.next));
          setHasPrevPage(Boolean(response.previous));
        }
      } catch (fetchError) {
        if (!cancelled) {
          setScorecards([]);
          setScorecardCount(0);
          setHasNextPage(false);
          setHasPrevPage(false);
          setError(getErrorMessage(fetchError, "Không tải được bảng điểm tháng."));
        }
      } finally {
        if (!cancelled) {
          setScorecardLoading(false);
        }
      }
    };

    fetchScorecards();
    return () => {
      cancelled = true;
    };
  }, [
    filters.classroom,
    filters.center,
    filters.month,
    filters.page,
    filters.program_type,
    filters.status,
    filters.year,
    reloadKey,
  ]);

  const updateFilter = (key, value) => {
    setFilters((current) => {
      const next = {
        ...current,
        [key]: value,
        page: 1,
      };
      if (key === "center") {
        next.classroom = "";
      }
      return next;
    });
  };

  const updateFormField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateScoreComponent = (key, value) => {
    setForm((current) => ({
      ...current,
      score_components: {
        ...current.score_components,
        [key]: value,
      },
    }));
  };

  const openCreateEditor = () => {
    setNotice("");
    setError("");
    if (!filters.classroom) {
      setError("Vui lòng chọn lớp trước khi tạo bảng điểm tháng.");
      return;
    }
    setForm(
      buildDefaultForm({
        month: Number(filters.month),
        year: Number(filters.year),
        classroom: filters.classroom,
        programType: filters.program_type || "basic",
      }),
    );
    setEditorOpen(true);
  };

  const openEditEditor = (scorecard) => {
    setNotice("");
    setError("");
    setForm(buildFormFromScorecard(scorecard));
    setEditorOpen(true);
  };

  const buildPayload = () => {
    const normalizedComponents = {};
    const activeKeys = new Set(
      (schema?.[form.program_type]?.components || []).map((component) => component.key),
    );
    Object.entries(form.score_components || {}).forEach(([key, value]) => {
      if (activeKeys.size && !activeKeys.has(key)) return;
      const numericValue = toNullableNumber(value);
      if (numericValue !== null) {
        normalizedComponents[key] = numericValue;
      }
    });

    const summary = calculateScoreSummary(
      form.program_type,
      normalizedComponents,
      schema,
    );

    const payload = {
      student: Number(form.student),
      classroom: Number(form.classroom),
      period_label:
        form.period_label || buildPeriodLabel(form.period_month, form.period_year),
      period_month: Number(form.period_month),
      period_year: Number(form.period_year),
      program_type: form.program_type,
      report_type: form.report_type,
      attendance_total: toNullableNumber(form.attendance_total),
      attendance_present: toNullableNumber(form.attendance_present),
      attendance_late: toNullableNumber(form.attendance_late),
      score_components: normalizedComponents,
      total_score: summary.totalScore,
      total_percent: summary.totalPercent,
      shield_count: summary.shieldCount,
      grade_label: form.grade_label || summary.suggestedGrade,
      student_group: form.student_group,
      crm_warning: form.crm_warning,
      highlighted_keywords: form.highlighted_keywords,
      support_points: form.support_points,
      teacher_comment: form.teacher_comment,
      strengths: form.strengths,
      improvements: form.improvements,
      next_goal: form.next_goal,
      parent_support_note: form.parent_support_note,
    };

    if (form.teacher) {
      payload.teacher = Number(form.teacher);
    }

    return payload;
  };

  const handleSaveScorecard = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const payload = buildPayload();
      if (!payload.student || !payload.classroom) {
        setError("Vui lòng chọn học viên và lớp học.");
        return;
      }
      if (form.id) {
        await updateMonthlyScorecard(form.id, payload);
        setNotice("Đã cập nhật bảng điểm tháng.");
      } else {
        await createMonthlyScorecard(payload);
        setNotice("Đã tạo bảng điểm tháng.");
      }
      setEditorOpen(false);
      setReloadKey((current) => current + 1);
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Không lưu được bảng điểm tháng."));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async (scorecard) => {
    setActionLoadingId(scorecard.id);
    setNotice("");
    setError("");
    try {
      await submitMonthlyScorecard(scorecard.id);
      setNotice("Đã gửi bảng điểm cho quản lý xét duyệt.");
      setReloadKey((current) => current + 1);
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Không gửi duyệt được bảng điểm."));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSyncFromScores = async () => {
    setSyncingFromScores(true);
    setNotice("");
    setError("");
    try {
      const result = await syncMonthlyScorecardsFromScores({
        month: filters.month,
        year: filters.year,
        center: filters.center || null,
        classroom: filters.classroom || null,
        program_type: filters.program_type || "basic",
        report_type: "month",
      });
      setNotice(
        `Đã đồng bộ điểm đã nhập: tạo ${formatNumber(
          result.created_count,
        )}, cập nhật ${formatNumber(result.updated_count)}, bỏ qua ${formatNumber(
          result.skipped_count,
        )}.`,
      );
      setReloadKey((current) => current + 1);
    } catch (syncError) {
      setError(
        getErrorMessage(
          syncError,
          "Không đồng bộ được điểm đã nhập sang bảng điểm tháng.",
        ),
      );
    } finally {
      setSyncingFromScores(false);
    }
  };

  const handleReview = async (event) => {
    event.preventDefault();
    if (!reviewState.target) return;
    setActionLoadingId(reviewState.target.id);
    setNotice("");
    setError("");
    try {
      await reviewMonthlyScorecard(reviewState.target.id, {
        decision: reviewState.decision,
        note: reviewState.note,
      });
      setNotice("Đã cập nhật quyết định duyệt bảng điểm.");
      setReviewState({ target: null, decision: "approve", note: "" });
      setReloadKey((current) => current + 1);
    } catch (reviewError) {
      setError(getErrorMessage(reviewError, "Không xét duyệt được bảng điểm."));
    } finally {
      setActionLoadingId(null);
    }
  };

  const canEditScorecard = (scorecard) =>
    canManageScorecards &&
    (isManager || ["draft", "revision_required"].includes(scorecard.status));

  const canSubmitScorecard = (scorecard) =>
    canManageScorecards && ["draft", "revision_required"].includes(scorecard.status);

  const activeComponents = activeProgramSchema?.components || [];
  const currentFormWritable =
    canManageScorecards &&
    (isManager || !form.id || ["draft", "revision_required"].includes(form.status));

  const tuitionStatusLabels = {
    paid: "Đã đóng",
    partial: "Đóng một phần",
    unpaid: "Chưa đóng",
    overdue: "Quá hạn",
  };
  const tuitionStatusTone = {
    paid: "success",
    partial: "info",
    unpaid: "warning",
    overdue: "danger",
  };

  if (pageView === "overview" && !selectedOverviewClassId) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <span className={styles.badge}>Lớp học</span>
            <h1>Danh sách lớp đang dạy — {buildPeriodLabel(overviewPeriod.month, overviewPeriod.year)}</h1>
            <p>Tổng quan số buổi, sĩ số và tình trạng học phí theo từng lớp.</p>
          </div>
          <div className={styles.headerControls}>
            <label className={styles.field}>
              <span>Năm</span>
              <select
                value={overviewPeriod.year}
                onChange={(event) =>
                  setOverviewPeriod((prev) => ({ ...prev, year: Number(event.target.value) }))
                }
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Tháng</span>
              <select
                value={overviewPeriod.month}
                onChange={(event) =>
                  setOverviewPeriod((prev) => ({ ...prev, month: Number(event.target.value) }))
                }
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        {overviewError && <div className={styles.error}>{overviewError}</div>}

        <section className={styles.summaryGrid}>
          <article className={styles.summaryItem}>
            <span>Tổng số lớp</span>
            <strong>{overviewSummary.classCount}</strong>
          </article>
          <article className={styles.summaryItem}>
            <span>Tổng học sinh</span>
            <strong>{overviewSummary.studentCount}</strong>
          </article>
          <article className={styles.summaryItem}>
            <span>Tổng số buổi trong tháng</span>
            <strong>{overviewSummary.sessionCount}</strong>
          </article>
          <article className={styles.summaryItem}>
            <span>Lớp có học phí chưa thu đủ</span>
            <strong>{overviewSummary.overdueClassCount}</strong>
          </article>
        </section>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Lớp</th>
                <th>Trung tâm</th>
                <th>Giáo viên</th>
                <th>Sĩ số</th>
                <th>Số buổi</th>
                <th>Tình trạng học phí</th>
              </tr>
            </thead>
            <tbody>
              {overviewLoading ? (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    Đang tải...
                  </td>
                </tr>
              ) : classOverview.length ? (
                classOverview.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleOpenClassDetail(item.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <strong>{item.name}</strong>
                      {item.program_name ? <div><span>{item.program_name}</span></div> : null}
                    </td>
                    <td>{item.center_name || "--"}</td>
                    <td>{item.teacher_names?.length ? item.teacher_names.join(", ") : "--"}</td>
                    <td>{item.student_count}</td>
                    <td>{item.session_count}</td>
                    <td>
                      {item.tuition_tracked_count ? (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {Object.entries(item.tuition_summary || {})
                            .filter(([, count]) => count > 0)
                            .map(([statusKey, count]) => (
                              <span
                                key={statusKey}
                                className={styles.statusChip}
                                data-tone={tuitionStatusTone[statusKey] || "neutral"}
                              >
                                {tuitionStatusLabels[statusKey] || statusKey}: {count}
                              </span>
                            ))}
                        </div>
                      ) : (
                        <span className={styles.statusChip} data-tone="neutral">
                          Chưa cập nhật
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    Chưa có lớp nào trong kỳ này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (pageView === "overview" && selectedOverviewClassId) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <button type="button" className={styles.secondaryButton} onClick={handleBackToClassList}>
              ← Danh sách lớp
            </button>
            <h1 style={{ marginTop: 10 }}>{selectedOverviewClass?.name || "Chi tiết lớp"}</h1>
            <p>
              {selectedOverviewClass?.center_name || "--"} •{" "}
              {selectedOverviewClass?.teacher_names?.join(", ") || "Chưa gán giáo viên"}
            </p>
          </div>
        </header>

        {classDetailError && <div className={styles.error}>{classDetailError}</div>}

        <section className={styles.summaryGrid}>
          <article className={styles.summaryItem}>
            <span>Sĩ số</span>
            <strong>{selectedOverviewClass?.student_count ?? "--"}</strong>
          </article>
          <article className={styles.summaryItem}>
            <span>Số buổi trong tháng</span>
            <strong>{selectedOverviewClass?.session_count ?? "--"}</strong>
          </article>
          <article className={styles.summaryItem}>
            <span>Kỳ xem</span>
            <strong>{buildPeriodLabel(overviewPeriod.month, overviewPeriod.year)}</strong>
          </article>
        </section>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Học sinh</th>
                <th>Trạng thái</th>
                <th>Bảng điểm mới nhất</th>
                <th>Học phí</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {classDetailLoading ? (
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    Đang tải...
                  </td>
                </tr>
              ) : classDetailStudents.length ? (
                classDetailStudents.map((student) => {
                  const latestScorecard = latestScorecardByStudentId.get(student.id);
                  const tuition = tuitionByStudentId.get(student.id);
                  return (
                    <tr key={student.id}>
                      <td>
                        <strong>{getStudentName(student)}</strong>
                        <div><span>{getStudentCode(student)}</span></div>
                      </td>
                      <td>{studentStatusLabels?.[student.current_status] || student.current_status}</td>
                      <td>
                        {latestScorecard ? (
                          <>
                            {latestScorecard.grade_label || "--"}
                            <div><span>{latestScorecard.total_score ?? latestScorecard.total_percent ?? "--"}</span></div>
                          </>
                        ) : (
                          "Chưa có"
                        )}
                      </td>
                      <td>
                        <select
                          value={tuition?.status || "unpaid"}
                          disabled={tuitionSavingId === student.id}
                          onChange={(event) =>
                            handleUpdateTuitionStatus(
                              student.id,
                              selectedOverviewClassId,
                              event.target.value,
                            )
                          }
                        >
                          {Object.entries(tuitionStatusLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => handleOpenStudentProfile(student)}
                          >
                            Chi tiết & đánh giá
                          </button>
                          {canManageScorecards && (
                            <button
                              type="button"
                              className={styles.secondaryButton}
                              onClick={() =>
                                handleOpenScorecardForStudent(
                                  selectedOverviewClassId,
                                  selectedOverviewClass?.center_id,
                                )
                              }
                            >
                              Bảng điểm
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    Lớp chưa có học sinh.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setPageView("overview")}
          >
            ← Danh sách lớp
          </button>
          <span className={styles.badge} style={{ marginTop: 10 }}>Bảng điểm tháng</span>
          <h1>{buildPeriodLabel(filters.month, filters.year)}</h1>
          <p>
            Khung điểm cuối tháng theo học viên, lớp, chương trình và trạng thái
            duyệt.
          </p>
        </div>
        <div className={styles.headerControls}>
          <label className={styles.field}>
            <span>Năm</span>
            <select
              value={filters.year}
              onChange={(event) => updateFilter("year", Number(event.target.value))}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Tháng</span>
            <select
              value={filters.month}
              onChange={(event) => updateFilter("month", Number(event.target.value))}
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>
          {canManageScorecards ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleSyncFromScores}
              disabled={bootLoading || syncingFromScores || (isTeacher && !filters.classroom)}
            >
              {syncingFromScores ? "Đang đồng bộ..." : "Đồng bộ điểm đã nhập"}
            </button>
          ) : null}
          {canManageScorecards ? (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={openCreateEditor}
              disabled={bootLoading || !filters.classroom}
            >
              Tạo bảng điểm
            </button>
          ) : null}
        </div>
      </header>

      {notice ? <div className={styles.notice}>{notice}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.summaryGrid}>
        <article className={styles.summaryItem}>
          <span>Tổng bảng điểm</span>
          <strong>{scorecardLoading ? "..." : formatNumber(scorecardCount)}</strong>
          <small>
            {selectedClassroomName ||
              centers.find((center) => String(center.id) === String(filters.center))?.name ||
              "Toàn bộ lớp trong quyền xem"}
          </small>
        </article>
        <article className={styles.summaryItem}>
          <span>Chờ duyệt</span>
          <strong>{formatNumber(waitingCount)}</strong>
          <small>Cần quản lý xét duyệt</small>
        </article>
        <article className={styles.summaryItem}>
          <span>Đã duyệt</span>
          <strong>{formatNumber(approvedCount)}</strong>
          <small>Sẵn sàng gửi phụ huynh/cuối kỳ</small>
        </article>
        <article className={styles.summaryItem}>
          <span>Điểm TB trang này</span>
          <strong>
            {averagePercent === null ? "--" : `${formatNumber(averagePercent.toFixed(1))}%`}
          </strong>
          <small>{filters.program_type || "Tất cả chương trình"}</small>
        </article>
      </section>

      <section className={styles.workspace}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Danh sách bảng điểm</h2>
              <p>Hiển thị theo tháng, lớp, chương trình và trạng thái.</p>
            </div>
          </div>

          <div className={styles.filters}>
            {role !== "student" ? (
              <>
                <label className={styles.field}>
                  <span>Trung tâm</span>
                  <select
                    value={filters.center}
                    onChange={(event) => updateFilter("center", event.target.value)}
                  >
                    <option value="">Tất cả trung tâm</option>
                    {centers.map((center) => (
                      <option key={center.id} value={center.id}>
                        {center.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Lớp</span>
                  <select
                    value={filters.classroom}
                    onChange={(event) =>
                      updateFilter("classroom", event.target.value)
                    }
                  >
                    <option value="">Tất cả lớp</option>
                    {classrooms.map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {getClassroomLabel(classroom)}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}
            <label className={styles.field}>
              <span>Chương trình</span>
              <select
                value={filters.program_type}
                onChange={(event) =>
                  updateFilter("program_type", event.target.value)
                }
              >
                {programOptions.map((program) => (
                  <option key={program.value || "all"} value={program.value}>
                    {program.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Trạng thái</span>
              <select
                value={filters.status}
                onChange={(event) => updateFilter("status", event.target.value)}
              >
                {statusOptions.map((status) => (
                  <option key={status.value || "all"} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {scorecardLoading ? (
            <div className={styles.empty}>Đang tải bảng điểm tháng...</div>
          ) : scorecards.length ? (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Học viên</th>
                      <th>Lớp / GV</th>
                      <th>Chương trình</th>
                      <th>Chuyên cần</th>
                      <th>Kết quả</th>
                      <th>Nhận xét</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scorecards.map((scorecard) => {
                      const meta = statusMeta[scorecard.status] || {
                        label: scorecard.status,
                        tone: "neutral",
                      };
                      const components =
                        schema?.[scorecard.program_type]?.components || [];
                      const previewComponents = components.slice(0, 3);
                      return (
                        <tr key={scorecard.id}>
                          <td>
                            <div className={styles.personCell}>
                              <strong>{scorecard.student_name || "--"}</strong>
                              <span>{scorecard.period_label}</span>
                            </div>
                          </td>
                          <td>
                            <div className={styles.personCell}>
                              <strong>{scorecard.classroom_name || "--"}</strong>
                              <span>{scorecard.center_name || "Chưa có trung tâm"}</span>
                              <span>{scorecard.teacher_name || "Chưa gán GV"}</span>
                            </div>
                          </td>
                          <td>
                            <div className={styles.programCell}>
                              <strong>
                                {schema?.[scorecard.program_type]?.label ||
                                  scorecard.program_type}
                              </strong>
                              <span>
                                {reportTypeOptions.find(
                                  (item) => item.value === scorecard.report_type,
                                )?.label || scorecard.report_type}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className={styles.attendanceCell}>
                              <strong>
                                {formatNumber(scorecard.attendance_present)}
                                /{formatNumber(scorecard.attendance_total)}
                              </strong>
                              <span>Muộn {formatNumber(scorecard.attendance_late)}</span>
                            </div>
                          </td>
                          <td>
                            <div className={styles.resultCell}>
                              <strong>
                                {scorecard.total_percent
                                  ? `${formatNumber(scorecard.total_percent)}%`
                                  : scorecard.total_score || "--"}
                              </strong>
                              <span>{scorecard.grade_label || "--"}</span>
                              <ul>
                                {previewComponents.map((component) => (
                                  <li key={component.key}>
                                    {component.label}:{" "}
                                    {scorecard.score_components?.[component.key] ?? "--"}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </td>
                          <td>
                            <p className={styles.commentText}>
                              {scorecard.teacher_comment ||
                                scorecard.crm_warning ||
                                scorecard.next_goal ||
                                "--"}
                            </p>
                          </td>
                          <td>
                            <span
                              className={styles.statusChip}
                              data-tone={meta.tone}
                            >
                              {meta.label}
                            </span>
                          </td>
                          <td>
                            <div className={styles.rowActions}>
                              <button
                                type="button"
                                className={styles.secondaryButton}
                                onClick={() => openEditEditor(scorecard)}
                              >
                                {canEditScorecard(scorecard) ? "Xem/Sửa" : "Xem"}
                              </button>
                              {canSubmitScorecard(scorecard) ? (
                                <button
                                  type="button"
                                  className={styles.primaryButton}
                                  onClick={() => handleSubmitForReview(scorecard)}
                                  disabled={actionLoadingId === scorecard.id}
                                >
                                  Gửi duyệt
                                </button>
                              ) : null}
                              {isManager && scorecard.status === "submitted" ? (
                                <>
                                  <button
                                    type="button"
                                    className={styles.approveButton}
                                    onClick={() =>
                                      setReviewState({
                                        target: scorecard,
                                        decision: "approve",
                                        note: "",
                                      })
                                    }
                                  >
                                    Duyệt
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.dangerButton}
                                    onClick={() =>
                                      setReviewState({
                                        target: scorecard,
                                        decision: "request-revision",
                                        note: "",
                                      })
                                    }
                                  >
                                    Cần sửa
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className={styles.pagination}>
                <span>
                  Trang {formatNumber(filters.page)} | {formatNumber(scorecardCount)} bảng điểm
                </span>
                <div>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={!hasPrevPage}
                    onClick={() =>
                      setFilters((current) => ({
                        ...current,
                        page: Math.max(1, current.page - 1),
                      }))
                    }
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={!hasNextPage}
                    onClick={() =>
                      setFilters((current) => ({
                        ...current,
                        page: current.page + 1,
                      }))
                    }
                  >
                    Sau
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.empty}>
              Chưa có bảng điểm cho bộ lọc hiện tại. Có thể dùng nút
              “Đồng bộ điểm đã nhập” để tạo bảng điểm tháng từ các điểm lẻ đã có.
            </div>
          )}
        </article>

        <aside className={styles.sidePanel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Khung đầu điểm</h2>
              <p>{activeProgramSchema?.label || "Chọn chương trình để xem khung."}</p>
            </div>
          </div>

          <label className={styles.field}>
            <span>Khung đang xem</span>
            <select
              value={visibleProgram}
              onChange={(event) => {
                updateFilter("program_type", event.target.value);
                updateFormField("program_type", event.target.value);
              }}
            >
              {programOptions
                .filter((program) => program.value)
                .map((program) => (
                  <option key={program.value} value={program.value}>
                    {program.label}
                  </option>
                ))}
            </select>
          </label>

          <div className={styles.schemaList}>
            {activeComponents.map((component) => (
              <div key={component.key} className={styles.schemaItem}>
                <div>
                  <strong>{component.label}</strong>
                  <span>{component.key}</span>
                </div>
                <small>
                  Max {component.max_score}
                  {component.weight ? ` | HS ${component.weight}` : ""}
                  {component.shield ? " | Shield" : ""}
                </small>
              </div>
            ))}
          </div>
        </aside>
      </section>

      {editorOpen ? (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <form className={styles.modal} onSubmit={handleSaveScorecard}>
            <header className={styles.modalHeader}>
              <div>
                <h2>{form.id ? "Chi tiết bảng điểm" : "Tạo bảng điểm tháng"}</h2>
                <p>
                  {activeProgramSchema?.label || "Khung điểm"} |{" "}
                  {form.period_label}
                </p>
              </div>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Đóng"
                onClick={() => setEditorOpen(false)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M6 6 18 18M18 6 6 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </header>

            <fieldset className={styles.modalBody} disabled={!currentFormWritable}>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Học viên</span>
                  <select
                    value={form.student}
                    onChange={(event) =>
                      updateFormField("student", event.target.value)
                    }
                    disabled={Boolean(form.id) || studentLoading}
                    required
                  >
                    <option value="">Chọn học viên</option>
                    {form.student &&
                    !students.some((student) => String(student.id) === String(form.student)) ? (
                      <option value={form.student}>
                        {form.student_name || `Học viên #${form.student}`}
                      </option>
                    ) : null}
                    {students
                      .filter((student) =>
                        form.classroom
                          ? String(getStudentClassroomId(student)) ===
                            String(form.classroom)
                          : true,
                      )
                      .map((student) => (
                        <option key={student.id} value={student.id}>
                          {getStudentName(student)} | {getStudentCode(student)}
                        </option>
                      ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Lớp</span>
                  <select
                    value={form.classroom}
                    onChange={(event) =>
                      updateFormField("classroom", event.target.value)
                    }
                    disabled
                    required
                  >
                    <option value="">Chọn lớp</option>
                    {form.classroom &&
                    !classrooms.some(
                      (classroom) => String(classroom.id) === String(form.classroom),
                    ) ? (
                      <option value={form.classroom}>
                        {form.classroom_name || `Lớp #${form.classroom}`}
                      </option>
                    ) : null}
                    {classrooms.map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {getClassroomLabel(classroom)}
                      </option>
                    ))}
                  </select>
                </label>
                {isManager ? (
                  <label className={styles.field}>
                    <span>Giáo viên phụ trách</span>
                    <select
                      value={form.teacher}
                      onChange={(event) =>
                        updateFormField("teacher", event.target.value)
                      }
                    >
                      <option value="">Chưa gán</option>
                      {form.teacher &&
                      !teachers.some(
                        (teacher) => String(teacher.id) === String(form.teacher),
                      ) ? (
                        <option value={form.teacher}>
                          {form.teacher_name || `Giáo viên #${form.teacher}`}
                        </option>
                      ) : null}
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.teacher_name ||
                            getUserFullName(teacher.user) ||
                            teacher.teacher_code}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className={styles.field}>
                  <span>Chương trình</span>
                  <select
                    value={form.program_type}
                    onChange={(event) =>
                      updateFormField("program_type", event.target.value)
                    }
                  >
                    {programOptions
                      .filter((program) => program.value)
                      .map((program) => (
                        <option key={program.value} value={program.value}>
                          {program.label}
                        </option>
                      ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Loại báo cáo</span>
                  <select
                    value={form.report_type}
                    onChange={(event) =>
                      updateFormField("report_type", event.target.value)
                    }
                  >
                    {reportTypeOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Kỳ điểm</span>
                  <input
                    value={form.period_label}
                    onChange={(event) =>
                      updateFormField("period_label", event.target.value)
                    }
                  />
                </label>
              </div>

              <section className={styles.formSection}>
                <div className={styles.sectionHeader}>
                  <h3>Chuyên cần</h3>
                </div>
                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span>Tổng buổi</span>
                    <input
                      type="number"
                      min="0"
                      value={form.attendance_total}
                      onChange={(event) =>
                        updateFormField("attendance_total", event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Có mặt</span>
                    <input
                      type="number"
                      min="0"
                      value={form.attendance_present}
                      onChange={(event) =>
                        updateFormField("attendance_present", event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Đi muộn</span>
                    <input
                      type="number"
                      min="0"
                      value={form.attendance_late}
                      onChange={(event) =>
                        updateFormField("attendance_late", event.target.value)
                      }
                    />
                  </label>
                </div>
              </section>

              <section className={styles.formSection}>
                <div className={styles.sectionHeader}>
                  <h3>Các đầu điểm</h3>
                  <span>
                    Tạm tính:{" "}
                    {scoreSummary.totalPercent === null
                      ? "--"
                      : `${scoreSummary.totalPercent}%`}
                  </span>
                </div>
                <div className={styles.scoreGrid}>
                  {(schema?.[form.program_type]?.components || []).map((component) => (
                    <label key={component.key} className={styles.scoreField}>
                      <span>{component.label}</span>
                      <input
                        type="number"
                        min="0"
                        max={component.max_score || 100}
                        step="0.1"
                        value={form.score_components?.[component.key] || ""}
                        onChange={(event) =>
                          updateScoreComponent(component.key, event.target.value)
                        }
                      />
                      <small>
                        Max {component.max_score}
                        {component.weight ? ` | HS ${component.weight}` : ""}
                      </small>
                    </label>
                  ))}
                </div>
              </section>

              <section className={styles.formSection}>
                <div className={styles.sectionHeader}>
                  <h3>Tổng hợp và nhận xét</h3>
                  <span>
                    Gợi ý xếp loại: {scoreSummary.suggestedGrade || "--"}
                  </span>
                </div>
                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span>Xếp loại</span>
                    <input
                      value={form.grade_label}
                      onChange={(event) =>
                        updateFormField("grade_label", event.target.value)
                      }
                      placeholder={scoreSummary.suggestedGrade || "Nhập xếp loại"}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Nhóm học viên</span>
                    <input
                      value={form.student_group}
                      onChange={(event) =>
                        updateFormField("student_group", event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Cảnh báo CRM</span>
                    <input
                      value={form.crm_warning}
                      onChange={(event) =>
                        updateFormField("crm_warning", event.target.value)
                      }
                    />
                  </label>
                  <label className={`${styles.field} ${styles.fieldFull}`}>
                    <span>Từ khóa nổi bật</span>
                    <textarea
                      rows="2"
                      value={form.highlighted_keywords}
                      onChange={(event) =>
                        updateFormField("highlighted_keywords", event.target.value)
                      }
                    />
                  </label>
                  <label className={`${styles.field} ${styles.fieldFull}`}>
                    <span>Nhận xét giáo viên</span>
                    <textarea
                      rows="3"
                      value={form.teacher_comment}
                      onChange={(event) =>
                        updateFormField("teacher_comment", event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Điểm mạnh</span>
                    <textarea
                      rows="3"
                      value={form.strengths}
                      onChange={(event) =>
                        updateFormField("strengths", event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Cần cải thiện</span>
                    <textarea
                      rows="3"
                      value={form.improvements}
                      onChange={(event) =>
                        updateFormField("improvements", event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Mục tiêu tháng sau</span>
                    <textarea
                      rows="3"
                      value={form.next_goal}
                      onChange={(event) =>
                        updateFormField("next_goal", event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Phụ huynh hỗ trợ</span>
                    <textarea
                      rows="3"
                      value={form.parent_support_note}
                      onChange={(event) =>
                        updateFormField("parent_support_note", event.target.value)
                      }
                    />
                  </label>
                  <label className={`${styles.field} ${styles.fieldFull}`}>
                    <span>Điểm cần hỗ trợ</span>
                    <textarea
                      rows="2"
                      value={form.support_points}
                      onChange={(event) =>
                        updateFormField("support_points", event.target.value)
                      }
                    />
                  </label>
                </div>
              </section>
            </fieldset>

            <footer className={styles.modalFooter}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setEditorOpen(false)}
                disabled={saving}
              >
                Đóng
              </button>
              {currentFormWritable ? (
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={saving}
                >
                  {saving ? "Đang lưu..." : "Lưu bảng điểm"}
                </button>
              ) : null}
            </footer>
          </form>
        </div>
      ) : null}

      {reviewState.target ? (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <form className={styles.reviewModal} onSubmit={handleReview}>
            <header className={styles.modalHeader}>
              <div>
                <h2>
                  {reviewState.decision === "approve"
                    ? "Duyệt bảng điểm"
                    : "Yêu cầu sửa bảng điểm"}
                </h2>
                <p>{reviewState.target.student_name}</p>
              </div>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Đóng"
                onClick={() =>
                  setReviewState({ target: null, decision: "approve", note: "" })
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M6 6 18 18M18 6 6 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </header>
            <div className={styles.modalBody}>
              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span>Ghi chú xét duyệt</span>
                <textarea
                  rows="4"
                  value={reviewState.note}
                  onChange={(event) =>
                    setReviewState((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <footer className={styles.modalFooter}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() =>
                  setReviewState({ target: null, decision: "approve", note: "" })
                }
                disabled={actionLoadingId === reviewState.target.id}
              >
                Hủy
              </button>
              <button
                type="submit"
                className={
                  reviewState.decision === "approve"
                    ? styles.approveButton
                    : styles.dangerButton
                }
                disabled={actionLoadingId === reviewState.target.id}
              >
                {actionLoadingId === reviewState.target.id
                  ? "Đang xử lý..."
                  : "Xác nhận"}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default MonthlyScorecards;
