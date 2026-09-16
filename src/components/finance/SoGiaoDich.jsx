import { useCallback, useEffect, useState } from "react";
import {
  ghiSo, layDanhSachQuy, layNhatKy, laySoGiaoDich, loiApi, rutGonM, soDayDu,
  tongHopSo, xacNhanKhop,
} from "../../services/financeService";
import HopQuy from "./HopQuy";
import NhapLieu from "./NhapLieu";
import { color, mono, radius } from "./v3/theme";
import {
  Button, Card, CardHead, Drawer, Field, Input, Num, Pill, Search, Select,
  StatCard, Table,
} from "./v3/ui";

/**
 * Phân hệ "Sổ giao dịch & Đối soát" — dựng theo bản thiết kế vista-export.
 *
 * Đây là nguồn dữ liệu trung tâm: mọi báo cáo lấy số từ bảng này chứ không tự
 * cộng lại từ các bảng nghiệp vụ. Nhờ vậy "báo cáo khớp sổ" là đúng theo thiết
 * kế chứ không phải nhờ may mắn.
 */

const COT = ["Mã GD", "Ngày giờ", "Loại", "Đối tượng / nội dung", "Thu", "Chi",
             "Quỹ / TK", "Đối soát", "Người tạo"];
const CANH = { 4: "right", 5: "right" };

const TONE_KHOP = { matched: "green", pending: "amber", not_required: "grey" };

const ngayGio = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  const hai = (n) => String(n).padStart(2, "0");
  return `${hai(d.getDate())}/${hai(d.getMonth() + 1)} ${hai(d.getHours())}:${hai(d.getMinutes())}`;
};

