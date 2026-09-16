import { useCallback, useEffect, useState } from "react";
import {
  kiemTraDongSo, layCongNo, layDanhSachKy, layGiamTru, laySoGiaoDich,
  loiApi, rutGonM, tongHopCongNo, tongHopSo,
} from "../../services/financeService";
import { color, radius } from "./v3/theme";
import { Icon, TONE } from "./v3/icons";
import { Card, CardHead, StatCard, StepCard } from "./v3/ui";

/**
 * Phân hệ "Tổng quan" — dựng theo bản thiết kế vista-export/screens/Overview.jsx,
 * nối vào API thật thay cho data.js mô phỏng.
 *
 * Bố cục giữ nguyên thiết kế: 8 ô chỉ số (4×2) → dải 6 bước luồng tài chính +
 * việc cần xử lý → biểu đồ dòng tiền 6 tháng + quỹ & tài khoản.
 *
 * Con số ở ô chỉ số rút gọn ("415.0M") đúng như thiết kế; bảng thì vẫn in đủ
 * từng đồng, vì kế toán đối chiếu chứ không ước lượng.
 */

const BUOC = [
  { n: 1, title: "Phát sinh", desc: "Học phí, chi phí, lương, giao dịch ngân hàng." },
  { n: 2, title: "Ghi nhận", desc: "Tạo khoản phải thu / đề nghị chi / giao dịch." },
  { n: 3, title: "Phê duyệt", desc: "Kiểm tra hạn mức và quyền thao tác." },
  { n: 4, title: "Thu / Chi", desc: "Phân bổ thanh toán theo chứng từ." },
  { n: 5, title: "Đối soát", desc: "Khớp quỹ, ngân hàng, công nợ." },
  { n: 6, title: "Đóng sổ", desc: "Khóa kỳ, báo cáo, nhật ký thao tác." },
];

/** Sáu tháng gần nhất tính lùi từ kỳ đang xem. */
function sauThangGanNhat(thang, nam) {
  const ds = [];
  for (let i = 5; i >= 0; i -= 1) {
    let t = thang - i;
    let n = nam;
    while (t <= 0) { t += 12; n -= 1; }
    ds.push({ thang: t, nam: n, nhan: `T${t}` });
  }
  return ds;
}

