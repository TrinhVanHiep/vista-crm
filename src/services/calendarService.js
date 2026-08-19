import apiClient from "./apiClient";

const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) {
    return {
      results: payload,
      count: payload.length,
      next: null,
      previous: null,
    };
  }

  return {
    results: Array.isArray(payload?.results) ? payload.results : [],
    count: Number(payload?.count) || 0,
    next: payload?.next || null,
    previous: payload?.previous || null,
  };
};

export async function listTeachingSessions(params = {}) {
  const { data } = await apiClient.get("/teaching-sessions/", { params });
  return normalizeCollection(data);
}

export async function listSchedules(params = {}) {
  const { data } = await apiClient.get("/schedules/schedules/", { params });
  return normalizeCollection(data);
}

export async function getScheduleSummary(params = {}) {
  const { data } = await apiClient.get("/dashboard/schedule_summary/", { params });
  return data || {};
}

// Đơn nhân sự: nghỉ / đổi ca / đề xuất - yêu cầu.
export async function listStaffRequests(params = {}) {
  const { data } = await apiClient.get("/staff-requests/", { params });
  return normalizeCollection(data);
}

export async function getStaffRequestPendingSummary(params = {}) {
  const { data } = await apiClient.get("/staff-requests/pending-summary/", { params });
  return data || { leave_shift: 0, proposal: 0, total: 0 };
}

export async function createStaffRequest(payload) {
  const { data } = await apiClient.post("/staff-requests/", payload);
  return data;
}

export async function reviewStaffRequest(requestId, payload) {
  const { data } = await apiClient.post(`/staff-requests/${requestId}/review/`, payload);
  return data;
}

// --- Truyền thông (kế hoạch nội dung + nghiệm thu) --------------------------
// Các tham số lọc backend hỗ trợ cho /media-reports/ và /media-reports/summary/.
const MEDIA_REPORT_PARAM_KEYS = [
  "year",
  "month",
  "week", // 1-5, tuần trong tháng
  "program", // khớp gần đúng program_name
  "classroom", // id lớp hoặc mã lớp
  "status", // draft | submitted | approved
  "channel", // zalo | facebook | youtube | tiktok | website
  "search",
  "center",
  "report_date",
  "date_from",
  "date_to",
  "page",
  "page_size",
];

// Bỏ các tham số rỗng để không gửi ?status=&program= lên API.
function cleanMediaParams(params = {}) {
  const cleaned = {};
  MEDIA_REPORT_PARAM_KEYS.forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null || value === "") return;
    cleaned[key] = value;
  });
  return cleaned;
}

export async function listMediaReports(params = {}) {
  const { data } = await apiClient.get("/media-reports/", {
    params: cleanMediaParams(params),
  });
  return normalizeCollection(data);
}

// API phân trang mặc định 10 bản ghi/trang -> gom đủ trang cho màn kế hoạch.
export async function listAllMediaReports(params = {}, maxPages = 30) {
  const results = [];
  let count = 0;
  for (let page = 1; page <= maxPages; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const chunk = await listMediaReports({ ...params, page });
    results.push(...chunk.results);
    count = chunk.count || results.length;
    if (!chunk.next || !chunk.results.length) break;
  }
  return { results, count: count || results.length };
}

export async function getMediaSummary(params = {}) {
  const { data } = await apiClient.get("/media-reports/summary/", {
    params: cleanMediaParams(params),
  });
  return (
    data || {
      campaigns: 0,
      this_week: 0,
      pending_acceptance: 0,
      completion_rate: 0,
      classes_active: 0,
      programs_active: 0,
      by_channel: [],
      acceptance: {},
      upcoming: [],
    }
  );
}

export async function createMediaReport(payload) {
  const { data } = await apiClient.post("/media-reports/", payload);
  return data;
}

// Cập nhật nội dung truyền thông: trạng thái, nghiệm thu, chỉ số thực tế.
export async function updateMediaReport(reportId, payload) {
  const { data } = await apiClient.patch(`/media-reports/${reportId}/`, payload);
  return data;
}

export async function listTuitionRecords(params = {}) {
  const { data } = await apiClient.get("/tuition-records/", { params });
  return normalizeCollection(data);
}

export async function getTuitionSummary(params = {}) {
  const { data } = await apiClient.get("/tuition-records/summary/", { params });
  return data || { total_fee: 0, collected: 0, discount: 0, remaining: 0, students: 0, by_class: [] };
}

// Tỉ lệ chuyên cần theo lớp (tổng hợp từ điểm danh thật).
export async function listAttendanceSummary(params = {}) {
  const { data } = await apiClient.get("/attendance-summary/", { params });
  return data || { results: [], overall_rate: null };
}

export async function createTuitionRecord(payload) {
  const { data } = await apiClient.post("/tuition-records/", payload);
  return data;
}

