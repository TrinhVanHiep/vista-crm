import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getViecCanLam, henLaiCa, henLaiLich } from "../services/calendarService";
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
  const [hen, setHen] = useState(null);
  // Trễ hạn mà KHÔNG xin gia hạn (15/10/2026): popup riêng bắt liên hệ quản lý, hiện trước.
  const [coY, setCoY] = useState(null); // { so, quanLy: [{ten, vai, sdt}] } // { khoa, session_id | lich_id, ngay, lyDo, loi }
  const khoaViec = (v) => (v.lich_id ? `lich-${v.lich_id}` : `ca-${v.session_id}`);
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
        if (data?.so_tre_khong_hen) setCoY({ so: data.so_tre_khong_hen, quanLy: data.quan_ly || [] });
        setMo(ds.length > 0);
      })
      .catch(() => {});
    return () => { con = false; };
  }, [userId, khoa]);

  const dong = () => {
    setMo(false);
    try { window.sessionStorage.setItem(khoa, "1"); } catch { /* bỏ qua */ }
  };

  const ngayVN = (iso) => (iso ? iso.split("-").reverse().slice(0, 2).join("/") : "");
  const homNay = new Date();
  const isoCach = (n) => {
    const d = new Date(homNay);
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const tongLoi = viec.reduce((n, v) => n + (v.so_loi || 0), 0);

  const guiHen = async () => {
    try {
      const han = hen.lich_id
        ? (await henLaiLich(hen.lich_id, { hanMoi: hen.ngay, lyDo: hen.lyDo })).han
        : (await henLaiCa(hen.session_id, { hanMoi: hen.ngay, lyDo: hen.lyDo })).han;
      setViec((ds) => ds.map((v) => (khoaViec(v) === hen.khoa
        ? { ...v, da_hen: true, han_hen: han, han, qua_han: false } : v)));
      setHen(null);
    } catch (e) {
      setHen((h) => ({ ...h, loi: e?.response?.data?.detail || "Không hẹn lại được." }));
    }
  };

  const di = (link) => {
    dong();
    navigate(link);
  };

  const daRo = () => setCoY(null);
  const soZalo = (sdt) => String(sdt || "").replace(/[^0-9]/g, "");

  if (coY) {
    return (
      <Modal
        open
        onClose={daRo}
        closeOnBackdrop={false}
        title="⛔ Trễ hạn mà chưa xin gia hạn"
        subtitle={`${coY.so} việc đã quá hạn, đang bị tính lỗi mỗi đêm và bạn chưa bấm Hẹn lại`}
        size="md"
        footer={<Button variant="primary" onClick={daRo}>Tôi sẽ liên hệ quản lý ngay</Button>}
      >
        <p style={{ marginTop: 0 }}>
          Việc trễ hạn mà không xin gia hạn được coi là <b>chủ động bỏ việc</b>. Hãy <b>liên hệ trực tiếp quản lý</b> để
          trao đổi lại công việc — quản lý sẽ quyết định gia hạn, giao lại hay giữ nguyên lỗi.
        </p>
        {coY.quanLy.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {coY.quanLy.map((q) => (
              <div key={q.ten + q.vai} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                                                padding: "10px 12px", border: "1px solid #F3D3C2", borderRadius: 10, background: "#FFF7F2" }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 700 }}>{q.ten}</div>
                  <div className="small muted">{q.vai}{q.sdt ? ` · ${q.sdt}` : ""}</div>
                </div>
                {q.sdt ? (
                  <>
                    <a className="btn ghost sm" href={`tel:${soZalo(q.sdt)}`}>📞 Gọi</a>
                    <a className="btn ghost sm" href={`https://zalo.me/${soZalo(q.sdt)}`} target="_blank" rel="noreferrer">💬 Zalo</a>
                  </>
                ) : <span className="small muted">Chưa có SĐT</span>}
              </div>
            ))}
          </div>
        ) : <p className="small muted">Liên hệ quản lý cơ sở / quản lý đào tạo của trung tâm.</p>}
      </Modal>
    );
  }

  return (
    <Modal
      open={mo}
      onClose={dong}
      title="⚠️ Nhiệm vụ cần hoàn thành ngay"
      subtitle={`${viec.length} việc đang quá hạn hoặc chờ bạn xử lý`
        + (tongLoi ? ` · ${tongLoi} lỗi đã tính (trừ ${Math.min(tongLoi, 10)} điểm thi đua tháng)` : "")}
      size="md"
      footer={(
        <>
          <Button onClick={dong}>Để sau</Button>
          <Button variant="primary" onClick={() => di(viec[0]?.link || "/bao-cao-ngay")}>Xử lý ngay</Button>
        </>
      )}
    >
      {viec.some((v) => v.tinh_loi) ? (
        <p className="small muted" style={{ marginTop: 0 }}>
          Mỗi ca dạy phải có báo cáo kèm ít nhất 1 ảnh minh chứng, mỗi đầu mục lịch công tác phải chuyển
          “Hoàn thành” kèm minh chứng — trước 24:00 ngày hạn. Quá hạn mà chưa xong thì mỗi đêm tính 1 lỗi (trừ 1 điểm thi đua). Chưa kịp
          thì bấm <b>Hẹn lại</b> và chọn ngày cụ thể — mỗi đầu mục được hẹn một lần.
        </p>
      ) : null}
      <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 10 }}>
        {viec.slice(0, 12).map((v, i) => (
          <li key={`${v.loai}-${v.session_id || v.lich_id || i}`}>
            <button
              type="button"
              onClick={() => di(v.link)}
              style={{ background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left", font: "inherit", color: "inherit", textDecoration: "underline" }}
            >
              {v.tieu_de}
            </button>
            {v.tinh_loi ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 12.5, marginTop: 3 }}>
                {v.so_loi ? <span style={{ color: "#C0392B", fontWeight: 700 }}>{v.so_loi} lỗi</span> : null}
                <span style={{ color: v.qua_han ? "#C0392B" : "#B7791F" }}>
                  {v.da_hen ? `Đã hẹn tới 24:00 ${ngayVN(v.han_hen)}` : v.qua_han ? "Quá hạn — đang tính lỗi mỗi đêm" : `Hạn 24:00 ${ngayVN(v.han)}`}
                </span>
                {!v.da_hen ? (
                  <button type="button" className="btn ghost sm"
                          onClick={() => setHen({ khoa: khoaViec(v), session_id: v.session_id, lich_id: v.lich_id,
                                                  ngay: isoCach(1), lyDo: "", loi: "" })}>
                    Hẹn lại
                  </button>
                ) : null}
              </div>
            ) : null}
            {hen?.khoa === khoaViec(v) ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
                <input type="date" value={hen.ngay} min={isoCach(0)} max={isoCach(7)}
                       onChange={(e) => setHen((h) => ({ ...h, ngay: e.target.value }))} />
                <input type="text" placeholder="Lý do (bắt buộc)" value={hen.lyDo} style={{ flex: 1, minWidth: 160 }}
                       onChange={(e) => setHen((h) => ({ ...h, lyDo: e.target.value }))} />
                <Button variant="primary" onClick={guiHen} disabled={!hen.lyDo.trim()}>Lưu hẹn</Button>
                <Button onClick={() => setHen(null)}>Huỷ</Button>
                {hen.loi ? <div style={{ color: "#C0392B", fontSize: 12.5, width: "100%" }}>{hen.loi}</div> : null}
              </div>
            ) : null}
          </li>
        ))}
        {viec.length > 12 ? <li className="small muted">… và {viec.length - 12} việc khác</li> : null}
      </ul>
    </Modal>
  );
}
