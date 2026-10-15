import { useEffect, useState } from "react";
import apiClient from "../services/apiClient";
import { createStaffRequest, listGiaoVienChon } from "../services/calendarService";
import styles from "../styles/calendarDetail.module.css";

/**
 * Đổi người dạy / huỷ một ca dạy (15/10/2026).
 *
 *  - che_do "doi"    : giáo viên sửa ca ĐÃ DUYỆT -> chọn người dạy thay + lý do -> gửi đơn,
 *                      quản lý duyệt xong ca tự chuyển (backend staff_requests._ap_doi_ca).
 *  - che_do "xin_huy": giáo viên xin huỷ ca -> gửi đơn, quản lý duyệt là ca "Đã huỷ".
 *  - che_do "huy"    : quản lý huỷ ca trực tiếp (POST /teaching-sessions/{id}/cancel/),
 *                      giáo viên của ca nhận thông báo.
 * Quản lý ĐỔI NGƯỜI DẠY trực tiếp ở form "Sửa" (ô Giáo viên), không qua đây.
 */

const gio = (s) => (s ? new Date(s).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "");

const NHAN = {
  doi: { tieuDe: "Sửa ca đã duyệt — đổi người dạy", nut: "Gửi yêu cầu duyệt",
         ghiChu: "Ca đã được duyệt nên đổi người dạy phải qua quản lý. Duyệt xong, ca tự chuyển sang giáo viên mới và cả hai bên đều nhận thông báo." },
  xin_huy: { tieuDe: "Xin huỷ ca dạy", nut: "Gửi yêu cầu huỷ",
             ghiChu: "Đơn gửi tới quản lý. Duyệt xong, ca chuyển “Đã huỷ” — không tính lỗi chưa báo cáo và không tính lương ca này." },
  huy: { tieuDe: "Huỷ ca dạy", nut: "Huỷ ca",
         ghiChu: "Ca chuyển “Đã huỷ” ngay; giáo viên của ca nhận thông báo kèm lý do. Muốn đổi người dạy thì dùng nút Sửa." },
};

export default function NganDoiCa({ ca, tenLop, cheDo = "doi", onDong, onXong }) {
  const [ds, setDs] = useState([]);
  const [gv, setGv] = useState("");
  const [lyDo, setLyDo] = useState("");
  const [loi, setLoi] = useState("");
  const [dangGui, setDangGui] = useState(false);
  const nhan = NHAN[cheDo];

  useEffect(() => {
    if (cheDo !== "doi") return;
    listGiaoVienChon().then(setDs).catch(() => setLoi("Không tải được danh sách giáo viên."));
  }, [cheDo]);

  const ngay = ca.session_date ? ca.session_date.split("-").reverse().join("/") : "";
  const tieuDeDon = (dau) => `${dau} ${tenLop || ""} ${ngay}`.replace(/\s+/g, " ").trim();

  const gui = async () => {
    setLoi("");
    if (cheDo === "doi" && !gv) { setLoi("Chọn giáo viên dạy thay."); return; }
    if (!lyDo.trim()) { setLoi(cheDo === "doi" ? "Ghi lý do đổi ca." : "Ghi lý do huỷ ca."); return; }
    setDangGui(true);
    try {
      if (cheDo === "huy") {
        await apiClient.post(`/teaching-sessions/${ca.id}/cancel/`, { reason: lyDo.trim() });
        onXong?.(`Đã huỷ ca ${tenLop || ""} ${ngay}. Giáo viên đã được báo.`);
      } else if (cheDo === "xin_huy") {
        await createStaffRequest({ request_type: "huy_ca", title: tieuDeDon("Huỷ ca"), reason: lyDo.trim(),
                                   related_session: ca.id, start_date: ca.session_date });
        onXong?.("Đã gửi yêu cầu huỷ ca. Quản lý duyệt xong, ca sẽ chuyển “Đã huỷ”.");
      } else {
        await createStaffRequest({ request_type: "shift_change", title: tieuDeDon("Đổi ca"), reason: lyDo.trim(),
                                   related_session: ca.id, giao_vien_thay: Number(gv), start_date: ca.session_date });
        onXong?.("Đã gửi yêu cầu đổi người dạy. Quản lý duyệt xong, ca sẽ tự chuyển sang giáo viên mới.");
      }
    } catch (e) {
      const d = e?.response?.data;
      setLoi(d?.detail || Object.values(d || {}).flat()[0] || "Không thực hiện được.");
    } finally {
      setDangGui(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
      <div className={styles.modal} style={{ maxWidth: 480 }}>
        <header className={styles.modalHeader}>
          <div>
            <h2>{nhan.tieuDe}</h2>
            <p>{tenLop} · {ngay} · {gio(ca.start_at)}–{gio(ca.end_at)}</p>
          </div>
          <button type="button" className={styles.iconButton} aria-label="Đóng" onClick={onDong}>×</button>
        </header>
        <div style={{ display: "grid", gap: 12, padding: "4px 0 8px" }}>
          {loi ? <div style={{ color: "#c0392b", fontSize: 13 }}>{loi}</div> : null}
          {cheDo === "doi" ? (
            <label className={styles.formGroup}>
              <span>Giáo viên dạy</span>
              <select value={gv} onChange={(e) => setGv(e.target.value)}>
                <option value="">— Chọn giáo viên —</option>
                {ds.map((g) => <option key={g.id} value={g.id}>{g.ten}{g.nuoc_ngoai ? " (GV nước ngoài)" : ""}</option>)}
              </select>
            </label>
          ) : null}
          <label className={styles.formGroup}>
            <span>Lý do</span>
            <textarea rows={3} value={lyDo} onChange={(e) => setLyDo(e.target.value)}
                      placeholder={cheDo === "doi" ? "Ví dụ: ốm, việc gia đình, đã nhờ cô B dạy thay…" : "Ví dụ: giáo viên ốm đột xuất, lớp nghỉ bù vào…"} />
          </label>
          <p style={{ margin: 0, fontSize: 12.5, color: "#7d8592" }}>{nhan.ghiChu}</p>
        </div>
        <footer className={styles.modalFooter}>
          <button type="button" className={styles.secondaryButton} onClick={onDong}>Đóng</button>
          <button type="button" className={styles.primaryButton} disabled={dangGui} onClick={gui}
                  style={cheDo === "doi" ? undefined : { background: "#c0392b", borderColor: "#c0392b" }}>
            {dangGui ? "Đang gửi…" : nhan.nut}
          </button>
        </footer>
      </div>
    </div>
  );
}
