import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { plannerCategories } from "../data/scheduleData";
import { useAuth } from "../auth/AuthProvider";
import {
  createSessionReport,
  createTeachingSession,
  importSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  listAssignableUsers,
  importTeachingSessions,
  bulkDeleteMonthSessions,
  bulkDeleteMonthSchedules,
  listCompetitionFrames,
  listApprovalQueue,
  listCentersAll,
  listClassFinancePreview,
  listClassroomsAll,
  listClassroomsByCenter,
  listMonthlyScorecards,
  listSchedules,
  listSessionEvidences,
  listSessionReports,
  getStaffRequestPendingSummary,
  listStaffRequests,
  createStaffRequest,
  reviewStaffRequest,
  listTeachers,
  listTeachingSessions,
  reviewTeachingSessionPlan,
  reviewMonthlyTeachingPlan,
  submitMonthlyTeachingPlan,
  submitSessionReport,
  updateSessionReport,
  updateTeachingSession,
  deleteTeachingSession,
} from "../services/calendarService";
import {
  competitionFrame,
  monthlyTeachingPlanSteps,
  scorecardFrameworks,
  teachingShiftChecklist,
} from "../data/academicWorkflowData";
import { CenterField, useAutoCenter } from "../utils/centerField";
import styles from "../styles/calendarDetail.module.css";
import "../styles/vista4.css";

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: `Tháng ${index + 1}`,
}));

const sessionStatusOptions = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "scheduled", label: "Đã lên lịch" },
  { value: "in_progress", label: "Đang diễn ra" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "rescheduled", label: "Đổi lịch" },
  { value: "no_show", label: "Vắng mặt" },
];

const sessionStatusUpdateOptions = sessionStatusOptions.filter(
  (item) => item.value,
);

const reportStatusOptions = {
  draft: "Nháp",
  submitted: "Đã gửi",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  revision_required: "Yêu cầu sửa",
};

const teachingPlanStatusOptions = {
  draft: "Nháp",
  submitted: "Chờ duyệt",
  approved: "Đã duyệt",
  revision_required: "Cần sửa",
  rejected: "Từ chối",
};

// Màu badge theo trạng thái duyệt lịch báo giảng (dùng class .badge trong vista4.css).
const teachingPlanStatusBadge = {
  draft: "gray",
  submitted: "orange",
  approved: "green",
  revision_required: "red",
  rejected: "red",
};

const objectiveStatusOptions = [
  { value: "achieved", label: "Đạt mục tiêu" },
  { value: "partial", label: "Đạt một phần" },
  { value: "not_achieved", label: "Chưa đạt" },
];

// Đơn nhân sự: loại đơn + phân nhóm duyệt.
const staffRequestTypeOptions = [
  { value: "leave", label: "Đơn xin nghỉ" },
  { value: "shift_change", label: "Đổi ca" },
  { value: "proposal", label: "Đề xuất - yêu cầu" },
];
const staffRequestTypeLabels = staffRequestTypeOptions.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});
const STAFF_REQUEST_GROUPS = {
  leave_shift: {
    label: "Đơn xin nghỉ / đổi ca",
    types: ["leave", "shift_change"],
    reviewer: "Quản lý đào tạo",
  },
  proposal: {
    label: "Đề xuất - yêu cầu",
    types: ["proposal"],
    reviewer: "Quản lý cơ sở",
  },
};

// Lấy thông báo lỗi từ response DRF: hỗ trợ cả {detail} lẫn dict lỗi theo field.
function extractApiError(error, fallback) {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const value = data[firstKey];
    const message = Array.isArray(value) ? value[0] : value;
    if (typeof message === "string") {
      return firstKey === "non_field_errors" ? message : `${firstKey}: ${message}`;
    }
  }
  return fallback;
}

const buildDefaultReportForm = () => ({
  objective_status: "achieved",
  attendance_summary: "",
  student_count: "",
  content_taught: "",
  session_evaluation: "",
  next_session_plan: "",
  homework_assigned: "",
  student_risk_summary: "",
  is_reported: false,
  reported_on_zalo: false,
});

const reviewDecisionLabels = {
  approve: "Duyệt",
  reject: "Từ chối",
  "request-revision": "Yêu cầu sửa",
};

const performanceLegend = {
  todo: { label: "Chưa bắt đầu", color: "#94a3b8" },
  in_progress: { label: "Đang xử lý", color: "#3f8cff" },
  done: { label: "Hoàn tất", color: "#3da172" },
  delay: { label: "Cần xử lý", color: "#f79009" },
  cancel: { label: "Hủy / Từ chối", color: "#667085" },
};

const performanceOrder = ["todo", "in_progress", "done", "delay", "cancel"];

const laneDefinitions = {
  student: {
    label: "Học sinh - Lớp học",
    color: "#3f8cff",
  },
  marketing: {
    label: "Truyền thông - Bán hàng",
    color: "#ff6b6b",
  },
  finance: {
    label: "Tài chính - Kế toán",
    color: "#2f9e44",
  },
  hr: {
    label: "Hành chính - Nhân sự",
    color: "#845ef7",
  },
};

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const MAX_VISIBLE_EVENTS = 5;

// Hàng thẻ "Công việc quản lý trong ngày". Thẻ báo giảng đứng đầu; các thẻ còn lại
// lọc lịch công tác (Schedule) theo category tương ứng.
// `label` là nhãn ngắn trên thẻ; `fullLabel` là tên đầy đủ đúng theo
// Schedule.CATEGORY_CHOICES của backend, dùng cho ô chọn loại lịch, tên sheet và
// cột "Loại lịch" trong file mẫu. Giữ hai nhãn ở CÙNG MỘT CHỖ để không xảy ra
// cảnh thẻ ghi "Tài chính", ô chọn ghi "Tài chính - Kế toán".
const WORK_CARDS = [
  { id: "teaching_plan", label: "Lịch báo giảng", fullLabel: "Lịch báo giảng", color: "#d9571f", source: "session" },
  { id: "student", label: "Học sinh - Lớp học", fullLabel: "Học sinh - Lớp học", color: "#3f8cff", source: "schedule" },
  { id: "marketing", label: "Truyền thông", fullLabel: "Truyền thông - Bán hàng", color: "#ff6b6b", source: "schedule" },
  { id: "finance", label: "Tài chính", fullLabel: "Tài chính - Kế toán", color: "#2f9e44", source: "schedule" },
  { id: "hr", label: "Hành chính - Nhân sự", fullLabel: "Hành chính - Nhân sự", color: "#845ef7", source: "schedule" },
];

// Tên sheet trong file mẫu. Excel cấm : \\ / ? * [ ] và giới hạn 31 ký tự, nên
// bỏ dấu tiếng Việt luôn cho chắc; backend khớp bằng từ khoá đã bỏ dấu.
const SHEET_NAMES = {
  teaching_plan: "Lich bao giang",
  student: "Hoc sinh - Lop hoc",
  marketing: "Truyen thong - Ban hang",
  finance: "Tai chinh - Ke toan",
  hr: "Hanh chinh - Nhan su",
};

// 4 loại lịch công tác (mọi loại trừ lịch báo giảng — loại đó dùng model và
// endpoint khác nên có sheet với bộ cột riêng).
const SCHEDULE_SHEET_TYPES = WORK_CARDS.filter((c) => c.source === "schedule").map((c) => c.id);

// Bộ cột của sheet lịch báo giảng — mô tả để sinh trang hướng dẫn. Danh sách này
// phải khớp đúng tên cột mà backend đang đọc, đừng đổi chữ.
const TEACHING_TEMPLATE_COLUMNS = [
  { header: "Trung tâm", required: true, meaning: "Tên trung tâm, phải khớp dữ liệu hệ thống", values: "Tên trung tâm có thật", example: "Vista Academy" },
  { header: "Lớp", required: true, meaning: "Mã lớp hoặc tên lớp", values: "Mã lớp có thật", example: "501" },
  { header: "Giáo viên", required: false, meaning: "Khi chính giáo viên nhập thì bỏ qua cột này, hệ thống tự gán tài khoản đang đăng nhập", values: "Mã / tên / email giáo viên", example: "Nguyễn Thị Lan" },
  { header: "Ngày dạy", required: true, meaning: "Ngày diễn ra ca dạy. Nhập file CHO PHÉP ngày đã qua", values: "dd/mm/yyyy", example: "05/09/2026" },
  { header: "Giờ bắt đầu", required: true, meaning: "Giờ vào ca", values: "hh:mm", example: "18:00" },
  { header: "Giờ kết thúc", required: true, meaning: "Giờ tan ca, phải sau giờ bắt đầu", values: "hh:mm", example: "19:30" },
  { header: "Hình thức", required: false, meaning: "Bỏ trống hoặc ghi sai đều được hiểu là online", values: "online / offline / hybrid", example: "online" },
  { header: "Chủ đề bài học", required: false, meaning: "Nội dung bài dạy", values: "Chữ tự do", example: "Unit 1: Greetings" },
  { header: "Ghi chú", required: false, meaning: "Ghi vào mục tiêu của ca dạy", values: "Chữ tự do", example: "" },
];

// Bộ cột dùng chung cho 4 sheet lịch công tác. Cố ý giống hệt nhau để người dùng
// copy dòng giữa các sheet được, và để backend chỉ cần một hàm đọc duy nhất.
const SCHEDULE_IMPORT_COLUMNS = [
  { header: "Ngày", required: true, meaning: "Ngày thực hiện đầu việc", values: "dd/mm/yyyy", example: "03/09/2026" },
  { header: "Hạng mục", required: false, meaning: "Nhóm việc con, ghép vào đầu tên việc", values: "Chữ tự do", example: "Lớp học" },
  { header: "Nội dung công việc", required: true, meaning: "Tên đầu việc hiển thị trên lịch", values: "Chữ tự do", example: "Kiểm tra sĩ số lớp 501" },
  { header: "Mô tả chi tiết", required: false, meaning: "Diễn giải thêm, xem khi bấm vào việc", values: "Chữ tự do", example: "Đối chiếu điểm danh với danh sách đăng ký" },
  { header: "Thời gian", required: false, meaning: "Nhãn giờ. Bỏ trống thì hệ thống tự ghi theo tháng", values: "Chữ tự do", example: "08:00 - 09:30" },
  { header: "Trạng thái", required: false, meaning: "Bỏ trống khi nhập lại để GIỮ trạng thái đã cập nhật trên hệ thống", values: "Chưa bắt đầu / Đang thực hiện / Hoàn thành / Chậm tiến độ / Đã hủy", example: "Đang thực hiện" },
  { header: "Người phụ trách", required: false, meaning: "Người được giao việc. Nên điền email cho chắc", values: "Email / tên tài khoản / họ tên", example: "" },
  { header: "Loại lịch", required: false, meaning: "Chỉ để đối chiếu. Phải khớp tên sheet, lệch nhau sẽ báo lỗi", values: "Đúng tên loại lịch của sheet", example: "" },
];

const AV_COLORS = ["#F26522", "#2E9E5B", "#3B82F6", "#8B5CF6", "#E0357B", "#0EA5A5", "#D9822B"];
const avatarUrl = (name, i = 0) => {
  const initials =
    String(name || "?")
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((w) => w[0] || "")
      .join("")
      .toUpperCase() || "?";
  const c = AV_COLORS[Math.abs(i) % AV_COLORS.length];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><rect width='40' height='40' rx='20' fill='${c}'/><text x='20' y='26' font-size='15' font-weight='700' fill='white' text-anchor='middle' font-family='Arial'>${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const scheduleStatusMeta = {
  todo: { label: "Chưa bắt đầu", color: "#94a3b8" },
  in_progress: { label: "Đang thực hiện", color: "#3f8cff" },
  done: { label: "Hoàn thành", color: "#2f9e44" },
  delay: { label: "Chậm tiến độ", color: "#f79009" },
  cancel: { label: "Đã hủy", color: "#667085" },
};

// Rút gọn tên giáo viên để thẻ lịch không bị phình vì email/username dài.
const shortTeacherName = (value) => {
  if (!value) return "GV";
  const text = String(value).trim();
  if (text.includes("@")) return text.split("@")[0];
  return text;
};

const pad2 = (value) => String(value).padStart(2, "0");

const formatCurrency = (value) =>
  `${new Intl.NumberFormat("vi-VN").format(Math.round(Number(value) || 0))} ₫`;

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

const formatShortDate = (value) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatMonthHeader = (month, year) => `Tháng ${pad2(month)}/${year}`;

const formatTimeRange = (startAt, endAt) => {
  if (!startAt && !endAt) return "";
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;
  if (
    (startAt && Number.isNaN(start?.getTime())) ||
    (endAt && Number.isNaN(end?.getTime()))
  ) {
    return [startAt, endAt].filter(Boolean).join(" - ");
  }
  const formatter = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return [start, end].filter(Boolean).map((item) => formatter.format(item)).join(" - ");
};

const formatStatusLabel = (options, value, fallback = "--") => {
  if (!value) return fallback;
  if (Array.isArray(options)) {
    return options.find((item) => item.value === value)?.label || value;
  }
  return options[value] || value;
};

const truncateText = (value, maxLength = 96) => {
  if (!value) return "";
  const text = String(value).trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
};

const NHAN_TRUONG_LOI = {
  title: "Nội dung công việc",
  description: "Mô tả chi tiết",
  category: "Loại lịch",
  event_date: "Ngày thực hiện",
  time_label: "Thời gian",
  status: "Trạng thái",
  assigned_to_id: "Người phụ trách",
  week_key: "Tuần",
};

// DRF trả lỗi kiểm tra dữ liệu theo TÊN TRƯỜNG ({"assigned_to_id": ["..."]}),
// không có khoá detail — chỉ đọc detail/message thì người dùng luôn thấy một
// thông báo chung chung và không biết ô nào sai.
const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (data?.detail) return data.detail;
  if (data?.message) return data.message;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const dong = Object.entries(data)
      .map(([khoa, gt]) => {
        const noiDung = [].concat(gt).filter((x) => typeof x === "string").join(" ");
        if (!noiDung) return "";
        return khoa === "non_field_errors"
          ? noiDung
          : `${NHAN_TRUONG_LOI[khoa] || khoa}: ${noiDung}`;
      })
      .filter(Boolean);
    if (dong.length) return dong.join("\n");
  }
  return fallback;
};

const toDateInputValue = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const getLastDayOfMonth = (year, month) => new Date(year, month, 0).getDate();

// Chỉ số tuần trong tháng, tính theo tuần bắt đầu THỨ HAI — đúng như lưới lịch vẽ.
//
// Bản cũ chia cứng theo ngày trong tháng (1–7 là tuần 1, 8–14 là tuần 2...) và tối
// đa chỉ trả 4. Cách chia đó không liên quan gì tới thứ trong tuần nên lệch hẳn so
// với lưới: tháng 8/2026 (mùng 1 rơi vào Thứ Bảy) có 6 tuần, và ngày 03/08 nằm ở
// tuần 2 trên lưới nhưng bản cũ trả về 1. Giá trị này được ghi xuống backend thành
// teaching_plan_week nên lệch là sai dữ liệu, không chỉ sai hiển thị.
const getWeekIndexFromDate = (year, month, day) => {
  const target = new Date(year, month - 1, day);
  const start = startOfWeekMonday(new Date(year, month - 1, 1));
  // Trừ theo UTC để đổi giờ mùa không làm lệch một ngày.
  const soNgay = Math.round(
    (Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()) -
      Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
      86400000,
  );
  return Math.floor(soNgay / 7) + 1;
};

const toDateInputValueFromParts = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const startOfWeekMonday = (date) => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = result.getDay(); // 0 = Chủ nhật ... 6 = Thứ 7
  const diff = weekday === 0 ? -6 : 1 - weekday;
  result.setDate(result.getDate() + diff);
  return result;
};

// Lưới lịch tháng: mỗi hàng là 1 tuần (T2 -> CN), phủ toàn bộ ngày trong tháng.
const buildMonthWeeks = (year, month) => {
  const lastDay = getLastDayOfMonth(year, month);
  const lastOfMonth = new Date(year, month - 1, lastDay);
  let cursor = startOfWeekMonday(new Date(year, month - 1, 1));
  const weeks = [];
  let weekIndex = 1;

  while (cursor <= lastOfMonth) {
    const days = Array.from({ length: 7 }, (_, index) => {
      const dayDate = new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        cursor.getDate() + index,
      );
      return {
        id: toDateInputValueFromParts(dayDate),
        day: dayDate.getDate(),
        weekdayLabel: WEEKDAY_LABELS[index],
        subtitle: `${pad2(dayDate.getDate())}/${pad2(dayDate.getMonth() + 1)}`,
        inMonth: dayDate.getMonth() === month - 1,
      };
    });
    // Kèm luôn khoảng ngày vào nhãn. Chỉ số tuần được tính theo tháng đang chọn,
    // nên khi lùi qua đầu tháng nhãn chạy 3 -> 2 -> 1 -> 4 và trông như bị nhảy;
    // thực ra tháng đã đổi, nhưng ô chọn tháng nằm tận góc trên nên không ai để ý.
    weeks.push({
      id: `grid-week-${weekIndex}`,
      label: `Tuần ${weekIndex}`,
      rangeLabel: `${days[0].subtitle} – ${days[6].subtitle}`,
      days,
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
    weekIndex += 1;
  }

  return weeks;
};

const mapSessionStatusToBoardStatus = (status) => {
  switch (status) {
    case "completed":
      return "done";
    case "in_progress":
      return "in_progress";
    case "cancelled":
      return "cancel";
    case "rescheduled":
    case "no_show":
      return "delay";
    case "scheduled":
    default:
      return "todo";
  }
};

const mapReportStatusToBoardStatus = (status) => {
  switch (status) {
    case "approved":
      return "done";
    case "submitted":
      return "in_progress";
    case "revision_required":
      return "delay";
    case "rejected":
      return "cancel";
    case "draft":
    default:
      return "todo";
  }
};

const toLocalDateString = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const text = String(value);
    return text.length >= 10 ? text.slice(0, 10) : "";
  }
  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(
    parsed.getDate(),
  )}`;
};

const isPastDateTime = (value) => {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() < Date.now();
};

const toIsoWithLocalOffset = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const timezoneOffset = -parsed.getTimezoneOffset();
  const sign = timezoneOffset >= 0 ? "+" : "-";
  const absOffset = Math.abs(timezoneOffset);
  const hours = pad2(Math.floor(absOffset / 60));
  const minutes = pad2(absOffset % 60);
  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(
    parsed.getDate(),
  )}T${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}:00${sign}${hours}:${minutes}`;
};

