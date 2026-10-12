import { useState } from "react";
import { dinhDangTien } from "../../services/financeService";

/**
 * Phiếu lương một người một tháng — bố cục theo mẫu BẢNG THANH TOÁN LƯƠNG của E-VISTA
 * (BL-T9.2026), thêm dòng Lương thực dạy. Ba tab: Phiếu lương / Chấm công / Ca dạy,
 * để thấy rõ con số đến từ ngày công nào và ca dạy nào (12/10/2026).
 * Dữ liệu: GET /payroll/phieu-luong/ -> { preview, phieu, bang_chu }.
 */

const t = (v) => dinhDangTien(Math.round(Number(v || 0)));
const ngayVN = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });
};
const NGUON = { diem_danh: "Điểm danh", may_cham_cong: "Máy / file bổ sung", si_so_bao_cao: "Sĩ số báo cáo", chua_co: "—" };

function Dong({ nhan, gia, dam, am, phu }) {
  return (
    <tr>
      <td style={{ padding: "6px 10px", fontWeight: dam ? 800 : 500 }}>
        {nhan}
        {phu ? <div style={{ fontSize: 11.5, color: "#8a7a66", fontWeight: 400 }}>{phu}</div> : null}
      </td>
      <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: dam ? 800 : 600, color: am ? "#C0392B" : undefined, whiteSpace: "nowrap" }}>
        {am && Number(gia) > 0 ? "-" : ""}{t(gia)}
      </td>
    </tr>
  );
}

