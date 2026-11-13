import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";
import { Card, Pill } from "./v3/ui";
import { color } from "./v3/theme";
import SuaLuongChot from "./SuaLuongChot";
import { cd } from "../../utils/caiDat";

/**
 * Kế toán theo dõi nhân sự đã xác nhận phiếu lương tháng chưa (16/10/2026). Xác nhận
 * đúng -> chuyển khoản; báo sai -> xem lại trước. Nhân sự xác nhận qua popup ngày 10–15.
 */
const ngayGio = (s) => (s ? new Date(s).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "");
const NHAN = { dong_y: ["Đã xác nhận đúng", "green"], khieu_nai: ["Báo sai sót", "red"], chua: ["Chưa trả lời", "amber"],
               da_sua: ["Quản lý đã sửa", "green"], cho_xac_nhan_lai: ["Đã sửa — chờ xác nhận lại", "blue"] };
// Chuyển khoản được: xác nhận đúng, hoặc quản lý đã sửa — không chờ nhân sự xác nhận lại (chủ TT 09/11/2026).
const XONG = ["dong_y", "da_sua"];

export default function XacNhanLuongTongHop({ thang, nam, coTheGhi = false, onDoi, lamMoi = 0 }) {
  const [bc, setBc] = useState(null);
  const [mo, setMo] = useState(false);
  const [taiLai, setTaiLai] = useState(0);
  const [sua, setSua] = useState(null);
  const [tb, setTb] = useState("");

  // Đánh dấu ĐÃ THANH TOÁN (23/10/2026): cả người chưa xác nhận (hỏi lại cho chắc), có bỏ đánh dấu.
  const daChuyen = async (ids, them = {}) => {
    try {
      await apiClient.post("/payroll/xac-nhan-luong/da-chuyen/", { month: thang, year: nam, user_ids: ids, ...them });
      if (onDoi) onDoi(); // cột Thanh toán trên bảng lương + khung này cùng tải lại (lamMoi)
      else setTaiLai((v) => v + 1);
    } catch (e) {
      window.alert(e?.response?.data?.detail || "Không đánh dấu được.");
    }
  };
  const thanhToan = (r) => {
    const xong = XONG.includes(r.trang_thai);
    if (!xong && !window.confirm(`${r.ten} chưa xác nhận đúng phiếu lương (${NHAN[r.trang_thai][0]}). Vẫn đánh dấu đã thanh toán?`)) return;
    daChuyen([r.user_id], xong ? {} : { ca_chua_xac_nhan: true });
  };

  useEffect(() => {
    let con = true;
    apiClient.get("/payroll/xac-nhan-luong/", { params: { month: thang, year: nam } })
      .then(({ data }) => con && setBc(data)).catch(() => con && setBc(null));
    return () => { con = false; };
  }, [thang, nam, taiLai, lamMoi]);

  if (!bc || !bc.ds.length) return null;
  const { dem } = bc;
  const choChuyen = bc.ds.filter((r) => XONG.includes(r.trang_thai) && !r.da_chuyen_luc);
  return (
    <Card>
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <b style={{ fontSize: 14 }}>Nhân sự xác nhận phiếu lương T{thang}/{nam}</b>
        <Pill tone="green">{dem.dong_y} đúng</Pill>
        {dem.khieu_nai ? <Pill tone="red">{dem.khieu_nai} báo sai</Pill> : null}
        {dem.da_sua ? <Pill tone="green">{dem.da_sua} quản lý đã sửa</Pill> : null}
        <Pill tone="amber">{dem.chua} chưa trả lời</Pill>
        {choChuyen.length ? <Pill tone="blue">{choChuyen.length} chờ chuyển khoản</Pill> : null}
        {coTheGhi && choChuyen.length ? (
          <button type="button" onClick={() => window.confirm(`Đánh dấu ĐÃ THANH TOÁN lương cho ${choChuyen.length} người đã xác nhận đúng / quản lý đã sửa?`) && daChuyen([])}
                  style={{ border: 0, borderRadius: 999, padding: "5px 12px", background: color.green, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            ✓ Đã thanh toán tất cả ({choChuyen.length})
          </button>
        ) : null}
        <span style={{ fontSize: 12.5, color: color.muted }}>Hỏi tự động ngày {cd("xn_luong_tu_ngay")}–{cd("xn_luong_den_ngay")}; chỉ chuyển lương khi đã xác nhận đúng.</span>
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
              {r.da_chuyen_luc ? (
                <>
                  <Pill tone="blue">Đã thanh toán {ngayGio(r.da_chuyen_luc)}</Pill>
                  {coTheGhi ? (
                    <button type="button" onClick={() => window.confirm(`Bỏ đánh dấu đã thanh toán của ${r.ten}?`) && daChuyen([r.user_id], { huy: true })}
                            style={{ border: 0, background: "none", color: color.muted, cursor: "pointer", fontSize: 12, textDecoration: "underline" }}>
                      Bỏ
                    </button>
                  ) : null}
                </>
              ) : coTheGhi ? (
                <button type="button" onClick={() => thanhToan(r)}
                        style={{ border: "1px solid " + color.green, borderRadius: 8, padding: "3px 10px", background: "#fff", color: color.green,
                                 cursor: "pointer", fontSize: 12.5, fontWeight: 700 }}>
                  ✓ Đã thanh toán
                </button>
              ) : null}
              <span style={{ flex: 1, display: "grid", gap: 2 }}>
                {r.ghi_chu ? <span style={{ color: color.red }}>{r.ghi_chu}</span> : null}
                {r.phan_hoi ? <span style={{ color: color.blue, whiteSpace: "pre-line" }}>↳ Kế toán: {r.phan_hoi}</span> : null}
              </span>
              <span style={{ color: color.muted }}>{ngayGio(r.luc)}</span>
              {coTheGhi && r.teacher_id ? (
                <button type="button" onClick={() => setSua(r)}
                        style={{ border: "1px solid " + (r.trang_thai === "khieu_nai" ? color.red : color.border), borderRadius: 8, padding: "3px 10px",
                                 background: "#fff", color: r.trang_thai === "khieu_nai" ? color.red : color.ink70, cursor: "pointer", fontSize: 12.5,
                                 fontWeight: r.trang_thai === "khieu_nai" ? 700 : 500 }}>
                  Sửa lương chốt
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {tb ? <div style={{ padding: "0 18px 12px", color: color.green, fontSize: 13 }}>{tb}</div> : null}
      {sua ? (
        <SuaLuongChot nguoi={sua} thang={thang} nam={nam} onDong={() => setSua(null)}
                      onXong={(m) => { setSua(null); setTb(m); setTaiLai((v) => v + 1); }} />
      ) : null}
    </Card>
  );
}
