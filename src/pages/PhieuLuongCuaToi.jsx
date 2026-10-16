import { useEffect, useState } from "react";
import { Card, Page, PageHeader } from "../ui";
import PhieuLuong from "../components/finance/PhieuLuong";
import { layPhieuLuong } from "../services/payrollService";
import { loiApi } from "../services/financeService";
import apiClient from "../services/apiClient";

/**
 * Phiếu lương của tôi (12/10/2026): mỗi nhân sự tự xem phiếu lương chuẩn theo
 * tháng — cùng số với bảng lương kế toán đang xem, kèm chi tiết ngày công và ca dạy.
 * Mặc định mở tháng trước vì tháng hiện tại chưa chốt công.
 */

const NAM = [2025, 2026, 2027];

export default function PhieuLuongCuaToi() {
  const truoc = new Date();
  truoc.setDate(1);
  truoc.setMonth(truoc.getMonth() - 1);
  const [thang, setThang] = useState(truoc.getMonth() + 1);
  const [nam, setNam] = useState(truoc.getFullYear());
  const [duLieu, setDuLieu] = useState(null);
  const [loi, setLoi] = useState("");
  const [dangTai, setDangTai] = useState(true);
  // Xác nhận phiếu lương tháng trước (16/10/2026) — cùng luồng với popup ngày 10–15.
  const [xn, setXn] = useState(null);
  const [baoSai, setBaoSai] = useState(null); // null | "" (đang nhập lý do)
  const [loiXn, setLoiXn] = useState("");

  const taiXn = () => apiClient.get("/payroll/xac-nhan-luong/cua-toi/").then(({ data }) => setXn(data)).catch(() => {});
  useEffect(() => { taiXn(); }, []);
  const guiXn = async (ketQua) => {
    setLoiXn("");
    try {
      await apiClient.post("/payroll/xac-nhan-luong/cua-toi/", { ket_qua: ketQua, ghi_chu: baoSai || "", month: thang, year: nam });
      setBaoSai(null);
      taiXn();
    } catch (e) {
      setLoiXn(e?.response?.data?.ghi_chu || e?.response?.data?.detail || "Không gửi được.");
    }
  };
  const thangXn = xn && xn.co_phieu && xn.thang === thang && xn.nam === nam;

  useEffect(() => {
    let huy = false;
    setDangTai(true);
    setLoi("");
    layPhieuLuong({ thang, nam })
      .then((d) => !huy && setDuLieu(d))
      .catch((e) => {
        if (huy) return;
        setDuLieu(null);
        setLoi(e?.response?.status === 404
          ? "Bạn chưa được khai cấu hình lương — liên hệ kế toán."
          : loiApi(e, "Không tải được phiếu lương."));
      })
      .finally(() => !huy && setDangTai(false));
    return () => { huy = true; };
  }, [thang, nam]);

  return (
    <Page className="v4page">
      <PageHeader
        crumbs={[{ label: "Tổng quan", to: "/" }, { label: "Phiếu lương" }]}
        title="Phiếu lương của tôi"
        description="Lương tạm tính theo tháng, chi tiết theo ngày công và ca dạy đã duyệt"
      />
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }} className="no-print">
        <select value={thang} onChange={(e) => setThang(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>Tháng {m}</option>)}
        </select>
        <select value={nam} onChange={(e) => setNam(Number(e.target.value))}>
          {NAM.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {thangXn && !loi ? (
        <div className="no-print" style={{ maxWidth: 760, marginBottom: 12, padding: "12px 14px", borderRadius: 12,
                                           background: xn.da_xac_nhan?.ket_qua === "dong_y" ? "#E8F7EE" : "#FFF6EF",
                                           border: "1px solid #F3D3C2", display: "grid", gap: 8 }}>
          {xn.da_xac_nhan && xn.da_xac_nhan.ket_qua !== "cho_xac_nhan_lai" ? (
            <div style={{ fontSize: 13.5 }}>
              {xn.da_xac_nhan.ket_qua === "dong_y" ? "✓ Bạn đã xác nhận phiếu lương này đúng." : `⚠ Bạn đã báo sai sót: ${xn.da_xac_nhan.ghi_chu}`}
              {" "}
              {xn.da_xac_nhan.ket_qua === "dong_y" ? (
                <button type="button" onClick={() => setBaoSai("")}
                        style={{ border: 0, background: "none", color: "#F26522", fontWeight: 700, cursor: "pointer" }}>Báo sai sót</button>
              ) : null}
              {xn.da_xac_nhan.ket_qua === "khieu_nai" ? (
                <button type="button" className="btn primary sm" style={{ marginLeft: 8 }} onClick={() => guiXn("dong_y")}>
                  Kế toán đã sửa — xác nhận đúng
                </button>
              ) : null}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 13.5 }}>
              <b>{xn.hoi_lai ? `Kế toán đã sửa lương tháng ${thang}/${nam} — xác nhận lại` : `Xác nhận phiếu lương tháng ${thang}/${nam}`}</b>
              <span className="muted small">— xác nhận đúng thì kế toán chuyển lương (hạn ngày 15)</span>
              <span style={{ flex: 1 }} />
              <button type="button" className="btn ghost sm" onClick={() => setBaoSai("")}>Báo sai sót</button>
              <button type="button" className="btn primary sm" onClick={() => guiXn("dong_y")}>✓ Xác nhận đúng</button>
            </div>
          )}
          {baoSai != null ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input type="text" value={baoSai} onChange={(e) => setBaoSai(e.target.value)} placeholder="Khoản nào chưa đúng?"
                     style={{ flex: 1, minWidth: 200 }} />
              <button type="button" className="btn primary sm" disabled={!baoSai.trim()} onClick={() => guiXn("khieu_nai")}>Gửi kế toán</button>
              <button type="button" className="btn ghost sm" onClick={() => setBaoSai(null)}>Huỷ</button>
            </div>
          ) : null}
          {loiXn ? <div style={{ color: "#C0392B", fontSize: 13 }}>{loiXn}</div> : null}
        </div>
      ) : null}
      <Card bodyStyle={{ maxWidth: 760, padding: 20 }}>
        {dangTai ? <p className="muted">Đang tải…</p>
          : loi ? <p style={{ color: "#C0392B" }}>{loi}</p>
            : <PhieuLuong duLieu={duLieu} />}
      </Card>
    </Page>
  );
}
