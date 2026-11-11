import { useCallback, useEffect, useState } from "react";
import apiClient from "../../services/apiClient";
import { dinhDangTien, layDanhSachQuy, loiApi } from "../../services/financeService";
import { THU, khoaNgay } from "../../utils/khoangThoiGian";
import { Button, Card, Drawer, Field, Input, NoteStrip, Pill } from "./v3/ui";
import { color, radius } from "./v3/theme";

/**
 * Đối soát THU CHI theo ngày (11/11/2026, chủ TT).
 *
 * THU lấy thẳng từ phiếu thu học phí: mỗi lần thu một dòng, tiền tách theo loại khoản
 * đã phân bổ (Học phí / Quỹ lớp / Apps / Tài liệu / Cọc / Khác) — không nhập lại.
 * CHI: mỗi dòng "Chi" trên sổ; ghi mới ở đây kèm loại chi + minh chứng.
 * Số do máy chủ tính: giasu_online/finances/doi_soat_thu_chi.py.
 */

const URL_API = "/finances/doi-soat-thu-chi/";
const d = (v) => (Number(v) ? dinhDangTien(Math.round(Number(v))) : "");
const dd = (v) => `${dinhDangTien(Math.round(Number(v || 0)))} đ`;
const so = (s) => Number(String(s || "").replace(/[^0-9]/g, "")) || 0;
const ngayVN = (iso) => String(iso || "").slice(0, 10).split("-").reverse().join("/");
const thuTrongTuan = (iso) => THU[new Date(`${iso}T00:00:00`).getDay()];

const th = {
  padding: "9px 10px", fontSize: 12, fontWeight: 600, color: color.muted, whiteSpace: "nowrap",
  borderBottom: "1px solid " + color.border, background: color.subtle, textAlign: "left",
};
const td = { padding: "9px 10px", fontSize: 13, borderBottom: "1px solid " + color.border, verticalAlign: "top" };
const tdSo = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };

function MinhChung({ url }) {
  if (!url) return <Pill tone="amber">Chưa có</Pill>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
       style={{ color: color.orange, fontWeight: 600, whiteSpace: "nowrap" }}>📎 Xem</a>
  );
}

function O({ nhan, gt, phu, tone }) {
  return (
    <div style={{ background: color.subtle, borderRadius: radius.md, padding: "12px 14px" }}>
      <div style={{ fontSize: 12, color: color.muted }}>{nhan}</div>
      <div style={{ fontSize: 19, fontWeight: 800, margin: "4px 0 2px", color: tone || color.ink }}>{gt}</div>
      {phu ? <div style={{ fontSize: 12, color: color.faint }}>{phu}</div> : null}
    </div>
  );
}

