import { useEffect, useState } from "react";
import { getDiemDanhCa } from "../../services/calendarService";

// Sĩ số / có mặt cho form báo cáo ca (12/11/2026, chủ TT): sĩ số khoá theo danh sách thật của lớp,
// có mặt lấy theo điểm danh tay — không gõ tay nữa (backend teaching/diem_danh.py cũng ép theo điểm danh).
const CO_MAT = new Set(["present", "late", "partial"]);

export function tomDiemDanh(d) {
  const rows = d?.rows || [];
  return {
    si_so: d?.si_so ?? rows.filter((r) => !r.is_makeup).length,
    co_mat: d?.present_count ?? rows.filter((r) => CO_MAT.has(r.status)).length,
    da_diem: rows.some((r) => r.status),
  };
}

export function chuSiSo(dd) {
  if (dd == null) return "Đang tải…";
  if (dd.loi) return "Không tải được điểm danh";
  return dd.da_diem ? `${dd.co_mat} / ${dd.si_so} em` : "Chưa điểm danh";
}

/** [dd, datDd]: dd = { si_so, co_mat, da_diem } | { loi: true } | null (đang tải / chưa chọn ca). */
export default function useSiSoCa(sessionId) {
  const [dd, setDd] = useState(null);
  useEffect(() => {
    setDd(null);
    if (!sessionId) return undefined;
    let con = true;
    getDiemDanhCa(sessionId)
      .then((d) => con && setDd(tomDiemDanh(d)))
      .catch(() => con && setDd({ loi: true }));
    return () => { con = false; };
  }, [sessionId]);
  return [dd, (d) => setDd(tomDiemDanh(d))];
}
