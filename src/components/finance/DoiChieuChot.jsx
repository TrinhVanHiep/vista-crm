import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";
import { Card, Pill, Table } from "./v3/ui";
import { color } from "./v3/theme";

/**
 * Đối chiếu lương dạy ĐÃ CHỐT với lương dạy tính lại theo ca + điểm danh hiện có (19/10/2026).
 * Dùng sau khi nhập sổ điểm danh chuẩn: chỉ ra ai đang bị chốt thiếu / thừa, áp số tính lại
 * vào dòng chốt (khấu trừ 10% đi theo) và hỏi nhân sự xác nhận lại.
 */
const tien = (v) => `${Math.round(Number(v || 0)).toLocaleString("vi-VN")}`;
const XN = { dong_y: ["Đã xác nhận", "green"], khieu_nai: ["Báo sai", "red"], cho_xac_nhan_lai: ["Chờ xác nhận lại", "blue"], chua: ["Chưa trả lời", "amber"] };

export default function DoiChieuChot({ thang, nam, coTheGhi = false, onNotice }) {
  const [bc, setBc] = useState(null);
  const [mo, setMo] = useState(false);
  const [taiLai, setTaiLai] = useState(0);
  const [dang, setDang] = useState(false);

  useEffect(() => {
    let con = true;
    apiClient.get("/payroll/luong-chot/doi-chieu/", { params: { month: thang, year: nam }, timeout: 120000 })
      .then(({ data }) => con && setBc(data)).catch(() => con && setBc(null));
    return () => { con = false; };
  }, [thang, nam, taiLai]);

  if (!bc || !bc.ds.length) return null;
  const lech = bc.ds.filter((r) => Math.abs(r.chenh) >= 1);
  const ap = async (ids) => {
    const n = ids ? ids.length : lech.length;
    if (!window.confirm(`Áp lương dạy tính lại cho ${n} người? Dòng chốt được sửa, khấu trừ 10% đi theo, nhân sự được hỏi xác nhận lại.`)) return;
    setDang(true);
    try {
      const { data } = await apiClient.post("/payroll/luong-chot/doi-chieu/", { month: thang, year: nam, teacher_ids: ids || [] }, { timeout: 120000 });
      onNotice?.(`Đã áp lương dạy tính lại cho ${data.so} người — đã báo họ xác nhận lại.`);
      setTaiLai((v) => v + 1);
    } finally {
      setDang(false);
    }
  };

  return (
    <Card>
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <b style={{ fontSize: 14 }}>Đối chiếu lương dạy đã chốt T{thang}/{nam} với ca + điểm danh hiện có</b>
        {lech.length ? <Pill tone="amber">{lech.length} người lệch</Pill> : <Pill tone="green">Khớp</Pill>}
        <span style={{ fontSize: 12.5, color: color.muted }}>Nhập sổ điểm danh chuẩn trước, rồi áp số tính lại cho người lệch.</span>
        <button type="button" onClick={() => setMo((v) => !v)}
                style={{ marginLeft: "auto", border: 0, background: "none", color: color.orange, fontWeight: 700, cursor: "pointer" }}>
          {mo ? "Thu gọn" : "Xem bảng đối chiếu"}
        </button>
      </div>
      {mo ? (
        <div style={{ padding: "0 18px 16px", display: "grid", gap: 10 }}>
          <Table
            columns={["Nhân sự", "Ca chốt", "Ca tính lại", "Lương dạy chốt", "Lương dạy tính lại", "Chênh", "Thực nhận mới", "Xác nhận", ""]}
            align={{ 1: "right", 2: "right", 3: "right", 4: "right", 5: "right", 6: "right" }}
            rows={bc.ds.map((r) => [
              <b key="t">{r.ten}</b>, r.so_buoi_chot || "—", r.so_ca_tinh_lai, tien(r.luong_day_chot), tien(r.luong_day_tinh_lai),
              <b key="c" style={{ color: r.chenh > 0 ? color.green : r.chenh < 0 ? color.red : color.muted }}>
                {r.chenh > 0 ? "+" : ""}{tien(r.chenh)}
              </b>,
              tien(r.thuc_nhan_moi),
              <Pill key="x" tone={XN[r.xac_nhan]?.[1] || "grey"}>{XN[r.xac_nhan]?.[0] || r.xac_nhan}</Pill>,
              coTheGhi && Math.abs(r.chenh) >= 1 ? (
                <button key="a" type="button" disabled={dang} onClick={() => ap([r.teacher_id])}
                        style={{ border: "1px solid " + color.border, borderRadius: 8, padding: "3px 10px", background: "#fff", cursor: "pointer", fontSize: 12.5 }}>
                  Áp số mới
                </button>
              ) : null,
            ])}
          />
          {coTheGhi && lech.length ? (
            <div>
              <button type="button" disabled={dang} onClick={() => ap(null)}
                      style={{ border: 0, borderRadius: 999, padding: "7px 14px", background: color.orange, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                Áp số tính lại cho cả {lech.length} người lệch
              </button>
              <span style={{ fontSize: 12.5, color: color.muted, marginLeft: 10 }}>
                Lương dạy âm/dương là so với số đã chốt; trực, phụ cấp, BHXH, tạm ứng giữ nguyên.
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
