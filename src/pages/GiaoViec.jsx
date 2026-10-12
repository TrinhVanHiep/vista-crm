import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { VAI_QUAN_TRI } from "../auth/permissions";
import { Button, Card, Page, PageHeader } from "../ui";
import {
  listGiaoViec, listNguoiNhanViec, nopGiaoViec, taoGiaoViec, thaoTacGiaoViec,
} from "../services/calendarService";

/**
 * Giao việc (12/10/2026). Quản lý giao việc có hạn cho giáo viên / nhân sự. Người nhận
 * phải tự vào kiểm tra, làm và NỘP KẾT QUẢ KÈM MINH CHỨNG trước 24:00 ngày hạn; quá
 * hạn mà chưa nộp thì mỗi đêm tính 1 lỗi, trừ 1 điểm thi đua (tối đa 10/tháng). Hẹn
 * lại được một lần. Luật ở giasu_online/teaching/loi_nhiem_vu.py.
 */

const MAU_TT = {
  moi: ["#FFF4E0", "#B7791F"], da_nhan: ["#EEF2FB", "#1F3A93"], cho_duyet: ["#F3EFFF", "#6B46C1"],
  hoan_thanh: ["#E7F6EC", "#1E8E4F"], tra_lai: ["#FDECEA", "#C0392B"], huy: ["#F3EFEA", "#8a7a66"],
};
const ngayVN = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("vi-VN") : "");
const isoCach = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const loiApi = (e, md) => e?.response?.data?.detail || md;

