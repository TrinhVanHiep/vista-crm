import { useEffect, useMemo, useState } from "react";
import apiClient from "../../services/apiClient";
import { dinhDangTien, loiApi, taoKhoanPhaiThu } from "../../services/financeService";
import { listClassroomsAll, listStudents } from "../../services/calendarService";
import { getFullName } from "../../utils/userFormatters";
import { Button, Drawer, Field, Input, NoteStrip } from "./v3/ui";
import { color, radius } from "./v3/theme";

/**
 * Lập học phí cho MỘT học viên (14/10/2026): học sinh vào giữa tháng / giữa lộ trình
 * không dùng được "Lập học phí cho lớp" (một mức cho cả lớp). Chọn em, lớp, ngày vào
 * học -> máy chủ đếm số buổi còn lại (trong tháng hoặc của lộ trình) và gợi ý học phí
 * trọn kỳ phổ biến của lớp; số tiền = trọn kỳ × buổi còn lại ÷ tổng buổi, làm tròn
 * nghìn, vẫn sửa tay được. Tạo một khoản phải thu bình thường (POST /receivables/).
 */

const homNay = () => new Date().toISOString().slice(0, 10);
const tronNghin = (v) => Math.round(Number(v || 0) / 1000) * 1000;
const idLop = (h) => (typeof h?.classroom === "object" ? h?.classroom?.id : h?.classroom) || "";

