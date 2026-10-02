/**
 * Duyệt báo cáo ca dạy HAI cấp — bản sao luật ở backend
 * (giasu_online/approval/services.py: SESSION_REPORT_LEVEL1_ROLES / LEVEL2_ROLES).
 * Lệch một vai là nút hiện ra mà bấm vào báo lỗi, nên sửa thì sửa cả hai nơi.
 *
 * Cấp 1: quản lý cơ sở ký — kiểm sĩ số, đã báo cáo Zalo, vấn đề phát sinh.
 *         Báo cáo vẫn "Chờ duyệt".
 * Cấp 2: quản lý đào tạo ký — lúc này mới "Đã duyệt" và được tính công.
 * Ký cấp nào cũng phải tick bằng chứng: đã đọc trên Zalo / đã trao đổi trực tiếp.
 * Admin/superadmin ký được cả hai cấp, nhưng không ký cả hai trên cùng một báo cáo.
 */

export const VAI_DUYET_CAP_1 = ["superadmin", "admin", "center_manager"];
export const VAI_DUYET_CAP_2 = ["superadmin", "admin", "training_manager"];
export const TEN_CAP = { 1: "Quản lý cơ sở", 2: "Quản lý đào tạo" };

// Phiếu kiểm của người duyệt — khoá khớp approval/services.py.
export const BANG_CHUNG = [
  ["zalo_read", "Đã đọc báo cáo trên Zalo"],
  ["discussed_directly", "Đã trao đổi trực tiếp với giáo viên"],
];
export const MUC_KIEM_CAP_1 = [
  ["class_size_ok", "Sĩ số đã chuẩn"],
  ["zalo_reported", "Giáo viên đã báo cáo trên Zalo"],
];

/** Phiếu kiểm đủ để bấm Duyệt chưa; trả lại lý do còn thiếu (rỗng = đủ). */
export const thieuPhieuKiem = (cap, phieu) => {
  if (!BANG_CHUNG.some(([k]) => phieu[k])) {
    return "Tick ít nhất một bằng chứng: đã đọc trên Zalo hoặc đã trao đổi trực tiếp.";
  }
  if (cap === 1 && !MUC_KIEM_CAP_1.every(([k]) => phieu[k])) {
    return "Cấp 1 cần xác nhận sĩ số chuẩn và giáo viên đã báo cáo trên Zalo — chưa thì chọn Yêu cầu sửa.";
  }
  return "";
};

/** Tóm tắt phiếu kiểm đã lưu thành chuỗi ngắn để hiện trên thẻ báo cáo. */
export const tomTatPhieuKiem = (phieu) => {
  if (!phieu || typeof phieu !== "object") return "";
  const nhan = [...BANG_CHUNG, ...MUC_KIEM_CAP_1].filter(([k]) => phieu[k]).map(([, n]) => n);
  return nhan.join(" · ");
};

/** Cấp đang chờ ký: 1 | 2, hoặc null nếu báo cáo không ở trạng thái chờ duyệt. */
export const capDangCho = (bc) => {
  if (bc?.report_status !== "submitted") return null;
  if (bc.pending_level === 1 || bc.pending_level === 2) return bc.pending_level;
  return bc.level1_reviewed_at ? 2 : 1;
};

/**
 * Người đang đăng nhập có ký được cấp đang chờ không. Trả về lý do khi không
 * ký được để giao diện nói rõ vì sao không có nút, thay vì để trống.
 */
export const quyenKy = (bc, role, userId, teacherId = null) => {
  const cap = capDangCho(bc);
  if (!cap) return { cap: null, duoc: false, lyDo: "" };
  // Quản lý kiêm đứng lớp không duyệt báo cáo ca của chính mình (backend chặn).
  if (teacherId != null && Number(bc.teacher) === Number(teacherId)) {
    return { cap, duoc: false, lyDo: "Báo cáo của chính bạn — người khác sẽ duyệt." };
  }
  const dsVai = cap === 1 ? VAI_DUYET_CAP_1 : VAI_DUYET_CAP_2;
  if (!dsVai.includes(role)) {
    return { cap, duoc: false, lyDo: `Chờ ${TEN_CAP[cap].toLowerCase()} duyệt cấp ${cap}.` };
  }
  if (cap === 2 && userId != null && Number(bc.level1_reviewed_by) === Number(userId)) {
    return { cap, duoc: false, lyDo: "Bạn đã ký cấp 1 — cấp 2 phải do người khác duyệt." };
  }
  return { cap, duoc: true, lyDo: "" };
};
