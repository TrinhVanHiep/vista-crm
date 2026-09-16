import { useCallback, useEffect, useMemo, useState } from "react";
import {
  dinhDangTien, duyetGiamTru, lapPhaiThuHangLoat, layCongNo, layGiamTru,
  loiApi, taoGiamTru, tongHopCongNo,
} from "../../services/financeService";
import { listClassroomsAll } from "../../services/calendarService";
import { Badge, Button, Card, Field, Kpi, KpiGrid, Modal } from "../../ui";
import HopThuTien from "./HopThuTien";

/**
 * Phân hệ "Học phí & Công nợ".
 *
 * Mỗi dòng là MỘT khoản phải thu, không phải một học viên: cùng một em tháng 9
 * có thể nợ học phí và nợ tiền giáo trình, hai khoản đó có hạn thu và lý do
 * giảm trừ khác nhau nên không gộp được vào một dòng.
 */

const TONE = { open: "red", partial: "yellow", paid: "green", cancelled: "gray" };

const LOAI_GIAM = [
  ["discount", "Giảm học phí"],
  ["scholarship", "Học bổng"],
  ["reserve", "Bảo lưu"],
  ["transfer", "Chuyển kỳ"],
  ["cancel", "Hủy khoản phải thu"],
];

export default function HocPhiCongNo({ thang, nam, onNotice, laQuanTri }) {
  const [ds, setDs] = useState([]);
  const [tong, setTong] = useState(null);
  const [choDuyet, setChoDuyet] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");
  const [taiLai, setTaiLai] = useState(0);

  const [tuKhoa, setTuKhoa] = useState("");
  const [trangThai, setTrangThai] = useState("con_no");

  const [dangThu, setDangThu] = useState(null);      // học viên đang thu tiền
  const [moLapHangLoat, setMoLapHangLoat] = useState(false);
  const [dangGiam, setDangGiam] = useState(null);    // khoản đang lập giảm trừ

  const tai = useCallback(async () => {
    setDangTai(true);
    setLoi("");
    try {
      const [bang, th, gt] = await Promise.all([
        layCongNo({ month: thang, year: nam, status: trangThai, search: tuKhoa, page_size: 200 }),
        tongHopCongNo({ month: thang, year: nam }),
        layGiamTru({ pending: 1, page_size: 50 }),
      ]);
      setDs(Array.isArray(bang) ? bang : bang?.results || []);
      setTong(th);
      setChoDuyet(Array.isArray(gt) ? gt : gt?.results || []);
    } catch (e) {
      setLoi(loiApi(e, "Không tải được dữ liệu công nợ."));
    } finally {
      setDangTai(false);
    }
  }, [thang, nam, trangThai, tuKhoa, taiLai]);

  // Gõ tới đâu gọi API tới đó thì mỗi phím một lượt gọi.
  useEffect(() => {
    const h = setTimeout(tai, tuKhoa ? 400 : 0);
    return () => clearTimeout(h);
  }, [tai, tuKhoa]);

  const xong = (loiNhan) => { onNotice?.(loiNhan); setTaiLai((v) => v + 1); };

  const duyet = async (dc) => {
    try {
      await duyetGiamTru(dc.id);
      xong(`Đã duyệt ${dc.kind_display.toLowerCase()} ${dinhDangTien(dc.amount)} đ.`);
    } catch (e) {
      setLoi(loiApi(e, "Không duyệt được khoản giảm trừ."));
    }
  };

  return (
    <>
      {loi ? <div className="alert red" style={{ marginBottom: 12 }}><span>⚠️</span><div>{loi}</div></div> : null}

      <KpiGrid cols={4}>
        <Kpi ico="🧾" icoClass="orange" label="Tổng phải thu"
             value={`${dinhDangTien(tong?.tong_phai_thu)} đ`}
             sub={`${tong?.so_khoan || 0} khoản trong kỳ`} />
        <Kpi ico="✅" icoClass="green" label="Đã thu"
             value={`${dinhDangTien(tong?.tong_da_thu)} đ`}
             sub={tong?.tong_phai_thu > 0
               ? `${Math.round((Number(tong.tong_da_thu) / Number(tong.tong_phai_thu)) * 100)}% khoản phải thu`
               : "—"} />
        <Kpi ico="⏳" icoClass="red" label="Còn nợ"
             value={`${dinhDangTien(tong?.tong_con_no)} đ`}
             sub={`Quá hạn ${dinhDangTien(tong?.no_qua_han)} đ`} />
        <Kpi ico="✂️" icoClass="purple" label="Giảm trừ đã duyệt"
             value={`${dinhDangTien(tong?.tong_giam_tru)} đ`}
             sub={choDuyet.length ? `${choDuyet.length} khoản chờ duyệt` : "Không có khoản chờ duyệt"} />
      </KpiGrid>

      <div className="fin-bar" style={{ marginTop: 16 }}>
        <input
          type="search" placeholder="Tìm học viên, nội dung khoản thu..."
          value={tuKhoa} onChange={(e) => setTuKhoa(e.target.value)}
        />
        <select value={trangThai} onChange={(e) => setTrangThai(e.target.value)}>
          <option value="con_no">Đang còn nợ</option>
          <option value="">Tất cả trạng thái</option>
          <option value="paid">Đã thu đủ</option>
          <option value="cancelled">Đã hủy</option>
        </select>
        <div className="fin-bar__cuoi">
          <Button variant="primary" onClick={() => setMoLapHangLoat(true)}>
            Lập học phí cho lớp
          </Button>
        </div>
      </div>

      <div className="fin-21">
        <Card
          title={<div><h3>Khoản phải thu {String(thang).padStart(2, "0")}/{nam}</h3>
            <div className="sub">Số tiền gốc không bị ghi đè: thu tiền sinh phân bổ, giảm tiền sinh khoản giảm trừ có lý do.</div></div>}
        >
          <div className="tbl-wrap">
            <table className="tbl ui-table fin-bang-no" style={{ minWidth: "min(860px, 100%)" }}>
              <thead>
                <tr>
                  <th>Học viên</th><th>Khoản</th>
                  <th className="t-right">Phát sinh</th>
                  <th className="t-right">Giảm trừ</th>
                  <th className="t-right">Đã thu</th>
                  <th className="t-right">Còn lại</th>
                  <th>Trạng thái</th><th></th>
                </tr>
              </thead>
              <tbody>
                {dangTai ? (
                  <tr><td colSpan={8} className="ui-table__state">Đang tải...</td></tr>
                ) : ds.length === 0 ? (
                  <tr><td colSpan={8} className="ui-table__state">
                    Chưa có khoản phải thu nào trong kỳ này. Bấm “Lập học phí cho lớp” để tạo.
                  </td></tr>
                ) : ds.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.student_name}</b>
                      {r.classroom_name ? <small className="fin-phu">Lớp {r.classroom_name}</small> : null}
                    </td>
                    <td>{r.kind_display}</td>
                    <td className="t-right fin-tien">{dinhDangTien(r.amount)}</td>
                    <td className="t-right fin-tien fin-mo">
                      {Number(r.adjusted_amount) ? `-${dinhDangTien(r.adjusted_amount)}` : "—"}
                    </td>
                    <td className="t-right fin-tien fin-tien--thu">
                      {Number(r.paid_amount) ? dinhDangTien(r.paid_amount) : "—"}
                    </td>
                    <td className="t-right fin-tien fin-tien--no">{dinhDangTien(r.balance)}</td>
                    <td><Badge tone={TONE[r.status] || "gray"}>{r.status_display}</Badge></td>
                    <td>
                      <div className="cls-roster__nut">
                        {r.status !== "paid" && r.status !== "cancelled" ? (
                          <>
                            <Button size="sm" variant="primary"
                              onClick={() => setDangThu({
                                id: r.student, ten: r.student_name, lop: r.classroom_name,
                              })}>
                              Thu tiền
                            </Button>
                            <Button size="sm" onClick={() => setDangGiam(r)}>Giảm trừ</Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="fin-cot">
          <Card title={<div><h3>Giảm trừ chờ duyệt</h3>
            <div className="sub">Người lập không tự duyệt được khoản của mình.</div></div>}>
            {choDuyet.length === 0 ? (
              <div className="fin-pb__trong">Không có khoản nào chờ duyệt.</div>
            ) : (
              <div className="fin-viec">
                {choDuyet.map((dc) => (
                  <div className="fin-viec__d" key={dc.id}>
                    <div className="fin-viec__ico fin-viec__ico--cho">⏳</div>
                    <div>
                      <b>{dc.kind_display} — {dinhDangTien(dc.amount)} đ</b>
                      <small>{dc.reason}</small>
                      <small className="fin-mo">Người lập: {dc.created_by_name || "—"}</small>
                      {laQuanTri ? (
                        <div style={{ marginTop: 7 }}>
                          <Button size="sm" variant="primary" onClick={() => duyet(dc)}>Duyệt</Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <HopThuTien
        mo={!!dangThu} hocVien={dangThu}
        onDong={() => setDangThu(null)}
        onXong={xong}
      />
      <HopLapHangLoat
        mo={moLapHangLoat} thang={thang} nam={nam}
        onDong={() => setMoLapHangLoat(false)} onXong={xong}
      />
      <HopGiamTru
        khoan={dangGiam}
        onDong={() => setDangGiam(null)} onXong={xong}
      />
    </>
  );
}

/* ------------------------------------------------ lập học phí cho cả lớp */

function HopLapHangLoat({ mo, thang, nam, onDong, onXong }) {
  const [lop, setLop] = useState([]);
  const [chonLop, setChonLop] = useState("");
  const [soTien, setSoTien] = useState("");
  const [hanThu, setHanThu] = useState("");
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState("");

  useEffect(() => {
    if (!mo) return;
    listClassroomsAll({ page_size: 300 })
      .then((kq) => setLop(Array.isArray(kq) ? kq : kq?.results || []))
      .catch(() => setLop([]));
  }, [mo]);

  const luu = async () => {
    setLoi("");
    if (!chonLop) { setLoi("Chưa chọn lớp."); return; }
    if (!(Number(soTien) > 0)) { setLoi("Chưa nhập học phí."); return; }
    setDangLuu(true);
    try {
      const kq = await lapPhaiThuHangLoat({
        classroom: Number(chonLop), period_month: thang, period_year: nam,
        amount: Number(soTien), due_date: hanThu || null,
      });
      onXong?.(kq.detail);
      onDong?.();
    } catch (e) {
      setLoi(loiApi(e, "Không lập được khoản phải thu."));
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <Modal
      open={mo} onClose={onDong}
      title="Lập học phí cho cả lớp"
      subtitle={`Kỳ ${String(thang).padStart(2, "0")}/${nam}`}
      footer={(
        <>
          <Button onClick={onDong}>Hủy</Button>
          <Button variant="primary" onClick={luu} loading={dangLuu}>Lập khoản phải thu</Button>
        </>
      )}
    >
      {loi ? <div className="alert red" style={{ marginBottom: 12 }}><span>⚠️</span><div>{loi}</div></div> : null}
      <div className="cls-form">
        <Field label="Lớp" required>
          <select value={chonLop} onChange={(e) => setChonLop(e.target.value)}>
            <option value="">— Chọn lớp —</option>
            {lop.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        <Field label="Học phí mỗi em" required>
          <input type="number" min="0" step="1000" value={soTien}
                 onChange={(e) => setSoTien(e.target.value)} />
        </Field>
        <Field label="Hạn thu" hint="Quá hạn mà chưa thu đủ sẽ được đếm vào ô “nợ quá hạn”.">
          <input type="date" value={hanThu} onChange={(e) => setHanThu(e.target.value)} />
        </Field>
      </div>
      <p className="fin-mo" style={{ fontSize: 13, marginTop: 12, lineHeight: 1.6 }}>
        Hệ thống bỏ qua em đã nghỉ học và em đã có khoản phải thu cùng loại trong kỳ,
        nên bấm nhầm hai lần cũng không sinh ra hai khoản nợ.
      </p>
    </Modal>
  );
}

/* ------------------------------------------------------- lập giảm trừ */

function HopGiamTru({ khoan, onDong, onXong }) {
  const [loai, setLoai] = useState("discount");
  const [soTien, setSoTien] = useState("");
  const [lyDo, setLyDo] = useState("");
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState("");

  useEffect(() => {
    if (khoan) { setLoai("discount"); setSoTien(""); setLyDo(""); setLoi(""); }
  }, [khoan]);

  const toiDa = useMemo(() => Number(khoan?.balance || 0), [khoan]);

  const luu = async () => {
    setLoi("");
    if (!(Number(soTien) > 0)) { setLoi("Chưa nhập số tiền giảm."); return; }
    if (!lyDo.trim()) { setLoi("Phải ghi lý do — khoản giảm trừ nào cũng cần giải trình."); return; }
    setDangLuu(true);
    try {
      await taoGiamTru({
        receivable: khoan.id, kind: loai, amount: Number(soTien), reason: lyDo.trim(),
      });
      onXong?.("Đã lập khoản giảm trừ, đang chờ tầng quản trị duyệt.");
      onDong?.();
    } catch (e) {
      setLoi(loiApi(e, "Không lập được khoản giảm trừ."));
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <Modal
      open={!!khoan} onClose={onDong}
      title="Lập khoản giảm trừ"
      subtitle={khoan ? `${khoan.student_name} — ${khoan.kind_display} ${String(khoan.period_month).padStart(2, "0")}/${khoan.period_year}` : ""}
      footer={(
        <>
          <Button onClick={onDong}>Hủy</Button>
          <Button variant="primary" onClick={luu} loading={dangLuu}>Gửi duyệt</Button>
        </>
      )}
    >
      {loi ? <div className="alert red" style={{ marginBottom: 12 }}><span>⚠️</span><div>{loi}</div></div> : null}
      <div className="cls-form">
        <Field label="Loại" required>
          <select value={loai} onChange={(e) => setLoai(e.target.value)}>
            {LOAI_GIAM.map(([m, t]) => <option key={m} value={m}>{t}</option>)}
          </select>
        </Field>
        <Field label="Số tiền giảm" required hint={`Tối đa ${dinhDangTien(toiDa)} đ (phần chưa thu).`}>
          <input type="number" min="0" max={toiDa} step="1000" value={soTien}
                 onChange={(e) => setSoTien(e.target.value)} />
        </Field>
        <Field label="Lý do" required hint="Ghi rõ để sau này đối soát còn giải trình được.">
          <input type="text" value={lyDo} onChange={(e) => setLyDo(e.target.value)}
                 placeholder="Ví dụ: giảm 10% cho anh chị em ruột học cùng trung tâm" />
        </Field>
      </div>
      <p className="fin-mo" style={{ fontSize: 13, marginTop: 12, lineHeight: 1.6 }}>
        Khoản giảm trừ chỉ trừ vào công nợ sau khi được duyệt. Mọi thao tác đều
        được ghi vào nhật ký kèm người lập và người duyệt.
      </p>
    </Modal>
  );
}