export async function importTuitionFile(formData) {
  const { data } = await apiClient.post("/tuition-records/import_tuition/", formData);
  return data;
}

export async function createTeachingSession(payload) {
  const { data } = await apiClient.post("/teaching-sessions/", payload);
  return data;
}

export async function importTeachingSessions(formData) {
  const { data } = await apiClient.post("/teaching-sessions/import_sessions/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function importSchedules(formData) {
  const { data } = await apiClient.post("/schedules/schedules/import_schedules/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function listAssignableUsers() {
  const { data } = await apiClient.get("/schedules/schedules/assignable-users/");
  return data;
}

export async function updateSchedule(scheduleId, payload) {
  const { data } = await apiClient.patch(`/schedules/schedules/${scheduleId}/`, payload);
  return data;
}

export async function deleteSchedule(scheduleId) {
  await apiClient.delete(`/schedules/schedules/${scheduleId}/`);
}

export async function createSchedule(payload) {
  const { data } = await apiClient.post("/schedules/schedules/", payload);
  return data;
}

export async function updateTeachingSession(sessionId, payload) {
  const { data } = await apiClient.patch(`/teaching-sessions/${sessionId}/`, payload);
  return data;
}

export async function deleteTeachingSession(sessionId) {
  const { data } = await apiClient.delete(`/teaching-sessions/${sessionId}/`);
  return data;
}

export async function submitMonthlyTeachingPlan(payload) {
  const { data } = await apiClient.post("/teaching-sessions/submit_month_plan/", payload);
  return data;
}

export async function reviewMonthlyTeachingPlan(payload) {
  const { data } = await apiClient.post("/teaching-sessions/review_month_plan/", payload);
  return data;
}

export async function reviewTeachingSessionPlan(sessionId, payload) {
  const { data } = await apiClient.post(
    `/teaching-sessions/${sessionId}/review_plan/`,
    payload,
  );
  return data;
}

export async function listSessionEvidences(params = {}) {
  const { data } = await apiClient.get("/session-evidences/", { params });
  return normalizeCollection(data);
}

export async function listSessionReports(params = {}) {
  const { data } = await apiClient.get("/session-reports/", { params });
  return normalizeCollection(data);
}

export async function importSessionReportsFile(formData) {
  const { data } = await apiClient.post("/session-reports/import_reports/", formData);
  return data;
}

export async function createSessionReport(payload) {
  const { data } = await apiClient.post("/session-reports/", payload);
  return data;
}

export async function updateSessionReport(reportId, payload) {
  const { data } = await apiClient.patch(`/session-reports/${reportId}/`, payload);
  return data;
}

export async function submitSessionReport(reportId) {
  const { data } = await apiClient.post(`/session-reports/${reportId}/submit/`);
  return data;
}

export async function listMonthlyReportSubmissions(params = {}) {
  const { data } = await apiClient.get("/monthly-report-submissions/", { params });
  return normalizeCollection(data);
}

export async function createMonthlyReportSubmission(formData) {
  const { data } = await apiClient.post("/monthly-report-submissions/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function updateMonthlyReportSubmission(submissionId, formData) {
  const { data } = await apiClient.patch(
    `/monthly-report-submissions/${submissionId}/`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

export async function submitMonthlyReportSubmission(submissionId) {
  const { data } = await apiClient.post(`/monthly-report-submissions/${submissionId}/submit/`);
  return data;
}

export async function reviewMonthlyReportSubmission(submissionId, payload) {
  const { data } = await apiClient.post(
    `/monthly-report-submissions/${submissionId}/review/`,
    payload,
  );
  return data;
}

export async function listApprovalQueue(params = {}) {
  const { data } = await apiClient.get("/approvals/queue/", { params });
  return normalizeCollection(data);
}

export async function reviewApprovalEntity(entityType, entityId, decision, payload = {}) {
  const { data } = await apiClient.post(
    `/approvals/${entityType}/${entityId}/${decision}/`,
    payload,
  );
  return data;
}

export async function listClassFinancePreview(params = {}) {
  const { data } = await apiClient.get("/class-finance/preview/", { params });
  return normalizeCollection(data);
}

export async function listCompetitionFrames(params = {}) {
  const { data } = await apiClient.get("/competition-frames/", { params });
  return normalizeCollection(data);
}

export async function listMonthlyScorecards(params = {}) {
  const { data } = await apiClient.get("/monthly-scorecards/", { params });
  return normalizeCollection(data);
}

export async function getMonthlyScorecard(scorecardId) {
  const { data } = await apiClient.get(`/monthly-scorecards/${scorecardId}/`);
  return data;
}

export async function listStudentScores(params = {}) {
  const { data } = await apiClient.get("/student-scores/", { params });
  return normalizeCollection(data);
}

// Đầu mục đánh giá theo nhóm chương trình (không phân trang -> mảng phẳng).
export async function listEvaluationItems(params = {}) {
  const { data } = await apiClient.get("/evaluation-items/", { params });
  return Array.isArray(data) ? data : data?.results || [];
}

// Nhiệm vụ tháng / học kỳ theo lớp.
export async function listClassTasks(params = {}) {
  const { data } = await apiClient.get("/class-tasks/", { params });
  return normalizeCollection(data);
}

export async function createClassTask(payload) {
  const { data } = await apiClient.post("/class-tasks/", payload);
  return data;
}

export async function updateClassTask(taskId, payload) {
  const { data } = await apiClient.patch(`/class-tasks/${taskId}/`, payload);
  return data;
}

export async function deleteClassTask(taskId) {
  const { data } = await apiClient.delete(`/class-tasks/${taskId}/`);
  return data;
}

export async function createMonthlyScorecard(payload) {
  const { data } = await apiClient.post("/monthly-scorecards/", payload);
  return data;
}

export async function updateMonthlyScorecard(scorecardId, payload) {
  const { data } = await apiClient.patch(`/monthly-scorecards/${scorecardId}/`, payload);
  return data;
}

export async function submitMonthlyScorecard(scorecardId) {
  const { data } = await apiClient.post(`/monthly-scorecards/${scorecardId}/submit/`);
  return data;
}

export async function reviewMonthlyScorecard(scorecardId, payload) {
  const { data } = await apiClient.post(`/monthly-scorecards/${scorecardId}/review/`, payload);
  return data;
}

export async function syncMonthlyScorecardsFromScores(payload) {
  const { data } = await apiClient.post("/monthly-scorecards/sync-from-scores/", payload);
  return data;
}

export async function getMonthlyScorecardSchema() {
  const { data } = await apiClient.get("/monthly-scorecards/schema/");
  return data || {};
}

export async function listClassesOverview(params = {}) {
  const { data } = await apiClient.get("/monthly-scorecards/classes-overview/", { params });
  return data || { results: [] };
}

export async function listTuitionStatuses(params = {}) {
  const { data } = await apiClient.get("/students/tuition-statuses/", { params });
  return normalizeCollection(data);
}

export async function upsertTuitionStatus(payload) {
  const { data } = await apiClient.post("/students/tuition-statuses/upsert/", payload);
  return data;
}

export async function listStudents(params = {}) {
  const { data } = await apiClient.get("/students/students/", { params });
  return normalizeCollection(data);
}

export async function getStudent(studentId) {
  const { data } = await apiClient.get(`/students/students/${studentId}/`);
  return data;
}

export async function updateStudent(studentId, payload) {
  const { data } = await apiClient.patch(`/students/students/${studentId}/`, payload);
  return data;
}

export async function createStudent(payload) {
  const { data } = await apiClient.post("/students/students/", payload);
  return data;
}

export async function importStudentsFile(formData) {
  const { data } = await apiClient.post("/students/students/import_students/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteStudent(studentId) {
  const { data } = await apiClient.delete(`/students/students/${studentId}/`);
  return data;
}

export async function exportStudentsFile(params = {}) {
  const response = await apiClient.get("/students/students/export_students/", {
    params,
    responseType: "blob",
  });
  return response.data;
}

export async function listCentersAll() {
  const { data } = await apiClient.get("/centers/centers/all/");
  return Array.isArray(data) ? data : [];
}

export async function listClassroomsAll() {
  const { data } = await apiClient.get("/classrooms/classrooms/all/");
  return Array.isArray(data) ? data : [];
}

// --- Quản lý lớp học (đổi tên lớp / đổi chương trình) — quyền admin ---
export async function createClassroom(payload) {
  const { data } = await apiClient.post("/classrooms/classrooms/", payload);
  return data;
}

export async function updateClassroom(classroomId, payload) {
  const { data } = await apiClient.patch(`/classrooms/classrooms/${classroomId}/`, payload);
  return data;
}

export async function listTeacherCentersClassrooms() {
  const { data } = await apiClient.get("/teachers/teachers/my_centers_classrooms/");
  return Array.isArray(data) ? data : [];
}

export async function listTeacherStudentsByCenterClassroom(centerId, classroomId) {
  if (!centerId || !classroomId) return [];
  const { data } = await apiClient.get(
    "/teachers/teachers/students_by_center_classroom/",
    {
      params: {
        center_id: centerId,
        classroom_id: classroomId,
      },
    },
  );
  return Array.isArray(data) ? data : [];
}

export async function listTeachers(params = {}) {
  const { data } = await apiClient.get("/teachers/teachers/", { params });
  return normalizeCollection(data);
}

export async function importRosterFile(formData) {
  const { data } = await apiClient.post("/classrooms/classrooms/import_roster/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function listClassroomsByCenter(centerId) {
  if (!centerId) return [];
  const { data } = await apiClient.get(`/centers/centers/${centerId}/classrooms/`);
  return Array.isArray(data) ? data : [];
}
