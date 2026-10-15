import { useCallback, useEffect, useState } from "react";
import apiClient from "../../services/apiClient";
import { dinhDangTien, loiApi } from "../../services/financeService";
import { khoaNgay } from "../../utils/khoangThoiGian";
import { Button, Input, Modal, NoteStrip, Pill, Table } from "./v3/ui";
import { color, radius } from "./v3/theme";

/**
 * Đối soát tổng tiền thu (15/10/2026). Thu học phí xong: hệ thống ghi nhận bao nhiêu
 * (theo hình thức, theo người thu) — đối chiếu với tiền mặt đếm được và sao kê ngân
 * hàng, kiểm sổ giao dịch và phần chưa phân bổ, rồi xác nhận (lưu lại ai, lúc nào,
 * lệch bao nhiêu, vì sao). Số do máy chủ tính: finances/doi_soat_thu.py.
 */

const d = (v) => `${dinhDangTien(Math.round(Number(v || 0)))} đ`;
const so = (s) => Number(String(s || "").replace(/[^0-9]/g, "")) || 0;
const ngayVN = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "");
const gio = (iso) => (iso ? new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "");

function O({ nhan, gt, phu, tone }) {
  return (
    <div style={{ background: color.subtle, borderRadius: radius.md, padding: "12px 14px" }}>
      <div style={{ fontSize: 12, color: color.muted }}>{nhan}</div>
      <div style={{ fontSize: 19, fontWeight: 800, margin: "4px 0 2px", color: tone || color.ink }}>{gt}</div>
      {phu ? <div style={{ fontSize: 12, color: color.faint }}>{phu}</div> : null}
    </div>
  );
}

