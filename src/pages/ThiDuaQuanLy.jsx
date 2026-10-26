import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import apiClient from "../services/apiClient";
import { useAuth } from "../auth/AuthProvider";

/**
 * Thi đua QUẢN LÝ theo tháng (26/10/2026 — dựng theo mẫu VISTA_ThiDua_QuanLy_Thang11_2026_DEMO của chủ TT).
 * Đăng ký tiêu chí -> Giám đốc duyệt -> thực hiện + minh chứng -> Giám đốc nghiệm thu -> khoá điểm.
 * Máy chủ: giasu_online/thidua_ql/views.py. Giám đốc = admin / super admin.
 */
const C = {
  orange: "#F26522", orangeSoft: "#FFF1E8", green: "#1E8E4F", greenSoft: "#E7F6EC", blue: "#2563EB", blueSoft: "#EAF1FE",
  purple: "#6B46C1", purpleSoft: "#F3EFFF", red: "#C0392B", redSoft: "#FDECEA", amber: "#B7791F", amberSoft: "#FFF4E0",
  ink: "#1F2433", muted: "#6B7280", faint: "#9AA1AE", line: "#ECEEF2", bg: "#F7F7F9",
};
const NHOM = [["H", "Học sinh – Lớp học", C.orange, C.orangeSoft], ["M", "Sale – Truyền thông", C.blue, C.blueSoft],
  ["F", "Tài chính", C.green, C.greenSoft], ["N", "Hành chính – Nhân sự", C.purple, C.purpleSoft]];
const TT = {
  nhap: ["Nháp", C.muted, C.bg], cho_duyet: ["Chờ duyệt", C.amber, C.amberSoft], tra_ve: ["Cần chỉnh sửa", C.red, C.redSoft],
  da_duyet: ["Đang thực hiện", C.blue, C.blueSoft], cho_nghiem_thu: ["Chờ nghiệm thu", C.amber, C.amberSoft],
  can_bo_sung: ["Cần bổ sung", C.red, C.redSoft], da_nghiem_thu: ["Đã nghiệm thu", C.green, C.greenSoft],
  da_khoa: ["Đã khoá điểm", C.purple, C.purpleSoft],
};
// Nguồn đo tự động từ CRM (26/10/2026) — máy chủ: thidua_ql/do_luong.py.
const NGUON = [["", "Nhập tay (quản lý báo cáo)"], ["lop_du_buoi", "Điểm danh: số lớp đủ buổi học thật"],
  ["ket_qua_hoc_tap", "Kết quả học tập đã duyệt trên CRM"], ["truyen_thong", "Truyền thông của giáo viên đã duyệt"],
  ["hs_moi", "Học sinh tạo mới trong tháng"], ["thuc_thu", "Tiền thực thu trên hệ thống"], ["lich_hcns", "Lịch Hành chính – Nhân sự đã hoàn thành"]];
const so = (v, p = 1) => Number(v || 0).toLocaleString("vi-VN", { maximumFractionDigits: p });
const ngayVN = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "—");
const card = { background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 16 };
const Chip = ({ tt }) => {
  const [n, c, b] = TT[tt] || [tt, C.muted, C.bg];
  return <span style={{ fontSize: 11.5, fontWeight: 700, color: c, background: b, borderRadius: 999, padding: "2px 9px", whiteSpace: "nowrap" }}>{n}</span>;
};
const Bar = ({ v, color = C.orange }) => (
  <div style={{ height: 7, borderRadius: 7, background: "#EEF0F3", overflow: "hidden" }}>
    <div style={{ width: `${Math.max(0, Math.min(100, v || 0))}%`, height: "100%", background: color }} />
  </div>
);
const Nut = ({ children, mau = "ghost", ...p }) => (
  <button type="button" {...p} style={{
    border: mau === "ghost" ? `1px solid ${C.line}` : 0, borderRadius: 10, padding: "7px 13px", fontWeight: 700, fontSize: 13, cursor: p.disabled ? "not-allowed" : "pointer",
    opacity: p.disabled ? 0.55 : 1, background: { ghost: "#fff", cam: C.orange, xanh: C.green, do: C.red }[mau], color: mau === "ghost" ? C.ink : "#fff", ...(p.style || {}),
  }}>{children}</button>
);
const o = { width: "100%", padding: "8px 10px", border: `1px solid ${C.line}`, borderRadius: 9, fontSize: 13.5, fontFamily: "inherit", boxSizing: "border-box" };

