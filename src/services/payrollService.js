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

/** Tải file mẫu bảng chấm công tháng (điền sẵn email + họ tên nhân sự). */
export async function taiMauChamCong({ thang, nam }) {
  const res = await apiClient.get("/payroll/cham-cong/mau/", {
    responseType: "blob",
    params: { month: thang, year: nam },
  });
  const url = URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = `Mau-cham-cong-${String(thang).padStart(2, "0")}-${nam}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Nhập bảng chấm công. ghi=false chỉ xem trước; KHÔNG tự đặt Content-Type. */
export async function nhapChamCong(tep, { thang, nam, ghi = false }) {
  const fd = new FormData();
  fd.append("file", tep);
  fd.append("month", thang);
  fd.append("year", nam);
  if (ghi) fd.append("ghi", "1");
  const { data } = await apiClient.post("/payroll/cham-cong/nhap/", fd);
  return data;
}

/** Khấu trừ / điều chỉnh tay của một người trong một tháng (BHXH, thuế 2 nguồn, phạt…). */
export async function layDieuChinh(teacherId, { thang, nam }) {
  const { data } = await apiClient.get(`/payroll/dieu-chinh/${teacherId}/`, { params: { month: thang, year: nam } });
  return data;
}

export async function luuDieuChinh(teacherId, { thang, nam }, payload) {
  const { data } = await apiClient.put(`/payroll/dieu-chinh/${teacherId}/`, { ...payload, month: thang, year: nam });
  return data;
}

/** Đơn giá trả giáo viên / lượt học sinh của từng lớp (mặc định + set tay). */
export async function layDonGiaLop() {
  const { data } = await apiClient.get("/payroll/don-gia-lop/");
  return Array.isArray(data) ? data : [];
}

export async function luuDonGiaLop(classroomId, gia) {
  const { data } = await apiClient.put(`/payroll/don-gia-lop/${classroomId}/`, { teacher_rate_per_student: gia });
  return data;
}

/** Cấu hình lương cố định của từng người (TeacherPayrollConfig). */
export async function layCauHinhLuong() {
  const { data } = await apiClient.get("/payroll/configs/teachers/", { params: { page_size: 500 } });
  return Array.isArray(data) ? data : data?.results || [];
}

export async function luuCauHinhLuong(id, payload) {
  const { data } = id
    ? await apiClient.patch(`/payroll/configs/teachers/${id}/`, payload)
    : await apiClient.post("/payroll/configs/teachers/", payload);
  return data;
}
