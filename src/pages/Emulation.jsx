import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import YearPlan from "../components/emulation/YearPlan";
import KpiScoreBoard from "../components/emulation/KpiScoreBoard";
import KpiAdminBoard from "./KpiAdminBoard";
import KpiFrameBoard from "../components/emulation/KpiFrameBoard";
import { Page, PageHeader } from "../ui";
import "../styles/emulation.css";

/**
 * Thi đua tháng = KẾ HOẠCH NĂM HỌC + BẢNG CHẤM THI ĐUA TỪNG THÁNG.
 *
 * Gộp hai thứ vào một màn vì chúng là hai đầu của cùng một quy trình: đầu tháng
 * nhìn khung năm để biết trọng tâm, cuối tháng chấm điểm dựa trên chính khung đó.
 *
 * Lưu ý: /monthly-scorecards (menu cũ cũng tên "Thi đua tháng") thực chất là màn
 * NHẬP BẢNG ĐIỂM HỌC VIÊN và là lối vào duy nhất của việc đó, nên không thay thế
 * mà tách ra, trả lại tên đúng cho cả hai.
 */

const THANG = Array.from({ length: 12 }, (_, i) => i + 1);
const NAM = [2025, 2026, 2027];

const VAI_QUAN_LY = new Set(["admin", "superadmin", "center_manager", "training_manager"]);
// Tạo khung mặc định chỉ dành cho admin/super admin — khớp đúng luật backend,
// nếu rộng hơn thì quản lý cơ sở sẽ thấy nút rồi bấm vào nhận 403.
const VAI_TAO_KHUNG = new Set(["admin", "superadmin"]);
// Ai CÓ phiếu thi đua của chính mình. Chủ dự án chốt (27/08/2026): chỉ giáo viên
// (và nhân viên) lập phiếu; quản lý / admin / super admin chỉ chấm lại và duyệt,
// không có phiếu riêng. Vì vậy các vai đó không thấy tab "Phiếu của tôi" nữa.
const VAI_TU_CHAM = new Set(["teacher", "staff"]);

export default function Emulation() {
  const { role } = useAuth();
  const homNay = new Date();

  // Quản lý mở màn này chủ yếu để CHẤM phiếu người khác, nên vào thẳng tab đó;
  // giáo viên/nhân viên thì vào tab tự chấm. Cùng một menu, khác vai khác nội dung.
  const [tab, setTab] = useState(() => (VAI_QUAN_LY.has(role) ? "quantri" : "cham"));
  const [thang, setThang] = useState(homNay.getMonth() + 1);
  const [nam, setNam] = useState(homNay.getFullYear());
  const [thongBao, setThongBao] = useState("");

  const laQuanLy = VAI_QUAN_LY.has(role);
  // Chấm phiếu NGƯỜI KHÁC. Danh sách vai phải khớp VAI_CHAM bên kpi/views.py,
  // lệch là hiện tab ra rồi bấm vào nhận 403.
  const chamDuocNguoiKhac = laQuanLy;
  const coPhieuCuaMinh = VAI_TU_CHAM.has(role);
  const taoDuocKhung = VAI_TAO_KHUNG.has(role);

  return (
    <Page className="v4page">
      <PageHeader
        crumbs={[{ label: "Tổng quan", to: "/" }, { label: "Thi đua tháng" }]}
        title="Thi đua tháng"
        description={
          chamDuocNguoiKhac
            ? "Chấm lại và duyệt phiếu thi đua của giáo viên, cùng khung thi đua cả năm"
            : "Khung thi đua cả năm và bảng chấm điểm thi đua từng tháng"
        }
      />

      {thongBao ? (
        <div className="alert green" role="status" style={{ marginBottom: 14 }}>
          <span>✅</span>
          <div style={{ flex: 1 }}>{thongBao}</div>
          <button type="button" className="btn ghost sm" onClick={() => setThongBao("")}>Đóng</button>
        </div>
      ) : null}

      <div className="em-bar">
        <div className="em-tabs" role="group" aria-label="Phần của thi đua tháng">
          {chamDuocNguoiKhac && (
            <button type="button" className={tab === "quantri" ? "is-active" : ""}
                    aria-pressed={tab === "quantri"} onClick={() => setTab("quantri")}>
              Chấm thi đua
            </button>
          )}
          {coPhieuCuaMinh && (
            <button type="button" className={tab === "cham" ? "is-active" : ""}
                    aria-pressed={tab === "cham"} onClick={() => setTab("cham")}>
              Bảng chấm thi đua tháng
            </button>
          )}
          {/* Ai cũng xem được: giáo viên cần biết tháng này bị chấm theo tiêu chí
              nào. Chỉ admin/super admin mới thấy nút "Sửa khung" bên trong. */}
          <button type="button" className={tab === "khung" ? "is-active" : ""}
                  aria-pressed={tab === "khung"} onClick={() => setTab("khung")}>
            Khung thi đua
          </button>
          <button type="button" className={tab === "kehoach" ? "is-active" : ""}
                  aria-pressed={tab === "kehoach"} onClick={() => setTab("kehoach")}>
            Kế hoạch năm học
          </button>
        </div>

        {tab !== "kehoach" && tab !== "khung" ? (
          <div className="em-period">
            <label>
              <span>Tháng</span>
              <select value={thang} onChange={(e) => setThang(Number(e.target.value))}>
                {THANG.map((m) => <option key={m} value={m}>Tháng {m}</option>)}
              </select>
            </label>
            <label>
              <span>Năm</span>
              <select value={nam} onChange={(e) => setNam(Number(e.target.value))}>
                {NAM.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
          </div>
        ) : null}
      </div>

      {tab === "kehoach" ? (
        <YearPlan suaDuoc={laQuanLy} taoDuocKhung={taoDuocKhung} />
      ) : tab === "khung" ? (
        <KpiFrameBoard suaDuoc={taoDuocKhung} onNotice={setThongBao} />
      ) : tab === "quantri" || !coPhieuCuaMinh ? (
        /* Vai không có phiếu riêng mà tab lỡ rơi vào "cham" (state cũ trong
           phiên đang mở) thì vẫn ra bảng chấm, không rơi vào màn trắng. */
        <KpiAdminBoard nhungTrongTrang month={thang} year={nam} />
      ) : (
        <KpiScoreBoard
          month={thang}
          year={nam}
          canScoreSelf={VAI_TU_CHAM.has(role)}
          canScoreManager={laQuanLy}
          canReview={laQuanLy}
          taoDuocKhung={taoDuocKhung}
          onNotice={setThongBao}
        />
      )}
    </Page>
  );
}
