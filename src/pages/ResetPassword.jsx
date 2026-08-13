import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from "../services/apiClient";
import { Button, Field } from "../ui";

/**
 * Trang đặt mật khẩu từ liên kết gửi riêng.
 *
 * Backend đã có sẵn forgot_password + reset_password từ lâu, nhưng frontend
 * không hề có trang nào cho tuyến /reset-password/:uid/:token — nên liên kết
 * trong email đặt lại mật khẩu luôn rơi vào trang trắng rồi bị đẩy về trang chủ.
 * Trang này là điểm đến còn thiếu đó, dùng cho cả việc mời người mới đặt mật
 * khẩu lần đầu (tài khoản được tạo không kèm mật khẩu).
 */
export default function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  const [matKhau, setMatKhau] = useState("");
  const [nhapLai, setNhapLai] = useState("");
  const [loi, setLoi] = useState("");
  const [dangLuu, setDangLuu] = useState(false);
  const [xong, setXong] = useState(false);

  const guiDi = async (event) => {
    event.preventDefault();
    setLoi("");

    if (matKhau.length < 8) {
      setLoi("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }
    if (matKhau !== nhapLai) {
      setLoi("Hai lần nhập mật khẩu chưa khớp nhau.");
      return;
    }

    setDangLuu(true);
    try {
      await apiClient.post(`/users/reset_password/${uid}/${token}/`, {
        new_password: matKhau,
      });
      setXong(true);
      setTimeout(() => navigate("/login", { replace: true }), 2200);
    } catch (error) {
      const dulieu = error?.response?.data;
      // Token hỏng/hết hạn trả về {"error": "..."}; lỗi mật khẩu trả về
      // {"new_password": [...]}. Diễn giải sang tiếng Việt cho dễ hiểu.
      if (dulieu?.error) {
        setLoi("Liên kết không còn hiệu lực. Có thể mật khẩu đã được đặt trước đó, hoặc liên kết đã hết hạn — hãy xin quản trị viên gửi lại liên kết mới.");
      } else if (dulieu?.new_password?.length) {
        setLoi(dulieu.new_password.join(" "));
      } else {
        setLoi("Không đặt được mật khẩu. Vui lòng thử lại.");
      }
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <div className="rp-shell">
      <div className="rp-card">
        <div className="rp-brand">VISTA</div>

        {xong ? (
          <>
            <h1 className="rp-title">Đã đặt mật khẩu xong</h1>
            <p className="rp-sub">Đang chuyển sang trang đăng nhập...</p>
            <Button onClick={() => navigate("/login", { replace: true })}>
              Đăng nhập ngay
            </Button>
          </>
        ) : (
          <>
            <h1 className="rp-title">Đặt mật khẩu</h1>
            <p className="rp-sub">
              Chọn mật khẩu cho tài khoản của bạn. Tối thiểu 8 ký tự.
            </p>

            <form onSubmit={guiDi} className="rp-form">
              <Field label="Mật khẩu mới" required>
                <input
                  type="password"
                  value={matKhau}
                  autoComplete="new-password"
                  onChange={(e) => setMatKhau(e.target.value)}
                  placeholder="Ít nhất 8 ký tự"
                />
              </Field>

              <Field label="Nhập lại mật khẩu" required>
                <input
                  type="password"
                  value={nhapLai}
                  autoComplete="new-password"
                  onChange={(e) => setNhapLai(e.target.value)}
                  placeholder="Gõ lại mật khẩu ở trên"
                />
              </Field>

              {loi ? <div className="rp-error" role="alert">{loi}</div> : null}

              <Button type="submit" loading={dangLuu} disabled={dangLuu}>
                {dangLuu ? "Đang lưu..." : "Đặt mật khẩu"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
