import { useEffect, useMemo, useState } from "react";
import {
  dinhDangTien, ghiNhanThuTien, layCongNo, layDanhSachQuy, loiApi, moTaGon,
} from "../../services/financeService";
import { Button, Drawer, Field, Input, NoteStrip, Num } from "./v3/ui";
import { color, radius } from "./v3/theme";

/**
 * Ngăn kéo ghi nhận thu tiền — dựng theo bản thiết kế vista-export.
 *
 * Đúng vòng nghiệp vụ của tài liệu: Thu tiền -> Phân bổ vào từng khoản phải thu
 * -> Sổ giao dịch. KHÔNG có ô "còn thiếu" để gõ đè: người dùng nhập số tiền
 * thực nhận rồi chia vào các khoản đang nợ, số gốc không ai sửa được.
 *
 * Khác bản thiết kế một điểm: thiết kế chỉ phân bổ cho MỘT khoản đang chọn, ở
 * đây liệt kê MỌI khoản em đó đang nợ và tự đề xuất chia — phụ huynh thường nộp
 * trọn gói cho cả học phí lẫn tiền giáo trình trong một lần.
 */

const PHUONG_THUC = [
  ["cash", "Tiền mặt"],
  ["transfer", "Chuyển khoản"],
  ["card", "Thẻ / POS"],
  ["other", "Khác"],
];

const hom_nay = () => new Date().toISOString().slice(0, 10);

/** Tiền mặt -> quỹ tiền mặt; còn lại -> tài khoản ngân hàng. */
function hopVoiPhuongThuc(dsQuy, phuongThuc) {
  const loai = phuongThuc === "cash" ? "cash" : "bank";
  return dsQuy.find((q) => q.kind === loai) || dsQuy[0] || null;
}

