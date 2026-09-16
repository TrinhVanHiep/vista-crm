import { useCallback, useEffect, useState } from "react";
import {
  duyetGiamTru, lapPhaiThuHangLoat, layCongNo, layGiamTru,
  loiApi, rutGonM, soDayDu, taoGiamTru, tongHopCongNo,
} from "../../services/financeService";
import { listClassroomsAll } from "../../services/calendarService";
import HopThuTien from "./HopThuTien";
import NhapLieu from "./NhapLieu";
import { color, radius } from "./v3/theme";
import {
  Button, Card, CardHead, Drawer, Field, Input, NoteStrip, Num, Pill,
  Search, Select, StatCard, Table,
} from "./v3/ui";

/**
 * Phân hệ "Học phí & Công nợ", dựng theo bản thiết kế vista-export.
 *
 * Mỗi dòng là MỘT khoản phải thu, không phải một học viên: cùng một em tháng 9
 * có thể nợ học phí và nợ tiền giáo trình, hai khoản đó hạn thu và lý do giảm
 * trừ khác nhau nên không gộp được vào một dòng.
 */

const COT = ["Học viên", "Lớp", "Khoản thu", "Kỳ", "Phát sinh", "Điều chỉnh", "Đã thu", "Còn nợ", ""];
const CANH = { 4: "right", 5: "right", 6: "right", 7: "right", 8: "right" };

const TONE = { open: "red", partial: "amber", paid: "green", cancelled: "grey" };

const LOAI_GIAM = [
  ["discount", "Giảm học phí"],
  ["scholarship", "Học bổng"],
  ["reserve", "Bảo lưu"],
  ["transfer", "Chuyển kỳ"],
  ["cancel", "Hủy khoản phải thu"],
];

const LOC = [
  ["con_no", "Trạng thái: Còn nợ"],
  ["", "Trạng thái: Tất cả"],
  ["paid", "Đã thu đủ"],
  ["cancelled", "Đã hủy"],
];

const nutLink = {
  background: "none", border: 0, padding: 0, cursor: "pointer",
  color: color.orange, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
};

