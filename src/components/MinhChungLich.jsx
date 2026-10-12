import { useRef, useState } from "react";
import { henLaiLich, taiMinhChungLich, xoaMinhChungLich } from "../services/calendarService";

/**
 * Minh chứng + hẹn lại cho một đầu mục lịch công tác (12/10/2026). Chuyển “Hoàn thành”
 * phải có ít nhất 1 ảnh / file; quá 24:00 ngày đầu mục mà chưa xong thì mỗi đêm 1 lỗi,
 * trừ 1 điểm thi đua. Hẹn lại được một lần. Luật: giasu_online/teaching/loi_nhiem_vu.py.
 */
const isoCach = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const ngayVN = (iso) => (iso ? iso.split("-").reverse().join("/") : "");

export default function MinhChungLich({ lich, onDoi }) {
  const oFile = useRef(null);
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState("");
  const [hen, setHen] = useState(null);
  if (!lich?.id) return null;
  const mc = lich.minh_chung || [];
  const xong = ["done", "cancel"].includes(lich.status) && mc.length;

  const goi = async (fn) => {
    setDang(true);
    setLoi("");
    try {
      await fn();
    } catch (e) {
      setLoi(e?.response?.data?.detail || "Không thực hiện được.");
    } finally {
      setDang(false);
      if (oFile.current) oFile.current.value = "";
    }
  };

  return (
    <div style={{ gridColumn: "1 / -1", padding: 12, borderRadius: 10,
                  border: `1px dashed ${mc.length ? "#9AD3AE" : "#E8A87C"}`, background: mc.length ? "#F3FBF6" : "#FFF8F3" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <b style={{ fontSize: 13.5 }}>Minh chứng hoàn thành <span style={{ color: "#C0392B" }}>*</span></b>
        <span style={{ fontSize: 12.5, color: mc.length ? "#1E8E4F" : "#B7791F" }}>
          {mc.length ? `${mc.length} file` : "Bắt buộc khi chuyển “Hoàn thành”"}
        </span>
        {lich.so_loi ? <span style={{ fontSize: 12.5, color: "#C0392B", fontWeight: 700 }}>{lich.so_loi} lỗi</span> : null}
        {lich.han_hen ? <span style={{ fontSize: 12.5, color: "#8a7a66" }}>Đã hẹn tới 24:00 {ngayVN(lich.han_hen)}</span> : null}
        <span style={{ flex: 1 }} />
        <label style={{ cursor: dang ? "wait" : "pointer", fontSize: 13, fontWeight: 700, color: "#F26522" }}>
          {dang ? "Đang tải…" : "+ Thêm ảnh / file"}
          <input ref={oFile} type="file" multiple hidden disabled={dang} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                 onChange={(e) => e.target.files?.length && goi(async () => onDoi({ ...lich, minh_chung: await taiMinhChungLich(lich.id, e.target.files) }))} />
        </label>
        {!xong && !lich.han_hen ? (
          <button type="button" className="btn ghost sm" onClick={() => setHen(hen ? null : { ngay: isoCach(1), lyDo: "" })}>Hẹn lại</button>
        ) : null}
      </div>
      {mc.length ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {mc.map((m) => (
            <span key={m.id} style={{ position: "relative", display: "inline-block" }}>
              <a href={m.url} target="_blank" rel="noreferrer">
                {m.la_anh
                  ? <img src={m.url} alt={m.ten} style={{ width: 84, height: 64, objectFit: "cover", borderRadius: 6, display: "block" }} />
                  : <span style={{ fontSize: 12.5 }}>📎 {m.ten}</span>}
              </a>
              <button type="button" title="Xoá" disabled={dang}
                      onClick={() => goi(async () => onDoi({ ...lich, minh_chung: await xoaMinhChungLich(lich.id, m.id) }))}
                      style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 10, border: 0,
                               background: "#C0392B", color: "#fff", cursor: "pointer", fontSize: 12, padding: 0 }}>×</button>
            </span>
          ))}
        </div>
      ) : null}
      {hen ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
          <input type="date" value={hen.ngay} min={isoCach(0)} max={isoCach(7)} onChange={(e) => setHen((h) => ({ ...h, ngay: e.target.value }))} />
          <input type="text" placeholder="Lý do (bắt buộc)" value={hen.lyDo} style={{ flex: 1, minWidth: 180 }}
                 onChange={(e) => setHen((h) => ({ ...h, lyDo: e.target.value }))} />
          <button type="button" className="btn primary sm" disabled={dang || !hen.lyDo.trim()}
                  onClick={() => goi(async () => {
                    const kq = await henLaiLich(lich.id, { hanMoi: hen.ngay, lyDo: hen.lyDo });
                    onDoi({ ...lich, han_hen: kq.han_hen, ly_do_hen: kq.ly_do_hen });
                    setHen(null);
                  })}>
            Lưu hẹn
          </button>
          <span style={{ fontSize: 12, color: "#8a7a66" }}>Mỗi đầu mục hẹn một lần, tối đa 7 ngày.</span>
        </div>
      ) : null}
      <div style={{ fontSize: 12, color: "#8a7a66", marginTop: 8 }}>
        Quá 24:00 ngày của đầu mục mà chưa “Hoàn thành” kèm minh chứng thì mỗi đêm tính 1 lỗi, trừ 1 điểm thi đua.
      </div>
      {loi ? <div style={{ color: "#C0392B", fontSize: 12.5, marginTop: 6 }}>{loi}</div> : null}
    </div>
  );
}
