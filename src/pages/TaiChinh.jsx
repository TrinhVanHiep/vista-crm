import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { VAI_QUAN_TRI } from "../auth/permissions";
import DongSo from "../components/finance/DongSo";
import HocPhiCongNo from "../components/finance/HocPhiCongNo";
import SoGiaoDich from "../components/finance/SoGiaoDich";
import TongQuanTaiChinh from "../components/finance/TongQuanTaiChinh";
import "../styles/finance.css";
import { color as mau } from "../components/finance/v3/theme";
import { Page, PageHeader } from "../ui";

/**
 * Tài chính V2 — MỘT tab cấp 1, bên trong 7 phân hệ cấp 2.
 *
 * Không tách thành nhiều mục trên thanh điều hướng trái, vì các nghiệp vụ này
 * dùng chung một nguồn sổ giao dịch và cùng một luồng kiểm soát: tách ra thì
 * người dùng phải tự nhớ mình đang ở kỳ nào, và số liệu ở hai màn rất dễ lệch
 * nhau do mỗi màn lọc một kiểu.
 */

const PHAN_HE = [
  ["overview", "Tổng quan"],
  ["tuition", "Học phí & Công nợ"],
  ["income", "Thu khác"],
  ["expense", "Khoản chi"],
  ["ledger", "Sổ giao dịch & Đối soát"],
  ["payroll", "Bảng lương"],
  ["report", "Báo cáo & Đóng sổ"],
];

const THANG = Array.from({ length: 12 }, (_, i) => i + 1);

