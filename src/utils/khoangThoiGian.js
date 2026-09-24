/**
 * Khoảng ngày cho ba mốc xem: ngày / tuần / tháng.
 *
 * Gỡ ra từ DailyReport.jsx để Dashboard dùng đúng cùng một cách tính. Trước đây
 * chỉ màn Báo cáo ngày có ba mốc này; sao chép sang màn khác thì hai màn sẽ trôi
 * lệch nhau (nhất là mốc đầu tuần) và cùng một tuần lại ra hai con số.
 *
 * Tuần bắt đầu THỨ HAI, không phải Chủ nhật: lịch dạy và bảng công của trung tâm
 * đều tính tuần từ thứ Hai.
 */

export const THU = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

export const hai2 = (v) => String(v).padStart(2, "0");

/** 'YYYY-MM-DD' theo giờ ĐỊA PHƯƠNG. Không dùng toISOString() vì nó quy về UTC,
 *  làm ngày lùi một hôm với giờ Việt Nam từ 00:00 đến 07:00. */
export const khoaNgay = (d) => `${d.getFullYear()}-${hai2(d.getMonth() + 1)}-${hai2(d.getDate())}`;

export const ngayDai = (d) =>
  `${THU[d.getDay()]}, ${hai2(d.getDate())}/${hai2(d.getMonth() + 1)}/${d.getFullYear()}`;

export const ngayNgan = (d) => `${hai2(d.getDate())}/${hai2(d.getMonth() + 1)}`;

export function dauTuanThuHai(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const thu = d.getDay();
  d.setDate(d.getDate() + (thu === 0 ? -6 : 1 - thu));
  return d;
}

/** Khoảng ngày [from, to] theo mốc 'day' | 'week' | 'month'. */
export function khoangCho(date, moc) {
  if (moc === "week") {
    const dau = dauTuanThuHai(date);
    const cuoi = new Date(dau);
    cuoi.setDate(dau.getDate() + 6);
    return { from: khoaNgay(dau), to: khoaNgay(cuoi), start: dau, end: cuoi };
  }
  if (moc === "month") {
    const dau = new Date(date.getFullYear(), date.getMonth(), 1);
    const cuoi = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { from: khoaNgay(dau), to: khoaNgay(cuoi), start: dau, end: cuoi };
  }
  return { from: khoaNgay(date), to: khoaNgay(date), start: date, end: date };
}

export function nhanKy(date, moc) {
  const r = khoangCho(date, moc);
  if (moc === "week") return `Tuần ${ngayNgan(r.start)} – ${ngayNgan(r.end)}/${r.end.getFullYear()}`;
  if (moc === "month") return `Tháng ${hai2(date.getMonth() + 1)}/${date.getFullYear()}`;
  return ngayDai(date);
}

export const TU_MOC = { day: "ngày", week: "tuần", month: "tháng" };

/** Lùi/tiến một mốc. Tháng thì nhảy theo tháng, không phải 30 ngày.
 *
 * Mốc "tháng" KHÔNG dùng setMonth() trên ngày hiện tại. setMonth giữ nguyên số
 * ngày rồi để JS tự tràn: 31/01 tiến một tháng ra 03/03 (bỏ qua hẳn tháng Hai —
 * người xem không bao giờ mở được tháng đó), còn 31/10 lùi một tháng ra 01/10,
 * tức bấm mũi tên mà màn hình không đổi gì. Dựng thẳng từ (năm, tháng, ngày 1)
 * là hết tràn; với mốc tháng thì ngày trong tháng vốn không có ý nghĩa gì, vì
 * khoangCho() lấy đầu và cuối tháng.
 */
export function dichKy(date, moc, buoc) {
  if (moc === "month") {
    return new Date(date.getFullYear(), date.getMonth() + buoc, 1);
  }
  const d = new Date(date);
  d.setDate(d.getDate() + buoc * (moc === "week" ? 7 : 1));
  return d;
}

export const BA_MOC = [
  ["day", "Ngày"],
  ["week", "Tuần"],
  ["month", "Tháng"],
];
