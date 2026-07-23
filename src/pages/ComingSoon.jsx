import { useLocation, useNavigate } from "react-router-dom";
import "../styles/vista4.css";

const TITLES = {
  "/truyen-thong": ["Truyền thông", "Quản lý chiến dịch & nội dung truyền thông đa kênh"],
  "/hoc-phi": ["Học phí 2026", "Quản lý học phí, hoá đơn và công nợ học viên"],
  "/kho-tai-lieu": ["Kho tài liệu", "Tài liệu, giáo trình và biểu mẫu dùng chung"],
  "/cai-dat": ["Cài đặt hệ thống", "Cấu hình hệ thống, phân quyền và tuỳ chỉnh"],
};

function ComingSoon() {
  const location = useLocation();
  const navigate = useNavigate();
  const [title, sub] = TITLES[location.pathname] || ["Tính năng", "Đang được phát triển"];
  return (
    <div className="v4page">
      <div className="content-col">
        <div className="page-head">
          <h1>{title}</h1>
          <p>{sub}</p>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "52px 20px" }}>
          <div style={{ fontSize: 54, marginBottom: 12 }}>🚧</div>
          <h3 style={{ marginBottom: 6 }}>Tính năng đang phát triển</h3>
          <p className="small muted" style={{ maxWidth: 440, margin: "0 auto 18px" }}>
            Màn <b>{title}</b> đang được xây dựng và sẽ sớm ra mắt. Hiện bạn có thể dùng các mục khác trong menu bên trái.
          </p>
          <button type="button" className="btn primary" onClick={() => navigate("/")}>
            Về Tổng quan
          </button>
        </div>
      </div>
    </div>
  );
}

export default ComingSoon;
