import { useEffect, useMemo, useState } from "react";
import { dangKyHoc, dinhDangTien, loiApi } from "../../services/financeService";
import { listClassroomsAll, listStudents } from "../../services/calendarService";
import { Button, Drawer, Field, Input, NoteStrip } from "./v3/ui";
import { color, radius } from "./v3/theme";
import { khoaNgay } from "../../utils/khoangThoiGian";
import { getFullName } from "../../utils/userFormatters";

/**
 * Đăng ký học: ghi danh vào lớp + đặt cọc + chia học phí thành nhiều đợt.
 *
 * Một lần bấm sinh ra bốn thứ ở hai phân hệ (bản ghi ghi danh, khoản cọc, đợt 1,
 * đợt 2), nên toàn bộ đi bằng MỘT lệnh gọi `/enrollments/dang-ky/` — backend gói
 * trong một transaction. Nếu để giao diện gọi bốn lần thì chỉ cần lần thứ ba lỗi
 * là có em đã ghi danh nhưng chỉ nợ nửa số tiền, không ai biết.
 *
 * Cọc là khoản RIÊNG, không trừ vào học phí: học phí vẫn chia đủ trên tổng giá
 * lộ trình. Bảng xem trước ở dưới nói rõ điều đó bằng con số, vì đây chính là
 * chỗ người dùng dễ hiểu ngược.
 */

const nhanKyTu = (ngay, themThang) => {
  const d = new Date(ngay);
  if (Number.isNaN(d.getTime())) return "--";
  const tong = d.getMonth() + Number(themThang || 0);
  const thang = ((tong % 12) + 12) % 12 + 1;
  const nam = d.getFullYear() + Math.floor(tong / 12);
  return `${String(thang).padStart(2, "0")}/${nam}`;
};

/** Chia đợt GIỐNG HỆT backend: dồn phần lẻ vào đợt đầu, tổng luôn khớp.
 *  Lệch công thức với backend là bảng xem trước hiện một số, lưu xong ra số khác. */
function chiaDot(tong, soDot) {
  const xu = Math.round(Number(tong || 0) * 100);
  const n = Math.max(1, Number(soDot) || 1);
  const moi = Math.floor(xu / n);
  const ds = Array(n).fill(moi);
  ds[0] = xu - moi * (n - 1);
  return ds.map((x) => x / 100);
}

