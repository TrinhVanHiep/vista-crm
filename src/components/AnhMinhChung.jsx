import { useEffect, useRef, useState } from "react";
import { listAnhMinhChung, taiAnhMinhChung, xoaAnhMinhChung } from "../services/calendarService";

/**
 * Ảnh minh chứng của một ca dạy (12/10/2026). Báo cáo là khâu cuối: không có ít nhất
 * một ảnh thì không nộp được, và ca bị tính là chưa xong (lỗi nhiệm vụ). Ảnh gắn với
 * CA chứ không với báo cáo, nên tải được cả trước khi lưu nháp báo cáo.
 */
export default function AnhMinhChung({ sessionId, khoa = false }) {
  const oFile = useRef(null);
  const [anh, setAnh] = useState([]);
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState("");

  useEffect(() => {
    if (!sessionId) return undefined;
    let con = true;
    listAnhMinhChung(sessionId).then((d) => con && setAnh(d)).catch(() => con && setAnh([]));
    return () => { con = false; };
  }, [sessionId]);

  const tai = async (files) => {
    if (!files?.length) return;
    setDang(true);
    setLoi("");
    try {
      const kq = await taiAnhMinhChung(sessionId, files);
      setAnh(kq.anh || []);
      if (kq.bo_qua?.length) setLoi(`Bỏ qua file không phải ảnh: ${kq.bo_qua.join(", ")}`);
    } catch (e) {
      setLoi(e?.response?.data?.detail || "Không tải được ảnh.");
    } finally {
      setDang(false);
      if (oFile.current) oFile.current.value = "";
    }
  };

  const xoa = async (id) => {
    setLoi("");
    try {
      setAnh(await xoaAnhMinhChung(sessionId, id));
    } catch (e) {
      setLoi(e?.response?.data?.detail || "Không xoá được ảnh.");
    }
  };

  if (!sessionId) return null;
  return (
    <div style={{ marginTop: 12, padding: 12, borderRadius: 10, border: `1px dashed ${anh.length ? "#9AD3AE" : "#E8A87C"}`,
                  background: anh.length ? "#F3FBF6" : "#FFF8F3" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <b style={{ fontSize: 13.5 }}>Ảnh minh chứng buổi dạy <span style={{ color: "#C0392B" }}>*</span></b>
        <span style={{ fontSize: 12.5, color: anh.length ? "#1E8E4F" : "#B7791F" }}>
          {anh.length ? `${anh.length} ảnh` : "Bắt buộc ít nhất 1 ảnh mới nộp được báo cáo"}
        </span>
        {!khoa ? (
          <label style={{ marginLeft: "auto", cursor: dang ? "wait" : "pointer", fontSize: 13, fontWeight: 700,
                          color: "#F26522" }}>
            {dang ? "Đang tải…" : "+ Thêm ảnh"}
            <input ref={oFile} type="file" accept="image/*" multiple hidden disabled={dang}
                   onChange={(e) => tai(e.target.files)} />
          </label>
        ) : null}
      </div>
      {anh.length ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {anh.map((a) => (
            <div key={a.id} style={{ position: "relative" }}>
              <a href={a.url} target="_blank" rel="noreferrer">
                <img src={a.url} alt="Minh chứng" style={{ width: 84, height: 64, objectFit: "cover", borderRadius: 6, display: "block" }} />
              </a>
              {!khoa ? (
                <button type="button" onClick={() => xoa(a.id)} title="Xoá ảnh"
                        style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 10, border: 0,
                                 background: "#C0392B", color: "#fff", cursor: "pointer", fontSize: 12, lineHeight: "20px", padding: 0 }}>
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {loi ? <div style={{ color: "#C0392B", fontSize: 12.5, marginTop: 6 }}>{loi}</div> : null}
    </div>
  );
}