export default function TongQuanTaiChinh({ thang, nam, onDoiTab }) {
  const [d, setD] = useState({});
  const [dongTien, setDongTien] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");

  const tai = useCallback(async () => {
    setDangTai(true);
    setLoi("");
    try {
      const [congNo, so, choKhop, choDuyet, quaHan, dsKy] = await Promise.all([
        tongHopCongNo({ month: thang, year: nam }),
        tongHopSo({ month: thang, year: nam }),
        laySoGiaoDich({ month: thang, year: nam, reconcile_status: "pending", page_size: 8 }),
        layGiamTru({ pending: 1, page_size: 8 }),
        layCongNo({ month: thang, year: nam, status: "con_no", page_size: 8 }),
        layDanhSachKy(),
      ]);
      const ky = dsKy.find((k) => k.period_month === thang && k.period_year === nam);
      const kiemTra = ky ? await kiemTraDongSo(ky.id).catch(() => null) : null;
      setD({
        congNo, so, ky, kiemTra,
        choKhop: Array.isArray(choKhop) ? choKhop : choKhop?.results || [],
        choDuyet: Array.isArray(choDuyet) ? choDuyet : choDuyet?.results || [],
        quaHan: Array.isArray(quaHan) ? quaHan : quaHan?.results || [],
      });

      // Biểu đồ dòng tiền: gọi 6 lượt tổng hợp, mỗi tháng một lượt. Chấp nhận
      // được vì mỗi lượt chỉ là một phép SUM, và đỡ phải thêm endpoint mới.
      const thangs = sauThangGanNhat(thang, nam);
      const so6 = await Promise.all(
        thangs.map((x) => tongHopSo({ month: x.thang, year: x.nam }).catch(() => null)),
      );
      setDongTien(thangs.map((x, i) => ({
        ...x, thu: Number(so6[i]?.tong_thu || 0), chi: Number(so6[i]?.tong_chi || 0),
      })));
    } catch (e) {
      setLoi(loiApi(e, "Không tải được số liệu tổng quan."));
    } finally {
      setDangTai(false);
    }
  }, [thang, nam]);

  useEffect(() => { tai(); }, [tai]);

  const cn = d.congNo || {};
  const so = d.so || {};
  const conNo = Number(cn.tong_con_no || 0);
  const quaHan = Number(cn.no_qua_han || 0);
  const trongHan = Math.max(conNo - quaHan, 0);
  const loiNhuan = Number(so.tong_thu || 0) - Number(so.tong_chi || 0);
  const bien = Number(so.tong_thu || 0) > 0
    ? `Biên ${((loiNhuan / Number(so.tong_thu)) * 100).toFixed(1)}%` : "Chưa có doanh thu";
  const soDu = (so.quy || []).reduce((t, q) => t + Number(q.current_balance || 0), 0);
  const cho = dangTai ? "..." : null;

  /* Việc cần xử lý — chỉ hiện việc CÓ THẬT, không bịa cho đủ hàng. */
  const viec = [];
  if (quaHan > 0) {
    viec.push({
      k: "quahan", title: "Công nợ quá hạn", icon: "warn", tone: "red",
      sub: d.quaHan?.length ? `${d.quaHan.length}+ khoản cần nhắc phí` : "Cần nhắc phụ huynh",
      right: `${rutGonM(quaHan)} đ`, rightNote: "Ưu tiên cao", tab: "tuition",
    });
  }
  if (d.choDuyet?.length) {
    viec.push({
      k: "duyet", title: "Giảm trừ chờ duyệt", icon: "doc", tone: "amber",
      sub: d.choDuyet.map((x) => x.reason).slice(0, 1).join("") || "Cần tầng quản trị duyệt",
      right: `${d.choDuyet.length} phiếu`,
      rightNote: `${rutGonM(d.choDuyet.reduce((t, x) => t + Number(x.amount || 0), 0))} đ`,
      tab: "tuition",
    });
  }
  if (d.choKhop?.length) {
    viec.push({
      k: "khop", title: "Ngân hàng chưa khớp", icon: "bank", tone: "blue",
      sub: "Chưa khớp hết thì không đóng sổ được",
      right: `${d.choKhop.length} GD`,
      rightNote: `${rutGonM(d.choKhop.reduce((t, x) => t + Number(x.amount || 0), 0))} đ`,
      tab: "ledger",
    });
  }
  if (Number(so.tong_phieu_thu || 0) > Number(so.tong_thu || 0)) {
    viec.push({
      k: "lechso", title: "Sổ chưa khớp phiếu thu", icon: "warn", tone: "violet",
      sub: "Có phiếu thu không sinh được dòng sổ",
      right: `${rutGonM(Number(so.tong_phieu_thu) - Number(so.tong_thu))} đ`,
      rightNote: "Cần rà lại", tab: "report",
    });
  }

  const maxCot = Math.max(1, ...dongTien.map((c) => Math.max(c.thu, c.chi)));

  return (
    <>
      {loi ? (
        <div style={{
          background: color.redSoft, color: color.red, borderRadius: radius.md,
          padding: "12px 14px", fontSize: 13, marginBottom: 14, lineHeight: 1.5,
        }}>{loi}</div>
      ) : null}

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))",
        gap: 14, marginBottom: 14,
      }} className="fin-v3-the">
        <StatCard label="Phải thu trong kỳ" icon="doc" tone="orange"
                  value={cho || `${rutGonM(cn.tong_phai_thu)} đ`}
                  note={`${cn.so_khoan || 0} khoản phải thu`} />
        <StatCard label="Đã thu" icon="check" tone="green" valueColor="green"
                  value={cho || `${rutGonM(cn.tong_da_thu)} đ`}
                  note={Number(cn.tong_phai_thu) > 0
                    ? `${Math.round((Number(cn.tong_da_thu) / Number(cn.tong_phai_thu)) * 100)}% kế hoạch thu`
                    : "Chưa có khoản phải thu"} />
        <StatCard label="Còn phải thu" icon="wallet" tone="blue"
                  value={cho || `${rutGonM(conNo)} đ`}
                  note={`Trong hạn ${rutGonM(trongHan)} đ`} />
        <StatCard label="Công nợ quá hạn" icon="warn" tone="red" valueColor="red"
                  value={cho || `${rutGonM(quaHan)} đ`}
                  note={d.quaHan?.length ? `${d.quaHan.length}+ khoản` : "Không có"} />

        <StatCard label="Chi phí phát sinh" icon="chart" tone="violet"
                  value={cho || `${rutGonM(so.tong_chi)} đ`} note="Vận hành + nhân sự" />
        <StatCard label="Giảm trừ đã duyệt" icon="doc" tone="amber"
                  value={cho || `${rutGonM(cn.tong_giam_tru)} đ`}
                  note={d.choDuyet?.length ? `${d.choDuyet.length} phiếu chờ duyệt` : "Không có phiếu chờ"} />
        <StatCard label="Số dư tiền" icon="bank" tone="blue"
                  value={cho || `${rutGonM(soDu)} đ`} note="Quỹ + ngân hàng" />
        <StatCard label="Chênh lệch thu chi" icon="chart" tone="green"
                  valueColor={loiNhuan >= 0 ? "green" : "red"}
                  value={cho || `${rutGonM(loiNhuan)} đ`} note={bien} />
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "minmax(0,1.95fr) minmax(0,1fr)",
        gap: 14, marginBottom: 14,
      }} className="fin-v3-21">
        <Card style={{ paddingBottom: 22 }}>
          <CardHead
            title="Luồng tài chính chuẩn"
            sub="Một nguồn dữ liệu — nhiều nghiệp vụ, không ghi đè giao dịch gốc."
            action="SOP Finance V2"
          />
          <div style={{ display: "flex", alignItems: "stretch", gap: 10, padding: "18px 22px 0" }}
               className="fin-v3-buoc">
            {BUOC.map((s, i) => (
              <StepCard key={s.n} {...s} horizontal last={i === BUOC.length - 1} />
            ))}
          </div>
        </Card>

        <Card style={{ paddingBottom: 14 }}>
          <CardHead
            title="Việc cần xử lý hôm nay"
            sub="Ưu tiên theo rủi ro tài chính."
            action={viec.length ? `${viec.length} việc` : null}
          />
          <div style={{ padding: "14px 14px 0", display: "flex", flexDirection: "column", gap: 8 }}>
            {dangTai ? (
              <div style={{ fontSize: 13, color: color.muted, padding: "0 8px" }}>Đang tải...</div>
            ) : viec.length === 0 ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                border: "1px solid " + color.border, borderRadius: radius.md, padding: "12px 14px",
              }}>
                <div style={{
                  width: 30, height: 30, flex: "0 0 30px", borderRadius: 9,
                  background: TONE.green.bg, color: TONE.green.fg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}><Icon.check size={16} /></div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>Không còn việc tồn</div>
                  <div style={{ fontSize: 12, color: color.muted, marginTop: 2 }}>
                    Đã đối soát hết và không có nợ quá hạn.
                  </div>
                </div>
              </div>
            ) : viec.map((v) => {
              const t = TONE[v.tone] || TONE.orange;
              const Hinh = Icon[v.icon] || Icon.doc;
              return (
                <button key={v.k} type="button" onClick={() => onDoiTab?.(v.tab)} style={{
                  display: "flex", alignItems: "center", gap: 12, width: "100%",
                  textAlign: "left", cursor: "pointer", background: "#fff",
                  border: "1px solid " + color.border, borderRadius: radius.md, padding: "12px 14px",
                }}>
                  <div style={{
                    width: 30, height: 30, flex: "0 0 30px", borderRadius: 9,
                    background: t.bg, color: t.fg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}><Hinh size={16} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{v.title}</div>
                    <div style={{
                      fontSize: 12, color: color.muted, marginTop: 2,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{v.sub}</div>
                  </div>
                  <div style={{ textAlign: "right", flex: "0 0 auto" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.fg }}>{v.right}</div>
                    <div style={{ fontSize: 11.5, color: color.faint, marginTop: 2 }}>{v.rightNote}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "minmax(0,1.95fr) minmax(0,1fr)", gap: 14,
      }} className="fin-v3-21">
        <Card style={{ paddingBottom: 22 }}>
          <CardHead
            title="Dòng tiền 6 tháng"
            sub="Cột cam là thu, cột xám là chi — lấy từ sổ giao dịch."
            action="Xem sổ giao dịch"
            onAction={() => onDoiTab?.("ledger")}
          />
          <div style={{
            display: "grid", gridTemplateColumns: `repeat(${dongTien.length || 6},1fr)`,
            gap: 26, alignItems: "end", height: 230, padding: "26px 30px 0",
            borderBottom: "1px solid " + color.border,
          }}>
            {(dongTien.length ? dongTien : sauThangGanNhat(thang, nam).map((x) => ({ ...x, thu: 0, chi: 0 })))
              .map((c) => (
                <div key={`${c.nam}-${c.thang}`} style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 8, height: "100%", justifyContent: "flex-end",
                }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: color.ink70 }}>
                    {rutGonM(c.thu)}
                  </div>
                  <div style={{
                    display: "flex", gap: 4, alignItems: "flex-end",
                    width: "100%", maxWidth: 58, justifyContent: "center",
                  }}>
                    <div title={`Thu ${rutGonM(c.thu)}`} style={{
                      width: "50%", height: Math.max((c.thu / maxCot) * 150, c.thu > 0 ? 3 : 0),
                      background: color.orangeGrad, borderRadius: "6px 6px 0 0",
                    }} />
                    <div title={`Chi ${rutGonM(c.chi)}`} style={{
                      width: "50%", height: Math.max((c.chi / maxCot) * 150, c.chi > 0 ? 3 : 0),
                      background: "#D6DCE5", borderRadius: "6px 6px 0 0",
                    }} />
                  </div>
                </div>
              ))}
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: `repeat(${dongTien.length || 6},1fr)`,
            gap: 26, padding: "10px 30px 0",
          }}>
            {(dongTien.length ? dongTien : sauThangGanNhat(thang, nam)).map((c) => (
              <div key={`n-${c.nam}-${c.thang}`} style={{
                textAlign: "center", fontSize: 12, color: color.muted,
              }}>{c.nhan}</div>
            ))}
          </div>
        </Card>

        <Card style={{ paddingBottom: 18 }}>
          <CardHead
            title="Quỹ & tài khoản"
            sub="Số dư phải khớp sau đối soát."
            action="Quản lý tài khoản"
            onAction={() => onDoiTab?.("ledger")}
          />
          <div style={{ padding: "14px 22px 0" }}>
            {(so.quy || []).length === 0 ? (
              <div style={{ fontSize: 13, color: color.muted, lineHeight: 1.6 }}>
                Chưa khai báo quỹ nào. Vào “Sổ giao dịch & Đối soát” để thêm.
              </div>
            ) : (so.quy || []).map((q, i) => {
              const t = q.kind === "bank" ? TONE.blue : TONE.orange;
              const ma = (q.code || q.name || "").slice(0, 3).toUpperCase();
              return (
                <div key={q.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "14px 0",
                  borderTop: i === 0 ? 0 : "1px solid " + color.border,
                }}>
                  <div style={{
                    width: 34, height: 34, flex: "0 0 34px", borderRadius: 9,
                    background: t.bg, color: t.fg, fontSize: 11.5, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{ma}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{q.name}</div>
                    <div style={{ fontSize: 12, color: color.muted, marginTop: 2 }}>
                      {q.bank_name || (q.kind === "cash" ? "Quỹ tiền mặt" : "Tài khoản ngân hàng")}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{rutGonM(q.current_balance)} đ</div>
                    <div style={{ fontSize: 11.5, color: color.faint, marginTop: 2 }}>
                      {q.kind === "bank" && d.choKhop?.length ? "Có GD chờ khớp" : "Đã đối soát"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
}
