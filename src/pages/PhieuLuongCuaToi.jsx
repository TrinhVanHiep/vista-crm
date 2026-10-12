import { useEffect, useState } from "react";
import { Card, Page, PageHeader } from "../ui";
import PhieuLuong from "../components/finance/PhieuLuong";
import { layPhieuLuong } from "../services/payrollService";
import { loiApi } from "../services/financeService";

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
      <Card bodyStyle={{ maxWidth: 760, padding: 20 }}>
        {dangTai ? <p className="muted">Đang tải…</p>
          : loi ? <p style={{ color: "#C0392B" }}>{loi}</p>
            : <PhieuLuong duLieu={duLieu} />}
      </Card>
    </Page>
  );
}
