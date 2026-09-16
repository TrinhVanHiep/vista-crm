import React from 'react';

/** Thin-stroke glyph set. currentColor driven, 20px default. */
const S = ({ size = 20, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export const Icon = {
  grid:   p => <S {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></S>,
  user:   p => <S {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" /></S>,
  board:  p => <S {...p}><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></S>,
  chart:  p => <S {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></S>,
  wallet: p => <S {...p}><rect x="3" y="6" width="18" height="12" rx="2.5" /><path d="M16 12h2" /></S>,
  people: p => <S {...p}><circle cx="9" cy="9" r="3" /><path d="M3 19c0-3 2.7-4.5 6-4.5S15 16 15 19" /><path d="M16 6.5a3 3 0 010 5.6M18 19c0-2-.7-3.3-2-4.1" /></S>,
  doc:    p => <S {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></S>,
  gear:   p => <S {...p}><circle cx="12" cy="12" r="3.2" /><path d="M12 3v2.2M12 18.8V21M4.2 7.5l1.9 1.1M17.9 15.4l1.9 1.1M4.2 16.5l1.9-1.1M17.9 8.6l1.9-1.1" /></S>,
  check:  p => <S {...p}><path d="M5 12.5l4.5 4.5L19 7" /></S>,
  warn:   p => <S {...p}><path d="M12 4.5L2.8 19.5h18.4L12 4.5z" /><path d="M12 10v4.2M12 17h.01" /></S>,
  bank:   p => <S {...p}><path d="M3 9.5L12 4l9 5.5" /><path d="M5 10v9M19 10v9M9.5 10v9M14.5 10v9M3 20h18" /></S>,
  lock:   p => <S {...p}><rect x="5" y="10.5" width="14" height="10" rx="2.2" /><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" /></S>,
  bell:   p => <S {...p}><path d="M6.5 9.5a5.5 5.5 0 0111 0c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5z" /><path d="M10 18a2 2 0 004 0" /></S>,
  search: p => <S {...p}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></S>,
  logout: p => <S {...p}><path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4" /><path d="M9 16l-4-4 4-4M5 12h9" /></S>,
  plus:   p => <S {...p}><path d="M12 5v14M5 12h14" /></S>,
  arrow:  p => <S {...p}><path d="M5 12h13M13 6l6 6-6 6" /></S>,
  close:  p => <S {...p}><path d="M6 6l12 12M18 6L6 18" /></S>,
};

export const TONE = {
  orange: { fg: '#F4622E', bg: '#FFF1EA' },
  green:  { fg: '#16A34A', bg: '#E8F7EE' },
  red:    { fg: '#EF4444', bg: '#FDECEC' },
  amber:  { fg: '#D97706', bg: '#FEF5E3' },
  blue:   { fg: '#2563EB', bg: '#EAF1FE' },
  violet: { fg: '#7C5CE0', bg: '#F1EDFD' },
};
