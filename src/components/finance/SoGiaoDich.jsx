import { useCallback, useEffect, useState } from "react";
import {
  dinhDangTien, ghiSo, layDanhSachQuy, laySoGiaoDich, loiApi, tongHopSo,
  xacNhanKhop,
} from "../../services/financeService";
import { Badge, Button, Card, Field, Modal } from "../../ui";
import { StatCard } from "./v3/ui";
import { Icon } from "./v3/icons";
import HopQuy from "./HopQuy";
import NhapLieu from "./NhapLieu";

/**
 * Phân hệ "Sổ giao dịch & Đối soát".
 *
 * Đây là nguồn dữ liệu trung tâm: mọi báo cáo lấy số từ bảng này chứ không tự
 * cộng lại từ các bảng nghiệp vụ. Nhờ vậy "báo cáo khớp sổ" là đúng theo thiết
 * kế chứ không phải nhờ may mắn.
 */

const TONE_KHOP = { matched: "green", pending: "yellow", not_required: "gray" };

const ngayGio = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} `
    + `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function SoGiaoDich({ thang, nam, onNotice }) {
  const [ds, setDs] = useState([]);
  const [tong, setTong] = useState(null);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");
  const [taiLai, setTaiLai] = useState(0);

  const [loc, setLoc] = useState("");          // hướng thu/chi
  const [locKhop, setLocKhop] = useState("");  // trạng thái đối soát
  const [moGhiSo, setMoGhiSo] = useState(false);
  const [suaQuyNao, setSuaQuyNao] = useState(null); // {} = thêm mới, {id..} = sửa
  const [moNhap, setMoNhap] = useState(false);

  const tai = useCallback(async () => {
    setDangTai(true);
    setLoi("");
    try {
      const [bang, th] = await Promise.all([
        laySoGiaoDich({
          month: thang, year: nam, direction: loc || undefined,
          reconcile_status: locKhop || undefined, page_size: 300,
        }),
        tongHopSo({ month: thang, year: nam }),
      ]);
      setDs(Array.isArray(bang) ? bang : bang?.results || []);
      setTong(th);
    } catch (e) {
      setLoi(loiApi(e, "Không tải được sổ giao dịch."));
    } finally {
      setDangTai(false);
    }
  }, [thang, nam, loc, locKhop, taiLai]);

  useEffect(() => { tai(); }, [tai]);

  const xong = (ln) => { onNotice?.(ln); setTaiLai((v) => v + 1); };

  const khop = async (gd) => {
    try {
      await xacNhanKhop(gd.id);
      xong(`Đã xác nhận khớp giao dịch ${gd.code}.`);
    } catch (e) {
      setLoi(loiApi(e, "Không xác nhận được."));
    }
  };

  return (
    <>
      {loi ? <div className="alert red" style={{ marginBottom: 12 }}><span>⚠️</span><div>{loi}</div></div> : null}

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14,
      }}>
        <StatCard label="Tổng thu trong kỳ" icon="check" tone="green" valueColor="green"
                  value={`${dinhDangTien(tong?.tong_thu)} đ`}
                  note={`${tong?.so_giao_dich || 0} giao dịch`} />
        <StatCard label="Tổng chi trong kỳ" icon="wallet" tone="red" valueColor="red"
                  value={`${dinhDangTien(tong?.tong_chi)} đ`} />
        <StatCard label="Chênh lệch thu chi" icon="chart" tone="orange"
                  value={`${dinhDangTien(tong?.chenh_lech)} đ`} />
        <StatCard label="Chờ đối soát" icon="bank" tone={tong?.chua_doi_soat ? "amber" : "green"}
                  value={`${tong?.chua_doi_soat || 0} giao dịch`}
                  note={tong?.chua_doi_soat ? "Phải khớp hết mới đóng sổ được" : "Đã khớp hết"} />
      </div>

      <div className="fin-bar" style={{ marginTop: 16 }}>
        <select value={loc} onChange={(e) => setLoc(e.target.value)}>
          <option value="">Tất cả giao dịch</option>
          <option value="in">Chỉ khoản thu</option>
          <option value="out">Chỉ khoản chi</option>
        </select>
        <select value={locKhop} onChange={(e) => setLocKhop(e.target.value)}>
          <option value="">Mọi trạng thái đối soát</option>
          <option value="pending">Chờ khớp</option>
          <option value="matched">Đã khớp</option>
          <option value="not_required">Không cần đối soát</option>
        </select>
        <div className="fin-bar__cuoi">
          <Button onClick={() => setMoNhap(true)}>Nhập khoản chi từ Excel</Button>
          <Button variant="primary" onClick={() => setMoGhiSo(true)}>Ghi giao dịch</Button>
        </div>
      </div>

      <div className="fin-21">
        <Card title={<div><h3>Sổ giao dịch {String(thang).padStart(2, "0")}/{nam}</h3>
          <div className="sub">Nguồn dữ liệu tài chính trung tâm — mọi báo cáo lấy số từ đây.</div></div>}>
          <div className="tbl-wrap">
            <table className="tbl ui-table" style={{ minWidth: "min(800px, 100%)" }}>
              <thead>
                <tr>
                  <th>Mã giao dịch</th><th>Nội dung</th>
                  <th className="t-right">Thu</th><th className="t-right">Chi</th>
                  <th>Đối soát</th><th></th>
                </tr>
              </thead>
              <tbody>
                {dangTai ? (
                  <tr><td colSpan={6} className="ui-table__state">Đang tải...</td></tr>
                ) : ds.length === 0 ? (
                  <tr><td colSpan={6} className="ui-table__state">Chưa có giao dịch nào trong kỳ.</td></tr>
                ) : ds.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <b>{g.code}</b>
                      <small className="fin-phu">{ngayGio(g.occurred_at)}</small>
                    </td>
                    <td>
                      {g.student_name || g.description || "—"}
                      <small className="fin-phu">{g.account_name}</small>
                    </td>
                    <td className="t-right fin-tien fin-tien--thu">
                      {g.direction === "in" ? dinhDangTien(g.amount) : "—"}
                    </td>
                    <td className="t-right fin-tien fin-tien--chi">
                      {g.direction === "out" ? dinhDangTien(g.amount) : "—"}
                    </td>
                    <td><Badge tone={TONE_KHOP[g.reconcile_status] || "gray"}>{g.reconcile_display}</Badge></td>
                    <td>
                      {g.reconcile_status === "pending" ? (
                        <Button size="sm" variant="primary" onClick={() => khop(g)}>Xác nhận khớp</Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="fin-cot">
          <Card
            title={<div><h3>Số dư quỹ & tài khoản</h3>
              <div className="sub">Số dư đầu cộng thu trừ chi.</div></div>}
            action={<Button size="sm" onClick={() => setSuaQuyNao({})}>Thêm quỹ</Button>}
          >
            {(tong?.quy || []).length === 0 ? (
              <div className="fin-pb__trong">
                Chưa khai báo quỹ nào. Phải có ít nhất một quỹ thì mới ghi được thu chi.
              </div>
            ) : (
              <div className="fin-viec">
                {(tong?.quy || []).map((q) => (
                  <div className="fin-viec__d" key={q.id}>
                    <div className="fin-viec__ico fin-viec__ico--ok">
                      {q.kind === "bank" ? <Icon.bank size={15} /> : <Icon.wallet size={15} />}
                    </div>
                    <div>
                      <b>{q.name}</b>
                      <small className="fin-tien">{dinhDangTien(q.current_balance)} đ</small>
                      {q.bank_name ? (
                        <small className="fin-mo">
                          {q.bank_name}{q.account_number ? ` — ${q.account_number}` : ""}
                        </small>
                      ) : null}
                      <div style={{ marginTop: 6 }}>
                        <Button size="sm" onClick={() => setSuaQuyNao(q)}>Sửa</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title={<div><h3>Về đối soát tự động</h3></div>}>
            <p className="fin-mo" style={{ fontSize: 13, lineHeight: 1.65, margin: 0 }}>
              Hiện sao kê phải khớp tay. Phần nhập sao kê và gợi ý khớp tự động nằm ở
              giai đoạn sau; dù có gợi ý thì <b>kế toán vẫn là người xác nhận cuối cùng</b>,
              đúng nguyên tắc của tài liệu: máy gợi ý, người phê duyệt.
            </p>
          </Card>
        </div>
      </div>

      <HopGhiSo mo={moGhiSo} onDong={() => setMoGhiSo(false)} onXong={xong} />
      <HopQuy
        mo={!!suaQuyNao} quy={suaQuyNao?.id ? suaQuyNao : null}
        onDong={() => setSuaQuyNao(null)} onXong={xong}
      />
      <NhapLieu
        mo={moNhap} loaiBanDau="khoan-chi" thang={thang} nam={nam}
        onDong={() => setMoNhap(false)} onXong={xong}
      />
    </>
  );
}

function HopGhiSo({ mo, onDong, onXong }) {
  const [quy, setQuy] = useState([]);
  const [huong, setHuong] = useState("out");
  const [soTien, setSoTien] = useState("");
  const [ngay, setNgay] = useState(() => new Date().toISOString().slice(0, 10));
  const [taiKhoan, setTaiKhoan] = useState("");
  const [noiDung, setNoiDung] = useState("");
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState("");

  useEffect(() => {
    if (!mo) return;
    layDanhSachQuy()
      .then((d) => { setQuy(d); setTaiKhoan((c) => c || String(d[0]?.id || "")); })
      .catch(() => setQuy([]));
  }, [mo]);

  const luu = async () => {
    setLoi("");
    if (!(Number(soTien) > 0)) { setLoi("Chưa nhập số tiền."); return; }
    if (!taiKhoan) { setLoi("Chưa chọn quỹ / tài khoản."); return; }
    if (!noiDung.trim()) { setLoi("Chưa ghi nội dung giao dịch."); return; }
    setDangLuu(true);
    try {
      const gd = await ghiSo({
        direction: huong, amount: Number(soTien), occurred_at: ngay,
        account: Number(taiKhoan), description: noiDung.trim(),
      });
      onXong?.(`Đã ghi giao dịch ${gd.code}.`);
      onDong?.();
    } catch (e) {
      setLoi(loiApi(e, "Không ghi được giao dịch."));
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <Modal
      open={mo} onClose={onDong}
      title="Ghi giao dịch vào sổ"
      subtitle="Dùng cho khoản thu/chi không phát sinh từ học phí."
      footer={(
        <>
          <Button onClick={onDong}>Hủy</Button>
          <Button variant="primary" onClick={luu} loading={dangLuu}>Ghi vào sổ</Button>
        </>
      )}
    >
      {loi ? <div className="alert red" style={{ marginBottom: 12 }}><span>⚠️</span><div>{loi}</div></div> : null}
      <div className="cls-form">
        <Field label="Loại" required>
          <select value={huong} onChange={(e) => setHuong(e.target.value)}>
            <option value="out">Chi</option>
            <option value="in">Thu</option>
          </select>
        </Field>
        <Field label="Số tiền" required>
          <input type="number" min="0" step="1000" value={soTien}
                 onChange={(e) => setSoTien(e.target.value)} />
        </Field>
        <Field label="Ngày" required>
          <input type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} />
        </Field>
        <Field label="Quỹ / tài khoản" required>
          <select value={taiKhoan} onChange={(e) => setTaiKhoan(e.target.value)}>
            {quy.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
          </select>
        </Field>
        <Field label="Nội dung" required>
          <input type="text" value={noiDung} onChange={(e) => setNoiDung(e.target.value)}
                 placeholder="Ví dụ: tiền điện cơ sở tháng 9" />
        </Field>
      </div>
    </Modal>
  );
}
