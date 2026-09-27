/**
 * Duyệt báo cáo ca dạy HAI cấp — bản sao luật ở backend
 * (giasu_online/approval/services.py: SESSION_REPORT_LEVEL1_ROLES / LEVEL2_ROLES).
 * Lệch một vai là nút hiện ra mà bấm vào báo lỗi, nên sửa thì sửa cả hai nơi.
 *
 * Cấp 1: quản lý đào tạo ký (xem chuyên môn). Báo cáo vẫn "Chờ duyệt".
 * Cấp 2: quản lý cơ sở ký — lúc này mới "Đã duyệt" và được tính công.
 * Admin/superadmin ký được cả hai cấp, nhưng không ký cả hai trên cùng một báo cáo.
 */

export const VAI_DUYET_CAP_1 = ["superadmin", "admin", "training_manager"];
export const VAI_DUYET_CAP_2 = ["superadmin", "admin", "center_manager"];
export const TEN_CAP = { 1: "Quản lý đào tạo", 2: "Quản lý cơ sở" };

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
export const quyenKy = (bc, role, userId) => {
  const cap = capDangCho(bc);
  if (!cap) return { cap: null, duoc: false, lyDo: "" };
  const dsVai = cap === 1 ? VAI_DUYET_CAP_1 : VAI_DUYET_CAP_2;
  if (!dsVai.includes(role)) {
    return { cap, duoc: false, lyDo: `Chờ ${TEN_CAP[cap].toLowerCase()} duyệt cấp ${cap}.` };
  }
  if (cap === 2 && userId != null && Number(bc.level1_reviewed_by) === Number(userId)) {
    return { cap, duoc: false, lyDo: "Bạn đã ký cấp 1 — cấp 2 phải do người khác duyệt." };
  }
  return { cap, duoc: true, lyDo: "" };
};