export default function NganKeoDangKyHoc({ mo, onDong, onXong }) {
  const [dsLop, setDsLop] = useState([]);
  const [dsHocVien, setDsHocVien] = useState([]);
  const [dangTai, setDangTai] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState("");

  const [hocVien, setHocVien] = useState("");
  const [lop, setLop] = useState("");
  const [ngay, setNgay] = useState(() => khoaNgay(new Date()));
  const [tongHocPhi, setTongHocPhi] = useState("");
  const [soDot, setSoDot] = useState("2");
  const [cachThang, setCachThang] = useState("2");
  const [tienCoc, setTienCoc] = useState("");
  const [maGoi, setMaGoi] = useState("");
  const [ghiChu, setGhiChu] = useState("");

  useEffect(() => {
    if (!mo) return undefined;
    let huy = false;
    setDangTai(true);
    setLoi("");
    // Cùng lý do với HopThuTien: ngăn kéo dùng lại cho mọi lần ghi danh, không
    // dọn thì lần sau kế thừa học viên / lớp / số tiền của lần trước.
    setHocVien("");
    setLop("");
    setNgay(khoaNgay(new Date()));
    setTongHocPhi("");
    setSoDot("2");
    setCachThang("2");
    setTienCoc("");
    setMaGoi("");
    setGhiChu("");
    // page_size = 1000 là ĐÚNG TRẦN của UserPagination (max_page_size). Production
    // đang có 490 học viên; để 500 thì chỉ còn cách trần 10 em, vượt qua là danh
    // sách bị cắt ÂM THẦM và người dùng tưởng em đó chưa có hồ sơ. Khi nào vượt
    // 1000 thì phải đổi sang ô tìm kiếm gõ-để-lọc chứ không nâng số tiếp được nữa.
    Promise.all([listClassroomsAll(), listStudents({ page_size: 1000 })])
      .then(([lops, hvs]) => {
        if (huy) return;
        setDsLop(Array.isArray(lops) ? lops : lops?.results || []);
        setDsHocVien(Array.isArray(hvs) ? hvs : hvs?.results || []);
      })
      .catch((e) => !huy && setLoi(loiApi(e, "Không tải được danh sách lớp / học viên.")))
      .finally(() => !huy && setDangTai(false));
    return () => { huy = true; };
  }, [mo]);

  const cacDot = useMemo(() => chiaDot(tongHocPhi, soDot), [tongHocPhi, soDot]);
  const tongPhaiThu = Number(tongHocPhi || 0) + Number(tienCoc || 0);

  const luu = async () => {
    setLoi("");
    if (!hocVien) { setLoi("Chưa chọn học viên."); return; }
    if (!lop) { setLoi("Chưa chọn lớp."); return; }
    if (!(Number(tongHocPhi) > 0)) { setLoi("Chưa nhập tổng học phí của lộ trình."); return; }

    setDangLuu(true);
    try {
      const kq = await dangKyHoc({
        student: Number(hocVien),
        classroom: Number(lop),
        tong_hoc_phi: Number(tongHocPhi),
        ngay_ghi_danh: ngay,
        so_dot: Number(soDot) || 2,
        cach_thang: Number(cachThang) || 0,
        tien_coc: Number(tienCoc) || 0,
        ma_goi: maGoi,
        ghi_chu: ghiChu,
      });
      const soKhoan = (kq?.khoan_phai_thu || []).length;
      onXong?.(
        `Đã ghi danh ${kq?.student_name || ""} vào ${kq?.classroom_name || "lớp"}`
        + ` — lập ${soKhoan} khoản phải thu.`,
      );
      onDong?.();
    } catch (e) {
      setLoi(loiApi(e, "Không ghi danh được."));
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
      title="Đăng ký học"
      sub="Ghi danh vào lớp, đặt cọc và chia học phí thành các đợt"
      width={640}
      onClose={onDong}
      footer={(
        <>
          <Button variant="ghost" onClick={onDong}>Hủy</Button>
          <Button onClick={luu} disabled={dangLuu || dangTai}>
            {dangLuu ? "Đang ghi danh..." : "Ghi danh"}
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
        <Field label="Học viên">
          <select style={oChon} value={hocVien} onChange={(e) => setHocVien(e.target.value)}>
            <option value="">{dangTai ? "Đang tải..." : "— Chọn học viên —"}</option>
            {dsHocVien.map((h) => (
              <option key={h.id} value={h.id}>
                {getFullName(h.user)}
                {h.student_code ? ` — ${h.student_code}` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Lớp">
          <select style={oChon} value={lop} onChange={(e) => setLop(e.target.value)}>
            <option value="">{dangTai ? "Đang tải..." : "— Chọn lớp —"}</option>
            {dsLop.map((l) => (
              <option key={l.id} value={l.id}>
                {l.class_code ? `${l.class_code} — ${l.name}` : l.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ngày ghi danh">
          <Input type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} />
        </Field>
        <Field label="Mã gói học phí">
          <Input value={maGoi} onChange={(e) => setMaGoi(e.target.value)} placeholder="VD: KID20" />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Field label="Tổng học phí lộ trình">
          <Input
            value={tongHocPhi}
            onChange={(e) => setTongHocPhi(e.target.value.replace(/[^0-9]/g, ""))}
            style={{ textAlign: "right" }}
            placeholder="0"
          />
        </Field>
        <Field label="Tiền cọc giữ chỗ">
          <Input
            value={tienCoc}
            onChange={(e) => setTienCoc(e.target.value.replace(/[^0-9]/g, ""))}
            style={{ textAlign: "right" }}
            placeholder="0 — không thu cọc"
          />
        </Field>
        <Field label="Số đợt đóng học phí">
          <select style={oChon} value={soDot} onChange={(e) => setSoDot(e.target.value)}>
            {[1, 2, 3, 4, 6, 12].map((n) => (
              <option key={n} value={n}>{n} đợt</option>
            ))}
          </select>
        </Field>
        <Field label="Khoảng cách giữa các đợt">
          <select style={oChon} value={cachThang} onChange={(e) => setCachThang(e.target.value)}>
            {[0, 1, 2, 3, 4, 6].map((n) => (
              <option key={n} value={n}>{n === 0 ? "Cùng một kỳ" : `${n} tháng`}</option>
            ))}
          </select>
        </Field>
      </div>

      <NoteStrip>
        Cọc là khoản <b>riêng</b>, không trừ vào học phí. Học phí vẫn chia đủ trên
        tổng giá lộ trình; cọc hoàn lại khi kết thúc, giữ lại nếu bỏ học giữa khoá.
      </NoteStrip>

      {Number(tongHocPhi) > 0 ? (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
            Sẽ lập {cacDot.length + (Number(tienCoc) > 0 ? 1 : 0)} khoản phải thu
          </div>
          <div style={{
            border: "1px solid " + color.border, borderRadius: radius.md, overflow: "hidden",
          }}>
            {Number(tienCoc) > 0 ? (
              <div style={hangXem(true)}>
                <span>Cọc giữ chỗ</span>
                <span style={{ color: color.muted, fontSize: 12.5 }}>
                  đến hạn {ngay ? ngay.split("-").reverse().join("/") : "--"}
                </span>
                <b style={{ textAlign: "right" }}>{dinhDangTien(tienCoc)} đ</b>
              </div>
            ) : null}
            {cacDot.map((so, i) => (
              <div key={i} style={hangXem(false)}>
                <span>Học phí đợt {i + 1}/{cacDot.length}</span>
                <span style={{ color: color.muted, fontSize: 12.5 }}>
                  kỳ {nhanKyTu(ngay, i * Number(cachThang || 0))}
                </span>
                <b style={{ textAlign: "right" }}>{dinhDangTien(so)} đ</b>
              </div>
            ))}
            <div style={{ ...hangXem(false), background: color.subtle, fontWeight: 700 }}>
              <span>Tổng phải thu</span>
              <span />
              <b style={{ textAlign: "right" }}>{dinhDangTien(tongPhaiThu)} đ</b>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <Field label="Ghi chú">
          <Input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
        </Field>
      </div>
    </Drawer>
  );
}

function hangXem(dauTien) {
  return {
    display: "grid",
    gridTemplateColumns: "1.3fr 1fr auto",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    fontSize: 13.5,
    borderTop: dauTien ? "none" : "1px solid " + color.border,
  };
}
