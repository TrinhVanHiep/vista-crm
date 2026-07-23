import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import apiClient from "../services/apiClient";
import { createZaloLink, listZaloLinks, updateZaloLink } from "../services/notificationService";
import styles from "../styles/employeeProfile.module.css";
import {
  formatDate,
  formatGender,
  getAge,
  getFullName,
  getInitials,
} from "../utils/userFormatters";

const tabs = [
  { id: "overview", label: "Tổng quan" },
  { id: "activity", label: "Hoạt động" },
  { id: "reports", label: "Báo cáo" },
];

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: `Tháng ${index + 1}`,
}));

const getValue = (value, fallback = "--") => {
  if (value === null || value === undefined || value === "") return fallback;
  return value;
};

const formatCurrency = (value) =>
  `${new Intl.NumberFormat("vi-VN").format(Math.round(Number(value) || 0))} ₫`;

const formatNumber = (value) =>
  new Intl.NumberFormat("vi-VN").format(Number(value) || 0);

const formatPercent = (value) =>
  `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)}%`;

const scoreStatusLabels = {
  draft: "Nháp",
  submitted: "Đã gửi",
  published: "Đã công bố",
  locked: "Đã khóa",
};

const studentStatusLabels = {
  active: "Đang học",
  paused: "Bảo lưu",
  graduated: "Hoàn thành",
  withdrawn: "Nghỉ học",
};

const teacherStatusLabels = {
  active: "Đang làm",
  probation: "Thử việc",
  paused: "Tạm dừng",
  terminated: "Đã nghỉ",
};

const employmentTypeLabels = {
  director: "Giám đốc",
  full_time: "Full-time",
  part_time: "Part-time",
  freelance: "Freelance",
};

const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.results) ? payload.results : [];
};

const TABLE_PAGE_SIZE = 5;

const getTotalPages = (total, pageSize = TABLE_PAGE_SIZE) =>
  Math.max(1, Math.ceil((Number(total) || 0) / pageSize));

const paginateRows = (rows, page, pageSize = TABLE_PAGE_SIZE) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const safePage = Math.min(
    Math.max(Number(page) || 1, 1),
    getTotalPages(safeRows.length, pageSize),
  );
  const start = (safePage - 1) * pageSize;
  return safeRows.slice(start, start + pageSize);
};

function TablePagination({ page, pageSize = TABLE_PAGE_SIZE, total, onChange }) {
  if (total <= pageSize) return null;
  const totalPages = getTotalPages(total, pageSize);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(total, safePage * pageSize);

  return (
    <div className={styles.tablePagination}>
      <span>
        {formatNumber(start)}-{formatNumber(end)} / {formatNumber(total)}
      </span>
      <div className={styles.tablePaginationActions}>
        <button
          type="button"
          onClick={() => onChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
        >
          Trước
        </button>
        <strong>
          {formatNumber(safePage)} / {formatNumber(totalPages)}
        </strong>
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage >= totalPages}
        >
          Sau
        </button>
      </div>
    </div>
  );
}

const buildTeacherProfile = (teacher) => {
  const user = teacher?.user || {};
  const name = getFullName(user);
  const grouped = teacher?.centers_classrooms_grouped || [];
  const classroomNames = grouped.flatMap((group) =>
    (group.classrooms || []).map((classroom) => classroom.name),
  );
  const centerNames = grouped.map((group) => group.center_name).filter(Boolean);

  return {
    eyebrow: "Hồ sơ giáo viên",
    title: "Thông tin giảng viên",
    name,
    role: "Giảng viên Tiếng Anh",
    avatar: getInitials(name, user.email),
    mainFields: [
      ["Mã giáo viên", getValue(teacher?.teacher_code)],
      ["Vị trí", "Giảng viên"],
      ["Trạng thái", teacherStatusLabels[teacher?.employment_status] || teacher?.employment_status],
      ["Loại hợp đồng", employmentTypeLabels[teacher?.employment_type] || teacher?.employment_type],
      ["Lương cơ bản", formatCurrency(teacher?.base_salary)],
      ["Trung tâm", centerNames.join(", ") || "Chưa gán trung tâm"],
      ["Lớp phụ trách", classroomNames.join(", ") || "Chưa gán lớp"],
      ["Ngày vào làm", formatDate(teacher?.join_date)],
      ["Ngày sinh", formatDate(teacher?.date_of_birth)],
      ["Giới tính", formatGender(teacher?.gender)],
      ["Tuổi", getAge(teacher?.date_of_birth)],
    ],
    contactFields: [
      ["Thư điện tử", getValue(user.email || user.username)],
      ["Số điện thoại", getValue(teacher?.phone_number)],
      ["Địa chỉ", getValue(teacher?.address)],
      ["Chuyên môn", getValue(teacher?.specialization)],
      ["Bằng cấp/chứng chỉ", getValue(teacher?.qualifications)],
    ],
    cards: [
      {
        code: `GV-${teacher?.id || "DEMO"}`,
        title: classroomNames[0] || "Chưa có lớp phụ trách",
        created: centerNames[0] || "Chưa có trung tâm",
        level: "Đang hoạt động",
        stats: [
          ["Số lớp", classroomNames.length || 0],
          ["Số trung tâm", centerNames.length || 0],
          ["Email", getValue(user.email || user.username)],
          ["Liên hệ", getValue(teacher?.phone_number)],
        ],
        team: [getInitials(name, user.email)],
      },
    ],
  };
};

