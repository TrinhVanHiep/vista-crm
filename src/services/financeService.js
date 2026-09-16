import apiClient from "./apiClient";

/**
 * Finance V2 — Receivable -> Payment -> Allocation -> Transaction.
 *
 * Mọi con số dẫn xuất (đã thu, còn nợ, số dư quỹ) đều do máy chủ tính; ở đây
 * chỉ gọi và hiển thị. Không tự cộng trừ ở trình duyệt, vì hai nơi cùng tính
 * một con số thì sớm muộn sẽ lệch nhau và không ai biết bên nào đúng.
 */

const lay = (r) => r.data;
const ds = (r) => (Array.isArray(r.data) ? r.data : r.data?.results || []);

/* ----------------------------------------------------- quỹ / tài khoản */
export const layDanhSachQuy = (p = {}) =>
  apiClient.get("/finances/accounts/", { params: { active: 1, ...p } }).then(ds);
export const taoQuy = (d) => apiClient.post("/finances/accounts/", d).then(lay);
export const suaQuy = (id, d) => apiClient.patch(`/finances/accounts/${id}/`, d).then(lay);

/* --------------------------------------------------------- công nợ */
export const layCongNo = (p = {}) =>
  apiClient.get("/finances/receivables/", { params: p }).then((r) => r.data);
export const tongHopCongNo = (p = {}) =>
  apiClient.get("/finances/receivables/tong-hop/", { params: p }).then(lay);
export const taoKhoanPhaiThu = (d) =>
  apiClient.post("/finances/receivables/", d).then(lay);
export const suaKhoanPhaiThu = (id, d) =>
  apiClient.patch(`/finances/receivables/${id}/`, d).then(lay);
export const lapPhaiThuHangLoat = (d) =>
  apiClient.post("/finances/receivables/hang-loat/", d).then(lay);

/* ------------------------------------------------------- giảm trừ */
export const layGiamTru = (p = {}) =>
  apiClient.get("/finances/adjustments/", { params: p }).then((r) => r.data);
export const taoGiamTru = (d) => apiClient.post("/finances/adjustments/", d).then(lay);
export const duyetGiamTru = (id) =>
  apiClient.post(`/finances/adjustments/${id}/duyet/`, {}).then(lay);
export const xoaGiamTru = (id) => apiClient.delete(`/finances/adjustments/${id}/`);

/* --------------------------------------------------------- thu tiền */
export const layPhieuThu = (p = {}) =>
  apiClient.get("/finances/payments/", { params: p }).then((r) => r.data);
export const ghiNhanThuTien = (d) =>
  apiClient.post("/finances/payments/thu-tien/", d).then(lay);
export const phanBoThem = (id, d) =>
  apiClient.post(`/finances/payments/${id}/phan-bo/`, d).then(lay);

/* ----------------------------------------------------- sổ giao dịch */
export const laySoGiaoDich = (p = {}) =>
  apiClient.get("/finances/transactions/", { params: p }).then((r) => r.data);
export const tongHopSo = (p = {}) =>
  apiClient.get("/finances/transactions/tong-hop/", { params: p }).then(lay);
export const ghiSo = (d) => apiClient.post("/finances/transactions/ghi-so/", d).then(lay);
export const xacNhanKhop = (id, d = {}) =>
  apiClient.post(`/finances/transactions/${id}/doi-soat/`, d).then(lay);

/* ------------------------------------------------------ kỳ kế toán */
export const layDanhSachKy = () => apiClient.get("/finances/periods/").then(ds);
export const taoKy = (d) => apiClient.post("/finances/periods/", d).then(lay);
export const kiemTraDongSo = (id) =>
  apiClient.get(`/finances/periods/${id}/kiem-tra/`).then(lay);
export const khoaKy = (id) => apiClient.post(`/finances/periods/${id}/khoa/`, {}).then(lay);
export const moLaiKy = (id, ly_do) =>
  apiClient.post(`/finances/periods/${id}/mo-lai/`, { ly_do }).then(lay);

/* --------------------------------------------------------- nhật ký */
export const layNhatKy = (p = {}) =>
  apiClient.get("/finances/audit-logs/", { params: p }).then((r) => r.data);

/* ------------------------------------------------------- tiện ích */

/** 1234567 -> "1.234.567". Dùng dấu chấm theo cách viết tiền của Việt Nam. */
export function dinhDangTien(so) {
  const n = Number(so || 0);
  return Number.isFinite(n) ? n.toLocaleString("vi-VN") : "0";
}

/** 128600000 -> "128,6 tr" — cho các ô chỉ số, chỗ không đủ rộng ghi đủ số. */
export function rutGonTien(so) {
  const n = Number(so || 0);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1).replace(".", ",")} tỷ`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1).replace(".", ",")} tr`;
  if (Math.abs(n) >= 1e3) return `${Math.round(n / 1e3)}k`;
  return dinhDangTien(n);
}

/**
 * Bỏ dấu kỹ thuật [TR#123] ở đầu mô tả khoản phải thu.
 *
 * Dấu này để lệnh chuyển đổi nhận ra dòng học phí gốc và không nhân đôi khi
 * chạy lại — cần cho máy, còn kế toán nhìn vào chỉ thấy rối.
 */
export function moTaGon(mo_ta) {
  return String(mo_ta || "").replace(/^\[TR#\d+\]\s*/, "");
}

/** Bóc câu lỗi từ phản hồi DRF, vốn có tới bốn dạng khác nhau. */
export function loiApi(e, macDinh = "Có lỗi xảy ra.") {
  const d = e?.response?.data;
  if (!d) return e?.message || macDinh;
  if (typeof d === "string") return d;
  if (d.detail) {
    return Array.isArray(d.con_thieu) && d.con_thieu.length
      ? `${d.detail} ${d.con_thieu.join("; ")}`
      : String(d.detail);
  }
  if (Array.isArray(d)) return d.join(" ");
  const dau = Object.values(d)[0];
  return Array.isArray(dau) ? String(dau[0]) : String(dau || macDinh);
}
