import apiClient from "./apiClient";

/**
 * Bảng lương — lương tạm tính do máy chủ tính từ cấu hình lương từng người,
 * chấm công (ca trực) và các buổi dạy đã duyệt. Ở đây chỉ gọi và hiển thị.
 */

export async function layBangLuong({ thang, nam }) {
  const { data } = await apiClient.get("/payroll/preview/teachers/", {
    params: { month: thang, year: nam, page_size: 500 },
  });
  return Array.isArray(data) ? data : data?.results || [];
}

export async function layCoCauLuong() {
  const { data } = await apiClient.get("/payroll/co-cau-luong/");
  return data;
}