export default function SoGiaoDich({ thang, nam, onNotice }) {
  const [ds, setDs] = useState([]);
  const [tong, setTong] = useState(null);
  const [nhatKy, setNhatKy] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");
  const [taiLai, setTaiLai] = useState(0);

  const [tuKhoa, setTuKhoa] = useState("");
  const [loc, setLoc] = useState("");
  const [locKhop, setLocKhop] = useState("");
  const [moGhiSo, setMoGhiSo] = useState(false);
  const [suaQuyNao, setSuaQuyNao] = useState(null);
  const [moNhap, setMoNhap] = useState(false);

  const tai = useCallback(async () => {
    setDangTai(true);
    setLoi("");
    try {
      const [bang, th, log] = await Promise.all([
        laySoGiaoDich({
          month: thang, year: nam, direction: loc || undefined,
          reconcile_status: locKhop || undefined, page_size: 300,
        }),
        tongHopSo({ month: thang, year: nam }),
        layNhatKy({ page_size: 8 }),
      ]);
      setDs(Array.isArray(bang) ? bang : bang?.results || []);
      setTong(th);
      setNhatKy(Array.isArray(log) ? log : log?.results || []);
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

  const tu = tuKhoa.trim().toLowerCase();
  const hienThi = tu
    ? ds.filter((g) => `${g.code} ${g.description} ${g.student_name} ${g.account_name}`
        .toLowerCase().includes(tu))
    : ds;

  const hang = hienThi.map((g) => [
    <span key="ma" style={{ fontSize: 12.5, color: color.ink70 }}>{g.code}</span>,
    <span key="ng" style={{ fontSize: 12.5, color: color.muted }}>{ngayGio(g.occurred_at)}</span>,
    g.payment ? "Thu học phí" : (g.direction === "in" ? "Thu khác" : "Khoản chi"),
    g.student_name || g.description || "—",
    <Num key="thu" bold tone="green">{g.direction === "in" ? soDayDu(g.amount) : "—"}</Num>,
    <Num key="chi" tone={g.direction === "out" ? "red" : undefined}>
      {g.direction === "out" ? soDayDu(g.amount) : "—"}
    </Num>,
    g.account_name,
    g.reconcile_status === "pending" ? (
      <button key="k" type="button" onClick={() => khop(g)} style={{
        background: "none", border: 0, padding: 0, cursor: "pointer",
        color: color.orange, fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap",
      }}>Xác nhận khớp</button>
    ) : (
      <Pill key="p" tone={TONE_KHOP[g.reconcile_status] || "grey"}>{g.reconcile_display}</Pill>
    ),
    <span key="ai" style={{ fontSize: 12.5, color: color.muted }}>
      {g.created_by ? "Kế toán" : "Hệ thống"}
    </span>,
  ]);

  /* Tỉ lệ đã đối soát của từng quỹ — đúng khối "Tình trạng đối soát" của thiết kế. */
  const theoQuy = (tong?.quy || []).map((q) => {
    const cua = ds.filter((g) => g.account === q.id);
    const canKhop = cua.filter((g) => g.reconcile_status !== "not_required");
    const daKhop = canKhop.filter((g) => g.reconcile_status === "matched");
    return {
      id: q.id, ten: q.name,
      ti_le: canKhop.length ? Math.round((daKhop.length / canKhop.length) * 100) : 100,
      chua: canKhop.length - daKhop.length,
    };
  });
  const tongChua = tong?.chua_doi_soat || 0;
  const tienChua = ds
    .filter((g) => g.reconcile_status === "pending")
    .reduce((t, g) => t + Number(g.amount || 0), 0);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <Search placeholder="Tìm mã GD / nội dung / đối tượng" width={250}
                value={tuKhoa} onChange={setTuKhoa} />
        <Select width={200} value={loc} onChange={setLoc} options={[
          { value: "", label: "Tất cả loại giao dịch" },
          { value: "in", label: "Chỉ khoản thu" },
          { value: "out", label: "Chỉ khoản chi" },
        ]} />
        <Select width={190} value={locKhop} onChange={setLocKhop} options={[
          { value: "", label: "Mọi trạng thái đối soát" },
          { value: "pending", label: "Chờ khớp" },
          { value: "matched", label: "Đã khớp" },
          { value: "not_required", label: "Không cần đối soát" },
        ]} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <Button variant="outline" icon="doc" onClick={() => setMoNhap(true)}>
            Nhập khoản chi
          </Button>
          <Button icon="plus" onClick={() => setMoGhiSo(true)}>Ghi giao dịch</Button>
        </div>
      </div>

      {loi ? (
        <div style={{
          background: color.redSoft, color: color.red, borderRadius: radius.md,
          padding: "12px 14px", fontSize: 13, marginBottom: 14, lineHeight: 1.5,
        }}>{loi}</div>
      ) : null}

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, marginBottom: 14,
      }} className="fin-v3-the">
        <StatCard label="Tổng thu trong kỳ" icon="check" tone="green" valueColor="green"
                  value={`${rutGonM(tong?.tong_thu)} đ`}
                  note={`${tong?.so_giao_dich || 0} giao dịch`} />
        <StatCard label="Tổng chi trong kỳ" icon="wallet" tone="red" valueColor="red"
                  value={`${rutGonM(tong?.tong_chi)} đ`} note="Vận hành + nhân sự" />
        <StatCard label="Chênh lệch thu chi" icon="chart" tone="orange"
                  value={`${rutGonM(tong?.chenh_lech)} đ`} note="Thu trừ chi trong kỳ" />
        <StatCard label="Chờ đối soát" icon="bank" tone={tongChua ? "amber" : "green"}
                  value={`${tongChua} giao dịch`}
                  note={tongChua ? `${rutGonM(tienChua)} đ chưa khớp` : "Đã khớp hết"} />
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "minmax(0,1.85fr) minmax(0,1fr)",
        gap: 14, alignItems: "start",
      }} className="fin-v3-21">
        <Card style={{ paddingBottom: 20 }}>
          <CardHead
            title={`Sổ giao dịch ${String(thang).padStart(2, "0")}/${nam}`}
            sub="Nguồn dữ liệu tài chính trung tâm — mọi báo cáo lấy từ đây."
          />
          <div style={{ padding: "16px 22px 0" }}>
            <div style={{ border: "1px solid " + color.border, borderRadius: radius.md, overflow: "hidden" }}>
              {dangTai ? (
                <div style={{ padding: 28, textAlign: "center", fontSize: 13, color: color.muted }}>
                  Đang tải...
                </div>
              ) : hang.length === 0 ? (
                <div style={{ padding: 28, textAlign: "center", fontSize: 13, color: color.muted }}>
                  Chưa có giao dịch nào trong kỳ.
                </div>
              ) : (
                <Table columns={COT} rows={hang} align={CANH} />
              )}
            </div>
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card style={{ paddingBottom: 20 }}>
            <CardHead title="Tình trạng đối soát"
                      sub={`Kỳ ${String(thang).padStart(2, "0")}/${nam}`} />
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "16px 22px 0",
            }}>
              {theoQuy.map((q) => (
                <div key={q.id} style={{
                  border: "1px solid " + color.border, borderRadius: radius.md, padding: "13px 15px",
                }}>
                  <div style={{
                    fontSize: 12, color: color.muted,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{q.ten}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{q.ti_le}%</div>
                  <div style={{
                    height: 5, borderRadius: radius.pill, background: "#EDF1F6", marginTop: 10,
                  }}>
                    <div style={{
                      height: 5, borderRadius: radius.pill, width: `${q.ti_le}%`,
                      background: q.ti_le === 100 ? color.green : color.amber,
                    }} />
                  </div>
                </div>
              ))}
              <div style={{
                border: "1px solid " + color.border, borderRadius: radius.md, padding: "13px 15px",
              }}>
                <div style={{ fontSize: 12, color: color.muted }}>Chưa khớp</div>
                <div style={{
                  fontSize: 20, fontWeight: 800, marginTop: 4,
                  color: tongChua ? color.red : color.ink,
                }}>{tongChua} GD</div>
              </div>
              <div style={{
                border: "1px solid " + color.border, borderRadius: radius.md, padding: "13px 15px",
              }}>
                <div style={{ fontSize: 12, color: color.muted }}>Giá trị chưa khớp</div>
                <div style={{
                  fontSize: 20, fontWeight: 800, marginTop: 4,
                  color: tienChua ? color.amber : color.ink,
                }}>{rutGonM(tienChua)}</div>
              </div>
            </div>
          </Card>

          <Card style={{ paddingBottom: 18 }}>
            <CardHead title="Quỹ & tài khoản" action="Thêm quỹ"
                      onAction={() => setSuaQuyNao({})} />
            <div style={{ padding: "12px 22px 0" }}>
              {(tong?.quy || []).length === 0 ? (
                <div style={{ fontSize: 13, color: color.muted, lineHeight: 1.6 }}>
                  Chưa khai báo quỹ nào. Phải có ít nhất một quỹ thì mới ghi được thu chi.
                </div>
              ) : (tong?.quy || []).map((q, i) => (
                <div key={q.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 0",
                  borderTop: i === 0 ? 0 : "1px solid " + color.border,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{q.name}</div>
                    <div style={{ fontSize: 11.5, color: color.muted, marginTop: 2 }}>
                      {q.bank_name || "Quỹ tiền mặt"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {rutGonM(q.current_balance)} đ
                    </div>
                    <button type="button" onClick={() => setSuaQuyNao(q)} style={{
                      background: "none", border: 0, padding: 0, cursor: "pointer",
                      color: color.orange, fontSize: 11.5, fontWeight: 700, marginTop: 2,
                    }}>Sửa</button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ paddingBottom: 20 }}>
            <CardHead title="Nhật ký thao tác" sub="Chỉ ghi thêm, không sửa, không xóa." />
            <div style={{ padding: "16px 22px 0" }}>
              <div style={{
                background: color.navyDeep, borderRadius: radius.md, padding: 16,
                fontFamily: mono, fontSize: 11.5, lineHeight: 1.9, color: "#B9C4D6",
                whiteSpace: "pre-wrap", wordBreak: "break-word",
                maxHeight: 260, overflow: "auto",
              }}>
                {nhatKy.length === 0
                  ? "Chưa có thao tác nào."
                  : nhatKy.map((l) => {
                    const d = new Date(l.created_at);
                    const hai = (n) => String(n).padStart(2, "0");
                    return `${hai(d.getHours())}:${hai(d.getMinutes())}  ${l.actor_name} — ${l.action}`
                      + (l.detail ? ` — ${l.detail}` : "");
                  }).join("\n")}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <NganKeoGhiSo mo={moGhiSo} onDong={() => setMoGhiSo(false)} onXong={xong} />
      <HopQuy mo={!!suaQuyNao} quy={suaQuyNao?.id ? suaQuyNao : null}
              onDong={() => setSuaQuyNao(null)} onXong={xong} />
      <NhapLieu mo={moNhap} loaiBanDau="khoan-chi" thang={thang} nam={nam}
                onDong={() => setMoNhap(false)} onXong={xong} />
    </>
  );
}

/* ------------------------------------------------------- ghi giao dịch tay */

function NganKeoGhiSo({ mo, onDong, onXong }) {
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

  if (!mo) return null;

  const oChon = {
    width: "100%", background: "#fff", border: "1px solid " + color.borderStrong,
    borderRadius: radius.md, padding: "11px 12px", fontSize: 13.5, cursor: "pointer",
  };

  return (
    <Drawer
      title="Ghi giao dịch vào sổ"
      sub="Dùng cho khoản thu/chi không phát sinh từ học phí."
      onClose={onDong}
      footer={(
        <>
          <Button variant="ghost" onClick={onDong}>Hủy</Button>
          <Button onClick={luu} disabled={dangLuu}>{dangLuu ? "Đang ghi..." : "Ghi vào sổ"}</Button>
        </>
      )}
    >
      {loi ? (
        <div style={{
          background: color.redSoft, color: color.red, borderRadius: radius.md,
          padding: "11px 13px", fontSize: 13, marginBottom: 16,
        }}>{loi}</div>
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Loại">
          <select value={huong} onChange={(e) => setHuong(e.target.value)} style={oChon}>
            <option value="out">Chi</option>
            <option value="in">Thu</option>
          </select>
        </Field>
        <Field label="Số tiền">
          <Input value={soTien} onChange={(e) => setSoTien(e.target.value.replace(/[^0-9]/g, ""))}
                 style={{ textAlign: "right" }} />
        </Field>
        <Field label="Ngày">
          <Input type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} />
        </Field>
        <Field label="Quỹ / tài khoản">
          <select value={taiKhoan} onChange={(e) => setTaiKhoan(e.target.value)} style={oChon}>
            {quy.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ marginTop: 16 }}>
        <Field label="Nội dung">
          <Input value={noiDung} onChange={(e) => setNoiDung(e.target.value)}
                 placeholder="Ví dụ: tiền điện cơ sở tháng 9" />
        </Field>
      </div>
    </Drawer>
  );
}
