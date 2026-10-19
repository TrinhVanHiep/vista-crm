import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";
import { Button } from "../ui";

/**
 * Hỏi nhân sự xác nhận phiếu lương tháng trước, từ ngày 10 đến 15 hằng tháng (16/10/2026).
 * Xác nhận đúng -> kế toán chuyển khoản; báo sai sót (bắt buộc ghi lý do) -> kế toán xem lại.
 * "Để sau" chỉ tắt trong phiên này; lần vào sau vẫn hỏi cho tới khi trả lời. Máy chủ quyết
 * định có hỏi hay không: payroll/xac_nhan_luong.py.
 */
const URL = "/payroll/xac-nhan-luong/cua-toi/";
const tien = (v) => `${Number(v || 0).toLocaleString("vi-VN")} đ`;
const ngayVN = (iso) => (iso ? iso.split("-").reverse().join("/") : "");

export default function XacNhanLuong({ userId }) {
  const navigate = useNavigate();
  const [tt, setTt] = useState(null);
  const [bao, setBao] = useState(false);
  const [lyDo, setLyDo] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  const [xong, setXong] = useState("");
  const khoa = `vista-crm.xac-nhan-luong.${userId}`;

  useEffect(() => {
    if (!userId) return undefined;
    try { if (window.sessionStorage.getItem(khoa)) return undefined; } catch { /* storage bị chặn: vẫn hỏi */ }
    let con = true;
    apiClient.get(URL).then(({ data }) => con && data?.hien && setTt(data)).catch(() => {});
    return () => { con = false; };
  }, [userId, khoa]);

  if (!tt) return null;

  const dong = () => {
    try { window.sessionStorage.setItem(khoa, "1"); } catch { /* bỏ qua */ }
    setTt(null);
  };
  const gui = async (ketQua) => {
    setLoi("");
    if (ketQua === "khieu_nai" && !lyDo.trim()) { setLoi("Ghi rõ khoản nào sai để kế toán kiểm tra."); return; }
    setDang(true);
    try {
      await apiClient.post(URL, { ket_qua: ketQua, ghi_chu: lyDo.trim(), month: tt.thang, year: tt.nam });
      setXong(ketQua === "dong_y"
        ? "Cảm ơn bạn đã xác nhận. Kế toán sẽ chuyển lương theo lịch."
        : "Đã gửi báo sai sót tới kế toán. Kế toán kiểm tra lại trước khi chuyển lương.");
    } catch (e) {
      setLoi(e?.response?.data?.ghi_chu || e?.response?.data?.detail || "Không gửi được, thử lại sau.");
    } finally {
      setDang(false);
    }
  };

  return (
    <div className="ui-modal__backdrop" role="dialog" aria-modal="true" aria-label="Xác nhận phiếu lương" style={{ zIndex: 1900 }}>
      <div className="ui-modal ui-modal--sm">
        <header className="ui-modal__head">
          <div>
            <h2 className="ui-modal__title">
              💰 {tt.hoi_lai ? `Kế toán đã sửa lương tháng ${tt.thang}/${tt.nam} — xác nhận lại` : `Xác nhận phiếu lương tháng ${tt.thang}/${tt.nam}`}
            </h2>
            <p className="ui-modal__sub">
              {tt.hoi_lai ? "Kế toán đã sửa theo phản hồi của bạn. Kiểm tra lại số mới rồi xác nhận."
                : `Hạn xác nhận: hết ngày ${ngayVN(tt.han)} — xác nhận đúng thì kế toán chuyển lương.`}
            </p>
          </div>
        </header>
        <div className="ui-modal__body" style={{ display: "grid", gap: 12 }}>
          {xong ? <p style={{ margin: 0 }}>{xong}</p> : (
            <>
              <div style={{ background: "#FFF6EF", border: "1px solid #FFE0CC", borderRadius: 12, padding: "14px 16px" }}>
                <div className="small muted">Thực nhận tháng {tt.thang}/{tt.nam}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#F26522" }}>{tien(tt.thuc_nhan)}</div>
                <button type="button" onClick={() => { dong(); navigate("/phieu-luong"); }}
                        style={{ border: 0, background: "none", padding: 0, color: "#F26522", fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
                  Xem chi tiết phiếu lương →
                </button>
              </div>
              {tt.hoi_lai && tt.da_xac_nhan?.phan_hoi ? (
                <div style={{ background: "#EAF1FE", borderRadius: 10, padding: "10px 12px", fontSize: 13, whiteSpace: "pre-line" }}>
                  <b>Kế toán đã đối soát:</b> {tt.da_xac_nhan.phan_hoi}
                  {tt.da_xac_nhan.ghi_chu ? <div style={{ color: "#7d8592", marginTop: 4 }}>Bạn đã báo: {tt.da_xac_nhan.ghi_chu}</div> : null}
                </div>
              ) : null}
              {bao ? (
                <label style={{ display: "grid", gap: 5, fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>Khoản nào chưa đúng?</span>
                  <textarea rows={3} value={lyDo} onChange={(e) => setLyDo(e.target.value)}
                            placeholder="VD: thiếu 2 ca trực ngày 12, 19/9; chưa cộng thưởng thi đua…" />
                </label>
              ) : null}
              {loi ? <div style={{ color: "#C0392B", fontSize: 13 }}>{loi}</div> : null}
            </>
          )}
        </div>
        <footer className="ui-modal__foot">
          {xong ? <Button variant="primary" onClick={dong}>Đóng</Button> : bao ? (
            <>
              <Button onClick={() => setBao(false)}>Quay lại</Button>
              <Button variant="danger" onClick={() => gui("khieu_nai")} disabled={dang}>Gửi báo sai sót</Button>
            </>
          ) : (
            <>
              <Button onClick={dong}>Để sau</Button>
              <Button onClick={() => setBao(true)}>Báo sai sót</Button>
              <Button variant="primary" onClick={() => gui("dong_y")} disabled={dang}>✓ Xác nhận đúng</Button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
