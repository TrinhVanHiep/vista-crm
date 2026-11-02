// Giờ Việt Nam cố định (UTC+7, không đổi giờ mùa hè) cho mọi ô nhập ngày-giờ.
//
// 02/11/2026: máy cô Vui đặt múi giờ Mỹ (UTC−7). Ô datetime-local được hiểu theo giờ
// máy nên ca 804 nhập 17:00 31/10 bị lưu thành 07:00 01/11 — báo cáo bị chặn "ca chưa
// diễn ra", ca nhảy sang hôm sau, sửa bằng tài khoản quản lý trên cùng máy cũng lệch.
// Trung tâm chỉ hoạt động ở Việt Nam nên giờ người dùng gõ LUÔN là giờ Việt Nam.

export const MUI_GIO_VN = "Asia/Ho_Chi_Minh";

// "YYYY-MM-DDTHH:MM" (giờ VN người dùng gõ) -> ISO có +07:00 gửi backend.
export const gioVNSangIso = (value) => {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(String(value || ""));
  return m ? `${m[1]}T${m[2]}:00+07:00` : value;
};

// ISO từ backend -> "YYYY-MM-DDTHH:MM" theo giờ VN để đổ vào ô datetime-local.
export const isoSangGioVN = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: MUI_GIO_VN, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(d).map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};

// Máy đang đặt múi giờ khác Việt Nam? (để hiện cảnh báo — giờ HIỂN THỊ ở nhiều màn
// vẫn theo giờ máy).
export const mayLechMuiGio = () => new Date().getTimezoneOffset() !== -420;
