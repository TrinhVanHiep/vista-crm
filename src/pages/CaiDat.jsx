import { useEffect, useMemo, useState } from "react";
import apiClient from "../services/apiClient";
import { Badge, Button, Card, Page, PageHeader } from "../ui";
import { napCaiDat } from "../utils/caiDat";

/**
 * Cài đặt hệ thống (13/11/2026, hồ sơ .bdt/work/CAI-DAT) — chủ TT tự chỉnh luật vận hành:
 * Thời gian · Phân quyền & giao việc · Tính năng · Lịch sử. Chỉ Super admin sửa; quản trị khác xem.
 * Danh mục, kiểu, khoảng giá trị, mặc định đều do máy chủ trả (cai_dat/dinh_nghia.py).
 */
const TABS = [
  ["thoi_gian", "Thời gian"],
  ["quyen", "Phân quyền & giao việc"],
  ["tinh_nang", "Tính năng"],
  ["lich_su", "Lịch sử thay đổi"],
];

const loiApi = (e, macDinh) => {
  const d = e?.response?.data;
  if (d && typeof d === "object") {
    const v = d.detail || Object.values(d)[0];
    return Array.isArray(v) ? v[0] : String(v || macDinh);
  }
  return macDinh;
};

const bang = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hienGiaTri = (d, v, tenVai) => {
  if (v === null || v === undefined) return "—";
  if (d?.kieu === "bat_tat" || typeof v === "boolean") return v ? "Bật" : "Tắt";
  if (Array.isArray(v)) {
    if (d?.kieu === "chon_nhieu") return v.map((x) => (d.lua_chon.find((l) => l[0] === x) || [x, x])[1]).join(", ") || "(không mục nào)";
    return v.map((x) => tenVai[x] || x).join(", ") || "(chỉ Super admin)";
  }
  if (typeof v === "object") return `${v.ten || ""}: ${v.co ? "có quyền" : "không"}`;
  return `${v}${d?.don_vi ? ` ${d.don_vi}` : ""}`;
};

function nhomTheoMuc(ds) {
  const ra = [];
  ds.forEach((d) => {
    let n = ra.find((x) => x.muc === d.muc);
    if (!n) { n = { muc: d.muc, ds: [] }; ra.push(n); }
    n.ds.push(d);
  });
  return ra;
}

function DongCaiDat({ d, giaTri, doi, duocSua, onDoi }) {
  const daSua = !bang(giaTri, d.mac_dinh);
  let o;
  if (d.kieu === "so") {
    o = (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <input type="number" min={d.min} max={d.max} value={giaTri ?? ""} disabled={!duocSua}
               aria-label={d.ten}
               onChange={(e) => onDoi(d.khoa, e.target.value === "" ? "" : Number(e.target.value))}
               style={{ width: 92, minHeight: 38 }} />
        {d.don_vi ? <span style={{ color: "#5B616B" }}>{d.don_vi}</span> : null}
      </span>
    );
  } else if (d.kieu === "bat_tat") {
    o = (
      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: duocSua ? "pointer" : "default" }}>
        <input type="checkbox" checked={!!giaTri} disabled={!duocSua} onChange={(e) => onDoi(d.khoa, e.target.checked)}
               style={{ width: 18, height: 18 }} />
        <b style={{ color: giaTri ? "#178A4C" : "#8a7a66" }}>{giaTri ? "Bật" : "Tắt"}</b>
      </label>
    );
  } else if (d.kieu === "chon_nhieu") {
    o = (
      <span style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {d.lua_chon.map(([ma, ten]) => (
          <label key={ma} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={(giaTri || []).includes(ma)} disabled={!duocSua}
                   onChange={(e) => onDoi(d.khoa, e.target.checked ? [...(giaTri || []), ma] : (giaTri || []).filter((x) => x !== ma))} />
            {ten}
          </label>
        ))}
      </span>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "6px 16px", padding: "12px 0",
                  borderTop: "1px solid #f0e8dc", alignItems: "center" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>
          {d.ten} {doi ? <Badge tone="orange">Chưa lưu</Badge> : daSua ? <Badge tone="blue">Đã chỉnh</Badge> : null}
        </div>
        <div style={{ fontSize: 13, color: "#5B616B", marginTop: 2 }}>{d.mo_ta}</div>
        <div style={{ fontSize: 12, color: "#8a7a66", marginTop: 2 }}>
          Mặc định: {hienGiaTri(d, d.mac_dinh, {})}
          {d.sua_boi ? ` · sửa bởi ${d.sua_boi}` : ""}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {o}
        {duocSua && daSua ? (
          <Button variant="ghost" size="sm" onClick={() => onDoi(d.khoa, d.mac_dinh)} title="Trả về giá trị mặc định">Về mặc định</Button>
        ) : null}
      </div>
    </div>
  );
}