function moc(thang, nam) {
  const t = thang === 1 ? 12 : thang - 1;
  const cuoi = new Date(nam, thang, 0).getDate();
  const s = (d, m) => `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
  return [
    [`${s(28, t)} – ${s(new Date(thang === 1 ? nam - 1 : nam, t, 0).getDate(), t)}`, "Đăng ký & gửi duyệt"],
    [`${s(1, thang)} – ${s(5, thang)}`, "Giám đốc duyệt"],
    [`${s(6, thang)} – ${s(cuoi - 4, thang)}`, "Thực hiện & cập nhật minh chứng"],
    [`${s(cuoi - 4, thang)} – ${s(cuoi, thang)}`, "Nghiệm thu & chấm điểm"],
    [`${s(1, thang % 12 + 1)} – ${s(5, thang % 12 + 1)}`, "Tổng kết tháng"],
  ];
}

export default function ThiDuaQuanLy() {
  const { user } = useAuth();
  const [tham, setTham] = useSearchParams();
  const nay = new Date();
  const [thang, setThang] = useState(Number(tham.get("thang")) || (nay.getDate() >= 20 ? nay.getMonth() + 2 > 12 ? 1 : nay.getMonth() + 2 : nay.getMonth() + 1));
  const [nam, setNam] = useState(Number(tham.get("nam")) || (nay.getDate() >= 20 && nay.getMonth() === 11 ? nay.getFullYear() + 1 : nay.getFullYear()));
  const nguoi = tham.get("nguoi") || "";
  const [d, setD] = useState(null);
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  const [chon, setChon] = useState(null);
  const [tab, setTab] = useState("tong_quan");
  const [vung, setVung] = useState("dang_ky"); // dang_ky | theo_doi | ket_qua — 3 tab lớn theo mẫu
  const [taiLai, setTaiLai] = useState(0);

  useEffect(() => {
    let con = true;
    setLoi("");
    apiClient.get("/thi-dua-ql/khung/", { params: { month: thang, year: nam, ...(nguoi ? { nguoi } : {}) } })
      .then(({ data }) => con && setD(data))
      .catch((e) => con && setLoi(e?.response?.data?.detail || "Không tải được thi đua quản lý."));
    return () => { con = false; };
  }, [thang, nam, nguoi, taiLai]);

  const k = d?.khung;
  const gd = Boolean(d?.giam_doc);
  const laChu = k && k.nguoi.id === user?.id;
  const tc = useMemo(() => k?.tieu_chi.find((x) => x.id === chon) || k?.tieu_chi[0] || null, [k, chon]);

  const goi = useCallback(async (fn, thongBao) => {
    setDang(true);
    setLoi("");
    try {
      const { data } = await fn();
      if (data?.tieu_chi) setD((x) => ({ ...x, khung: data }));
      else setTaiLai((v) => v + 1);
      if (thongBao) window.alert(thongBao);
    } catch (e) {
      const x = e?.response?.data || {};
      setLoi(x.detail || Object.values(x).flat()[0] || "Không thực hiện được.");
    } finally {
      setDang(false);
    }
  }, []);

  const doiThang = (m, y) => { setThang(m); setNam(y); setChon(null); setTham((p) => { const q = new URLSearchParams(p); q.set("thang", m); q.set("nam", y); return q; }); };
  const moNguoi = (id) => setTham((p) => { const q = new URLSearchParams(p); if (id) q.set("nguoi", id); else q.delete("nguoi"); return q; });

  const dauTrang = (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 260 }}>
        <h1 style={{ margin: 0, fontSize: 26, color: C.ink }}>Thi đua quản lý</h1>
        <div style={{ color: C.muted, fontSize: 13.5, marginTop: 2 }}>Đăng ký · Trình duyệt · Thực hiện · Nghiệm thu · Chấm điểm</div>
      </div>
      <select value={`${thang}-${nam}`} onChange={(e) => { const [m, y] = e.target.value.split("-").map(Number); doiThang(m, y); }}
              style={{ ...o, width: 160 }} aria-label="Tháng">
        {Array.from({ length: 8 }, (_, i) => { const dt = new Date(nay.getFullYear(), nay.getMonth() - 3 + i, 1); return [dt.getMonth() + 1, dt.getFullYear()]; })
          .map(([m, y]) => <option key={`${m}-${y}`} value={`${m}-${y}`}>Tháng {m}/{y}</option>)}
      </select>
      {gd && nguoi ? <Nut onClick={() => moNguoi("")}>← Tất cả quản lý</Nut> : null}
    </div>
  );

  if (!d) return <div style={{ padding: 20 }}>{dauTrang}<div style={{ marginTop: 16, color: loi ? C.red : C.muted }}>{loi || "Đang tải…"}</div></div>;

  // ---- Giám đốc: bảng tổng hợp mọi quản lý
  if (gd && !nguoi) {
    return (
      <div style={{ padding: 20, display: "grid", gap: 16 }}>
        {dauTrang}
        <div style={card}>
          <b style={{ fontSize: 15 }}>Khung thi đua quản lý tháng {thang}/{nam}</b>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12, fontSize: 13.5 }}>
            <thead><tr style={{ color: C.muted, fontSize: 12, textAlign: "left" }}>
              {["Quản lý", "Vai", "Trạng thái", "Chờ bạn xử lý", "Điểm tạm tính", "Dự kiến", ""].map((h) => <th key={h} style={{ padding: 8 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {d.ds.map((x) => (
                <tr key={x.nguoi.id} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td style={{ padding: 8, fontWeight: 700 }}>{x.nguoi.ten}</td>
                  <td style={{ padding: 8, color: C.muted }}>{x.nguoi.vai === "center_manager" ? "Quản lý cơ sở" : "Quản lý đào tạo"}</td>
                  <td style={{ padding: 8 }}>{x.trang_thai ? <Chip tt={x.trang_thai} /> : <span style={{ color: C.faint }}>Chưa lập khung</span>}</td>
                  <td style={{ padding: 8, color: x.cho_duyet ? C.amber : C.faint, fontWeight: 700 }}>{x.cho_duyet || "—"}</td>
                  <td style={{ padding: 8, fontWeight: 800 }}>{so(x.diem_tam_tinh)}</td>
                  <td style={{ padding: 8, color: C.muted }}>{so(x.diem_du_kien)}</td>
                  <td style={{ padding: 8 }}><Nut mau={x.khung_id ? "ghost" : "cam"} onClick={() => moNguoi(x.nguoi.id)}>{x.khung_id ? "Mở →" : "Lập khung →"}</Nut></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12, fontSize: 12.5, color: C.muted, lineHeight: 1.7 }}>
            Quy trình tháng: quản lý lập khung (hoặc Giám đốc bấm “Lập khung →” để lập sẵn từ mẫu 14 tiêu chí) → quản lý sửa chỉ tiêu,
            trọng số đủ 100 rồi gửi duyệt → Giám đốc duyệt → quản lý báo cáo + nộp minh chứng → Giám đốc nghiệm thu, chấm điểm → khoá điểm tháng.
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
          {moc(thang, nam).map(([ngay, viec], i) => (
            <div key={viec} style={{ ...card, textAlign: "center", padding: 12 }}>
              <div style={{ width: 26, height: 26, borderRadius: 13, margin: "0 auto 4px", display: "grid", placeItems: "center", fontWeight: 800, background: C.orangeSoft, color: C.orange }}>{i + 1}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{ngay}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{viec}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- Chưa có khung
  if (!k) {
    return (
      <div style={{ padding: 20, display: "grid", gap: 16 }}>
        {dauTrang}
        <div style={{ ...card, display: "grid", gap: 12, maxWidth: 720 }}>
          <b style={{ fontSize: 16 }}>Chưa có khung thi đua tháng {thang}/{nam}{gd && d.nguoi?.ten ? ` — ${d.nguoi.ten}` : ""}</b>
          {d.co_the_tao ? (
            <>
              <div style={{ color: C.muted, fontSize: 13.5 }}>
                Lập khung để đăng ký chỉ tiêu tháng, gửi Giám đốc duyệt trước ngày 05/{String(thang).padStart(2, "0")}.
                Mẫu tháng 11 có sẵn 14 tiêu chí trong 4 nhóm, trọng số theo vai của bạn (tổng 100 điểm) — sửa lại cho khớp thực tế rồi gửi.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Nut mau="cam" disabled={dang} onClick={() => goi(() => apiClient.post("/thi-dua-ql/khung/", { month: thang, year: nam, tu_mau: true, ...(gd ? { nguoi } : {}) }))}>
                  Tạo từ mẫu (14 tiêu chí)
                </Nut>
                <Nut disabled={dang} onClick={() => goi(() => apiClient.post("/thi-dua-ql/khung/", { month: thang, year: nam, sao_thang_truoc: true, ...(gd ? { nguoi } : {}) }))}>
                  Sao chép tháng trước
                </Nut>
                <Nut disabled={dang} onClick={() => goi(() => apiClient.post("/thi-dua-ql/khung/", { month: thang, year: nam, tu_mau: false, ...(gd ? { nguoi } : {}) }))}>
                  Khung trống
                </Nut>
              </div>
            </>
          ) : <div style={{ color: C.muted }}>Người này chưa lập khung tháng này.</div>}
          {loi ? <div style={{ color: C.red, fontSize: 13 }}>{loi}</div> : null}
        </div>
      </div>
    );
  }

  const suaDuoc = (laChu || gd) && ["nhap", "tra_ve"].includes(tc?.trang_thai) && k.trang_thai !== "da_khoa";
  const dem = k.dem || {};
  const tongTc = k.tieu_chi.length || 1;
  const daNt = dem.da_nghiem_thu || 0;
  const coTheGui = laChu && ["nhap", "tra_ve"].includes(k.trang_thai);
  const choDuyet = k.tieu_chi.filter((x) => x.trang_thai === "cho_duyet").length;
  const mocs = moc(k.thang, k.nam);
  const buocHien = k.trang_thai === "da_khoa" ? 4 : daNt ? 3 : ["da_duyet"].includes(k.trang_thai) ? 2 : k.trang_thai === "cho_duyet" ? 1 : 0;


  const nhomCua = (ma) => NHOM.find((n) => n[0] === ma) || NHOM[0];
  // Đếm theo chú thích của mẫu: đang thực hiện / chờ duyệt / cần bổ sung / chưa bắt đầu (+ đã nghiệm thu).
  const nhomTT = { dang: 0, cho: 0, bo_sung: 0, chua: 0, xong: 0 };
  k.tieu_chi.forEach((x) => {
    if (x.trang_thai === "da_nghiem_thu") nhomTT.xong += 1;
    else if (["cho_duyet", "cho_nghiem_thu"].includes(x.trang_thai)) nhomTT.cho += 1;
    else if (["can_bo_sung", "tra_ve"].includes(x.trang_thai)) nhomTT.bo_sung += 1;
    else if (x.trang_thai === "da_duyet" && x.ket_qua_bao_cao != null) nhomTT.dang += 1;
    else nhomTT.chua += 1;
  });
  const tienDoTB = Math.round(k.tieu_chi.reduce((t, x) => t + (x.trang_thai === "da_nghiem_thu" ? 100 : x.tien_do_bao_cao || 0), 0) / tongTc);
  const r = 34;
  const chuVi = 2 * Math.PI * r;
  const soTheoDoi = k.tieu_chi.filter((x) => !["nhap", "cho_duyet", "tra_ve"].includes(x.trang_thai)).length;

  const danhSach = (
    <div style={{ ...card, padding: 10, display: "grid", gap: 10 }}>
      {NHOM.map(([ma, ten, mau, nen], i) => {
        const ds = k.tieu_chi.filter((x) => x.nhom === ma);
        return (
          <div key={ma} style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", background: nen }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, background: mau, color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800 }}>{i + 1}</span>
              <b style={{ fontSize: 13.5, flex: 1 }}>{ten}</b>
              <span style={{ fontSize: 11.5, color: C.muted }}>{ds.length} tiêu chí</span>
            </div>
            {ds.map((x) => (
              <button key={x.id} type="button" onClick={() => setChon(x.id)}
                      style={{ all: "unset", cursor: "pointer", display: "grid", gridTemplateColumns: "30px 1fr auto 34px", gap: 6, alignItems: "center", width: "100%",
                               boxSizing: "border-box", padding: "8px 10px", fontSize: 13, borderTop: `1px solid ${C.line}`,
                               background: tc?.id === x.id ? C.orangeSoft : "#fff", boxShadow: tc?.id === x.id ? `inset 3px 0 0 ${C.orange}` : "none" }}>
                <b style={{ color: C.muted, fontSize: 12 }}>{x.ma}</b>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={x.ten}>{x.ten}</span>
                <Chip tt={x.trang_thai} />
                <span style={{ fontSize: 12, color: C.muted, textAlign: "right" }}>{so(x.trong_so)}đ</span>
              </button>
            ))}
            {(laChu || gd) && ["nhap", "tra_ve"].includes(k.trang_thai) ? (
              <button type="button" onClick={() => goi(() => apiClient.post("/thi-dua-ql/tieu-chi/", { khung: k.id, nhom: ma }))}
                      style={{ border: 0, background: "none", color: C.orange, cursor: "pointer", fontSize: 12.5, padding: "6px 10px" }}>+ Thêm tiêu chí đề xuất</button>
            ) : null}
          </div>
        );
      })}
    </div>
  );

  const ketQua = (
    <div style={{ ...card, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <b style={{ fontSize: 15, flex: 1 }}>Kết quả & chấm điểm tháng {k.thang}/{k.nam}</b>
        <span style={{ fontSize: 13 }}>Đã nghiệm thu: <b>{so(k.diem_tam_tinh, 2)}</b>/100 · Dự kiến: {so(k.diem_du_kien, 2)}</span>
        {k.trang_thai === "da_khoa" ? <Chip tt="da_khoa" /> : null}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 720 }}>
          <thead><tr style={{ background: C.bg, color: C.muted, fontSize: 12, textAlign: "left" }}>
            {["Mã", "Tiêu chí", "Nhóm", "Chỉ tiêu", "Đo từ CRM", "Báo cáo", "Nghiệm thu", "Trọng số", "Điểm", "Trạng thái"].map((h) => <th key={h} style={{ padding: "8px 6px" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {k.tieu_chi.map((x) => (
              <tr key={x.id} style={{ borderTop: `1px solid ${C.line}`, cursor: "pointer" }} onClick={() => { setChon(x.id); setVung("theo_doi"); setTab("duyet"); }}>
                <td style={{ padding: "8px 6px", fontWeight: 800, color: nhomCua(x.nhom)[2] }}>{x.ma}</td>
                <td style={{ padding: "8px 6px" }}>{x.ten}</td>
                <td style={{ padding: "8px 6px", color: C.muted }}>{x.nhom_nhan}</td>
                <td style={{ padding: "8px 6px" }}>{so(x.chi_tieu)} {x.don_vi}</td>
                <td style={{ padding: "8px 6px", color: C.blue }} title={x.do_tu_dong?.mo_ta || ""}>{x.do_tu_dong ? so(x.do_tu_dong.gia_tri) : "—"}</td>
                <td style={{ padding: "8px 6px" }}>{x.ket_qua_bao_cao != null ? so(x.ket_qua_bao_cao) : "—"}</td>
                <td style={{ padding: "8px 6px" }}>{x.ket_qua_nghiem_thu != null ? so(x.ket_qua_nghiem_thu) : "—"}</td>
                <td style={{ padding: "8px 6px" }}>{so(x.trong_so)}</td>
                <td style={{ padding: "8px 6px", fontWeight: 800 }}>{x.trang_thai === "da_nghiem_thu" ? so(x.diem, 2) : <span style={{ color: C.faint }}>{so(x.diem_goi_y, 2)}*</span>}</td>
                <td style={{ padding: "8px 6px" }}><Chip tt={x.trang_thai} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, color: C.muted }}>* điểm dự kiến theo số quản lý báo cáo, chưa nghiệm thu. Bấm một dòng để mở phần nghiệm thu.</div>
      {k.nhan_xet ? <div style={{ fontSize: 13 }}><b>Nhận xét tổng kết:</b> {k.nhan_xet}</div> : null}
    </div>
  );

  return (
    <div style={{ padding: 20, display: "grid", gap: 16 }}>
      {dauTrang}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <b style={{ fontSize: 15 }}>{k.nguoi.ten}</b>
        <span style={{ color: C.muted, fontSize: 13 }}>{k.vai === "center_manager" ? "Quản lý cơ sở" : "Quản lý đào tạo"}</span>
        <Chip tt={k.trang_thai} />
        <span style={{ fontSize: 12.5, color: k.tong_trong_so === 100 ? C.green : C.red }}>Tổng trọng số {so(k.tong_trong_so)}/100</span>
        <span style={{ fontSize: 12.5, color: C.muted }}>{k.trang_thai === "da_khoa" ? "Điểm đã khoá" : "Điểm tạm tính"}: <b style={{ color: C.ink }}>{so(k.diem_khoa ?? k.diem_tam_tinh, 2)}/100</b></span>
        <span style={{ flex: 1 }} />
        {coTheGui ? <Nut mau="cam" disabled={dang} onClick={() => goi(() => apiClient.post(`/thi-dua-ql/khung/${k.id}/gui/`), "Đã gửi Giám đốc duyệt.")}>Gửi Giám đốc duyệt</Nut> : null}
        {gd && choDuyet ? <Nut mau="xanh" disabled={dang} onClick={() => goi(() => apiClient.post(`/thi-dua-ql/khung/${k.id}/duyet/`, {}))}>✓ Duyệt tất cả ({choDuyet})</Nut> : null}
        {gd && k.trang_thai === "da_duyet" ? (
          <Nut disabled={dang} onClick={() => {
            const ly = window.prompt(`Khoá điểm tháng ${k.thang}/${k.nam} của ${k.nguoi.ten}: ${so(k.diem_tam_tinh)}/100 (tiêu chí chưa nghiệm thu tính 0). Nhận xét tổng kết:`, "");
            if (ly != null) goi(() => apiClient.post(`/thi-dua-ql/khung/${k.id}/khoa/`, { ly_do: ly }));
          }}>🔒 Khoá điểm tháng</Nut>
        ) : null}
        {gd && k.trang_thai === "da_khoa" ? <Nut disabled={dang} onClick={() => window.confirm("Mở khoá điểm tháng?") && goi(() => apiClient.post(`/thi-dua-ql/khung/${k.id}/mo_khoa/`))}>Mở khoá</Nut> : null}
      </div>
      {loi ? <div style={{ color: C.red, fontSize: 13, background: C.redSoft, borderRadius: 10, padding: "8px 12px" }}>{loi}</div> : null}

      {/* Tiến độ tổng thể + 4 khung cố định — luôn 1 hàng trên màn rộng (26/10/2026) */}
      <div className="tdql-tong" style={{ display: "grid", gridTemplateColumns: "minmax(230px,1.25fr) repeat(4,minmax(0,1fr))", gap: 12 }}>
        <div style={{ ...card, display: "flex", gap: 12, alignItems: "center" }}>
          <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
            <circle cx="42" cy="42" r={r} fill="none" stroke="#EEF0F3" strokeWidth="9" />
            <circle cx="42" cy="42" r={r} fill="none" stroke={C.green} strokeWidth="9" strokeLinecap="round"
                    strokeDasharray={`${(chuVi * tienDoTB) / 100} ${chuVi}`} transform="rotate(-90 42 42)" />
            <text x="42" y="46" textAnchor="middle" fontSize="17" fontWeight="800" fill={C.ink}>{tienDoTB}%</text>
          </svg>
          <div style={{ display: "grid", gap: 3, fontSize: 12 }}>
            <b style={{ fontSize: 12.5 }}>Tiến độ tổng thể tháng {k.thang}/{k.nam}</b>
            {[["Đang thực hiện", nhomTT.dang, C.blue], ["Chờ duyệt", nhomTT.cho, C.amber], ["Cần bổ sung", nhomTT.bo_sung, C.red],
              ["Chưa bắt đầu", nhomTT.chua, C.faint], ["Đã nghiệm thu", nhomTT.xong, C.green]].map(([n, v, m]) => (
              <span key={n}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: m, marginRight: 6 }} />{n} ({v})</span>
            ))}
          </div>
        </div>
        {NHOM.map(([ma, ten, mau, nen], i) => {
          const ds = k.tieu_chi.filter((x) => x.nhom === ma);
          const ts = ds.reduce((t, x) => t + x.trong_so, 0);
          const dk = ds.reduce((t, x) => t + (x.trang_thai === "da_nghiem_thu" ? x.diem || 0 : x.diem_goi_y || 0), 0);
          const nt = ds.reduce((t, x) => t + (x.trang_thai === "da_nghiem_thu" ? x.diem || 0 : 0), 0);
          const pt = ts ? Math.round((dk * 100) / ts) : 0;
          return (
            <div key={ma} style={{ ...card }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ width: 26, height: 26, borderRadius: 8, background: mau, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800 }}>{i + 1}</span>
                <b style={{ fontSize: 13.5 }}>{ten}</b>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: mau, marginTop: 8, whiteSpace: "nowrap" }}>{pt} <span style={{ fontSize: 12.5, color: C.muted }}>/ 100 điểm</span></div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}><div style={{ flex: 1 }}><Bar v={pt} color={mau} /></div><span style={{ fontSize: 12, color: C.muted }}>{pt}%</span></div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4, background: nen, borderRadius: 6, padding: "2px 6px", display: "inline-block" }}>
                {ds.length} tiêu chí · đã nghiệm thu {so(nt)}/{so(ts)}đ
              </div>
            </div>
          );
        })}
      </div>

      {/* Quy trình */}
      <div style={card}>
        <b style={{ fontSize: 13.5 }}>Quy trình thực hiện trong tháng {k.thang}/{k.nam}</b>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(110px,1fr))", gap: 6, overflowX: "auto", marginTop: 10 }}>
          {mocs.map(([ngay, viec], i) => (
            <div key={viec} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: i <= buocHien ? C.ink : C.muted }}>{ngay}</div>
              <div style={{ width: 28, height: 28, borderRadius: 14, margin: "4px auto", display: "grid", placeItems: "center", fontWeight: 800,
                            background: i < buocHien ? C.green : i === buocHien ? C.orange : C.bg, color: i <= buocHien ? "#fff" : C.muted }}>
                {i < buocHien ? "✓" : i + 1}
              </div>
              <div style={{ fontSize: 11.5, color: C.muted }}>{viec}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 3 tab lớn theo mẫu */}
      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.line}`, overflowX: "auto" }}>
        {[["dang_ky", `Đăng ký & trình duyệt (${k.tieu_chi.length})`], ["theo_doi", `Theo dõi & nghiệm thu (${soTheoDoi})`], ["ket_qua", "Kết quả & chấm điểm"]].map(([ma, ten]) => (
          <button key={ma} type="button" onClick={() => { setVung(ma); setTab(ma === "theo_doi" ? "tien_do" : "tong_quan"); }}
                  style={{ border: 0, background: vung === ma ? C.orangeSoft : "none", padding: "10px 16px", cursor: "pointer", whiteSpace: "nowrap", borderRadius: "10px 10px 0 0",
                           fontWeight: vung === ma ? 800 : 600, color: vung === ma ? C.orange : C.muted, borderBottom: vung === ma ? `2px solid ${C.orange}` : "2px solid transparent" }}>{ten}</button>
        ))}
      </div>

      {vung === "ket_qua" ? ketQua : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,380px) minmax(0,1fr)", gap: 16, alignItems: "start" }} className="tdql-luoi">
          {danhSach}
          {tc ? (
            <ChiTiet key={tc.id} tc={tc} k={k} gd={gd} laChu={laChu} suaDuoc={suaDuoc} dang={dang} goi={goi} tab={tab} setTab={setTab} />
          ) : <div style={card}>Chưa có tiêu chí.</div>}
        </div>
      )}
      <style>{"@media (max-width: 900px){.tdql-luoi{grid-template-columns:1fr !important}}"
        + "@media (max-width: 1100px){.tdql-tong{grid-template-columns:repeat(3,minmax(0,1fr)) !important}}"
        + "@media (max-width: 640px){.tdql-tong{grid-template-columns:repeat(2,minmax(0,1fr)) !important}}"}</style>
    </div>
  );
}