function BangThu({ nhom, cot }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
        <thead>
          <tr>
            <th style={th}>STT</th>
            <th style={th}>Nội dung thu</th>
            <th style={th}>Học sinh</th>
            <th style={th}>Lớp</th>
            {cot.map((c) => <th key={c.ma} style={{ ...th, textAlign: "right" }}>{c.ten}</th>)}
            <th style={{ ...th, textAlign: "right" }}>Chưa phân bổ</th>
            <th style={{ ...th, textAlign: "right" }}>Tổng</th>
            <th style={th}>Hình thức</th>
            <th style={th}>Người thu</th>
            <th style={th}>Minh chứng</th>
          </tr>
        </thead>
        <tbody>
          {nhom.thu.map((x) => (
            <tr key={`${x.nguon}-${x.id}`}>
              <td style={td}>{x.stt}</td>
              <td style={td}>
                {x.noi_dung}
                {x.tham_chieu ? <div style={{ fontSize: 11.5, color: color.faint }}>{x.tham_chieu}</div> : null}
              </td>
              <td style={td}>{x.hoc_sinh || "—"}</td>
              <td style={td}>{x.lop || "—"}</td>
              {cot.map((c) => <td key={c.ma} style={tdSo}>{d(x[c.ma])}</td>)}
              <td style={{ ...tdSo, color: Number(x.chua_phan_bo) ? color.amber : undefined }}>{d(x.chua_phan_bo)}</td>
              <td style={{ ...tdSo, fontWeight: 700 }}>{d(x.tong)}</td>
              <td style={td}>{x.hinh_thuc}</td>
              <td style={td}>{x.nguoi_thu || "—"}</td>
              <td style={td}>{x.nguon === "so_tay" ? <span style={{ color: color.faint }}>Ghi tay</span> : <MinhChung url={x.minh_chung} />}</td>
            </tr>
          ))}
          <tr style={{ background: "#FBF7F2" }}>
            <td style={{ ...td, fontWeight: 700 }} colSpan={4}>Cộng thu ngày</td>
            {cot.map((c) => <td key={c.ma} style={{ ...tdSo, fontWeight: 700 }}>{d(nhom.cong_thu[c.ma])}</td>)}
            <td style={{ ...tdSo, fontWeight: 700 }}>{d(nhom.cong_thu.chua_phan_bo)}</td>
            <td style={{ ...tdSo, fontWeight: 800, color: color.green }}>{d(nhom.cong_thu.tong)}</td>
            <td style={td} colSpan={3} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function BangChi({ nhom, laQuanTri, onXoa }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
        <thead>
          <tr>
            <th style={th}>STT</th>
            <th style={th}>Nội dung chi</th>
            <th style={th}>Loại chi</th>
            <th style={{ ...th, textAlign: "right" }}>Số tiền</th>
            <th style={th}>Quỹ</th>
            <th style={th}>Người chi</th>
            <th style={th}>Minh chứng</th>
            {laQuanTri ? <th style={th} /> : null}
          </tr>
        </thead>
        <tbody>
          {nhom.chi.map((x) => (
            <tr key={x.giao_dich}>
              <td style={td}>{x.stt}</td>
              <td style={td}>
                {x.noi_dung}
                <div style={{ fontSize: 11.5, color: color.faint }}>{x.ma_gd}</div>
              </td>
              <td style={td}>{x.loai_ten}</td>
              <td style={{ ...tdSo, fontWeight: 700 }}>{d(x.so_tien)}</td>
              <td style={td}>{x.quy}</td>
              <td style={td}>{x.nguoi_chi || "—"}</td>
              <td style={td}>{x.id ? <MinhChung url={x.minh_chung} /> : <span style={{ color: color.faint }}>Ghi trên sổ</span>}</td>
              {laQuanTri ? (
                <td style={td}>
                  {x.id ? (
                    <button type="button" onClick={() => onXoa(x)} title="Xoá khoản chi ghi nhầm"
                            style={{ background: "none", border: 0, color: color.red, cursor: "pointer", fontWeight: 600 }}>
                      🗑 Xoá
                    </button>
                  ) : null}
                </td>
              ) : null}
            </tr>
          ))}
          <tr style={{ background: "#FBF7F2" }}>
            <td style={{ ...td, fontWeight: 700 }} colSpan={3}>Cộng chi ngày</td>
            <td style={{ ...tdSo, fontWeight: 800, color: color.red }}>{d(nhom.tong_chi)}</td>
            <td style={td} colSpan={laQuanTri ? 4 : 3} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function NganKeoGhiChi({ loaiChi, onDong, onXong }) {
  const [dsQuy, setDsQuy] = useState([]);
  const [ngay, setNgay] = useState(khoaNgay(new Date()));
  const [loai, setLoai] = useState("khac");
  const [noiDung, setNoiDung] = useState("");
  const [soTien, setSoTien] = useState("");
  const [quy, setQuy] = useState("");
  const [nguoiChi, setNguoiChi] = useState("");
  const [tep, setTep] = useState(null);
  const [anhXem, setAnhXem] = useState("");
  const [loi, setLoi] = useState("");
  const [dangLuu, setDangLuu] = useState(false);

  useEffect(() => {
    layDanhSachQuy()
      .then((ds) => { setDsQuy(ds); if (ds[0]) setQuy(String(ds[0].id)); })
      .catch((e) => setLoi(loiApi(e, "Không tải được danh sách quỹ.")));
  }, []);

  useEffect(() => {
    if (!tep || !String(tep.type).startsWith("image/")) { setAnhXem(""); return undefined; }
    const u = URL.createObjectURL(tep);
    setAnhXem(u);
    return () => URL.revokeObjectURL(u);
  }, [tep]);

  const luu = async () => {
    setLoi("");
    if (!noiDung.trim()) { setLoi("Chưa ghi nội dung chi."); return; }
    if (!(so(soTien) > 0)) { setLoi("Số tiền chi phải lớn hơn 0."); return; }
    if (!quy) { setLoi("Chưa chọn quỹ / tài khoản chi."); return; }
    const f = new FormData();
    f.append("ngay", ngay);
    f.append("loai", loai);
    f.append("noi_dung", noiDung.trim());
    f.append("amount", String(so(soTien)));
    f.append("account", quy);
    f.append("nguoi_chi", nguoiChi.trim());
    if (tep) f.append("chung_tu", tep);
    setDangLuu(true);
    try {
      await apiClient.post(`${URL_API}khoan-chi/`, f, { timeout: 60000 });
      onXong(`Đã ghi khoản chi ${dd(so(soTien))} — ${noiDung.trim()}.`, ngay);
    } catch (e) {
      setLoi(loiApi(e, "Không ghi được khoản chi."));
    } finally {
      setDangLuu(false);
    }
  };

  const oChon = {
    width: "100%", background: "#fff", border: "1px solid " + color.borderStrong,
    borderRadius: radius.md, padding: "11px 12px", fontSize: 13.5, cursor: "pointer",
  };
  return (
    <Drawer
      title="Ghi khoản chi"
      sub="Mỗi khoản chi ghi một dòng Chi trên sổ giao dịch, trừ vào số dư quỹ đã chọn."
      onClose={onDong}
      footer={(
        <>
          <Button variant="ghost" onClick={onDong}>Hủy</Button>
          <Button onClick={luu} disabled={dangLuu}>{dangLuu ? "Đang ghi..." : "Ghi khoản chi"}</Button>
        </>
      )}
    >
      {loi ? (
        <div style={{ background: color.redSoft, color: color.red, borderRadius: radius.md, padding: "11px 13px",
                      fontSize: 13, marginBottom: 16 }}>{loi}</div>
      ) : null}
      <div style={{ display: "grid", gap: 14, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Ngày chi"><Input type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} /></Field>
          <Field label="Loại chi">
            <select style={oChon} value={loai} onChange={(e) => setLoai(e.target.value)}>
              {loaiChi.map((x) => <option key={x.ma} value={x.ma}>{x.ten}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Nội dung chi">
          <Input value={noiDung} onChange={(e) => setNoiDung(e.target.value)} placeholder="Ví dụ: Tiền điện tháng 11" />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Số tiền">
            <Input inputMode="numeric" value={soTien ? dinhDangTien(so(soTien)) : ""}
                   onChange={(e) => setSoTien(e.target.value.replace(/[^0-9]/g, ""))}
                   style={{ textAlign: "right", fontWeight: 700 }} />
          </Field>
          <Field label="Chi từ quỹ / tài khoản">
            <select style={oChon} value={quy} onChange={(e) => setQuy(e.target.value)}>
              {dsQuy.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Người chi / người nhận tiền">
          <Input value={nguoiChi} onChange={(e) => setNguoiChi(e.target.value)} placeholder="Để trống = người ghi" />
        </Field>
        <Field label="Ảnh minh chứng / hoá đơn">
          <input type="file" accept="image/*,application/pdf" onChange={(e) => setTep(e.target.files?.[0] || null)} />
        </Field>
        {anhXem ? (
          <img src={anhXem} alt="Xem trước minh chứng"
               style={{ maxWidth: "100%", maxHeight: 220, objectFit: "contain", borderRadius: radius.md,
                        border: "1px solid " + color.border }} />
        ) : null}
      </div>
      <NoteStrip>
        Ghi nhầm thì báo Admin xoá. Kỳ đã khoá sổ thì không ghi / xoá được nữa.
      </NoteStrip>
    </Drawer>
  );
}

export default function DoiSoatThuChi({ thang, nam, coTheGhi, laQuanTri, onNotice }) {
  const homNay = khoaNgay(new Date());
  const dauThang = `${nam}-${String(thang).padStart(2, "0")}-01`;
  const cuoiThang = khoaNgay(new Date(nam, thang, 0));
  const [tu, setTu] = useState(dauThang);
  const [den, setDen] = useState(cuoiThang < homNay ? cuoiThang : homNay);
  const [bc, setBc] = useState(null);
  const [loi, setLoi] = useState("");
  const [dangTai, setDangTai] = useState(false);
  const [moChi, setMoChi] = useState(false);

  // Đổi kỳ trên đầu trang -> lấy cả tháng đó (tới hôm nay nếu là tháng hiện tại).
  useEffect(() => {
    setTu(dauThang);
    setDen(cuoiThang < homNay ? cuoiThang : (homNay < dauThang ? cuoiThang : homNay));
  }, [dauThang, cuoiThang, homNay]);

  const tai = useCallback(() => {
    setLoi("");
    setDangTai(true);
    apiClient.get(URL_API, { params: { tu, den } })
      .then(({ data }) => setBc(data))
      .catch((e) => { setBc(null); setLoi(loiApi(e, "Không tải được sổ thu chi.")); })
      .finally(() => setDangTai(false));
  }, [tu, den]);
  useEffect(() => { tai(); }, [tai]);

  const xuat = async () => {
    try {
      const r = await apiClient.get(`${URL_API}xuat/`, { params: { tu, den }, responseType: "blob", timeout: 60000 });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url; a.download = `Doi-soat-thu-chi-${tu}-${den}.xlsx`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) { setLoi(loiApi(e, "Không xuất được file Excel.")); }
  };

  const xoa = async (x) => {
    if (!window.confirm(`Xoá khoản chi "${x.noi_dung}" ${dd(x.so_tien)} ngày ${ngayVN(x.ngay)}? Dòng Chi trên sổ cũng bị xoá.`)) return;
    try {
      await apiClient.delete(`${URL_API}khoan-chi/${x.id}/`);
      onNotice?.(`Đã xoá khoản chi ${x.noi_dung}.`);
      tai();
    } catch (e) { window.alert(loiApi(e, "Không xoá được khoản chi.")); }
  };

  const t = bc?.tong;
  const cot = bc?.cot_thu || [];
  const nutNgay = (nhan, a, b) => (
    <Button variant={tu === a && den === b ? "outline" : "ghost"} style={{ padding: "8px 12px" }}
            onClick={() => { setTu(a); setDen(b); }}>{nhan}</Button>
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
            <Field label="Từ ngày"><Input type="date" value={tu} onChange={(e) => setTu(e.target.value)} style={{ width: 160 }} /></Field>
            <Field label="Đến ngày"><Input type="date" value={den} onChange={(e) => setDen(e.target.value)} style={{ width: 160 }} /></Field>
            {nutNgay("Hôm nay", homNay, homNay)}
            {nutNgay(`Cả tháng ${thang}/${nam}`, dauThang, cuoiThang)}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button variant="ghost" icon="doc" onClick={xuat} disabled={!bc}>Xuất Excel</Button>
            {coTheGhi ? <Button icon="plus" onClick={() => setMoChi(true)}>Ghi khoản chi</Button> : null}
          </div>
        </div>
      </Card>

      {loi ? (
        <div style={{ background: color.redSoft, color: color.red, borderRadius: radius.md, padding: "11px 13px", fontSize: 13 }}>{loi}</div>
      ) : null}

      {t ? (
        <Card style={{ padding: "16px 18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <O nhan="Tổng thu" gt={dd(t.thu.tong)} tone={color.green}
               phu={`${t.so_dong_thu} lượt · TM ${dd(t.thu_tien_mat)} · CK ${dd(t.thu_chuyen_khoan)}`} />
            <O nhan="Tổng chi" gt={dd(t.chi)} tone={color.red} phu={`${t.so_dong_chi} khoản`} />
            <O nhan="Chênh lệch (thu − chi)" gt={dd(t.chenh_lech)} tone={Number(t.chenh_lech) < 0 ? color.red : color.ink} />
            <O nhan="Thiếu minh chứng" gt={`${t.thieu_minh_chung_thu} thu · ${t.thieu_minh_chung_chi} chi`}
               tone={t.thieu_minh_chung_thu + t.thieu_minh_chung_chi ? color.amber : color.ink} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, fontSize: 12.5, color: color.ink70 }}>
            {cot.map((c) => (
              <span key={c.ma} style={{ background: color.subtle, borderRadius: radius.sm, padding: "5px 10px" }}>
                {c.ten}: <b>{dd(t.thu[c.ma])}</b>
              </span>
            ))}
            {Number(t.thu.chua_phan_bo) ? (
              <span style={{ background: color.amberSoft, borderRadius: radius.sm, padding: "5px 10px" }}>
                Chưa phân bổ: <b>{dd(t.thu.chua_phan_bo)}</b>
              </span>
            ) : null}
          </div>
        </Card>
      ) : null}

      {dangTai && !bc ? <div style={{ color: color.muted, fontSize: 13 }}>Đang tải…</div> : null}
      {bc && !bc.theo_ngay.length ? (
        <Card style={{ padding: 24, textAlign: "center", color: color.muted, fontSize: 13.5 }}>
          Không có khoản thu / chi nào từ {ngayVN(bc.tu)} đến {ngayVN(bc.den)}.
        </Card>
      ) : null}

      {(bc?.theo_ngay || []).map((nhom) => (
        <Card key={nhom.ngay} style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "baseline",
                        padding: "14px 18px", borderBottom: "1px solid " + color.border }}>
            <div style={{ fontSize: 15.5, fontWeight: 800 }}>{thuTrongTuan(nhom.ngay)}, {ngayVN(nhom.ngay)}</div>
            <div style={{ fontSize: 13, color: color.ink70 }}>
              Thu <b style={{ color: color.green }}>{dd(nhom.cong_thu.tong)}</b>
              {" · "}Chi <b style={{ color: color.red }}>{dd(nhom.tong_chi)}</b>
              {" · "}Còn <b>{dd(nhom.chenh_lech)}</b>
            </div>
          </div>
          {nhom.thu.length ? (
            <div style={{ padding: "12px 18px 4px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>THU ({nhom.thu.length})</div>
              <BangThu nhom={nhom} cot={cot} />
            </div>
          ) : null}
          {nhom.chi.length ? (
            <div style={{ padding: "12px 18px 14px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>CHI ({nhom.chi.length})</div>
              <BangChi nhom={nhom} laQuanTri={laQuanTri} onXoa={xoa} />
            </div>
          ) : null}
        </Card>
      ))}

      <NoteStrip>
        Phần thu lấy từ các lần “Ghi nhận thu” ở tab Học phí &amp; Công nợ, tiền tự chia theo loại khoản (Học phí, Quỹ lớp,
        Apps, Tài liệu, Cọc). Lần thu nào chưa gán vào khoản nào hiện ở cột “Chưa phân bổ”. Ảnh minh chứng gắn lúc ghi nhận thu.
      </NoteStrip>

      {moChi ? (
        <NganKeoGhiChi
          loaiChi={bc?.loai_chi || []}
          onDong={() => setMoChi(false)}
          onXong={(tb, ngay) => {
            setMoChi(false);
            onNotice?.(tb);
            if (ngay < tu || ngay > den) { setTu(ngay < tu ? ngay : tu); setDen(ngay > den ? ngay : den); } else tai();
          }}
        />
      ) : null}
    </div>
  );
}