function TheViec({ v, laNhan, laGiao, onDoi, onLoi }) {
  const [mo, setMo] = useState("");
  const [ketQua, setKetQua] = useState("");
  const [tep, setTep] = useState([]);
  const [hen, setHen] = useState({ ngay: isoCach(1), lyDo: "" });
  const [lyDoTra, setLyDoTra] = useState("");
  const [dang, setDang] = useState(false);
  const [nen, chu] = MAU_TT[v.trang_thai] || MAU_TT.moi;
  const conMo = !["cho_duyet", "hoan_thanh", "huy"].includes(v.trang_thai);

  const lam = async (fn) => {
    setDang(true);
    onLoi("");
    try {
      onDoi(await fn());
      setMo("");
    } catch (e) {
      onLoi(loiApi(e, "Không thực hiện được."));
    } finally {
      setDang(false);
    }
  };

  return (
    <Card>
      <div style={{ padding: "14px 16px", display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{v.tieu_de}</div>
            <div style={{ fontSize: 12.5, color: "#8a7a66", marginTop: 2 }}>
              {laNhan ? `Giao bởi ${v.nguoi_giao.ten}` : `Giao cho ${v.nguoi_nhan.ten}`}
              {" · "}Hạn 24:00 {ngayVN(v.han)}
              {v.han_hen ? ` → hẹn lại ${ngayVN(v.han_hen)} (${v.ly_do_hen})` : ""}
            </div>
          </div>
          <span style={{ background: nen, color: chu, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
            {v.trang_thai_nhan}
          </span>
          {v.so_loi ? <span style={{ color: "#C0392B", fontWeight: 800, fontSize: 12.5 }}>{v.so_loi} lỗi</span> : null}
          {v.qua_han ? <span style={{ color: "#C0392B", fontSize: 12.5 }}>Quá hạn — đang tính lỗi mỗi đêm</span> : null}
        </div>
        {v.mo_ta ? <div style={{ fontSize: 13.5, whiteSpace: "pre-wrap" }}>{v.mo_ta}</div> : null}
        {v.ly_do_tra_lai && v.trang_thai === "tra_lai" ? (
          <div style={{ fontSize: 13, color: "#C0392B" }}>Trả lại: {v.ly_do_tra_lai}</div>
        ) : null}
        {v.ket_qua || v.minh_chung.length ? (
          <div style={{ fontSize: 13, background: "#FBF7F2", borderRadius: 8, padding: "8px 10px" }}>
            {v.ket_qua ? <div><b>Kết quả:</b> {v.ket_qua}</div> : null}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              {v.minh_chung.map((m) => (
                <a key={m.id} href={m.url} target="_blank" rel="noreferrer">
                  {m.la_anh
                    ? <img src={m.url} alt={m.ten} style={{ width: 72, height: 54, objectFit: "cover", borderRadius: 6 }} />
                    : <span style={{ fontSize: 12.5 }}>📎 {m.ten}</span>}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {laNhan && v.trang_thai === "moi" ? (
            <Button variant="primary" disabled={dang} onClick={() => lam(() => thaoTacGiaoViec(v.id, "nhan"))}>Đã nhận việc</Button>
          ) : null}
          {laNhan && conMo ? <Button variant="primary" onClick={() => setMo(mo === "nop" ? "" : "nop")}>Nộp kết quả</Button> : null}
          {laNhan && conMo && !v.han_hen ? <Button onClick={() => setMo(mo === "hen" ? "" : "hen")}>Hẹn lại</Button> : null}
          {laGiao && v.trang_thai === "cho_duyet" ? (
            <>
              <Button variant="primary" disabled={dang} onClick={() => lam(() => thaoTacGiaoViec(v.id, "duyet", { quyet_dinh: "duyet" }))}>Duyệt</Button>
              <Button onClick={() => setMo(mo === "tra" ? "" : "tra")}>Trả lại</Button>
            </>
          ) : null}
          {laGiao && conMo ? (
            <Button disabled={dang} onClick={() => window.confirm("Huỷ việc này?") && lam(() => thaoTacGiaoViec(v.id, "huy"))}>Huỷ việc</Button>
          ) : null}
        </div>

        {mo === "nop" ? (
          <div style={{ display: "grid", gap: 8 }}>
            <textarea rows={3} placeholder="Kết quả đã làm" value={ketQua} onChange={(e) => setKetQua(e.target.value)} />
            <label style={{ fontSize: 13 }}>
              Minh chứng (ảnh / file) <span style={{ color: "#C0392B" }}>* bắt buộc</span>{" "}
              <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={(e) => setTep(e.target.files)} />
            </label>
            <div>
              <Button variant="primary" disabled={dang || !tep.length}
                      onClick={() => lam(() => nopGiaoViec(v.id, { ketQua, tep }))}>
                {dang ? "Đang nộp…" : "Nộp kết quả"}
              </Button>
            </div>
          </div>
        ) : null}
        {mo === "hen" ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input type="date" value={hen.ngay} min={isoCach(0)} max={isoCach(7)} onChange={(e) => setHen((h) => ({ ...h, ngay: e.target.value }))} />
            <input type="text" placeholder="Lý do (bắt buộc)" value={hen.lyDo} style={{ flex: 1, minWidth: 180 }}
                   onChange={(e) => setHen((h) => ({ ...h, lyDo: e.target.value }))} />
            <Button variant="primary" disabled={dang || !hen.lyDo.trim()}
                    onClick={() => lam(() => thaoTacGiaoViec(v.id, "hen-lai", { han_moi: hen.ngay, ly_do: hen.lyDo }))}>
              Lưu hẹn
            </Button>
            <span style={{ fontSize: 12, color: "#8a7a66" }}>Mỗi việc chỉ hẹn lại một lần, tối đa 7 ngày.</span>
          </div>
        ) : null}
        {mo === "tra" ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input type="text" placeholder="Lý do trả lại (bắt buộc)" value={lyDoTra} style={{ flex: 1, minWidth: 220 }}
                   onChange={(e) => setLyDoTra(e.target.value)} />
            <Button variant="primary" disabled={dang || !lyDoTra.trim()}
                    onClick={() => lam(() => thaoTacGiaoViec(v.id, "duyet", { quyet_dinh: "tra_lai", ly_do: lyDoTra }))}>
              Trả lại
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export default function GiaoViec() {
  const { role, user } = useAuth();
  const laQuanLy = VAI_QUAN_TRI.includes(role);
  const [thamSo, setThamSo] = useSearchParams();
  const tab = thamSo.get("tab") || (laQuanLy ? "toi_giao" : "cua_toi");
  const [ds, setDs] = useState([]);
  const [nguoi, setNguoi] = useState([]);
  const [form, setForm] = useState({ tieu_de: "", mo_ta: "", nguoi_nhan: "", han: isoCach(1) });
  const [loi, setLoi] = useState("");
  const [tb, setTb] = useState("");
  const [dang, setDang] = useState(false);

  const tai = useCallback(() => {
    listGiaoViec(tab).then(setDs).catch((e) => setLoi(loiApi(e, "Không tải được danh sách việc.")));
  }, [tab]);
  useEffect(() => { tai(); }, [tai]);
  useEffect(() => { if (laQuanLy) listNguoiNhanViec().then(setNguoi).catch(() => {}); }, [laQuanLy]);

  const giao = async () => {
    setDang(true);
    setLoi("");
    try {
      const v = await taoGiaoViec({ ...form, nguoi_nhan: Number(form.nguoi_nhan) });
      setTb(`Đã giao “${v.tieu_de}” cho ${v.nguoi_nhan.ten}.`);
      setForm({ tieu_de: "", mo_ta: "", nguoi_nhan: "", han: isoCach(1) });
      if (tab === "toi_giao") setDs((d) => [v, ...d]);
    } catch (e) {
      setLoi(loiApi(e, "Không giao được việc."));
    } finally {
      setDang(false);
    }
  };

  const conMo = ds.filter((v) => !["hoan_thanh", "huy"].includes(v.trang_thai));
  const daXong = ds.filter((v) => ["hoan_thanh", "huy"].includes(v.trang_thai));
  const doiTab = (t) => setThamSo((p) => { const n = new URLSearchParams(p); n.set("tab", t); return n; });

  return (
    <Page className="v4page">
      <PageHeader
        crumbs={[{ label: "Tổng quan", to: "/" }, { label: "Giao việc" }]}
        title="Giao việc"
        description="Việc có hạn: nộp kết quả kèm minh chứng trước 24:00 ngày hạn — quá hạn mỗi đêm 1 lỗi, trừ 1 điểm thi đua"
      />
      {tb ? <div className="alert green" style={{ marginBottom: 12 }}><span>✅</span><div style={{ flex: 1 }}>{tb}</div></div> : null}
      {loi ? <div className="alert red" style={{ marginBottom: 12 }}><span>⚠️</span><div style={{ flex: 1 }}>{loi}</div></div> : null}

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <Button variant={tab === "cua_toi" ? "primary" : undefined} onClick={() => doiTab("cua_toi")}>Việc của tôi</Button>
        {laQuanLy ? <Button variant={tab === "toi_giao" ? "primary" : undefined} onClick={() => doiTab("toi_giao")}>Việc tôi giao</Button> : null}
      </div>

      {laQuanLy && tab === "toi_giao" ? (
        <Card title="Giao việc mới">
          <div style={{ padding: "4px 16px 16px", display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <input placeholder="Tên việc *" value={form.tieu_de} onChange={(e) => setForm((f) => ({ ...f, tieu_de: e.target.value }))} />
            <select value={form.nguoi_nhan} onChange={(e) => setForm((f) => ({ ...f, nguoi_nhan: e.target.value }))}>
              <option value="">— Người nhận * —</option>
              {nguoi.map((n) => <option key={n.id} value={n.id}>{n.ten}</option>)}
            </select>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
              Hạn (24:00)
              <input type="date" value={form.han} min={isoCach(0)} onChange={(e) => setForm((f) => ({ ...f, han: e.target.value }))} />
            </label>
            <textarea rows={2} placeholder="Mô tả, yêu cầu minh chứng…" value={form.mo_ta} style={{ gridColumn: "1 / -1" }}
                      onChange={(e) => setForm((f) => ({ ...f, mo_ta: e.target.value }))} />
            <div>
              <Button variant="primary" disabled={dang || !form.tieu_de.trim() || !form.nguoi_nhan || !form.han} onClick={giao}>
                Giao việc
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {!conMo.length ? <p className="muted">Không có việc nào đang mở.</p> : null}
        {conMo.map((v) => (
          <TheViec key={v.id} v={v} laNhan={v.nguoi_nhan.id === user?.id} laGiao={v.nguoi_giao.id === user?.id || (laQuanLy && v.nguoi_nhan.id !== user?.id)}
                   onDoi={(m) => setDs((d) => d.map((x) => (x.id === m.id ? m : x)))} onLoi={setLoi} />
        ))}
      </div>
      {daXong.length ? (
        <details style={{ marginTop: 16 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>Đã xong / đã huỷ ({daXong.length})</summary>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {daXong.map((v) => (
              <TheViec key={v.id} v={v} laNhan={v.nguoi_nhan.id === user?.id} laGiao={false} onDoi={() => {}} onLoi={setLoi} />
            ))}
          </div>
        </details>
      ) : null}
    </Page>
  );
}
