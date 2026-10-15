import { useEffect, useState } from "react";
import apiClient from "../services/apiClient";
import { Button } from "../ui";

/**
 * Bắt buộc hoàn thiện hồ sơ (15/10/2026): ảnh đại diện, SĐT, Facebook, SĐT khẩn cấp.
 *
 * Thiếu mục nào là hiện hộp thoại KHÔNG đóng được (không nút X, bấm nền không tắt)
 * cho tới khi điền đủ — chỉ có lối thoát là Đăng xuất. Học sinh và super admin không
 * thuộc diện (backend teachers/hoan_thien.py quyết định, giao diện chỉ hỏi).
 */
const DUONG_DAN = "/teachers/ho-so/hoan-thien/";

export default function HoanThienHoSo({ userId, onDangXuat }) {
  const [tt, setTt] = useState(null);
  const [f, setF] = useState({ sdt: "", facebook: "", sdt_khan_cap: "", nguoi_khan_cap: "" });
  const [anh, setAnh] = useState(null);
  const [xem, setXem] = useState("");
  const [loi, setLoi] = useState({});
  const [dangLuu, setDangLuu] = useState(false);

  useEffect(() => {
    if (!userId) return undefined;
    let con = true;
    apiClient.get(DUONG_DAN).then(({ data }) => {
      if (!con) return;
      setTt(data);
      const g = data?.gia_tri || {};
      setF({ sdt: g.sdt || "", facebook: g.facebook || "", sdt_khan_cap: g.sdt_khan_cap || "", nguoi_khan_cap: g.nguoi_khan_cap || "" });
    }).catch(() => {});
    return () => { con = false; };
  }, [userId]);

  useEffect(() => () => { if (xem) window.URL.revokeObjectURL(xem); }, [xem]);

  if (!tt?.bat_buoc || tt.du) return null;
  const coAnh = tt.gia_tri?.anh || anh;

  const luu = async () => {
    const l = {};
    if (!coAnh) l.anh = "Chọn ảnh đại diện.";
    if (!f.sdt.trim()) l.sdt = "Nhập số điện thoại.";
    if (!f.facebook.trim()) l.facebook = "Nhập link Facebook.";
    if (!f.sdt_khan_cap.trim()) l.sdt_khan_cap = "Nhập SĐT người thân để liên hệ khi khẩn cấp.";
    setLoi(l);
    if (Object.keys(l).length) return;
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.append(k, v.normalize("NFC")));
    if (anh) fd.append("anh", anh);
    setDangLuu(true);
    try {
      const { data } = await apiClient.post(DUONG_DAN, fd);
      setTt(data);
    } catch (e) {
      const d = e?.response?.data || {};
      setLoi(typeof d === "object" ? Object.fromEntries(Object.entries(d).map(([k, v]) => [k, [].concat(v)[0]])) : { chung: "Không lưu được." });
    } finally {
      setDangLuu(false);
    }
  };

  const o = (k, nhan, goiY, kieu = "text") => (
    <label style={{ display: "grid", gap: 5, fontSize: 13 }}>
      <span style={{ fontWeight: 600 }}>{nhan} <span style={{ color: "#c0392b" }}>*</span></span>
      <input type={kieu} value={f[k]} placeholder={goiY} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))}
             style={{ padding: "10px 12px", border: `1px solid ${loi[k] ? "#e74c3c" : "#E2E7EF"}`, borderRadius: 10, fontSize: 14 }} />
      {loi[k] ? <span style={{ color: "#c0392b", fontSize: 12 }}>{loi[k]}</span> : null}
    </label>
  );

  return (
    <div className="ui-modal__backdrop" role="dialog" aria-modal="true" aria-label="Hoàn thiện hồ sơ" style={{ zIndex: 2000 }}>
      <div className="ui-modal ui-modal--md">
        <header className="ui-modal__head">
          <div>
            <h2 className="ui-modal__title">Hoàn thiện hồ sơ nhân sự</h2>
            <p className="ui-modal__sub">Bắt buộc để đồng bộ hồ sơ toàn trung tâm. Còn thiếu: {tt.thieu.join(", ")}.</p>
          </div>
        </header>
        <div className="ui-modal__body" style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#FDEBDD", overflow: "hidden",
                          display: "flex", alignItems: "center", justifyContent: "center", color: "#F26522", fontSize: 12, flex: "0 0 72px" }}>
              {xem ? <img src={xem} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : tt.gia_tri?.anh ? "Đã có ảnh" : "Chưa có ảnh"}
            </div>
            <div style={{ display: "grid", gap: 5, fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>Ảnh đại diện <span style={{ color: "#c0392b" }}>*</span></span>
              <input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setAnh(file);
                setXem(file ? window.URL.createObjectURL(file) : "");
              }} />
              <span style={{ color: "#7d8592", fontSize: 12 }}>Ảnh chân dung rõ mặt, tối đa 5MB.</span>
              {loi.anh ? <span style={{ color: "#c0392b", fontSize: 12 }}>{loi.anh}</span> : null}
            </div>
          </div>
          {o("sdt", "Số điện thoại", "0912 345 678", "tel")}
          {o("facebook", "Facebook", "facebook.com/ten-cua-ban")}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {o("sdt_khan_cap", "SĐT liên hệ khẩn cấp", "Số của người thân", "tel")}
            <label style={{ display: "grid", gap: 5, fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>Người liên hệ (quan hệ)</span>
              <input value={f.nguoi_khan_cap} placeholder="VD: Mẹ — Nguyễn Thị A"
                     onChange={(e) => setF((x) => ({ ...x, nguoi_khan_cap: e.target.value }))}
                     style={{ padding: "10px 12px", border: "1px solid #E2E7EF", borderRadius: 10, fontSize: 14 }} />
            </label>
          </div>
          {loi.chung || loi.detail ? <div style={{ color: "#c0392b", fontSize: 13 }}>{loi.chung || loi.detail}</div> : null}
        </div>
        <footer className="ui-modal__foot">
          <Button variant="ghost" onClick={onDangXuat}>Đăng xuất</Button>
          <Button variant="primary" onClick={luu} disabled={dangLuu}>{dangLuu ? "Đang lưu…" : "Lưu hồ sơ"}</Button>
        </footer>
      </div>
    </div>
  );
}
