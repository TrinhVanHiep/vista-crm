import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";
import { Button, Field, Input, Modal } from "./v3/ui";
import { color } from "./v3/theme";

/**
 * Sửa số lương CHỐT của một người (16/10/2026). Tháng đã chốt thì bảng lương không tự
 * tính lại khi sửa đơn giá / điểm danh — phản hồi "tính sai" phải sửa thẳng số chốt ở đây.
 * Lưu xong: gross, thực nhận tự tính lại; người đó nhận thông báo và được hỏi xác nhận lại.
 */
const KHOAN = [["luong_nen", "Lương cơ bản"], ["luong_day", "Lương dạy"], ["truc_demo", "Trực / demo"],
  ["phu_cap_khac", "Phụ cấp khác"], ["bh_nld", "BHXH người lao động"], ["khau_tru", "Khấu trừ cơ chế"],
  ["tam_ung", "Tạm ứng"], ["bh_dn", "BHXH doanh nghiệp (không trừ vào lương)"]];
const tien = (v) => Number(v || 0).toLocaleString("vi-VN");
const so = (s) => Number(String(s ?? "").replace(/[^0-9]/g, "")) || 0;

export default function SuaLuongChot({ nguoi, thang, nam, onDong, onXong }) {
  const [f, setF] = useState(null);
  const [lyDo, setLyDo] = useState(nguoi.ghi_chu ? `Theo phản hồi: ${nguoi.ghi_chu}` : "");
  const [phanHoi, setPhanHoi] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);

  useEffect(() => {
    apiClient.get("/payroll/luong-chot/sua/", { params: { teacher: nguoi.teacher_id, month: thang, year: nam } })
      .then(({ data }) => setF(data))
      .catch((e) => setLoi(e?.response?.data?.detail || "Không tải được lương chốt."));
  }, [nguoi.teacher_id, thang, nam]);

  const gross = f ? so(f.luong_nen) + so(f.luong_day) + so(f.truc_demo) + so(f.phu_cap_khac) : 0;
  const thucNhan = f ? gross - so(f.bh_nld) - so(f.khau_tru) - so(f.tam_ung) : 0;

  const luu = async () => {
    setLoi("");
    if (!lyDo.trim()) { setLoi("Ghi lý do sửa."); return; }
    setDang(true);
    try {
      const body = { teacher: nguoi.teacher_id, month: thang, year: nam, ly_do: lyDo.trim(), phan_hoi: phanHoi.trim() };
      KHOAN.forEach(([k]) => { body[k] = so(f[k]); });
      const { data } = await apiClient.post("/payroll/luong-chot/sua/", body);
      onXong?.(`Đã sửa lương T${thang}/${nam} của ${nguoi.ten}: thực nhận ${tien(data.thuc_nhan)} đ. Đã báo nhân sự xác nhận lại.`);
    } catch (e) {
      const d = e?.response?.data || {};
      setLoi(d.ly_do || d.detail || Object.values(d).flat()[0] || "Không lưu được.");
    } finally {
      setDang(false);
    }
  };

  return (
    <Modal title={`Sửa lương chốt T${thang}/${nam} — ${nguoi.ten}`}
           sub="Tháng đã chốt nên bảng lương không tự tính lại — sửa trực tiếp số chốt, người đó sẽ được hỏi xác nhận lại."
           width={620} onClose={onDong}
           footer={<><Button variant="ghost" onClick={onDong}>Huỷ</Button><Button onClick={luu} disabled={dang || !f}>{dang ? "Đang lưu…" : "Lưu & báo nhân sự"}</Button></>}>
      {loi ? <div style={{ color: color.red, fontSize: 13, marginBottom: 10 }}>{loi}</div> : null}
      {nguoi.ghi_chu ? (
        <div style={{ background: color.redSoft, color: color.red, borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12 }}>
          Phản hồi của nhân sự: {nguoi.ghi_chu}
        </div>
      ) : null}
      {!f ? <div style={{ color: color.muted }}>Đang tải…</div> : (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
            {KHOAN.map(([k, nhan]) => (
              <Field key={k} label={nhan}>
                <Input value={tien(f[k])} style={{ textAlign: "right" }}
                       onChange={(e) => setF((x) => ({ ...x, [k]: so(e.target.value) }))} />
              </Field>
            ))}
          </div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 14, background: color.subtle, borderRadius: 8, padding: "10px 12px" }}>
            <span>Gross: <b>{tien(gross)} đ</b></span>
            <span>Thực nhận: <b style={{ color: color.orange }}>{tien(thucNhan)} đ</b>
              {f.thuc_nhan !== thucNhan ? <span style={{ color: color.muted }}> (cũ {tien(f.thuc_nhan)} đ)</span> : null}</span>
          </div>
          <Field label="Lý do sửa (bắt buộc)">
            <Input value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="VD: tính lại lương lớp Kid theo đơn giá 65.000/lượt" />
          </Field>
          <Field label="Phản hồi cho nhân sự — đã đối soát những gì (nhân sự sẽ đọc)">
            <textarea rows={3} value={phanHoi} onChange={(e) => setPhanHoi(e.target.value)}
                      placeholder="VD: Đã bổ sung 2 ca lớp 703 ngày 4/9, 11/9; ca 17/9 ST105 là cô Trang dạy thay nên không tính."
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid " + color.borderStrong, borderRadius: 10, fontSize: 13.5, fontFamily: "inherit" }} />
            <span style={{ fontSize: 12, color: color.muted }}>Để trống thì gửi lý do sửa. Các khoản thay đổi (cũ → mới) tự kèm theo.</span>
          </Field>
        </div>
      )}
    </Modal>
  );
}
