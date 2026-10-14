import { useEffect, useState } from "react";
import { baoCaoKqkd, dinhDangTien, loiApi } from "../../services/financeService";
import { Card, CardHead, NoteStrip, StatCard } from "./v3/ui";
import { color, radius } from "./v3/theme";

/**
 * Báo cáo kết quả kinh doanh tháng: Tổng doanh thu − Tổng chi phí = Lợi nhuận thuần.
 * Số do máy chủ tính (finances/bao_cao_kqkd.py) — doanh thu theo kỳ học phí, chi phí
 * nhân sự theo lương chốt / tạm tính, chi khác theo sổ giao dịch.
 */

const d = (v) => `${dinhDangTien(Math.round(Number(v || 0)))} đ`;

function Dong({ nhan, so, phu, dam, am }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0",
                  borderTop: "1px dashed " + color.border, fontWeight: dam ? 700 : 400 }}>
      <div>
        <div style={{ fontSize: 13.5 }}>{nhan}</div>
        {phu ? <div style={{ fontSize: 12, color: color.muted, marginTop: 2 }}>{phu}</div> : null}
      </div>
      <div style={{ fontSize: 13.5, whiteSpace: "nowrap", color: am ? color.red : color.ink }}>{so}</div>
    </div>
  );
}

export default function BaoCaoKqkd({ thang, nam }) {
  const [bc, setBc] = useState(null);
  const [loi, setLoi] = useState("");
  const [dangTai, setDangTai] = useState(true);

  useEffect(() => {
    let huy = false;
    setDangTai(true);
    setLoi("");
    baoCaoKqkd({ month: thang, year: nam })
      .then((x) => !huy && setBc(x))
      .catch((e) => !huy && setLoi(loiApi(e, "Không tải được báo cáo kết quả kinh doanh.")))
      .finally(() => !huy && setDangTai(false));
    return () => { huy = true; };
  }, [thang, nam]);

  const ky = `${String(thang).padStart(2, "0")}/${nam}`;
  if (loi) return <NoteStrip>{loi}</NoteStrip>;
  if (dangTai && !bc) return <Card style={{ padding: 20, color: color.muted, fontSize: 13 }}>Đang tính báo cáo kết quả kinh doanh…</Card>;
  if (!bc) return null;

  const dt = bc.doanh_thu;
  const cp = bc.chi_phi;
  const ns = cp.nhan_su;
  const ln = Number(bc.loi_nhuan_thuan);
  const tamTinh = ns.nguon !== "chot";

  return (
    <div style={{ display: "grid", gap: 16, marginBottom: 20, opacity: dangTai ? 0.6 : 1 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <StatCard label="Tổng doanh thu" value={d(dt.tong)} icon="wallet" tone="blue"
                  note={`Học phí & khoản thu kỳ ${ky}`} />
        <StatCard label="Tổng chi phí" value={d(cp.tong)} icon="doc" tone="amber"
                  note={tamTinh ? "Lương đang tạm tính" : "Theo lương đã chốt"} />
        <StatCard label="Lợi nhuận thuần" value={d(ln)} icon="chart" tone={ln >= 0 ? "green" : "red"}
                  valueColor={ln >= 0 ? "green" : "red"}
                  note={bc.ty_suat != null ? `Tỷ suất ${bc.ty_suat}% doanh thu` : "Chưa có doanh thu"} />
      </div>

      <Card>
        <CardHead title={`Báo cáo kết quả kinh doanh — tháng ${ky}`}
                  sub="Doanh thu tính theo kỳ của khoản phải thu; chi phí lương tính theo tháng công." />
        <div style={{ padding: "8px 22px 20px", display: "grid", gap: 22,
                      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: color.blue, marginBottom: 4 }}>I. TỔNG DOANH THU</div>
            {dt.theo_loai.length ? dt.theo_loai.map((l) => (
              <Dong key={l.loai} nhan={l.ten} so={d(l.doanh_thu)}
                    phu={Number(l.giam_tru) ? `Phải thu ${d(l.phai_thu)} − giảm trừ ${d(l.giam_tru)}` : null} />
            )) : <Dong nhan="Chưa lập khoản phải thu nào cho kỳ này" so={d(0)} />}
            <Dong nhan="Tổng doanh thu" so={d(dt.tong)} dam />
            <div style={{ marginTop: 10, background: color.subtle, borderRadius: radius.md, padding: "9px 12px",
                          fontSize: 12.5, color: color.ink70 }}>
              Tiền thực thu trong tháng (sổ giao dịch, gồm cả cọc và tiền nộp trước): <b>{d(dt.thuc_thu)}</b>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: color.amber, marginBottom: 4 }}>II. CHI PHÍ</div>
            <Dong nhan={`Lương nhân sự (${ns.so_nguoi} người)`} so={d(ns.luong)}
                  phu={tamTinh ? "Tạm tính theo bảng lương — chốt lương xong số sẽ cập nhật" : "Theo bảng lương đã chốt"} />
            <Dong nhan="BHXH doanh nghiệp đóng" so={d(ns.bh_dn)} />
            <Dong nhan={`Chi phí khác (${cp.so_dong_chi_khac} khoản trên sổ)`} so={d(cp.chi_khac)}
                  phu={cp.so_dong_chi_khac ? null : "Chưa ghi khoản chi nào — ghi ở Sổ giao dịch (nút Ghi giao dịch → Chi)"} />
            {cp.chi_khac_dong.map((g, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5,
                                    color: color.ink70, padding: "3px 0 3px 14px" }}>
                <span>{g.mo_ta || "—"}</span><span style={{ whiteSpace: "nowrap" }}>{d(g.so_tien)}</span>
              </div>
            ))}
            <Dong nhan="Tổng chi phí" so={d(cp.tong)} dam />
          </div>
        </div>
        <div style={{ margin: "0 22px 20px", padding: "14px 16px", borderRadius: radius.md,
                      background: ln >= 0 ? color.greenSoft : color.redSoft,
                      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700 }}>III. LỢI NHUẬN THUẦN = I − II</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: ln >= 0 ? color.green : color.red }}>{d(ln)}</div>
        </div>
      </Card>
      {Number(cp.chi_luong_tren_so) ? (
        <NoteStrip>
          Sổ có {d(cp.chi_luong_tren_so)} chi trả lương trong tháng — không cộng vào chi phí vì lương đã tính theo
          bảng lương ở trên.
        </NoteStrip>
      ) : null}
    </div>
  );
}
