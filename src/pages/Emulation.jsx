import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import YearPlan from "../components/emulation/YearPlan";
import KpiScoreBoard from "../components/emulation/KpiScoreBoard";
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
const VAI_TU_CHAM = new Set(["teacher", "staff", "center_manager", "training_manager", "admin", "superadmin"]);

export default function Emulation() {
  const { role } = useAuth();
  const homNay = new Date();

  const [tab, setTab] = useState("cham");
  const [thang, setThang] = useState(homNay.getMonth() + 1);
  const [nam, setNam] = useState(homNay.getFullYear());
  const [thongBao, setThongBao] = useState("");

  const laQuanLy = VAI_QUAN_LY.has(role);

  return (
    <Page className="v4page">
      <PageHeader
        crumbs={[{ label: "Tổng quan", to: "/" }, { label: "Thi đua tháng" }]}
        title="Thi đua tháng"
        description="Khung thi đua cả năm và bảng chấm điểm thi đua từng tháng"
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
          <button type="button" className={tab === "cham" ? "is-active" : ""}
                  aria-pressed={tab === "cham"} onClick={() => setTab("cham")}>
            Bảng chấm thi đua tháng
          </button>
          <button type="button" className={tab === "kehoach" ? "is-active" : ""}
                  aria-pressed={tab === "kehoach"} onClick={() => setTab("kehoach")}>
            Kế hoạch năm học
          </button>
        </div>

        {tab === "cham" ? (
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
        <YearPlan />
      ) : (
        <KpiScoreBoard
          month={thang}
          year={nam}
          canScoreSelf={VAI_TU_CHAM.has(role)}
          canScoreManager={laQuanLy}
          canReview={laQuanLy}
          onNotice={setThongBao}
        />
      )}
    </Page>
  );
}
