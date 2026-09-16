import { useCallback, useEffect, useState } from "react";
import {
  dinhDangTien, kiemTraDongSo, layCongNo, layDanhSachKy, layGiamTru,
  laySoGiaoDich, loiApi, tongHopCongNo, tongHopSo,
} from "../../services/financeService";
import { color, radius } from "./v3/theme";
import { Button, Card, CardHead, Pill, StatCard } from "./v3/ui";
import { Icon } from "./v3/icons";

/**
 * Phân hệ "Tổng quan".
 *
 * Theo tài liệu V2, màn này đổi từ dashboard "xem số" sang dashboard "điều hành
 * công việc kế toán": phần trên là các con số của kỳ, phần dưới là DANH SÁCH
 * VIỆC PHẢI LÀM — giao dịch chờ đối soát, giảm trừ chờ duyệt, nợ quá hạn. Số
 * đẹp mà không ai biết hôm nay phải làm gì thì màn hình vô dụng.
 */

export default function TongQuanTaiChinh({ thang, nam, onDoiTab }) {
  const [d, setD] = useState({});
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
      let kiemTra = null;
      if (ky) kiemTra = await kiemTraDongSo(ky.id).catch(() => null);
      setD({
        congNo, so, ky, kiemTra,
        choKhop: Array.isArray(choKhop) ? choKhop : choKhop?.results || [],
        choDuyet: Array.isArray(choDuyet) ? choDuyet : choDuyet?.results || [],
        quaHan: Array.isArray(quaHan) ? quaHan : quaHan?.results || [],
      });
    } catch (e) {
      setLoi(loiApi(e, "Không tải được số liệu tổng quan."));
    } finally {
      setDangTai(false);
    }
  }, [thang, nam]);

  useEffect(() => { tai(); }, [tai]);

  const viec = [];
  if (d.choKhop?.length) {
    viec.push({
      k: "khop", ico: "bank", tone: "amber",
      ten: `${d.choKhop.length} giao dịch ngân hàng chờ đối soát`,
      mo: "Chưa khớp hết thì không đóng sổ được.",
      tab: "ledger", nut: "Mở sổ giao dịch",
    });
  }
  if (d.choDuyet?.length) {
    viec.push({
      k: "duyet", ico: "doc", tone: "violet",
      ten: `${d.choDuyet.length} khoản giảm trừ chờ duyệt`,
      mo: d.choDuyet.map((x) => x.reason).slice(0, 2).join("; "),
      tab: "tuition", nut: "Xem và duyệt",
    });
  }
  if (Number(d.congNo?.no_qua_han) > 0) {
    viec.push({
      k: "quahan", ico: "warn", tone: "red",
      ten: `Nợ quá hạn ${dinhDangTien(d.congNo.no_qua_han)} đ`,
      mo: d.quaHan?.length
        ? `Gồm ${d.quaHan.length}+ khoản, ví dụ ${d.quaHan[0].student_name}.`
        : "Cần nhắc phụ huynh.",
      tab: "tuition", nut: "Xem công nợ",
    });
  }

  return (
    <>
      {loi ? (
        <div style={{
          background: color.redSoft, color: color.red, borderRadius: radius.md,
          padding: "12px 14px", fontSize: 13, marginBottom: 14, lineHeight: 1.5,
        }}>{loi}</div>
      ) : null}

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14,
      }}>
        <StatCard label="Phải thu trong kỳ" icon="doc" tone="orange"
                  value={dangTai ? "..." : `${dinhDangTien(d.congNo?.tong_phai_thu)} đ`}
                  note={`${d.congNo?.so_khoan || 0} khoản`} />
        <StatCard label="Đã thu" icon="check" tone="green" valueColor="green"
                  value={dangTai ? "..." : `${dinhDangTien(d.congNo?.tong_da_thu)} đ`}
                  note={Number(d.congNo?.tong_phai_thu) > 0
                    ? `${Math.round((Number(d.congNo.tong_da_thu) / Number(d.congNo.tong_phai_thu)) * 100)}% khoản phải thu`
                    : "—"} />
        <StatCard label="Còn nợ" icon="warn" tone="red" valueColor="red"
                  value={dangTai ? "..." : `${dinhDangTien(d.congNo?.tong_con_no)} đ`}
                  note={`Quá hạn ${dinhDangTien(d.congNo?.no_qua_han)} đ`} />
        <StatCard label="Chi trong kỳ" icon="wallet" tone="violet"
                  value={dangTai ? "..." : `${dinhDangTien(d.so?.tong_chi)} đ`}
                  note={`Chênh lệch ${dinhDangTien(d.so?.chenh_lech)} đ`} />
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "minmax(0,2.2fr) minmax(0,1fr)",
        gap: 14, marginTop: 14, alignItems: "start",
      }} className="fin-v3-21">
        <Card style={{ paddingBottom: 20 }}>
          <CardHead
            title="Việc cần làm"
            sub={`Những gì đang chặn kỳ ${String(thang).padStart(2, "0")}/${nam} chốt sổ.`}
          />
          <div style={{ padding: "16px 22px 0" }}>
            {dangTai ? (
              <div style={{ fontSize: 13, color: color.muted }}>Đang tải...</div>
            ) : viec.length === 0 ? (
              <div style={{
                display: "flex", gap: 12, alignItems: "flex-start",
                border: "1px solid " + color.border, borderRadius: radius.md, padding: "14px 16px",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: radius.md, flex: "0 0 32px",
                  background: color.greenSoft, color: color.green,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}><Icon.check size={17} /></div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Không còn việc tồn</div>
                  <div style={{ fontSize: 12.5, color: color.muted, marginTop: 3, lineHeight: 1.5 }}>
                    Đã đối soát hết, không có khoản giảm trừ chờ duyệt và không có nợ quá hạn.
                  </div>
                </div>
              </div>
            ) : viec.map((v) => {
              const Hinh = Icon[v.ico] || Icon.doc;
              const t = { amber: [color.amberSoft, color.amber], violet: [color.violetSoft, color.violet], red: [color.redSoft, color.red] }[v.tone] || [color.orangeSoft, color.orange];
              return (
                <div key={v.k} style={{
                  display: "flex", gap: 12, alignItems: "flex-start",
                  border: "1px solid " + color.border, borderRadius: radius.md,
                  padding: "14px 16px", marginBottom: 10,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: radius.md, flex: "0 0 32px",
                    background: t[0], color: t[1],
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}><Hinh size={17} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{v.ten}</div>
                    <div style={{ fontSize: 12.5, color: color.muted, marginTop: 3, lineHeight: 1.5 }}>
                      {v.mo}
                    </div>
                  </div>
                  <button type="button" onClick={() => onDoiTab?.(v.tab)} style={{
                    background: "none", border: 0, padding: 0, cursor: "pointer",
                    color: color.orange, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
                  }}>{v.nut}</button>
                </div>
              );
            })}
          </div>
        </Card>

        <div style={{ display: "grid", gap: 14 }}>
          <Card style={{ paddingBottom: 18 }}>
            <CardHead title="Quỹ & tài khoản" sub="Số dư đầu cộng thu trừ chi." />
            <div style={{ padding: "12px 22px 0" }}>
              {(d.so?.quy || []).length === 0 ? (
                <div style={{ fontSize: 13, color: color.muted }}>Chưa khai báo quỹ nào.</div>
              ) : (d.so?.quy || []).map((q) => (
                <div key={q.id} style={{
                  display: "flex", alignItems: "center", gap: 11, padding: "11px 0",
                  borderBottom: "1px solid " + color.border,
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: radius.md, flex: "0 0 34px",
                    background: q.kind === "bank" ? color.blueSoft : color.greenSoft,
                    color: q.kind === "bank" ? color.blue : color.green,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {q.kind === "bank" ? <Icon.bank size={17} /> : <Icon.wallet size={17} />}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{q.name}</div>
                    {q.bank_name ? (
                      <div style={{ fontSize: 11.5, color: color.faint }}>{q.bank_name}</div>
                    ) : null}
                  </div>
                  <div style={{
                    fontSize: 13.5, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }}>{dinhDangTien(q.current_balance)} đ</div>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ paddingBottom: 18 }}>
            <CardHead title="Tình trạng kỳ" />
            <div style={{ padding: "12px 22px 0", display: "grid", gap: 11 }}>
              <div>
                <Pill tone={d.ky?.status === "closed" ? "green" : "amber"}>
                  {d.ky?.status === "closed" ? "Đã khóa sổ" : "Đang mở"}
                </Pill>
              </div>
              <div style={{ fontSize: 12.5, color: color.muted, lineHeight: 1.6 }}>
                {d.kiemTra?.detail || "Chưa có giao dịch nào trong kỳ."}
              </div>
              <div>
                <Button variant="ghost" onClick={() => onDoiTab?.("report")}
                        style={{ padding: "8px 14px", fontSize: 12.5 }}>
                  Sang phần đóng sổ
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