// ISO -> giá trị input datetime-local ("YYYY-MM-DDTHH:MM") theo giờ local.
const toDateTimeLocalValue = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(
    parsed.getDate(),
  )}T${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`;
};

// Cộng thêm phút vào giá trị input datetime-local ("YYYY-MM-DDTHH:MM").
const addMinutesToLocalInput = (value, minutes) => {
  if (!value || value.length < 16) return value;
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const dt = new Date(year, month - 1, day, hour, minute);
  dt.setMinutes(dt.getMinutes() + minutes);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(
    dt.getDate(),
  )}T${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
};

const getFinancePerSession = (financeItem) => {
  const divisor =
    Number(financeItem?.approved_sessions_count) ||
    Number(financeItem?.sessions_for_calculation) ||
    0;
  if (!divisor) {
    return {
      revenuePerSession: null,
      teacherCostPerSession: null,
    };
  }
  return {
    revenuePerSession: Number(financeItem.actual_revenue) / divisor,
    teacherCostPerSession: Number(financeItem.estimated_teacher_cost) / divisor,
  };
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

/** Bỏ dấu + hạ chữ thường, dùng để so tên sheet với backend (backend khớp y hệt). */
const boDau = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .trim()
    .toLowerCase();

const sortClassrooms = (items) =>
  [...safeArray(items)].sort((left, right) => {
    const leftLabel = left.class_code || left.name || "";
    const rightLabel = right.class_code || right.name || "";
    return leftLabel.localeCompare(rightLabel, "vi", {
      numeric: true,
      sensitivity: "base",
    });
  });

const appendJsonSheet = (XLSX, workbook, name, rows) => {
  const safeRows = rows.length ? rows : [{ "Không có dữ liệu": "" }];
  const worksheet = XLSX.utils.json_to_sheet(safeRows);
  const firstRow = safeRows[0] || {};
  worksheet["!cols"] = Object.keys(firstRow).map((key) => ({
    wch: Math.min(Math.max(String(key).length + 6, 14), 36),
  }));
  XLSX.utils.book_append_sheet(workbook, worksheet, name);
};

const countCompletedChecklistItems = (items) =>
  safeArray(items).filter((item) => {
    if (typeof item === "boolean") return item;
    if (typeof item === "string") return Boolean(item.trim());
    return Boolean(
      item?.completed ||
        item?.checked ||
        item?.value === true ||
      item?.status === "done",
    );
  }).length;

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

const readNumberParam = (params, key, fallback, min, max) => {
  const value = Number(params.get(key));
  if (!Number.isInteger(value)) return fallback;
  if (typeof min === "number" && value < min) return fallback;
  if (typeof max === "number" && value > max) return fallback;
  return value;
};

const readCategoryParam = (params) => {
  const value = params.get("category");
  return plannerCategories.some((category) => category.id === value) ? value : "";
};

const readWeekParam = (params, fallback) => {
  const weekValue = params.get("week");
  const weekMap = {
    week48: 1,
    week49: 2,
    week50: 3,
    week51: 4,
  };
  if (weekMap[weekValue]) return weekMap[weekValue];
  return readNumberParam(params, "week", fallback, 1, 5);
};

function CalendarItem({ item, onOpen }) {
  return (
    <button
      type="button"
      className={styles.calendarEvent}
      style={{ "--type-color": item.color }}
      onClick={() => onOpen(item)}
      title="Bấm để xem chi tiết"
    >
      <span className={styles.calendarEventTitle}>
        <span className={styles.calendarEventDot} style={{ "--dot-color": item.color }} />
        <span className={styles.calendarEventName}>{item.title}</span>
      </span>
      {item.time ? <span className={styles.calendarEventTime}>{item.time}</span> : null}
      {item.subtitle ? (
        <span className={styles.calendarEventTopic}>{item.subtitle}</span>
      ) : null}
    </button>
  );
}

function CalendarDayCell({ dayInfo, items, isLoading, onOpen }) {
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = items.length - MAX_VISIBLE_EVENTS;
  const visibleItems = expanded ? items : items.slice(0, MAX_VISIBLE_EVENTS);

  return (
    <div
      className={`${styles.calendarCell} ${dayInfo.inMonth ? "" : styles.calendarCellMuted}`}
    >
      <div className={styles.calendarCellHead}>
        <span>{dayInfo.weekdayLabel}</span>
        <strong>{pad2(dayInfo.day)}</strong>
      </div>
      <div className={styles.calendarCellBody}>
        {items.length === 0 ? (
          <span className={styles.calendarCellEmpty}>
            {isLoading ? "Đang tải..." : "—"}
          </span>
        ) : (
          <>
            {visibleItems.map((item) => (
              <CalendarItem key={item.id} item={item} onOpen={onOpen} />
            ))}
            {hiddenCount > 0 && (
              <button
                type="button"
                className={styles.calendarMore}
                onClick={() => setExpanded((prev) => !prev)}
              >
                {expanded ? "Thu gọn" : `+${hiddenCount} lịch khác`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const parseStartHour = (timeText) => {
  const match = /(\d{1,2}):(\d{2})/.exec(timeText || "");
  return match ? Number(match[1]) : null;
};

// Lưới lịch theo khung giờ (dùng cho chế độ xem Tuần) — giống bản 4.0.
function WeekTimeGrid({ days, itemsByDate, onOpen, isLoading }) {
  const hoursSet = new Set();
  days.forEach((d) => {
    (itemsByDate.get(d.id) || []).forEach((it) => {
      const h = parseStartHour(it.time);
      if (h != null) hoursSet.add(h);
    });
  });
  const hours = [...hoursSet].sort((a, b) => a - b);

  if (hours.length === 0) {
    return (
      <div className={styles.calendarCellEmpty} style={{ padding: "24px" }}>
        {isLoading ? "Đang tải..." : "Không có lịch trong tuần này."}
      </div>
    );
  }

  return (
    <div className={styles.timeGrid}>
      <div className={styles.timeGridRow}>
        <div className={styles.timeGridSlot}>Giờ</div>
        {days.map((d) => (
          <div key={d.id} className={styles.timeGridDayHead}>
            <span>{d.weekdayLabel}</span>
            <strong>{d.subtitle}</strong>
          </div>
        ))}
      </div>
      {hours.map((hour) => (
        <div key={hour} className={styles.timeGridRow}>
          <div className={styles.timeGridSlot}>{pad2(hour)}:00</div>
          {days.map((d) => {
            const cellItems = (itemsByDate.get(d.id) || []).filter(
              (it) => parseStartHour(it.time) === hour,
            );
            return (
              <div key={d.id} className={styles.timeGridCell}>
                {cellItems.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    className={styles.timeGridEvent}
                    style={{ "--type-color": it.color }}
                    onClick={() => onOpen(it)}
                    title="Bấm để xem chi tiết"
                  >
                    <strong>{it.title}</strong>
                    {it.time ? <span>{it.time}</span> : null}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function CalendarDetail() {
  const [searchParams] = useSearchParams();
  const now = new Date();
  const todayString = toDateInputValue(now);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentWeek = getWeekIndexFromDate(currentYear, currentMonth, now.getDate());
  const initialYear = readNumberParam(searchParams, "year", currentYear, 2000, 2100);
  const initialMonth = readNumberParam(searchParams, "month", currentMonth, 1, 12);
  const initialDate = searchParams.get("date") || todayString;
  const initialWeek = readWeekParam(searchParams, currentWeek);

  const { role, user } = useAuth();
  const currentUserId = user?.id;
  const isTeacherRole = role === "teacher";
  const canManageSessions = ["superadmin", "admin"].includes(role);
  // Phân quyền duyệt đơn nhân sự (mirror backend staff_requests._can_review).
  const isAdminRole = ["superadmin", "admin"].includes(role);
  const isCenterManagerRole = ["superadmin", "admin", "center_manager"].includes(role);
  const isTrainingManagerRole = ["superadmin", "admin", "training_manager"].includes(role);
  const canReviewStaffType = (requestType) => {
    if (isAdminRole) return true;
    if (["leave", "shift_change"].includes(requestType)) return isTrainingManagerRole;
    if (requestType === "proposal") return isCenterManagerRole;
    return false;
  };
  const canReviewLeaveShift = canReviewStaffType("leave") || canReviewStaffType("shift_change");
  const canReviewProposal = canReviewStaffType("proposal");
  const canCreateTeachingPlan = ["superadmin", "admin", "teacher", "staff"].includes(role);
  const canSelectTeacherForCreate = ["superadmin", "admin", "staff"].includes(role);
  const canSubmitTeachingPlan = ["teacher", "staff"].includes(role);
  const canViewFinance = ["superadmin", "admin"].includes(role);
  const canViewApprovals = ["superadmin", "admin"].includes(role);

  // Trung tâm + tháng/năm lấy từ header chung (Outlet context).
  const {
    centerId: selectedCenterId,
    setCenterId: setSelectedCenterId,
    month: selectedMonth,
    setMonth: setSelectedMonth,
    year: selectedYear,
    setYear: setSelectedYear,
    centers,
  } = useOutletContext();
  const [selectedWeek, setSelectedWeek] = useState(initialWeek);
  const [selectedDay, setSelectedDay] = useState(initialDate);
  const [selectedCategoryId, setSelectedCategoryId] = useState(() =>
    readCategoryParam(searchParams),
  );
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  const [selectedSessionStatus, setSelectedSessionStatus] = useState("");
  // Không còn ép cửa sổ 27-28: gửi duyệt lịch tháng được bất kỳ lúc nào, cho
  // bất kỳ kỳ nào (đồng bộ backend _validate_month_plan_submit_window).
  const isSubmitWindowOpen = true;
  // Nhắc hoàn tất/chốt lịch tháng trong khoảng ngày 28 -> 30 hằng tháng.
  const isMonthClosingWindow = [28, 29, 30].includes(now.getDate());
  const todayAtStart = useMemo(
    () => new Date(currentYear, currentMonth - 1, now.getDate()),
    [currentMonth, currentYear, now],
  );

  const [teachers, setTeachers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);

  const [sessions, setSessions] = useState([]);
  const [reports, setReports] = useState([]);
  const [evidences, setEvidences] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [classFinancePreview, setClassFinancePreview] = useState([]);
  const [competitionFrames, setCompetitionFrames] = useState([]);
  const [monthlyScorecards, setMonthlyScorecards] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState("");
  const [notice, setNotice] = useState("");
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [planActionLoading, setPlanActionLoading] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [detailSession, setDetailSession] = useState(null);
  // Trang Lịch mới: thẻ công việc + chế độ xem + lịch công tác.
  const [selectedCard, setSelectedCard] = useState("teaching_plan");
  // "week" = lưới giờ của một tuần, "month" = lưới cả tháng.
  // Trước đây state này được đặt "month" rồi KHÔNG BAO GIỜ đổi (setCalendarView
  // không được gọi ở đâu), nên màn chỉ có đúng một cách xem dù yêu cầu là xem
  // được cả tuần lẫn tháng. Mặc định "week" để giữ nguyên cách hiển thị cũ.
  const [calendarView, setCalendarView] = useState("week");
  // Mỗi cột ngày trong board tuần chỉ hiện tối đa MAX_VISIBLE_EVENTS buổi;
  // ngày nào được mở rộng thì hiện hết (tránh hiển thị quá nhiều lịch cùng lúc).
  const [expandedDays, setExpandedDays] = useState(() => new Set());
  const toggleDayExpand = (dayId) =>
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId);
      else next.add(dayId);
      return next;
    });
  const [focusDate, setFocusDate] = useState(() => toDateInputValueFromParts(new Date()));
  const [schedules, setSchedules] = useState([]);
  const [staffPending, setStaffPending] = useState({ leave_shift: 0, proposal: 0, total: 0 });
  // Tạo đơn nhân sự (nghỉ / đổi ca / đề xuất).
  const [isStaffCreateOpen, setIsStaffCreateOpen] = useState(false);
  const [staffCreateForm, setStaffCreateForm] = useState({
    request_type: "leave",
    title: "",
    reason: "",
    center: "",
    start_date: "",
    end_date: "",
    desired_shift: "",
  });
  const [staffCreateError, setStaffCreateError] = useState("");
  const [staffCreateLoading, setStaffCreateLoading] = useState(false);
  // Duyệt đơn nhân sự.
  const [staffReviewGroup, setStaffReviewGroup] = useState(null); // "leave_shift" | "proposal"
  const [staffReviewItems, setStaffReviewItems] = useState([]);
  const [staffReviewLoading, setStaffReviewLoading] = useState(false);
  const [staffReviewError, setStaffReviewError] = useState("");
  const [staffActionId, setStaffActionId] = useState(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  // Bản ghi gốc lúc mở Sửa — dùng để CHỈ gửi những trường thực sự đổi.
  const [editingScheduleRaw, setEditingScheduleRaw] = useState(null);
  const [deletingScheduleId, setDeletingScheduleId] = useState(null);
  const [scheduleActionError, setScheduleActionError] = useState("");
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  // Người có thể nhận lịch công tác. KHÔNG dùng lại danh sách `teachers`: nó chỉ
  // được tải cho superadmin/admin/staff nên các vai khác thấy ô chọn trống, và
  // lịch Tài chính / Nhân sự phải giao được cho kế toán, hành chính.
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [createError, setCreateError] = useState("");
  const [createClassrooms, setCreateClassrooms] = useState([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importMode, setImportMode] = useState("teaching");
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState(null);

  const [reportSessionId, setReportSessionId] = useState(null);
  const [reportForm, setReportForm] = useState(buildDefaultReportForm);
  const [reportSaving, setReportSaving] = useState(false);
  const [reportError, setReportError] = useState("");
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [approveAllLoading, setApproveAllLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSessions, setReviewSessions] = useState([]);
  const [reviewCenterId, setReviewCenterId] = useState("");
  const [reviewClassroomId, setReviewClassroomId] = useState("");
  const [reviewTeacherId, setReviewTeacherId] = useState("");
  const [reviewClassrooms, setReviewClassrooms] = useState([]);
  const [reviewActionSessionId, setReviewActionSessionId] = useState(null);
  const [openReviewActionId, setOpenReviewActionId] = useState(null);
  const [reviewReasonTarget, setReviewReasonTarget] = useState(null);
  const [reviewReasonText, setReviewReasonText] = useState("");
  const [reviewReasonError, setReviewReasonError] = useState("");
  // Thông báo thành công tự ẩn sau 6 giây. Thông báo LỖI thì không tự ẩn — người
  // dùng cần đọc kỹ và thường phải làm lại thao tác.
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Các hộp thoại của màn này viết tay từ trước, không cái nào đóng được bằng Esc
  // (bấm Esc xong hộp thoại vẫn nằm nguyên). Gom về một chỗ xử lý thay vì sửa
  // rải rác 7 hộp thoại trong file, và đóng theo thứ tự trong-ra-ngoài để hộp
  // mở sau cùng đóng trước.
  useEffect(() => {
    const closers = [
      [reviewReasonTarget, () => setReviewReasonTarget(null)],
      [reportSessionId, () => setReportSessionId(null)],
      [detailSession, () => { setDetailSession(null); setScheduleActionError(""); }],
      [isCreateOpen, () => { setIsCreateOpen(false); setEditingSessionId(null); setEditingScheduleId(null); setEditingScheduleRaw(null); }],
      [isImportOpen, () => setIsImportOpen(false)],
      [isStaffCreateOpen, () => setIsStaffCreateOpen(false)],
      [staffReviewGroup, () => setStaffReviewGroup(null)],
      [isReviewOpen, () => setIsReviewOpen(false)],
    ];
    const topMost = closers.find(([isOpen]) => Boolean(isOpen));
    if (!topMost) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") topMost[1]();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [reviewReasonTarget, reportSessionId, detailSession, isCreateOpen, isImportOpen, isStaffCreateOpen, staffReviewGroup, isReviewOpen]);

  // Loại lịch mỗi vai được phép tạo — PHẢI khớp luật ở backend
  // (schedules/permissions.py). Giáo viên chỉ nhập lịch trong phạm vi công việc
  // của mình; Tài chính - Kế toán và Hành chính - Nhân sự là việc phòng ban khác.
  useEffect(() => {
    let huy = false;
    listAssignableUsers()
      .then((data) => {
        if (!huy) setAssignableUsers(safeArray(data?.results));
      })
      .catch(() => {
        if (!huy) setAssignableUsers([]);
      });
    return () => {
      huy = true;
    };
  }, []);

  const calendarTypeOptions = useMemo(() => {
    const duocPhep = [];
    if (canCreateTeachingPlan) duocPhep.push("teaching_plan");
    if (role !== "student") {
      duocPhep.push(...(isTeacherRole ? ["student", "marketing"] : SCHEDULE_SHEET_TYPES));
    }
    return WORK_CARDS.filter((card) => duocPhep.includes(card.id));
  }, [canCreateTeachingPlan, isTeacherRole, role]);

  // Có được nhập lịch công tác không — cùng luật với ô chọn loại lịch.
  // Phải đặt SAU calendarTypeOptions: const trong thân component nằm trong vùng
  // chết tạm thời, đọc trước dòng khai báo là ReferenceError, trắng cả trang.
  const coQuyenLichCongTac = calendarTypeOptions.some((c) => c.source === "schedule");

  /* ---- Xoá toàn bộ lịch của tháng đang xem (chỉ admin) ----
     Hai bước bắt buộc: bước một chạy THỬ để đếm, hiện đúng con số người dùng
     sắp mất rồi mới hỏi; bước hai mới xoá thật. Xoá ca dạy kéo theo CASCADE ba
     bảng (báo cáo ca dạy, điểm danh học viên, bằng chứng điểm danh) nên không
     được xoá thẳng khi bấm một cái. */
  const [xoaThangDangHoi, setXoaThangDangHoi] = useState(null);
  const [xoaThangDangChay, setXoaThangDangChay] = useState(false);
  const [xoaThangLoi, setXoaThangLoi] = useState("");

  const goiXoaThang = useCallback(
    async (confirm) => {
      const payload = { month: selectedMonth, year: selectedYear, confirm };
      const [ca, ct] = await Promise.all([
        canCreateTeachingPlan || canManageSessions
          ? bulkDeleteMonthSessions(payload).catch(() => null)
          : null,
        coQuyenLichCongTac ? bulkDeleteMonthSchedules(payload).catch(() => null) : null,
      ]);
      return {
        sessions: ca?.sessions || 0,
        reports: ca?.reports || 0,
        attendances: ca?.attendances || 0,
        evidences: ca?.evidences || 0,
        schedules: ct?.schedules || 0,
        by_category: ct?.by_category || {},
      };
    },
    [selectedMonth, selectedYear, canCreateTeachingPlan, canManageSessions, coQuyenLichCongTac],
  );

  const moHopXoaThang = useCallback(async () => {
    setXoaThangLoi("");
    setXoaThangDangChay(true);
    try {
      setXoaThangDangHoi(await goiXoaThang(false));
    } catch (error) {
      setXoaThangLoi(
        error?.response?.data?.detail || "Không đếm được lịch của tháng. Vui lòng thử lại.",
      );
    } finally {
      setXoaThangDangChay(false);
    }
  }, [goiXoaThang]);

  const xacNhanXoaThang = useCallback(async () => {
    setXoaThangDangChay(true);
    setXoaThangLoi("");
    try {
      await goiXoaThang(true);
      setXoaThangDangHoi(null);
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      setXoaThangLoi(
        error?.response?.data?.detail || "Không xoá được lịch của tháng. Vui lòng thử lại.",
      );
    } finally {
      setXoaThangDangChay(false);
    }
  }, [goiXoaThang]);

  const [createForm, setCreateForm] = useState({
    center: "",
    classroom: "",
    teacher: "",
    start_at: `${todayString}T18:00`,
    end_at: `${todayString}T19:30`,
    delivery_mode: "online",
    meeting_link: "",
    lesson_topic: "",
    lesson_objective: "",
    teaching_plan_month: currentMonth,
    teaching_plan_year: currentYear,
    teaching_plan_week: currentWeek,
    status: "scheduled",
    // Loại lịch đang nhập. Quyết định form hiển thị nhóm trường nào.
    calendar_type: "teaching_plan",
    // Trường của lịch công tác — đặt tiền tố sc_ để KHÔNG đụng `status` của ca
    // dạy (hai miền giá trị khác nhau: scheduled/... với todo/in_progress/...).
    sc_date: todayString,
    sc_subcategory: "",
    sc_title: "",
    sc_description: "",
    sc_time_label: "",
    sc_status: "todo",
    sc_assignee: "",
  });

  // Hệ thống hiện chỉ vận hành 1 cơ sở: tự chọn cơ sở duy nhất cho các ô
  // "chọn trung tâm" ở modal (thay vì hiện dropdown).
  const setStaffCreateCenter = useCallback(
    (updater) =>
      setStaffCreateForm((prev) => {
        const next =
          typeof updater === "function" ? updater(prev.center) : updater;
        return next === prev.center ? prev : { ...prev, center: next };
      }),
    [],
  );
  useAutoCenter(centers, setReviewCenterId);
  useAutoCenter(centers, setStaffCreateCenter);

  const yearOptions = useMemo(() => {
    const startYear = currentYear - 2;
    return Array.from({ length: 6 }, (_, index) => startYear + index);
  }, [currentYear]);

  const monthWeeks = useMemo(
    () => buildMonthWeeks(selectedYear, selectedMonth),
    [selectedYear, selectedMonth],
  );

  // Đổi tháng ở ô chọn tháng phải kéo theo tuần đang xem. Trước đây focusDate chỉ
  // được đặt lúc khởi tạo và trong shiftWeek, nên đổi tháng xong focusDate vẫn nằm
  // ở tháng cũ: shiftWeek không tìm thấy tuần hiện tại (curIdx = -1) nên bộ chống
  // trùng tuần bị vô hiệu, bấm ‹ hiện lại ĐÚNG tuần đang xem dưới một nhãn khác
  // (VD Tuần 1 · 31/08–06/09 bấm ‹ ra Tuần 6 · 31/08–06/09).
  useEffect(() => {
    if (!monthWeeks.length) return;
    const dangKhop = monthWeeks.some((w) => w.days.some((d) => d.id === focusDate));
    if (dangKhop) return;
    const tuanDau = monthWeeks[0];
    const ngay = (tuanDau.days.find((d) => d.inMonth) || tuanDau.days[0]).id;
    setFocusDate(ngay);
  }, [monthWeeks, focusDate]);

  const activeRange = useMemo(() => {
    const firstWeek = monthWeeks[0];
    const lastWeek = monthWeeks[monthWeeks.length - 1];
    const start =
      firstWeek?.days[0]?.id || `${selectedYear}-${pad2(selectedMonth)}-01`;
    const end =
      lastWeek?.days[lastWeek.days.length - 1]?.id ||
      `${selectedYear}-${pad2(selectedMonth)}-${pad2(
        getLastDayOfMonth(selectedYear, selectedMonth),
      )}`;
    return {
      start,
      end,
      label: formatMonthHeader(selectedMonth, selectedYear),
    };
  }, [monthWeeks, selectedMonth, selectedYear]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!canCreateTeachingPlan) {
        setTeachers([]);
        return;
      }
      try {
        const [classroomResult, teacherResult] = await Promise.allSettled([
          listClassroomsAll(),
          canSelectTeacherForCreate
            ? listTeachers({ page_size: 200 })
            : Promise.resolve({ results: [] }),
        ]);

        if (cancelled) return;

        if (classroomResult.status === "fulfilled") {
          setCreateClassrooms(sortClassrooms(classroomResult.value));
        }
        if (teacherResult.status === "fulfilled") {
          setTeachers(safeArray(teacherResult.value.results));
        }
      } catch (error) {
        if (!cancelled) {
          setCreateClassrooms([]);
          setTeachers([]);
        }
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [canCreateTeachingPlan, canSelectTeacherForCreate, isTeacherRole]);

  useEffect(() => {
    let cancelled = false;

    const fetchClassrooms = async () => {
      if (!selectedCenterId || !canCreateTeachingPlan) {
        setClassrooms([]);
        return;
      }
      try {
        const data = await listClassroomsByCenter(selectedCenterId);
        if (!cancelled) {
          setClassrooms(data);
        }
      } catch (error) {
        if (!cancelled) {
          setClassrooms([]);
        }
      }
    };

    fetchClassrooms();
    return () => {
      cancelled = true;
    };
  }, [canCreateTeachingPlan, selectedCenterId]);

  useEffect(() => {
    if (!selectedClassroomId || !classrooms.length) return;
    const stillExists = classrooms.some(
      (item) => String(item.id) === String(selectedClassroomId),
    );
    if (!stillExists) {
      setSelectedClassroomId("");
    }
  }, [classrooms, selectedClassroomId]);

  useEffect(() => {
    if (!createForm.classroom || !createClassrooms.length) return;
    const stillExists = createClassrooms.some(
      (item) => String(item.id) === String(createForm.classroom),
    );
    if (!stillExists) {
      setCreateForm((prev) => ({ ...prev, classroom: "" }));
    }
  }, [createClassrooms, createForm.classroom]);

  useEffect(() => {
    let cancelled = false;

    const fetchCalendar = async () => {
      setIsLoading(true);
      setScheduleError("");

      const sessionParams = {
        page_size: 300,
        date_from: activeRange.start,
        date_to: activeRange.end,
      };
      if (selectedTeacherId) sessionParams.teacher = selectedTeacherId;
      if (selectedClassroomId) sessionParams.classroom = selectedClassroomId;
      if (selectedSessionStatus) sessionParams.status = selectedSessionStatus;
      if (selectedCenterId) sessionParams.center = selectedCenterId;

      try {
        const results = await Promise.allSettled([
          listTeachingSessions(sessionParams),
          listSessionReports({
            page_size: 300,
            ...(selectedTeacherId ? { teacher: selectedTeacherId } : {}),
          }),
          listSessionEvidences({ page_size: 300 }),
          canViewApprovals
            ? listApprovalQueue({ page_size: 300, entity_type: "session_report" })
            : Promise.resolve({ results: [] }),
          canViewFinance
            ? listClassFinancePreview({
                page_size: 300,
                year: selectedYear,
                month: selectedMonth,
                ...(selectedCenterId ? { center: selectedCenterId } : {}),
                ...(selectedClassroomId ? { classroom: selectedClassroomId } : {}),
              })
            : Promise.resolve({ results: [] }),
          listCompetitionFrames({
            page_size: 100,
            year: selectedYear,
            month: selectedMonth,
          }),
          listMonthlyScorecards({
            page_size: 300,
            year: selectedYear,
            month: selectedMonth,
            ...(selectedTeacherId ? { teacher: selectedTeacherId } : {}),
            ...(selectedClassroomId ? { classroom: selectedClassroomId } : {}),
          }),
        ]);

        if (cancelled) return;

        const sessionResult = results[0];
        if (sessionResult.status !== "fulfilled") {
          setSessions([]);
          setReports([]);
          setEvidences([]);
          setApprovals([]);
          setClassFinancePreview([]);
          setCompetitionFrames([]);
          setMonthlyScorecards([]);
          setScheduleError(
            getErrorMessage(
              sessionResult.reason,
              "Không thể tải lịch vận hành từ teaching sessions.",
            ),
          );
          return;
        }

        const sessionItems = safeArray(sessionResult.value.results);
        const sessionIds = new Set(sessionItems.map((item) => item.id));

        const reportItems =
          results[1].status === "fulfilled"
            ? safeArray(results[1].value.results).filter((item) =>
                sessionIds.has(item.session),
              )
            : [];

        const evidenceItems =
          results[2].status === "fulfilled"
            ? safeArray(results[2].value.results).filter((item) =>
                sessionIds.has(item.session),
              )
            : [];

        const approvalItems =
          results[3].status === "fulfilled"
            ? safeArray(results[3].value.results).filter((item) =>
                reportItems.some((report) => report.id === item.entity_id),
              )
            : [];

        const financeItems =
          results[4].status === "fulfilled"
            ? safeArray(results[4].value.results)
            : [];

        const competitionItems =
          results[5].status === "fulfilled"
            ? safeArray(results[5].value.results)
            : [];

        const scorecardItems =
          results[6].status === "fulfilled"
            ? safeArray(results[6].value.results)
            : [];

        setSessions(sessionItems);
        setReports(reportItems);
        setEvidences(evidenceItems);
        setApprovals(approvalItems);
        setClassFinancePreview(financeItems);
        setCompetitionFrames(competitionItems);
        setMonthlyScorecards(scorecardItems);

        const partialFailures = results.slice(1).some(
          (item) => item.status === "rejected",
        );
        if (partialFailures) {
          setScheduleError(
            "Một phần dữ liệu phụ trợ chưa tải được. Lịch ca dạy vẫn đang hiển thị.",
          );
        }
      } catch (error) {
        if (!cancelled) {
          setSessions([]);
          setReports([]);
          setEvidences([]);
          setApprovals([]);
          setClassFinancePreview([]);
          setCompetitionFrames([]);
          setMonthlyScorecards([]);
          setScheduleError("Không thể tải lịch vận hành. Vui lòng thử lại.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchCalendar();

    return () => {
      cancelled = true;
    };
  }, [
    activeRange.end,
    activeRange.start,
    canViewApprovals,
    canViewFinance,
    reloadKey,
    selectedCenterId,
    selectedClassroomId,
    selectedMonth,
    selectedSessionStatus,
    selectedTeacherId,
    selectedYear,
  ]);

  const reportBySessionId = useMemo(() => {
    const mapping = new Map();
    reports.forEach((item) => {
      mapping.set(item.session, item);
    });
    return mapping;
  }, [reports]);

  const evidenceCountBySessionId = useMemo(() => {
    const mapping = new Map();
    evidences.forEach((item) => {
      mapping.set(item.session, (mapping.get(item.session) || 0) + 1);
    });
    return mapping;
  }, [evidences]);

  const pendingApprovalReportIds = useMemo(() => {
    const ids = new Set();
    approvals.forEach((item) => {
      if (item.entity_type === "session_report") {
        ids.add(item.entity_id);
      }
    });
    return ids;
  }, [approvals]);

  const classFinanceByClassroomId = useMemo(() => {
    const mapping = new Map();
    classFinancePreview.forEach((item) => {
      mapping.set(item.classroom_id, item);
    });
    return mapping;
  }, [classFinancePreview]);

  const derivedEvents = useMemo(() => {
    const items = [];

    sessions.forEach((session) => {
      const eventStartIndex = items.length;
      const sessionDate = session.session_date || toLocalDateString(session.start_at);
      const report = reportBySessionId.get(session.id);
      const evidenceCount = evidenceCountBySessionId.get(session.id) || 0;
      const pendingApproval = report ? pendingApprovalReportIds.has(report.id) : false;
      const financeItem = classFinanceByClassroomId.get(session.classroom);
      const financePerSession = getFinancePerSession(financeItem);
      const sessionBoardStatus = mapSessionStatusToBoardStatus(session.status);
      const isPastSession = isPastDateTime(session.end_at || session.start_at);
      const planStatusLabel =
        teachingPlanStatusOptions[session.teaching_plan_status] ||
        session.teaching_plan_status ||
        "Nháp";

      items.push({
        id: `session-${session.id}`,
        sourceType: "session",
        sourceId: session.id,
        category: "student",
        date: sessionDate,
        boardStatus: sessionBoardStatus,
        rawStatus: session.status,
        editable: canManageSessions,
        title: `${session.classroom_name} • ${session.teacher_name}`,
        time: formatTimeRange(session.start_at, session.end_at),
        description:
          session.lesson_topic
            ? truncateText(session.lesson_topic, 72)
            : session.meeting_link || session.latest_recording_link
            ? truncateText(
                session.meeting_link || session.latest_recording_link,
                72,
              )
            : truncateText(
                `${session.delivery_mode === "online" ? "Online" : "Offline"} • ${session.center_name}`,
                72,
              ),
        meta: [
          `Trạng thái ca: ${
            sessionStatusOptions.find((item) => item.value === session.status)?.label ||
            session.status
          }`,
          `Lịch báo giảng: ${planStatusLabel}`,
          session.lesson_objective
            ? `Mục tiêu: ${truncateText(session.lesson_objective, 48)}`
            : `Tuần ${session.teaching_plan_week || getWeekIndexFromDate(
                Number(sessionDate?.slice(0, 4)) || currentYear,
                Number(sessionDate?.slice(5, 7)) || currentMonth,
                Number(sessionDate?.slice(8, 10)) || 1,
              )}`,
        ],
      });

      if (report) {
        const checklistTotal = safeArray(report.completion_checklist).length || teachingShiftChecklist.length;
        const checklistDone = countCompletedChecklistItems(report.completion_checklist);
        items.push({
          id: `report-${report.id}`,
          sourceType: "report",
          sourceId: report.id,
          category: "marketing",
          date: sessionDate,
          boardStatus: mapReportStatusToBoardStatus(report.report_status),
          title: report.parent_note
            ? `Follow-up phụ huynh • ${session.classroom_name}`
            : `Báo cáo sau ca • ${session.classroom_name}`,
          time: report.submitted_at ? `Submit ${formatDateTime(report.submitted_at)}` : "Chưa submit",
          description: truncateText(
            report.parent_note ||
              report.student_risk_summary ||
              report.attendance_summary ||
              report.homework_assigned,
            120,
          ),
          meta: [
            `Báo cáo: ${
              {
                draft: "Nháp",
                submitted: "Đã gửi",
                approved: "Đã duyệt",
                rejected: "Từ chối",
                revision_required: "Yêu cầu sửa",
              }[report.report_status] || report.report_status
            }`,
            `Checklist ${checklistDone}/${checklistTotal}`,
            report.report_status === "approved"
              ? report.payroll_eligible
                ? "Payroll: tính lương"
                : "Payroll: không tính lương"
              : "Payroll: chờ quyết định",
          ],
        });
      } else if (isPastSession) {
        items.push({
          id: `report-missing-${session.id}`,
          sourceType: "report-missing",
          sourceId: session.id,
          category: "marketing",
          date: sessionDate,
          boardStatus: "delay",
          title: `Chưa nộp báo cáo • ${session.classroom_name}`,
          time: formatTimeRange(session.start_at, session.end_at),
          description: "Ca dạy đã qua nhưng chưa có session report để duyệt.",
          meta: ["Cần submit report để chốt payroll và KPI"],
        });
      }

      if (report?.report_status === "approved" && report.payroll_eligible) {
        items.push({
          id: `finance-approved-${session.id}`,
          sourceType: "finance",
          sourceId: session.id,
          category: "finance",
          date: sessionDate,
          boardStatus: "done",
          title: `Đủ điều kiện payroll • ${session.classroom_name}`,
          time: financePerSession.revenuePerSession
            ? `Thực nhận/buổi ${formatCurrency(financePerSession.revenuePerSession)}`
            : "Đã đủ điều kiện tính lương",
          description: financePerSession.teacherCostPerSession
            ? `Chi phí GV/buổi ${formatCurrency(financePerSession.teacherCostPerSession)}`
            : "Báo cáo đã duyệt, có thể đưa vào payroll preview.",
          meta: financeItem
            ? [
                `Approved sessions: ${financeItem.approved_sessions_count}`,
                `Margin ${formatCurrency(financeItem.estimated_margin)}`,
              ]
            : ["Chưa có dữ liệu class finance preview"],
        });
      } else if (report?.report_status === "approved" && !report.payroll_eligible) {
        items.push({
          id: `finance-not-eligible-${session.id}`,
          sourceType: "finance-not-eligible",
          sourceId: session.id,
          category: "finance",
          date: sessionDate,
          boardStatus: "cancel",
          title: `Không tính lương • ${session.classroom_name}`,
          time: "Quản lý đã duyệt không eligible payroll",
          description:
            report.payroll_decision_note ||
            "Report được duyệt chuyên môn nhưng ca này không được đưa vào payroll.",
          meta: ["Không cộng vào approved sessions"],
        });
      } else if (isPastSession) {
        items.push({
          id: `finance-pending-${session.id}`,
          sourceType: "finance-pending",
          sourceId: session.id,
          category: "finance",
          date: sessionDate,
          boardStatus: report ? "in_progress" : "todo",
          title: `Chờ chốt payroll • ${session.classroom_name}`,
          time: report ? "Đang chờ duyệt báo cáo" : "Chưa có báo cáo",
          description: report
            ? "Ca dạy đã có report nhưng chưa đạt trạng thái approved."
            : "Cần nộp và duyệt report trước khi tính lương/học phí.",
          meta: [
            `Session status: ${
              sessionStatusOptions.find((item) => item.value === session.status)?.label ||
              session.status
            }`,
          ],
        });
      }

      if (pendingApproval && report) {
        items.push({
          id: `approval-pending-${report.id}`,
          sourceType: "approval",
          sourceId: report.id,
          category: "hr",
          date: sessionDate,
          boardStatus: "in_progress",
          title: `Chờ duyệt report • ${session.classroom_name}`,
          time: report.submitted_at ? formatDateTime(report.submitted_at) : "Đã gửi chờ duyệt",
          description: "Academic Manager cần review và approve report của ca này.",
          meta: ["Queue duyệt đang mở"],
        });
      } else if (!evidenceCount && isPastSession) {
        items.push({
          id: `evidence-missing-${session.id}`,
          sourceType: "evidence-missing",
          sourceId: session.id,
          category: "hr",
          date: sessionDate,
          boardStatus: "delay",
          title: `Thiếu evidence • ${session.classroom_name}`,
          time: formatTimeRange(session.start_at, session.end_at),
          description: "Ca dạy chưa có recording/evidence nên chưa đủ căn cứ đối soát.",
          meta: ["Cần sync session evidence"],
        });
      } else if (report?.report_status === "revision_required") {
        items.push({
          id: `revision-${report.id}`,
          sourceType: "report-revision",
          sourceId: report.id,
          category: "hr",
          date: sessionDate,
          boardStatus: "delay",
          title: `Cần sửa report • ${session.classroom_name}`,
          time: report.submitted_at ? formatDateTime(report.submitted_at) : "Revision required",
          description: truncateText(
            report.rejected_reason || "Report cần cập nhật trước khi duyệt lại.",
            100,
          ),
          meta: ["Yêu cầu chỉnh sửa trước khi chốt KPI/payroll"],
        });
      } else {
        items.push({
          id: `ops-${session.id}`,
          sourceType: "ops",
          sourceId: session.id,
          category: "hr",
          date: sessionDate,
          boardStatus: sessionBoardStatus,
          title: `Điều phối ca dạy • ${session.classroom_name}`,
          time: formatTimeRange(session.start_at, session.end_at),
          description: evidenceCount
            ? `${evidenceCount} evidence đã đồng bộ cho ca này.`
            : "Ca dạy đang nằm trong lịch vận hành.",
          meta: [`Delivery ${session.delivery_mode}`],
        });
      }

      // Gắn "người chủ lịch" (giáo viên) cho tất cả đầu việc sinh ra từ ca dạy này.
      const ownerName = session.teacher_name || session.center_name || "--";
      for (let index = eventStartIndex; index < items.length; index += 1) {
        items[index].owner = ownerName;
        items[index].classroomName = session.classroom_name;
      }
    });

    return items;
  }, [
    canManageSessions,
    classFinanceByClassroomId,
    evidenceCountBySessionId,
    pendingApprovalReportIds,
    reportBySessionId,
    sessions,
  ]);

  const visibleDerivedEvents = useMemo(() => {
    if (!selectedCategoryId) return derivedEvents;
    return derivedEvents.filter((event) => event.category === selectedCategoryId);
  }, [derivedEvents, selectedCategoryId]);

  // Gộp toàn bộ đầu việc (4 làn) theo ngày để phục vụ biểu đồ tiến độ.
  const eventsByDate = useMemo(() => {
    const grouped = new Map();
    visibleDerivedEvents.forEach((event) => {
      if (!event.date) return;
      if (!grouped.has(event.date)) grouped.set(event.date, []);
      grouped.get(event.date).push(event);
    });
    grouped.forEach((list) => {
      list.sort((left, right) => (left.time || "").localeCompare(right.time || ""));
    });
    return grouped;
  }, [visibleDerivedEvents]);

  // Lưới lịch tháng hiển thị trực tiếp các ca dạy (1 thẻ = 1 ca), gom theo ngày.
  const sessionsByDate = useMemo(() => {
    const grouped = new Map();
    sessions.forEach((session) => {
      const date = session.session_date || toLocalDateString(session.start_at);
      if (!date) return;
      if (!grouped.has(date)) grouped.set(date, []);
      grouped.get(date).push(session);
    });
    grouped.forEach((list) => {
      list.sort((left, right) =>
        String(left.start_at || "").localeCompare(String(right.start_at || "")),
      );
    });
    return grouped;
  }, [sessions]);

  // Tải lịch công tác (Schedule) theo tháng cho các thẻ Học sinh/Truyền thông/Tài chính/HR.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await listSchedules({
          year: selectedYear,
          month: selectedMonth,
          page_size: 500,
        });
        if (!cancelled) setSchedules(safeArray(data?.results ?? data));
      } catch (error) {
        if (!cancelled) setSchedules([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedYear, selectedMonth, reloadKey]);

  // Đếm đơn nhân sự chờ duyệt cho panel "Phê duyệt chờ xử lý".
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const params = {};
        if (selectedCenterId) params.center = selectedCenterId;
        const data = await getStaffRequestPendingSummary(params);
        if (!cancelled) setStaffPending(data || { leave_shift: 0, proposal: 0, total: 0 });
      } catch (error) {
        if (!cancelled) setStaffPending({ leave_shift: 0, proposal: 0, total: 0 });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedCenterId, reloadKey]);

  // Tải danh sách đơn chờ duyệt khi mở modal duyệt theo nhóm.
  useEffect(() => {
    if (!staffReviewGroup) return undefined;
    let cancelled = false;
    setStaffReviewLoading(true);
    setStaffReviewError("");
    const load = async () => {
      try {
        // Tải riêng từng loại đơn trong nhóm để không bị "chen" mất khi 1 loại
        // có quá nhiều bản ghi (page_size bị chặn ở 100).
        const types = STAFF_REQUEST_GROUPS[staffReviewGroup]?.types || [];
        const responses = await Promise.all(
          types.map((requestType) => {
            const params = { status: "pending", request_type: requestType, page_size: 100 };
            if (selectedCenterId) params.center = selectedCenterId;
            return listStaffRequests(params);
          }),
        );
        if (cancelled) return;
        const items = responses.flatMap((data) => safeArray(data?.results ?? data));
        items.sort((a, b) =>
          String(b.created_at || "").localeCompare(String(a.created_at || "")),
        );
        setStaffReviewItems(items);
      } catch (error) {
        if (!cancelled) {
          setStaffReviewItems([]);
          setStaffReviewError("Không tải được danh sách đơn.");
        }
      } finally {
        if (!cancelled) setStaffReviewLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [staffReviewGroup, selectedCenterId, reloadKey]);

  const schedulesByDate = useMemo(() => {
    const grouped = new Map();
    schedules.forEach((item) => {
      const date = item.event_date;
      if (!date) return;
      if (!grouped.has(date)) grouped.set(date, []);
      grouped.get(date).push(item);
    });
    grouped.forEach((list) =>
      list.sort((a, b) => String(a.time_label || "").localeCompare(String(b.time_label || ""))),
    );
    return grouped;
  }, [schedules]);

  // Phạm vi DỮ LIỆU luôn là cả tháng, không phụ thuộc đang xem tuần hay tháng:
  // đổi cách xem chỉ là đổi cách vẽ, không phải tải lại. (Nhánh "day" cũ đã bỏ vì
  // không có lối nào vào được.)
  const visibleWeeks = monthWeeks;

  const visibleDateIds = useMemo(
    () => new Set(visibleWeeks.flatMap((w) => w.days.map((d) => d.id))),
    [visibleWeeks],
  );

  // Số liệu cho từng thẻ, tính theo phạm vi đang xem (đổi theo Ngày/Tuần/Tháng).
  const cardCounts = useMemo(() => {
    const counts = { teaching_plan: 0, student: 0, marketing: 0, finance: 0, hr: 0 };
    sessionsByDate.forEach((list, date) => {
      if (visibleDateIds.has(date)) counts.teaching_plan += list.length;
    });
    schedulesByDate.forEach((list, date) => {
      if (!visibleDateIds.has(date)) return;
      list.forEach((item) => {
        if (counts[item.category] !== undefined) counts[item.category] += 1;
      });
    });
    return counts;
  }, [visibleDateIds, sessionsByDate, schedulesByDate]);

  // Dữ liệu hiển thị trên khung lịch theo thẻ đang chọn (báo giảng = ca dạy; còn lại = lịch công tác).
  const gridItemsByDate = useMemo(() => {
    const map = new Map();
    if (selectedCard === "teaching_plan") {
      sessionsByDate.forEach((list, date) => {
        map.set(date, list.map((s) => ({
          id: `s-${s.id}`,
          kind: "session",
          title: `${s.classroom_name || "Lớp"} - ${shortTeacherName(s.teacher_name)}`,
          // Tách sẵn để ô lịch tuần xuống dòng ở đúng chỗ. Nối thành một chuỗi
          // rồi để trình duyệt tự ngắt thì ra "Nguyễ / n Việt".
          classLabel: s.classroom_name || "Lớp",
          ownerLabel: shortTeacherName(s.teacher_name),
          time: formatTimeRange(s.start_at, s.end_at),
          subtitle: s.lesson_topic ? `Nội dung dạy: ${truncateText(s.lesson_topic, 60)}` : "",
          color: performanceLegend[mapSessionStatusToBoardStatus(s.status)]?.color || "#94a3b8",
          raw: s,
        })));
      });
    } else {
      schedulesByDate.forEach((list, date) => {
        const items = list
          .filter((s) => s.category === selectedCard)
          .map((s) => ({
            id: `c-${s.id}`,
            kind: "schedule",
            title: s.title,
            time: s.time_label || "",
            subtitle: WORK_CARDS.find((c) => c.id === s.category)?.label || "",
            color: scheduleStatusMeta[s.status]?.color || "#94a3b8",
            raw: s,
          }));
        if (items.length) map.set(date, items);
      });
    }
    return map;
  }, [selectedCard, sessionsByDate, schedulesByDate]);

  // Mở chi tiết một mục lịch công tác từ cột phải. Dựng đúng dạng mà hộp thoại
  // chi tiết đang đọc (kind/title/time/raw) để dùng lại chính hộp thoại đó.
  const openScheduleDetail = useCallback((schedule) => {
    if (!schedule) return;
    setDetailSession({
      id: `c-${schedule.id}`,
      kind: "schedule",
      title: schedule.title,
      time: schedule.time_label || "",
      subtitle: WORK_CARDS.find((c) => c.id === schedule.category)?.label || "",
      color: scheduleStatusMeta[schedule.status]?.color || "#94a3b8",
      raw: schedule,
    });
  }, []);

  // Nhắc việc hôm nay + sự kiện sắp tới (từ lịch công tác).
  const todaySchedules = useMemo(
    () => schedules.filter((s) => s.event_date === todayString),
    [schedules, todayString],
  );
  const upcomingSchedules = useMemo(
    () =>
      schedules
        .filter((s) => s.event_date && s.event_date > todayString)
        .sort((a, b) => a.event_date.localeCompare(b.event_date))
        .slice(0, 5),
    [schedules, todayString],
  );

  // 4 thẻ KPI đầu trang (giống bản 4.0) + chỉ số tăng/giảm.
  const calendarKpis = useMemo(() => {
    const dateOf = (s) => s.session_date || toLocalDateString(s.start_at);
    const yAnchor = new Date(todayString);
    yAnchor.setDate(yAnchor.getDate() - 1);
    const yStr = toDateInputValueFromParts(yAnchor);
    const todaySessions = sessions.filter((s) => dateOf(s) === todayString).length;
    const yesterdaySessions = sessions.filter((s) => dateOf(s) === yStr).length;
    const todayDelta = todaySessions - yesterdaySessions;

    const planPending = sessions.filter(
      (s) => s.teaching_plan_status === "submitted",
    ).length;
    const overdue = schedules.filter((s) => s.status === "delay").length;
    const anchor = new Date(todayString);
    anchor.setDate(anchor.getDate() + 7);
    const in7End = toDateInputValueFromParts(anchor);
    const upcomingDeadline = schedules.filter(
      (s) => s.event_date && s.event_date > todayString && s.event_date <= in7End,
    ).length;
    return [
      {
        key: "today", label: "Ca dạy hôm nay", value: todaySessions, color: "#d9571f",
        trend: todayDelta, caption: `${todayDelta >= 0 ? "+" : ""}${todayDelta} so với hôm qua`,
      },
      {
        key: "plan", label: "Lịch báo giảng chờ duyệt", value: planPending, color: "#c0392b",
        trend: planPending > 0 ? -1 : 0, caption: "ca đang chờ duyệt",
      },
      {
        key: "overdue", label: "Nhiệm vụ quá hạn", value: overdue, color: "#f04438",
        trend: overdue > 0 ? -1 : 0, caption: "cần xử lý ngay",
      },
      {
        key: "deadline", label: "Deadline sắp tới", value: upcomingDeadline, color: "#2f9e44",
        trend: 1, caption: "trong 7 ngày tới",
      },
    ];
  }, [sessions, schedules, todayString]);

  const summaryCards = useMemo(() => {
    const approvedSessions = reports.filter(
      (item) => item.report_status === "approved",
    ).length;
    const payrollEligibleSessions = reports.filter(
      (item) => item.report_status === "approved" && item.payroll_eligible,
    ).length;
    const missingEvidence = sessions.filter(
      (item) =>
        !evidenceCountBySessionId.get(item.id) &&
        isPastDateTime(item.end_at || item.start_at),
    ).length;

    return [
      {
        label: "Ca dạy",
        value: sessions.length,
        meta: `${sessions.filter((item) => item.status === "completed").length} hoàn thành`,
      },
      {
        label: "Report đã duyệt",
        value: approvedSessions,
        meta: `${payrollEligibleSessions} được tính lương`,
      },
      {
        label: "Queue duyệt",
        value: approvals.length,
        meta: canViewApprovals ? "Theo API approvals" : "Ẩn theo quyền",
      },
      {
        label: "Bảng điểm tháng",
        value: monthlyScorecards.length,
        meta: `${monthlyScorecards.filter((item) => item.status === "submitted").length} chờ duyệt`,
      },
      {
        label: "Thi đua",
        value: competitionFrames.length,
        meta: `${competitionFrames.filter((item) => item.status === "submitted").length} khung chờ duyệt`,
      },
      {
        label: "Thiếu evidence",
        value: missingEvidence,
        meta: "Cần sync để chốt payroll/KPI",
      },
    ];
  }, [
    approvals.length,
    canViewApprovals,
    competitionFrames,
    evidenceCountBySessionId,
    monthlyScorecards,
    reports,
    sessions,
  ]);

  const performanceRows = useMemo(() => {
    return monthWeeks.map((week) => {
      const counts = {
        todo: 0,
        in_progress: 0,
        done: 0,
        delay: 0,
        cancel: 0,
      };

      week.days.forEach((dayInfo) => {
        const events = eventsByDate.get(dayInfo.id) || [];
        events.forEach((event) => {
          counts[event.boardStatus] = (counts[event.boardStatus] || 0) + 1;
        });
      });

      const total = Object.values(counts).reduce((sum, item) => sum + item, 0);
      return {
        label: week.label,
        total,
        segments: performanceOrder
          .filter((key) => counts[key] > 0)
          .map((key) => ({
            key,
            value: total ? Math.round((counts[key] / total) * 100) : 0,
            count: counts[key],
          })),
      };
    });
  }, [monthWeeks, eventsByDate]);

  const donutData = useMemo(() => {
    const counts = {
      todo: 0,
      in_progress: 0,
      done: 0,
      delay: 0,
      cancel: 0,
    };

    visibleDerivedEvents.forEach((event) => {
      counts[event.boardStatus] = (counts[event.boardStatus] || 0) + 1;
    });

    return performanceOrder
      .filter((key) => counts[key] > 0)
      .map((key) => ({
        key,
        value: counts[key],
        color: performanceLegend[key].color,
      }));
  }, [visibleDerivedEvents]);

  const donutTotal = donutData.reduce((sum, item) => sum + item.value, 0);
  const donutGradient = donutData.reduce((acc, item, index) => {
    const start = index === 0 ? 0 : acc[index - 1].end;
    const end = start + (item.value / Math.max(donutTotal, 1)) * 100;
    return [...acc, { ...item, start, end }];
  }, []);

  const donutGradientStyle = donutGradient
    .map((item) => `${item.color} ${item.start}% ${item.end}%`)
    .join(", ");

  const planStatusCounts = useMemo(() => {
    return sessions.reduce((acc, session) => {
      const key = session.teaching_plan_status || "draft";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [sessions]);

  const scorecardStatusCounts = useMemo(() => {
    return monthlyScorecards.reduce((acc, scorecard) => {
      const key = scorecard.status || "draft";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [monthlyScorecards]);

  const competitionStatusCounts = useMemo(() => {
    return competitionFrames.reduce((acc, frame) => {
      const key = frame.status || "draft";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [competitionFrames]);

  const reviewScopeLabel = useMemo(() => {
    const selectedCenter = centers.find(
      (center) => String(center.id) === String(reviewCenterId),
    );
    const selectedClassroom =
      reviewClassrooms.find(
        (classroom) => String(classroom.id) === String(reviewClassroomId),
      ) ||
      classrooms.find(
        (classroom) => String(classroom.id) === String(reviewClassroomId),
      );
    const selectedTeacher = teachers.find(
      (teacher) => String(teacher.id) === String(reviewTeacherId),
    );
    const teacherName =
      [selectedTeacher?.user?.last_name, selectedTeacher?.user?.first_name]
        .filter(Boolean)
        .join(" ") ||
      selectedTeacher?.user?.email ||
      "Tất cả giáo viên";

    return [
      formatMonthHeader(selectedMonth, selectedYear),
      selectedCenter?.name || "Tất cả trung tâm",
      selectedClassroom?.name || "Tất cả lớp",
      reviewTeacherId ? teacherName : "Tất cả giáo viên",
    ].join(" • ");
  }, [
    centers,
    classrooms,
    selectedMonth,
    selectedYear,
    reviewCenterId,
    reviewClassroomId,
    reviewClassrooms,
    reviewTeacherId,
    teachers,
  ]);

  useEffect(() => {
    let cancelled = false;

    const fetchReviewClassrooms = async () => {
      if (!isReviewOpen || !reviewCenterId) {
        setReviewClassrooms([]);
        return;
      }
      try {
        const data = await listClassroomsByCenter(reviewCenterId);
        if (!cancelled) {
          setReviewClassrooms(data);
        }
      } catch (error) {
        if (!cancelled) {
          setReviewClassrooms([]);
        }
      }
    };

    fetchReviewClassrooms();
    return () => {
      cancelled = true;
    };
  }, [isReviewOpen, reviewCenterId]);

  useEffect(() => {
    if (!reviewClassroomId || !reviewClassrooms.length) return;
    const stillExists = reviewClassrooms.some(
      (classroom) => String(classroom.id) === String(reviewClassroomId),
    );
    if (!stillExists) {
      setReviewClassroomId("");
    }
  }, [reviewClassroomId, reviewClassrooms]);

  useEffect(() => {
    let cancelled = false;

    const fetchReviewSessions = async () => {
      if (!isReviewOpen) return;
      setReviewLoading(true);
      setReviewError("");
      try {
        const response = await listTeachingSessions({
          page_size: 500,
          date_from: `${selectedYear}-${pad2(selectedMonth)}-01`,
          date_to: `${selectedYear}-${pad2(selectedMonth)}-${pad2(
            getLastDayOfMonth(selectedYear, selectedMonth),
          )}`,
          teaching_plan_month: selectedMonth,
          teaching_plan_year: selectedYear,
          teaching_plan_status: "submitted",
          ...(reviewCenterId ? { center: reviewCenterId } : {}),
          ...(reviewTeacherId ? { teacher: reviewTeacherId } : {}),
          ...(reviewClassroomId ? { classroom: reviewClassroomId } : {}),
        });
        if (!cancelled) {
          setReviewSessions(safeArray(response.results));
        }
      } catch (error) {
        if (!cancelled) {
          setReviewSessions([]);
          setReviewError(
            getErrorMessage(error, "Không thể tải danh sách lịch chờ duyệt."),
          );
        }
      } finally {
        if (!cancelled) {
          setReviewLoading(false);
        }
      }
    };

    fetchReviewSessions();
    return () => {
      cancelled = true;
    };
  }, [
    isReviewOpen,
    selectedMonth,
    selectedYear,
    reviewCenterId,
    reviewClassroomId,
    reviewTeacherId,
  ]);

  const handleChangeYear = (value) => {
    setSelectedYear(Number(value));
    setNotice("");
  };

  const handleChangeMonth = (value) => {
    setSelectedMonth(Number(value));
    setNotice("");
  };

  const handleCreateSchedule = async (event) => {
    event.preventDefault();
    const loai = createForm.calendar_type;
    const tieuDeGoc = createForm.sc_title.trim();
    const hangMuc = createForm.sc_subcategory.trim();
    if (!createForm.sc_date) {
      setCreateError("Vui lòng chọn ngày thực hiện.");
      return;
    }
    if (!tieuDeGoc) {
      setCreateError("Vui lòng nhập nội dung công việc.");
      return;
    }
    // Ghép giống hệt cách backend ghép khi nhập file, để một việc nhập bằng tay
    // và nhập bằng file ra cùng một tiêu đề (nhờ đó không sinh bản trùng).
    const tieuDe = hangMuc ? `${hangMuc}: ${tieuDeGoc}` : tieuDeGoc;
    if (tieuDe.length > 255) {
      setCreateError("Hạng mục và nội dung cộng lại dài quá 255 ký tự.");
      return;
    }
    const thoiGian =
      createForm.sc_time_label.trim() ||
      [hangMuc, `Tháng ${Number(createForm.sc_date.slice(5, 7))}`].filter(Boolean).join(" • ");

    setCreateLoading(true);
    setCreateError("");
    try {
      const payload = {
        title: tieuDe,
        description: createForm.sc_description.trim(),
        category: loai,
        event_date: createForm.sc_date,
        time_label: thoiGian,
        status: createForm.sc_status,
      };
      // Gửi cả khi bỏ trống để người dùng gỡ được người phụ trách đã giao.
      payload.assigned_to_id = createForm.sc_assignee ? Number(createForm.sc_assignee) : null;
      if (editingScheduleId) {
        // CHỈ gửi trường thực sự đổi. Gửi cả gói sẽ hỏng với giáo viên: backend
        // cho họ đổi trạng thái lịch người khác tạo, nhưng nếu gói có thêm
        // trường nào khác là trả 403 — tức bấm Sửa để đổi mỗi trạng thái cũng
        // không bao giờ lưu được.
        const goc = editingScheduleRaw || {};
        const cu = {
          title: goc.title ?? "",
          description: goc.description ?? "",
          category: goc.category,
          event_date: goc.event_date ?? "",
          time_label: goc.time_label ?? "",
          status: goc.status,
          assigned_to_id: goc.assigned_to?.id ?? null,
        };
        const thayDoi = {};
        Object.entries(payload).forEach(([khoa, giaTri]) => {
          if (String(giaTri ?? "") !== String(cu[khoa] ?? "")) thayDoi[khoa] = giaTri;
        });
        if (!Object.keys(thayDoi).length) {
          setIsCreateOpen(false);
          setEditingScheduleId(null);
          setEditingScheduleRaw(null);
          setNotice("Không có thay đổi nào để lưu.");
          return;
        }
        await updateSchedule(editingScheduleId, thayDoi);
      } else {
        await createSchedule(payload);
      }
      setIsCreateOpen(false);
      setCreateForm((prev) => ({
        ...prev,
        sc_title: "",
        sc_subcategory: "",
        sc_description: "",
        sc_time_label: "",
        sc_status: "todo",
        sc_assignee: "",
      }));
      const nhan = WORK_CARDS.find((c) => c.id === loai)?.fullLabel || "lịch công tác";
      setNotice(
        editingScheduleId
          ? `Đã lưu thay đổi cho "${tieuDe}".`
          : `Đã thêm "${tieuDe}" vào ${nhan}.`,
      );
      setEditingScheduleId(null); setEditingScheduleRaw(null);
      setReloadKey((value) => value + 1);
    } catch (error) {
      setCreateError(
        getErrorMessage(
          error,
          editingScheduleId ? "Không thể lưu thay đổi." : "Không thể tạo lịch công tác.",
        ),
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCreateSession = async (event) => {
    event.preventDefault();
    // Cùng một form phục vụ 5 loại lịch; 4 loại lịch công tác đi đường khác.
    if (createForm.calendar_type !== "teaching_plan") {
      return handleCreateSchedule(event);
    }
    setCreateError("");
    setNotice("");

    const selectedCreateClassroom = createClassrooms.find(
      (classroom) => String(classroom.id) === String(createForm.classroom),
    );
    const resolvedCenterId =
      selectedCreateClassroom?.center?.id ||
      selectedCreateClassroom?.center_id ||
      createForm.center;

    if (!createForm.classroom || (canSelectTeacherForCreate && !createForm.teacher)) {
      setCreateError(
        canSelectTeacherForCreate
          ? "Vui lòng chọn lớp và giáo viên."
          : "Vui lòng chọn lớp.",
      );
      return;
    }
    if (!resolvedCenterId) {
      setCreateError("Lớp đã chọn chưa được gắn với trung tâm.");
      return;
    }
    if (!createForm.start_at || !createForm.end_at) {
      setCreateError("Vui lòng nhập thời gian bắt đầu và kết thúc.");
      return;
    }
    if (createForm.end_at <= createForm.start_at) {
      setCreateError("Thời gian kết thúc phải sau thời gian bắt đầu.");
      return;
    }
    const sessionDate = createForm.start_at.slice(0, 10);
    if (sessionDate < todayString) {
      setCreateError("Chỉ được tạo lịch cho ngày hiện tại hoặc tương lai.");
      return;
    }
    const [sessionYear, sessionMonth, sessionDay] = sessionDate.split("-").map(Number);

    setCreateLoading(true);
    try {
      const payload = {
        center: Number(resolvedCenterId),
        classroom: Number(createForm.classroom),
        session_date: sessionDate,
        start_at: toIsoWithLocalOffset(createForm.start_at),
        end_at: toIsoWithLocalOffset(createForm.end_at),
        delivery_mode: createForm.delivery_mode,
        meeting_link: createForm.meeting_link.trim(),
        recording_link: "",
        lesson_topic: createForm.lesson_topic.trim(),
        lesson_objective: createForm.lesson_objective.trim(),
        teaching_plan_month: sessionMonth,
        teaching_plan_year: sessionYear,
        teaching_plan_week: getWeekIndexFromDate(sessionYear, sessionMonth, sessionDay),
        status: createForm.status,
        source_system: "manual",
      };
      if (createForm.teacher) {
        payload.teacher = Number(createForm.teacher);
      }
      if (editingSessionId) {
        // Backend (_validate_teacher_update_payload) chỉ chấp nhận đúng nhóm field
        // dưới đây khi người sửa là giáo viên; gửi dư field -> 403.
        // Không gửi recording_link khi SỬA: form không nhập field này (luôn rỗng)
        // nên gửi lên sẽ xoá trắng link ghi hình đã có.
        const updatePayload = isTeacherRole
          ? {
              session_date: payload.session_date,
              start_at: payload.start_at,
              end_at: payload.end_at,
              delivery_mode: payload.delivery_mode,
              meeting_link: payload.meeting_link,
              lesson_topic: payload.lesson_topic,
              lesson_objective: payload.lesson_objective,
              teaching_plan_month: payload.teaching_plan_month,
              teaching_plan_year: payload.teaching_plan_year,
              teaching_plan_week: payload.teaching_plan_week,
            }
          : (({ recording_link, ...rest }) => rest)(payload);
        await updateTeachingSession(editingSessionId, updatePayload);
        setNotice("Đã cập nhật ca dạy.");
      } else {
        await createTeachingSession(payload);
        setNotice("Đã tạo ca dạy mới.");
      }
      setCreateError("");
      setIsCreateOpen(false);
      setEditingSessionId(null);
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      setCreateError(
        getErrorMessage(
          error,
          editingSessionId
            ? "Không thể cập nhật ca dạy. Vui lòng thử lại."
            : "Không thể tạo ca dạy. Vui lòng thử lại.",
        ),
      );
    } finally {
      setCreateLoading(false);
    }
  };

  // Mở form sửa 1 ca dạy (dùng lại form tạo, ở chế độ chỉnh sửa -> PATCH).
  const openEditSession = (raw) => {
    if (!raw) return;
    setDetailSession(null);
    setCreateError("");
    const startLocal = raw.start_at ? toDateTimeLocalValue(raw.start_at) : "";
    const endLocal = raw.end_at ? toDateTimeLocalValue(raw.end_at) : "";
    setEditingSessionId(raw.id);
    setEditingScheduleId(null); setEditingScheduleRaw(null);
    setCreateForm((prev) => ({
      ...prev,
      // BẮT BUỘC ép lại: state form không được reset khi đóng modal, nên nếu
      // trước đó người dùng chọn loại khác thì giá trị cũ còn nguyên ở đây.
      calendar_type: "teaching_plan",
      classroom: String(raw.classroom || ""),
      teacher: raw.teacher ? String(raw.teacher) : "",
      start_at: startLocal,
      end_at: endLocal,
      delivery_mode: raw.delivery_mode || "offline",
      meeting_link: raw.meeting_link || "",
      lesson_topic: raw.lesson_topic || "",
      lesson_objective: raw.lesson_objective || "",
      status: raw.status || "scheduled",
    }));
    setIsCreateOpen(true);
  };

  // Tách "Hạng mục: Nội dung" ngược lại thành hai ô.
  //
  // Model không có trường hạng mục riêng — nó chỉ được ghép vào đầu tiêu đề khi
  // lưu. Tách bừa theo dấu ":" sẽ hỏng với những tiêu đề chứa dấu hai chấm sẵn
  // ("Họp 9:00 sáng"), nên chỉ chấp nhận phép tách nào GHÉP LẠI RA ĐÚNG tiêu đề
  // gốc; không thì để nguyên cả câu vào ô nội dung.
  const tachHangMuc = (title) => {
    const nguyen = String(title || "");
    const vt = nguyen.indexOf(": ");
    if (vt <= 0) return { hangMuc: "", noiDung: nguyen };
    const hangMuc = nguyen.slice(0, vt);
    const noiDung = nguyen.slice(vt + 2);
    if (!noiDung || `${hangMuc}: ${noiDung}` !== nguyen) {
      return { hangMuc: "", noiDung: nguyen };
    }
    return { hangMuc, noiDung };
  };

  const openEditSchedule = (raw) => {
    if (!raw) return;
    setScheduleActionError("");
    setDetailSession(null);
    setCreateError("");
    setEditingSessionId(null);
    setEditingScheduleId(raw.id);
    setEditingScheduleRaw(raw);
    const { hangMuc, noiDung } = tachHangMuc(raw.title);
    setCreateForm((prev) => ({
      ...prev,
      calendar_type: raw.category,
      sc_date: raw.event_date || todayString,
      sc_subcategory: hangMuc,
      sc_title: noiDung,
      sc_description: raw.description || "",
      sc_time_label: raw.time_label || "",
      sc_status: raw.status || "todo",
      sc_assignee: raw.assigned_to?.id ? String(raw.assigned_to.id) : "",
    }));
    setIsCreateOpen(true);
  };

  const handleDeleteSchedule = async (raw) => {
    if (!raw?.id) return;
    if (!window.confirm(`Xoá lịch "${raw.title}" ngày ${formatShortDate(raw.event_date)}?`)) {
      return;
    }
    setDeletingScheduleId(raw.id);
    setScheduleActionError("");
    try {
      await deleteSchedule(raw.id);
      setDetailSession(null);
      setNotice(`Đã xoá "${raw.title}".`);
      setReloadKey((value) => value + 1);
    } catch (error) {
      setScheduleActionError(getErrorMessage(error, "Không thể xoá lịch công tác."));
    } finally {
      setDeletingScheduleId(null);
    }
  };

  // Xoá 1 ca dạy trực tiếp từ modal chi tiết (có xác nhận).
  const handleDeleteSession = async (raw) => {
    if (!raw?.id) return;
    if (!window.confirm(`Xoá ca dạy "${raw.classroom_name || raw.id}" ngày ${formatShortDate(raw.session_date)}?`)) {
      return;
    }
    setDeletingSessionId(raw.id);
    setScheduleError("");
    setNotice("");
    try {
      await deleteTeachingSession(raw.id);
      setDetailSession(null);
      setNotice("Đã xoá ca dạy.");
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      setScheduleError(getErrorMessage(error, "Không thể xoá ca dạy."));
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleSessionStatusChange = async (sessionId, nextStatus) => {
    if (!sessionId || !nextStatus) return;
    setScheduleError("");
    setNotice("");
    setStatusUpdatingId(sessionId);
    try {
      const updated = await updateTeachingSession(sessionId, {
        status: nextStatus,
      });
      setSessions((prev) =>
        prev.map((item) => (item.id === sessionId ? { ...item, ...updated } : item)),
      );
      setNotice("Đã cập nhật trạng thái ca dạy.");
    } catch (error) {
      setScheduleError(
        getErrorMessage(error, "Không thể cập nhật trạng thái ca dạy."),
      );
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const buildPlanActionPayload = () => ({
    month: selectedMonth,
    year: selectedYear,
    ...(selectedCenterId ? { center: Number(selectedCenterId) } : {}),
    ...(selectedTeacherId ? { teacher: Number(selectedTeacherId) } : {}),
    ...(selectedClassroomId ? { classroom: Number(selectedClassroomId) } : {}),
  });

  const handleOpenReviewPlan = () => {
    setScheduleError("");
    setNotice("");
    setReviewError("");
    setReviewSessions([]);
    setOpenReviewActionId(null);
    setReviewCenterId(selectedCenterId || "");
    setReviewClassroomId(selectedClassroomId || "");
    setReviewTeacherId(selectedTeacherId || "");
    setIsReviewOpen(true);
  };

  const openStaffCreateModal = (requestType = "leave") => {
    setStaffCreateError("");
    setStaffCreateForm({
      request_type: requestType,
      title: "",
      reason: "",
      center: selectedCenterId || "",
      start_date: "",
      end_date: "",
      desired_shift: "",
    });
    setIsStaffCreateOpen(true);
  };

  // Chỉ làm mới số đếm đơn chờ duyệt, không reload lại cả trang lịch.
  const refreshStaffPending = async () => {
    try {
      const params = {};
      if (selectedCenterId) params.center = selectedCenterId;
      const data = await getStaffRequestPendingSummary(params);
      setStaffPending(data || { leave_shift: 0, proposal: 0, total: 0 });
    } catch (error) {
      /* giữ nguyên số đếm cũ nếu lỗi */
    }
  };

  const handleCreateStaffRequest = async (event) => {
    event.preventDefault();
    setStaffCreateError("");
    if (!staffCreateForm.title.trim()) {
      setStaffCreateError("Vui lòng nhập tiêu đề đơn.");
      return;
    }
    if (staffCreateForm.request_type === "leave" && !staffCreateForm.start_date) {
      setStaffCreateError("Đơn xin nghỉ cần ngày bắt đầu.");
      return;
    }
    if (
      staffCreateForm.start_date &&
      staffCreateForm.end_date &&
      staffCreateForm.end_date < staffCreateForm.start_date
    ) {
      setStaffCreateError("Ngày kết thúc không được trước ngày bắt đầu.");
      return;
    }
    setStaffCreateLoading(true);
    try {
      const payload = {
        request_type: staffCreateForm.request_type,
        title: staffCreateForm.title.trim(),
        reason: staffCreateForm.reason.trim(),
      };
      if (staffCreateForm.center) payload.center = Number(staffCreateForm.center);
      if (staffCreateForm.start_date) payload.start_date = staffCreateForm.start_date;
      if (staffCreateForm.end_date) payload.end_date = staffCreateForm.end_date;
      if (staffCreateForm.desired_shift.trim())
        payload.desired_shift = staffCreateForm.desired_shift.trim();
      await createStaffRequest(payload);
      setIsStaffCreateOpen(false);
      setNotice("Đã gửi đơn, chờ quản lý duyệt.");
      refreshStaffPending();
    } catch (error) {
      setStaffCreateError(
        extractApiError(error, "Không tạo được đơn. Vui lòng thử lại."),
      );
    } finally {
      setStaffCreateLoading(false);
    }
  };

  const handleStaffReview = async (item, decision) => {
    setStaffActionId(item.id);
    setStaffReviewError("");
    try {
      await reviewStaffRequest(item.id, { decision });
      setStaffReviewItems((prev) => prev.filter((it) => it.id !== item.id));
      refreshStaffPending();
    } catch (error) {
      setStaffReviewError(
        extractApiError(error, "Không duyệt được đơn. Vui lòng thử lại."),
      );
    } finally {
      setStaffActionId(null);
    }
  };

  const closeStaffReview = () => {
    setStaffReviewGroup(null);
    setStaffReviewItems([]);
    setStaffReviewError("");
  };

  const renderStaffApprovalRow = (group, icon, label, count, clickable) => {
    const active = count > 0;
    const interactiveProps = clickable
      ? {
          role: "button",
          tabIndex: 0,
          onClick: () => setStaffReviewGroup(group),
          onKeyDown: (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setStaffReviewGroup(group);
            }
          },
          style: { cursor: "pointer", ...(active ? {} : { opacity: 0.6 }) },
        }
      : { style: active ? undefined : { opacity: 0.6 } };
    return (
      <div className="li" {...interactiveProps}>
        <div className="ico-sm" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>{icon}</div>
        <div className="li-body"><div className="li-title">{label}</div></div>
        <span className="li-end" style={active ? { color: "var(--primary)" } : undefined}>{count || "—"}</span>
      </div>
    );
  };

  const handleExportCalendarReport = async () => {
    setScheduleError("");
    setNotice("");

    try {
      const XLSX = await import("xlsx");
      const selectedCenter = centers.find(
        (center) => String(center.id) === String(selectedCenterId),
      );
      const selectedClassroom = classrooms.find(
        (classroom) => String(classroom.id) === String(selectedClassroomId),
      );
      const selectedTeacher = teachers.find(
        (teacher) => String(teacher.id) === String(selectedTeacherId),
      );
      const selectedTeacherName =
        [selectedTeacher?.user?.last_name, selectedTeacher?.user?.first_name]
          .filter(Boolean)
          .join(" ") ||
        selectedTeacher?.user?.email ||
        "Tất cả giáo viên";
      const generatedAt = new Date().toLocaleString("vi-VN");
      const workbook = XLSX.utils.book_new();

      appendJsonSheet(XLSX, workbook, "Tong quan", [
        { "Chỉ số": "Kỳ báo cáo", "Giá trị": formatMonthHeader(selectedMonth, selectedYear) },
        { "Chỉ số": "Phạm vi ngày", "Giá trị": `${activeRange.start} - ${activeRange.end}` },
        { "Chỉ số": "Chế độ xem", "Giá trị": "Lịch tháng" },
        { "Chỉ số": "Trung tâm", "Giá trị": selectedCenter?.name || "Tất cả trung tâm" },
        { "Chỉ số": "Lớp", "Giá trị": selectedClassroom?.name || "Tất cả lớp" },
        { "Chỉ số": "Giáo viên", "Giá trị": selectedTeacherId ? selectedTeacherName : "Tất cả giáo viên" },
        {
          "Chỉ số": "Trạng thái ca",
          "Giá trị": formatStatusLabel(sessionStatusOptions, selectedSessionStatus, "Tất cả trạng thái"),
        },
        { "Chỉ số": "Loại lịch", "Giá trị": plannerCategories.find((item) => item.id === selectedCategoryId)?.label || "Tất cả loại lịch" },
        { "Chỉ số": "Xuất lúc", "Giá trị": generatedAt },
        ...summaryCards.map((card) => ({
          "Chỉ số": card.label,
          "Giá trị": card.value,
          "Ghi chú": card.meta,
        })),
      ]);

      appendJsonSheet(
        XLSX,
        workbook,
        "Dau muc dashboard",
        visibleDerivedEvents.map((event) => ({
          "Ngày": event.date,
          "Nhóm lịch": laneDefinitions[event.category]?.label || event.category,
          "Trạng thái": performanceLegend[event.boardStatus]?.label || event.boardStatus,
          "Tiêu đề": event.title,
          "Thời gian": event.time,
          "Mô tả": event.description,
          "Thông tin thêm": safeArray(event.meta).join(" | "),
        })),
      );

      appendJsonSheet(
        XLSX,
        workbook,
        "Ca day",
        sessions.map((session) => {
          const report = reportBySessionId.get(session.id);
          const evidenceCount = evidenceCountBySessionId.get(session.id) || 0;
          const financeItem = classFinanceByClassroomId.get(session.classroom);
          const financePerSession = getFinancePerSession(financeItem);
          return {
            "ID": session.id,
            "Ngày": session.session_date || toLocalDateString(session.start_at),
            "Thời gian": formatTimeRange(session.start_at, session.end_at),
            "Trung tâm": session.center_name,
            "Lớp": session.classroom_name,
            "Giáo viên": session.teacher_name,
            "Hình thức": session.delivery_mode,
            "Trạng thái ca": formatStatusLabel(sessionStatusOptions, session.status),
            "Trạng thái lịch tháng": formatStatusLabel(
              teachingPlanStatusOptions,
              session.teaching_plan_status || "draft",
            ),
            "Tuần báo giảng": session.teaching_plan_week,
            "Chủ đề": session.lesson_topic,
            "Mục tiêu": session.lesson_objective,
            "Meeting link": session.meeting_link,
            "Recording": session.latest_recording_link || session.recording_link,
            "Report": report ? formatStatusLabel(reportStatusOptions, report.report_status) : "Chưa có",
            "Evidence": evidenceCount,
            "Payroll": report?.report_status === "approved"
              ? report.payroll_eligible
                ? "Tính lương"
                : "Không tính lương"
              : "Chờ duyệt",
            "Doanh thu/buổi": financePerSession.revenuePerSession
              ? Math.round(financePerSession.revenuePerSession)
              : "",
            "Chi phí GV/buổi": financePerSession.teacherCostPerSession
              ? Math.round(financePerSession.teacherCostPerSession)
              : "",
          };
        }),
      );

      appendJsonSheet(
        XLSX,
        workbook,
        "Report sau ca",
        reports.map((report) => {
          const session = report.session_detail ||
            sessions.find((item) => item.id === report.session) ||
            {};
          const checklistTotal = safeArray(report.completion_checklist).length || teachingShiftChecklist.length;
          const checklistDone = countCompletedChecklistItems(report.completion_checklist);
          return {
            "Report ID": report.id,
            "Session ID": report.session,
            "Ngày": session.session_date || toLocalDateString(session.start_at),
            "Lớp": session.classroom_name,
            "Giáo viên": report.teacher_name || session.teacher_name,
            "Trạng thái": formatStatusLabel(reportStatusOptions, report.report_status),
            "Checklist": `${checklistDone}/${checklistTotal}`,
            "Nộp muộn": report.is_late_submission ? "Có" : "Không",
            "Payroll": report.payroll_eligible ? "Tính lương" : "Không tính/chờ duyệt",
            "Ghi chú payroll": report.payroll_decision_note,
            "Mục tiêu": report.objective_status,
            "Điểm danh": report.attendance_summary,
            "Bài tập": report.homework_assigned,
            "Rủi ro học sinh": report.student_risk_summary,
            "Ghi chú phụ huynh": report.parent_note,
            "Lý do từ chối/sửa": report.rejected_reason,
            "Submitted at": formatDateTime(report.submitted_at),
            "Approved at": formatDateTime(report.approved_at),
          };
        }),
      );

      appendJsonSheet(
        XLSX,
        workbook,
        "Duyet report",
        approvals.map((approval) => ({
          "Approval ID": approval.id,
          "Loại": approval.entity_type,
          "Entity ID": approval.entity_id,
          "Trạng thái": approval.status,
          "Người gửi": approval.submitted_by_name,
          "Người duyệt": approval.reviewed_by_name,
          "Ghi chú": approval.comment,
          "Ngày tạo": formatDateTime(approval.created_at),
          "Ngày duyệt": formatDateTime(approval.reviewed_at),
          "Snapshot": approval.entity_snapshot
            ? JSON.stringify(approval.entity_snapshot)
            : "",
        })),
      );

      appendJsonSheet(
        XLSX,
        workbook,
        "Tai chinh",
        classFinancePreview.map((item) => ({
          "Classroom ID": item.classroom_id,
          "Lớp": item.classroom_name,
          "Số học viên": item.student_count,
          "Buổi cấu hình": item.configured_sessions_per_month,
          "Buổi đã duyệt": item.approved_sessions_count,
          "Buổi tính toán": item.sessions_for_calculation,
          "Doanh thu dự kiến": item.expected_revenue,
          "Doanh thu thực nhận": item.actual_revenue,
          "Chi phí GV": item.estimated_teacher_cost,
          "Margin": item.estimated_margin,
        })),
      );

      appendJsonSheet(
        XLSX,
        workbook,
        "Bang diem",
        monthlyScorecards.map((scorecard) => ({
          "ID": scorecard.id,
          "Học sinh": scorecard.student_name,
          "Trung tâm": scorecard.center_name,
          "Lớp": scorecard.classroom_name,
          "Giáo viên": scorecard.teacher_name,
          "Kỳ": scorecard.period_label || `${pad2(scorecard.period_month)}/${scorecard.period_year}`,
          "Chương trình": scorecard.program_type,
          "Tổng điểm": scorecard.total_score,
          "Tổng %": scorecard.total_percent,
          "Xếp loại": scorecard.grade_label,
          "Trạng thái": scorecard.status,
          "Nhận xét GV": scorecard.teacher_comment,
          "Điểm mạnh": scorecard.strengths,
          "Cần cải thiện": scorecard.improvements,
          "Mục tiêu tiếp": scorecard.next_goal,
          "Điểm thành phần": JSON.stringify(scorecard.score_components || {}),
        })),
      );

      appendJsonSheet(
        XLSX,
        workbook,
        "Thi dua",
        competitionFrames.map((frame) => ({
          "ID": frame.id,
          "Tiêu đề": frame.title,
          "Kỳ": `${pad2(frame.period_month)}/${frame.period_year}`,
          "Chương trình": frame.program_type,
          "Thời điểm trả thưởng": frame.payout_timing,
          "Trạng thái": frame.status,
          "Người tạo": frame.created_by_teacher_name,
          "Người duyệt": frame.reviewed_by_name,
          "Ghi chú duyệt": frame.review_note,
          "Quy tắc điểm": JSON.stringify(frame.scoring_rules || {}),
          "Quy tắc thưởng": JSON.stringify(frame.reward_rules || {}),
        })),
      );

      XLSX.writeFile(
        workbook,
        `Bao-cao-lich-${selectedYear}-${pad2(selectedMonth)}.xlsx`,
        { compression: true },
      );
      setNotice("Đã xuất báo cáo lịch tháng dạng Excel.");
    } catch (error) {
      setScheduleError("Không thể xuất báo cáo Excel. Vui lòng thử lại.");
    }
  };

  const handleDownloadImportTemplate = async () => {
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();

      // Chỉ xuất sheet của loại lịch người dùng ĐƯỢC PHÉP nhập — mời giáo viên
      // điền vào sheet Tài chính rồi báo lỗi khi nhập là mất công vô ích.
      const loaiDuocPhep = calendarTypeOptions
        .filter((c) => c.source === "schedule")
        .map((c) => c.id);
      const coBaoGiang = calendarTypeOptions.some((c) => c.id === "teaching_plan");

      // Ngày ví dụ phải NẰM TRONG tháng đang xem, nếu không người dùng nhập xong
      // sẽ không thấy việc hiện lên (lịch lọc theo năm/tháng đang chọn).
      const ngayTrongThang = (offset = 0) => {
        const cuoiThang = new Date(selectedYear, selectedMonth, 0).getDate();
        const homNay = todayString.slice(0, 7) === `${selectedYear}-${pad2(selectedMonth)}`
          ? Number(todayString.slice(8, 10))
          : 1;
        const ngay = Math.min(cuoiThang, homNay + offset);
        return `${pad2(ngay)}/${pad2(selectedMonth)}/${selectedYear}`;
      };

      // Dùng tên trung tâm / mã lớp CÓ THẬT trong hệ thống làm ví dụ, để file mẫu
      // nhập được ngay (tên phải khớp hệ thống mới match được khi nhập).
      const tplCenter =
        centers.find((c) => String(c.id) === String(selectedCenterId))?.name ||
        centers[0]?.name ||
        "Tên trung tâm trong hệ thống";
      const tplClass = classrooms[0]?.class_code || classrooms[0]?.name || "Mã lớp trong hệ thống";
      const tplNguoi = teachers[0]?.user || null;
      // Để TRỐNG nếu không có email thật: cột này khớp với tài khoản trong hệ
      // thống, ghi chuỗi mô tả vào là file mẫu tải về nhập lại sẽ báo lỗi ngay.
      const tplEmail = assignableUsers[0]?.email || tplNguoi?.email || "";
      // Tên giáo viên THẬT để dòng ví dụ nhập được ngay; nếu chưa tải được danh
      // sách thì để chuỗi mô tả cho người dùng biết cần điền gì.
      const tplGiaoVien =
        tplNguoi?.full_name ||
        [tplNguoi?.first_name, tplNguoi?.last_name].filter(Boolean).join(" ") ||
        "Mã hoặc tên giáo viên";

      // --- Sheet hướng dẫn: sinh TỪ CHÍNH bảng cột dùng để dựng các sheet dữ
      // liệu, nên không bao giờ lệch nhau. ---
      const huongDan = [
        ["HƯỚNG DẪN NHẬP LỊCH — đọc trước khi điền"],
        [],
        ["Sheet", "Cột", "Bắt buộc", "Ý nghĩa", "Giá trị hợp lệ", "Ví dụ"],
      ];
      loaiDuocPhep.forEach((type) => {
        const card = WORK_CARDS.find((c) => c.id === type);
        SCHEDULE_IMPORT_COLUMNS.forEach((col) => {
          huongDan.push([
            SHEET_NAMES[type],
            col.header,
            col.required ? "Có" : "Không",
            col.meaning,
            col.values,
            col.header === "Loại lịch" ? card?.fullLabel || "" : col.example,
          ]);
        });
      });
      if (coBaoGiang)
      TEACHING_TEMPLATE_COLUMNS.forEach((col) => {
        huongDan.push([
          SHEET_NAMES.teaching_plan,
          col.header,
          col.required ? "Có" : "Không",
          col.meaning,
          col.values,
          col.example,
        ]);
      });
      huongDan.push([]);
      [
        "Mỗi loại lịch là MỘT sheet riêng — điền vào đúng sheet của loại việc.",
        "Không đổi tên sheet và không xoá dòng tiêu đề (dòng đầu của mỗi sheet).",
        "Mỗi dòng là một việc. Không gộp nhiều việc vào cùng một ô.",
        "Xoá dòng ví dụ trước khi nhập dữ liệu thật.",
        "Nhập lại cùng một file sẽ CẬP NHẬT việc trùng (cùng Ngày và Nội dung), không tạo bản sao.",
        "Để trống ô Trạng thái khi nhập lại thì trạng thái đang có trên hệ thống được giữ nguyên.",
        "Sheet nào không dùng thì cứ để trống, hệ thống bỏ qua.",
      ].forEach((dong) => huongDan.push(["Lưu ý", dong]));

      const wsHuongDan = XLSX.utils.aoa_to_sheet(huongDan);
      wsHuongDan["!cols"] = [{ wch: 24 }, { wch: 20 }, { wch: 10 }, { wch: 52 }, { wch: 56 }, { wch: 28 }];
      XLSX.utils.book_append_sheet(workbook, wsHuongDan, "Huong dan");

      // --- Sheet lịch báo giảng: GIỮ NGUYÊN bộ cột hiện hành để không phá bộ
      // đọc sẵn có ở backend. ---
      if (coBaoGiang)
      appendJsonSheet(XLSX, workbook, SHEET_NAMES.teaching_plan, [
        {
          "Trung tâm": tplCenter,
          "Lớp": tplClass,
          "Giáo viên": isTeacherRole ? "" : tplGiaoVien,
          "Ngày dạy": ngayTrongThang(0),
          "Giờ bắt đầu": "18:00",
          "Giờ kết thúc": "19:30",
          "Hình thức": "online",
          "Chủ đề bài học": "Unit 1: Greetings",
          "Ghi chú": "",
        },
      ]);

      // --- 4 sheet lịch công tác, cùng một bộ cột ---
      const VI_DU = {
        student: ["Lớp học", `Kiểm tra sĩ số lớp ${tplClass}`, "Đối chiếu điểm danh với danh sách đăng ký", "08:00 - 09:30", "Đang thực hiện"],
        marketing: ["Tuyển sinh", "Gọi tư vấn 20 lead mới từ fanpage", "Ưu tiên lead của chiến dịch khai giảng", "Cả ngày", "Chưa bắt đầu"],
        finance: ["Thu chi", "Đối soát học phí trong tháng", "Khớp số thu với danh sách lớp", "14:00 - 16:00", "Chưa bắt đầu"],
        hr: ["Nhân sự", "Cập nhật hồ sơ giáo viên", "Bổ sung hợp đồng và bằng cấp còn thiếu", "Cả ngày", "Chưa bắt đầu"],
      };
      loaiDuocPhep.forEach((type, i) => {
        const card = WORK_CARDS.find((c) => c.id === type);
        const [hangMuc, noiDung, moTa, thoiGian, trangThai] = VI_DU[type];
        appendJsonSheet(XLSX, workbook, SHEET_NAMES[type], [
          {
            "Ngày": ngayTrongThang(i),
            "Hạng mục": hangMuc,
            "Nội dung công việc": noiDung,
            "Mô tả chi tiết": moTa,
            "Thời gian": thoiGian,
            "Trạng thái": trangThai,
            "Người phụ trách": tplEmail,
            "Loại lịch": card?.fullLabel || "",
          },
        ]);
        const ws = workbook.Sheets[SHEET_NAMES[type]];
        ws["!cols"] = [{ wch: 12 }, { wch: 18 }, { wch: 36 }, { wch: 44 }, { wch: 16 }, { wch: 16 }, { wch: 28 }, { wch: 22 }];
      });

      XLSX.writeFile(workbook, `Mau-nhap-lich-${selectedYear}-${pad2(selectedMonth)}.xlsx`, {
        compression: true,
      });
    } catch (error) {
      setImportError("Không thể tạo file mẫu. Vui lòng thử lại.");
    }
  };

  const handleImportSubmit = async (event) => {
    event.preventDefault();
    if (!importFile) {
      setImportError("Vui lòng chọn file Excel (.xlsx) để nhập.");
      return;
    }
    setImportLoading(true);
    setImportError("");
    setImportResult(null);
    try {
      // Đọc TÊN SHEET ngay ở trình duyệt rồi mới quyết định gọi endpoint nào.
      // Hai loại lịch nằm ở hai model / hai endpoint khác nhau, mà file mẫu lại
      // gộp chung một workbook — trước đây phải bấm nhập HAI LẦN ở hai nút khác
      // nhau, mỗi lần chỉ ăn sheet của phía mình, nên nhập một lượt là mất sạch
      // các sheet còn lại mà không báo gì.
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await importFile.arrayBuffer(), { type: "array", bookSheets: true });
      const tenSheet = (wb.SheetNames || []).map((x) => boDau(x));
      const coSheetDay = tenSheet.some((x) => x.includes("bao giang") || x.includes("lich day"));
      const coSheetCongTac = SCHEDULE_SHEET_TYPES.some((loai) =>
        tenSheet.includes(boDau(SHEET_NAMES[loai])),
      );

      const phan = [];
      if (coSheetDay && canCreateTeachingPlan) {
        const fd = new FormData();
        fd.append("file", importFile);
        phan.push({ ten: "Lịch dạy", kq: await importTeachingSessions(fd) });
      }
      if (coSheetCongTac && coQuyenLichCongTac) {
        const fd = new FormData();
        fd.append("file", importFile);
        fd.append("year", selectedYear);
        phan.push({ ten: "Lịch công tác", kq: await importSchedules(fd) });
      }
      if (!phan.length) {
        setImportError(
          coSheetDay || coSheetCongTac
            ? "File chỉ có loại lịch bạn không được phép nhập."
            : "Không nhận ra sheet nào trong file. Hãy tải file mẫu và điền vào đúng sheet.",
        );
        return;
      }

      const gop = {
        success_count: phan.reduce((t, x) => t + (Number(x.kq?.success_count) || 0), 0),
        error_count: phan.reduce((t, x) => t + (Number(x.kq?.error_count) || 0), 0),
        errors: phan.flatMap((x) =>
          safeArray(x.kq?.errors).map((e) =>
            typeof e === "string" ? `[${x.ten}] ${e}` : { ...e, message: `[${x.ten}] ${e?.message || ""}` },
          ),
        ),
        theo_loai: phan.map((x) => ({
          ten: x.ten,
          success_count: Number(x.kq?.success_count) || 0,
          error_count: Number(x.kq?.error_count) || 0,
        })),
      };
      setImportResult(gop);
      if (gop.success_count) {
        setReloadKey((prev) => prev + 1);
      }
    } catch (error) {
      setImportError(
        error?.response?.data?.detail ||
          "Không thể nhập lịch từ file Excel. Vui lòng thử lại.",
      );
    } finally {
      setImportLoading(false);
    }
  };

  const openImportModal = (mode) => {
    setImportMode(mode);
    setImportError("");
    setImportResult(null);
    setImportFile(null);
    setIsImportOpen(true);
  };

  const openReportModal = (sessionId) => {
    const existingReport = reportBySessionId.get(sessionId);
    setReportError("");
    setReportSessionId(sessionId);
    if (existingReport) {
      setReportForm({
        objective_status: existingReport.objective_status || "achieved",
        attendance_summary: existingReport.attendance_summary || "",
        student_count: existingReport.student_count ?? "",
        content_taught: existingReport.content_taught || "",
        session_evaluation: existingReport.session_evaluation || "",
        next_session_plan: existingReport.next_session_plan || "",
        homework_assigned: existingReport.homework_assigned || "",
        student_risk_summary: existingReport.student_risk_summary || "",
        is_reported: getChecklistFlag(existingReport.completion_checklist, "manual_reported"),
        reported_on_zalo: Boolean(existingReport.reported_on_zalo),
      });
    } else {
      setReportForm(buildDefaultReportForm());
    }
  };

  const closeReportModal = () => {
    setReportSessionId(null);
    setReportError("");
  };

  const saveSessionReport = async ({ thenSubmit }) => {
    if (!reportSessionId) return null;
    if (thenSubmit && !reportForm.is_reported) {
      setReportError("Vui lòng tích Đã báo cáo trước khi gửi quản lý duyệt.");
      return null;
    }
    if (!reportForm.attendance_summary.trim() || !reportForm.homework_assigned.trim()) {
      setReportError("Vui lòng nhập điểm danh/sĩ số và bài tập giao trước khi lưu.");
      return null;
    }
    setReportSaving(true);
    setReportError("");
    try {
      const existingReport = reportBySessionId.get(reportSessionId);
      const preservedChecklist = safeArray(existingReport?.completion_checklist).filter(
        (item) => item?.key !== "manual_reported",
      );
      const payload = {
        objective_status: reportForm.objective_status,
        attendance_summary: reportForm.attendance_summary.trim(),
        student_count: reportForm.student_count === "" ? null : Number(reportForm.student_count),
        content_taught: reportForm.content_taught.trim(),
        session_evaluation: reportForm.session_evaluation.trim(),
        next_session_plan: reportForm.next_session_plan.trim(),
        homework_assigned: reportForm.homework_assigned.trim(),
        student_risk_summary: reportForm.student_risk_summary.trim(),
        completion_checklist: [
          ...preservedChecklist,
          {
            key: "manual_reported",
            label: "Đã báo cáo",
            completed: Boolean(reportForm.is_reported),
          },
        ],
        reported_on_zalo: Boolean(reportForm.reported_on_zalo),
      };
      let saved;
      if (existingReport) {
        saved = await updateSessionReport(existingReport.id, payload);
      } else {
        saved = await createSessionReport({ session: reportSessionId, ...payload });
      }
      if (thenSubmit) {
        saved = await submitSessionReport(saved.id);
      }
      setNotice(
        thenSubmit ? "Đã gửi báo cáo buổi học cho quản lý duyệt." : "Đã lưu báo cáo buổi học.",
      );
      setReloadKey((prev) => prev + 1);
      closeReportModal();
      return saved;
    } catch (error) {
      setReportError(
        error?.response?.data?.detail || "Không thể lưu báo cáo buổi học. Vui lòng thử lại.",
      );
      return null;
    } finally {
      setReportSaving(false);
    }
  };

  const handleReportFormSubmit = (event) => {
    event.preventDefault();
    saveSessionReport({ thenSubmit: false });
  };

  const handleSubmitMonthPlan = async () => {
    setScheduleError("");
    setNotice("");
    setPlanActionLoading("submit");
    try {
      const response = await submitMonthlyTeachingPlan({
        ...buildPlanActionPayload(),
        note: "Gửi duyệt lịch báo giảng tháng từ Calendar Detail.",
      });
      setNotice(
        `Đã gửi ${response.submitted_count || 0} ca trong lịch báo giảng tháng ${selectedMonth}/${selectedYear}.`,
      );
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      setScheduleError(
        getErrorMessage(error, "Không thể gửi duyệt lịch báo giảng tháng."),
      );
    } finally {
      setPlanActionLoading("");
    }
  };

  const handleReviewSessionPlan = async (sessionId, decision, note = "") => {
    if (!sessionId || !decision) return false;
    setScheduleError("");
    setNotice("");
    setReviewError("");
    setReviewActionSessionId(sessionId);
    try {
      const fallbackNote =
        decision === "approve"
          ? "Quản lý duyệt ca trong lịch báo giảng tháng."
          : decision === "reject"
          ? "Quản lý từ chối ca trong lịch báo giảng tháng."
          : "Quản lý yêu cầu chỉnh ca trong lịch báo giảng tháng.";
      const updated = await reviewTeachingSessionPlan(sessionId, {
        decision,
        note: note.trim() || fallbackNote,
      });
      setReviewSessions((prev) =>
        prev.map((item) => (item.id === sessionId ? { ...item, ...updated } : item)),
      );
      setSessions((prev) =>
        prev.map((item) => (item.id === sessionId ? { ...item, ...updated } : item)),
      );
      setNotice(
        `Đã cập nhật ca ${updated.classroom_name || sessionId} sang trạng thái ${
          teachingPlanStatusOptions[updated.teaching_plan_status] ||
          updated.teaching_plan_status
        }.`,
      );
      setReloadKey((prev) => prev + 1);
      return true;
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Không thể cập nhật ca trong lịch báo giảng tháng.",
      );
      setScheduleError(message);
      setReviewError(message);
      return false;
    } finally {
      setReviewActionSessionId(null);
    }
  };

  // Duyệt tất cả lịch báo giảng đang "chờ duyệt" trong phạm vi đang lọc (1 lần gọi).
  const handleApproveAllPlans = async () => {
    const pendingCount = reviewSessions.filter(
      (s) => s.teaching_plan_status === "submitted",
    ).length;
    if (!pendingCount) return;
    setReviewError("");
    setNotice("");
    setApproveAllLoading(true);
    try {
      const res = await reviewMonthlyTeachingPlan({
        month: selectedMonth,
        year: selectedYear,
        decision: "approve",
        note: "Duyệt tất cả lịch báo giảng.",
        ...(reviewCenterId ? { center: Number(reviewCenterId) } : {}),
        ...(reviewClassroomId ? { classroom: Number(reviewClassroomId) } : {}),
        ...(reviewTeacherId ? { teacher: Number(reviewTeacherId) } : {}),
      });
      setNotice(
        `Đã duyệt ${res?.reviewed_count ?? pendingCount} ca lịch báo giảng.`,
      );
      setReviewSessions([]);
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      setReviewError(
        getErrorMessage(error, "Không thể duyệt tất cả lịch báo giảng."),
      );
    } finally {
      setApproveAllLoading(false);
    }
  };

  const openReviewReasonDialog = (session, decision) => {
    setReviewReasonTarget({ session, decision });
    setReviewReasonText("");
    setReviewReasonError("");
    setOpenReviewActionId(null);
  };

  const closeReviewReasonDialog = () => {
    if (reviewActionSessionId) return;
    setReviewReasonTarget(null);
    setReviewReasonText("");
    setReviewReasonError("");
  };

  const handleSubmitReviewReason = async (event) => {
    event.preventDefault();
    if (!reviewReasonTarget) return;
    const reason = reviewReasonText.trim();
    if (!reason) {
      setReviewReasonError("Vui lòng nhập lý do trước khi gửi.");
      return;
    }
    const success = await handleReviewSessionPlan(
      reviewReasonTarget.session.id,
      reviewReasonTarget.decision,
      reason,
    );
    if (success) {
      closeReviewReasonDialog();
    }
  };

  const activeReportSession = reportSessionId
    ? sessions.find((item) => item.id === reportSessionId)
    : null;
  const activeReport = reportSessionId ? reportBySessionId.get(reportSessionId) : null;
  const importErrorItems = safeArray(importResult?.error_logs || importResult?.errors);

  return (
      <>
      <div className="v4page">
        <div className="content">
          <div className="content-col">
            {/* Tiêu đề + nút cùng một khối như các màn 4.0 khác (mẫu Students.jsx),
                thay vì để hàng nút thành một dải riêng phía dưới. */}
            <div className="page-head">
              <div className="flex-between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h1>Lịch làm việc</h1>
                  <p>Quản lý lịch dạy, lịch báo giảng và kế hoạch vận hành theo tuần</p>
                </div>
                {/* Hành động chính đứng cạnh tiêu đề. Trước đây cả 6 nút cùng một
                    hàng nên trên laptop 1280px chúng tràn xuống 2 hàng và "+ Thêm
                    ca dạy" — việc hay làm nhất — lại bị đẩy xuống dưới cùng. */}
                {(canCreateTeachingPlan || calendarTypeOptions.length > 0) && (
                  <button className="btn primary" onClick={() => {
                    setCreateError("");
                    const base = `${selectedYear}-${pad2(selectedMonth)}-01`;
                    const draftDate = base >= todayString ? base : todayString;
                    // Lịch công tác được phép ghi ngày quá khứ, và nếu kẹp về
                    // hôm nay thì việc tạo trong tháng cũ sẽ rơi ra ngoài lịch
                    // đang xem. Ca dạy vẫn giữ luật cũ (không lùi ngày).
                    const ngayCongTac =
                      todayString.slice(0, 7) === `${selectedYear}-${pad2(selectedMonth)}`
                        ? todayString
                        : base;
                    const [dy, dm, dday] = draftDate.split("-").map(Number);
                    setIsCreateOpen(true);
                    setEditingSessionId(null);
                    setEditingScheduleId(null); setEditingScheduleRaw(null);
                    setCreateForm((prev) => ({
                      ...prev,
                      calendar_type: calendarTypeOptions.some((c) => c.id === "teaching_plan")
                        ? "teaching_plan"
                        : calendarTypeOptions[0]?.id || "teaching_plan",
                      // Xoá sạch nội dung của lần mở trước — form dùng chung cho
                      // cả 5 loại lịch và KHÔNG tự reset khi đóng modal.
                      classroom: "",
                      meeting_link: "",
                      lesson_topic: "",
                      lesson_objective: "",
                      delivery_mode: "online",
                      status: "scheduled",
                      sc_title: "",
                      sc_subcategory: "",
                      sc_description: "",
                      sc_time_label: "",
                      sc_status: "todo",
                      sc_assignee: "",
                      sc_date: ngayCongTac,
                      teacher: canSelectTeacherForCreate ? (prev.teacher || selectedTeacherId || "") : "",
                      start_at: `${draftDate}T18:00`,
                      end_at: `${draftDate}T19:30`,
                      teaching_plan_month: dm,
                      teaching_plan_year: dy,
                      teaching_plan_week: getWeekIndexFromDate(dy, dm, dday),
                    }));
                  }}>+ Thêm lịch</button>
                )}
              </div>
              {/* Các thao tác phụ thành thanh riêng, dùng hết bề ngang nên vừa một
                  hàng thay vì chen với tiêu đề. */}
              <div className="cal-toolbar">
                <button className="btn ghost sm" onClick={handleExportCalendarReport} disabled={isLoading}>Xuất Excel</button>
                {/* MỘT nút cho cả workbook. Trước đây hai nút cùng nhận một file
                    mẫu nhưng mỗi nút chỉ đọc sheet của phía mình — người dùng
                    nhập một lượt rồi tưởng xong, trong khi các sheet kia bị bỏ. */}
                {(canCreateTeachingPlan || coQuyenLichCongTac) && (
                  <button className="btn ghost sm" onClick={() => openImportModal("teaching")}>
                    Nhập lịch dạy từ Excel
                  </button>
                )}
                {/* Xoá cả tháng là việc không lấy lại được nên chỉ admin thấy nút,
                    và backend cũng chặn lại lần nữa chứ không tin mỗi giao diện. */}
                {canManageSessions && (
                  <button
                    className="btn ghost sm"
                    style={{ color: "#c0332a", borderColor: "#f0cfcb" }}
                    disabled={xoaThangDangChay}
                    onClick={moHopXoaThang}
                  >
                    Xoá lịch tháng {pad2(selectedMonth)}
                  </button>
                )}
                {canManageSessions && (<button className="btn ghost sm" onClick={handleOpenReviewPlan}>Duyệt lịch báo giảng tháng</button>)}
                <button className="btn ghost sm" onClick={() => openStaffCreateModal("leave")}>Tạo đơn nhân sự</button>
                {canSubmitTeachingPlan && (<button className="btn ghost sm" onClick={handleSubmitMonthPlan} disabled={Boolean(planActionLoading) || !sessions.length || !isSubmitWindowOpen}>{planActionLoading === "submit" ? "Đang gửi..." : "Gửi duyệt lịch tháng"}</button>)}
              </div>
            </div>

            {/* setNotice được gọi 20 chỗ và setScheduleError 15 chỗ, nhưng hai biến
                này chưa bao giờ được render ở đâu — bấm Xoá thì ca dạy biến mất mà
                không một dòng chữ, bấm Xuất Excel cũng im lặng. Đó chính là cảm giác
                "nút không ăn" dù API đã chạy xong. */}
            {scheduleError ? (
              <div className="alert red" style={{ marginBottom: 14 }} role="alert">
                <span>⚠️</span>
                <div style={{ flex: 1 }}>{scheduleError}</div>
                <button type="button" className="btn ghost sm" onClick={() => setScheduleError("")}>Đóng</button>
              </div>
            ) : null}
            {notice ? (
              <div className="alert green" style={{ marginBottom: 14 }} role="status">
                <span>✅</span>
                <div style={{ flex: 1 }}>{notice}</div>
                <button type="button" className="btn ghost sm" onClick={() => setNotice("")}>Đóng</button>
              </div>
            ) : null}

            <div className="kpi-grid cols-4">
              {calendarKpis.map((k) => {
                const cmap = { today: "orange", plan: "orange", overdue: "red", deadline: "yellow" };
                const emap = { today: "📅", plan: "📝", overdue: "⚠️", deadline: "⏰" };
                return (
                  <div className="kpi" key={k.key}>
                    <div className={`ico ${cmap[k.key] || "orange"}`} style={{ fontSize: 18 }}>{emap[k.key]}</div>
                    <div>
                      <div className="kpi-label">{k.label}</div>
                      <div className="kpi-value">{k.value}</div>
                      <span className={`trend ${k.trend > 0 ? "up" : k.trend < 0 ? "down" : ""}`}>{k.trend > 0 ? "▲" : k.trend < 0 ? "▼" : "•"} {k.caption}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="stack">
              {(() => {
                const week = monthWeeks.find((w) => w.days.some((d) => d.id === focusDate)) || monthWeeks[0];
                const days = week?.days || [];
                const parseHour = (t) => { const m = /(\d{1,2}):(\d{2})/.exec(t || ""); return m ? Number(m[1]) : null; };
                // Giới hạn mỗi cột ngày tối đa MAX_VISIBLE_EVENTS buổi; phần dư ẩn
                // sau nút "Xem thêm" của ngày đó (tránh hiển thị quá nhiều lịch cùng lúc).
                const visibleIdsByDay = new Map();
                const hiddenCountByDay = new Map();
                const untimedByDay = new Map();
                const hoursSet = new Set();
                days.forEach((d) => {
                  const all = gridItemsByDate.get(d.id) || [];
                  // Lịch công tác phần lớn chỉ có nhãn kiểu "Truyền thông • Tháng 8",
                  // không có HH:MM (298/346 bản ghi). Lưới chia theo giờ nên trước đây
                  // chúng bị loại sạch: chip đếm ra 8 việc mà lưới trống trơn. Tệ hơn,
                  // khi sắp xếp chúng bị coi là 0h nên đứng đầu và chiếm hết 5 suất
                  // hiển thị, đẩy nốt các mục CÓ giờ của ngày đó ra ngoài.
                  // Nay tách riêng vào hàng "Cả ngày".
                  const untimed = all.filter((it) => parseHour(it.time) == null);
                  const timed = all
                    .filter((it) => parseHour(it.time) != null)
                    .sort((a, b) => parseHour(a.time) - parseHour(b.time));
                  untimedByDay.set(d.id, untimed);
                  const shown = expandedDays.has(d.id)
                    ? timed
                    : timed.slice(0, MAX_VISIBLE_EVENTS);
                  visibleIdsByDay.set(d.id, new Set(shown.map((it) => it.id)));
                  hiddenCountByDay.set(d.id, timed.length - shown.length);
                  // Chỉ lấy hàng giờ từ các buổi đang hiển thị để không tạo dòng trống.
                  shown.forEach((it) => { const h = parseHour(it.time); if (h != null) hoursSet.add(h); });
                });
                const anyUntimed = days.some((d) => (untimedByDay.get(d.id) || []).length > 0);
                const hours = [...hoursSet].sort((a, b) => a - b);
                const anyMoreControls = days.some(
                  (d) => (hiddenCountByDay.get(d.id) || 0) > 0 || expandedDays.has(d.id),
                );
                // Điều hướng theo TUẦN trong tháng, không nhảy cóc: hết tuần cuối
                // thì sang tuần 1 tháng sau (và ngược lại), selectedMonth luôn khớp
                // tuần đang xem. Fix lỗi "tuần 1 tháng sau không hiện".
                const focusInMonth = (wk) => (wk.days.find((d) => d.inMonth) || wk.days[0]).id;
                const shiftWeek = (delta) => {
                  const curIdx = monthWeeks.findIndex((w) =>
                    w.days.some((d) => d.id === focusDate),
                  );
                  const curFirst = curIdx >= 0 ? monthWeeks[curIdx].days[0].id : null;
                  const nextIdx = (curIdx >= 0 ? curIdx : 0) + delta;
                  if (nextIdx >= 0 && nextIdx < monthWeeks.length) {
                    setFocusDate(focusInMonth(monthWeeks[nextIdx]));
                    return;
                  }
                  const anchor = new Date(selectedYear, selectedMonth - 1 + delta, 1);
                  const ny = anchor.getFullYear();
                  const nm = anchor.getMonth() + 1;
                  const wks = buildMonthWeeks(ny, nm);
                  let targetIdx = delta > 0 ? 0 : wks.length - 1;
                  // Tuần biên (VD 27/7–2/8) là tuần cuối tháng trước = tuần đầu tháng
                  // sau. Nếu trùng tuần đang xem thì nhảy tiếp 1 tuần để không hiện lại.
                  if (curFirst && wks[targetIdx]?.days[0]?.id === curFirst) {
                    targetIdx = delta > 0
                      ? Math.min(targetIdx + 1, wks.length - 1)
                      : Math.max(targetIdx - 1, 0);
                  }
                  setSelectedYear(ny);
                  setSelectedMonth(nm);
                  setFocusDate(focusInMonth(wks[targetIdx]));
                };
                return (
                  <div className="card">
                    <div className="card-head">
                      <h3>
                        {calendarView === "month" ? "Lịch dạy theo tháng" : "Lịch dạy theo tuần"}
                        {" — "}
                        {WORK_CARDS.find((c) => c.id === selectedCard)?.label}
                      </h3>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {/* Chuyển Tuần / Tháng. Yêu cầu là xem được cả hai, nhưng
                            trước đây không có nút nào đổi nên chỉ xem được tuần. */}
                        <div className="view-switch" role="group" aria-label="Chế độ xem lịch">
                          <button
                            type="button"
                            className={calendarView === "week" ? "is-active" : ""}
                            aria-pressed={calendarView === "week"}
                            onClick={() => setCalendarView("week")}
                          >Tuần</button>
                          <button
                            type="button"
                            className={calendarView === "month" ? "is-active" : ""}
                            aria-pressed={calendarView === "month"}
                            onClick={() => setCalendarView("month")}
                          >Tháng</button>
                        </div>
                        {calendarView === "week" ? (
                          <>
                            <button className="btn ghost sm" onClick={() => shiftWeek(-1)}>‹</button>
                            <span className="badge gray week-badge">
                              {week?.label || "Tuần"}
                              {week?.rangeLabel ? <small>{week.rangeLabel}</small> : null}
                            </span>
                            <button className="btn ghost sm" onClick={() => shiftWeek(1)}>›</button>
                          </>
                        ) : (
                          <span className="badge gray week-badge">
                            Tháng {selectedMonth}
                            <small>{selectedYear}</small>
                          </span>
                        )}
                      </div>
                      {/* Chú giải phải mô tả ĐÚNG màu đang vẽ trên lịch: vạch màu mỗi ô
                          lấy từ performanceLegend theo TRẠNG THÁI (xem it.color), không
                          phải theo nhóm công việc. Lấy thẳng từ nguồn để không lệch lại. */}
                      <div className="legend">
                        {performanceOrder.map((key) => (
                          <span className="lg" key={key}>
                            <i style={{ background: performanceLegend[key].color }}></i>
                            {performanceLegend[key].label}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* Đây là BỘ LỌC lịch, không phải thẻ thống kê. Bản cũ vẽ 5 thẻ to
                        3 dòng chữ, chiếm 3 hàng và đẩy chính cái lịch xuống dưới màn
                        hình. Dạng chip 1 hàng giữ nguyên chức năng mà nhường chỗ cho
                        nội dung chính. */}
                    <div className="cal-filters" role="group" aria-label="Lọc lịch theo nhóm công việc">
                      {WORK_CARDS.map((c) => {
                        const active = selectedCard === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            className={`cal-chip${active ? " is-active" : ""}`}
                            aria-pressed={active}
                            onClick={() => setSelectedCard(c.id)}
                          >
                            <i className="cal-chip__dot" style={{ background: c.color }} />
                            {c.label}
                            <span className="cal-chip__count">{cardCounts[c.id] || 0}</span>
                          </button>
                        );
                      })}
                    </div>
                    {calendarView === "month" ? (
                      <div className="tbl-wrap">
                        <div className="mgrid">
                          {WEEKDAY_LABELS.map((label) => (
                            <div className="mg-h" key={label}>{label}</div>
                          ))}
                          {monthWeeks.flatMap((wk) => wk.days).map((d) => {
                            const dayItems = (gridItemsByDate.get(d.id) || [])
                              .slice()
                              .sort((a, b) => (parseHour(a.time) ?? 0) - (parseHour(b.time) ?? 0));
                            const isExp = expandedDays.has(d.id);
                            const shown = isExp ? dayItems : dayItems.slice(0, MAX_VISIBLE_EVENTS);
                            const hidden = dayItems.length - shown.length;
                            return (
                              <div
                                className={`mg-c${d.inMonth ? "" : " is-out"}${d.id === todayString ? " is-today" : ""}`}
                                key={`m-${d.id}`}
                              >
                                <div className="mg-d">{d.day}</div>
                                {shown.map((it) => (
                                  <button
                                    type="button"
                                    className="mg-item"
                                    key={it.id}
                                    title={`${it.title}${it.time ? ` • ${it.time}` : ""}`}
                                    style={{ borderLeft: `3px solid ${it.color}` }}
                                    onClick={() => setDetailSession(it)}
                                  >
                                    <b>{it.classLabel || it.title}</b>
                                    <small>{it.time}</small>
                                  </button>
                                ))}
                                {hidden > 0 ? (
                                  <button type="button" className="mg-more" onClick={() => toggleDayExpand(d.id)}>
                                    +{hidden} xem thêm
                                  </button>
                                ) : isExp && dayItems.length > MAX_VISIBLE_EVENTS ? (
                                  <button type="button" className="mg-more" onClick={() => toggleDayExpand(d.id)}>
                                    Thu gọn
                                  </button>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                        {!isLoading && gridItemsByDate.size === 0 ? (
                          <p className="small muted" style={{ textAlign: "center", padding: "16px 0 4px" }}>
                            Không có lịch trong tháng này.
                          </p>
                        ) : null}
                      </div>
                    ) : (
                    <div className="tbl-wrap">
                      {/* Không đặt min-width cứng ở đây: 980px rộng hơn cột nội dung
                          nên T7 và CN luôn bị đẩy ra ngoài, phải kéo ngang mới thấy.
                          Bề rộng tối thiểu để trong vista4.css, chỉ bật ở màn hẹp. */}
                      <div className="sched">
                        <div className="sc-h"></div>
                        {days.map((d) => (<div className="sc-h" key={d.id}>{d.weekdayLabel}<small>{d.subtitle}</small></div>))}
                        {anyUntimed ? (
                          <>
                            <div className="sc-t">Cả ngày</div>
                            {days.map((d) => (
                              <div className="sc-c" key={`ad-${d.id}`}>
                                {(untimedByDay.get(d.id) || []).map((it, idx) => (
                                  <div
                                    className="lesson normal"
                                    key={it.id}
                                    title={it.title}
                                    style={{ cursor: "pointer", borderLeft: `3px solid ${it.color}` }}
                                    onClick={() => setDetailSession(it)}
                                  >
                                    <span style={{ minWidth: 0 }}>
                                      <b>
                                        <img className="avatar" alt="" src={avatarUrl(it.owner || it.title, idx)} loading="lazy" />
                                        {it.classLabel || it.title}
                                      </b>
                                      {it.ownerLabel ? <small className="lesson__who">{it.ownerLabel}</small> : null}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </>
                        ) : null}
                        {hours.length === 0 && !anyUntimed ? (
                          <div className="sc-c" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "24px", color: "var(--muted)" }}>{isLoading ? "Đang tải..." : "Không có lịch trong tuần này."}</div>
                        ) : hours.map((h) => (
                          <Fragment key={h}>
                            <div className="sc-t">{pad2(h)}:00</div>
                            {days.map((d) => {
                              const visibleSet = visibleIdsByDay.get(d.id);
                              const cell = (gridItemsByDate.get(d.id) || []).filter(
                                (it) => parseHour(it.time) === h && (!visibleSet || visibleSet.has(it.id)),
                              );
                              return (
                                <div className="sc-c" key={d.id}>
                                  {cell.map((it, idx) => (
                                    <div className="lesson normal" key={it.id} title={`${it.title}${it.time ? ` • ${it.time}` : ""}`} style={{ cursor: "pointer", borderLeft: `3px solid ${it.color}` }} onClick={() => setDetailSession(it)}>
                                      {/* Ảnh đại diện nằm CÙNG DÒNG với tên lớp thay vì
                                          thành một cột riêng: cột ngày chỉ rộng ~110px,
                                          để avatar chiếm một cột thì phần chữ còn quá hẹp
                                          và "F 205 - Nguyễn Việt" vỡ thành 5 dòng. */}
                                      <span style={{ minWidth: 0 }}>
                                        <b>
                                          <img className="avatar" alt="" src={avatarUrl(it.owner || it.title, idx)} loading="lazy" />
                                          {it.classLabel || it.title}
                                        </b>
                                        {it.ownerLabel ? <small className="lesson__who">{it.ownerLabel}</small> : null}
                                        <small>{it.time}</small>
                                        {it.kind === "session" && it.raw?.teaching_plan_status ? (
                                          <span
                                            className={`badge ${teachingPlanStatusBadge[it.raw.teaching_plan_status] || "gray"}`}
                                            style={{ display: "flex", width: "fit-content", marginTop: 4, fontSize: 10.5, fontWeight: 700, padding: "2px 8px", lineHeight: 1.35 }}
                                          >
                                            {teachingPlanStatusOptions[it.raw.teaching_plan_status] || it.raw.teaching_plan_status}
                                          </span>
                                        ) : null}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </Fragment>
                        ))}
                        {hours.length > 0 && anyMoreControls && (
                          <>
                            <div className="sc-t"></div>
                            {days.map((d) => {
                              const hidden = hiddenCountByDay.get(d.id) || 0;
                              const isExp = expandedDays.has(d.id);
                              return (
                                <div className="sc-c" key={`more-${d.id}`}>
                                  {hidden > 0 ? (
                                    <button type="button" className="btn ghost sm" style={{ width: "100%" }} onClick={() => toggleDayExpand(d.id)}>
                                      +{hidden} Xem thêm
                                    </button>
                                  ) : isExp ? (
                                    <button type="button" className="btn ghost sm" style={{ width: "100%" }} onClick={() => toggleDayExpand(d.id)}>
                                      Thu gọn
                                    </button>
                                  ) : null}
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </div>
                    )}
                  </div>
                );
              })()}

            </div>
          </div>

          <div className="rightbar">
            <div className="card">
              <div className="card-head"><h3>Nhắc việc hôm nay</h3></div>
              <div className="list">
                {(planStatusCounts.submitted || 0) > 0 && (
                  <div className="li"><div className="ico-sm" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>📋</div><div className="li-body"><div className="li-title">Duyệt {planStatusCounts.submitted} lịch báo giảng chờ duyệt</div></div></div>
                )}
                {todaySchedules.length === 0 && (planStatusCounts.submitted || 0) === 0 ? (
                  <div className="li"><div className="li-body"><div className="li-sub">Hôm nay không có nhắc việc.</div></div></div>
                ) : todaySchedules.map((t) => (
                  // Bấm được để mở chi tiết: trước đây là div trơn, nhìn y hệt dòng
                  // "Phê duyệt chờ xử lý" ngay bên dưới (vốn bấm được) nên người dùng
                  // bấm mãi không ra gì.
                  <div
                    className="li"
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    style={{ cursor: "pointer" }}
                    onClick={() => openScheduleDetail(t)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openScheduleDetail(t);
                      }
                    }}
                  >
                    <div className="ico-sm" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>•</div>
                    <div className="li-body"><div className="li-title">{t.title}</div></div>
                    <span className="small bold muted">{t.time_label || "--"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-head"><h3>Phê duyệt chờ xử lý</h3></div>
              <div className="list">
                {/* Hai dòng dưới bấm được để mở đúng hộp duyệt, riêng dòng này trước
                    đây là div trơn không có onClick — nhìn giống hệt nhau mà chỉ
                    một cái ấn được. Nối vào cùng chỗ với nút "Duyệt lịch báo giảng
                    tháng" ở đầu trang. */}
                <div
                  className="li"
                  {...(canManageSessions
                    ? {
                        role: "button",
                        tabIndex: 0,
                        onClick: handleOpenReviewPlan,
                        onKeyDown: (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleOpenReviewPlan();
                          }
                        },
                        style: { cursor: "pointer", ...((planStatusCounts.submitted || 0) > 0 ? {} : { opacity: 0.6 }) },
                      }
                    : {})}
                >
                  <div className="ico-sm" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>📄</div>
                  <div className="li-body"><div className="li-title">Lịch báo giảng</div></div>
                  <span className="li-end" style={{ color: "var(--primary)" }}>{planStatusCounts.submitted || 0}</span>
                </div>
                {renderStaffApprovalRow("leave_shift", "🗓", "Đơn xin nghỉ / đổi ca", staffPending.leave_shift, canReviewLeaveShift)}
                {renderStaffApprovalRow("proposal", "✎", "Đề xuất - yêu cầu", staffPending.proposal, canReviewProposal)}
              </div>
            </div>

            <div className="card">
              <div className="card-head"><h3>Sự kiện sắp tới</h3></div>
              <div className="list">
                {upcomingSchedules.length === 0 ? (
                  <div className="li"><div className="li-body"><div className="li-sub">Chưa có sự kiện sắp tới.</div></div></div>
                ) : upcomingSchedules.map((e) => (
                  <div
                    className="li"
                    key={e.id}
                    role="button"
                    tabIndex={0}
                    style={{ cursor: "pointer" }}
                    onClick={() => openScheduleDetail(e)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openScheduleDetail(e);
                      }
                    }}
                  >
                    <div style={{ width: 44, textAlign: "center", background: "var(--primary-soft)", borderRadius: 10, padding: "5px 0", flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: "var(--primary)" }}>{e.event_date?.slice(8, 10)}</div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "var(--primary)" }}>THG {Number(e.event_date?.slice(5, 7))}</div>
                    </div>
                    <div className="li-body"><div className="li-title">{e.title}</div><div className="li-sub">⏱ {e.time_label || ""}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {detailSession && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          onClick={() => setDetailSession(null)}
        >
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <header className={styles.modalHeader}>
              <div>
                {detailSession.kind === "session" ? (
                  <>
                    <h2>
                      {`${detailSession.raw.classroom_name || "Lớp"} • ${
                        detailSession.raw.teacher_name || "--"
                      }`}
                    </h2>
                    <p>
                      {formatShortDate(
                        detailSession.raw.session_date || detailSession.raw.start_at,
                      )}{" "}
                      •{" "}
                      {formatTimeRange(
                        detailSession.raw.start_at,
                        detailSession.raw.end_at,
                      ) || "--"}
                    </p>
                  </>
                ) : (
                  <>
                    <h2>{detailSession.raw.title}</h2>
                    <p>
                      {formatShortDate(detailSession.raw.event_date)}
                      {detailSession.raw.time_label
                        ? ` • ${detailSession.raw.time_label}`
                        : ""}
                    </p>
                  </>
                )}
              </div>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Đóng"
                onClick={() => setDetailSession(null)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M6 6 18 18M6 18 18 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </header>
            <div className={styles.modalBody}>
              {detailSession.kind === "session" ? (
                <dl className={styles.detailGrid}>
                  <div>
                    <dt>Trung tâm</dt>
                    <dd>{detailSession.raw.center_name || "--"}</dd>
                  </div>
                  <div>
                    <dt>Hình thức</dt>
                    <dd>
                      {detailSession.raw.delivery_mode === "online" ? "Online" : "Offline"}
                    </dd>
                  </div>
                  <div>
                    <dt>Trạng thái ca</dt>
                    <dd>
                      {sessionStatusOptions.find(
                        (item) => item.value === detailSession.raw.status,
                      )?.label || detailSession.raw.status || "--"}
                    </dd>
                  </div>
                  <div>
                    <dt>Lịch báo giảng</dt>
                    <dd>
                      {teachingPlanStatusOptions[detailSession.raw.teaching_plan_status] ||
                        detailSession.raw.teaching_plan_status ||
                        "--"}
                    </dd>
                  </div>
                  <div className={styles.detailFull}>
                    <dt>Nội dung dạy</dt>
                    <dd>{detailSession.raw.lesson_topic || "—"}</dd>
                  </div>
                  <div className={styles.detailFull}>
                    <dt>Mục tiêu buổi học</dt>
                    <dd>{detailSession.raw.lesson_objective || "—"}</dd>
                  </div>
                  {detailSession.raw.meeting_link ? (
                    <div className={styles.detailFull}>
                      <dt>Link học</dt>
                      <dd>
                        <a
                          href={detailSession.raw.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {detailSession.raw.meeting_link}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <dl className={styles.detailGrid}>
                  <div>
                    <dt>Nhóm công việc</dt>
                    <dd>
                      {WORK_CARDS.find((c) => c.id === detailSession.raw.category)?.label ||
                        detailSession.raw.category}
                    </dd>
                  </div>
                  <div>
                    <dt>Trạng thái</dt>
                    <dd>
                      {scheduleStatusMeta[detailSession.raw.status]?.label ||
                        detailSession.raw.status ||
                        "--"}
                    </dd>
                  </div>
                  <div>
                    <dt>Phụ trách</dt>
                    <dd>
                      {detailSession.raw.assigned_to?.name ||
                        detailSession.raw.assigned_to?.email ||
                        "--"}
                    </dd>
                  </div>
                  <div>
                    <dt>Người tạo</dt>
                    <dd>
                      {detailSession.raw.created_by?.name ||
                        detailSession.raw.created_by?.email ||
                        "--"}
                    </dd>
                  </div>
                  <div className={styles.detailFull}>
                    <dt>Mô tả</dt>
                    <dd>{detailSession.raw.description || "—"}</dd>
                  </div>
                </dl>
              )}
            </div>
            {/* Lịch công tác: trước đây modal chi tiết không có footer nào cho
                loại này nên xem xong không sửa/xoá được gì. */}
            {detailSession.kind === "schedule" && (
              <footer className={styles.modalFooter} style={{ flexWrap: "wrap" }}>
                {scheduleActionError && (
                  <div
                    className={styles.errorNotice}
                    style={{ width: "100%", marginBottom: 4, whiteSpace: "pre-line" }}
                  >
                    {scheduleActionError}
                  </div>
                )}
                {/* Sửa: hiện với ai được nhập loại lịch đó. Backend còn siết thêm
                    một tầng — giáo viên chỉ sửa toàn phần lịch DO MÌNH tạo, lịch
                    người khác tạo thì chỉ đổi được trạng thái. */}
                {calendarTypeOptions.some((c) => c.id === detailSession.raw.category) && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => openEditSchedule(detailSession.raw)}
                  >
                    Sửa
                  </button>
                )}
                {/* Xoá: chỉ admin và super admin. Quản lý cơ sở, quản lý đào tạo
                    và nhân viên đều không thấy nút này, khớp với backend. */}
                {canManageSessions && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    style={{ color: "#c0392b", borderColor: "#e7b6ad", marginLeft: "auto" }}
                    disabled={deletingScheduleId === detailSession.raw.id}
                    onClick={() => handleDeleteSchedule(detailSession.raw)}
                  >
                    {deletingScheduleId === detailSession.raw.id ? "Đang xoá..." : "Xoá"}
                  </button>
                )}
              </footer>
            )}
            {detailSession.kind === "session" && canCreateTeachingPlan && (
              // Không đặt lại gap ở đây: .modalFooter đã là 12px và 4 hộp thoại còn
              // lại đều dùng mức đó, riêng chỗ này từng bị đè xuống 8 nên nhìn chật
              // hơn hẳn phần còn lại của hệ thống.
              <footer className={styles.modalFooter} style={{ flexWrap: "wrap" }}>
                {/* Sửa: backend cho phép teacher/staff PATCH khi lịch chưa được duyệt
                    (đặc biệt cần khi admin yêu cầu sửa -> revision_required). */}
                {(canManageSessions ||
                  (canCreateTeachingPlan &&
                    detailSession.raw.teaching_plan_status !== "approved")) && (
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => openEditSession(detailSession.raw)}
                    >
                      Sửa
                    </button>
                  )}
                {/* Xoá: backend destroy chỉ cho admin/superadmin. */}
                {canManageSessions && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    style={{ color: "#c0392b", borderColor: "#e7b6ad" }}
                    disabled={deletingSessionId === detailSession.raw.id}
                    onClick={() => handleDeleteSession(detailSession.raw)}
                  >
                    {deletingSessionId === detailSession.raw.id ? "Đang xoá..." : "Xoá"}
                  </button>
                )}
                <button
                  type="button"
                  className={styles.primaryButton}
                  // Nới thêm trước hành động chính: nó nằm ngay cạnh "Xoá", mà hai
                  // nút sát nhau thì rất dễ bấm nhầm sang nút xoá.
                  style={{ marginLeft: 6 }}
                  onClick={() => {
                    const sessionId = detailSession.raw.id;
                    setDetailSession(null);
                    openReportModal(sessionId);
                  }}
                >
                  Nhập báo cáo sau ca dạy
                </button>
              </footer>
            )}
          </div>
        </div>
      )}

      {isReviewOpen && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={`${styles.modal} ${styles.reviewModal}`}>
            <header className={styles.modalHeader}>
              <div>
                <h2>Duyệt lịch báo giảng tháng</h2>
                <p>{reviewScopeLabel}</p>
              </div>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Đóng"
                onClick={() => setIsReviewOpen(false)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M6 6 18 18M6 18 18 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </header>
            <div className={styles.modalBody}>
              <div className={styles.reviewFilterGrid}>
                <label className={styles.formGroup}>
                  <span>Trung tâm</span>
                  <CenterField
                    centers={centers}
                    value={reviewCenterId}
                    onChange={(event) => {
                      setReviewCenterId(event.target.value);
                      setReviewClassroomId("");
                    }}
                    placeholder="Tất cả trung tâm"
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Lớp</span>
                  <select
                    value={reviewClassroomId}
                    disabled={!reviewCenterId}
                    onChange={(event) => setReviewClassroomId(event.target.value)}
                  >
                    <option value="">Tất cả lớp</option>
                    {reviewClassrooms.map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.formGroup}>
                  <span>Giáo viên</span>
                  <select
                    value={reviewTeacherId}
                    onChange={(event) => setReviewTeacherId(event.target.value)}
                  >
                    <option value="">Tất cả giáo viên</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {[teacher.user?.last_name, teacher.user?.first_name]
                          .filter(Boolean)
                          .join(" ") || teacher.user?.email || `GV ${teacher.id}`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {reviewSessions.some((s) => s.teaching_plan_status === "submitted") && (
                <div style={{ display: "flex", justifyContent: "flex-end", margin: "4px 0 10px" }}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={handleApproveAllPlans}
                    disabled={approveAllLoading || Boolean(reviewActionSessionId)}
                  >
                    {approveAllLoading
                      ? "Đang duyệt..."
                      : `Duyệt tất cả (${
                          reviewSessions.filter((s) => s.teaching_plan_status === "submitted").length
                        })`}
                  </button>
                </div>
              )}
              {reviewError && <div className={styles.errorNotice}>{reviewError}</div>}
              <div className={styles.reviewList}>
                {reviewLoading ? (
                  <div className={styles.reviewEmpty}>Đang tải lịch chờ duyệt...</div>
                ) : reviewSessions.length ? (
                  reviewSessions.map((session) => (
                    <article key={session.id} className={styles.reviewSessionCard}>
                      <div>
                        <strong>{session.classroom_name}</strong>
                        <span>{session.teacher_name}</span>
                      </div>
                      <div>
                        <strong>{formatShortDate(session.session_date)}</strong>
                        <span>{formatTimeRange(session.start_at, session.end_at)}</span>
                      </div>
                      <div>
                        <strong>
                          {formatStatusLabel(
                            teachingPlanStatusOptions,
                            session.teaching_plan_status,
                          )}
                        </strong>
                        <span>
                          {formatStatusLabel(sessionStatusOptions, session.status)}
                        </span>
                      </div>
                      <div className={styles.reviewActionCell}>
                        <button
                          type="button"
                          className={styles.reviewActionButton}
                          aria-label="Mở hành động duyệt"
                          title="Hành động"
                          disabled={
                            reviewActionSessionId === session.id ||
                            session.teaching_plan_status !== "submitted"
                          }
                          onClick={() =>
                            setOpenReviewActionId((current) =>
                              current === session.id ? null : session.id,
                            )
                          }
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path
                              d="M12 7.25a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Zm0 6.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Zm0 6.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                        {openReviewActionId === session.id && (
                          <div className={styles.reviewActionMenu}>
                            <button
                              type="button"
                              onClick={() => {
                                openReviewReasonDialog(session, "request-revision");
                              }}
                            >
                              Yêu cầu sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                openReviewReasonDialog(session, "reject");
                              }}
                            >
                              Từ chối
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenReviewActionId(null);
                                handleReviewSessionPlan(session.id, "approve");
                              }}
                            >
                              Duyệt
                            </button>
                          </div>
                        )}
                      </div>
                      <p>
                        {session.lesson_topic || "Chưa nhập chủ đề"}
                        {session.lesson_objective
                          ? ` • ${truncateText(session.lesson_objective, 80)}`
                          : ""}
                      </p>
                      <div className={styles.reviewSessionDetailGrid}>
                        <span>
                          <strong>Trung tâm</strong>
                          {session.center_name || "--"}
                        </span>
                        <span>
                          <strong>Tuần</strong>
                          {session.teaching_plan_week
                            ? `Tuần ${session.teaching_plan_week}`
                            : "--"}
                        </span>
                        <span>
                          <strong>Hình thức</strong>
                          {session.delivery_mode || "--"}
                        </span>
                        <span>
                          <strong>Gửi duyệt</strong>
                          {formatDateTime(session.teaching_plan_submitted_at)}
                        </span>
                        {session.meeting_link && (
                          <span>
                            <strong>Link học</strong>
                            <a
                              href={session.meeting_link}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {truncateText(session.meeting_link, 52)}
                            </a>
                          </span>
                        )}
                        {session.teaching_plan_review_note && (
                          <span>
                            <strong>Ghi chú</strong>
                            {session.teaching_plan_review_note}
                          </span>
                        )}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className={styles.reviewEmpty}>
                    Không có ca nào đang chờ duyệt trong phạm vi này.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {reviewReasonTarget && (
        <div className={styles.reasonDialogBackdrop} role="dialog" aria-modal="true">
          <form className={styles.reasonDialog} onSubmit={handleSubmitReviewReason}>
            <header className={styles.reasonDialogHeader}>
              <div>
                <h3>{reviewDecisionLabels[reviewReasonTarget.decision]}</h3>
                <p>
                  {reviewReasonTarget.session.classroom_name} •{" "}
                  {formatShortDate(reviewReasonTarget.session.session_date)} •{" "}
                  {formatTimeRange(
                    reviewReasonTarget.session.start_at,
                    reviewReasonTarget.session.end_at,
                  )}
                </p>
              </div>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Đóng"
                onClick={closeReviewReasonDialog}
                disabled={reviewActionSessionId === reviewReasonTarget.session.id}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M6 6 18 18M6 18 18 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </header>
            <label className={styles.formGroup}>
              <span>Lý do</span>
              <textarea
                rows={5}
                value={reviewReasonText}
                onChange={(event) => {
                  setReviewReasonText(event.target.value);
                  setReviewReasonError("");
                }}
                placeholder={
                  reviewReasonTarget.decision === "reject"
                    ? "Nhập lý do từ chối lịch này"
                    : "Nhập nội dung cần giáo viên/nhân viên chỉnh sửa"
                }
              />
            </label>
            {reviewReasonError && (
              <div className={styles.errorNotice}>{reviewReasonError}</div>
            )}
            <div className={styles.reasonDialogFooter}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={closeReviewReasonDialog}
                disabled={reviewActionSessionId === reviewReasonTarget.session.id}
              >
                Hủy
              </button>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={reviewActionSessionId === reviewReasonTarget.session.id}
              >
                {reviewActionSessionId === reviewReasonTarget.session.id
                  ? "Đang gửi..."
                  : "Gửi"}
              </button>
            </div>
          </form>
        </div>
      )}

      {isCreateOpen && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <header className={styles.modalHeader}>
              <h2>
                {editingSessionId
                  ? "Sửa ca dạy"
                  : createForm.calendar_type === "teaching_plan"
                    ? "Tạo ca dạy thủ công"
                    : `${editingScheduleId ? "Sửa lịch" : "Thêm lịch"} ${
                        WORK_CARDS.find((c) => c.id === createForm.calendar_type)?.fullLabel || ""
                      }`}
              </h2>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Đóng"
                onClick={() => { setIsCreateOpen(false); setEditingSessionId(null); setEditingScheduleId(null); setEditingScheduleRaw(null); }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M6 6 18 18M6 18 18 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </header>
            <form className={styles.modalBody} onSubmit={handleCreateSession}>
              <div className={styles.formGrid}>
                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>Loại lịch</span>
                  <select
                    value={createForm.calendar_type}
                    disabled={Boolean(editingSessionId || editingScheduleId)}
                    onChange={(event) => {
                      const loai = event.target.value;
                      setCreateError("");
                      setCreateForm((prev) => ({ ...prev, calendar_type: loai }));
                    }}
                  >
                    {calendarTypeOptions.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.fullLabel}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {createForm.calendar_type === "teaching_plan" ? (
              <>
              <p className={styles.note}>
                Chọn ngày hiện tại hoặc tương lai. Hệ thống tự xác định tuần, tháng và năm
                theo ngày bắt đầu.
              </p>
              <div className={styles.formGrid}>
                <label className={styles.formGroup}>
                  <span>Lớp</span>
                  <select
                    value={createForm.classroom}
                    // Giáo viên sửa ca dạy: backend không nhận đổi lớp -> khoá lại
                    // để không đổi mà tưởng có tác dụng.
                    disabled={Boolean(editingSessionId) && isTeacherRole}
                    onChange={(event) => {
                      const classroomId = event.target.value;
                      const selectedClassroom = createClassrooms.find(
                        (classroom) => String(classroom.id) === String(classroomId),
                      );
                      setCreateForm((prev) => ({
                        ...prev,
                        classroom: classroomId,
                        center:
                          selectedClassroom?.center?.id ||
                          selectedClassroom?.center_id ||
                          "",
                      }));
                    }}
                  >
                    <option value="">Chọn lớp</option>
                    {createClassrooms.map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.class_code && classroom.class_code !== classroom.name
                          ? `${classroom.class_code} - ${classroom.name}`
                          : classroom.name}
                      </option>
                    ))}
                  </select>
                </label>

                {canSelectTeacherForCreate ? (
                  <label className={styles.formGroup}>
                    <span>Giáo viên</span>
                    <select
                      value={createForm.teacher}
                      onChange={(event) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          teacher: event.target.value,
                        }))
                      }
                    >
                      <option value="">Chọn giáo viên</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {[teacher.user?.last_name, teacher.user?.first_name]
                            .filter(Boolean)
                            .join(" ") || teacher.user?.email || `GV ${teacher.id}`}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className={styles.formGroup}>
                    <span>Giáo viên</span>
                    <strong>Tài khoản hiện tại</strong>
                  </div>
                )}

                <label className={styles.formGroup}>
                  <span>Bắt đầu</span>
                  <input
                    type="datetime-local"
                    value={createForm.start_at}
                    min={`${todayString}T00:00`}
                    onChange={(event) => {
                      const value = event.target.value;
                      const [year, month, day] = value.slice(0, 10).split("-").map(Number);
                      setCreateForm((prev) => {
                        // Kéo giờ kết thúc theo ngày bắt đầu; nếu end không còn
                        // sau start thì mặc định +90 phút để luôn hợp lệ.
                        let nextEnd = prev.end_at;
                        if (value && value.length >= 16) {
                          if (nextEnd && nextEnd.length >= 16) {
                            nextEnd = `${value.slice(0, 10)}T${nextEnd.slice(11, 16)}`;
                          }
                          if (!nextEnd || nextEnd <= value) {
                            nextEnd = addMinutesToLocalInput(value, 90);
                          }
                        }
                        return {
                          ...prev,
                          start_at: value,
                          end_at: nextEnd,
                          teaching_plan_month: month || prev.teaching_plan_month,
                          teaching_plan_year: year || prev.teaching_plan_year,
                          teaching_plan_week: day && year && month
                            ? getWeekIndexFromDate(year, month, day)
                            : prev.teaching_plan_week,
                        };
                      });
                    }}
                  />
                </label>

                <label className={styles.formGroup}>
                  <span>Kết thúc</span>
                  <input
                    type="datetime-local"
                    value={createForm.end_at}
                    min={`${todayString}T00:00`}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        end_at: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className={styles.formGroup}>
                  <span>Hình thức</span>
                  <select
                    value={createForm.delivery_mode}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        delivery_mode: event.target.value,
                      }))
                    }
                  >
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </label>

                <label className={styles.formGroup}>
                  <span>Trạng thái</span>
                  <select
                    value={createForm.status}
                    // Giáo viên sửa ca dạy: backend không nhận đổi trạng thái ca.
                    disabled={Boolean(editingSessionId) && isTeacherRole}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        status: event.target.value,
                      }))
                    }
                  >
                    {sessionStatusUpdateOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>Meeting link</span>
                  <input
                    type="text"
                    placeholder="https://meet.google.com/..."
                    value={createForm.meeting_link}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        meeting_link: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>Chủ đề bài dạy</span>
                  <input
                    type="text"
                    placeholder="Unit, lesson hoặc nội dung báo giảng"
                    value={createForm.lesson_topic}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        lesson_topic: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>Mục tiêu ca dạy</span>
                  <textarea
                    rows={3}
                    value={createForm.lesson_objective}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        lesson_objective: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              </>
              ) : (
              <div className={styles.formGrid}>
                <label className={styles.formGroup}>
                  <span>Ngày thực hiện</span>
                  <input
                    type="date"
                    value={createForm.sc_date}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, sc_date: event.target.value }))
                    }
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Hạng mục</span>
                  <input
                    type="text"
                    placeholder="Ví dụ: Lớp học, Tuyển sinh, Thu chi"
                    value={createForm.sc_subcategory}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, sc_subcategory: event.target.value }))
                    }
                  />
                </label>
                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>Nội dung công việc</span>
                  <input
                    type="text"
                    placeholder="Ví dụ: Kiểm tra sĩ số lớp 501"
                    value={createForm.sc_title}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, sc_title: event.target.value }))
                    }
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Thời gian</span>
                  <input
                    type="text"
                    placeholder="Ví dụ: 08:00 - 09:30 hoặc Cả ngày"
                    value={createForm.sc_time_label}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, sc_time_label: event.target.value }))
                    }
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Trạng thái</span>
                  <select
                    value={createForm.sc_status}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, sc_status: event.target.value }))
                    }
                  >
                    {Object.entries(scheduleStatusMeta).map(([ma, meta]) => (
                      <option key={ma} value={ma}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.formGroup}>
                  <span>Người phụ trách</span>
                  <select
                    value={createForm.sc_assignee}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, sc_assignee: event.target.value }))
                    }
                  >
                    <option value="">Chưa giao cho ai</option>
                    {assignableUsers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                        {item.email ? ` — ${item.email}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>Mô tả chi tiết</span>
                  <textarea
                    rows={3}
                    value={createForm.sc_description}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, sc_description: event.target.value }))
                    }
                  />
                </label>
              </div>
              )}
              {createError && <div className={styles.errorNotice}>{createError}</div>}
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => { setIsCreateOpen(false); setEditingSessionId(null); setEditingScheduleId(null); setEditingScheduleRaw(null); }}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={createLoading}
                >
                  {createLoading
                    ? "Đang lưu..."
                    : editingSessionId
                      ? "Lưu thay đổi"
                      : editingScheduleId
                        ? "Lưu thay đổi"
                        : createForm.calendar_type === "teaching_plan"
                          ? "Tạo ca dạy"
                          : "Tạo lịch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isStaffCreateOpen && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <header className={styles.modalHeader}>
              <h2>Tạo đơn nhân sự</h2>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Đóng"
                onClick={() => setIsStaffCreateOpen(false)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M6 6 18 18M6 18 18 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </header>
            <form className={styles.modalBody} onSubmit={handleCreateStaffRequest}>
              <p className={styles.note}>
                Đơn xin nghỉ / đổi ca do quản lý đào tạo duyệt; đề xuất - yêu cầu do quản lý cơ sở duyệt.
              </p>
              <div className={styles.formGrid}>
                <label className={styles.formGroup}>
                  <span>Loại đơn</span>
                  <select
                    value={staffCreateForm.request_type}
                    onChange={(event) =>
                      setStaffCreateForm((prev) => ({ ...prev, request_type: event.target.value }))
                    }
                  >
                    {staffRequestTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.formGroup}>
                  <span>Trung tâm</span>
                  <CenterField
                    centers={centers}
                    value={staffCreateForm.center}
                    onChange={(event) =>
                      setStaffCreateForm((prev) => ({ ...prev, center: event.target.value }))
                    }
                    placeholder="Không gắn trung tâm"
                  />
                </label>
                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>Tiêu đề</span>
                  <input
                    type="text"
                    maxLength={255}
                    placeholder="VD: Xin nghỉ 1 ngày / Đề xuất trang bị bảng phụ..."
                    value={staffCreateForm.title}
                    onChange={(event) =>
                      setStaffCreateForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                  />
                </label>
                {(staffCreateForm.request_type === "leave" ||
                  staffCreateForm.request_type === "shift_change") && (
                  <label className={styles.formGroup}>
                    <span>{staffCreateForm.request_type === "leave" ? "Từ ngày" : "Ngày áp dụng"}</span>
                    <input
                      type="date"
                      value={staffCreateForm.start_date}
                      onChange={(event) =>
                        setStaffCreateForm((prev) => ({ ...prev, start_date: event.target.value }))
                      }
                    />
                  </label>
                )}
                {staffCreateForm.request_type === "leave" && (
                  <label className={styles.formGroup}>
                    <span>Đến ngày</span>
                    <input
                      type="date"
                      min={staffCreateForm.start_date || undefined}
                      value={staffCreateForm.end_date}
                      onChange={(event) =>
                        setStaffCreateForm((prev) => ({ ...prev, end_date: event.target.value }))
                      }
                    />
                  </label>
                )}
                {staffCreateForm.request_type === "shift_change" && (
                  <label className={styles.formGroup}>
                    <span>Ca mong muốn</span>
                    <input
                      type="text"
                      maxLength={200}
                      placeholder="VD: T6 18:00 - 19:30"
                      value={staffCreateForm.desired_shift}
                      onChange={(event) =>
                        setStaffCreateForm((prev) => ({ ...prev, desired_shift: event.target.value }))
                      }
                    />
                  </label>
                )}
                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>Lý do / nội dung</span>
                  <textarea
                    rows={4}
                    value={staffCreateForm.reason}
                    onChange={(event) =>
                      setStaffCreateForm((prev) => ({ ...prev, reason: event.target.value }))
                    }
                  />
                </label>
              </div>
              {staffCreateError && <div className={styles.errorNotice}>{staffCreateError}</div>}
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setIsStaffCreateOpen(false)}
                >
                  Đóng
                </button>
                <button type="submit" className={styles.primaryButton} disabled={staffCreateLoading}>
                  {staffCreateLoading ? "Đang gửi..." : "Gửi đơn"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {staffReviewGroup && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={`${styles.modal} ${styles.reviewModal}`}>
            <header className={styles.modalHeader}>
              <div>
                <h2>{STAFF_REQUEST_GROUPS[staffReviewGroup]?.label}</h2>
                <p>
                  Duyệt bởi {STAFF_REQUEST_GROUPS[staffReviewGroup]?.reviewer} • Đơn đang chờ duyệt
                </p>
              </div>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Đóng"
                onClick={closeStaffReview}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M6 6 18 18M6 18 18 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </header>
            <div className={styles.modalBody}>
              {staffReviewError && <div className={styles.errorNotice}>{staffReviewError}</div>}
              <div className={styles.reviewList}>
                {staffReviewLoading ? (
                  <div className={styles.reviewEmpty}>Đang tải danh sách đơn...</div>
                ) : staffReviewItems.length ? (
                  staffReviewItems.map((item) => {
                    const canAct = canReviewStaffType(item.request_type);
                    const busy = staffActionId === item.id;
                    return (
                      <article
                        key={item.id}
                        style={{
                          border: "1px solid #f0e4d7",
                          borderRadius: 14,
                          background: "#fff",
                          padding: 14,
                          boxShadow: "0 8px 16px rgba(15,23,42,0.04)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                          <strong style={{ fontSize: 15, color: "#43301f" }}>{item.title}</strong>
                          {/* Modal này nằm NGOÀI .v4page nên var(--primary) không tồn tại
                              -> nhãn mất hẳn nền cam. Dùng màu thật cho chắc. */}
                          <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: "#F26522", background: "#FEF0E6", borderRadius: 999, padding: "3px 10px" }}>
                            {staffRequestTypeLabels[item.request_type] || item.request_type}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: "#7d8592", display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
                          <span>👤 {item.submitted_by?.name || "--"}</span>
                          {item.center_name && <span>🏢 {item.center_name}</span>}
                          {item.start_date && (
                            <span>
                              📅 {item.start_date}
                              {item.end_date && item.end_date !== item.start_date ? ` → ${item.end_date}` : ""}
                            </span>
                          )}
                          {item.desired_shift && <span>🔄 {item.desired_shift}</span>}
                        </div>
                        {item.reason && (
                          <p style={{ margin: 0, fontSize: 13, color: "#43301f" }}>{item.reason}</p>
                        )}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 2 }}>
                          {canAct &&
                          (isAdminRole ||
                            String(item.submitted_by?.id ?? item.submitted_by) !== String(currentUserId)) ? (
                            <>
                              <button
                                type="button"
                                className={styles.secondaryButton}
                                disabled={busy}
                                onClick={() => handleStaffReview(item, "reject")}
                              >
                                Từ chối
                              </button>
                              <button
                                type="button"
                                className={styles.primaryButton}
                                disabled={busy}
                                onClick={() => handleStaffReview(item, "approve")}
                              >
                                {busy ? "Đang xử lý..." : "Duyệt"}
                              </button>
                            </>
                          ) : (
                            <span className={styles.note} style={{ margin: 0 }}>
                              {canAct &&
                              String(item.submitted_by?.id ?? item.submitted_by) ===
                                String(currentUserId)
                                ? "Không thể tự duyệt đơn của chính mình."
                                : "Bạn không có quyền duyệt loại đơn này."}
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className={styles.reviewEmpty}>Không có đơn nào chờ duyệt.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {xoaThangDangHoi && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.reasonDialog}>
            <header className={styles.modalHeader}>
              <div>
                <h2>Xoá toàn bộ lịch tháng {pad2(selectedMonth)}/{selectedYear}?</h2>
                <p>Việc này không hoàn tác được.</p>
              </div>
            </header>
            <div className={styles.modalBody}>
              {xoaThangDangHoi.sessions + xoaThangDangHoi.schedules === 0 ? (
                <p>Tháng này chưa có lịch nào để xoá.</p>
              ) : (
                <>
                  <p>Hệ thống sẽ xoá:</p>
                  <ul>
                    {xoaThangDangHoi.sessions > 0 && (
                      <li><strong>{xoaThangDangHoi.sessions}</strong> ca dạy</li>
                    )}
                    {xoaThangDangHoi.schedules > 0 && (
                      <li>
                        <strong>{xoaThangDangHoi.schedules}</strong> đầu việc lịch công tác
                        {Object.keys(xoaThangDangHoi.by_category).length > 0 && (
                          <span className="small muted">
                            {" "}
                            ({Object.entries(xoaThangDangHoi.by_category)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(", ")})
                          </span>
                        )}
                      </li>
                    )}
                  </ul>
                  {/* Nói thẳng phần mất kèm: ba bảng này CASCADE theo ca dạy, không
                      cảnh báo thì người dùng tưởng chỉ mất mỗi dòng lịch. */}
                  {(xoaThangDangHoi.reports > 0 ||
                    xoaThangDangHoi.attendances > 0 ||
                    xoaThangDangHoi.evidences > 0) && (
                    <div className={styles.errorNotice}>
                      Xoá ca dạy sẽ mất theo:{" "}
                      {[
                        xoaThangDangHoi.reports && `${xoaThangDangHoi.reports} báo cáo ca dạy`,
                        xoaThangDangHoi.attendances && `${xoaThangDangHoi.attendances} dòng điểm danh học viên`,
                        xoaThangDangHoi.evidences && `${xoaThangDangHoi.evidences} bằng chứng điểm danh`,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                      .
                    </div>
                  )}
                </>
              )}
              {xoaThangLoi && <div className={styles.errorNotice}>{xoaThangLoi}</div>}
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setXoaThangDangHoi(null)}
                disabled={xoaThangDangChay}
              >
                Huỷ
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                style={{ background: "#c0332a", borderColor: "#c0332a" }}
                onClick={xacNhanXoaThang}
                disabled={
                  xoaThangDangChay ||
                  xoaThangDangHoi.sessions + xoaThangDangHoi.schedules === 0
                }
              >
                {xoaThangDangChay ? "Đang xoá..." : "Xoá vĩnh viễn"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isImportOpen && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <header className={styles.modalHeader}>
              <div>
                <h2>Nhập lịch dạy từ Excel</h2>
                <p>
                  Tải file mẫu, điền vào sheet <b>{SHEET_NAMES.teaching_plan}</b> rồi nhập lên.
                  {coQuyenLichCongTac
                    ? " Nếu file còn các sheet lịch công tác đã điền, hệ thống nhập luôn trong cùng một lượt."
                    : ""}
                </p>
              </div>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Đóng"
                onClick={() => setIsImportOpen(false)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M6 6 18 18M6 18 18 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </header>
            <form className={styles.modalBody} onSubmit={handleImportSubmit}>
              {canManageSessions && <div className={styles.tabs} aria-label="Loại file nhập">
                <button
                  type="button"
                  className={`${styles.tab} ${importMode === "teaching" ? styles["tab--active"] : ""}`}
                  onClick={() => {
                    setImportMode("teaching");
                    setImportError("");
                    setImportResult(null);
                  }}
                >
                  Lịch dạy
                </button>
                <button
                  type="button"
                  className={`${styles.tab} ${importMode === "schedule" ? styles["tab--active"] : ""}`}
                  onClick={() => {
                    setImportMode("schedule");
                    setImportError("");
                    setImportResult(null);
                  }}
                >
                  Lịch công tác
                </button>
              </div>}
              <p className={styles.note}>
                {importMode === "schedule"
                  ? `File mẫu có mỗi loại lịch một sheet: ${SCHEDULE_SHEET_TYPES.map((t) => SHEET_NAMES[t]).join(", ")}. Điền vào sheet của đúng loại việc; sheet nào không dùng thì để trống. Mẫu cũ dạng BÁO CÁO T2-CN và KẾ HOẠCH LÀM VIỆC vẫn nhập được.`
                  : `Hệ thống đọc sheet "${SHEET_NAMES.teaching_plan}" với các cột: Trung tâm, Lớp, ${isTeacherRole ? "" : "Giáo viên, "}Ngày dạy, Giờ bắt đầu, Giờ kết thúc, Hình thức, Chủ đề bài học, Ghi chú. Nhập bằng file CHO PHÉP cả ngày đã qua, nên giữ nguyên các buổi đã dạy trong tháng.`}{" "}
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={handleDownloadImportTemplate}
                >
                  Tải file mẫu
                </button>
              </p>
              <div className={styles.formGrid}>
                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>Chọn file Excel</span>
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={(event) => setImportFile(event.target.files?.[0] || null)}
                  />
                </label>
              </div>
              {importError && <div className={styles.errorNotice}>{importError}</div>}
              {importResult && (
                <div className={styles.note}>
                  <p>
                    Đã nhập thành công {importResult.success_count || 0} dòng
                    {importResult.error_count ? `, ${importResult.error_count} dòng lỗi:` : "."}
                  </p>
                  {/* Tách theo LOẠI LỊCH: một lượt nhập nay chạm cả hai model,
                      chỉ một con số tổng thì không biết phần nào vào được. */}
                  {Array.isArray(importResult.theo_loai) && importResult.theo_loai.length > 1 && (
                    <ul>
                      {importResult.theo_loai.map((item) => (
                        <li key={item.ten}>
                          <strong>{item.ten}</strong>: {item.success_count} dòng
                          {item.error_count ? `, ${item.error_count} lỗi` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* File mẫu mới có nhiều sheet nên cần biết sheet nào vào được
                      bao nhiêu — chỉ một con số tổng thì không đủ để dò lỗi. */}
                  {Array.isArray(importResult.sheets) && importResult.sheets.length > 0 && (
                    <ul>
                      {importResult.sheets.map((item) => (
                        <li key={item.sheet}>
                          <strong>{item.sheet}</strong>: {item.success_count || 0} việc
                          {item.error_count ? `, ${item.error_count} lỗi` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                  {importErrorItems.length > 0 && (
                    <ul>
                      {importErrorItems.map((item, index) => (
                        <li key={item.row || item.id || index}>
                          {typeof item === "string"
                            ? item
                            : `Dòng ${item.row || index + 1}: ${item.message || item.detail || "Không rõ lỗi"}`}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setIsImportOpen(false)}
                >
                  Đóng
                </button>
                <button type="submit" className={styles.primaryButton} disabled={importLoading}>
                  {importLoading ? "Đang nhập..." : "Nhập lịch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reportSessionId && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <header className={styles.modalHeader}>
              <h2>Báo cáo buổi học</h2>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Đóng"
                onClick={closeReportModal}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M6 6 18 18M6 18 18 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </header>
            <form className={styles.modalBody} onSubmit={handleReportFormSubmit}>
              <div className={styles.formGrid}>
                <label className={styles.formGroup}>
                  <span>Tên lớp</span>
                  <input type="text" value={activeReportSession?.classroom_name || ""} readOnly />
                </label>
                <label className={styles.formGroup}>
                  <span>Ca dạy</span>
                  <input
                    type="text"
                    readOnly
                    value={
                      activeReportSession
                        ? formatTimeRange(activeReportSession.start_at, activeReportSession.end_at)
                        : ""
                    }
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Sĩ số</span>
                  <input
                    type="number"
                    min="0"
                    value={reportForm.student_count}
                    onChange={(event) =>
                      setReportForm((prev) => ({ ...prev, student_count: event.target.value }))
                    }
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Đánh giá mục tiêu</span>
                  <select
                    value={reportForm.objective_status}
                    onChange={(event) =>
                      setReportForm((prev) => ({ ...prev, objective_status: event.target.value }))
                    }
                  >
                    {objectiveStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>Điểm danh / sĩ số chi tiết</span>
                  <textarea
                    rows={2}
                    value={reportForm.attendance_summary}
                    onChange={(event) =>
                      setReportForm((prev) => ({ ...prev, attendance_summary: event.target.value }))
                    }
                  />
                </label>
                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>Nội dung dạy</span>
                  <textarea
                    rows={3}
                    value={reportForm.content_taught}
                    onChange={(event) =>
                      setReportForm((prev) => ({ ...prev, content_taught: event.target.value }))
                    }
                  />
                </label>
                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>Đánh giá sau buổi học</span>
                  <textarea
                    rows={3}
                    value={reportForm.session_evaluation}
                    onChange={(event) =>
                      setReportForm((prev) => ({ ...prev, session_evaluation: event.target.value }))
                    }
                  />
                </label>
                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>Định hướng buổi sau</span>
                  <textarea
                    rows={3}
                    value={reportForm.next_session_plan}
                    onChange={(event) =>
                      setReportForm((prev) => ({ ...prev, next_session_plan: event.target.value }))
                    }
                  />
                </label>
                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>Bài tập giao</span>
                  <textarea
                    rows={2}
                    value={reportForm.homework_assigned}
                    onChange={(event) =>
                      setReportForm((prev) => ({ ...prev, homework_assigned: event.target.value }))
                    }
                  />
                </label>
                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>Ghi chú rủi ro học sinh (nếu có)</span>
                  <textarea
                    rows={2}
                    value={reportForm.student_risk_summary}
                    onChange={(event) =>
                      setReportForm((prev) => ({ ...prev, student_risk_summary: event.target.value }))
                    }
                  />
                </label>
                <div className={`${styles.checkboxGroup} ${styles.formGroupFull}`}>
                  <label className={styles.checkOption}>
                    <input
                      type="checkbox"
                      checked={reportForm.is_reported}
                      onChange={(event) =>
                        setReportForm((prev) => ({
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
                      checked={reportForm.reported_on_zalo}
                      onChange={(event) =>
                        setReportForm((prev) => ({
                          ...prev,
                          reported_on_zalo: event.target.checked,
                        }))
                      }
                    />
                    <span>Đã báo cáo trên Zalo</span>
                  </label>
                </div>
              </div>
              <p className={styles.note}>
                Trạng thái báo cáo:{" "}
                {activeReport ? reportStatusOptions[activeReport.report_status] || activeReport.report_status : "Chưa tạo"}
                {" • "}Đã báo cáo qua Zalo:{" "}
                {activeReport?.reported_on_zalo ? "Đã gửi" : "Chưa gửi"}
              </p>
              {reportError && <div className={styles.errorNotice}>{reportError}</div>}
              <div className={styles.modalFooter}>
                <button type="button" className={styles.secondaryButton} onClick={closeReportModal}>
                  Đóng
                </button>
                <button
                  type="submit"
                  className={styles.secondaryButton}
                  disabled={reportSaving || (activeReport && !["draft", "revision_required"].includes(activeReport.report_status))}
                >
                  {reportSaving ? "Đang lưu..." : "Lưu nháp"}
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={reportSaving || (activeReport && !["draft", "revision_required"].includes(activeReport.report_status))}
                  onClick={() => saveSessionReport({ thenSubmit: true })}
                >
                  {reportSaving ? "Đang gửi..." : "Đã báo cáo — Gửi duyệt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </>
  );
}

export default CalendarDetail;
