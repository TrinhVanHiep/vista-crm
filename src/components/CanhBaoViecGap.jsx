import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getViecCanLam } from "../services/calendarService";
import { Button, Modal } from "../ui";

/**
 * Cảnh báo "Nhiệm vụ cần hoàn thành ngay" khi vào site.
 *
 * Giáo viên: ca dạy đã quá hạn báo cáo / báo cáo bị trả lại chưa nộp lại.
 * Quản lý: báo cáo đang chờ đúng cấp mình ký. Nguồn là cùng một hàm backend với
 * tin nhắc Zalo (teaching/nhac_viec.py), nên hai nơi luôn nói cùng một con số.
 *
 * Hiện MỘT lần mỗi phiên trình duyệt (sessionStorage) — bật lại mỗi lần đổi
 * trang thì người dùng sẽ tắt đi theo phản xạ mà không đọc.
 */
export default function CanhBaoViecGap({ userId }) {
  const navigate = useNavigate();
  const [viec, setViec] = useState([]);
  const [mo, setMo] = useState(false);
  const khoa = `vista-crm.canh-bao-viec.${userId}`;

  useEffect(() => {
    if (!userId) return undefined;
    try {
      if (window.sessionStorage.getItem(khoa)) return undefined;
    } catch {
      /* trình duyệt chặn storage: vẫn hiện, chỉ là không nhớ đã hiện */
    }
    let con = true;
    getViecCanLam()
      .then((data) => {
        if (!con) return;
        const ds = Array.isArray(data?.items) ? data.items : [];
        setViec(ds);
        setMo(ds.length > 0);
      })
      .catch(() => {});
    return () => { con = false; };
  }, [userId, khoa]);

  const dong = () => {
    setMo(false);
    try { window.sessionStorage.setItem(khoa, "1"); } catch { /* bỏ qua */ }
  };

  const di = (link) => {
    dong();
    navigate(link);
  };

  return (
    <Modal
      open={mo}
      onClose={dong}
      title="⚠️ Nhiệm vụ cần hoàn thành ngay"
      subtitle={`${viec.length} việc đang quá hạn hoặc chờ bạn xử lý`}
      size="md"
      footer={(
        <>
          <Button onClick={dong}>Để sau</Button>
          <Button variant="primary" onClick={() => di(viec[0]?.link || "/bao-cao-ngay")}>Xử lý ngay</Button>
        </>
      )}
    >
      <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
        {viec.slice(0, 12).map((v, i) => (
          <li key={`${v.loai}-${v.session_id || i}`}>
            <button
              type="button"
              onClick={() => di(v.link)}
              style={{ background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left", font: "inherit", color: "inherit", textDecoration: "underline" }}
            >
              {v.tieu_de}
            </button>
          </li>
        ))}
        {viec.length > 12 ? <li className="small muted">… và {viec.length - 12} việc khác</li> : null}
      </ul>
    </Modal>
  );
}
