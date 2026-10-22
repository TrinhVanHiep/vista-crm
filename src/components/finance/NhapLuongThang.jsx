import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../services/apiClient";
import { Card, Pill } from "./v3/ui";
import { color } from "./v3/theme";

/**
 * Nhập lương theo tháng — mỗi nhân sự chỉ có đúng các mục của vị trí (19/10/2026):
 * QLCS: công · trực · sale; QLĐT: công · trực · ca dạy; GV full-time: công · trực · ca dạy · sale;
 * GV part-time / nước ngoài: ca dạy. QLCS nhập công/trực/sale, QLĐT nhập công/trực, kế toán nhập tất.
 * Ô trống = hệ thống tự lấy (file chấm công, cấu hình). Máy chủ: payroll/nhap_thang.py.
 */
const tien = (v) => Math.round(Number(v || 0)).toLocaleString("vi-VN");
const so = (s) => String(s ?? "").replace(/[^0-9.]/g, "");

function O({ value, onChange, disabled, w = 64, tay }) {
  return (
    <input value={value} disabled={disabled} onChange={(e) => onChange(so(e.target.value))}
           style={{ width: w, padding: "5px 6px", borderRadius: 6, textAlign: "right", fontSize: 13,
                    border: `1px solid ${tay ? color.orange : color.borderStrong}`, background: disabled ? "#F6F7F9" : "#fff",
                    fontWeight: tay ? 700 : 400 }} />
  );
}