export default function NganKeoHocPhiCaNhan({ mo, thang, nam, onDong, onXong }) {
  const [dsHv, setDsHv] = useState([]);
  const [dsLop, setDsLop] = useState([]);
  const [loc, setLoc] = useState("");
  const [hv, setHv] = useState("");
  const [lop, setLop] = useState("");
  const [tuNgay, setTuNgay] = useState(homNay());
  const [goiY, setGoiY] = useState(null);
  const [cach, setCach] = useState("thang"); // thang | lo_trinh | tay
  const [tronKy, setTronKy] = useState("");
  const [soTien, setSoTien] = useState("");
  const [hanThu, setHanThu] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [loi, setLoi] = useState("");
  const [dangLuu, setDangLuu] = useState(false);

  useEffect(() => {
    if (!mo) return;
    setHv(""); setLop(""); setLoc(""); setGoiY(null); setSoTien(""); setTronKy(""); setHanThu(""); setLoi("");
    setTuNgay(homNay()); setCach("thang");
    Promise.all([listStudents({ page_size: 1000 }), listClassroomsAll()])
      .then(([h, l]) => {
        setDsHv(Array.isArray(h) ? h : h?.results || []);
        setDsLop(Array.isArray(l) ? l : l?.results || []);
      })
      .catch((e) => setLoi(loiApi(e, "Không tải được danh sách học viên / lớp.")));
  }, [mo]);

  const hvLoc = useMemo(() => {
    const k = loc.trim().toLowerCase();
    return k ? dsHv.filter((h) => `${getFullName(h.user)} ${h.student_code || ""}`.toLowerCase().includes(k)) : dsHv;
  }, [dsHv, loc]);

  // Đổi lớp / ngày vào học -> hỏi lại máy chủ số buổi còn lại và học phí phổ biến.
  useEffect(() => {
    if (!mo || !lop) { setGoiY(null); return undefined; }
    let huy = false;
    apiClient.get("/finances/receivables/goi-y-ca-nhan/", { params: { classroom: lop, month: thang, year: nam, tu_ngay: tuNgay } })
      .then(({ data }) => {
        if (huy) return;
        setGoiY(data);
        if (data.hoc_phi_pho_bien) setTronKy(String(Math.round(data.hoc_phi_pho_bien)));
      })
      .catch(() => !huy && setGoiY(null));
    return () => { huy = true; };
  }, [mo, lop, tuNgay, thang, nam]);

  const tuSo = cach === "lo_trinh" ? goiY?.con_lai_lo_trinh : goiY?.con_lai_thang;
  const mauSo = cach === "lo_trinh" ? goiY?.tong_lo_trinh : goiY?.so_buoi_thang;
  const deXuat = cach !== "tay" && Number(tronKy) > 0 && mauSo ? tronNghin((Number(tronKy) * tuSo) / mauSo) : null;

  useEffect(() => {
    if (deXuat != null) setSoTien(String(deXuat));
  }, [deXuat]);

  useEffect(() => {
    if (!goiY || cach === "tay") return;
    const ngay = tuNgay.split("-").reverse().slice(0, 2).join("/");
    setGhiChu(cach === "lo_trinh"
      ? `Vào học giữa lộ trình từ ${ngay}: ${tuSo}/${mauSo} buổi còn lại`
      : `Vào học từ ${ngay}: ${tuSo}/${mauSo} buổi trong tháng ${thang}/${nam}`);
  }, [goiY, cach, tuNgay, tuSo, mauSo, thang, nam]);

  const luu = async () => {
    setLoi("");
    if (!hv) { setLoi("Chưa chọn học viên."); return; }
    if (!(Number(soTien) > 0)) { setLoi("Chưa có số tiền học phí."); return; }
    setDangLuu(true);
    try {
      await taoKhoanPhaiThu({
        student_id: Number(hv), classroom: lop ? Number(lop) : null, kind: "tuition",
        amount: Number(soTien), period_month: thang, period_year: nam,
        due_date: hanThu || null, description: ghiChu.trim(),
      });
      const ten = getFullName(dsHv.find((h) => String(h.id) === String(hv))?.user);
      onXong?.(`Đã lập học phí ${dinhDangTien(soTien)} đ cho ${ten} — kỳ ${String(thang).padStart(2, "0")}/${nam}.`);
      onDong?.();
    } catch (e) {
      setLoi(loiApi(e, "Không lập được học phí."));
    } finally {
      setDangLuu(false);
    }
  };

  if (!mo) return null;
  const oChon = {
    width: "100%", background: "#fff", border: "1px solid " + color.borderStrong,
    borderRadius: radius.md, padding: "11px 12px", fontSize: 13.5, cursor: "pointer",
  };
  const nutCach = (ma, nhan, tat) => (
    <button type="button" disabled={tat} onClick={() => setCach(ma)}
            style={{ ...oChon, width: "auto", padding: "8px 12px", fontWeight: 600, opacity: tat ? 0.45 : 1,
                     borderColor: cach === ma ? color.orange : color.borderStrong,
                     background: cach === ma ? "#FFF3EC" : "#fff", color: cach === ma ? color.orange : color.ink }}>
      {nhan}
    </button>
  );

  return (
    <Drawer
      title="Lập học phí cá nhân"
      sub={`Học viên vào giữa tháng / giữa lộ trình — kỳ ${String(thang).padStart(2, "0")}/${nam}`}
      onClose={onDong}
      footer={(
        <>
          <Button variant="ghost" onClick={onDong}>Hủy</Button>
          <Button onClick={luu} disabled={dangLuu}>{dangLuu ? "Đang lập..." : "Lập khoản phải thu"}</Button>
        </>
      )}
    >
      {loi ? (
        <div style={{ background: color.redSoft, color: color.red, borderRadius: radius.md, padding: "11px 13px",
                      fontSize: 13, marginBottom: 16 }}>{loi}</div>
      ) : null}

      <div style={{ display: "grid", gap: 14, marginBottom: 16 }}>
        <Field label="Học viên">
          <Input placeholder="Gõ tên hoặc mã để lọc…" value={loc} onChange={(e) => setLoc(e.target.value)} />
          <select style={{ ...oChon, marginTop: 6 }} value={hv} onChange={(e) => {
            setHv(e.target.value);
            const h = dsHv.find((x) => String(x.id) === e.target.value);
            if (h && idLop(h)) setLop(String(idLop(h)));
          }}>
            <option value="">— Chọn học viên ({hvLoc.length}) —</option>
            {hvLoc.slice(0, 300).map((h) => (
              <option key={h.id} value={h.id}>{getFullName(h.user)}{h.student_code ? ` — ${h.student_code}` : ""}</option>
            ))}
          </select>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Lớp">
            <select style={oChon} value={lop} onChange={(e) => setLop(e.target.value)}>
              <option value="">— Chọn lớp —</option>
              {dsLop.map((l) => <option key={l.id} value={l.id}>{l.class_code || l.name}</option>)}
            </select>
          </Field>
          <Field label="Ngày bắt đầu học">
            <Input type="date" value={tuNgay} onChange={(e) => setTuNgay(e.target.value)} />
          </Field>
        </div>

        {goiY ? (
          <div style={{ background: "#FBF7F2", borderRadius: radius.md, padding: "10px 12px", fontSize: 13, lineHeight: 1.6 }}>
            Lớp {goiY.lop}: <b>{goiY.con_lai_thang}/{goiY.so_buoi_thang}</b> buổi còn lại trong tháng {thang}/{nam}
            {goiY.tong_lo_trinh ? <> · lộ trình <b>{goiY.con_lai_lo_trinh}/{goiY.tong_lo_trinh}</b> buổi còn lại (đã dạy {goiY.da_day_truoc})</> : " · lớp chưa khai tổng số buổi lộ trình"}
            {goiY.hoc_phi_pho_bien ? <> · học phí phổ biến của lớp <b>{dinhDangTien(goiY.hoc_phi_pho_bien)} đ</b></> : null}
          </div>
        ) : null}

        <Field label="Cách tính">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {nutCach("thang", "Theo buổi còn lại trong tháng", !goiY?.so_buoi_thang)}
            {nutCach("lo_trinh", "Theo buổi còn lại của lộ trình", !goiY?.tong_lo_trinh)}
            {nutCach("tay", "Nhập số tiền")}
          </div>
        </Field>
        {cach !== "tay" ? (
          <Field label={cach === "lo_trinh" ? "Học phí trọn lộ trình" : "Học phí trọn tháng"}>
            <Input value={tronKy} onChange={(e) => setTronKy(e.target.value.replace(/[^0-9]/g, ""))} style={{ textAlign: "right" }} />
          </Field>
        ) : null}
        <Field label={deXuat != null ? `Học phí phải thu (đề xuất ${dinhDangTien(deXuat)} đ)` : "Học phí phải thu"}>
          <Input value={soTien} onChange={(e) => setSoTien(e.target.value.replace(/[^0-9]/g, ""))} style={{ textAlign: "right", fontWeight: 700 }} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Hạn thu"><Input type="date" value={hanThu} onChange={(e) => setHanThu(e.target.value)} /></Field>
          <Field label="Nội dung khoản thu"><Input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} /></Field>
        </div>
      </div>

      <NoteStrip>
        Một em chỉ có một khoản học phí cho mỗi lớp trong một kỳ — nếu em đã được lập theo cả lớp, sửa hoặc giảm trừ
        khoản đó thay vì lập thêm. Muốn chia nhiều đợt / đặt cọc cho cả lộ trình thì dùng “Đăng ký học”.
      </NoteStrip>
    </Drawer>
  );
}