export default function DoiSoatThuTien({ onDong, coTheXacNhan, onNotice }) {
  const [ngay, setNgay] = useState(khoaNgay(new Date()));
  const [bc, setBc] = useState(null);
  const [loi, setLoi] = useState("");
  const [tm, setTm] = useState("");
  const [ck, setCk] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [dangLuu, setDangLuu] = useState(false);

  const tai = useCallback(() => {
    setLoi("");
    apiClient.get("/finances/payments/doi-soat/", { params: { tu: ngay } })
      .then(({ data }) => setBc(data))
      .catch((e) => setLoi(loiApi(e, "Không tải được số liệu đối soát.")));
  }, [ngay]);
  useEffect(() => { tai(); setTm(""); setCk(""); setGhiChu(""); }, [tai]);

  const ht = bc?.he_thong || {};
  const lechTm = tm === "" ? null : so(tm) - Number(ht.tien_mat || 0);
  const lechCk = ck === "" ? null : so(ck) - Number(ht.chuyen_khoan || 0);
  const tongLech = (lechTm || 0) + (lechCk || 0);

  const xacNhan = async () => {
    setLoi("");
    if (tm === "" || ck === "") { setLoi("Nhập tiền mặt đếm được và số tiền chuyển khoản theo sao kê (không có thì nhập 0)."); return; }
    if (tongLech && !ghiChu.trim()) { setLoi("Có chênh lệch — ghi rõ lý do trước khi xác nhận."); return; }
    setDangLuu(true);
    try {
      await apiClient.post("/finances/payments/doi-soat/xac-nhan/", {
        ngay, thuc_tien_mat: so(tm), thuc_chuyen_khoan: so(ck), ghi_chu: ghiChu.trim(),
      });
      onNotice?.(tongLech ? `Đã lưu đối soát ngày ${ngayVN(ngay)} — lệch ${d(tongLech)}.` : `Đã đối soát ngày ${ngayVN(ngay)}: khớp.`);
      tai();
    } catch (e) {
      setLoi(loiApi(e, "Không lưu được đối soát."));
    } finally {
      setDangLuu(false);
    }
  };

  const mauLech = (v) => (v == null ? color.muted : v === 0 ? color.green : color.red);

  return (
    <Modal title="Đối soát tiền thu" sub="Đối chiếu tổng hệ thống ghi nhận với tiền mặt thực đếm và sao kê ngân hàng"
           width={980} onClose={onDong}
           footer={<Button variant="ghost" onClick={onDong}>Đóng</Button>}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Ngày thu</span>
        <Input type="date" value={ngay} max={khoaNgay(new Date())} onChange={(e) => setNgay(e.target.value)} style={{ width: 170 }} />
        {bc ? <span style={{ fontSize: 13, color: color.muted }}>{bc.so_phieu} phiếu thu</span> : null}
      </div>
      {loi ? <div style={{ background: color.redSoft, color: color.red, borderRadius: radius.md, padding: "10px 12px", fontSize: 13, marginBottom: 12 }}>{loi}</div> : null}
      {!bc ? <div style={{ color: color.muted, fontSize: 13 }}>Đang tải…</div> : (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
            <O nhan="Tổng hệ thống ghi nhận" gt={d(bc.tong_phieu_thu)} phu={`${bc.so_phieu} phiếu`} />
            <O nhan="Tiền mặt" gt={d(ht.tien_mat)} />
            <O nhan="Chuyển khoản" gt={d(ht.chuyen_khoan)} />
            <O nhan="Sổ giao dịch" gt={bc.so_giao_dich.khop ? "Khớp" : `Lệch ${bc.so_giao_dich.so_phieu_lech} phiếu`}
               tone={bc.so_giao_dich.khop ? color.green : color.red} phu={`Thu trên sổ ${d(bc.so_giao_dich.tong_thu_tu_phieu)}`} />
          </div>

          <div style={{ border: "1px solid " + color.border, borderRadius: radius.md, padding: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Đối chiếu thực tế</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
              {[["Tiền mặt đếm được", tm, setTm, ht.tien_mat, lechTm], ["Chuyển khoản theo sao kê", ck, setCk, ht.chuyen_khoan, lechCk]].map(([nhan, v, set, heThong, lech]) => (
                <div key={nhan} style={{ display: "grid", gap: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{nhan}</span>
                  <Input value={v === "" ? "" : dinhDangTien(so(v))} placeholder="0" style={{ textAlign: "right" }}
                         onChange={(e) => set(e.target.value.replace(/[^0-9]/g, ""))} />
                  <span style={{ fontSize: 12, color: mauLech(lech) }}>
                    Hệ thống: {d(heThong)}{lech == null ? "" : lech === 0 ? " · khớp" : ` · ${lech > 0 ? "thừa" : "thiếu"} ${d(Math.abs(lech))}`}
                  </span>
                </div>
              ))}
              <div style={{ display: "grid", gap: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Ghi chú / lý do lệch</span>
                <Input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="Bắt buộc khi có chênh lệch" />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: tm === "" || ck === "" ? color.muted : mauLech(tongLech) }}>
                {tm === "" || ck === "" ? "Nhập số thực tế để xem chênh lệch" : tongLech === 0 ? "✓ Khớp hoàn toàn" : `Chênh lệch: ${d(tongLech)}`}
              </span>
              {coTheXacNhan ? <Button onClick={xacNhan} disabled={dangLuu}>{dangLuu ? "Đang lưu…" : "Xác nhận đối soát"}</Button> : null}
            </div>
          </div>

          {Number(bc.phan_bo.chua_phan_bo) || bc.thieu_chung_tu || bc.so_giao_dich.so_dong_thu_tay ? (
            <NoteStrip>
              {Number(bc.phan_bo.chua_phan_bo) ? <>Còn <b>{d(bc.phan_bo.chua_phan_bo)}</b> đã thu nhưng chưa phân bổ vào khoản phải thu. </> : null}
              {bc.thieu_chung_tu ? <><b>{bc.thieu_chung_tu}</b> phiếu chuyển khoản / thẻ chưa có chứng từ. </> : null}
              {bc.so_giao_dich.so_dong_thu_tay ? <>Sổ có thêm {bc.so_giao_dich.so_dong_thu_tay} dòng thu ghi tay ({d(bc.so_giao_dich.thu_tay)}) không gắn phiếu thu.</> : null}
            </NoteStrip>
          ) : null}

          {bc.theo_nguoi_thu.length ? (
            <div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Theo người thu</div>
              <Table columns={["Người thu", "Số phiếu", "Tiền mặt", "Chuyển khoản", "Tổng"]} align={{ 1: "right", 2: "right", 3: "right", 4: "right" }}
                     rows={bc.theo_nguoi_thu.map((n) => [n.ten, n.so_phieu, d(n.tien_mat), d(n.chuyen_khoan), <b key="t">{d(n.tong)}</b>])} />
            </div>
          ) : null}

          <div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Chi tiết phiếu thu</div>
            {bc.dong.length ? (
              <Table columns={["Giờ", "Học viên", "Hình thức", "Quỹ", "Người thu", "Số tiền", "Kiểm tra"]} align={{ 5: "right" }}
                     rows={bc.dong.map((r) => [
                       gio(r.luc), r.hoc_vien, r.hinh_thuc, r.quy, r.nguoi_thu, <b key="s">{d(r.so_tien)}</b>,
                       <div key="k" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                         {r.khop_so ? null : <Pill tone="red">Lệch sổ</Pill>}
                         {Number(r.chua_phan_bo) ? <Pill tone="amber">Chưa phân bổ {d(r.chua_phan_bo)}</Pill> : null}
                         {r.thieu_chung_tu ? <Pill tone="amber">Thiếu chứng từ</Pill> : null}
                         {r.khop_so && !Number(r.chua_phan_bo) && !r.thieu_chung_tu ? <Pill tone="green">OK</Pill> : null}
                       </div>,
                     ])} />
            ) : <div style={{ color: color.muted, fontSize: 13 }}>Không có phiếu thu nào trong ngày này.</div>}
          </div>

          {bc.xac_nhan.length ? (
            <div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Lịch sử xác nhận</div>
              {bc.xac_nhan.map((x) => (
                <div key={x.id} style={{ fontSize: 13, padding: "6px 0", borderTop: "1px dashed " + color.border }}>
                  {gio(x.luc)} {ngayVN(x.luc)} · <b>{x.nguoi}</b> · TM {d(x.thuc_tien_mat)} / CK {d(x.thuc_chuyen_khoan)} ·{" "}
                  <span style={{ color: Number(x.chenh_lech) ? color.red : color.green, fontWeight: 700 }}>
                    {Number(x.chenh_lech) ? `lệch ${d(x.chenh_lech)}` : "khớp"}
                  </span>
                  {x.ghi_chu ? ` — ${x.ghi_chu}` : ""}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
