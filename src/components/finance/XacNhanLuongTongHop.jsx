import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";
import { Card, Pill } from "./v3/ui";
import { color } from "./v3/theme";

/**
 * Kế toán theo dõi nhân sự đã xác nhận phiếu lương tháng chưa (16/10/2026). Xác nhận
 * đúng -> chuyển khoản; báo sai -> xem lại trước. Nhân sự xác nhận qua popup ngày 10–15.
 */
const ngayGio = (s) => (s ? new Date(s).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "");
const NHAN = { dong_y: ["Đã xác nhận đúng", "green"], khieu_nai: ["Báo sai sót", "red"], chua: ["Chưa trả lời", "amber"] };

export default function XacNhanLuongTongHop({ thang, nam }) {
  const [bc, setBc] = useState(null);
  const [mo, setMo] = useState(false);

  useEffect(() => {
    let con = true;
    apiClient.get("/payroll/xac-nhan-luong/", { params: { month: thang, year: nam } })
      .then(({ data }) => con && setBc(data)).catch(() => con && setBc(null));
    return () => { con = false; };
  }, [thang, nam]);

  if (!bc || !bc.ds.length) return null;
  const { dem } = bc;
  return (
    <Card>
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <b style={{ fontSize: 14 }}>Nhân sự xác nhận phiếu lương T{thang}/{nam}</b>
        <Pill tone="green">{dem.dong_y} đúng</Pill>
        {dem.khieu_nai ? <Pill tone="red">{dem.khieu_nai} báo sai</Pill> : null}
        <Pill tone="amber">{dem.chua} chưa trả lời</Pill>
        <span style={{ fontSize: 12.5, color: color.muted }}>Hỏi tự động ngày 10–15; chỉ chuyển lương khi đã xác nhận đúng.</span>
        <button type="button" onClick={() => setMo((v) => !v)}
                style={{ marginLeft: "auto", border: 0, background: "none", color: color.orange, fontWeight: 700, cursor: "pointer" }}>
          {mo ? "Thu gọn" : "Xem từng người"}
        </button>
      </div>
      {mo ? (
        <div style={{ padding: "0 18px 14px", display: "grid", gap: 6 }}>
          {bc.ds.map((r) => (
            <div key={r.user_id} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, flexWrap: "wrap",
                                          borderTop: "1px dashed " + color.border, paddingTop: 6 }}>
              <span style={{ minWidth: 180, fontWeight: 600 }}>{r.ten}</span>
              <Pill tone={NHAN[r.trang_thai][1]}>{NHAN[r.trang_thai][0]}</Pill>
              {r.ghi_chu ? <span style={{ color: color.red, flex: 1 }}>{r.ghi_chu}</span> : <span style={{ flex: 1 }} />}
              <span style={{ color: color.muted }}>{ngayGio(r.luc)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
