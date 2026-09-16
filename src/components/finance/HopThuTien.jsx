import { useEffect, useMemo, useState } from "react";
import {
  dinhDangTien, ghiNhanThuTien, layCongNo, layDanhSachQuy, loiApi,
} from "../../services/financeService";
import { Badge, Button, Field, Modal } from "../../ui";

/**
 * Hộp ghi nhận thu tiền — đúng vòng nghiệp vụ của spec:
 *   Thu tiền -> Phân bổ vào từng khoản phải thu -> Sổ giao dịch.
 *
 * Điểm khác biệt so với bản cũ: KHÔNG có ô "còn thiếu" để gõ đè. Người dùng
 * nhập số tiền thực nhận rồi chia vào các khoản đang nợ; số gốc không ai sửa
 * được. Muốn bớt tiền phải lập khoản giảm trừ có lý do.
 */

const PHUONG_THUC = [
  ["cash", "Tiền mặt"],
  ["transfer", "Chuyển khoản"],
  ["card", "Thẻ"],
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
  const [phanBo, setPhanBo] = useState({}); // { [receivableId]: "số tiền" }

  useEffect(() => {
    if (!mo || !hocVien?.id) return;
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
        // Mặc định đề xuất trả hết các khoản đang nợ — đúng với thực tế phụ
        // huynh nộp trọn gói; muốn trả một phần thì sửa lại từng ô.
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

  /* Chọn "Tiền mặt" mà quỹ vẫn là tài khoản ngân hàng thì giao dịch bị xếp
     nhầm vào danh sách chờ đối soát, rồi cuối tháng không bao giờ khớp được với
     sao kê. Đổi phương thức là gợi ý luôn quỹ tương ứng; người dùng vẫn đổi lại
     được nếu trung tâm có cách làm khác. */
  const doiPhuongThuc = (m) => {
    setPhuongThuc(m);
    const hop = hopVoiPhuongThuc(quy, m);
    if (hop) setTaiKhoan(String(hop.id));
  };

  const tongPhanBo = useMemo(
    () => Object.values(phanBo).reduce((t, v) => t + (Number(v) || 0), 0),
    [phanBo],
  );
  const conThua = (Number(soTien) || 0) - tongPhanBo;

  const datPhanBo = (id, gt) => setPhanBo((cu) => ({ ...cu, [id]: gt }));

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

  return (
    <Modal
      open={mo}
      onClose={onDong}
      title="Ghi nhận thu tiền"
      subtitle={hocVien?.ten ? `${hocVien.ten}${hocVien.lop ? ` — lớp ${hocVien.lop}` : ""}` : ""}
      size="lg"
      footer={(
        <>
          <Button onClick={onDong}>Hủy</Button>
          <Button variant="primary" onClick={luu} loading={dangLuu}>
            Ghi nhận thu tiền
          </Button>
        </>
      )}
    >
      {loi ? <div className="alert red" style={{ marginBottom: 12 }}><span>⚠️</span><div>{loi}</div></div> : null}

      <div className="cls-form" style={{ marginBottom: 16 }}>
        <Field label="Ngày thu" required>
          <input type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} />
        </Field>
        <Field label="Phương thức" required>
          <select value={phuongThuc} onChange={(e) => doiPhuongThuc(e.target.value)}>
            {PHUONG_THUC.map(([m, t]) => <option key={m} value={m}>{t}</option>)}
          </select>
        </Field>
        <Field
          label="Quỹ / tài khoản nhận"
          required
          hint="Chuyển khoản vào tài khoản ngân hàng sẽ được đưa vào danh sách chờ đối soát."
        >
          <select value={taiKhoan} onChange={(e) => setTaiKhoan(e.target.value)}>
            {quy.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
          </select>
        </Field>
        <Field label="Số tiền thực nhận" required>
          <input
            type="number" min="0" step="1000" value={soTien}
            onChange={(e) => setSoTien(e.target.value)}
          />
        </Field>
        <Field label="Nội dung / mã tham chiếu" hint="Ví dụ mã giao dịch trên sao kê, để đối soát cho nhanh.">
          <input type="text" value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
        </Field>
      </div>

      <div className="fin-pb">
        <div className="fin-pb__hd">
          <div>Khoản phải thu</div>
          <div style={{ textAlign: "right" }}>Còn nợ</div>
          <div style={{ textAlign: "right" }}>Phân bổ</div>
          <div style={{ textAlign: "right" }}>Sau thu</div>
        </div>

        {dangTai ? (
          <div className="fin-pb__trong">Đang tải công nợ...</div>
        ) : khoanNo.length === 0 ? (
          <div className="fin-pb__trong">
            Học viên này không còn khoản nào đang nợ. Tiền thu vào sẽ được ghi nhận
            là nộp trước, phân bổ sau khi lập khoản phải thu.
          </div>
        ) : (
          khoanNo.map((r) => {
            const gan = Number(phanBo[r.id]) || 0;
            const sau = Number(r.balance || 0) - gan;
            return (
              <div className="fin-pb__row" key={r.id}>
                <div>
                  <b>{r.kind_display} {String(r.period_month).padStart(2, "0")}/{r.period_year}</b>
                  <small>{r.description || r.classroom_name || "—"}</small>
                </div>
                <div className="fin-tien" style={{ textAlign: "right" }}>
                  {dinhDangTien(r.balance)}
                </div>
                <div>
                  <input
                    type="number" min="0" max={r.balance} step="1000"
                    value={phanBo[r.id] ?? ""}
                    onChange={(e) => datPhanBo(r.id, e.target.value)}
                  />
                </div>
                <div className="fin-tien" style={{ textAlign: "right" }}>
                  {sau <= 0
                    ? <Badge tone="green">Hết nợ</Badge>
                    : dinhDangTien(sau)}
                </div>
              </div>
            );
          })
        )}

        <div className="fin-pb__tong">
          <span>Đã phân bổ <b>{dinhDangTien(tongPhanBo)}</b> / {dinhDangTien(soTien || 0)} đ</span>
          <span className={conThua < 0 ? "fin-tien--chi" : conThua > 0 ? "fin-mo" : "fin-tien--thu"}>
            {conThua < 0
              ? `Vượt ${dinhDangTien(-conThua)} đ`
              : conThua > 0
                ? `Còn ${dinhDangTien(conThua)} đ chưa phân bổ (ghi nhận nộp trước)`
                : "Khớp"}
          </span>
        </div>
      </div>
    </Modal>
  );
}