export default function TaiChinh() {
  const { user, role } = useAuth();
  const bayGio = useMemo(() => new Date(), []);
  const [tab, setTab] = useState("overview");
  const [thang, setThang] = useState(bayGio.getMonth() + 1);
  const [nam, setNam] = useState(bayGio.getFullYear());
  const [thongBao, setThongBao] = useState("");

  // role đã được AuthProvider chuẩn hoá về chuỗi; đọc thẳng user.role.name
  // thì hỏng với tài khoản mà API trả role dạng chuỗi.
  const laQuanTri = !!user && (user.is_superuser || VAI_QUAN_TRI.includes(role));

  // Thông báo thành công tự tắt; để mãi trên màn thì lần sau người dùng không
  // phân biệt được đây là kết quả vừa xong hay của thao tác trước.
  useEffect(() => {
    if (!thongBao) return undefined;
    const h = setTimeout(() => setThongBao(""), 5000);
    return () => clearTimeout(h);
  }, [thongBao]);

  const nam4 = [nam - 1, nam, nam + 1].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <Page className="fin-v3">
      <PageHeader
        crumbs={[{ label: "Tổng quan", to: "/" }, { label: "Tài chính" }]}
        title="Tài chính"
        description="Thu học phí, công nợ, sổ giao dịch, đối soát và đóng sổ trên cùng một nguồn dữ liệu."
        actions={(
          <div className="fin-bar" style={{ margin: 0 }}>
            <select value={thang} onChange={(e) => setThang(Number(e.target.value))}>
              {THANG.map((t) => (
                <option key={t} value={t}>Tháng {String(t).padStart(2, "0")}</option>
              ))}
            </select>
            <select value={nam} onChange={(e) => setNam(Number(e.target.value))}>
              {nam4.map((y) => <option key={y} value={y}>Năm {y}</option>)}
            </select>
          </div>
        )}
      />

      {thongBao ? (
        /* Toast góc phải dưới theo bản thiết kế — không chiếm chỗ trong luồng
           nội dung nên bảng không bị nhảy lên xuống mỗi lần thao tác xong. */
        <div style={{
          position: "fixed", right: 24, bottom: 24, zIndex: 300,
          background: mau.navy, color: "#fff", borderRadius: 10,
          padding: "13px 20px", fontSize: 13.5, fontWeight: 600,
          boxShadow: "0 8px 24px rgba(27,36,48,0.10)", maxWidth: "min(420px, 90vw)",
        }}>{thongBao}</div>
      ) : null}

      <div style={{
        display: "flex", gap: 26, marginTop: 4, marginBottom: 0,
        borderBottom: "1px solid " + mau.borderStrong, overflowX: "auto",
      }} role="tablist">
        {PHAN_HE.map(([ma, ten]) => {
          const dang = tab === ma;
          return (
            <button
              key={ma}
              type="button"
              role="tab"
              aria-selected={dang}
              onClick={() => setTab(ma)}
              style={{
                background: "none", border: 0, cursor: "pointer", padding: "0 2px 12px",
                fontSize: 14, whiteSpace: "nowrap", flex: "0 0 auto",
                borderBottom: "2.5px solid " + (dang ? mau.orange : "transparent"),
                color: dang ? mau.orange : mau.muted,
                fontWeight: dang ? 700 : 500,
              }}
            >
              {ten}
            </button>
          );
        })}
      </div>

      <div className="fin-v3-nen" style={{ marginTop: 18 }}>
      {tab === "overview" ? (
        <TongQuanTaiChinh thang={thang} nam={nam} onDoiTab={setTab} />
      ) : null}

      {tab === "tuition" ? (
        <HocPhiCongNo
          thang={thang} nam={nam} laQuanTri={laQuanTri} onNotice={setThongBao}
        />
      ) : null}

      {tab === "ledger" ? (
        <SoGiaoDich thang={thang} nam={nam} onNotice={setThongBao} />
      ) : null}

      {tab === "report" ? (
        <>
          <DongSo thang={thang} nam={nam} laQuanTri={laQuanTri} onNotice={setThongBao} />
          <p className="fin-mo" style={{ fontSize: 13, marginTop: 14 }}>
            Biểu đồ thu chi theo tháng và phần nhập doanh thu từ Excel của bản trước
            vẫn dùng được ở <Link to="/finance/thong-ke">Thống kê thu chi</Link>.
          </p>
        </>
      ) : null}

      {tab === "income" ? (
        <ChuaDung
          ten="Thu khác"
          mo="Khảo thí, giáo trình, đồng phục và các khoản thu ngoài học phí."
          gom={[
            "Danh mục khoản thu khác, lập phiếu thu theo danh mục.",
            "Phiếu thu vẫn sinh giao dịch trong sổ và đi qua đối soát như thu học phí.",
          ]}
          tam="Trong lúc chờ, khoản thu ngoài học phí ghi thẳng ở phân hệ “Sổ giao dịch & Đối soát” bằng nút Ghi giao dịch."
        />
      ) : null}

      {tab === "expense" ? (
        <ChuaDung
          ten="Khoản chi"
          mo="Đề nghị chi → kiểm tra ngân sách → phê duyệt → ghi nhận phải trả → thanh toán."
          gom={[
            "Đề nghị chi kèm chứng từ và luồng phê duyệt nhiều cấp.",
            "Tách rõ chi phí phát sinh / đã thanh toán / còn phải trả.",
            "Nhà cung cấp, tạm ứng và hoàn ứng.",
          ]}
          tam="Trong lúc chờ, khoản chi ghi thẳng ở phân hệ “Sổ giao dịch & Đối soát” bằng nút Ghi giao dịch."
        />
      ) : null}

      {tab === "payroll" ? (
        <ChuaDung
          ten="Bảng lương"
          mo="Tính từ dữ liệu nguồn đã chốt, không nhập tay số thực nhận."
          gom={[
            "Kỳ lương, tính nháp từ lịch dạy và chấm công đã chốt.",
            "Xem ngược về từng buổi dạy, từng khoản phụ cấp, từng điều chỉnh đã duyệt.",
            "Khóa bảng lương trước khi đóng sổ.",
          ]}
          tam="Hiện lương vẫn xử lý ở mục Bảng lương cũ; phần nối vào sổ giao dịch làm sau."
        />
      ) : null}
      </div>
    </Page>
  );
}

/**
 * Phân hệ chưa dựng.
 *
 * Nói thẳng là chưa có và chỉ ra chỗ làm tạm, thay vì bày dữ liệu giả cho đẹp
 * màn hình — dữ liệu giả trong màn tài chính là thứ nguy hiểm nhất, vì người
 * xem không có cách nào biết con số nào thật.
 */
function ChuaDung({ ten, mo, gom, tam }) {
  return (
    <div className="fin-sau">
      <h3>{ten} — chưa dựng xong</h3>
      <p>{mo}</p>
      <ul>{gom.map((g) => <li key={g}>{g}</li>)}</ul>
      {tam ? <p style={{ marginTop: 14 }}><b>Hiện tại:</b> {tam}</p> : null}
    </div>
  );
}
