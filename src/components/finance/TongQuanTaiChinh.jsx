import { useCallback, useEffect, useState } from "react";
import {
  dinhDangTien, kiemTraDongSo, layCongNo, layDanhSachKy, layGiamTru,
  laySoGiaoDich, loiApi, tongHopCongNo, tongHopSo,
} from "../../services/financeService";
import { Badge, Button, Card } from "../../ui";
import Ico from "./Ico";
import TheSo, { HangThe } from "./TheSo";

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
      k: "khop", ico: "bank",
      ten: `${d.choKhop.length} giao dịch ngân hàng chờ đối soát`,
      mo: "Chưa khớp hết thì không đóng sổ được.",
      tab: "ledger", nut: "Mở sổ giao dịch",
    });
  }
  if (d.choDuyet?.length) {
    viec.push({
      k: "duyet", ico: "receipt",
      ten: `${d.choDuyet.length} khoản giảm trừ chờ duyệt`,
      mo: d.choDuyet.map((x) => x.reason).slice(0, 2).join("; "),
      tab: "tuition", nut: "Xem và duyệt",
    });
  }
  if (Number(d.congNo?.no_qua_han) > 0) {
    viec.push({
      k: "quahan", ico: "alert",
      ten: `Nợ quá hạn ${dinhDangTien(d.congNo.no_qua_han)} đ`,
      mo: d.quaHan?.length
        ? `Gồm ${d.quaHan.length}+ khoản, ví dụ ${d.quaHan[0].student_name}.`
        : "Cần nhắc phụ huynh.",
      tab: "tuition", nut: "Xem công nợ",
    });
  }

  return (
    <>
      {loi ? <div className="alert red" style={{ marginBottom: 12 }}><span>⚠️</span><div>{loi}</div></div> : null}

      <HangThe>
        <TheSo ico="receipt" mau="cam" nhan="Phải thu trong kỳ"
               so={dangTai ? "..." : `${dinhDangTien(d.congNo?.tong_phai_thu)} đ`}
               phu={`${d.congNo?.so_khoan || 0} khoản`} />
        <TheSo ico="check" mau="xanh" nhan="Đã thu"
               so={dangTai ? "..." : `${dinhDangTien(d.congNo?.tong_da_thu)} đ`}
               phu={Number(d.congNo?.tong_phai_thu) > 0
                 ? `${Math.round((Number(d.congNo.tong_da_thu) / Number(d.congNo.tong_phai_thu)) * 100)}% khoản phải thu`
                 : "—"} />
        <TheSo ico="alert" mau="do" nhan="Còn nợ"
               so={dangTai ? "..." : `${dinhDangTien(d.congNo?.tong_con_no)} đ`}
               phu={`Quá hạn ${dinhDangTien(d.congNo?.no_qua_han)} đ`} />
        <TheSo ico="wallet" mau="tim" nhan="Chi trong kỳ"
               so={dangTai ? "..." : `${dinhDangTien(d.so?.tong_chi)} đ`}
               phu={`Chênh lệch ${dinhDangTien(d.so?.chenh_lech)} đ`} />
      </HangThe>

      <div className="fin-21" style={{ marginTop: 16 }}>
        <Card title={<div><h3>Việc cần làm</h3>
          <div className="sub">Những gì đang chặn kỳ {String(thang).padStart(2, "0")}/{nam} chốt sổ.</div></div>}>
          {dangTai ? (
            <div className="fin-pb__trong">Đang tải...</div>
          ) : viec.length === 0 ? (
            <div className="fin-viec">
              <div className="fin-viec__d">
                <div className="fin-viec__ico fin-viec__ico--ok"><Ico ten="check" co={15} /></div>
                <div>
                  <b>Không còn việc tồn</b>
                  <small>Đã đối soát hết, không có khoản giảm trừ chờ duyệt và không có nợ quá hạn.</small>
                </div>
              </div>
            </div>
          ) : (
            <div className="fin-viec">
              {viec.map((v) => (
                <div className="fin-viec__d" key={v.k}>
                  <div className="fin-viec__ico fin-viec__ico--cho"><Ico ten={v.ico} co={15} /></div>
                  <div>
                    <b>{v.ten}</b>
                    <small>{v.mo}</small>
                    <div style={{ marginTop: 7 }}>
                      <Button size="sm" onClick={() => onDoiTab?.(v.tab)}>{v.nut}</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="fin-cot">
          <Card title={<div><h3>Quỹ & tài khoản</h3></div>}>
            {(d.so?.quy || []).length === 0 ? (
              <div className="fin-pb__trong">Chưa khai báo quỹ nào.</div>
            ) : (
              <div className="fin-viec">
                {(d.so?.quy || []).map((q) => (
                  <div className="fin-viec__d" key={q.id}>
                    <div className="fin-viec__ico fin-viec__ico--ok">
                      <Ico ten={q.kind === "bank" ? "bank" : "wallet"} co={15} />
                    </div>
                    <div>
                      <b>{q.name}</b>
                      <small className="fin-tien">{dinhDangTien(q.current_balance)} đ</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title={<div><h3>Tình trạng kỳ</h3></div>}>
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <Badge tone={d.ky?.status === "closed" ? "green" : "yellow"}>
                  {d.ky?.status === "closed" ? "Đã khóa sổ" : "Đang mở"}
                </Badge>
              </div>
              <p className="fin-mo" style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                {d.kiemTra?.detail || "Chưa có giao dịch nào trong kỳ."}
              </p>
              <div>
                <Button size="sm" onClick={() => onDoiTab?.("report")}>Sang phần đóng sổ</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