const buildStudentProfile = (student) => {
  const user = student?.user || {};
  const name = getFullName(user);
  const classroomName = student?.classroom?.name || "Chưa phân lớp";
  const centerName = student?.center?.name || "Chưa gán trung tâm";

  return {
    eyebrow: "Hồ sơ học viên",
    title: "Thông tin học viên",
    name,
    role: "Học viên",
    avatar: getInitials(name, user.email),
    mainFields: [
      ["Mã học viên", getValue(student?.student_code)],
      ["Trạng thái", "Đang theo học"],
      [
        "Tình trạng học vụ",
        studentStatusLabels[student?.current_status] || student?.current_status,
      ],
      ["Trung tâm", centerName],
      ["Lớp học", classroomName],
      ["Ngày nhập học", formatDate(student?.admission_date)],
      ["Ngày sinh", formatDate(student?.date_of_birth)],
      ["Giới tính", formatGender(student?.gender)],
      ["Tuổi", getAge(student?.date_of_birth)],
    ],
    contactFields: [
      ["Thư điện tử", getValue(user.email || user.username)],
      ["Số điện thoại", getValue(student?.phone_number)],
      ["Địa chỉ", getValue(student?.address)],
      ["Phụ huynh", getValue(student?.parent_name)],
      ["SĐT phụ huynh", getValue(student?.parent_phone)],
      ["Email phụ huynh", getValue(student?.parent_email)],
      ["Ghi chú học vụ", getValue(student?.learning_note)],
    ],
    cards: [
      {
        code: `HV-${student?.id || "DEMO"}`,
        title: classroomName,
        created: centerName,
        level: "Học viên",
        stats: [
          ["Lớp học", classroomName],
          ["Trung tâm", centerName],
          ["Phụ huynh", getValue(student?.parent_name)],
          ["Liên hệ PH", getValue(student?.parent_phone)],
        ],
        team: [getInitials(name, user.email)],
      },
    ],
  };
};

const fallbackProfile = {
  eyebrow: "Hồ sơ nhân sự",
  title: "Thông tin chi tiết",
  name: "Allen Perkins",
  role: "Giảng viên Tiếng Anh",
  avatar: "AP",
  mainFields: [
    ["Vị trí", "Giảng viên Tiếng Anh"],
    ["Cơ sở / Công ty", "Vista Academy Sóc Sơn"],
    ["Địa chỉ hiện tại", "Sóc Sơn, Hà Nội, VN"],
    ["Ngày sinh", "May 19, 1996"],
  ],
  contactFields: [
    ["Thư điện tử", "evanyates@gmail.com"],
    ["Số điện thoại", "+84 342 343 626"],
    ["Mạng xã hội", "Evan 2254"],
  ],
  cards: [
    {
      code: "PN0001265",
      title: "Khóa học IELTS Nền tảng",
      created: "Đã tạo vào Sep 12, 2020",
      level: "Trung cấp",
      stats: [
        ["Số buổi học", 34],
        ["Số buổi đã học", 13],
        ["Trạng thái học phí", "1 TR/20,03 TR"],
      ],
      team: ["EY", "JK", "TT"],
    },
  ],
};

