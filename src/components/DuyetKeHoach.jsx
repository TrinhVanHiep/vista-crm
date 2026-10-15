import { useEffect, useMemo, useState } from "react";
import { duyetKeHoach, listKeHoachChoDuyet } from "../services/calendarService";
import styles from "../styles/calendarDetail.module.css";

/**
 * Duyệt kế hoạch việc nhân sự tự đăng (15/10/2026) — giống "Duyệt lịch báo giảng tháng"
 * của giáo viên. Designer / kế toán / giáo viên đăng việc lên Lịch làm việc -> quản lý
 * duyệt nhận việc (hoặc từ chối = huỷ việc, không tính lỗi). Sau đó người làm báo cáo
 * tiến độ + minh chứng và quản lý nghiệm thu Đạt / Không đạt ở từng đầu mục.
 */

const LOAI = { student: "Học sinh - Lớp học", marketing: "Truyền thông", finance: "Tài chính", hr: "Hành chính - Nhân sự" };
const ngayVN = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");
const ten = (u) => (u ? u.name || u.email : "");

export default function DuyetKeHoach({ onDong, onXong }) {
  const [ds, setDs] = useState(null);
  const [chon, setChon] = useState(() => new Set());
  const [lyDo, setLyDo] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);

  const tai = () => listKeHoachChoDuyet().then((x) => { setDs(x); setChon(new Set(x.map((l) => l.id))); })
    .catch(() => setLoi("Không tải được danh sách."));
  useEffect(() => { tai(); }, []);

  const theoNguoi = useMemo(() => {
    const m = new Map();
    (ds || []).forEach((l) => {
      const k = ten(l.assigned_to) || ten(l.created_by) || "—";
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(l);
    });
    return [...m.entries()];
  }, [ds]);

  const bat = (id) => setChon((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const gui = async (kq) => {
    setLoi("");
    if (!chon.size) { setLoi("Chọn ít nhất một đầu mục."); return; }
    if (kq === "tu_choi" && !lyDo.trim()) { setLoi("Ghi lý do từ chối."); return; }
    setDang(true);
    try {
      const r = await duyetKeHoach([...chon], kq, lyDo.trim());
      onXong?.(`${kq === "duyet" ? "Đã duyệt" : "Đã từ chối"} kế hoạch ${r.so} đầu mục.`);
      setLyDo("");
      await tai();
    } catch (e) {
      setLoi(e?.response?.data?.detail || "Không thực hiện được.");
    } finally {
      setDang(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
      <div className={styles.modal} style={{ maxWidth: 760 }}>
        <header className={styles.modalHeader}>
          <div>
            <h2>Duyệt kế hoạch việc nhân sự</h2>
            <p>Việc nhân sự tự đăng lên Lịch làm việc. Duyệt = nhận việc; từ chối = huỷ việc (không tính lỗi).</p>
          </div>
          <button type="button" className={styles.iconButton} aria-label="Đóng" onClick={onDong}>×</button>
        </header>
        <div style={{ display: "grid", gap: 12, maxHeight: "60vh", overflowY: "auto", padding: "4px 0" }}>
          {loi ? <div style={{ color: "#c0392b", fontSize: 13 }}>{loi}</div> : null}
          {ds == null ? <div style={{ color: "#7d8592" }}>Đang tải…</div>
            : !ds.length ? <div style={{ color: "#7d8592" }}>Không có kế hoạch nào chờ duyệt.</div>
            : theoNguoi.map(([nguoi, viec]) => (
              <div key={nguoi}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{nguoi} · {viec.length} đầu mục</div>
                {viec.map((l) => (
                  <label key={l.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0",
                                             borderTop: "1px dashed #eadfd5", fontSize: 13, cursor: "pointer" }}>
                    <input type="checkbox" checked={chon.has(l.id)} onChange={() => bat(l.id)} style={{ marginTop: 3 }} />
                    <span style={{ flex: 1 }}>{l.title}</span>
                    <span style={{ color: "#7d8592", whiteSpace: "nowrap" }}>{LOAI[l.category] || l.category} · {ngayVN(l.event_date)}</span>
                  </label>
                ))}
              </div>
            ))}
        </div>
        <footer className={styles.modalFooter} style={{ flexWrap: "wrap" }}>
          <input type="text" value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="Lý do (bắt buộc khi từ chối)"
                 style={{ flex: 1, minWidth: 200 }} />
          <button type="button" className={styles.secondaryButton} disabled={dang} onClick={() => gui("tu_choi")}
                  style={{ color: "#c0392b", borderColor: "#e7b6ad" }}>Từ chối ({chon.size})</button>
          <button type="button" className={styles.primaryButton} disabled={dang} onClick={() => gui("duyet")}>
            Duyệt ({chon.size})
          </button>
        </footer>
      </div>
    </div>
  );
}
