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

/* ------------------------------------------------------ nhập liệu */

/** Ba đường nhập: khoản phải thu, phiếu thu, khoản chi. */
export const LOAI_NHAP = [
  {
    ma: "phai-thu",
    ten: "Khoản phải thu",
    mo: "Lập công nợ học phí, giáo trình, lệ phí thi cho nhiều em cùng lúc.",
    cot: "Mã học viên · Họ và tên · Lớp · Loại khoản thu · Tháng · Năm · Số tiền · Hạn thu · Ghi chú",
  },
  {
    ma: "phieu-thu",
    ten: "Phiếu thu",
    mo: "Ghi các lần đã thu tiền. Hệ thống tự phân bổ vào khoản đang nợ, cũ trước mới sau.",
    cot: "Mã học viên · Họ và tên · Lớp · Ngày thu · Số tiền · Phương thức · Quỹ · Nội dung",
  },
  {
    ma: "khoan-chi",
    ten: "Khoản chi",
    mo: "Ghi các khoản đã chi thẳng vào sổ giao dịch.",
    cot: "Ngày chi · Nội dung · Số tiền · Quỹ / Tài khoản · Danh mục",
  },
];

/** Tải file mẫu về máy. Trình duyệt không cho tải chéo miền bằng thẻ <a> có
 *  kèm token, nên phải lấy blob qua apiClient rồi tự tạo link tạm. */
export async function taiFileMau(loai, { coDuLieu = false, thang, nam } = {}) {
  const res = await apiClient.get(`/finances/nhap-lieu/mau/${loai}/`, {
    responseType: "blob",
    params: coDuLieu ? { "co-du-lieu": 1, month: thang, year: nam } : undefined,
  });
  const goc = { "phai-thu": "Mau-khoan-phai-thu.xlsx",
                "phieu-thu": "Mau-phieu-thu.xlsx",
                "khoan-chi": "Mau-khoan-chi.xlsx" }[loai] || "Mau.xlsx";
  const ten = coDuLieu ? goc.replace(".xlsx", "-co-du-lieu.xlsx") : goc;
  const url = URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = ten;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Không thu hồi ngay: Safari huỷ lượt tải nếu URL bị gỡ trong cùng nhịp.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Gửi file lên. KHÔNG tự đặt Content-Type — axios phải tự sinh boundary. */
export function nhapFileTaiChinh(loai, tep, params = {}) {
  const fd = new FormData();
  fd.append("file", tep);
  return apiClient.post(`/finances/nhap-lieu/nhap/${loai}/`, fd, { params }).then(lay);
}

/* --------------------------------------------------------- nhật ký */
export const layNhatKy = (p = {}) =>
  apiClient.get("/finances/audit-logs/", { params: p }).then((r) => r.data);

/* ------------------------------------------------------- tiện ích */

/** 1234567 -> "1.234.567". Dùng dấu chấm theo cách viết tiền của Việt Nam. */
export function dinhDangTien(so) {
  const n = Number(so || 0);
  return Number.isFinite(n) ? n.toLocaleString("vi-VN") : "0";
}

/** 415000000 -> "415.0M" — cách rút gọn của bản thiết kế, dùng cho ô chỉ số.
 *  Bảng thì vẫn in đủ số (xem `soDayDu`), vì kế toán đối chiếu từng đồng. */
export function rutGonM(so) {
  const n = Number(so || 0);
  if (!Number.isFinite(n)) return "0";
  const am = n < 0 ? "-" : "";
  const t = Math.abs(n);
  if (t >= 1e9) return `${am}${(t / 1e9).toFixed(2)}B`;
  if (t >= 1e6) return `${am}${(t / 1e6).toFixed(1)}M`;
  if (t >= 1e3) return `${am}${Math.round(t / 1e3)}K`;
  return `${am}${t}`;
}

/** 1250000 -> "1,250,000" — đúng cách bản thiết kế in số trong bảng. */
export function soDayDu(so) {
  if (so === null || so === undefined || so === "") return "—";
  const n = Number(so);
  return Number.isFinite(n) ? n.toLocaleString("en-US") : "—";
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
