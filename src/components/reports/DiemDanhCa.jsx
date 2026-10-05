import { useEffect, useMemo, useState } from "react";
import { getDiemDanhCa, luuDiemDanhCa, timHocSinhHocBu } from "../../services/calendarService";
import { Button, Modal } from "../../ui";

/**
 * Điểm danh từng học sinh của một ca dạy, kể cả học sinh lớp khác đến HỌC BÙ.
 *
 * Lương dạy tính theo đúng các lượt này (em có mặt / đi muộn được tính cho giáo
 * viên dạy ca đó; vắng thì không). Em nghỉ ở lớp mình rồi học bù lớp khác: ở
 * ca lớp mình chọn "Vắng có phép", ở ca học bù bấm "Thêm học sinh học bù".
 * Backend: teaching/diem_danh.py.
 */

const LUA_CHON = [
  ["present", "Có mặt", "#1F9D55"],
  ["late", "Đi muộn", "#D97706"],
  ["excused", "Vắng có phép", "#6B7280"],
  ["absent", "Vắng", "#C0392B"],
];
const CO_MAT = new Set(["present", "late", "partial"]);

export default function DiemDanhCa({ sessionId, tieuDe = "", onDong, onDaLuu }) {
  const [du, setDu] = useState(null);
  const [rows, setRows] = useState([]);
  const [loi, setLoi] = useState("");
  const [dangLuu, setDangLuu] = useState(false);
  const [timQ, setTimQ] = useState("");
  const [ketQuaTim, setKetQuaTim] = useState([]);

  useEffect(() => {
    if (!sessionId) return undefined;
    let con = true;
    setDu(null);
    setLoi("");
    getDiemDanhCa(sessionId)
      .then((d) => { if (con) { setDu(d); setRows(d.rows || []); } })
      .catch((e) => con && setLoi(e?.response?.data?.detail || "Không tải được danh sách điểm danh."));
    return () => { con = false; };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || timQ.trim().length < 2) { setKetQuaTim([]); return undefined; }
    let con = true;
    const h = setTimeout(() => {
      timHocSinhHocBu(sessionId, timQ.trim())
        .then((ds) => con && setKetQuaTim(ds.filter((x) => !rows.some((r) => r.student === x.student))))
        .catch(() => con && setKetQuaTim([]));
    }, 300);
    return () => { con = false; clearTimeout(h); };
  }, [timQ, sessionId, rows]);

  const khoa = Boolean(du?.locked);
  const coMat = useMemo(() => rows.filter((r) => CO_MAT.has(r.status)).length, [rows]);
  const chuaDiem = rows.filter((r) => !r.status).length;

  const doi = (sid, k, v) => setRows((ds) => ds.map((r) => (r.student === sid ? { ...r, [k]: v } : r)));
  const tatCaCoMat = () => setRows((ds) => ds.map((r) => (r.status ? r : { ...r, status: "present" })));

  const luu = async () => {
    setDangLuu(true);
    setLoi("");
    try {
      const d = await luuDiemDanhCa(sessionId, rows.map(({ student, status, ghi_chu }) => ({ student, status, ghi_chu })));
      setDu(d);
      setRows(d.rows || []);
      onDaLuu?.(d);
      onDong?.();
    } catch (e) {
      setLoi(e?.response?.data?.detail || "Không lưu được điểm danh.");
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <Modal
      open={Boolean(sessionId)}
      onClose={onDong}
      title="Điểm danh học sinh"
      subtitle={tieuDe || du?.classroom_name || ""}
      size="lg"
      footer={(
        <>
          <span className="small muted" style={{ marginRight: "auto" }}>
            Có mặt <b>{coMat}</b> / {rows.length}{chuaDiem ? ` · ${chuaDiem} em chưa điểm danh` : ""}
          </span>
          <Button variant="ghost" onClick={onDong} disabled={dangLuu}>Đóng</Button>
          {!khoa ? (
            <Button variant="primary" loading={dangLuu} loadingText="Đang lưu..." onClick={luu}>Lưu điểm danh</Button>
          ) : null}
        </>
      )}
    >
      {loi ? <div className="alert red" style={{ marginBottom: 12 }}>{loi}</div> : null}
      {khoa ? (
        <div className="alert orange" style={{ marginBottom: 12 }}>
          Báo cáo ca này đã nộp / đã duyệt nên không sửa được điểm danh. Nhờ quản lý trả lại báo cáo nếu cần sửa.
        </div>
      ) : null}
      {!du && !loi ? <div className="small muted">Đang tải danh sách lớp…</div> : null}
      {du ? (
        <div style={{ display: "grid", gap: 12 }}>
          {!khoa && rows.some((r) => !r.status) ? (
            <div>
              <Button size="sm" variant="ghost" onClick={tatCaCoMat}>Đánh dấu các em còn lại là có mặt</Button>
            </div>
          ) : null}
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Học sinh</th><th>Điểm danh</th><th>Ghi chú</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.student}>
                    <td style={{ minWidth: 180 }}>
                      <b>{r.student_name}</b>
                      {r.is_makeup ? (
                        <div className="small"><span className="badge blue">Học bù · {r.classroom_name || "lớp khác"}</span></div>
                      ) : null}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} role="radiogroup" aria-label={`Điểm danh ${r.student_name}`}>
                        {LUA_CHON.map(([ma, nhan, mau]) => {
                          const chon = r.status === ma;
                          return (
                            <button
                              key={ma}
                              type="button"
                              role="radio"
                              aria-checked={chon}
                              disabled={khoa}
                              onClick={() => doi(r.student, "status", chon ? null : ma)}
                              style={{
                                padding: "5px 10px", borderRadius: 999, fontSize: 12.5, fontWeight: 600,
                                border: `1px solid ${chon ? mau : "var(--border)"}`,
                                background: chon ? mau : "var(--card)", color: chon ? "#fff" : "var(--text-2)",
                                cursor: khoa ? "not-allowed" : "pointer",
                              }}
                            >
                              {nhan}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td style={{ minWidth: 160 }}>
                      <input
                        type="text"
                        value={r.ghi_chu || ""}
                        disabled={khoa}
                        placeholder={r.status === "excused" ? "vd. học bù lớp 702 ngày 06/10" : ""}
                        onChange={(e) => doi(r.student, "ghi_chu", e.target.value)}
                        style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 8 }}
                      />
                    </td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr><td colSpan={3} className="muted t-center" style={{ padding: 16 }}>Lớp chưa có học sinh.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {!khoa ? (
            <div style={{ display: "grid", gap: 6 }}>
              <label htmlFor="tim-hoc-bu" className="small" style={{ fontWeight: 700 }}>
                Thêm học sinh học bù (em của lớp khác đến học buổi này)
              </label>
              <input
                id="tim-hoc-bu"
                type="search"
                value={timQ}
                onChange={(e) => setTimQ(e.target.value)}
                placeholder="Gõ tên học sinh…"
                style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 8 }}
              />
              {ketQuaTim.length ? (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {ketQuaTim.map((x) => (
                    <Button
                      key={x.student}
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRows((ds) => [...ds, { ...x, status: "present", is_makeup: true, ghi_chu: "" }]);
                        setTimQ("");
                      }}
                    >
                      + {x.student_name} · {x.classroom_name}
                    </Button>
                  ))}
                </div>
              ) : timQ.trim().length >= 2 ? (
                <div className="small muted">Không tìm thấy học sinh lớp khác tên như vậy.</div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