function EmployeeProfile() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isAdmin = ["superadmin", "admin"].includes(role);
  const { studentId, teacherId } = useParams();
  const [loadedTeacher, setLoadedTeacher] = useState(null);
  const [loadedStudent, setLoadedStudent] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const teacher = location.state?.teacher || loadedTeacher;
  const student = location.state?.student || loadedStudent;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const [payrollYear, setPayrollYear] = useState(currentYear);
  const [payrollMonth, setPayrollMonth] = useState(currentMonth);
  const [payrollPreview, setPayrollPreview] = useState(null);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollError, setPayrollError] = useState("");
  const [zaloLinkId, setZaloLinkId] = useState(null);
  const [zaloUid, setZaloUid] = useState("");
  const [zaloLoading, setZaloLoading] = useState(false);
  const [zaloSaving, setZaloSaving] = useState(false);
  const [zaloNotice, setZaloNotice] = useState("");
  const [zaloError, setZaloError] = useState("");
  const [assessments, setAssessments] = useState([]);
  const [scoreStudents, setScoreStudents] = useState([]);
  const [teacherScores, setTeacherScores] = useState([]);
  const [studentScores, setStudentScores] = useState([]);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreError, setScoreError] = useState("");
  const [scoreNotice, setScoreNotice] = useState("");
  const [scoreSaving, setScoreSaving] = useState(false);
  const [scoreReloadKey, setScoreReloadKey] = useState(0);
  const [payrollTablePage, setPayrollTablePage] = useState(1);
  const [teacherScorePage, setTeacherScorePage] = useState(1);
  const [studentScorePage, setStudentScorePage] = useState(1);
  const [scoreForm, setScoreForm] = useState({
    assessment: "",
    student: "",
    numeric_score: "",
    grade_label: "",
    status: "published",
    teacher_comment: "",
    skill_evaluation: "",
    final_project_note: "",
  });
  const profile = student
    ? buildStudentProfile(student)
    : teacher
    ? buildTeacherProfile(teacher)
    : fallbackProfile;

  useEffect(() => {
    if ((!studentId || location.state?.student) && (!teacherId || location.state?.teacher)) {
      return;
    }

    let cancelled = false;
    const fetchProfile = async () => {
      setProfileLoading(true);
      setProfileError("");
      try {
        if (studentId && !location.state?.student) {
          const response = await apiClient.get(`/students/students/${studentId}/`);
          if (!cancelled) {
            setLoadedStudent(response.data);
            setLoadedTeacher(null);
          }
        } else if (teacherId && !location.state?.teacher) {
          const response = await apiClient.get(`/teachers/teachers/${teacherId}/`);
          if (!cancelled) {
            setLoadedTeacher(response.data);
            setLoadedStudent(null);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setProfileError(
            error?.response?.data?.detail ||
              "Không tải được hồ sơ chi tiết.",
          );
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    };

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [location.state?.student, location.state?.teacher, studentId, teacherId]);

  const payrollYearOptions = useMemo(
    () => Array.from({ length: 5 }, (_, index) => currentYear - 2 + index),
    [currentYear],
  );

  const payrollRows = useMemo(() => {
    return (payrollPreview?.classrooms || []).map((item) => {
      const sessionCount =
        Number(item.sessions_for_calculation) ||
        Number(item.approved_sessions_count) ||
        0;
      const teachingSalary = Number(item.teaching_salary) || 0;
      const salaryPerSession = sessionCount ? teachingSalary / sessionCount : 0;
      const payableStudentAttendanceCount =
        Number(item.payable_student_attendance_count) || 0;
      return {
        ...item,
        sessionCount,
        salaryPerSession,
        payableStudentAttendanceCount,
      };
    });
  }, [payrollPreview]);

  const teacherClassrooms = useMemo(() => {
    if (!teacher) return [];
    return (teacher.centers_classrooms_grouped || []).flatMap((group) =>
      (group.classrooms || []).map((classroom) => ({
        ...classroom,
        center_name: group.center_name,
      })),
    );
  }, [teacher]);

  const teacherClassroomIds = useMemo(
    () => teacherClassrooms.map((classroom) => classroom.id).filter(Boolean),
    [teacherClassrooms],
  );

  const filteredAssessments = useMemo(() => {
    if (!teacherClassroomIds.length) return assessments;
    const allowedIds = new Set(teacherClassroomIds.map(String));
    return assessments.filter((item) => allowedIds.has(String(item.classroom)));
  }, [assessments, teacherClassroomIds]);

  const filteredTeacherScores = useMemo(() => {
    if (!teacherClassroomIds.length) return teacherScores;
    const allowedIds = new Set(teacherClassroomIds.map(String));
    return teacherScores.filter((item) => allowedIds.has(String(item.classroom)));
  }, [teacherClassroomIds, teacherScores]);

  const paginatedPayrollRows = useMemo(
    () => paginateRows(payrollRows, payrollTablePage),
    [payrollRows, payrollTablePage],
  );

  const paginatedTeacherScores = useMemo(
    () => paginateRows(filteredTeacherScores, teacherScorePage),
    [filteredTeacherScores, teacherScorePage],
  );

  const paginatedStudentScores = useMemo(
    () => paginateRows(studentScores, studentScorePage),
    [studentScorePage, studentScores],
  );

  const selectedAssessment = useMemo(
    () =>
      filteredAssessments.find(
        (item) => String(item.id) === String(scoreForm.assessment),
      ),
    [filteredAssessments, scoreForm.assessment],
  );

  const scoreStudentOptions = useMemo(() => {
    if (!selectedAssessment?.classroom) return scoreStudents;
    const classroomId = String(selectedAssessment.classroom);
    return scoreStudents.filter(
      (item) => String(item.classroom?.id || item.classroom) === classroomId,
    );
  }, [scoreStudents, selectedAssessment]);

  useEffect(() => {
    setPayrollTablePage(1);
  }, [payrollMonth, payrollRows.length, payrollYear]);

  useEffect(() => {
    setTeacherScorePage(1);
  }, [filteredTeacherScores.length, teacher?.id]);

  useEffect(() => {
    setStudentScorePage(1);
  }, [student?.id, studentScores.length]);

  useEffect(() => {
    if (!teacher?.id) {
      setPayrollPreview(null);
      setPayrollError("");
      setPayrollLoading(false);
      return;
    }

    let cancelled = false;
    const fetchPayrollPreview = async () => {
      setPayrollLoading(true);
      setPayrollError("");
      try {
        const response = await apiClient.get(
          `/attendance/payroll-configs/preview/${teacher.id}/`,
          {
            params: {
              year: payrollYear,
              month: payrollMonth,
            },
          },
        );
        if (!cancelled) {
          setPayrollPreview(response.data);
        }
      } catch (error) {
        if (!cancelled) {
          setPayrollPreview(null);
          setPayrollError(
            error?.response?.data?.detail ||
              "Không tải được dữ liệu tính lương của giáo viên.",
          );
        }
      } finally {
        if (!cancelled) {
          setPayrollLoading(false);
        }
      }
    };

    fetchPayrollPreview();
    return () => {
      cancelled = true;
    };
  }, [payrollMonth, payrollYear, teacher?.id]);

  useEffect(() => {
    if (!isAdmin || !teacher?.user?.id) {
      setZaloLinkId(null);
      setZaloUid("");
      return;
    }
    let cancelled = false;
    setZaloLoading(true);
    setZaloError("");
    listZaloLinks({ user: teacher.user.id })
      .then((data) => {
        if (cancelled) return;
        const existing = data.results?.[0];
        setZaloLinkId(existing?.id || null);
        setZaloUid(existing?.zalo_uid || "");
      })
      .catch(() => {
        if (!cancelled) setZaloError("Không tải được thông tin liên kết Zalo.");
      })
      .finally(() => {
        if (!cancelled) setZaloLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, teacher?.user?.id]);

  const handleSaveZaloLink = async (event) => {
    event.preventDefault();
    if (!teacher?.user?.id) return;
    setZaloSaving(true);
    setZaloNotice("");
    setZaloError("");
    try {
      if (zaloLinkId) {
        await updateZaloLink(zaloLinkId, { zalo_uid: zaloUid.trim() });
      } else {
        const created = await createZaloLink({
          user: teacher.user.id,
          zalo_uid: zaloUid.trim(),
        });
        setZaloLinkId(created.id);
      }
      setZaloNotice("Đã lưu liên kết Zalo.");
    } catch (error) {
      setZaloError(
        error?.response?.data?.detail || "Không thể lưu liên kết Zalo. Vui lòng thử lại.",
      );
    } finally {
      setZaloSaving(false);
    }
  };

  useEffect(() => {
    if (!teacher?.id) {
      setAssessments([]);
      setScoreStudents([]);
      setTeacherScores([]);
      setScoreForm((prev) => ({
        ...prev,
        assessment: "",
        student: "",
      }));
      return;
    }

    let cancelled = false;
    const fetchTeacherScoreData = async () => {
      setScoreLoading(true);
      setScoreError("");
      try {
        const studentRequests = teacherClassroomIds.map((classroomId) =>
          apiClient.get("/students/students/", {
            params: {
              classroom: classroomId,
              page_size: 100,
            },
          }),
        );
        const [assessmentResult, scoreResult, ...studentResults] =
          await Promise.allSettled([
            apiClient.get("/assessments/", {
              params: {
                page_size: 100,
              },
            }),
            apiClient.get("/student-scores/", {
              params: {
                page_size: 100,
              },
            }),
            ...studentRequests,
          ]);

        if (cancelled) return;

        const nextAssessments =
          assessmentResult.status === "fulfilled"
            ? normalizeCollection(assessmentResult.value.data)
            : [];
        const nextScores =
          scoreResult.status === "fulfilled"
            ? normalizeCollection(scoreResult.value.data)
            : [];
        const nextStudents = studentResults.flatMap((result) =>
          result.status === "fulfilled"
            ? normalizeCollection(result.value.data)
            : [],
        );
        const uniqueStudents = Array.from(
          new Map(nextStudents.map((item) => [item.id, item])).values(),
        );

        setAssessments(nextAssessments);
        setTeacherScores(nextScores);
        setScoreStudents(uniqueStudents);
        setScoreForm((prev) => ({
          ...prev,
          assessment: prev.assessment || nextAssessments[0]?.id || "",
          student: prev.student || uniqueStudents[0]?.id || "",
        }));

        if (
          assessmentResult.status === "rejected" ||
          scoreResult.status === "rejected" ||
          studentResults.some((result) => result.status === "rejected")
        ) {
          setScoreError("Một phần dữ liệu điểm chưa tải được.");
        }
      } catch (error) {
        if (!cancelled) {
          setAssessments([]);
          setTeacherScores([]);
          setScoreStudents([]);
          setScoreError("Không tải được dữ liệu nhập điểm.");
        }
      } finally {
        if (!cancelled) {
          setScoreLoading(false);
        }
      }
    };

    fetchTeacherScoreData();
    return () => {
      cancelled = true;
    };
  }, [scoreReloadKey, teacher?.id, teacherClassroomIds]);

  useEffect(() => {
    if (!student?.id) {
      setStudentScores([]);
      return;
    }

    let cancelled = false;
    const fetchStudentScores = async () => {
      setScoreLoading(true);
      setScoreError("");
      try {
        const response = await apiClient.get("/student-scores/", {
          params: {
            student: student.id,
            page_size: 100,
          },
        });
        if (!cancelled) {
          setStudentScores(normalizeCollection(response.data));
        }
      } catch (error) {
        if (!cancelled) {
          setStudentScores([]);
          setScoreError("Không tải được thông tin điểm của học viên.");
        }
      } finally {
        if (!cancelled) {
          setScoreLoading(false);
        }
      }
    };

    fetchStudentScores();
    return () => {
      cancelled = true;
    };
  }, [student?.id, scoreReloadKey]);

  useEffect(() => {
    if (!teacher?.id) return;

    setScoreForm((prev) => {
      const nextAssessment = prev.assessment || filteredAssessments[0]?.id || "";
      const allowedStudents = scoreStudentOptions.length
        ? scoreStudentOptions
        : scoreStudents;
      const hasSelectedStudent = allowedStudents.some(
        (item) => String(item.id) === String(prev.student),
      );
      const nextStudent = hasSelectedStudent
        ? prev.student
        : allowedStudents[0]?.id || "";

      if (
        String(prev.assessment) === String(nextAssessment) &&
        String(prev.student) === String(nextStudent)
      ) {
        return prev;
      }

      return {
        ...prev,
        assessment: nextAssessment,
        student: nextStudent,
      };
    });
  }, [filteredAssessments, scoreStudentOptions, scoreStudents, teacher?.id]);

  useEffect(() => {
    if (!teacher?.id || !scoreForm.assessment || !scoreForm.student) return;

    const existingScore = teacherScores.find(
      (item) =>
        String(item.assessment) === String(scoreForm.assessment) &&
        String(item.student) === String(scoreForm.student),
    );
    const nextValues = existingScore
      ? {
          numeric_score: getValue(existingScore.numeric_score, ""),
          grade_label: getValue(existingScore.grade_label, ""),
          status: existingScore.status || "published",
          teacher_comment: getValue(existingScore.teacher_comment, ""),
          skill_evaluation: getValue(existingScore.skill_evaluation, ""),
          final_project_note: getValue(existingScore.final_project_note, ""),
        }
      : {
          numeric_score: "",
          grade_label: "",
          status: "published",
          teacher_comment: "",
          skill_evaluation: "",
          final_project_note: "",
        };

    setScoreForm((prev) => {
      const hasChanged = Object.entries(nextValues).some(
        ([key, value]) => String(prev[key] ?? "") !== String(value ?? ""),
      );
      return hasChanged ? { ...prev, ...nextValues } : prev;
    });
  }, [scoreForm.assessment, scoreForm.student, teacher?.id, teacherScores]);

  const handleScoreFormChange = (field, value) => {
    setScoreNotice("");
    setScoreError("");
    setScoreForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "assessment"
        ? (() => {
            const assessment = filteredAssessments.find(
              (item) => String(item.id) === String(value),
            );
            const classroomId = assessment?.classroom
              ? String(assessment.classroom)
              : "";
            const allowedStudents = classroomId
              ? scoreStudents.filter(
                  (item) =>
                    String(item.classroom?.id || item.classroom) === classroomId,
                )
              : scoreStudents;
            const hasCurrentStudent = allowedStudents.some(
              (item) => String(item.id) === String(prev.student),
            );
            return {
              student: hasCurrentStudent
                ? prev.student
                : allowedStudents[0]?.id || "",
            };
          })()
        : {}),
    }));
  };

  const handleSaveScore = async (event) => {
    event.preventDefault();
    setScoreNotice("");
    setScoreError("");

    if (!scoreForm.assessment || !scoreForm.student) {
      setScoreError("Vui lòng chọn đầu điểm và học viên.");
      return;
    }

    const numericScore =
      scoreForm.numeric_score === "" ? null : Number(scoreForm.numeric_score);
    if (
      numericScore !== null &&
      (Number.isNaN(numericScore) || numericScore < 0)
    ) {
      setScoreError("Điểm số không hợp lệ.");
      return;
    }

    const payload = {
      assessment: Number(scoreForm.assessment),
      student: Number(scoreForm.student),
      numeric_score: numericScore,
      grade_label: scoreForm.grade_label.trim(),
      teacher_comment: scoreForm.teacher_comment.trim(),
      skill_evaluation: scoreForm.skill_evaluation.trim(),
      final_project_note: scoreForm.final_project_note.trim(),
      status: scoreForm.status,
      published_date:
        scoreForm.status === "published" || scoreForm.status === "locked"
          ? new Date().toISOString().slice(0, 10)
          : null,
      entered_by_teacher: teacher?.id,
    };

    const existingScore = filteredTeacherScores.find(
      (item) =>
        String(item.assessment) === String(scoreForm.assessment) &&
        String(item.student) === String(scoreForm.student),
    );

    setScoreSaving(true);
    try {
      if (existingScore) {
        await apiClient.patch(`/student-scores/${existingScore.id}/`, payload);
      } else {
        await apiClient.post("/student-scores/", payload);
      }
      setScoreNotice(existingScore ? "Đã cập nhật điểm." : "Đã nhập điểm.");
      setScoreReloadKey((prev) => prev + 1);
    } catch (error) {
      const apiError = error?.response?.data;
      setScoreError(
        apiError?.detail ||
          apiError?.non_field_errors?.[0] ||
          "Không lưu được điểm. Vui lòng kiểm tra lại dữ liệu.",
      );
    } finally {
      setScoreSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>{profile.eyebrow}</p>
          <h1>{profile.title}</h1>
        </div>
        <button
          type="button"
          className={styles.settingsButton}
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M15.5 5.5 9 12l6.5 6.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </header>

      {profileLoading && (
        <div className={styles.salaryState}>Đang tải hồ sơ chi tiết...</div>
      )}
      {profileError && (
        <div className={`${styles.salaryState} ${styles.salaryStateError}`}>
          {profileError}
        </div>
      )}

      <div className={styles.content}>
        <aside className={styles.profileCard}>
          <div className={styles.profileHeader}>
            <div className={styles.profileAvatar}>{profile.avatar}</div>
            <div>
              <h2>{profile.name}</h2>
              <span>{profile.role}</span>
            </div>
          </div>

          <div className={styles.profileSection}>
            <h3>Thông tin chính</h3>
            {profile.mainFields.map(([label, value]) => (
              <div key={label} className={styles.profileField}>
                <span>{label}</span>
                <strong>{getValue(value)}</strong>
              </div>
            ))}
          </div>

          <div className={styles.profileSection}>
            <h3>Thông tin liên hệ</h3>
            {profile.contactFields.map(([label, value]) => (
              <div key={label} className={styles.profileField}>
                <span>{label}</span>
                <strong>{getValue(value)}</strong>
              </div>
            ))}
          </div>
        </aside>

        <section className={styles.mainPanel}>
          <div className={styles.tabsRow}>
            <div className={styles.tabs}>
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`${styles.tab} ${
                    index === 0 ? styles["tab--active"] : ""
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.courseList}>
            {profile.cards.map((card) => (
              <article key={card.code} className={styles.courseCard}>
                <div className={styles.courseMain}>
                  <div className={styles.courseIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path
                        d="M4 6.75a1 1 0 0 1 .62-.92l6.75-2.7a1 1 0 0 1 .76 0l6.75 2.7a1 1 0 0 1 .62.92v10.5a1 1 0 0 1-1.38.92L12 15.56l-6.12 2.61A1 1 0 0 1 4 17.25z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  <div>
                    <span className={styles.courseCode}>{card.code}</span>
                    <h3>{card.title}</h3>
                    <p>{card.created}</p>
                  </div>
                  <span className={styles.courseLevel}>{card.level}</span>
                </div>

                <div className={styles.courseStats}>
                  {card.stats.map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{getValue(value)}</strong>
                    </div>
                  ))}
                  <div className={styles.courseOwners}>
                    <span>Người phụ trách</span>
                    <div>
                      {card.team.map((member) => (
                        <span key={`${card.code}-${member}`}>{member}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {teacher && (
            <section className={styles.salaryPanel}>
              <div className={styles.salaryHeader}>
                <div>
                  <h2>Chi tiết tính lương</h2>
                  <p>Lương theo điểm danh thực tế, ca trực và xếp loại tháng.</p>
                </div>
                <div className={styles.salaryFilters}>
                  <label>
                    <span>Năm</span>
                    <select
                      value={payrollYear}
                      onChange={(event) => setPayrollYear(Number(event.target.value))}
                    >
                      {payrollYearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Tháng</span>
                    <select
                      value={payrollMonth}
                      onChange={(event) => setPayrollMonth(Number(event.target.value))}
                    >
                      {monthOptions.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {payrollLoading && (
                <div className={styles.salaryState}>Đang tải dữ liệu lương...</div>
              )}

              {!payrollLoading && payrollError && (
                <div className={`${styles.salaryState} ${styles.salaryStateError}`}>
                  {payrollError}
                </div>
              )}

              {!payrollLoading && payrollPreview && (
                <>
                  <div className={styles.salaryMetrics}>
                    <div>
                      <span>Ngày công tính lương</span>
                      <strong>
                        {formatNumber(payrollPreview.attendance?.attendance_days)}
                        /{formatNumber(
                          payrollPreview.attendance?.base_salary_standard_days,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>Buổi đã duyệt</span>
                      <strong>
                        {formatNumber(
                          payrollPreview.teaching_summary?.approved_sessions_count,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>Lượt học viên đi học</span>
                      <strong>
                        {formatNumber(
                          payrollPreview.teaching_summary
                            ?.payable_student_attendance_count,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>Thực lĩnh</span>
                      <strong>
                        {formatCurrency(
                          payrollPreview.salary_components?.net_salary,
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className={styles.salaryBreakdown}>
                    <div>
                      <span>Lương cơ bản theo công</span>
                      <strong>
                        {formatCurrency(
                          payrollPreview.salary_components?.prorated_base_salary,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>Lương dạy</span>
                      <strong>
                        {formatCurrency(payrollPreview.salary_components?.teaching_salary)}
                      </strong>
                    </div>
                    <div>
                      <span>Lương trực</span>
                      <strong>
                        {formatCurrency(payrollPreview.salary_components?.duty_salary)}
                      </strong>
                    </div>
                    <div>
                      <span>Sale + phụ cấp</span>
                      <strong>
                        {formatCurrency(
                          (Number(payrollPreview.salary_components?.sale_bonus) || 0) +
                            (Number(payrollPreview.salary_components?.allowance) || 0),
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>BHXH nhân sự</span>
                      <strong>
                        {formatCurrency(
                          payrollPreview.salary_components?.insurance_deduction,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>Thưởng tháng</span>
                      <strong>
                        {formatCurrency(payrollPreview.salary_components?.monthly_bonus)}
                      </strong>
                    </div>
                  </div>

                  <div className={styles.salaryTableWrap}>
                    <table className={styles.salaryTable}>
                      <thead>
                        <tr>
                          <th>Lớp</th>
                          <th>Buổi đã duyệt</th>
                          <th>Lượt đi học</th>
                          <th>Mức chương trình</th>
                          <th>Căn cứ tính</th>
                          <th>Tỷ lệ GV</th>
                          <th>Lương/buổi</th>
                          <th>Lương lớp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payrollRows.length ? (
                          paginatedPayrollRows.map((row) => (
                            <tr key={row.classroom_id}>
                              <td>{row.classroom_name}</td>
                              <td>{formatNumber(row.sessionCount)}</td>
                              <td>
                                {formatNumber(row.payableStudentAttendanceCount)}
                                <small>Học viên thực tế</small>
                              </td>
                              <td>
                                {formatCurrency(row.salary_basis_per_student)}
                                <small>{row.salary_basis_label || "--"}</small>
                              </td>
                              <td>{formatCurrency(row.salary_basis_revenue)}</td>
                              <td>{formatPercent(row.teacher_revenue_share_percent)}</td>
                              <td>{formatCurrency(row.salaryPerSession)}</td>
                              <td>{formatCurrency(row.teaching_salary)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8}>Chưa có lớp nào đủ dữ liệu tính lương.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <TablePagination
                    page={payrollTablePage}
                    total={payrollRows.length}
                    onChange={setPayrollTablePage}
                  />
                </>
              )}
            </section>
          )}

          {teacher && isAdmin && (
            <section className={styles.scorePanel}>
              <div className={styles.salaryHeader}>
                <div>
                  <h2>Liên kết Zalo</h2>
                  <p>
                    Dán Zalo User ID (lấy từ danh sách người theo dõi trong Zalo OA admin) để hệ
                    thống gửi thông báo tự động cho giáo viên này.
                  </p>
                </div>
              </div>

              {zaloLoading && <div className={styles.salaryState}>Đang tải...</div>}
              {zaloError && (
                <div className={`${styles.salaryState} ${styles.salaryStateError}`}>{zaloError}</div>
              )}
              {zaloNotice && <div className={styles.salaryState}>{zaloNotice}</div>}

              <form
                onSubmit={handleSaveZaloLink}
                style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}
              >
                <label style={{ display: "grid", gap: 6, flex: "1 1 260px" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--ep-muted)", fontWeight: 600 }}>
                    Zalo User ID
                  </span>
                  <input
                    type="text"
                    value={zaloUid}
                    onChange={(event) => setZaloUid(event.target.value)}
                    placeholder="VD: 1234567890123456789"
                    style={{
                      border: "1px solid var(--ep-border)",
                      borderRadius: 10,
                      padding: "0.65rem 0.75rem",
                      font: "inherit",
                    }}
                  />
                </label>
                <button type="submit" className={styles.scoreButton} disabled={zaloSaving || !zaloUid.trim()}>
                  {zaloSaving ? "Đang lưu..." : "Lưu liên kết"}
                </button>
              </form>
            </section>
          )}

          {teacher && (
            <section className={styles.scorePanel}>
              <div className={styles.salaryHeader}>
                <div>
                  <h2>Nhập điểm học viên</h2>
                  <p>Nhập hoặc cập nhật điểm theo từng đầu điểm của lớp.</p>
                </div>
              </div>

              {scoreLoading && (
                <div className={styles.salaryState}>Đang tải dữ liệu điểm...</div>
              )}
              {scoreError && (
                <div className={`${styles.salaryState} ${styles.salaryStateError}`}>
                  {scoreError}
                </div>
              )}
              {scoreNotice && <div className={styles.salaryState}>{scoreNotice}</div>}

              <form className={styles.scoreForm} onSubmit={handleSaveScore}>
                <label>
                  <span>Đầu điểm</span>
                  <select
                    value={scoreForm.assessment}
                    onChange={(event) =>
                      handleScoreFormChange("assessment", event.target.value)
                    }
                  >
                    <option value="">Chọn đầu điểm</option>
                    {filteredAssessments.map((assessment) => (
                      <option key={assessment.id} value={assessment.id}>
                        {assessment.title} • {assessment.classroom_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Học viên</span>
                  <select
                    value={scoreForm.student}
                    onChange={(event) =>
                      handleScoreFormChange("student", event.target.value)
                    }
                  >
                    <option value="">Chọn học viên</option>
                    {scoreStudentOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {getFullName(item.user)} • {item.classroom?.name || "Chưa phân lớp"}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Điểm số</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={scoreForm.numeric_score}
                    onChange={(event) =>
                      handleScoreFormChange("numeric_score", event.target.value)
                    }
                  />
                </label>

                <label>
                  <span>Xếp loại</span>
                  <input
                    type="text"
                    value={scoreForm.grade_label}
                    onChange={(event) =>
                      handleScoreFormChange("grade_label", event.target.value)
                    }
                    placeholder="A, B+, Đạt..."
                  />
                </label>

                <label>
                  <span>Trạng thái</span>
                  <select
                    value={scoreForm.status}
                    onChange={(event) =>
                      handleScoreFormChange("status", event.target.value)
                    }
                  >
                    {Object.entries(scoreStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.scoreFormWide}>
                  <span>Nhận xét giáo viên</span>
                  <textarea
                    rows={3}
                    value={scoreForm.teacher_comment}
                    onChange={(event) =>
                      handleScoreFormChange("teacher_comment", event.target.value)
                    }
                  />
                </label>

                <label className={styles.scoreFormWide}>
                  <span>Đánh giá kỹ năng</span>
                  <textarea
                    rows={3}
                    value={scoreForm.skill_evaluation}
                    onChange={(event) =>
                      handleScoreFormChange("skill_evaluation", event.target.value)
                    }
                  />
                </label>

                <label className={styles.scoreFormWide}>
                  <span>Ghi chú dự án/bài cuối</span>
                  <textarea
                    rows={3}
                    value={scoreForm.final_project_note}
                    onChange={(event) =>
                      handleScoreFormChange("final_project_note", event.target.value)
                    }
                  />
                </label>

                <div className={styles.scoreActions}>
                  <button
                    type="submit"
                    className={styles.scoreButton}
                    disabled={
                      scoreSaving ||
                      !filteredAssessments.length ||
                      !scoreStudentOptions.length
                    }
                  >
                    {scoreSaving ? "Đang lưu..." : "Lưu điểm"}
                  </button>
                </div>
              </form>

              <div className={styles.salaryTableWrap}>
                <table className={styles.salaryTable}>
                  <thead>
                    <tr>
                      <th>Học viên</th>
                      <th>Lớp</th>
                      <th>Đầu điểm</th>
                      <th>Điểm</th>
                      <th>Xếp loại</th>
                      <th>Trạng thái</th>
                      <th>Nhận xét</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeacherScores.length ? (
                      paginatedTeacherScores.map((score) => (
                        <tr key={score.id}>
                          <td>{score.student_name}</td>
                          <td>{score.classroom_name}</td>
                          <td>{score.assessment_title}</td>
                          <td>
                            {getValue(score.numeric_score)}
                            <small>
                              Max: {getValue(score.assessment_max_score)}
                            </small>
                          </td>
                          <td>{getValue(score.grade_label)}</td>
                          <td>{scoreStatusLabels[score.status] || score.status}</td>
                          <td>{getValue(score.teacher_comment)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7}>Chưa có điểm nào cho các lớp này.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={teacherScorePage}
                total={filteredTeacherScores.length}
                onChange={setTeacherScorePage}
              />
            </section>
          )}

          {student && (
            <section className={styles.scorePanel}>
              <div className={styles.salaryHeader}>
                <div>
                  <h2>Thông tin điểm</h2>
                  <p>Điểm đã công bố theo từng đầu điểm của học viên.</p>
                </div>
              </div>

              {scoreLoading && (
                <div className={styles.salaryState}>Đang tải thông tin điểm...</div>
              )}
              {scoreError && (
                <div className={`${styles.salaryState} ${styles.salaryStateError}`}>
                  {scoreError}
                </div>
              )}

              <div className={styles.salaryTableWrap}>
                <table className={styles.salaryTable}>
                  <thead>
                    <tr>
                      <th>Lớp</th>
                      <th>Đầu điểm</th>
                      <th>Ngày</th>
                      <th>Điểm</th>
                      <th>Xếp loại</th>
                      <th>Trạng thái</th>
                      <th>Nhận xét</th>
                      <th>Đánh giá kỹ năng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentScores.length ? (
                      paginatedStudentScores.map((score) => (
                        <tr key={score.id}>
                          <td>{score.classroom_name}</td>
                          <td>{score.assessment_title}</td>
                          <td>{formatDate(score.assessment_planned_date)}</td>
                          <td>
                            {getValue(score.numeric_score)}
                            <small>
                              Max: {getValue(score.assessment_max_score)}
                            </small>
                          </td>
                          <td>{getValue(score.grade_label)}</td>
                          <td>{scoreStatusLabels[score.status] || score.status}</td>
                          <td>{getValue(score.teacher_comment)}</td>
                          <td>{getValue(score.skill_evaluation)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8}>Chưa có điểm đã công bố.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={studentScorePage}
                total={studentScores.length}
                onChange={setStudentScorePage}
              />
            </section>
          )}
        </section>
      </div>
    </div>
  );
}

export default EmployeeProfile;
