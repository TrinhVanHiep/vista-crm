import { useEffect, useState } from "react";
import { loiApi, suaQuy, taoQuy } from "../../services/financeService";
import { Button, Field, Modal } from "../../ui";

/**
 * Khai báo / sửa quỹ tiền mặt và tài khoản ngân hàng.
 *
 * Mọi giao dịch đều bắt buộc trỏ vào một quỹ, nên chưa khai quỹ thì phân hệ Tài
 * chính mở ra được nhưng bấm thu tiền là lỗi. Trước đây không có đường nào tạo
 * quỹ trên giao diện, mà Django admin thì đã tắt — nghĩa là phải có người gõ
 * lệnh trên máy chủ. Màn này gỡ hẳn chỗ nghẽn đó.
 */

const LOAI = [["cash", "Quỹ tiền mặt"], ["bank", "Tài khoản ngân hàng"]];

// Mã dùng làm khoá ổn định trong CSDL nên chỉ nhận chữ thường, số và gạch nối.
const thanhMa = (ten) =>
  String(ten || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 30) || "quy-moi";

export default function HopQuy({ mo, quy, onDong, onXong }) {
  const sua = !!quy?.id;
  const [ten, setTen] = useState("");
  const [loai, setLoai] = useState("cash");
  const [nganHang, setNganHang] = useState("");
  const [soTk, setSoTk] = useState("");
  const [soDuDau, setSoDuDau] = useState("0");
  const [dangDung, setDangDung] = useState(true);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState("");

  useEffect(() => {
    if (!mo) return;
    setTen(quy?.name || "");
    setLoai(quy?.kind || "cash");
    setNganHang(quy?.bank_name || "");
    setSoTk(quy?.account_number || "");
    setSoDuDau(String(quy?.opening_balance ?? "0"));
    setDangDung(quy?.is_active !== false);
    setLoi("");
  }, [mo, quy]);

  const luu = async () => {
    setLoi("");
    if (!ten.trim()) { setLoi("Chưa đặt tên quỹ."); return; }
    if (loai === "bank" && !nganHang.trim()) {
      setLoi("Tài khoản ngân hàng thì phải ghi tên ngân hàng — thiếu nó thì đối soát sao kê không biết lấy của nhà băng nào.");
      return;
    }
    setDangLuu(true);
    try {
      const payload = {
        name: ten.trim(),
        kind: loai,
        bank_name: loai === "bank" ? nganHang.trim() : "",
        account_number: loai === "bank" ? soTk.trim() : "",
        is_active: dangDung,
      };
      if (sua) {
        // Số dư đầu kỳ đổi được, nhưng mã thì không: mã đã nằm trong các bản
        // ghi cũ, đổi là mất dấu.
        await suaQuy(quy.id, { ...payload, opening_balance: Number(soDuDau) || 0 });
      } else {
        await taoQuy({ ...payload, code: thanhMa(ten), opening_balance: Number(soDuDau) || 0 });
      }
      onXong?.(sua ? `Đã cập nhật ${ten.trim()}.` : `Đã thêm ${ten.trim()}.`);
      onDong?.();
    } catch (e) {
      setLoi(loiApi(e, "Không lưu được quỹ."));
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <Modal
      open={mo}
      onClose={onDong}
      title={sua ? "Sửa quỹ / tài khoản" : "Thêm quỹ / tài khoản"}
      subtitle="Mọi khoản thu chi đều phải ghi vào một quỹ cụ thể."
      footer={(
        <>
          <Button onClick={onDong}>Hủy</Button>
          <Button variant="primary" onClick={luu} loading={dangLuu}>Lưu</Button>
        </>
      )}
    >
      {loi ? <div className="alert red" style={{ marginBottom: 12 }}><span>⚠️</span><div>{loi}</div></div> : null}
      <div className="cls-form">
        <Field label="Tên hiển thị" required>
          <input
            type="text" value={ten} onChange={(e) => setTen(e.target.value)}
            placeholder="Ví dụ: Quỹ tiền mặt cơ sở Xuân Thu"
          />
        </Field>
        <Field label="Loại" required>
          <select value={loai} onChange={(e) => setLoai(e.target.value)} disabled={sua}>
            {LOAI.map(([m, t]) => <option key={m} value={m}>{t}</option>)}
          </select>
        </Field>
        {loai === "bank" ? (
          <>
            <Field label="Ngân hàng" required>
              <input type="text" value={nganHang} onChange={(e) => setNganHang(e.target.value)}
                     placeholder="Vietcombank, MB Bank..." />
            </Field>
            <Field label="Số tài khoản">
              <input type="text" value={soTk} onChange={(e) => setSoTk(e.target.value)} />
            </Field>
          </>
        ) : null}
        <Field
          label="Số dư đầu"
          hint="Số tiền đang có trước khi dùng phần mềm. Số dư hiện tại = số này cộng thu trừ chi."
        >
          <input type="number" step="1000" value={soDuDau}
                 onChange={(e) => setSoDuDau(e.target.value)} />
        </Field>
        <Field label="Trạng thái">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={dangDung}
                   onChange={(e) => setDangDung(e.target.checked)} />
            Đang sử dụng
          </label>
        </Field>
      </div>
      {sua ? (
        <p className="fin-mo" style={{ fontSize: 13, marginTop: 12, lineHeight: 1.6 }}>
          Quỹ đã phát sinh giao dịch thì không xoá được — muốn ngừng dùng thì bỏ
          tích “Đang sử dụng”, số liệu cũ vẫn còn nguyên để đối chiếu.
        </p>
      ) : null}
    </Modal>
  );
}