const Khoi = ({ tieuDe, children, phai }) => (
  <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 12, display: "grid", gap: 8, alignContent: "start" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><b style={{ fontSize: 13.5, flex: 1 }}>{tieuDe}</b>{phai}</div>
    {children}
  </div>
);

function ChiTiet({ tc, k, gd, laChu, suaDuoc, dang, goi, tab, setTab }) {
  const [f, setF] = useState(() => ({ ...tc }));
  const [bc, setBc] = useState({ so_dat: tc.ket_qua_bao_cao ?? "", noi_dung: tc.bao_cao || "" });
  const [nt, setNt] = useState({ so_dat: tc.do_tu_dong ? tc.do_tu_dong.gia_tri : tc.ket_qua_bao_cao ?? "", diem: "", nhan_xet: "" });
  const [gh, setGh] = useState({ han_moi: "", ly_do: "" });
  const [sua, setSua] = useState(false);
  const oFile = useRef(null);
  const [mau] = (NHOM.find((n) => n[0] === tc.nhom) || NHOM[0]).slice(2);
  const baoCaoDuoc = laChu && ["da_duyet", "can_bo_sung", "cho_nghiem_thu"].includes(tc.trang_thai) && k.trang_thai !== "da_khoa";
  const goiY = tc.chi_tieu ? Math.min(1, Number(nt.so_dat || 0) / tc.chi_tieu) * tc.trong_so : 0;
  const luu = () => goi(() => apiClient.patch(`/thi-dua-ql/tieu-chi/${tc.id}/`, {
    ten: f.ten, muc_tieu: f.muc_tieu, don_vi: f.don_vi, chi_tieu: f.chi_tieu, trong_so: f.trong_so, han: f.han,
    phu_trach: f.phu_trach, minh_chung_yc: f.minh_chung_yc, dieu_kien: f.dieu_kien, ghi_chu: f.ghi_chu,
    nguon_do: f.nguon_do || "", tham_so: f.tham_so ?? "",
  })).then(() => setSua(false));
  const TABS = [["tong_quan", "Tổng quan"], ["tien_do", "Tiến độ"], ["noi_dung", "Nội dung & mốc"], ["minh_chung", `Minh chứng (${tc.minh_chung.length})`],
    ["duyet", "Nhận xét & duyệt"], ["lich_su", "Lịch sử"]];
  const hang = (nhan, v) => <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8, fontSize: 13, padding: "3px 0" }}><span style={{ color: C.muted }}>{nhan}</span><span>{v || "—"}</span></div>;
  const mucTieu = String(tc.muc_tieu || "").split(/[;\n]+/).map((x) => x.trim()).filter(Boolean);
  const soLanBC = tc.lich_su.filter((h) => /Cập nhật tiến độ|Nộp nghiệm thu/.test(h.noi_dung)).length;
  const thangS = String(k.thang).padStart(2, "0");
  const mocTc = [[`07/${thangS}`, "Báo cáo lần 1", soLanBC >= 1], [`14/${thangS}`, "Báo cáo lần 2", soLanBC >= 2],
    [`21/${thangS}`, "Báo cáo lần 3", soLanBC >= 3], [ngayVN(tc.han).slice(0, 5), "Hoàn thành", tc.trang_thai === "da_nghiem_thu"]];
  const ptNt = tc.trang_thai === "da_nghiem_thu" && tc.chi_tieu ? (tc.ket_qua_nghiem_thu * 100) / tc.chi_tieu : 0;

  const doTD = tc.do_tu_dong;
  const khoiTienDo = (
    <Khoi tieuDe="Tiến độ thực hiện" phai={doTD ? <span style={{ fontSize: 11.5, fontWeight: 700, color: C.blue, background: C.blueSoft, borderRadius: 999, padding: "2px 8px" }}>Đo tự động</span> : null}>
      {doTD ? (
        <div style={{ fontSize: 12.5, background: C.blueSoft, borderRadius: 8, padding: "6px 9px" }}>
          <b>{tc.nguon_do_nhan}:</b> {doTD.mo_ta}
        </div>
      ) : null}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>{doTD ? "Số đạt (CRM)" : "Đã báo cáo"}</span>
        <b>{tc.tien_do_bao_cao}% · {so(doTD ? doTD.gia_tri : tc.ket_qua_bao_cao ?? 0)}/{so(tc.chi_tieu)} {tc.don_vi}</b></div>
      <Bar v={tc.tien_do_bao_cao} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>Đã nghiệm thu</span>
        <b style={{ color: C.green }}>{Math.round(ptNt)}% · {tc.ket_qua_nghiem_thu != null ? so(tc.ket_qua_nghiem_thu) : 0}/{so(tc.chi_tieu)}</b></div>
      <Bar v={ptNt} color={C.green} />
    </Khoi>
  );
  const khoiMoc = (
    <Khoi tieuDe="Các mốc thời gian quan trọng">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, textAlign: "center" }}>
        {mocTc.map(([ngay, viec, xong], i) => (
          <div key={viec}>
            <div style={{ width: 24, height: 24, borderRadius: 12, margin: "0 auto 3px", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800,
                          background: xong ? C.green : i === mocTc.length - 1 ? C.redSoft : C.bg, color: xong ? "#fff" : i === mocTc.length - 1 ? C.red : C.muted }}>{xong ? "✓" : i + 1}</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{ngay}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{viec}</div>
          </div>
        ))}
      </div>
    </Khoi>
  );
  const anh = (m, w = 96, h = 72) => (
    <a key={m.id} href={m.url} target="_blank" rel="noreferrer">
      {m.la_anh ? <img src={m.url} alt={m.ten} style={{ width: w, height: h, objectFit: "cover", borderRadius: 8, display: "block" }} />
        : <span style={{ display: "grid", placeItems: "center", width: w, height: h, border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 11.5, padding: 4, boxSizing: "border-box", overflow: "hidden" }}>📎 {m.ten}</span>}
    </a>
  );
  const khoiDiem = (
    <Khoi tieuDe={`Chấm điểm (thang ${so(tc.trong_so)})`}>
      <div style={{ fontSize: 26, fontWeight: 800 }}>{so(tc.trang_thai === "da_nghiem_thu" ? tc.diem : tc.diem_goi_y, 2)} <span style={{ fontSize: 13, color: C.muted }}>/ {so(tc.trong_so)}</span></div>
      <div style={{ fontSize: 12, color: C.muted }}>{tc.trang_thai === "da_nghiem_thu" ? "Giám đốc đã nghiệm thu" : "Dự kiến = trọng số × số đạt ÷ chỉ tiêu (Giám đốc chỉnh khi nghiệm thu)"}</div>
    </Khoi>
  );
  const nutDuyet = gd ? (
    <div style={{ display: "grid", gap: 8 }}>
      {tc.trang_thai === "cho_duyet" ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Nut mau="xanh" disabled={dang} onClick={() => goi(() => apiClient.post(`/thi-dua-ql/khung/${k.id}/duyet/`, { tieu_chi_ids: [tc.id] }))}>✓ Duyệt đề xuất</Nut>
          <Nut mau="do" disabled={dang} onClick={() => { const ly = window.prompt("Lý do trả về để quản lý chỉnh sửa:"); if (ly) goi(() => apiClient.post(`/thi-dua-ql/khung/${k.id}/tra_ve/`, { tieu_chi_ids: [tc.id], ly_do: ly })); }}>Trả về chỉnh sửa</Nut>
        </div>
      ) : null}
      {tc.gia_han === "cho" ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", background: C.amberSoft, borderRadius: 9, padding: 8 }}>
          <span style={{ flex: 1, fontSize: 13 }}>Xin gia hạn tới <b>{ngayVN(tc.han_de_xuat)}</b>: {tc.ly_do_gia_han}</span>
          <Nut mau="xanh" disabled={dang} onClick={() => goi(() => apiClient.post(`/thi-dua-ql/tieu-chi/${tc.id}/duyet_gia_han/`, { dong_y: true }))}>Duyệt</Nut>
          <Nut mau="do" disabled={dang} onClick={() => goi(() => apiClient.post(`/thi-dua-ql/tieu-chi/${tc.id}/duyet_gia_han/`, { dong_y: false }))}>Không</Nut>
        </div>
      ) : null}
      {["cho_nghiem_thu", "da_duyet", "can_bo_sung", "da_nghiem_thu"].includes(tc.trang_thai) && k.trang_thai !== "da_khoa" ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>
            <label style={{ display: "grid", gap: 4, fontSize: 12 }}>Số đạt xác nhận<input style={o} value={nt.so_dat} onChange={(e) => setNt({ ...nt, so_dat: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 4, fontSize: 12 }}>Điểm (trống = {so(goiY, 2)})<input style={o} value={nt.diem} onChange={(e) => setNt({ ...nt, diem: e.target.value })} /></label>
          </div>
          <textarea rows={2} style={o} placeholder="Nhận xét của Giám đốc…" value={nt.nhan_xet} onChange={(e) => setNt({ ...nt, nhan_xet: e.target.value })} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Nut mau="xanh" disabled={dang} onClick={() => goi(() => apiClient.post(`/thi-dua-ql/tieu-chi/${tc.id}/nghiem_thu/`, { ket_qua: "dat", ...nt }))}>✓ Duyệt nghiệm thu</Nut>
            <Nut mau="do" disabled={dang || !nt.nhan_xet.trim()} onClick={() => goi(() => apiClient.post(`/thi-dua-ql/tieu-chi/${tc.id}/nghiem_thu/`, { ket_qua: "bo_sung", nhan_xet: nt.nhan_xet }))}>Yêu cầu bổ sung</Nut>
          </div>
        </div>
      ) : null}
    </div>
  ) : null;
  const khoiDuyet = (
    <Khoi tieuDe="Nhận xét & duyệt của Giám đốc">
      {tc.nhan_xet ? <div style={{ fontSize: 13, background: C.bg, borderRadius: 8, padding: 8 }}>{tc.nhan_xet}</div> : null}
      {nutDuyet || <div style={{ fontSize: 12.5, color: C.muted }}>Giám đốc duyệt đề xuất và nghiệm thu. Bạn nộp báo cáo + minh chứng ở tab “Tiến độ”.</div>}
    </Khoi>
  );

  return (
    <div style={{ ...card, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
        <span style={{ background: mau, color: "#fff", fontWeight: 800, borderRadius: 10, padding: "10px 12px" }}>{tc.ma}</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{tc.ten}</div>
          <div style={{ fontSize: 12.5, color: C.muted }}>{tc.nhom_nhan} · {so(tc.trong_so)} điểm tối đa · {tc.phu_trach || "—"}</div>
        </div>
        <Chip tt={tc.trang_thai} />
        <span style={{ fontSize: 12, border: `1px solid ${C.line}`, borderRadius: 9, padding: "4px 9px", color: C.red, whiteSpace: "nowrap" }}>
          Hạn hoàn thành<br /><b>{ngayVN(tc.han)} 23:59</b>
        </span>
        {suaDuoc ? <Nut onClick={() => { setTab("tong_quan"); setSua(true); }}>✎ Chỉnh sửa</Nut> : null}
      </div>
      {tc.ly_do_tra_ve && tc.trang_thai === "tra_ve" ? <div style={{ background: C.redSoft, color: C.red, borderRadius: 9, padding: "8px 12px", fontSize: 13 }}>Giám đốc trả về: {tc.ly_do_tra_ve}</div> : null}
      {tc.trang_thai === "can_bo_sung" && tc.nhan_xet ? <div style={{ background: C.redSoft, color: C.red, borderRadius: 9, padding: "8px 12px", fontSize: 13 }}>Cần bổ sung: {tc.nhan_xet}</div> : null}
      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.line}`, overflowX: "auto" }}>
        {TABS.map(([ma, ten]) => (
          <button key={ma} type="button" onClick={() => setTab(ma)} style={{ border: 0, background: "none", padding: "8px 12px", cursor: "pointer", whiteSpace: "nowrap",
            fontWeight: tab === ma ? 800 : 500, color: tab === ma ? C.orange : C.muted, borderBottom: tab === ma ? `2px solid ${C.orange}` : "2px solid transparent" }}>{ten}</button>
        ))}
      </div>

      {tab === "tong_quan" && suaDuoc && sua ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12.5, color: C.muted }}>Nhóm cố định; nội dung tiêu chí do quản lý đề xuất hằng tháng. Sửa rồi bấm Lưu; xong hết bấm “Gửi Giám đốc duyệt”.</div>
          <label style={{ display: "grid", gap: 4, fontSize: 12.5 }}>Tên tiêu chí<input style={o} value={f.ten} onChange={(e) => setF({ ...f, ten: e.target.value })} /></label>
          <label style={{ display: "grid", gap: 4, fontSize: 12.5 }}>Mục tiêu đăng ký (mỗi ý một dòng)<textarea rows={4} style={o} value={f.muc_tieu} onChange={(e) => setF({ ...f, muc_tieu: e.target.value })} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 }}>
            <label style={{ display: "grid", gap: 4, fontSize: 12.5 }}>Chỉ tiêu (số)<input style={o} value={f.chi_tieu} onChange={(e) => setF({ ...f, chi_tieu: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 4, fontSize: 12.5 }}>Đơn vị<input style={o} value={f.don_vi} onChange={(e) => setF({ ...f, don_vi: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 4, fontSize: 12.5 }}>Trọng số (điểm)<input style={o} value={f.trong_so} onChange={(e) => setF({ ...f, trong_so: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 4, fontSize: 12.5 }}>Hạn<input type="date" style={o} value={f.han || ""} onChange={(e) => setF({ ...f, han: e.target.value })} /></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: 10 }}>
            <label style={{ display: "grid", gap: 4, fontSize: 12.5 }}>Đo số đạt bằng
              <select style={o} value={f.nguon_do || ""} onChange={(e) => setF({ ...f, nguon_do: e.target.value })}>
                {NGUON.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
              </select>
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 12.5 }}>
              {f.nguon_do === "lop_du_buoi" ? "Số buổi tối thiểu / lớp" : f.nguon_do === "ket_qua_hoc_tap" ? "Ngưỡng điểm TB % (trống = mọi lớp có kết quả)" : "Tham số"}
              <input style={o} value={f.tham_so ?? ""} disabled={!["lop_du_buoi", "ket_qua_hoc_tap"].includes(f.nguon_do)}
                     onChange={(e) => setF({ ...f, tham_so: e.target.value })} />
            </label>
          </div>
          <label style={{ display: "grid", gap: 4, fontSize: 12.5 }}>Người chịu trách nhiệm<input style={o} value={f.phu_trach} onChange={(e) => setF({ ...f, phu_trach: e.target.value })} /></label>
          <label style={{ display: "grid", gap: 4, fontSize: 12.5 }}>Minh chứng bắt buộc<input style={o} value={f.minh_chung_yc} onChange={(e) => setF({ ...f, minh_chung_yc: e.target.value })} /></label>
          <label style={{ display: "grid", gap: 4, fontSize: 12.5 }}>Điều kiện nghiệm thu / cách tính<textarea rows={2} style={o} value={f.dieu_kien} onChange={(e) => setF({ ...f, dieu_kien: e.target.value })} /></label>
          <label style={{ display: "grid", gap: 4, fontSize: 12.5 }}>Ghi chú / giải trình<textarea rows={2} style={o} value={f.ghi_chu} onChange={(e) => setF({ ...f, ghi_chu: e.target.value })} /></label>
          <div style={{ display: "flex", gap: 8 }}>
            <Nut mau="cam" disabled={dang} onClick={luu}>Lưu</Nut>
            <Nut onClick={() => { setF({ ...tc }); setSua(false); }}>Huỷ</Nut>
            <Nut disabled={dang} style={{ marginLeft: "auto" }} onClick={() => window.confirm(`Xoá tiêu chí ${tc.ma}?`) && goi(() => apiClient.delete(`/thi-dua-ql/tieu-chi/${tc.id}/`))}>Xoá tiêu chí</Nut>
          </div>
        </div>
      ) : null}

      {tab === "tong_quan" && !(suaDuoc && sua) ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 12 }}>
          <Khoi tieuDe="Căn cứ từ khung thi đua">
            {hang("Kỳ áp dụng", `Tháng ${k.thang}/${k.nam}`)}
            {hang("Nhóm tiêu chí", tc.nhom_nhan)}
            {hang("Tiêu chí", tc.ten)}
            {hang("Cách tính", tc.dieu_kien)}
            {hang("Đo số đạt", tc.nguon_do ? `${tc.nguon_do_nhan}${tc.tham_so ? ` (tham số ${so(tc.tham_so)})` : ""}` : "Quản lý báo cáo tay")}
          </Khoi>
          <Khoi tieuDe={`Mục tiêu đăng ký tháng ${k.thang}/${k.nam}`}>
            {mucTieu.length ? <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 3, fontSize: 13 }}>{mucTieu.map((m, i) => <li key={i}>{m}</li>)}</ul>
              : <span style={{ fontSize: 13, color: C.muted }}>—</span>}
            <div style={{ fontSize: 12.5, color: C.muted }}>Chỉ tiêu: <b style={{ color: C.ink }}>{so(tc.chi_tieu)} {tc.don_vi}</b></div>
          </Khoi>
          {khoiTienDo}
          {khoiMoc}
          <Khoi tieuDe={`Minh chứng đã nộp (${tc.minh_chung.length})`} phai={baoCaoDuoc ? <button type="button" onClick={() => setTab("minh_chung")} style={{ border: 0, background: "none", color: C.orange, cursor: "pointer", fontSize: 12.5 }}>+ Thêm minh chứng</button> : null}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {tc.minh_chung.length ? tc.minh_chung.slice(0, 6).map((m) => anh(m)) : <span style={{ fontSize: 13, color: C.muted }}>Chưa có minh chứng.</span>}
            </div>
          </Khoi>
          {khoiDiem}
          <div style={{ gridColumn: "1 / -1" }}>{khoiDuyet}</div>
        </div>
      ) : null}

      {tab === "tien_do" ? (
        <div style={{ display: "grid", gap: 12 }}>
          {khoiTienDo}
          {tc.bao_cao ? <div style={{ fontSize: 13, background: C.bg, borderRadius: 9, padding: 10, whiteSpace: "pre-line" }}>
            <b>Báo cáo gần nhất</b> ({tc.bao_cao_luc ? new Date(tc.bao_cao_luc).toLocaleString("vi-VN") : ""}): {tc.bao_cao}</div> : null}
          {doTD && baoCaoDuoc ? <div style={{ fontSize: 12.5, color: C.muted }}>Số đạt của tiêu chí này hệ thống tự đo từ CRM (chốt hết ngày cuối tháng) — bạn chỉ cần ghi giải trình, nộp minh chứng rồi bấm “Nộp nghiệm thu”. Ô số đạt để trống cũng được.</div> : null}
          {baoCaoDuoc ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10 }}>
                <label style={{ display: "grid", gap: 4, fontSize: 12.5 }}>Số đã đạt ({tc.don_vi})<input style={o} value={bc.so_dat} onChange={(e) => setBc({ ...bc, so_dat: e.target.value })} /></label>
                <label style={{ display: "grid", gap: 4, fontSize: 12.5 }}>Nội dung báo cáo<textarea rows={2} style={o} value={bc.noi_dung} onChange={(e) => setBc({ ...bc, noi_dung: e.target.value })} /></label>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Nut disabled={dang} onClick={() => goi(() => apiClient.post(`/thi-dua-ql/tieu-chi/${tc.id}/bao_cao/`, { ...bc }))}>Lưu tiến độ</Nut>
                <Nut mau="cam" disabled={dang} onClick={() => goi(() => apiClient.post(`/thi-dua-ql/tieu-chi/${tc.id}/bao_cao/`, { ...bc, nop: true }), "Đã nộp Giám đốc nghiệm thu.")}>Nộp nghiệm thu</Nut>
              </div>
              <div style={{ borderTop: `1px dashed ${C.line}`, paddingTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                <label style={{ display: "grid", gap: 4, fontSize: 12.5 }}>Đề nghị gia hạn tới<input type="date" style={{ ...o, width: 170 }} value={gh.han_moi} onChange={(e) => setGh({ ...gh, han_moi: e.target.value })} /></label>
                <label style={{ display: "grid", gap: 4, fontSize: 12.5, flex: 1, minWidth: 200 }}>Lý do<input style={o} value={gh.ly_do} onChange={(e) => setGh({ ...gh, ly_do: e.target.value })} /></label>
                <Nut disabled={dang || !gh.han_moi || !gh.ly_do.trim()} onClick={() => goi(() => apiClient.post(`/thi-dua-ql/tieu-chi/${tc.id}/gia_han/`, gh))}>Gửi đề nghị</Nut>
              </div>
            </>
          ) : <div style={{ fontSize: 13, color: C.muted }}>{laChu ? "Tiêu chí cần được Giám đốc duyệt trước khi báo cáo tiến độ." : "Quản lý báo cáo tiến độ ở đây."}</div>}
        </div>
      ) : null}

      {tab === "noi_dung" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <Khoi tieuDe="Nội dung đăng ký">
            {hang("Mục tiêu", tc.muc_tieu)}
            {hang("Chỉ tiêu", `${so(tc.chi_tieu)} ${tc.don_vi}`)}
            {hang("Người phụ trách", tc.phu_trach)}
            {hang("Hạn", ngayVN(tc.han))}
            {hang("Minh chứng bắt buộc", tc.minh_chung_yc)}
            {hang("Cách tính / nghiệm thu", tc.dieu_kien)}
            {tc.ghi_chu ? hang("Ghi chú", tc.ghi_chu) : null}
            {tc.gia_han ? hang("Gia hạn", `${tc.gia_han === "cho" ? "chờ duyệt" : tc.gia_han === "duyet" ? "đã duyệt" : "từ chối"} → ${ngayVN(tc.han_de_xuat)} (${tc.ly_do_gia_han})`) : null}
          </Khoi>
          {khoiMoc}
        </div>
      ) : null}

      {tab === "minh_chung" ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12.5, color: C.muted }}>Bắt buộc: {tc.minh_chung_yc || "—"}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {tc.minh_chung.length ? tc.minh_chung.map((m) => (
              <div key={m.id} style={{ position: "relative" }}>
                {anh(m, 130, 98)}
                {baoCaoDuoc ? <button type="button" title="Xoá" onClick={() => goi(() => apiClient.post(`/thi-dua-ql/tieu-chi/${tc.id}/xoa_minh_chung/`, { mc: m.id }))}
                                     style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 10, border: 0, background: C.red, color: "#fff", cursor: "pointer" }}>×</button> : null}
              </div>
            )) : <span style={{ fontSize: 13, color: C.muted }}>Chưa có minh chứng.</span>}
          </div>
          {baoCaoDuoc ? (
            <div>
              <input ref={oFile} type="file" multiple hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                     onChange={(e) => {
                       const fd = new FormData();
                       Array.from(e.target.files || []).forEach((x) => fd.append("tep", x));
                       goi(() => apiClient.post(`/thi-dua-ql/tieu-chi/${tc.id}/minh_chung/`, fd, { timeout: 120000 }));
                       e.target.value = "";
                     }} />
              <Nut mau="cam" disabled={dang} onClick={() => oFile.current?.click()}>+ Thêm ảnh / file</Nut>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "duyet" ? <div style={{ display: "grid", gap: 12 }}>{khoiDiem}{khoiDuyet}</div> : null}

      {tab === "lich_su" ? (
        <div style={{ display: "grid", gap: 6 }}>
          {tc.lich_su.length ? tc.lich_su.map((h, i) => (
            <div key={i} style={{ fontSize: 13, borderLeft: `3px solid ${C.line}`, paddingLeft: 10 }}>
              <span style={{ color: C.muted }}>{new Date(h.luc).toLocaleString("vi-VN")} · {h.nguoi}</span><div>{h.noi_dung}</div>
            </div>
          )) : <span style={{ fontSize: 13, color: C.muted }}>Chưa có lịch sử.</span>}
        </div>
      ) : null}
    </div>
  );
}
