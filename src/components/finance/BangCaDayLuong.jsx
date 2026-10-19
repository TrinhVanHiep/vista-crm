import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";
import { Button } from "./v3/ui";
import { color } from "./v3/theme";

/**
 * Lương dạy theo từng ca (19/10/2026): mỗi ca = sĩ số × đơn giá/lượt của lớp × % hưởng. Kế toán sửa
 * sĩ số, bỏ / bật tính ca, thêm ca thiếu — hệ thống tự tính tổng, không gõ tay tổng lương dạy.
 * Máy chủ: payroll/ca_day_luong.py.
 */
const tien = (v) => Math.round(Number(v || 0)).toLocaleString("vi-VN");
const ngayVN = (iso) => (iso ? iso.split("-").reverse().slice(0, 2).join("/") : "");
const o = { padding: "5px 6px", borderRadius: 6, border: "1px solid " + color.borderStrong, fontSize: 13 };

export default function BangCaDayLuong({ teacherId, thang, nam, lyDo, phanHoi, onDaLuu }) {
  const [d, setD] = useState(null);
  const [sua, setSua] = useState({});   // session -> {si_so?, tinh?}
  const [them, setThem] = useState([]); // [{classroom, ngay, gio, si_so}]
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  const [taiLai, setTaiLai] = useState(0);

  useEffect(() => {
    let con = true;
    apiClient.get("/payroll/luong-chot/ca-day/", { params: { month: thang, year: nam, teacher: teacherId }, timeout: 60000 })
      .then(({ data }) => { if (con) { setD(data); setSua({}); setThem([]); } })
      .catch((e) => con && setLoi(e?.response?.data?.detail || "Không tải được ca dạy."));
    return () => { con = false; };
  }, [teacherId, thang, nam, taiLai]);

  if (!d) return loi ? <div style={{ color: color.red, fontSize: 13 }}>{loi}</div> : <div style={{ color: color.muted }}>Đang tải ca dạy…</div>;

  const tienCa = (donGia, siSo, tinh) => (!tinh ? 0 : d.nuoc_ngoai ? d.gia_ca : (donGia * siSo * d.ty_le) / 100);
  const dong = d.ca.map((c) => {
    const s = sua[c.session] || {};
    const siSo = s.si_so ?? c.si_so;
    const tinh = s.tinh ?? c.tinh;
    return { ...c, siSo, tinhMoi: tinh, tienMoi: tienCa(c.don_gia, Number(siSo) || 0, tinh), doi: s.si_so !== undefined || s.tinh !== undefined };
  });
  const giaLop = Object.fromEntries(d.ca.map((c) => [c.classroom, c.don_gia]));
  const tongMoi = dong.reduce((t, c) => t + c.tienMoi, 0)
    + them.reduce((t, x) => t + tienCa(giaLop[x.classroom] ?? 0, Number(x.si_so) || 0, true), 0);
  const coDoi = dong.some((c) => c.doi) || them.length > 0;
  const datSua = (id, k, v) => setSua((x) => ({ ...x, [id]: { ...(x[id] || {}), [k]: v } }));

  const luu = async () => {
    setLoi("");
    if (!lyDo.trim()) { setLoi("Ghi lý do sửa ở ô bên dưới trước khi lưu."); return; }
    if (them.some((x) => !x.classroom || !x.ngay || x.si_so === "")) { setLoi("Ca bổ sung cần đủ lớp, ngày, sĩ số."); return; }
    setDang(true);
    try {
      const body = {
        month: thang, year: nam, teacher: teacherId, ly_do: lyDo.trim(), phan_hoi: phanHoi.trim(),
        sua: Object.entries(sua).map(([session, v]) => ({ session: Number(session), ...v })), them,
      };
      const { data } = await apiClient.post("/payroll/luong-chot/ca-day/", body);
      setTaiLai((v) => v + 1);
      onDaLuu?.(data);
    } catch (e) {
      const x = e?.response?.data || {};
      setLoi(x.ly_do || x.detail || x.them || Object.values(x).flat()[0] || "Không lưu được.");
    } finally {
      setDang(false);
    }
  };

  return (
    <div style={{ border: "1px solid " + color.border, borderRadius: 10, padding: 12, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
        <b style={{ fontSize: 14 }}>Lương dạy theo từng ca</b>
        <span style={{ fontSize: 12, color: color.muted }}>
          {d.nuoc_ngoai ? `GV nước ngoài: ${tien(d.gia_ca)} đ / ca` : `Mỗi ca = sĩ số × đơn giá/lượt của lớp × ${d.ty_le}% hưởng`}
        </span>
      </div>
      <div style={{ overflowX: "auto", maxHeight: 320 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 620 }}>
          <thead>
            <tr style={{ background: color.subtle, color: color.muted, position: "sticky", top: 0 }}>
              {["Tính", "Ngày", "Lớp", "Sĩ số", "Nguồn sĩ số", "Đơn giá/lượt", "% hưởng", "Thành tiền"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "6px", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dong.map((c) => (
              <tr key={c.session} style={{ borderTop: "1px solid " + color.border, background: c.doi ? "#FFF6EF" : undefined,
                                           opacity: c.tinhMoi ? 1 : 0.55 }}>
                <td style={{ padding: 6 }}>
                  <input type="checkbox" checked={c.tinhMoi} onChange={(e) => datSua(c.session, "tinh", e.target.checked)}
                         title={c.tinh ? "" : `Chưa tính lương (báo cáo: ${c.bao_cao || "chưa có"})`} />
                </td>
                <td style={{ padding: 6 }}>{ngayVN(c.ngay)} {c.gio}</td>
                <td style={{ padding: 6 }}>{c.lop}{c.bo_sung ? <span style={{ color: color.orange }}> · bổ sung</span> : null}</td>
                <td style={{ padding: 6 }}>
                  <input value={c.siSo} style={{ ...o, width: 52, textAlign: "right" }}
                         onChange={(e) => datSua(c.session, "si_so", e.target.value.replace(/[^0-9]/g, ""))} />
                </td>
                <td style={{ padding: 6, color: color.muted }}>{c.nguon_nhan}</td>
                <td style={{ padding: 6 }} title={c.gia_nhan}>{tien(c.don_gia)}</td>
                <td style={{ padding: 6 }}>{c.ty_le}%</td>
                <td style={{ padding: 6, textAlign: "right", fontWeight: c.doi ? 700 : 400 }}>{tien(c.tienMoi)}</td>
              </tr>
            ))}
            {them.map((x, i) => (
              <tr key={`m${i}`} style={{ borderTop: "1px solid " + color.border, background: "#EEF8F0" }}>
                <td style={{ padding: 6 }}>
                  <button type="button" onClick={() => setThem((t) => t.filter((_, j) => j !== i))}
                          style={{ border: 0, background: "none", color: color.red, cursor: "pointer" }}>✕</button>
                </td>
                <td style={{ padding: 6 }}>
                  <input type="date" value={x.ngay} style={{ ...o, width: 128 }}
                         onChange={(e) => setThem((t) => t.map((y, j) => (j === i ? { ...y, ngay: e.target.value } : y)))} />
                  <input value={x.gio} style={{ ...o, width: 52, marginLeft: 4 }}
                         onChange={(e) => setThem((t) => t.map((y, j) => (j === i ? { ...y, gio: e.target.value } : y)))} />
                </td>
                <td style={{ padding: 6 }}>
                  <select value={x.classroom} style={{ ...o, maxWidth: 150 }}
                          onChange={(e) => setThem((t) => t.map((y, j) => (j === i ? { ...y, classroom: Number(e.target.value) || "" } : y)))}>
                    <option value="">— chọn lớp —</option>
                    {d.lop_chon.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </td>
                <td style={{ padding: 6 }}>
                  <input value={x.si_so} style={{ ...o, width: 52, textAlign: "right" }}
                         onChange={(e) => setThem((t) => t.map((y, j) => (j === i ? { ...y, si_so: e.target.value.replace(/[^0-9]/g, "") } : y)))} />
                </td>
                <td colSpan={4} style={{ padding: 6, color: color.muted }}>Ca bổ sung — đơn giá theo lớp, tính khi lưu</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={() => setThem((t) => [...t, { classroom: "", ngay: `${nam}-${String(thang).padStart(2, "0")}-01`, gio: "18:00", si_so: "" }])}
                style={{ border: "1px dashed " + color.borderStrong, background: "#fff", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12.5 }}>
          + Thêm ca thiếu
        </button>
        <span style={{ fontSize: 13 }}>
          Tổng lương dạy: <b style={{ color: color.orange }}>{tien(tongMoi)} đ</b>
          {coDoi ? <span style={{ color: color.muted }}> (trước {tien(d.tong)} đ)</span> : null}
          {d.chot ? <span style={{ color: color.muted }}> · đang chốt {tien(d.chot.luong_day)} đ</span> : null}
        </span>
        <Button style={{ marginLeft: "auto" }} onClick={luu} disabled={dang || !coDoi}>
          {dang ? "Đang tính…" : "Lưu ca & tính lại lương dạy"}
        </Button>
      </div>
      {loi ? <div style={{ color: color.red, fontSize: 13 }}>{loi}</div> : null}
    </div>
  );
}
