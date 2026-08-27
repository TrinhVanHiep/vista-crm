/**
 * Thi đua tháng (app kpi ở backend).
 *
 * Trước đây mọi lời gọi /kpi-frame/ và /kpi-reports/ nằm rải trong
 * components/emulation/*.jsx. Gom vào đây theo đúng quy ước services/ để màn
 * chấm của quản trị và màn tự chấm dùng chung một chỗ, không viết lại đường dẫn.
 */
import apiClient from "./apiClient";

/** Bỏ tham số rỗng để không gửi ?status=&center= lên API. */
function locThamSo(params = {}) {
  const ra = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    ra[k] = v;
  });
  return ra;
}

export async function layKhungKpi() {
  const { data } = await apiClient.get("/kpi-frame/");
  return Array.isArray(data) ? data : data?.results || [];
}

export async function layQuyTacDieuChinh() {
  const { data } = await apiClient.get("/kpi-frame/adjustment-rules/");
  return Array.isArray(data) ? data : data?.results || [];
}

/** Danh sách phiếu + dải chỉ số của một kỳ, cho màn chấm của quản trị. */
export async function layBangChamQuanTri(params = {}) {
  const { data } = await apiClient.get("/kpi-reports/admin-board/", {
    params: locThamSo(params),
  });
  return {
    summary: data?.summary || {},
    results: Array.isArray(data?.results) ? data.results : [],
    count: Number(data?.count) || 0,
    page: Number(data?.page) || 1,
    pages: Number(data?.pages) || 1,
    pageSize: Number(data?.page_size) || 0,
  };
}

export async function layPhieu(phieuId) {
  const { data } = await apiClient.get(`/kpi-reports/${phieuId}/`);
  return data;
}

/** Vừa lấy vừa tạo phiếu kèm đủ dòng tiêu chí và 3 ô ký. */
export async function moPhieu(payload) {
  const { data } = await apiClient.post("/kpi-reports/ensure/", payload);
  return data;
}

/** Một lượt chấm của quản trị: điểm + điểm cộng/trừ + nhận xét, gộp một lần gọi. */
export async function quanTriChamDiem(phieuId, payload) {
  const { data } = await apiClient.post(`/kpi-reports/${phieuId}/admin-score/`, payload);
  return data;
}

export async function kyDuyetPhieu(phieuId, payload) {
  const { data } = await apiClient.post(`/kpi-reports/${phieuId}/review/`, payload);
  return data;
}

export async function traLaiPhieu(phieuId, payload = {}) {
  const { data } = await apiClient.post(`/kpi-reports/${phieuId}/return-to-draft/`, payload);
  return data;
}
