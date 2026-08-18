/**
 * Bộ biểu tượng cho màn Thi đua tháng.
 *
 * Dùng SVG thay emoji vì emoji mỗi hệ điều hành vẽ một kiểu (Windows khác Mac
 * khác Android), không kiểm soát được màu, và trông không giống bản thiết kế.
 * SVG thì màu và nét giống nhau ở mọi máy.
 */

const bọc = (children, mau) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
       stroke={mau} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
       aria-hidden="true">
    {children}
  </svg>
);

/** Văn hóa — nhóm người. */
export const IcVanHoa = ({ mau = "#F26522" }) => bọc(
  <>
    <path d="M16 20v-1.6a3.4 3.4 0 0 0-3.4-3.4H6.4A3.4 3.4 0 0 0 3 18.4V20" />
    <circle cx="9.5" cy="7.5" r="3.1" />
    <path d="M21 20v-1.6a3.4 3.4 0 0 0-2.6-3.3M15.6 4.6a3.4 3.4 0 0 1 0 6.1" />
  </>, mau);

/** Vận hành — bánh răng. */
export const IcVanHanh = ({ mau = "#F26522" }) => bọc(
  <>
    <circle cx="12" cy="12" r="3.1" />
    <path d="M19.4 14.6a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
  </>, mau);

/** Truyền thông — loa phóng thanh. */
export const IcTruyenThong = ({ mau = "#E03131" }) => bọc(
  <>
    <path d="m3 11 15-6v14L3 13z" />
    <path d="M3 11H2.4A1.4 1.4 0 0 0 1 12.4v.2A1.4 1.4 0 0 0 2.4 14H3z" />
    <path d="M7 14.4V19a1.6 1.6 0 0 0 3.1.5" />
    <path d="M20.5 9.5a3.2 3.2 0 0 1 0 5" />
  </>, mau);

/** Đổi mới sáng tạo — bóng đèn. */
export const IcSangTao = ({ mau = "#F5A623" }) => bọc(
  <>
    <path d="M9.2 17h5.6M10 20.5h4" />
    <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2h5.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
  </>, mau);

/** Điểm KPI tháng — cúp. */
export const IcCup = ({ mau = "#E03131" }) => bọc(
  <>
    <path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z" />
    <path d="M7.5 5.5H5V7a3 3 0 0 0 2.7 3M16.5 5.5H19V7a3 3 0 0 1-2.7 3" />
    <path d="M12 13.5V17m-3.2 3h6.4m-4.8-3h3.2" />
  </>, mau);

/** Điểm cộng. */
export const IcCong = ({ mau = "#2E9E5B" }) => bọc(
  <>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 8.4v7.2M8.4 12h7.2" />
  </>, mau);

/** Điểm trừ. */
export const IcTru = ({ mau = "#E03131" }) => bọc(
  <>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M8.4 12h7.2" />
  </>, mau);

/** Điểm trần — ngôi sao. */
export const IcSao = ({ mau = "#F26522" }) => bọc(
  <path d="m12 3.2 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.7l6.1-.9z" />, mau);

/** Chọn icon theo mã nhóm, để dữ liệu trong DB đổi tên nhóm vẫn ra đúng hình. */
export const ICON_NHOM = {
  "van-hoa": IcVanHoa,
  "van-hanh": IcVanHanh,
  "truyen-thong": IcTruyenThong,
  "doi-moi-sang-tao": IcSangTao,
};
