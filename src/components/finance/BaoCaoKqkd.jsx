import { useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "../../services/apiClient";
import { dinhDangTien, loiApi } from "../../services/financeService";
import { Button, Card, CardHead, Input, NoteStrip, Pill, StatCard, Table } from "./v3/ui";
import { color, radius } from "./v3/theme";

/**
 * Báo cáo kết quả kinh doanh tháng (chủ trung tâm chốt 15/10/2026).
 * Doanh thu = điểm danh thực học × học phí áp dụng từng học sinh + doanh thu khác (nhập tay).
 * Dòng tiền = học phí phụ huynh thực đóng trong tháng. Số do máy chủ tính:
 * giasu_online/finances/bao_cao_kqkd.py.
 */

const d = (v) => (v == null ? "—" : `${dinhDangTien(Math.round(Number(v || 0)))} đ`);
const trieu = (v) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1).replace(".0", "")}M` : `${Math.round(v / 1e3)}k`);
const ngayVN = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "");
const gio = (iso) => (iso ? new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "");
const NGUON_CA = { diem_danh: "Điểm danh từng em", si_so_bao_cao: "Theo sĩ số báo cáo", chua_diem_danh: "Chưa điểm danh" };
const NGUON_GIA = { lo_trinh: "Học phí ÷ buổi lộ trình", con_lai: "Học phí ÷ buổi còn lại", thang: "Học phí ÷ ca trong tháng",
                    trung_vi_lop: "Chưa có học phí — giá trung vị lớp", tb_trung_tam: "Giá trung bình trung tâm" };

/* Biểu đồ cột (doanh thu, chi phí) + đường (lợi nhuận) cho 12 tháng — SVG thuần. */
function BieuDoNam({ ds }) {
  const W = 760, H = 190, L = 46, B = 24, T = 16;
  const co = ds.filter((x) => x.doanh_thu != null);
  const max = Math.max(1, ...co.map((x) => Math.max(x.doanh_thu, x.chi_phi, x.loi_nhuan)));
  const min = Math.min(0, ...co.map((x) => x.loi_nhuan));
  const y = (v) => T + (H - T - B) * (1 - (v - min) / (max - min));
  const cot = (W - L) / 12;
  const bw = Math.min(16, cot / 3.2);
  const diem = co.map((x) => [L + cot * (x.thang - 1) + cot / 2, y(x.loi_nhuan), x.loi_nhuan]);
  const vach = [0, 0.25, 0.5, 0.75, 1].map((k) => min + (max - min) * k);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Hiệu suất kinh doanh 12 tháng">
      {vach.map((v) => (
        <g key={v}>
          <line x1={L} x2={W} y1={y(v)} y2={y(v)} stroke="#EDF0F4" />
          <text x={L - 6} y={y(v) + 4} fontSize="10" textAnchor="end" fill="#8A93A3">{trieu(v)}</text>
        </g>
      ))}
      {ds.map((x, i) => {
        const cx = L + cot * i + cot / 2;
        return (
          <g key={x.thang}>
            {x.doanh_thu != null ? (
              <>
                <rect x={cx - bw - 1} y={y(Math.max(x.doanh_thu, 0))} width={bw} height={Math.abs(y(0) - y(x.doanh_thu))} rx="2" fill="#F26522">
                  <title>{`T${x.thang} — Doanh thu ${d(x.doanh_thu)}`}</title>
                </rect>
                <rect x={cx + 1} y={y(Math.max(x.chi_phi, 0))} width={bw} height={Math.abs(y(0) - y(x.chi_phi))} rx="2" fill="#F5C9A9">
                  <title>{`T${x.thang} — Chi phí ${d(x.chi_phi)}`}</title>
                </rect>
                {/* Thông số trên đầu cột (triệu đồng) */}
                {x.doanh_thu ? <text x={cx - bw / 2 - 1} y={y(Math.max(x.doanh_thu, 0)) - 3} fontSize="8.5" textAnchor="middle" fill="#C2410C" fontWeight="700">{trieu(x.doanh_thu)}</text> : null}
                {x.chi_phi ? <text x={cx + bw / 2 + 1} y={y(Math.max(x.chi_phi, 0)) - 3} fontSize="8.5" textAnchor="middle" fill="#9A6B4F">{trieu(x.chi_phi)}</text> : null}
              </>
            ) : null}
            <text x={cx} y={H - 7} fontSize="11" textAnchor="middle" fill="#4A5568" fontWeight={x.nguon === "file" ? 700 : 400}>
              T{x.thang}{x.nguon === "file" ? "*" : ""}
            </text>
          </g>
        );
      })}
      <polyline points={diem.map((p) => `${p[0]},${p[1]}`).join(" ")} fill="none" stroke="#16A34A" strokeWidth="2.2" />
      {diem.map(([px, py, v]) => <circle key={px} cx={px} cy={py} r="3" fill="#16A34A"><title>{`Lợi nhuận ${d(v)}`}</title></circle>)}
    </svg>
  );
}

function Dong({ nhan, so, dam, am, phu }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: "1px dashed " + color.border,
                  fontWeight: dam ? 700 : 400, fontSize: 13.5 }}>
      <div>{nhan}{phu ? <div style={{ fontSize: 12, color: color.muted, fontWeight: 400 }}>{phu}</div> : null}</div>
      <div style={{ whiteSpace: "nowrap", color: am ? color.red : color.ink }}>{so}</div>
    </div>
  );
}

export default function BaoCaoKqkd({ thang, nam, coTheGhi = true }) {
  const [bc, setBc] = useState(null);
  const [nam12, setNam12] = useState(null);
  const [loi, setLoi] = useState("");
  const [dangTai, setDangTai] = useState(true);
  const [kieu, setKieu] = useState("lop");
  const [tim, setTim] = useState("");
  const [lopMo, setLopMo] = useState(null);
  const [chiTiet, setChiTiet] = useState(null);
  const [caMo, setCaMo] = useState(null);
  const [moi, setMoi] = useState({ noi_dung: "", so_tien: "" });
  const [taiLai, setTaiLai] = useState(0);
  const [nhap, setNhap] = useState(null); // { tep, thu: {hop_le, loi, dong} }

  useEffect(() => {
    let huy = false;
    setDangTai(true);
    setLoi("");
    apiClient.get("/finances/transactions/bao-cao-kqkd/", { params: { month: thang, year: nam }, timeout: 60000 })
      .then(({ data }) => !huy && setBc(data))
      .catch((e) => !huy && setLoi(loiApi(e, "Không tải được báo cáo kết quả kinh doanh.")))
      .finally(() => !huy && setDangTai(false));
    return () => { huy = true; };
  }, [thang, nam, taiLai]);

  useEffect(() => {
    let huy = false;
    setNam12(null);
    apiClient.get("/finances/transactions/bao-cao-kqkd/nam/", { params: { year: nam }, timeout: 120000 })
      .then(({ data }) => !huy && setNam12(data.thang)).catch(() => !huy && setNam12([]));
    return () => { huy = true; };
  }, [nam, taiLai]);

  const moLop = useCallback((id) => {
    if (lopMo === id) { setLopMo(null); setChiTiet(null); return; }
    setLopMo(id);
    setChiTiet(null);
    setCaMo(null);
    apiClient.get("/finances/transactions/bao-cao-kqkd/", { params: { month: thang, year: nam, lop: id }, timeout: 60000 })
      .then(({ data }) => setChiTiet(data.doanh_thu.chi_tiet_lop)).catch(() => setChiTiet([]));
  }, [lopMo, thang, nam]);

  const dt = bc?.doanh_thu;
  const hang = useMemo(() => {
    if (!dt) return [];
    const k = tim.trim().toLowerCase();
    const ds = dt.theo_lop.filter((r) => !k || `${r.lop} ${r.chuong_trinh}`.toLowerCase().includes(k));
    if (kieu === "lop") return ds;
    const m = new Map();
    ds.forEach((r) => {
      const o = m.get(r.chuong_trinh) || { lop: r.chuong_trinh, so_buoi: 0, luot_hoc: 0, doanh_thu: 0, can_kiem: [], so_lop: 0 };
      o.so_buoi += r.so_buoi; o.luot_hoc += r.luot_hoc; o.doanh_thu += Number(r.doanh_thu); o.so_lop += 1;
      if (r.can_kiem.length) o.can_kiem.push(`${r.lop}: ${r.can_kiem.join(", ")}`);
      m.set(r.chuong_trinh, o);
    });
    return [...m.values()].map((o) => ({ ...o, chuong_trinh: `${o.so_lop} lớp` }));
  }, [dt, tim, kieu]);

  const themKhac = async () => {
    try {
      await apiClient.post("/finances/transactions/doanh-thu-khac/", {
        month: thang, year: nam, noi_dung: moi.noi_dung, so_tien: Number(moi.so_tien || 0),
      });
      setMoi({ noi_dung: "", so_tien: "" });
      setTaiLai((v) => v + 1);
    } catch (e) { setLoi(loiApi(e, "Không ghi được doanh thu khác.")); }
  };
  const xoaKhac = async (id) => {
    if (!window.confirm("Xoá dòng doanh thu này?")) return;
    try {
      await apiClient.delete(`/finances/transactions/doanh-thu-khac/?id=${id}`);
      setTaiLai((v) => v + 1);
    } catch (e) { setLoi(loiApi(e, "Không xoá được.")); }
  };
  const xuat = async () => {
    try {
      const r = await apiClient.get("/finances/transactions/bao-cao-kqkd/xuat/",
        { params: { month: thang, year: nam }, responseType: "blob", timeout: 60000 });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url; a.download = `Bao-cao-KQKD-${String(thang).padStart(2, "0")}-${nam}.xlsx`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) { setLoi(loiApi(e, "Không xuất được báo cáo.")); }
  };

  const taiMau = async () => {
    try {
      const r = await apiClient.get("/finances/transactions/so-lieu-thang/", { params: { year: nam, mau: 1 }, responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url; a.download = `Mau-so-lieu-thang-${nam}.xlsx`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) { setLoi(loiApi(e, "Không tải được file mẫu.")); }
  };
  const guiFile = async (tep, thu) => {
    const fd = new FormData();
    fd.append("file", tep);
    try {
      const { data } = await apiClient.post(`/finances/transactions/so-lieu-thang/?year=${nam}${thu ? "&thu=1" : ""}`, fd, { timeout: 60000 });
      if (thu) setNhap({ tep, thu: data });
      else { setNhap(null); setTaiLai((v) => v + 1); }
    } catch (e) {
      const dd = e?.response?.data;
      if (dd?.loi) setNhap({ tep, thu: dd });
      else setLoi(loiApi(e, "Không nhập được file."));
    }
  };

  const ky = `${String(thang).padStart(2, "0")}/${nam}`;
  if (loi && !bc) return <NoteStrip>{loi}</NoteStrip>;
  if (!bc) return <Card style={{ padding: 20, color: color.muted, fontSize: 13 }}>Đang tính báo cáo kết quả kinh doanh…</Card>;

  const cp = bc.chi_phi;
  const ns = cp.nhan_su;
  const ct = bc.chinh_thuc || {};
  const tuFile = ct.nguon === "file";
  const ln = Number(tuFile ? ct.loi_nhuan : bc.loi_nhuan_thuan);
  const canKiem = dt.theo_lop.filter((r) => r.can_kiem.length).length;
  const tamTinh = ns.nguon !== "chot";
  const lopDangMo = dt.theo_lop.find((r) => r.classroom_id === lopMo);

  return (
    <div style={{ display: "grid", gap: 16, marginBottom: 20, opacity: dangTai ? 0.6 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Báo cáo kết quả kinh doanh — Tháng {ky}</div>
        {tuFile ? <Pill tone="blue">Số chính thức nhập từ file</Pill>
          : canKiem || tamTinh ? <Pill tone="amber">Bản tạm — chưa đối soát đủ</Pill> : <Pill tone="green">Đủ số liệu</Pill>}
        <Button variant="ghost" icon="doc" onClick={xuat} style={{ marginLeft: "auto" }}>Xuất báo cáo</Button>
      </div>
      {loi ? <NoteStrip>{loi}</NoteStrip> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <StatCard label="Doanh thu thực học tháng" value={d(dt.thuc_hoc)} icon="wallet" tone="orange"
                  note={`Từ điểm danh thực tế · ${dt.so_buoi} buổi, ${dt.luot_hoc} lượt`} small />
        <StatCard label="Chi phí tháng" value={d(tuFile ? ct.chi_phi : cp.tong)} icon="doc" tone="amber"
                  note={tuFile ? "Số nhập từ file" : tamTinh ? "Lương tạm tính + vận hành" : "Lương đã chốt + vận hành"} small />
        <StatCard label="Kết quả kinh doanh" value={d(ln)} icon="chart" tone={ln >= 0 ? "green" : "red"} valueColor={ln >= 0 ? "green" : "red"}
                  note={tuFile ? `Theo file: doanh thu ${d(ct.doanh_thu)}` : `Tổng doanh thu ${d(dt.tong)}`} small />
        <StatCard label="Tỷ suất" value={(tuFile ? (Number(ct.doanh_thu) ? `${(ln / Number(ct.doanh_thu) * 100).toFixed(1)}%` : "—") : bc.ty_suat != null ? `${bc.ty_suat}%` : "—")} icon="check" tone="blue" note="Lợi nhuận / doanh thu" small />
      </div>

      <Card>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap", padding: "18px 22px 0" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Hiệu suất kinh doanh năm {nam}</div>
            <div style={{ fontSize: 12.5, color: color.muted, marginTop: 3 }}>Đơn vị triệu đồng · tháng có dấu * là số nhập từ file</div>
          </div>
          {coTheGhi ? (
            <>
              <Button variant="ghost" icon="doc" onClick={taiMau}>Tải file mẫu</Button>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: radius.md, cursor: "pointer",
                              background: color.orange, color: "#fff", fontWeight: 700, fontSize: 13 }}>
                Nhập file số liệu
                <input type="file" accept=".xlsx" style={{ display: "none" }}
                       onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) guiFile(f, true); }} />
              </label>
            </>
          ) : null}
        </div>
        {nhap ? (
          <div style={{ margin: "12px 22px 0", border: "1px solid " + color.border, borderRadius: radius.md, padding: 12, background: color.subtle, fontSize: 13 }}>
            <b>{nhap.tep.name}</b> — {nhap.thu.hop_le} tháng hợp lệ
            {nhap.thu.loi?.length ? (
              <div style={{ color: color.red, marginTop: 6 }}>{nhap.thu.loi.map((x) => <div key={x}>• {x}</div>)}
                <div style={{ marginTop: 4 }}>Sửa file rồi nhập lại — chưa ghi gì.</div></div>
            ) : (
              <>
                <div style={{ display: "grid", gap: 2, margin: "6px 0" }}>
                  {(nhap.thu.dong || []).map((x) => (
                    <div key={`${x.nam}-${x.thang}`}>T{x.thang}/{x.nam}: doanh thu {d(x.doanh_thu)} · chi phí {d(x.chi_phi)}{x.ghi_chu ? ` · ${x.ghi_chu}` : ""}</div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button onClick={() => guiFile(nhap.tep, false)}>Ghi {nhap.thu.hop_le} tháng vào hệ thống</Button>
                  <Button variant="ghost" onClick={() => setNhap(null)}>Huỷ</Button>
                </div>
              </>
            )}
          </div>
        ) : null}
        <div style={{ padding: "8px 22px 18px", maxWidth: 820 }}>
          <div style={{ display: "flex", gap: 16, fontSize: 12.5, color: color.ink70, marginBottom: 6, flexWrap: "wrap" }}>
            <span><b style={{ color: "#F26522" }}>■</b> Doanh thu</span>
            <span><b style={{ color: "#F5C9A9" }}>■</b> Chi phí</span>
            <span><b style={{ color: "#16A34A" }}>●</b> Lợi nhuận</span>
          </div>
          {nam12 ? <BieuDoNam ds={nam12.length ? nam12 : Array.from({ length: 12 }, (_, i) => ({ thang: i + 1 }))} />
            : <div style={{ color: color.muted, fontSize: 13, padding: 20 }}>Đang tính 12 tháng…</div>}
        </div>
      </Card>

      <NoteStrip>
        <b>Nguồn doanh thu:</b> Điểm danh thực học × Học phí áp dụng từng học sinh (học phí của em ÷ số buổi khoản đó bao phủ).
        Buổi chưa điểm danh từng em tạm tính theo sĩ số giáo viên báo cáo × giá trung vị của lớp — cột “Đối soát” chỉ ra lớp cần kiểm.
      </NoteStrip>

      <Card style={{ paddingBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 22px 10px", flexWrap: "wrap" }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Doanh thu thực học theo {kieu === "lop" ? "lớp" : "chương trình"}</div>
          {[["lop", "Theo lớp"], ["ct", "Theo chương trình"]].map(([k, n]) => (
            <button key={k} type="button" onClick={() => setKieu(k)}
                    style={{ border: 0, borderRadius: 999, padding: "6px 12px", cursor: "pointer", fontWeight: 600, fontSize: 12.5,
                             background: kieu === k ? color.orange : "#F1F4F8", color: kieu === k ? "#fff" : color.ink70 }}>{n}</button>
          ))}
          <Input placeholder="Tìm lớp…" value={tim} onChange={(e) => setTim(e.target.value)} style={{ marginLeft: "auto", width: 180 }} />
        </div>
        <div style={{ padding: "0 22px" }}>
          <Table
            columns={[kieu === "lop" ? "Lớp" : "Chương trình", kieu === "lop" ? "Chương trình" : "Số lớp", "Buổi thực học", "Lượt học thực",
                      "Doanh thu thực học", "Đối soát", ""]}
            align={{ 2: "right", 3: "right", 4: "right" }}
            rows={[...hang.map((r) => [
              <b key="l">{r.lop}</b>, r.chuong_trinh, r.so_buoi, r.luot_hoc, <b key="d">{d(r.doanh_thu)}</b>,
              r.can_kiem.length ? <span key="k" title={r.can_kiem.join("\n")}><Pill tone="amber">Cần kiểm ({r.can_kiem.length})</Pill></span>
                : <Pill key="k" tone="green">Khớp</Pill>,
              kieu === "lop" ? (
                <button key="c" type="button" onClick={() => moLop(r.classroom_id)}
                        style={{ border: 0, background: "none", color: color.orange, fontWeight: 700, cursor: "pointer" }}>
                  {lopMo === r.classroom_id ? "Đóng" : "Chi tiết →"}
                </button>
              ) : null,
            ]), [<b key="t">TỔNG DOANH THU THỰC HỌC</b>, "", dt.so_buoi, dt.luot_hoc, <b key="d">{d(dt.thuc_hoc)}</b>, "", ""]]}
          />
          {lopDangMo ? (
            <div style={{ marginTop: 12, border: "1px solid " + color.border, borderRadius: radius.md, padding: 14, background: color.subtle }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Chi tiết lớp {lopDangMo.lop} → Buổi học → Điểm danh học sinh</div>
              {lopDangMo.can_kiem.map((x) => <div key={x} style={{ fontSize: 12.5, color: color.amber }}>• {x}</div>)}
              {chiTiet == null ? <div style={{ color: color.muted, fontSize: 13 }}>Đang tải…</div> : chiTiet.map((c) => (
                <div key={c.session_id} style={{ borderTop: "1px dashed " + color.border, padding: "8px 0" }}>
                  <div role="button" tabIndex={0} onClick={() => setCaMo(caMo === c.session_id ? null : c.session_id)}
                       onKeyDown={(e) => e.key === "Enter" && setCaMo(caMo === c.session_id ? null : c.session_id)}
                       style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13, cursor: "pointer" }}>
                    <b style={{ minWidth: 92 }}>{ngayVN(c.ngay)} {gio(c.bat_dau)}</b>
                    <span style={{ flex: 1, minWidth: 140 }}>{c.giao_vien}</span>
                    <span>{c.co_mat} HS có mặt</span>
                    <span style={{ color: c.nguon === "diem_danh" ? color.muted : color.amber }}>{NGUON_CA[c.nguon]}</span>
                    <b style={{ minWidth: 110, textAlign: "right" }}>{d(c.doanh_thu)}</b>
                  </div>
                  {caMo === c.session_id && c.hoc_sinh.length ? (
                    <div style={{ margin: "6px 0 0 16px", display: "grid", gap: 3 }}>
                      {c.hoc_sinh.map((h) => (
                        <div key={h.student_id} style={{ display: "flex", gap: 10, fontSize: 12.5, flexWrap: "wrap" }}>
                          <span style={{ flex: 1 }}>{h.ten}{h.hoc_bu ? " (học bù)" : ""}</span>
                          <span style={{ color: ["trung_vi_lop", "tb_trung_tam"].includes(h.nguon) ? color.amber : color.muted }}>{NGUON_GIA[h.nguon] || h.nguon}</span>
                          <b style={{ minWidth: 90, textAlign: "right" }}>{d(h.gia)}</b>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <Card>
          <CardHead title="Doanh thu khác" sub="Ngoài học phí thực học — kế toán nhập tay" />
          <div style={{ padding: "6px 22px 18px" }}>
            {dt.khac_dong.length ? dt.khac_dong.map((k) => (
              <Dong key={k.id} nhan={k.noi_dung} phu={[ngayVN(k.ngay), k.nguoi].filter(Boolean).join(" · ")}
                    so={<span>{d(k.so_tien)}{coTheGhi ? (
                      <button type="button" onClick={() => xoaKhac(k.id)} title="Xoá"
                              style={{ border: 0, background: "none", color: color.red, cursor: "pointer", marginLeft: 6 }}>✕</button>
                    ) : null}</span>} />
            )) : <div style={{ fontSize: 13, color: color.muted, padding: "6px 0" }}>Chưa có doanh thu khác.</div>}
            <Dong nhan="Tổng doanh thu khác" so={d(dt.khac)} dam />
            {coTheGhi ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <Input placeholder="Nội dung" value={moi.noi_dung} onChange={(e) => setMoi((x) => ({ ...x, noi_dung: e.target.value }))}
                       style={{ flex: 2, minWidth: 140 }} />
                <Input placeholder="Số tiền" value={moi.so_tien ? dinhDangTien(moi.so_tien) : ""} style={{ flex: 1, minWidth: 110, textAlign: "right" }}
                       onChange={(e) => setMoi((x) => ({ ...x, so_tien: e.target.value.replace(/[^0-9]/g, "") }))} />
                <Button onClick={themKhac} disabled={!moi.noi_dung.trim() || !moi.so_tien}>Thêm</Button>
              </div>
            ) : null}
          </div>
        </Card>
        <Card>
          <CardHead title="Chi phí trong tháng" />
          <div style={{ padding: "6px 22px 18px" }}>
            <Dong nhan={`Lương nhân sự (${ns.so_nguoi} người)`} so={d(ns.luong)}
                  phu={tamTinh ? "Tạm tính — chốt lương xong số sẽ cập nhật" : "Theo bảng lương đã chốt"} />
            <Dong nhan="BHXH doanh nghiệp đóng" so={d(ns.bh_dn)} />
            <Dong nhan={`Chi phí vận hành (${cp.so_dong_van_hanh} khoản)`} so={d(cp.van_hanh)}
                  phu={cp.so_dong_van_hanh ? null : "Ghi ở Sổ giao dịch (Ghi giao dịch → Chi)"} />
            <Dong nhan="Tổng chi phí" so={d(cp.tong)} dam />
          </div>
        </Card>
        <Card>
          <CardHead title="Thu – chi tiền trong tháng" sub="Dòng tiền thực, khác với doanh thu" />
          <div style={{ padding: "6px 22px 18px" }}>
            <Dong nhan="Tiền thu" phu="Học phí phụ huynh thực đóng trong tháng" so={d(bc.dong_tien.thuc_thu)} />
            <Dong nhan="Tiền chi" phu="Dòng chi trên sổ giao dịch" so={d(bc.dong_tien.thuc_chi)} />
            <Dong nhan="Chênh lệch thu − chi" so={d(bc.dong_tien.chenh_lech)} dam am={Number(bc.dong_tien.chenh_lech) < 0} />
          </div>
        </Card>
      </div>

      <div style={{ fontSize: 13, color: color.ink70, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span>● Trạng thái kỳ: <b>{bc.trang_thai_ky}</b></span>
        <span>Doanh thu: <b style={{ color: canKiem ? color.amber : color.green }}>{canKiem ? `${canKiem} lớp cần đối soát` : "Khớp"}</b></span>
        <span>Bảng lương: <b style={{ color: tamTinh ? color.amber : color.green }}>{tamTinh ? "Chưa chốt" : "Đã chốt"}</b></span>
      </div>
    </div>
  );
}
