import { useRef, useState } from "react";
import { baoCaoTienDoLich, duyetKeHoach, duyetLich, getSchedule, henLaiLich, mienLoiLich, taiMinhChungLich, xoaMinhChungLich } from "../services/calendarService";
import { useAuth } from "../auth/AuthProvider";
import { VAI_QUAN_TRI } from "../auth/permissions";

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
  const { role, user } = useAuth();
  const [td, setTd] = useState({ pt: lich?.tien_do ?? 0, nd: "" });
  const [lyDoKd, setLyDoKd] = useState("");
  const [lyDoKh, setLyDoKh] = useState("");
  const [mien, setMien] = useState(null); // { lyDo, han }
  if (!lich?.id) return null;
  const laQuanLy = VAI_QUAN_TRI.includes(role);
  const laPhuTrach = (lich.assigned_to?.id ?? lich.created_by?.id) === user?.id || laQuanLy;
  const NHAN_DUYET = { cho_duyet: ["Chờ quản lý duyệt", "#6B46C1", "#F3EFFF"], dat: ["Đạt", "#1E8E4F", "#E7F6EC"],
                       khong_dat: ["Không đạt — làm lại", "#C0392B", "#FDECEA"] };
  const mc = lich.minh_chung || [];
  const xong = ["done", "cancel"].includes(lich.status) && mc.length;
  // Có minh chứng mà chưa báo cáo hoàn thành = vẫn tính lỗi (20/10/2026) -> nút một chạm.
  const thieuBaoCao = laPhuTrach && mc.length > 0 && !["done", "cancel"].includes(lich.status);

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
      {/* Kế hoạch: nhân sự tự đăng việc -> quản lý duyệt nhận việc (15/10/2026) */}
      {lich.ke_hoach && lich.ke_hoach !== "da_duyet" ? (
        <div style={{ display: "grid", gap: 8, marginBottom: 12, paddingBottom: 12, borderBottom: "1px dashed #E8A87C" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <b style={{ fontSize: 13.5 }}>Kế hoạch</b>
            <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 9px", borderRadius: 999,
                           color: lich.ke_hoach === "tu_choi" ? "#C0392B" : "#B7791F",
                           background: lich.ke_hoach === "tu_choi" ? "#FDECEA" : "#FEF5E3" }}>
              {lich.ke_hoach === "tu_choi" ? "Bị từ chối" : "Chờ quản lý duyệt kế hoạch"}
            </span>
            {lich.ke_hoach === "tu_choi" && lich.ly_do_ke_hoach ? (
              <span style={{ fontSize: 12.5, color: "#C0392B" }}>{lich.ly_do_ke_hoach}{lich.ke_hoach_boi_ten ? ` — ${lich.ke_hoach_boi_ten}` : ""}</span>
            ) : null}
          </div>
          {laQuanLy && lich.ke_hoach === "cho_duyet" && (lich.assigned_to?.id ?? lich.created_by?.id) !== user?.id ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn primary sm" disabled={dang}
                      onClick={() => goi(async () => { await duyetKeHoach([lich.id], "duyet"); onDoi(await getSchedule(lich.id)); })}>✓ Duyệt kế hoạch</button>
              <input type="text" value={lyDoKh} placeholder="Lý do từ chối…" style={{ flex: 1, minWidth: 160 }}
                     onChange={(e) => setLyDoKh(e.target.value)} />
              <button type="button" className="btn ghost sm" disabled={dang || !lyDoKh.trim()}
                      onClick={() => goi(async () => { await duyetKeHoach([lich.id], "tu_choi", lyDoKh.trim()); onDoi(await getSchedule(lich.id)); })}>
                ✕ Từ chối
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      {thieuBaoCao ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12, padding: "10px 12px",
                      borderRadius: 10, background: "#FFF1E8", border: "1px solid #F5C6A5" }}>
          <span style={{ flex: 1, minWidth: 200, fontSize: 13 }}>
            <b>Đã có minh chứng nhưng chưa báo cáo hoàn thành</b> — việc vẫn bị tính lỗi mỗi đêm cho tới khi bấm nút này.
          </span>
          <button type="button" className="btn primary sm" disabled={dang}
                  onClick={() => goi(async () => onDoi(await baoCaoTienDoLich(lich.id, {
                    tienDo: 100, noiDung: td.nd.trim() || "Hoàn thành — đã nộp minh chứng." })))}>
            ✓ Báo cáo hoàn thành
          </button>
        </div>
      ) : null}
      {/* Tiến độ có căn cứ + duyệt (14/10/2026) */}
      <div style={{ display: "grid", gap: 8, marginBottom: 12, paddingBottom: 12, borderBottom: "1px dashed #E8A87C" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <b style={{ fontSize: 13.5 }}>Tiến độ</b>
          <div style={{ flex: 1, minWidth: 120, height: 8, borderRadius: 8, background: "#EEF0F3", overflow: "hidden" }}>
            <div style={{ width: `${lich.tien_do || 0}%`, height: "100%", background: lich.duyet === "khong_dat" ? "#C0392B" : "#F26522" }} />
          </div>
          <b style={{ fontSize: 13 }}>{lich.tien_do || 0}%</b>
          {lich.duyet && NHAN_DUYET[lich.duyet] ? (
            <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 9px", borderRadius: 999,
                           color: NHAN_DUYET[lich.duyet][1], background: NHAN_DUYET[lich.duyet][2] }}>{NHAN_DUYET[lich.duyet][0]}</span>
          ) : null}
        </div>
        {lich.bao_cao_tien_do ? (
          <div style={{ fontSize: 12.5, color: "#4b5466" }}>
            <b>Báo cáo gần nhất:</b> {lich.bao_cao_tien_do}
            {lich.bao_cao_luc ? <span style={{ color: "#8a7a66" }}> · {new Date(lich.bao_cao_luc).toLocaleString("vi-VN")}</span> : null}
          </div>
        ) : null}
        {lich.duyet === "khong_dat" && lich.ly_do_duyet ? (
          <div style={{ fontSize: 12.5, color: "#C0392B" }}><b>Lý do không đạt:</b> {lich.ly_do_duyet}{lich.duyet_boi_ten ? ` — ${lich.duyet_boi_ten}` : ""}</div>
        ) : null}
        {laPhuTrach && lich.duyet !== "dat" && lich.status !== "cancel" ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select value={td.pt} onChange={(e) => setTd((x) => ({ ...x, pt: Number(e.target.value) }))} aria-label="Tiến độ">
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => <option key={v} value={v}>{v === 100 ? "100% — Hoàn thành" : `${v}%`}</option>)}
            </select>
            <input type="text" value={td.nd} placeholder="Đã làm gì (căn cứ báo cáo)…" style={{ flex: 1, minWidth: 200 }}
                   onChange={(e) => setTd((x) => ({ ...x, nd: e.target.value }))} />
            <button type="button" className="btn primary sm" disabled={dang || !td.nd.trim()}
                    onClick={() => goi(async () => { onDoi(await baoCaoTienDoLich(lich.id, { tienDo: td.pt, noiDung: td.nd })); setTd((x) => ({ ...x, nd: "" })); })}>
              Gửi báo cáo tiến độ
            </button>
          </div>
        ) : null}
        {laQuanLy && (lich.duyet === "cho_duyet" || (mc.length > 0 && lich.status !== "done" && lich.status !== "cancel")) ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" className="btn primary sm" disabled={dang}
                    onClick={() => goi(async () => onDoi(await duyetLich(lich.id, { ketQua: "dat" })))}>✓ Đạt</button>
            <input type="text" value={lyDoKd} placeholder="Lý do không đạt…" style={{ flex: 1, minWidth: 180 }}
                   onChange={(e) => setLyDoKd(e.target.value)} />
            <button type="button" className="btn ghost sm" disabled={dang || !lyDoKd.trim()}
                    onClick={() => goi(async () => { onDoi(await duyetLich(lich.id, { ketQua: "khong_dat", lyDo: lyDoKd })); setLyDoKd(""); })}>
              ✕ Không đạt
            </button>
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <b style={{ fontSize: 13.5 }}>Minh chứng hoàn thành <span style={{ color: "#C0392B" }}>*</span></b>
        <span style={{ fontSize: 12.5, color: mc.length ? "#1E8E4F" : "#B7791F" }}>
          {mc.length ? `${mc.length} file` : "Bắt buộc khi chuyển “Hoàn thành”"}
        </span>
        {lich.so_loi ? <span style={{ fontSize: 12.5, color: "#C0392B", fontWeight: 700 }}>{lich.so_loi} lỗi</span> : null}
        {lich.so_loi && laQuanLy ? (
          <button type="button" className="btn ghost sm" onClick={() => setMien(mien ? null : { lyDo: "", han: isoCach(1) })}>Miễn lỗi</button>
        ) : null}
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
      {mien ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
          <input type="text" placeholder="Lý do miễn lỗi (bắt buộc)" value={mien.lyDo} style={{ flex: 1, minWidth: 180 }}
                 onChange={(e) => setMien((m) => ({ ...m, lyDo: e.target.value }))} />
          {!xong ? (
            <label style={{ fontSize: 12.5 }}>Hạn mới{" "}
              <input type="date" value={mien.han} min={isoCach(0)} onChange={(e) => setMien((m) => ({ ...m, han: e.target.value }))} />
            </label>
          ) : null}
          <button type="button" className="btn primary sm" disabled={dang || !mien.lyDo.trim()}
                  onClick={() => goi(async () => {
                    const kq = await mienLoiLich(lich.id, { lyDo: mien.lyDo.trim(), hanMoi: xong ? undefined : mien.han });
                    onDoi({ ...kq, so_loi: 0 });
                    setMien(null);
                  })}>
            Xoá {lich.so_loi} lỗi
          </button>
          <span style={{ fontSize: 12, color: "#8a7a66" }}>Điểm thi đua được tính lại; việc chưa xong phải có hạn mới, không thì đêm nay lại tính lỗi.</span>
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