export default function HocPhiCongNo({ thang, nam, onNotice, laQuanTri }) {
  const [ds, setDs] = useState([]);
  const [tong, setTong] = useState(null);
  const [choDuyet, setChoDuyet] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");
  const [taiLai, setTaiLai] = useState(0);

  const [tuKhoa, setTuKhoa] = useState("");
  const [trangThai, setTrangThai] = useState("con_no");

  const [dangThu, setDangThu] = useState(null);
  const [moLapHangLoat, setMoLapHangLoat] = useState(false);
  const [dangGiam, setDangGiam] = useState(null);
  const [moNhap, setMoNhap] = useState(false);

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

  // Gõ tới đâu gọi API tới đó thì mỗi phím một lượt gọi; chờ người dùng gõ xong.
  useEffect(() => {
    const h = setTimeout(tai, tuKhoa ? 400 : 0);
    return () => clearTimeout(h);
  }, [tai, tuKhoa]);

  const xong = (ln) => { onNotice?.(ln); setTaiLai((v) => v + 1); };

  const duyet = async (dc) => {
    try {
      await duyetGiamTru(dc.id);
      xong(`Đã duyệt ${dc.kind_display.toLowerCase()} ${soDayDu(dc.amount)} đ.`);
    } catch (e) {
      setLoi(loiApi(e, "Không duyệt được khoản giảm trừ."));
    }
  };

  const trongHan = Math.max(
    Number(tong?.tong_con_no || 0) - Number(tong?.no_qua_han || 0), 0);
  const tyLeThu = Number(tong?.tong_phai_thu) > 0
    ? Math.round((Number(tong.tong_da_thu) / Number(tong.tong_phai_thu)) * 100)
    : 0;

  const hang = ds.map((r) => [
    <div key="hv">
      <div style={{ fontWeight: 700 }}>{r.student_name}</div>
      <div style={{ fontSize: 11.5, color: color.faint, marginTop: 2 }}>
        {r.due_date ? `Hạn ${r.due_date.slice(8)}/${r.due_date.slice(5, 7)}` : "Chưa đặt hạn thu"}
      </div>
    </div>,
    r.classroom_name || "—",
    r.kind_display,
    `${String(r.period_month).padStart(2, "0")}/${r.period_year}`,
    <Num bold>{soDayDu(r.amount)}</Num>,
    <Num tone={Number(r.adjusted_amount) ? "red" : undefined}>
      {Number(r.adjusted_amount) ? `-${soDayDu(r.adjusted_amount)}` : 0}
    </Num>,
    <Num>{soDayDu(r.paid_amount)}</Num>,
    <Num bold tone={Number(r.balance) > 0 ? "red" : "green"}>{soDayDu(r.balance)}</Num>,
    r.status === "cancelled" ? (
      <Pill tone="grey">Đã hủy</Pill>
    ) : Number(r.balance) > 0 ? (
      <div style={{ display: "flex", gap: 14, justifyContent: "flex-end" }}>
        <button type="button" style={nutLink} onClick={() => setDangThu({
          id: r.student, ten: r.student_name, lop: r.classroom_name,
        })}>Ghi nhận thu</button>
        <button type="button" style={{ ...nutLink, color: color.muted }}
                onClick={() => setDangGiam(r)}>Giảm trừ</button>
      </div>
    ) : (
      <span style={{ fontSize: 12.5, color: color.faint }}>Đã tất toán</span>
    ),
  ]);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <Search
          placeholder="Tìm học viên / nội dung khoản thu"
          width={250}
          value={tuKhoa}
          onChange={setTuKhoa}
        />
        <Select
          options={LOC.map(([value, label]) => ({ value, label }))}
          value={trangThai}
          onChange={setTrangThai}
          width={190}
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <Button variant="ghost" icon="doc" onClick={() => setMoNhap(true)}>Nhập từ Excel</Button>
          <Button icon="plus" onClick={() => setMoLapHangLoat(true)}>Lập học phí cho lớp</Button>
        </div>
      </div>

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
        <StatCard label="Tổng phát sinh phải thu" icon="doc" tone="orange"
                  value={`${rutGonM(tong?.tong_phai_thu)} đ`}
                  note="Học phí + phí khác" />
        <StatCard label="Đã phân bổ thanh toán" icon="check" tone="green" valueColor="green"
                  value={`${rutGonM(tong?.tong_da_thu)} đ`}
                  note={tong?.tong_phai_thu > 0 ? `${tyLeThu}% tổng phải thu` : "—"} />
        <StatCard label="Còn trong hạn" icon="wallet" tone="blue"
                  value={`${rutGonM(trongHan)} đ`}
                  note={`${tong?.so_khoan || 0} khoản phải thu`} />
        <StatCard label="Quá hạn" icon="warn" tone="red" valueColor="red"
                  value={`${rutGonM(tong?.no_qua_han)} đ`}
                  note={choDuyet.length ? `${choDuyet.length} giảm trừ chờ duyệt` : "Chưa có khoản quá hạn"} />
      </div>

      <Card style={{ paddingBottom: 20 }}>
        <CardHead
          title={`Học phí & công nợ học viên — ${String(thang).padStart(2, "0")}/${nam}`}
          sub="Mỗi dòng là một khoản phải thu; thanh toán được phân bổ, không sửa trực tiếp số gốc."
        />
        <div style={{ padding: "16px 22px 0" }}>
          <div style={{ border: "1px solid " + color.border, borderRadius: radius.md, overflow: "hidden" }}>
            {dangTai ? (
              <div style={{ padding: 28, textAlign: "center", fontSize: 13, color: color.muted }}>
                Đang tải...
              </div>
            ) : hang.length === 0 ? (
              <div style={{ padding: 28, textAlign: "center", fontSize: 13, color: color.muted, lineHeight: 1.6 }}>
                Chưa có khoản phải thu nào trong kỳ này.
                <br />Bấm “Lập học phí cho lớp” hoặc “Nhập từ Excel” để tạo.
              </div>
            ) : (
              <Table columns={COT} rows={hang} align={CANH} />
            )}
          </div>
          <div style={{ marginTop: 14 }}>
            <NoteStrip>
              <strong>Nguyên tắc kiểm soát:</strong> giảm học phí, học bổng, bảo lưu, chuyển kỳ
              và hủy khoản phải thu đều phải tạo <strong>khoản giảm trừ</strong> riêng, có lý do,
              người lập và người duyệt — không sửa thẳng số gốc.
              <br />
              <span style={{ opacity: .85 }}>
                Hoàn tiền mặt cho phụ huynh <strong>chưa làm được trên phần mềm</strong>: hiện phải
                ghi thành một khoản chi ở “Sổ giao dịch &amp; Đối soát”.
              </span>
            </NoteStrip>
          </div>
        </div>
      </Card>

      {/* Khối duyệt giảm trừ không có trong bản thiết kế nhưng là việc có thật.
          Đặt DƯỚI bảng để bảng trải hết chiều ngang đúng như thiết kế, thay vì
          bóp nó lại còn 3/4. */}
      {choDuyet.length ? (
        <Card style={{ marginTop: 14, paddingBottom: 18 }}>
          <CardHead
            title="Giảm trừ chờ duyệt"
            sub="Người lập không tự duyệt được khoản của mình."
            action={`${choDuyet.length} phiếu`}
          />
          <div style={{
            padding: "14px 22px 0", display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(285px,1fr))", gap: 12,
          }}>
            {choDuyet.map((dc) => (
              <div key={dc.id} style={{
                border: "1px solid " + color.border, borderRadius: radius.md, padding: "12px 14px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{dc.kind_display}</div>
                  <Num bold tone="red">{soDayDu(dc.amount)}</Num>
                </div>
                <div style={{ fontSize: 12, color: color.muted, marginTop: 4, lineHeight: 1.5 }}>{dc.reason}</div>
                <div style={{ fontSize: 11.5, color: color.faint, marginTop: 4 }}>
                  Người lập: {dc.created_by_name || "—"}
                </div>
                {laQuanTri ? (
                  <div style={{ marginTop: 10 }}>
                    <Button style={{ padding: "7px 14px", fontSize: 12.5 }} onClick={() => duyet(dc)}>
                      Duyệt
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <HopThuTien mo={!!dangThu} hocVien={dangThu} onDong={() => setDangThu(null)} onXong={xong} />
      <NganKeoLapHangLoat
        mo={moLapHangLoat} thang={thang} nam={nam}
        onDong={() => setMoLapHangLoat(false)} onXong={xong}
      />
      <NganKeoGiamTru khoan={dangGiam} onDong={() => setDangGiam(null)} onXong={xong} />
      <NhapLieu
        mo={moNhap} loaiBanDau="phai-thu" thang={thang} nam={nam}
        onDong={() => setMoNhap(false)} onXong={xong}
      />
    </>
  );
}

/* ------------------------------------------------ lập học phí cho cả lớp */

function NganKeoLapHangLoat({ mo, thang, nam, onDong, onXong }) {
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

  if (!mo) return null;

  return (
    <Drawer
      title="Lập học phí cho cả lớp"
      sub={`Kỳ ${String(thang).padStart(2, "0")}/${nam}`}
      onClose={onDong}
      footer={(
        <>
          <Button variant="ghost" onClick={onDong}>Hủy</Button>
          <Button onClick={luu} disabled={dangLuu}>
            {dangLuu ? "Đang lập..." : "Lập khoản phải thu"}
          </Button>
        </>
      )}
    >
      {loi ? (
        <div style={{
          background: color.redSoft, color: color.red, borderRadius: radius.md,
          padding: "11px 13px", fontSize: 13, marginBottom: 16,
        }}>{loi}</div>
      ) : null}

      <div style={{ display: "grid", gap: 16, marginBottom: 20 }}>
        <Field label="Lớp">
          <select value={chonLop} onChange={(e) => setChonLop(e.target.value)} style={{
            width: "100%", background: "#fff", border: "1px solid " + color.borderStrong,
            borderRadius: radius.md, padding: "11px 12px", fontSize: 13.5, cursor: "pointer",
          }}>
            <option value="">— Chọn lớp —</option>
            {lop.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        <Field label="Học phí mỗi em">
          <Input value={soTien} onChange={(e) => setSoTien(e.target.value.replace(/[^0-9]/g, ""))}
                 style={{ textAlign: "right" }} />
        </Field>
        <Field label="Hạn thu">
          <Input type="date" value={hanThu} onChange={(e) => setHanThu(e.target.value)} />
        </Field>
      </div>

      <NoteStrip>
        Hệ thống bỏ qua em đã nghỉ học và em đã có khoản phải thu cùng loại trong kỳ, nên bấm
        nhầm hai lần cũng không sinh ra hai khoản nợ.
      </NoteStrip>
    </Drawer>
  );
}

/* ---------------------------------------------------------- lập giảm trừ */

function NganKeoGiamTru({ khoan, onDong, onXong }) {
  const [loai, setLoai] = useState("discount");
  const [soTien, setSoTien] = useState("");
  const [lyDo, setLyDo] = useState("");
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState("");

  useEffect(() => {
    if (khoan) { setLoai("discount"); setSoTien(""); setLyDo(""); setLoi(""); }
  }, [khoan]);

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

  if (!khoan) return null;

  return (
    <Drawer
      title="Lập khoản giảm trừ"
      sub={`${khoan.student_name} — ${khoan.kind_display} ${String(khoan.period_month).padStart(2, "0")}/${khoan.period_year}`}
      onClose={onDong}
      footer={(
        <>
          <Button variant="ghost" onClick={onDong}>Hủy</Button>
          <Button onClick={luu} disabled={dangLuu}>{dangLuu ? "Đang gửi..." : "Gửi duyệt"}</Button>
        </>
      )}
    >
      {loi ? (
        <div style={{
          background: color.redSoft, color: color.red, borderRadius: radius.md,
          padding: "11px 13px", fontSize: 13, marginBottom: 16,
        }}>{loi}</div>
      ) : null}

      <div style={{ display: "grid", gap: 16, marginBottom: 20 }}>
        <Field label="Loại">
          <select value={loai} onChange={(e) => setLoai(e.target.value)} style={{
            width: "100%", background: "#fff", border: "1px solid " + color.borderStrong,
            borderRadius: radius.md, padding: "11px 12px", fontSize: 13.5, cursor: "pointer",
          }}>
            {LOAI_GIAM.map(([m, t]) => <option key={m} value={m}>{t}</option>)}
          </select>
        </Field>
        <Field label={`Số tiền giảm — tối đa ${soDayDu(khoan.balance)} đ`}>
          <Input value={soTien} onChange={(e) => setSoTien(e.target.value.replace(/[^0-9]/g, ""))}
                 style={{ textAlign: "right" }} />
        </Field>
        <Field label="Lý do">
          <Input value={lyDo} onChange={(e) => setLyDo(e.target.value)}
                 placeholder="Ví dụ: giảm 10% cho anh chị em ruột học cùng trung tâm" />
        </Field>
      </div>

      <NoteStrip>
        Khoản giảm trừ chỉ trừ vào công nợ <strong>sau khi được duyệt</strong>. Mọi thao tác đều
        được ghi vào nhật ký kèm người lập và người duyệt.
      </NoteStrip>
    </Drawer>
  );
}