export default function NhapLuongThang({ thang, nam, onNotice }) {
  const [bc, setBc] = useState(null);
  const [mo, setMo] = useState(true);
  const [sua, setSua] = useState({});      // teacher_id -> {so_cong, ca_truc_t2_t6, …}
  const [dang, setDang] = useState(null);
  const [taiLai, setTaiLai] = useState(0);
  const [loi, setLoi] = useState("");
  const oSale = useRef(null);
  const [sale, setSale] = useState(null); // {tep, kq}

  useEffect(() => {
    let con = true;
    setLoi("");
    apiClient.get("/payroll/nhap-thang/", { params: { month: thang, year: nam }, timeout: 120000 })
      .then(({ data }) => { if (con) { setBc(data); setSua({}); } })
      .catch((e) => con && setLoi(e?.response?.status === 403 ? "" : (e?.response?.data?.detail || "Không tải được nhập lương.")));
    return () => { con = false; };
  }, [thang, nam, taiLai]);

  if (!bc) return loi ? <Card><div style={{ padding: 14, color: color.red }}>{loi}</div></Card> : null;
  const duoc = new Set(bc.duoc_sua);
  const khoa = bc.khoa;
  const gt = (r, k, macDinh) => (sua[r.teacher_id]?.[k] ?? macDinh);
  const dat = (r, k, v) => setSua((s) => ({ ...s, [r.teacher_id]: { ...(s[r.teacher_id] || {}), [k]: v } }));
  const luu = async (r) => {
    const body = { teacher: r.teacher_id, month: thang, year: nam, ...sua[r.teacher_id] };
    setDang(r.teacher_id);
    try {
      await apiClient.post("/payroll/nhap-thang/", body);
      onNotice?.(`Đã lưu nhập lương T${thang}/${nam} của ${r.ten}.`);
      setTaiLai((v) => v + 1);
    } catch (e) {
      window.alert(e?.response?.data?.detail || Object.values(e?.response?.data || {}).flat()[0] || "Không lưu được.");
    } finally {
      setDang(null);
    }
  };
  const thieuTong = bc.ds.filter((r) => r.thieu.length).length;
  // File sale (19/10/2026): danh sách HS vào & đóng học phí -> đếm HS × mức thưởng/HS -> thưởng sale QLCS.
  const guiSale = async (tep, ghi) => {
    const fd = new FormData();
    fd.append("file", tep);
    fd.append("month", thang);
    fd.append("year", nam);
    if (ghi) fd.append("ghi", "1");
    try {
      const { data } = await apiClient.post("/payroll/nhap-sale/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (ghi) {
        setSale(null);
        onNotice?.(`Đã nhập file sale T${thang}/${nam}: ${data.ds.map((x) => `${x.ten} ${x.so_hs} HS`).join(", ")}.`);
        setTaiLai((v) => v + 1);
      } else setSale({ tep, kq: data });
    } catch (e) {
      window.alert(e?.response?.data?.detail || "Không đọc được file sale.");
    } finally {
      if (oSale.current) oSale.current.value = "";
    }
  };

  return (
    <Card>
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <b style={{ fontSize: 14 }}>Nhập lương tháng {thang}/{nam} — theo vị trí</b>
        {khoa ? <Pill tone="blue">Đã chốt theo file — khoá nhập</Pill>
          : thieuTong ? <Pill tone="amber">{thieuTong} người còn thiếu</Pill> : <Pill tone="green">Đủ dữ liệu</Pill>}
        <span style={{ fontSize: 12.5, color: color.muted }}>
          QLCS và QLĐT nhập công · trực · sale (hoặc file sale); ca dạy lấy từ sổ điểm danh chuẩn. Ô trống = lấy từ file chấm công / cấu hình.
        </span>
        {duoc.has("sale") && !khoa ? (
          <>
            <input ref={oSale} type="file" accept=".xlsx" hidden onChange={(e) => e.target.files[0] && guiSale(e.target.files[0], false)} />
            <button type="button" onClick={() => oSale.current?.click()}
                    style={{ marginLeft: "auto", border: "1px solid " + color.borderStrong, background: "#fff", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12.5 }}>
              ⬆ Nhập file sale
            </button>
          </>
        ) : null}
        <button type="button" onClick={() => setMo((v) => !v)}
                style={{ marginLeft: duoc.has("sale") && !khoa ? 0 : "auto", border: 0, background: "none", color: color.orange, fontWeight: 700, cursor: "pointer" }}>
          {mo ? "Thu gọn" : "Mở"}
        </button>
      </div>
      {sale ? (
        <div style={{ margin: "0 18px 12px", background: "#FFF6EF", borderRadius: 10, padding: "10px 14px", fontSize: 13, display: "grid", gap: 6 }}>
          <b>File sale {sale.tep.name}: {sale.kq.tong_hs} học sinh</b>
          {sale.kq.ds.map((x) => (
            <div key={x.teacher_id}>{x.ten}: {x.so_hs} HS × {tien(x.don_gia)} = <b>{tien(x.thuong)} đ</b>
              <span style={{ color: color.muted }}> ({x.hoc_sinh.slice(0, 8).join(", ")}{x.hoc_sinh.length > 8 ? "…" : ""})</span></div>
          ))}
          {sale.kq.khong_ghep.length ? (
            <div style={{ color: color.red }}>{sale.kq.khong_ghep.length} dòng chưa ghép được người sale: {sale.kq.khong_ghep.slice(0, 5).map((x) => `${x.hoc_sinh} (${x.nguoi_sale || "trống"})`).join(", ")}</div>
          ) : null}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" disabled={!!sale.kq.khong_ghep.length} onClick={() => guiSale(sale.tep, true)}
                    style={{ border: 0, borderRadius: 8, padding: "5px 12px", background: color.orange, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
              Ghi thưởng sale
            </button>
            <button type="button" onClick={() => setSale(null)}
                    style={{ border: "1px solid " + color.borderStrong, borderRadius: 8, padding: "5px 12px", background: "#fff", cursor: "pointer" }}>Huỷ</button>
          </div>
        </div>
      ) : null}
      {mo ? (
        <div style={{ padding: "0 18px 16px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
            <thead>
              <tr style={{ background: color.subtle, color: color.muted, fontSize: 12 }}>
                {["Nhân sự", "Chấm công (công)", "Ca trực T2–T6 / T7 / CN", "Thưởng sale (đ)", "Ca dạy (duyệt/lịch)", "Thi đua", "Còn thiếu", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "9px 8px", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bc.ds.map((r) => {
                const co = (m) => r.muc.includes(m);
                const sua1 = (m) => !khoa && co(m) && duoc.has(m);
                const doi = !!sua[r.teacher_id];
                return (
                  <tr key={r.teacher_id} style={{ borderTop: "1px solid " + color.border }}>
                    <td style={{ padding: "8px" }}><b>{r.ten}</b><div style={{ fontSize: 11.5, color: color.muted }}>{r.vi_tri}</div></td>
                    <td style={{ padding: "8px" }}>
                      {co("cong") ? <O value={gt(r, "so_cong", r.so_cong_tay ? String(r.so_cong) : "")} disabled={!sua1("cong")} tay={r.so_cong_tay}
                                       onChange={(v) => dat(r, "so_cong", v)} />
                        : <span style={{ color: color.faint }}>—</span>}
                      {co("cong") && !r.so_cong_tay ? <div style={{ fontSize: 11, color: color.faint }}>hệ thống: {r.so_cong}</div> : null}
                    </td>
                    <td style={{ padding: "8px" }}>
                      {co("truc") ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          {["ca_truc_t2_t6", "ca_truc_t7", "ca_truc_cn"].map((k, i) => (
                            <O key={k} w={46} value={gt(r, k, r.ca_truc_tay ? String(r.ca_truc[i]) : "")} disabled={!sua1("truc")} tay={r.ca_truc_tay}
                               onChange={(v) => dat(r, k, v)} />
                          ))}
                        </div>
                      ) : <span style={{ color: color.faint }}>—</span>}
                      {co("truc") && !r.ca_truc_tay ? <div style={{ fontSize: 11, color: color.faint }}>hệ thống: {r.ca_truc.join(" / ")}</div> : null}
                    </td>
                    <td style={{ padding: "8px" }}>
                      {co("sale") ? <O w={110} value={gt(r, "thuong_sale", r.thuong_sale_tay ? String(r.thuong_sale) : "")} disabled={!sua1("sale")}
                                       tay={r.thuong_sale_tay} onChange={(v) => dat(r, "thuong_sale", v)} />
                        : <span style={{ color: color.faint }}>—</span>}
                      {co("sale") && !r.thuong_sale_tay ? <div style={{ fontSize: 11, color: color.faint }}>cấu hình: {tien(r.thuong_sale)}</div> : null}
                    </td>
                    <td style={{ padding: "8px" }}>
                      {co("ca_day") ? (
                        <Link to={`/calendar-detail?month=${thang}&year=${nam}`} style={{ color: color.ink }}>
                          <b>{r.ca_day_duyet}</b>/{r.ca_day_tong} · {tien(r.luong_day)} đ
                        </Link>
                      ) : <span style={{ color: color.faint }}>—</span>}
                    </td>
                    <td style={{ padding: "8px", fontSize: 12 }} title={r.thi_dua.ly_do || ""}>
                      {r.thi_dua.diem != null ? `${r.thi_dua.diem} đ` : "—"}
                      {r.thi_dua.thuong ? <div style={{ color: color.green }}>+{tien(r.thi_dua.thuong)}</div> : null}
                    </td>
                    <td style={{ padding: "8px", fontSize: 12, color: r.thieu.length ? color.red : color.green }}>
                      {r.thieu.length ? r.thieu.join(" · ") : "Đủ"}
                    </td>
                    <td style={{ padding: "8px" }}>
                      {doi ? (
                        <button type="button" disabled={dang === r.teacher_id} onClick={() => luu(r)}
                                style={{ border: 0, borderRadius: 8, padding: "5px 12px", background: color.orange, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                          {dang === r.teacher_id ? "…" : "Lưu"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ fontSize: 12, color: color.muted, marginTop: 8 }}>
            Ô viền cam = số nhập tay (thay số hệ thống). Xoá trống rồi Lưu = quay về số hệ thống. Thưởng thi đua GV part-time tính trên lương ca dạy.
          </div>
        </div>
      ) : null}
    </Card>
  );
}