export default function HopThuTien({ mo, hocVien, onDong, onXong }) {
  const [quy, setQuy] = useState([]);
  const [khoanNo, setKhoanNo] = useState([]);
  const [dangTai, setDangTai] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState("");

  const [ngay, setNgay] = useState(hom_nay);
  const [phuongThuc, setPhuongThuc] = useState("cash");
  const [taiKhoan, setTaiKhoan] = useState("");
  const [soTien, setSoTien] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [phanBo, setPhanBo] = useState({});

  useEffect(() => {
    if (!mo || !hocVien?.id) return undefined;
    let huy = false;
    setDangTai(true);
    setLoi("");
    Promise.all([
      layDanhSachQuy(),
      layCongNo({ student: hocVien.id, status: "con_no", page_size: 100 }),
    ])
      .then(([dsQuy, no]) => {
        if (huy) return;
        setQuy(dsQuy);
        setTaiKhoan((cu) => cu || String(hopVoiPhuongThuc(dsQuy, "cash")?.id || ""));
        const ds = Array.isArray(no) ? no : no?.results || [];
        setKhoanNo(ds);
        // Đề xuất trả hết các khoản đang nợ — đúng với thực tế phụ huynh nộp
        // trọn gói; muốn trả một phần thì sửa lại từng ô.
        const goiY = {};
        let tong = 0;
        ds.forEach((r) => {
          goiY[r.id] = String(r.balance);
          tong += Number(r.balance || 0);
        });
        setPhanBo(goiY);
        setSoTien(tong ? String(tong) : "");
      })
      .catch((e) => !huy && setLoi(loiApi(e, "Không tải được công nợ của học viên.")))
      .finally(() => !huy && setDangTai(false));
    return () => { huy = true; };
  }, [mo, hocVien?.id]);

  const tongPhanBo = useMemo(
    () => Object.values(phanBo).reduce((t, v) => t + (Number(v) || 0), 0),
    [phanBo],
  );
  const conThua = (Number(soTien) || 0) - tongPhanBo;

  // Chọn "Tiền mặt" mà quỹ vẫn là tài khoản ngân hàng thì giao dịch bị xếp nhầm
  // vào hàng chờ đối soát, rồi cuối tháng không bao giờ khớp được sao kê.
  const doiPhuongThuc = (m) => {
    setPhuongThuc(m);
    const hop = hopVoiPhuongThuc(quy, m);
    if (hop) setTaiKhoan(String(hop.id));
  };

  const luu = async () => {
    setLoi("");
    if (!(Number(soTien) > 0)) { setLoi("Chưa nhập số tiền thu."); return; }
    if (!taiKhoan) { setLoi("Chưa chọn quỹ / tài khoản nhận tiền."); return; }
    if (conThua < 0) {
      setLoi("Tổng phân bổ đang lớn hơn số tiền thu. Sửa lại các ô phân bổ.");
      return;
    }
    const allocations = Object.entries(phanBo)
      .map(([id, v]) => ({ receivable: Number(id), amount: Number(v) || 0 }))
      .filter((x) => x.amount > 0);

    setDangLuu(true);
    try {
      const pt = await ghiNhanThuTien({
        student: hocVien.id,
        amount: Number(soTien),
        paid_at: ngay,
        method: phuongThuc,
        account: Number(taiKhoan),
        reference: ghiChu,
        allocations,
      });
      onXong?.(
        `Đã thu ${dinhDangTien(soTien)} đ của ${hocVien.ten}`
        + (pt?.transaction_code ? ` — giao dịch ${pt.transaction_code}.` : "."),
      );
      onDong?.();
    } catch (e) {
      setLoi(loiApi(e, "Không ghi nhận được khoản thu."));
    } finally {
      setDangLuu(false);
    }
  };

  if (!mo) return null;

  const oTien = { padding: "8px 10px", fontSize: 13, textAlign: "right" };

  return (
    <Drawer
      title="Ghi nhận thu tiền"
      sub={hocVien?.ten ? `${hocVien.ten}${hocVien.lop ? ` — ${hocVien.lop}` : ""}` : ""}
      width={620}
      onClose={onDong}
      footer={(
        <>
          <Button variant="ghost" onClick={onDong}>Hủy</Button>
          <Button onClick={luu} disabled={dangLuu}>
            {dangLuu ? "Đang ghi..." : "Ghi nhận thu tiền"}
          </Button>
        </>
      )}
    >
      {loi ? (
        <div style={{
          background: color.redSoft, color: color.red, borderRadius: radius.md,
          padding: "11px 13px", fontSize: 13, marginBottom: 16, lineHeight: 1.5,
        }}>{loi}</div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Field label="Ngày thu">
          <Input type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} />
        </Field>
        <Field label="Phương thức">
          <select
            value={phuongThuc}
            onChange={(e) => doiPhuongThuc(e.target.value)}
            style={{
              width: "100%", background: "#fff", border: "1px solid " + color.borderStrong,
              borderRadius: radius.md, padding: "11px 12px", fontSize: 13.5, cursor: "pointer",
            }}
          >
            {PHUONG_THUC.map(([m, t]) => <option key={m} value={m}>{t}</option>)}
          </select>
        </Field>
        <Field label="Tài khoản nhận">
          <select
            value={taiKhoan}
            onChange={(e) => setTaiKhoan(e.target.value)}
            style={{
              width: "100%", background: "#fff", border: "1px solid " + color.borderStrong,
              borderRadius: radius.md, padding: "11px 12px", fontSize: 13.5, cursor: "pointer",
            }}
          >
            {quy.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
          </select>
        </Field>
        <Field label="Số tiền thu">
          <Input
            value={soTien}
            onChange={(e) => setSoTien(e.target.value.replace(/[^0-9]/g, ""))}
            style={{ textAlign: "right" }}
          />
        </Field>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Field label="Nội dung / mã tham chiếu">
          <Input
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            placeholder="Mã giao dịch trên sao kê, để đối soát cho nhanh"
          />
        </Field>
      </div>

      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 5 }}>Phân bổ thanh toán</div>
      <div style={{ fontSize: 12.5, color: color.muted, marginBottom: 14 }}>
        Ưu tiên công nợ cũ trước, có thể chia cho nhiều khoản.
      </div>

      <div style={{
        border: "1px solid " + color.border, borderRadius: radius.md,
        overflow: "hidden", marginBottom: 16,
      }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 0.9fr", gap: 12,
          background: color.subtle, padding: "10px 14px", fontSize: 12, color: color.muted,
          borderBottom: "1px solid " + color.border,
        }}>
          <div>Khoản phải thu</div>
          <div style={{ textAlign: "right" }}>Còn nợ</div>
          <div style={{ textAlign: "right" }}>Phân bổ</div>
          <div style={{ textAlign: "right" }}>Sau thu</div>
        </div>

        {dangTai ? (
          <div style={{ padding: "18px 14px", fontSize: 13, color: color.muted, textAlign: "center" }}>
            Đang tải công nợ...
          </div>
        ) : khoanNo.length === 0 ? (
          <div style={{ padding: "18px 14px", fontSize: 13, color: color.muted, lineHeight: 1.6 }}>
            Học viên này không còn khoản nào đang nợ. Tiền thu vào sẽ được ghi nhận là nộp trước,
            phân bổ sau khi lập khoản phải thu.
          </div>
        ) : khoanNo.map((r) => {
          const gan = Number(phanBo[r.id]) || 0;
          const sau = Math.max(Number(r.balance || 0) - gan, 0);
          return (
            <div key={r.id} style={{
              display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 0.9fr", gap: 12,
              padding: "12px 14px", alignItems: "center",
              borderTop: "1px solid " + color.border,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                  {r.kind_display} / {String(r.period_month).padStart(2, "0")}/{r.period_year}
                </div>
                <div style={{
                  fontSize: 11.5, color: color.faint, marginTop: 2,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {moTaGon(r.description) || r.classroom_name || "—"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}><Num>{dinhDangTien(r.balance)}</Num></div>
              <Input
                value={phanBo[r.id] ?? ""}
                onChange={(e) => setPhanBo((cu) => ({
                  ...cu, [r.id]: e.target.value.replace(/[^0-9]/g, ""),
                }))}
                style={oTien}
              />
              <div style={{ textAlign: "right" }}>
                <Num bold tone={sau === 0 ? "green" : "red"}>{dinhDangTien(sau)}</Num>
              </div>
            </div>
          );
        })}

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12,
          padding: "11px 14px", background: color.subtle,
          borderTop: "1px solid " + color.border, fontSize: 12.5,
        }}>
          <span>Đã phân bổ <Num bold>{dinhDangTien(tongPhanBo)}</Num> / {dinhDangTien(soTien || 0)} đ</span>
          <span style={{
            fontWeight: 700,
            color: conThua < 0 ? color.red : conThua > 0 ? color.amber : color.green,
          }}>
            {conThua < 0
              ? `Vượt ${dinhDangTien(-conThua)} đ`
              : conThua > 0
                ? `Còn ${dinhDangTien(conThua)} đ chưa phân bổ`
                : "Khớp"}
          </span>
        </div>
      </div>

      <NoteStrip>
        Sau khi ghi nhận: tạo <strong>Payment → Payment Allocation → Financial Transaction</strong> rồi
        cập nhật công nợ. Giao dịch chuyển khoản sẽ ở trạng thái <strong>Chờ đối soát</strong> cho tới
        khi khớp sao kê.
      </NoteStrip>
    </Drawer>
  );
}