export default function PhieuLuong({ duLieu, inDuoc = true }) {
  const [tab, setTab] = useState("phieu");
  if (!duLieu) return null;
  const { preview: p, phieu: d, bang_chu: bangChu, thang, nam } = duLieu;
  const c = p.salary_components || {};
  const a = p.attendance || {};
  const nn = p.employment_type === "foreign";
  const caDay = (p.classrooms || []).flatMap((l) => (l.session_attendance || []).map((s) => ({
    ...s,
    lop: l.classroom_name,
    tien: nn ? Number(c.rate_per_session || 0)
      : Number(s.payable_student_attendance_count || 0) * Number(l.salary_basis_per_student || 0) * Number(l.teacher_revenue_share_percent || 0) / 100,
    donGia: l.salary_basis_per_student,
    chia: l.teacher_revenue_share_percent,
  }))).sort((x, y) => String(x.session_date).localeCompare(String(y.session_date)));
  // Xuất PDF = in trang phiếu (trình duyệt: "Lưu dưới dạng PDF"). Đặt tên tài liệu
  // để file PDF lưu ra có tên người + tháng thay vì "Vista CRM".
  const xuatPdf = () => {
    setTab("phieu");
    const cu = document.title;
    document.title = `Phieu-luong-${(d.ho_ten || "").replace(/\s+/g, "-")}-T${String(thang).padStart(2, "0")}-${nam}`;
    setTimeout(() => {
      window.print();
      document.title = cu;
    }, 50);
  };
  const tabBtn = (ma, nhan) => (
    <button type="button" onClick={() => setTab(ma)} className="no-print"
            style={{ border: 0, borderBottom: tab === ma ? "2px solid #F26522" : "2px solid transparent", background: "none",
                     padding: "8px 12px", fontWeight: 700, color: tab === ma ? "#F26522" : "#6b5b4b", cursor: "pointer" }}>
      {nhan}
    </button>
  );

  return (
    <div className="phieu-luong">
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          body * { visibility: hidden !important; }
          .phieu-luong, .phieu-luong * { visibility: visible !important; }
          .phieu-luong { position: absolute; left: 0; top: 0; width: 100%; }
          .phieu-luong .no-print { display: none !important; }
          .phieu-luong .chi-in { display: grid !important; }
        }
      `}</style>
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1F3A93" }}>CÔNG TY TNHH GIÁO DỤC VÀ ĐÀO TẠO E-VISTA</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#1F3A93", marginTop: 6 }}>PHIẾU LƯƠNG</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#C0392B" }}>THÁNG {String(thang).padStart(2, "0")}/{nam}</div>
        <div style={{ marginTop: 6, fontSize: 14 }}><b>{d.ho_ten}</b> · {d.chuc_vu}</div>
      </div>

      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #eadfd2", marginBottom: 10 }} className="no-print">
        {tabBtn("phieu", "Phiếu lương")}
        {tabBtn("cong", `Chấm công (${a.attendance_days || 0} công)`)}
        {tabBtn("ca", `Ca dạy (${caDay.length} ca)`)}
        {inDuoc ? <button type="button" className="btn primary sm no-print" style={{ marginLeft: "auto" }} onClick={xuatPdf}>⬇ Xuất PDF / In</button> : null}
      </div>

      {tab === "phieu" ? (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <tbody>
            <Dong nhan="Tổng lương thực lĩnh" gia={d.thuc_linh} dam phu={bangChu} />
            <tr><td colSpan={2} style={{ borderTop: "1px solid #eadfd2" }} /></tr>
            <Dong nhan="Lương cơ bản (mức lương)" gia={d.luong_co_ban} />
            <Dong nhan="Lương thời gian" gia={d.luong_thoi_gian}
                  phu={nn ? "GV nước ngoài: không có lương cơ bản" : `${d.so_cong}/${d.cong_chuan} công`} />
            <Dong nhan="Lương thực dạy" gia={d.luong_thuc_day} phu={`${caDay.length} ca có báo cáo đã duyệt — xem tab Ca dạy`} />
            <Dong nhan="Thưởng (sale, thi đua, lễ tết)" gia={d.thuong}
                  phu={c.kpi_bonus_reason || ""} />
            <Dong nhan="Trợ cấp (phụ cấp, trực, khoán QLHS)" gia={d.tro_cap}
                  phu={[Number(c.allowance) ? `Phụ cấp ${t(c.allowance)}` : "", Number(c.duty_salary) ? `Trực ${t(c.duty_salary)}` : "",
                        Number(c.student_management_pay) ? `Khoán QLHS ${t(c.student_management_pay)}` : ""].filter(Boolean).join(" · ")} />
            <Dong nhan="Tổng cộng" gia={d.tong_cong} dam />
            <tr><td colSpan={2} style={{ borderTop: "1px solid #eadfd2" }} /></tr>
            <Dong nhan="BHXH người lao động đóng (10,5%)" gia={d.nv_dong} am
                  phu={d.muc_dong_bh ? `BHXH 8% ${t(d.bhxh_nld)} · BHYT 1,5% ${t(d.bhyt_nld)} · BHTN 1% ${t(d.bhtn_nld)} — mức đóng ${t(d.muc_dong_bh)}` : "Không đóng BHXH"} />
            <Dong nhan="Thuế TNCN" gia={d.thue_tncn} am />
            <Dong nhan="Khấu trừ khác (phạt…)" gia={d.khau_tru} am phu={c.penalty_note || ""} />
            <tr><td colSpan={2} style={{ borderTop: "2px solid #43301F" }} /></tr>
            <Dong nhan="THỰC LĨNH" gia={d.thuc_linh} dam />
            {d.muc_dong_bh ? (
              <tr><td colSpan={2} style={{ padding: "8px 10px", fontSize: 12, color: "#8a7a66" }}>
                Công ty đóng thêm 21,5%: BHXH 17% {t(d.bhxh_dn)} · TNLĐ 0,5% {t(d.tnld_dn)} · BHYT 3% {t(d.bhyt_dn)} · BHTN 1% {t(d.bhtn_dn)} = {t(d.dn_dong)}
              </td></tr>
            ) : null}
          </tbody>
        </table>
      ) : null}
      {tab === "phieu" ? (
        <div className="chi-in" style={{ display: "none", gridTemplateColumns: "1fr 1fr", textAlign: "center", marginTop: 28, fontSize: 13 }}>
          <div><b>NGƯỜI LẬP BIỂU</b><div style={{ fontSize: 11.5, color: "#8a7a66" }}>(Ký, họ tên)</div></div>
          <div><b>NGƯỜI NHẬN</b><div style={{ fontSize: 11.5, color: "#8a7a66" }}>(Ký, họ tên)</div></div>
        </div>
      ) : null}

      {tab === "cong" ? (
        <table className="tbl" style={{ width: "100%", fontSize: 13 }}>
          <thead><tr><th>Ngày</th><th>Nguồn</th><th className="t-center">Lượt</th><th className="t-center">Tính công</th><th className="t-center">Trực</th></tr></thead>
          <tbody>
            {(a.daily_timeline || []).length ? a.daily_timeline.map((n) => (
              <tr key={n.date}>
                <td>{ngayVN(n.date)}</td>
                <td>{n.from_file ? "File chấm công (đã duyệt)" : "Máy chấm công"}</td>
                <td className="t-center">{n.events}</td>
                <td className="t-center">{n.counted ? "✓" : <span style={{ color: "#C0392B" }}>Không (1 lượt)</span>}</td>
                <td className="t-center">{n.has_duty_shift ? "T" : ""}</td>
              </tr>
            )) : <tr><td colSpan={5} className="muted" style={{ padding: 12 }}>Chưa có ngày công nào được duyệt trong tháng.</td></tr>}
          </tbody>
          {Number(a.pending_file_days) ? <caption style={{ captionSide: "bottom", fontSize: 12, padding: 6, color: "#b7791f" }}>{a.pending_file_days} ngày công từ file đang chờ quản lý duyệt (chưa tính).</caption> : null}
        </table>
      ) : null}

      {tab === "ca" ? (
        <table className="tbl" style={{ width: "100%", fontSize: 13 }}>
          <thead><tr><th>Ngày</th><th>Lớp</th><th className="t-center">Lượt HS</th><th>Nguồn</th><th className="t-right">Tiền ca</th></tr></thead>
          <tbody>
            {caDay.length ? caDay.map((s) => (
              <tr key={s.session_id}>
                <td>{ngayVN(s.session_date)}</td>
                <td>{s.lop}</td>
                <td className="t-center">{nn ? "—" : s.payable_student_attendance_count}</td>
                <td>{NGUON[s.payable_source] || s.payable_source || ""}</td>
                <td className="t-right" title={nn ? "Đơn giá 1 ca" : `${s.payable_student_attendance_count} × ${t(s.donGia)} × ${s.chia}%`}>{t(s.tien)}</td>
              </tr>
            )) : <tr><td colSpan={5} className="muted" style={{ padding: 12 }}>Chưa có ca dạy nào có báo cáo đã duyệt trong tháng.</td></tr>}
            {caDay.length ? (
              <tr><td colSpan={4} style={{ fontWeight: 800 }}>Tổng lương thực dạy</td><td className="t-right" style={{ fontWeight: 800 }}>{t(c.teaching_salary)}</td></tr>
            ) : null}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
