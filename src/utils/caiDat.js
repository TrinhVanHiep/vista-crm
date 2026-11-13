import { useSyncExternalStore } from "react";
import apiClient from "../services/apiClient";
import { ROUTE_PERMISSIONS } from "../auth/permissions";
import { VAI_DUYET_CAP_1, VAI_DUYET_CAP_2 } from "./duyetBaoCao";

/**
 * Cài đặt hệ thống (13/11/2026) — chủ TT chỉnh ở /cai-dat, backend cai_dat/dinh_nghia.py.
 * MAC_DINH = đúng giá trị backend dùng khi chưa chỉnh (để màn vẫn chạy khi chưa tải xong / lỗi mạng).
 * Ma trận quyền: nạp xong thì sửa TẠI CHỖ các mảng vai dùng chung (ROUTE_PERMISSIONS, VAI_DUYET_CAP_*)
 * để mọi màn đang import chúng tự theo, không phải sửa từng nơi.
 */
export const MAC_DINH = {
  hen_toi_da_ngay: 7,
  han_an_han_ngay: 0,
  loi_tru_moi_loi: 1,
  loi_tru_toi_da: 10,
  xn_luong_tu_ngay: 10,
  xn_luong_den_ngay: 15,
  qldt_cong_toi_thieu: 15,
  bat_buoc_anh_thu_chi: true,
  khoa_nhap_phieu_thu: true,
  khoa_nhap_khoan_chi: true,
  viec_xong_can_anh: true,
  anh_minh_chung_toi_da: 10,
  popup_nhiem_vu: true,
  xep_loai_xuat_sac: 91,
  xep_loai_tot: 81,
  xep_loai_kha: 71,
  xep_loai_trung_binh: 61,
  q_xem_tai_chinh: ["admin", "center_manager", "training_manager", "accountant"],
  q_ghi_tai_chinh: ["admin", "accountant"],
  q_duyet_tai_chinh: ["admin"],
  q_sua_luong: ["accountant", "admin", "center_manager"],
  q_duyet_bc_cap1: ["admin", "center_manager"],
  q_duyet_bc_cap2: ["admin", "training_manager"],
  q_phu_trach_don_nghi: ["admin", "training_manager"],
  q_phu_trach_de_xuat: ["admin", "center_manager"],
  q_cham_thi_dua: ["admin", "center_manager", "training_manager"],
};

let trangThai = { gia_tri: { ...MAC_DINH }, da_nap: false };
const nguoiNghe = new Set();

function phat() {
  nguoiNghe.forEach((f) => f());
}

function thayTaiCho(mang, moi) {
  mang.splice(0, mang.length, ...moi);
}

/** Vai có quyền `khoa` (luôn gồm superadmin, như backend vai_co_quyen). */
export function vaiCo(khoa, giaTri = trangThai.gia_tri) {
  return ["superadmin", ...(giaTri[khoa] || MAC_DINH[khoa] || []).filter((v) => v !== "superadmin")];
}

function apDungQuyen(g) {
  thayTaiCho(ROUTE_PERMISSIONS.financeWrite, vaiCo("q_ghi_tai_chinh", g));
  thayTaiCho(ROUTE_PERMISSIONS.financeApprove, vaiCo("q_duyet_tai_chinh", g));
  thayTaiCho(ROUTE_PERMISSIONS.payrollEdit, vaiCo("q_sua_luong", g));
  thayTaiCho(ROUTE_PERMISSIONS.kpiAdmin, vaiCo("q_cham_thi_dua", g));
  // Khớp backend is_finance_user: xem ∪ ghi ∪ sửa lương.
  const xem = [...new Set([...vaiCo("q_xem_tai_chinh", g), ...vaiCo("q_ghi_tai_chinh", g), ...vaiCo("q_sua_luong", g)])];
  thayTaiCho(ROUTE_PERMISSIONS.finance, xem);
  thayTaiCho(ROUTE_PERMISSIONS.financeMenu, xem);
  thayTaiCho(VAI_DUYET_CAP_1, vaiCo("q_duyet_bc_cap1", g));
  thayTaiCho(VAI_DUYET_CAP_2, vaiCo("q_duyet_bc_cap2", g));
}

export function datGiaTri(giaTri) {
  const g = { ...MAC_DINH, ...(giaTri || {}) };
  apDungQuyen(g);
  trangThai = { gia_tri: g, da_nap: true };
  phat();
}

let dangNap = null;
/** Nạp (một lần mỗi phiên, `lai` = nạp lại sau khi lưu). Lỗi mạng: giữ mặc định, không chặn màn nào. */
export function napCaiDat(lai = false) {
  if (dangNap && !lai) return dangNap;
  dangNap = apiClient.get("/cai-dat/")
    .then(({ data }) => { datGiaTri(data?.gia_tri); return data; })
    // Lỗi mạng: dùng mặc định nhưng vẫn đánh dấu đã nạp, để RoleGuard không chờ mãi (trang trắng).
    .catch(() => { datGiaTri(trangThai.gia_tri); return null; });
  return dangNap;
}

/** Đọc một giá trị (ngoài React). */
export function cd(khoa) {
  return trangThai.gia_tri[khoa] ?? MAC_DINH[khoa];
}

function dangKy(f) {
  nguoiNghe.add(f);
  return () => nguoiNghe.delete(f);
}

/** Hook: { cd, vaiCo, da_nap } — tự vẽ lại khi cài đặt nạp xong / đổi. */
export function useCaiDat() {
  const s = useSyncExternalStore(dangKy, () => trangThai);
  return {
    da_nap: s.da_nap,
    cd: (khoa) => s.gia_tri[khoa] ?? MAC_DINH[khoa],
    vaiCo: (khoa) => vaiCo(khoa, s.gia_tri),
  };
}
