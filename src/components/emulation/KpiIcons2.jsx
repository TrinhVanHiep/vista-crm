/**
 * Bộ biểu tượng cho UI mới của màn Thi đua tháng / Kế hoạch năm học.
 * Dùng SVG thay emoji: mỗi máy vẽ emoji một kiểu, không kiểm soát được màu.
 * Bản này bổ sung cho KpiIcons.jsx cũ (giữ nguyên file đó, không ghi đè).
 */

const S = (children, p = {}) => (
  <svg viewBox={p.vb || "0 0 24 24"} width={p.w || 24} height={p.h || p.w || 24}
       fill={p.fill || "none"} stroke={p.stroke} strokeWidth={p.sw || 1.7}
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

/* ---------- nhóm chủ đề / chỉ số ---------- */
export const IcNguoi = ({ w = 34, mau = "#F86A0B" }) => S(
  <>
    <circle cx="8" cy="8.4" r="3.1" /><circle cx="16.2" cy="9.2" r="2.5" />
    <path d="M2.2 19.4c0-3.4 2.6-5.8 5.8-5.8s5.8 2.4 5.8 5.8z" />
    <path d="M14.6 19.4c0-2.4-.7-4-1.9-5 .9-.5 2-.8 3.3-.8 2.7 0 4.8 2 4.8 5z" />
  </>, { w, fill: mau });

/** Bánh răng vẽ bằng 8 răng xoay quanh tâm — nét gọn, không bị vón như path gộp. */
export const IcBanhRang = ({ w = 34, mau = "#F86A0B" }) => (
  <svg viewBox="0 0 40 40" width={w} height={w} fill={mau} aria-hidden="true">
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <rect key={a} x="16.9" y="1.4" width="6.2" height="10" rx="2.2" transform={`rotate(${a} 20 20)`} />
    ))}
    <circle cx="20" cy="20" r="13.2" />
    <circle cx="20" cy="20" r="5.4" fill="#fff" />
  </svg>
);

export const IcLoa = ({ w = 38, mau = "#E8342B" }) => S(
  <>
    <path d="M2.6 10.2 15 5.4v13.2L2.6 13.8z" />
    <path d="M5.8 14.6V18a1.9 1.9 0 0 0 3.7.5l-1.2-3.2z" />
    <path d="M17.4 8.6a1 1 0 0 1 1.4 0 4.8 4.8 0 0 1 0 6.8 1 1 0 0 1-1.4-1.4 2.8 2.8 0 0 0 0-4 1 1 0 0 1 0-1.4z" />
    <path d="M19.9 5.9a1 1 0 0 1 1.4 0 8.6 8.6 0 0 1 0 12.2 1 1 0 0 1-1.4-1.4 6.6 6.6 0 0 0 0-9.4 1 1 0 0 1 0-1.4z" fillOpacity=".55" />
  </>, { w, fill: mau });

export const IcBongDen = ({ w = 34, mau = "#F86A0B" }) => S(
  <>
    <path d="M12 2.6A6.7 6.7 0 0 0 8 14.6v1.2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-1.2A6.7 6.7 0 0 0 12 2.6z" />
    <rect x="9.1" y="18" width="5.8" height="1.7" rx=".85" />
    <rect x="10.1" y="20.6" width="3.8" height="1.7" rx=".85" />
  </>, { w, fill: mau });

export const IcCupSao = ({ w = 33, mau = "#E8342B" }) => S(
  <>
    <path d="M7.2 3.4h9.6v5.2a4.8 4.8 0 0 1-9.6 0z" />
    <path d="M6.6 4.9H4.2v1.7a3.4 3.4 0 0 0 2.9 3.4V8.3a1.9 1.9 0 0 1-1.2-1.7V6.4h.7zM17.4 4.9h2.4v1.7a3.4 3.4 0 0 1-2.9 3.4V8.3a1.9 1.9 0 0 0 1.2-1.7V6.4h-.7z" />
    <rect x="11.1" y="13.4" width="1.8" height="3.6" />
    <rect x="8.4" y="19.4" width="7.2" height="1.8" rx=".9" />
    <rect x="9.7" y="16.7" width="4.6" height="1.8" rx=".9" />
    <path d="m12 5.2.55 1.15 1.25.18-.9.88.21 1.25L12 8.06l-1.11.58.21-1.25-.9-.88 1.25-.18z" fill="#fff" />
  </>, { w, fill: mau });

