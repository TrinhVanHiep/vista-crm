import { useEffect, useState } from "react";
import { createStaffRequest, listGiaoVienChon } from "../services/calendarService";
import styles from "../styles/calendarDetail.module.css";

/**
 * Đổi ca / nhờ dạy thay (15/10/2026). Ca đã duyệt thì giáo viên không sửa được nữa,
 * nên đổi người dạy đi qua đơn: chọn giáo viên dạy thay + lý do -> quản lý đào tạo
 * duyệt -> ca tự chuyển sang người đó (backend staff_requests._ap_doi_ca).
 */

const gio = (s) => (s ? new Date(s).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "");

export default function NganDoiCa({ ca, tenLop, onDong, onXong }) {
  const [ds, setDs] = useState([]);
  const [gv, setGv] = useState("");
  const [lyDo, setLyDo] = useState("");
  const [loi, setLoi] = useState("");
  const [dangGui, setDangGui] = useState(false);

  useEffect(() => {
    listGiaoVienChon().then(setDs).catch(() => setLoi("Không tải được danh sách giáo viên."));
  }, []);

  const ngay = ca.session_date ? ca.session_date.split("-").reverse().join("/") : "";

  const gui = async () => {
    setLoi("");
    if (!gv) { setLoi("Chọn giáo viên dạy thay."); return; }
    if (!lyDo.trim()) { setLoi("Ghi lý do đổi ca."); return; }
    setDangGui(true);
    try {
      await createStaffRequest({
        request_type: "shift_change",
        title: `Đổi ca ${tenLop || ""} ${ngay}`.replace(/\s+/g, " ").trim(),
        reason: lyDo.trim(),
        related_session: ca.id,
        giao_vien_thay: Number(gv),
        start_date: ca.session_date,
      });
      onXong?.("Đã gửi đơn đổi ca. Quản lý đào tạo duyệt xong, ca sẽ tự chuyển sang giáo viên dạy thay.");
    } catch (e) {
      const d = e?.response?.data;
      setLoi(d?.detail || Object.values(d || {}).flat()[0] || "Không gửi được đơn đổi ca.");
    } finally {
      setDangGui(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
      <div className={styles.modal} style={{ maxWidth: 480 }}>
        <header className={styles.modalHeader}>
          <div>
            <h2>Đổi ca / nhờ dạy thay</h2>
            <p>{tenLop} · {ngay} · {gio(ca.start_at)}–{gio(ca.end_at)}</p>
          </div>
          <button type="button" className={styles.iconButton} aria-label="Đóng" onClick={onDong}>×</button>
        </header>
        <div style={{ display: "grid", gap: 12, padding: "4px 0 8px" }}>
          {loi ? <div className={styles.errorBox || ""} style={{ color: "#c0392b", fontSize: 13 }}>{loi}</div> : null}
          <label className={styles.formGroup}>
            <span>Giáo viên dạy thay</span>
            <select value={gv} onChange={(e) => setGv(e.target.value)}>
              <option value="">— Chọn giáo viên —</option>
              {ds.map((g) => <option key={g.id} value={g.id}>{g.ten}{g.nuoc_ngoai ? " (GV nước ngoài)" : ""}</option>)}
            </select>
          </label>
          <label className={styles.formGroup}>
            <span>Lý do</span>
            <textarea rows={3} value={lyDo} onChange={(e) => setLyDo(e.target.value)}
                      placeholder="Ví dụ: ốm, việc gia đình, đã nhờ cô B dạy thay…" />
          </label>
          <p style={{ margin: 0, fontSize: 12.5, color: "#7d8592" }}>
            Đơn gửi tới quản lý đào tạo. Duyệt xong, ca chuyển sang giáo viên dạy thay và cả hai bên đều nhận thông báo.
          </p>
        </div>
        <footer className={styles.modalFooter}>
          <button type="button" className={styles.secondaryButton} onClick={onDong}>Huỷ</button>
          <button type="button" className={styles.primaryButton} disabled={dangGui} onClick={gui}>
            {dangGui ? "Đang gửi…" : "Gửi đơn đổi ca"}
          </button>
        </footer>
      </div>
    </div>
  );
}
