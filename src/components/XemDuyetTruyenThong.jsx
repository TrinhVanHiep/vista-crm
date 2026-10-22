import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { VAI_QUAN_TRI } from "../auth/permissions";
import { duyetLich, getSchedule } from "../services/calendarService";

/**
 * Xem báo cáo & duyệt MỘT nội dung truyền thông (22/10/2026) — dùng ở tab Báo cáo và màn Truyền thông.
 * Nội dung báo cáo (tiến độ, minh chứng) lấy từ việc trên Lịch làm việc; quản lý bấm Đạt / Không đạt
 * ngay tại đây (máy chủ đồng bộ trạng thái màn Truyền thông). Nhân sự chỉ xem.
 */
export default function XemDuyetTruyenThong({ noiDung, onDong, onDoi }) {
  const { role } = useAuth();
  const laQuanLy = VAI_QUAN_TRI.includes(role);
  const [lich, setLich] = useState(null);
  const [lyDo, setLyDo] = useState("");
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState("");

  useEffect(() => {
    let con = true;
    setLich(null);
    if (noiDung?.schedule) getSchedule(noiDung.schedule).then((d) => con && setLich(d)).catch(() => con && setLich({ loi: true }));
    return () => { con = false; };
  }, [noiDung?.schedule]);

  if (!noiDung) return null;
  const mc = lich?.minh_chung || [];
  const duyet = async (ketQua) => {
    setDang(true);
    setLoi("");
    try {
      setLich(await duyetLich(noiDung.schedule, { ketQua, lyDo: lyDo.trim() }));
      setLyDo("");
      onDoi?.();
    } catch (e) {
      setLoi(e?.response?.data?.detail || "Không duyệt được.");
    } finally {
      setDang(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" onClick={onDong}
         style={{ position: "fixed", inset: 0, background: "rgba(20,20,30,.45)", zIndex: 1600, display: "grid", placeItems: "center", padding: 16 }}>
      <div className="card" onClick={(e) => e.stopPropagation()}
           style={{ width: "min(600px, 100%)", maxHeight: "90vh", overflow: "auto", padding: 22, display: "grid", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17 }}>{laQuanLy ? "Xem báo cáo & duyệt" : "Báo cáo nội dung"}</h2>
          <div className="small muted" style={{ marginTop: 4 }}>
            {noiDung.title}
            {noiDung.classroom_name ? ` · Lớp ${noiDung.classroom_name}` : ""}
            {` · Phụ trách: ${noiDung.assignee_name || noiDung.created_by?.name || "—"}`}
          </div>
        </div>
        {!noiDung.schedule ? (
          <div className="small muted">Nội dung này nhập thẳng ở màn Truyền thông (không gắn việc trên Lịch) — duyệt ở màn Truyền thông.</div>
        ) : !lich ? <div className="small muted">Đang tải báo cáo…</div> : lich.loi ? <div className="small muted">Không tải được báo cáo.</div> : (
          <>
            <div className="small">
              Tiến độ <b>{lich.tien_do || 0}%</b>
              {lich.bao_cao_luc ? ` · báo cáo lúc ${new Date(lich.bao_cao_luc).toLocaleString("vi-VN")}` : " · chưa báo cáo"}
              {lich.duyet === "cho_duyet" ? <span className="badge orange" style={{ marginLeft: 6 }}>Chờ duyệt</span> : null}
              {lich.duyet === "dat" ? <span className="badge green" style={{ marginLeft: 6 }}>Đạt</span> : null}
              {lich.duyet === "khong_dat" ? <span className="badge red" style={{ marginLeft: 6 }}>Không đạt</span> : null}
            </div>
            <div style={{ fontSize: 13.5, whiteSpace: "pre-line", padding: 10, borderRadius: 8, background: "#F7F7F9" }}>
              {lich.bao_cao_tien_do || <span className="muted">Người làm chưa ghi nội dung báo cáo.</span>}
            </div>
            {lich.duyet === "khong_dat" && lich.ly_do_duyet ? <div className="small" style={{ color: "#c0392b" }}>Lý do không đạt: {lich.ly_do_duyet}</div> : null}
            <div>
              <div className="small bold" style={{ marginBottom: 6 }}>Minh chứng ({mc.length})</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {mc.length ? mc.map((m) => (
                  <a key={m.id} href={m.url} target="_blank" rel="noreferrer">
                    {m.la_anh ? <img src={m.url} alt={m.ten} style={{ width: 110, height: 82, objectFit: "cover", borderRadius: 6, display: "block" }} />
                      : <span className="small">📎 {m.ten}</span>}
                  </a>
                )) : <span className="small muted">Chưa có minh chứng.</span>}
              </div>
            </div>
            {laQuanLy && lich.duyet !== "dat" ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: 10, borderRadius: 8, background: "#FFF6EF" }}>
                <button type="button" className="btn primary sm" disabled={dang || !mc.length}
                        title={mc.length ? "" : "Chưa có minh chứng — chưa duyệt Đạt được"} onClick={() => duyet("dat")}>✓ Duyệt Đạt</button>
                <input type="text" value={lyDo} placeholder="Lý do không đạt…" style={{ flex: 1, minWidth: 160 }}
                       onChange={(e) => setLyDo(e.target.value)} />
                <button type="button" className="btn ghost sm" disabled={dang || !lyDo.trim()} onClick={() => duyet("khong_dat")}>✕ Không đạt</button>
              </div>
            ) : null}
            <a className="small" href={`/calendar-detail?lich=${noiDung.schedule}`}>
              {laQuanLy ? "Mở việc trên Lịch làm việc →" : "Báo cáo tiến độ / nộp minh chứng ở Lịch làm việc →"}
            </a>
          </>
        )}
        {loi ? <div style={{ color: "#c0392b", fontSize: 13 }}>{loi}</div> : null}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="btn ghost sm" onClick={onDong}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