/* ---------- huy hiệu tròn ---------- */
export const IcCongTron = ({ w = 28 }) => (
  <svg viewBox="0 0 24 24" width={w} height={w} aria-hidden="true">
    <circle cx="12" cy="12" r="9.4" fill="#178A4C" />
    <path d="M12 7.4v9.2M7.4 12h9.2" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);
export const IcTruTron = ({ w = 28 }) => (
  <svg viewBox="0 0 24 24" width={w} height={w} aria-hidden="true">
    <circle cx="12" cy="12" r="9.4" fill="#E8342B" />
    <path d="M7.4 12h9.2" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);
export const IcSaoTron = ({ w = 28 }) => (
  <svg viewBox="0 0 24 24" width={w} height={w} aria-hidden="true">
    <circle cx="12" cy="12" r="9.4" fill="#F86A0B" />
    <path d="m12 6.4 1.72 3.48 3.84.56-2.78 2.7.66 3.82L12 15.16l-3.44 1.8.66-3.82-2.78-2.7 3.84-.56z" fill="#fff" />
  </svg>
);
export const IcDat = ({ w = 13 }) => (
  <svg viewBox="0 0 24 24" width={w} height={w} aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="#178A4C" />
    <path d="m7.6 12.4 3 3 5.8-6" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const IcSao = ({ w = 17, day = true }) =>
  day ? (
    <svg viewBox="0 0 24 24" width={w} height={w} fill="#F86A0B" aria-hidden="true">
      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width={w} height={w} fill="none" stroke="#EBD9C6" strokeWidth="1.7" aria-hidden="true">
      <path d="m12 3.6 2.5 5.2 5.7.8-4.1 4 .9 5.7L12 16.6l-5 2.7.9-5.7-4.1-4 5.7-.8z" />
    </svg>
  );

/* ---------- nút / thanh công cụ ---------- */
export const IcTai = ({ w = 17, mau = "currentColor" }) => S(
  <path d="M12 3.6v10.8M7.6 10.4 12 14.8l4.4-4.4M4.4 19.2h15.2" />, { w, stroke: mau, sw: 1.9 });
export const IcNop = ({ w = 17, mau = "#fff" }) => S(
  <path d="M12 14.4V3.6M7.6 8 12 3.6 16.4 8M4.4 19.2h15.2" />, { w, stroke: mau, sw: 1.9 });
export const IcCheck = ({ w = 13, mau = "#fff" }) => S(<path d="m5 12.6 4.4 4.4L19 7.4" />, { w, stroke: mau, sw: 2.4 });
export const IcBut = ({ w = 13, mau = "#E8342B" }) => S(
  <path d="M16.4 3.8a2 2 0 0 1 2.8 2.8L8.4 17.4l-4 1.2 1.2-4z" />, { w, stroke: mau, sw: 1.8 });
export const IcChuong = ({ w = 23, mau = "#3B4165" }) => S(
  <>
    <path d="M18.2 15.6V10a6.2 6.2 0 1 0-12.4 0v5.6L4 18h16z" />
    <path d="M9.6 18a2.4 2.4 0 0 0 4.8 0" />
  </>, { w, stroke: mau, sw: 1.8 });
export const IcHoi = ({ w = 23, mau = "#3B4165" }) => (
  <svg viewBox="0 0 24 24" width={w} height={w} fill="none" stroke={mau} strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.4a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1.1 1-1.1 1.8v.3" />
    <circle cx="12" cy="17" r=".9" fill={mau} stroke="none" />
  </svg>
);
export const IcXuong = ({ w = 14, mau = "#8A8FA3" }) => S(<path d="m6 9.5 6 6 6-6" />, { w, stroke: mau, sw: 2.2 });
export const IcTrai = ({ w = 15, mau = "#8A7C6E" }) => S(<path d="m14 6-6 6 6 6" />, { w, stroke: mau, sw: 2.2 });
export const IcPhai = ({ w = 15, mau = "#8A7C6E" }) => S(<path d="m10 6 6 6-6 6" />, { w, stroke: mau, sw: 2.2 });
export const IcNguoiVien = ({ w = 17, mau = "#178A4C" }) => S(
  <><circle cx="12" cy="8" r="3.6" /><path d="M5.6 20.4a6.4 6.4 0 0 1 12.8 0" /></>, { w, stroke: mau, sw: 1.8 });
export const IcPDF = ({ w = 21 }) => (
  <svg viewBox="0 0 24 24" width={w} height={w} aria-hidden="true">
    <rect x="3.4" y="2.6" width="14.4" height="18.8" rx="2" fill="#E8342B" />
    <path d="M13.6 2.6v4.6h4.2z" fill="#FBB3AC" />
    <text x="10.6" y="17.4" fontFamily="inherit" fontSize="6.2" fontWeight="700" fill="#fff" textAnchor="middle">PDF</text>
  </svg>
);
export const IcExcel = ({ w = 21 }) => (
  <svg viewBox="0 0 24 24" width={w} height={w} aria-hidden="true">
    <rect x="3" y="2.6" width="11" height="18.8" rx="2" fill="#17703C" />
    <text x="8.5" y="15.6" fontFamily="inherit" fontSize="9" fontWeight="800" fill="#fff" textAnchor="middle">X</text>
    <rect x="13.4" y="6.4" width="7.6" height="11.4" rx="1.4" fill="#17703C" />
    <path d="M15 9.2h1.6M18 9.2h1.6M15 12h1.6M18 12h1.6M15 14.8h1.6M18 14.8h1.6" stroke="#fff" strokeWidth="1.2" />
  </svg>
);

/* ---------- kế hoạch năm học ---------- */
export const IcLich = ({ w = 27, mau = "#E24B2E" }) => (
  <svg viewBox="0 0 24 24" width={w} height={w} fill="none" stroke={mau} strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
    <rect x="3.4" y="4.8" width="17.2" height="15.8" rx="2.4" />
    <path d="M3.4 9.6h17.2M8 3.4v3M16 3.4v3" />
    {[[8.4, 13.6], [12, 13.6], [15.6, 13.6], [8.4, 17], [12, 17]].map(([cx, cy]) => (
      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1" fill={mau} />
    ))}
  </svg>
);
export const IcMucTieu = ({ w = 44, mau = "#F98E28" }) => (
  <svg viewBox="0 0 24 24" width={w} height={w} fill="none" stroke={mau} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11.4" cy="12.6" r="8.4" /><circle cx="11.4" cy="12.6" r="4.6" />
    <circle cx="11.4" cy="12.6" r="1.4" fill={mau} />
    <path d="m13.8 10.2 7-7M17.6 3.2h3.4v3.4" />
  </svg>
);
export const IcBieuDo = ({ w = 70 }) => (
  <svg viewBox="0 0 70 45" width={w} height={w * 45 / 70} fill="none" stroke="#F26522" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 40h60" />
    <rect x="9" y="24" width="10" height="14" fill="#F26522" stroke="none" />
    <rect x="26" y="17" width="10" height="21" fill="#F26522" stroke="none" />
    <rect x="43" y="9" width="10" height="29" fill="#F26522" stroke="none" />
    <path d="m9 17 13-9 10 6 17-11M45 3h9v9" />
  </svg>
);
export const IcCo = ({ w = 42 }) => (
  <svg viewBox="0 0 40 56" width={w} height={w * 56 / 40} aria-hidden="true">
    <path d="M5 3v50" stroke="#F65C0B" strokeWidth="4.4" strokeLinecap="round" />
    <path d="M7 4h28v21H7z" fill="#F65C0B" />
    <path d="M7 4h7v5.25H7zM21 4h7v5.25h-7zM14 9.25h7v5.25h-7zM28 9.25h7v5.25h-7zM7 14.5h7v5.25H7zM21 14.5h7v5.25h-7zM14 19.75h7v5.25h-7zM28 19.75h7v5.25h-7z" fill="#fff" />
  </svg>
);
export const IcBanhRangDo = ({ w = 33 }) => <IcBanhRang w={w} mau="#A8241A" />;
export const IcLoaDo = ({ w = 32 }) => <IcLoa w={w} mau="#A8241A" />;

/** Vòng tiến độ — 0% vẽ vòng rỗng màu tím nhạt như bản thiết kế. */
export const VongTienDo = ({ phanTram = 0, mau = "#1F8A54", w = 38 }) => {
  const r = 15, cv = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, Number(phanTram) || 0));
  if (p <= 0) {
    return (
      <svg viewBox="0 0 40 40" width={w} height={w} aria-hidden="true">
        <circle cx="20" cy="20" r={r} fill="none" stroke="#DFD2F4" strokeWidth="5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 40" width={w} height={w} aria-hidden="true">
      <circle cx="20" cy="20" r={r} fill="none" stroke="#F0E4D7" strokeWidth="5" />
      <circle cx="20" cy="20" r={r} fill="none" stroke={mau} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={`${(p / 100) * cv} ${cv}`} transform="rotate(-90 20 20)" />
    </svg>
  );
};

export const ICON_NHOM_2 = {
  "van-hoa": IcNguoi,
  "van-hanh": IcBanhRang,
  "truyen-thong": IcLoa,
  "doi-moi-sang-tao": IcBongDen,
};
