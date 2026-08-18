export const ROUTE_PERMISSIONS = {
  dashboard: ['superadmin', 'admin'],
  courses: ['superadmin', 'admin', 'teacher', 'student'],
  // Mọi vai nhân sự nội bộ tra cứu được HS/lớp (để ô tìm kiếm chung dùng được);
  // học viên thì không.
  students: ['superadmin', 'admin', 'teacher', 'staff', 'center_manager', 'training_manager'],
  programs: ['superadmin', 'admin', 'teacher', 'staff', 'center_manager', 'training_manager'],
  teachers: ['superadmin', 'admin'],
  attendance: ['superadmin', 'admin'],
  calendar: ['superadmin', 'admin', 'teacher', 'staff', 'center_manager', 'training_manager'],
  monthlyScorecards: ['superadmin', 'admin', 'teacher', 'student'],
  // Phiếu báo cáo tháng gửi phụ huynh — do giáo viên/quản lý lập.
  parentReport: ['superadmin', 'admin', 'teacher'],
  // Báo cáo kết quả học tập là màn TỔNG HỢP để theo dõi chất lượng, nên quản lý
  // cơ sở và quản lý đào tạo xem được; học viên thì không (sẽ thấy cả trung tâm).
  studentLearningReport: ['superadmin', 'admin', 'teacher', 'center_manager', 'training_manager'],
  // Quản lý lớp (đổi mã/tên lớp, gán chương trình) — backend chỉ cho admin.
  classManager: ['superadmin', 'admin'],
  // Màn này chứa 2 luồng: báo cáo tháng (quản lý cơ sở duyệt) VÀ duyệt báo cáo
  // ca dạy (quản lý đào tạo duyệt) -> cả 2 vai quản lý đều cần vào.
  // staff không có nhiệm vụ duyệt và bị backend 403 nên không đưa vào menu.
  monthlyReports: ['superadmin', 'admin', 'teacher', 'center_manager', 'training_manager'],
  reportCard: ['superadmin', 'admin', 'teacher', 'staff', 'center_manager', 'training_manager'],
  employeeProfile: ['superadmin', 'admin', 'teacher', 'staff', 'center_manager', 'training_manager'],
  // Hồ sơ học viên tách khỏi employeeProfile: đây là hồ sơ NGƯỜI HỌC, không phải
  // hồ sơ nhân sự, nên quyền cũng phải nói đúng điều đó.
  studentProfile: ['superadmin', 'admin', 'teacher', 'staff', 'center_manager', 'training_manager'],
  finance: ['superadmin', 'admin'],
  documents: ['superadmin', 'admin', 'teacher', 'staff', 'center_manager', 'training_manager'],
  settings: ['superadmin', 'admin'],
  accounts: ['superadmin', 'admin'],
  media: ['superadmin', 'admin', 'staff', 'teacher', 'center_manager', 'training_manager'],
  tuition: ['superadmin', 'admin', 'staff', 'center_manager', 'training_manager'],
};
