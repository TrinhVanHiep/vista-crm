/**
 * Bộ biểu tượng của phân hệ Tài chính — lấy nguyên từ bản mẫu VISTA-FIN-CRM-V2.
 *
 * Trước đây màn này dùng emoji (🧾 ✅ ⏳). Emoji mỗi hệ điều hành vẽ một kiểu,
 * không đổi được màu theo trạng thái, và phá tiêu chuẩn nghiệm thu 12 của tài
 * liệu: "một family icon dạng line". Nay dùng đúng bộ nét của bản mẫu, tô màu
 * bằng currentColor nên thẻ nào đặt màu gì thì icon theo màu đó.
 */

const NET = {
  wallet: '<path d="M4 7.5h14a2 2 0 0 1 2 2V19H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h13"/><path d="M20 11h-5a2 2 0 1 0 0 4h5"/>',
  receipt: '<path d="M6 3h12v18l-3-1.7-3 1.7-3-1.7L6 21z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  bank: '<path d="m3 9 9-5 9 5z"/><path d="M5 10v7M9 10v7M15 10v7M19 10v7M3 20h18"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  alert: '<path d="M12 4 3 20h18z"/><path d="M12 9v5M12 17h.01"/>',
  lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14M14 7l5 5-5 5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3.5 20c.5-4 2.3-6 5.5-6s5 2 5.5 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.5c3.2-.3 5 1.4 5.5 4.5"/>',
  finance: '<path d="M4 7h16v12H4z"/><path d="M4 10h16"/><circle cx="16.5" cy="14.5" r="1.7"/>',
};

export default function Ico({ ten, co = 20, className = "" }) {
  const hinh = NET[ten];
  if (!hinh) return null;
  return (
    <svg
      className={`fin-ico ${className}`.trim()}
      width={co}
      height={co}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: hinh }}
    />
  );
}