const TH_VAI = { padding: "8px 4px", borderBottom: "2px solid #eadfce", width: 84, fontSize: 12, lineHeight: 1.3,
                 verticalAlign: "bottom", textAlign: "center" };

function BangQuyen({ ds, vai, nhap, duocSua, onDoi }) {
  const cot = vai.filter((v) => v.ten !== "superadmin");
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 300 + (cot.length + 1) * 84, fontSize: 13.5 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "2px solid #eadfce", width: 300 }}>Quyền / việc</th>
            <th style={{ ...TH_VAI }} title="Luôn có mọi quyền">Super admin</th>
            {cot.map((v) => (
              <th key={v.ten} style={TH_VAI}>{v.hien_thi}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {nhomTheoMuc(ds).map((n) => [
            <tr key={`m-${n.muc}`}>
              <td colSpan={cot.length + 2} style={{ padding: "12px 6px 4px", fontWeight: 700, color: "#B7791F" }}>{n.muc}</td>
            </tr>,
            ...n.ds.map((d) => {
              const gt = nhap[d.khoa] ?? d.gia_tri;
              const doi = d.khoa in nhap && !bang(nhap[d.khoa], d.gia_tri);
              return (
                <tr key={d.khoa} style={{ borderTop: "1px solid #f0e8dc", background: doi ? "#FFF7EC" : undefined }}>
                  <td style={{ padding: "8px 6px" }}>
                    <div style={{ fontWeight: 600 }}>{d.ten}</div>
                    <div style={{ fontSize: 12, color: "#5B616B" }}>{d.mo_ta}</div>
                  </td>
                  <td style={{ textAlign: "center" }}><input type="checkbox" checked disabled aria-label={`${d.ten} — Super admin`} /></td>
                  {cot.map((v) => (
                    <td key={v.ten} style={{ textAlign: "center" }}>
                      <input type="checkbox" checked={gt.includes(v.ten)} disabled={!duocSua}
                             aria-label={`${d.ten} — ${v.hien_thi}`}
                             onChange={(e) => onDoi(d.khoa, e.target.checked ? [...gt, v.ten] : gt.filter((x) => x !== v.ten))} />
                    </td>
                  ))}
                </tr>
              );
            }),
          ])}
        </tbody>
      </table>
    </div>
  );
}

function QuyenRieng({ duocSua }) {
  const [du, setDu] = useState(null);
  const [loi, setLoi] = useState("");
  const [tim, setTim] = useState("");
  useEffect(() => {
    apiClient.get("/cai-dat/quyen-rieng/").then(({ data }) => setDu(data)).catch((e) => setLoi(loiApi(e, "Không tải được danh sách.")));
  }, []);
  const doi = async (u, nhom, bat) => {
    setLoi("");
    try {
      const { data } = await apiClient.post("/cai-dat/quyen-rieng/", { user_id: u.id, nhom, bat });
      setDu((d) => ({ ...d, nhan_su: d.nhan_su.map((x) => (x.id === u.id ? { ...x, nhom: data.nhom } : x)) }));
    } catch (e) {
      setLoi(loiApi(e, "Không lưu được."));
    }
  };
  const ds = (du?.nhan_su || []).filter((u) => !tim.trim() || `${u.ten} ${u.vai}`.toLowerCase().includes(tim.trim().toLowerCase()));
  return (
    <Card title="Quyền riêng từng người">
      <p style={{ marginTop: 0, color: "#5B616B", fontSize: 13.5 }}>
        Cấp thêm cho một người cụ thể mà không mở cho cả vai. Có hiệu lực khi người đó tải lại trang.
      </p>
      {du ? (
        <>
          <input type="search" placeholder="Tìm nhân sự…" value={tim} onChange={(e) => setTim(e.target.value)}
                 style={{ minHeight: 38, width: "100%", maxWidth: 320, marginBottom: 10 }} />
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 520, fontSize: 13.5 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "6px", borderBottom: "2px solid #eadfce" }}>Nhân sự</th>
                  {du.nhom.map((n) => (
                    <th key={n.ma} style={{ padding: "6px", borderBottom: "2px solid #eadfce" }} title={n.ten}>{n.ten.split(" (")[0]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ds.map((u) => (
                  <tr key={u.id} style={{ borderTop: "1px solid #f0e8dc" }}>
                    <td style={{ padding: "6px" }}>{u.ten} <span style={{ color: "#8a7a66", fontSize: 12 }}>· {u.vai}</span></td>
                    {du.nhom.map((n) => (
                      <td key={n.ma} style={{ textAlign: "center" }}>
                        <input type="checkbox" checked={u.nhom.includes(n.ma)} disabled={!duocSua}
                               aria-label={`${n.ten} — ${u.ten}`} onChange={(e) => doi(u, n.ma, e.target.checked)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul style={{ fontSize: 12.5, color: "#5B616B", paddingLeft: 18 }}>
            {du.nhom.map((n) => <li key={n.ma}>{n.ten}</li>)}
          </ul>
        </>
      ) : <div style={{ color: "#5B616B" }}>{loi || "Đang tải…"}</div>}
      {du && loi ? <div style={{ color: "#B91C1C" }}>{loi}</div> : null}
    </Card>
  );
}

function LichSu({ tenVai, theoKhoa }) {
  const [ds, setDs] = useState(null);
  const [loi, setLoi] = useState("");
  useEffect(() => {
    apiClient.get("/cai-dat/lich-su/").then(({ data }) => setDs(data)).catch((e) => setLoi(loiApi(e, "Không tải được lịch sử.")));
  }, []);
  if (!ds) return <Card><div style={{ color: "#5B616B" }}>{loi || "Đang tải…"}</div></Card>;
  return (
    <Card title="Lịch sử thay đổi">
      {ds.length ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560, fontSize: 13.5 }}>
            <thead>
              <tr>
                {["Lúc", "Người đổi", "Mục", "Cũ", "Mới"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: 6, borderBottom: "2px solid #eadfce" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ds.map((x) => (
                <tr key={x.id} style={{ borderTop: "1px solid #f0e8dc" }}>
                  <td style={{ padding: 6, whiteSpace: "nowrap" }}>{new Date(x.luc).toLocaleString("vi-VN")}</td>
                  <td style={{ padding: 6 }}>{x.nguoi}</td>
                  <td style={{ padding: 6 }}>{x.ten}</td>
                  <td style={{ padding: 6, color: "#8a7a66" }}>{hienGiaTri(theoKhoa[x.khoa], x.cu, tenVai)}</td>
                  <td style={{ padding: 6, fontWeight: 600 }}>{hienGiaTri(theoKhoa[x.khoa], x.moi, tenVai)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div style={{ color: "#5B616B" }}>Chưa có thay đổi nào — hệ thống đang chạy theo mặc định.</div>}
    </Card>
  );
}

export default function CaiDat() {
  const [tab, setTab] = useState("thoi_gian");
  const [du, setDu] = useState(null);
  const [nhap, setNhap] = useState({});
  const [loi, setLoi] = useState("");
  const [bao, setBao] = useState("");
  const [dangLuu, setDangLuu] = useState(false);

  const tai = () => apiClient.get("/cai-dat/")
    .then(({ data }) => { setDu(data); setNhap({}); })
    .catch((e) => setLoi(loiApi(e, "Không tải được cài đặt.")));
  useEffect(() => { tai(); }, []);

  const theoKhoa = useMemo(() => Object.fromEntries((du?.danh_muc || []).map((d) => [d.khoa, d])), [du]);
  const tenVai = useMemo(() => Object.fromEntries((du?.vai || []).map((v) => [v.ten, v.hien_thi])), [du]);
  const doi = Object.keys(nhap).filter((k) => theoKhoa[k] && !bang(nhap[k], theoKhoa[k].gia_tri));
  const duocSua = !!du?.duoc_sua;

  const onDoi = (khoa, v) => { setBao(""); setLoi(""); setNhap((n) => ({ ...n, [khoa]: v })); };

  const luu = async () => {
    const goi = {};
    doi.forEach((k) => {
      const d = theoKhoa[k];
      goi[k] = bang(nhap[k], d.mac_dinh) && d.kieu !== "vai" ? null : nhap[k];
    });
    if (!window.confirm(`Lưu ${doi.length} thay đổi?\n\n${doi.map((k) => `• ${theoKhoa[k].ten}: ${hienGiaTri(theoKhoa[k], theoKhoa[k].gia_tri, tenVai)} → ${hienGiaTri(theoKhoa[k], nhap[k], tenVai)}`).join("\n")}\n\nÁp dụng ngay cho mọi người (chỉ từ lúc lưu trở đi, không tính lại quá khứ).`)) return;
    setDangLuu(true);
    setLoi("");
    try {
      await apiClient.put("/cai-dat/", goi);
      await tai();
      await napCaiDat(true);
      setBao(`Đã lưu ${doi.length} thay đổi. Mọi người thấy hiệu lực khi tải lại trang.`);
    } catch (e) {
      setLoi(loiApi(e, "Không lưu được cài đặt."));
    } finally {
      setDangLuu(false);
    }
  };

  const ds = (du?.danh_muc || []).filter((d) => d.nhom === tab);
  return (
    <Page className="v4page">
      <PageHeader
        crumbs={[{ label: "Tổng quan", to: "/" }, { label: "Cài đặt hệ thống" }]}
        title="Cài đặt hệ thống"
        description="Mốc thời gian, phân quyền và giao việc, bật / tắt tính năng — áp dụng cho toàn trung tâm."
      />
      {du && !duocSua ? (
        <div style={{ background: "#eef2fb", color: "#2F5DB8", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13.5 }}>
          Bạn đang xem. Chỉ chủ trung tâm (Super admin) được sửa cài đặt.
        </div>
      ) : null}
      <div role="tablist" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {TABS.map(([k, ten]) => (
          <Button key={k} role="tab" aria-selected={tab === k} variant={tab === k ? "primary" : "ghost"} onClick={() => setTab(k)}>{ten}</Button>
        ))}
      </div>
      {!du ? <Card><div style={{ color: loi ? "#B91C1C" : "#5B616B" }}>{loi || "Đang tải…"}</div></Card> : null}
      {du && tab === "lich_su" ? <LichSu tenVai={tenVai} theoKhoa={theoKhoa} /> : null}
      {du && tab === "quyen" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card title="Quyền theo vai">
            <p style={{ marginTop: 0, color: "#5B616B", fontSize: 13.5 }}>
              Tích vai nào thì vai đó có quyền / phụ trách việc đó. Mục “Giao việc”: vai được tích nhận thông báo, popup
              nhắc và chịu điểm thi đua quản lý của loại việc đó. Luật “không ai tự duyệt việc của mình” luôn áp dụng.
            </p>
            <BangQuyen ds={ds} vai={du.vai || []} nhap={nhap} duocSua={duocSua} onDoi={onDoi} />
          </Card>
          <QuyenRieng duocSua={duocSua} />
        </div>
      ) : null}
      {du && (tab === "thoi_gian" || tab === "tinh_nang") ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {nhomTheoMuc(ds).map((n) => (
            <Card key={n.muc} title={n.muc}>
              {n.ds.map((d) => (
                <DongCaiDat key={d.khoa} d={d} giaTri={nhap[d.khoa] ?? d.gia_tri} duocSua={duocSua}
                            doi={d.khoa in nhap && !bang(nhap[d.khoa], d.gia_tri)} onDoi={onDoi} />
              ))}
            </Card>
          ))}
        </div>
      ) : null}
      {duocSua && tab !== "lich_su" && (doi.length || loi || bao) ? (
        <div style={{ position: "sticky", bottom: 0, background: "#fffaf3", borderTop: "1px solid #eadfce", padding: "12px 0",
                      marginTop: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", zIndex: 5 }}>
          {doi.length ? <b>{doi.length} thay đổi chưa lưu</b> : null}
          {doi.length ? (
            <>
              <Button variant="primary" disabled={dangLuu} onClick={luu}>{dangLuu ? "Đang lưu…" : "Lưu thay đổi"}</Button>
              <Button variant="ghost" disabled={dangLuu} onClick={() => { setNhap({}); setLoi(""); }}>Huỷ</Button>
            </>
          ) : null}
          {loi ? <span style={{ color: "#B91C1C" }}>{loi}</span> : null}
          {bao ? <span style={{ color: "#178A4C" }}>{bao}</span> : null}
        </div>
      ) : null}
    </Page>
  );
}
