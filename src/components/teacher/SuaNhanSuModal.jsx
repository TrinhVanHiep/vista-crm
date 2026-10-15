import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";
import { Button, Field, Modal } from "../../ui";

/**
 * Sửa thông tin nhân sự (12/10/2026: màn Hành chính - Nhân sự trước chỉ thêm được,
 * không sửa — tài khoản thiếu họ tên hiện email khắp nơi). Gọi API riêng
 * /teachers/teachers/{id}/sua-thong-tin/; không đụng lớp phụ trách. Có ô đặt mật khẩu
 * mới cho người quên mật khẩu (máy chủ chưa gửi email nên không tự lấy lại được).
 */

const TRANG_THAI = [["active", "Đang làm"], ["probation", "Thử việc"], ["paused", "Tạm nghỉ"], ["terminated", "Đã nghỉ việc"]];
const LOAI = [["full_time", "Full-time"], ["part_time", "Part-time"], ["freelance", "Cộng tác viên"], ["director", "Giám đốc"]];

const tuGv = (g) => ({
  ma: g?.teacher_code || "",
  ho: g?.user?.last_name || "",
  ten: g?.user?.first_name || "",
  email: g?.user?.email || "",
  sdt: g?.phone_number || "",
  gioi_tinh: g?.gender || "",
  ngay_sinh: g?.date_of_birth || "",
  dia_chi: g?.address || "",
  cccd: g?.national_id || "",
  chuyen_mon: g?.specialization || "",
  facebook: g?.facebook || "",
  sdt_khan_cap: g?.sdt_khan_cap || "",
  nguoi_khan_cap: g?.nguoi_khan_cap || "",
  trang_thai: g?.employment_status || "active",
  loai: g?.employment_type || "full_time",
  ngay_vao: g?.join_date || "",
  ngay_nghi: g?.termination_date || "",
  mat_khau_moi: "",
});

export default function SuaNhanSuModal({ giaoVien, onClose, onXong }) {
  const [f, setF] = useState(tuGv(giaoVien));
  const [loi, setLoi] = useState({});
  const [dang, setDang] = useState(false);

  useEffect(() => { setF(tuGv(giaoVien)); setLoi({}); }, [giaoVien]);
  if (!giaoVien) return null;

  const doi = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const luu = async (e) => {
    e.preventDefault();
    setDang(true);
    setLoi({});
    try {
      const { mat_khau_moi: mk, ...con } = f;
      await apiClient.patch(`/teachers/teachers/${giaoVien.id}/sua-thong-tin/`, mk ? { ...con, mat_khau_moi: mk } : con);
      onXong?.();
      onClose?.();
    } catch (err) {
      const d = err?.response?.data;
      setLoi(d && typeof d === "object" ? d : { detail: "Không lưu được." });
    } finally {
      setDang(false);
    }
  };
  const o = (k, nhan, extra = {}) => (
    <Field label={nhan} required={extra.required} hint={loi[k] ? <span style={{ color: "var(--danger)" }}>{loi[k]}</span> : extra.hint}>
      <input value={f[k]} onChange={doi(k)} type={extra.type || "text"} maxLength={extra.max}
             autoComplete={extra.type === "password" ? "new-password" : undefined} />
    </Field>
  );
  const chon = (k, nhan, ds) => (
    <Field label={nhan} hint={loi[k] ? <span style={{ color: "var(--danger)" }}>{loi[k]}</span> : undefined}>
      <select value={f[k]} onChange={doi(k)}>
        {ds.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
      </select>
    </Field>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="Sửa thông tin nhân sự"
      subtitle="Lớp phụ trách sửa ở nút Gán lớp."
      size="lg"
      footer={(
        <>
          <Button onClick={onClose}>Đóng</Button>
          <Button variant="primary" type="submit" form="sua-nhan-su" loading={dang} loadingText="Đang lưu...">Lưu thay đổi</Button>
        </>
      )}
    >
      <form id="sua-nhan-su" onSubmit={luu} style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {o("ho", "Họ và tên đệm", { max: 150 })}
        {o("ten", "Tên", { required: true, max: 150 })}
        {o("email", "Email đăng nhập", { type: "email", hint: "Đổi email là đổi luôn tên đăng nhập." })}
        {o("sdt", "Số điện thoại", { max: 20 })}
        {chon("gioi_tinh", "Giới tính", [["", "—"], ["male", "Nam"], ["female", "Nữ"]])}
        {o("ngay_sinh", "Ngày sinh", { type: "date" })}
        {o("ma", "Mã giáo viên / nhân sự", { max: 50 })}
        {o("cccd", "Số CCCD", { max: 50 })}
        {o("chuyen_mon", "Chuyên môn", { max: 255 })}
        {o("facebook", "Facebook", { max: 255 })}
        {o("sdt_khan_cap", "SĐT liên hệ khẩn cấp", { max: 20 })}
        {o("nguoi_khan_cap", "Người liên hệ khẩn cấp", { max: 120 })}
        {chon("trang_thai", "Trạng thái làm việc", TRANG_THAI)}
        {chon("loai", "Loại hợp đồng", LOAI)}
        {o("ngay_vao", "Ngày vào làm", { type: "date" })}
        {o("ngay_nghi", "Ngày nghỉ việc", { type: "date" })}
        <div style={{ gridColumn: "1 / -1" }}>{o("dia_chi", "Địa chỉ", { max: 500 })}</div>
        {o("mat_khau_moi", "Đặt mật khẩu mới", {
          type: "password",
          hint: "Để trống = giữ mật khẩu cũ. Ít nhất 8 ký tự; đặt xong báo trực tiếp cho người đó.",
        })}
        {loi.detail ? <div style={{ gridColumn: "1 / -1", color: "var(--danger)" }}>{loi.detail}</div> : null}
      </form>
    </Modal>
  );
}
