/**
 * Bộ giao diện của phân hệ Tài chính — chép nguyên từ bản thiết kế
 * vista-export do chủ dự án cung cấp (16/09/2026).
 *
 * Dùng inline style theo theme.js chứ không dùng CSS toàn cục, nên đặt cạnh
 * bộ giao diện chung của app mà không luật nào đè luật nào. Giữ NGUYÊN VĂN
 * để lần sau thiết kế đổi thì chép đè lại được, đừng sửa vặt trong này.
 */
import React from 'react';
import { color, radius, shadow } from './theme';
import { Icon, TONE } from './icons';

export const Card = ({ style, children, ...rest }) => (
  <div style={{
    background: color.card, borderRadius: radius.lg, border: '1px solid ' + color.border,
    boxShadow: shadow.card, ...style,
  }} {...rest}>{children}</div>
);

export const CardHead = ({ title, sub, action, onAction }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 16, padding: '20px 22px 0',
  }}>
    <div>
      <div style={{ fontSize: 17, fontWeight: 700 }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, color: color.muted, marginTop: 3 }}>{sub}</div>}
    </div>
    {action && (
      <button onClick={onAction} style={{
        background: 'none', border: 0, padding: 0, cursor: 'pointer',
        color: color.orange, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
      }}>{action}</button>
    )}
  </div>
);

/** KPI tile: label, big value, footnote, tinted square icon. */
export const StatCard = ({ label, value, note, icon = 'doc', tone = 'orange', valueColor, small }) => {
  const t = TONE[tone];
  const Glyph = Icon[icon] || Icon.doc;
  const valueTone = valueColor === 'green' ? color.green : valueColor === 'red' ? color.red : color.ink;
  return (
    <Card style={{ padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: color.muted, fontWeight: 500 }}>{label}</div>
        <div style={{
          fontSize: small ? 21 : 27, fontWeight: 800, letterSpacing: '-0.6px',
          color: valueTone, margin: '6px 0 5px', whiteSpace: 'nowrap',
        }}>{value}</div>
        <div style={{ fontSize: 12, color: color.faint }}>{note}</div>
      </div>
      <div style={{
        width: 34, height: 34, borderRadius: radius.md, flex: '0 0 34px',
        background: t.bg, color: t.fg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Glyph size={18} /></div>
    </Card>
  );
};

const PILL_TONES = {
  green:  { bg: color.greenSoft,  fg: color.green },
  red:    { bg: color.redSoft,    fg: color.red },
  amber:  { bg: color.amberSoft,  fg: color.amber },
  blue:   { bg: color.blueSoft,   fg: color.blue },
  orange: { bg: color.orangeSoft, fg: color.orange },
  grey:   { bg: '#F1F4F8',        fg: color.ink70 },
};

export const Pill = ({ tone = 'grey', children, style }) => {
  const t = PILL_TONES[tone] || PILL_TONES.grey;
  return (
    <span style={{
      display: 'inline-block', background: t.bg, color: t.fg, fontSize: 11.5, fontWeight: 700,
      padding: '4px 10px', borderRadius: radius.sm, whiteSpace: 'nowrap', ...style,
    }}>{children}</span>
  );
};

/** Maps a Vietnamese status string to its pill tone. */
export const statusTone = s => ({
  'Đã chi': 'green', 'Đã duyệt': 'blue', 'Đã khớp': 'green', 'Chờ khớp': 'amber',
  'Chờ duyệt': 'amber', 'Đã kiểm tra': 'blue', 'Đã đối soát': 'green',
}[s] || 'grey');

export const Button = ({ variant = 'primary', icon, children, style, ...rest }) => {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 8, border: 0, cursor: 'pointer',
    borderRadius: radius.md, padding: '10px 18px', fontSize: 13.5, fontWeight: 700,
    whiteSpace: 'nowrap',
  };
  const variants = {
    primary: { background: color.orangeGrad, color: '#fff' },
    outline: { background: '#fff', color: color.orange, border: '1px solid ' + color.orange },
    ghost:   { background: '#fff', color: color.ink70, border: '1px solid ' + color.borderStrong },
    dark:    { background: color.navy, color: '#fff' },
  };
  const Glyph = icon ? Icon[icon] : null;
  return (
    <button style={{ ...base, ...variants[variant], ...style }} {...rest}>
      {Glyph && <Glyph size={16} />}{children}
    </button>
  );
};

/* SỬA SO VỚI BẢN GỐC (1/2): thêm value/onChange.
   Bản thiết kế là ảnh tĩnh nên ô tìm kiếm không điều khiển được; nối vào API
   thật thì phải đọc được giá trị. Giữ nguyên toàn bộ phần nhìn. */
export const Search = ({ placeholder, width = 220, value, onChange }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 9, width, flex: '0 1 ' + width + 'px',
    background: '#fff', border: '1px solid ' + color.borderStrong,
    borderRadius: radius.md, padding: '9px 13px', color: color.faint,
  }}>
    <Icon.search size={16} />
    <input
      placeholder={placeholder}
      value={value}
      onChange={e => onChange && onChange(e.target.value)}
      style={{ border: 0, outline: 0, background: 'none', flex: 1, minWidth: 0, fontSize: 13 }}
    />
  </div>
);

/* SỬA SO VỚI BẢN GỐC (2/2): options nhận thêm dạng {value,label}.
   Bản gốc chỉ nhận mảng chuỗi, tức là mã gửi lên API phải trùng với chữ hiển
   thị — không dùng được cho 'con_no' hiển thị 'Trạng thái: Còn nợ'. */
export const Select = ({ options, value, onChange, width = 170, style }) => (
  <select value={value} onChange={e => onChange && onChange(e.target.value)} style={{
    width, background: '#fff', border: '1px solid ' + color.borderStrong,
    borderRadius: radius.md, padding: '9px 12px', fontSize: 13, color: color.ink70,
    cursor: 'pointer', ...style,
  }}>
    {options.map(o => {
      const v = typeof o === 'string' ? o : o.value;
      const l = typeof o === 'string' ? o : o.label;
      return <option key={v} value={v}>{l}</option>;
    })}
  </select>
);

/** Numbered step card used by the finance flow and the expense workflow. */
export const StepCard = ({ n, title, desc, horizontal, last }) => (
  <>
    <div style={{
      flex: 1, minWidth: 0, background: '#fff', border: '1px solid ' + color.border,
      borderRadius: radius.md, padding: '14px 16px',
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: 7, background: color.orangeSoft, color: color.orange,
        fontSize: 12.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 10,
      }}>{n}</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>{title}</div>
      <div style={{ fontSize: 12, color: color.muted, lineHeight: 1.5 }}>{desc}</div>
    </div>
    {horizontal && !last && (
      <div style={{ color: color.faint, flex: '0 0 auto', alignSelf: 'center' }}><Icon.arrow size={16} /></div>
    )}
  </>
);

/** Amber note strip used under tables and inside dialogs. */
export const NoteStrip = ({ children, tone = 'amber' }) => {
  const fg = tone === 'amber' ? color.amber : color.orange;
  return (
    <div style={{
      background: color.amberSoft, borderLeft: '3px solid ' + fg, borderRadius: radius.sm,
      padding: '12px 14px', fontSize: 12.5, color: '#8A5A12', lineHeight: 1.6,
    }}>{children}</div>
  );
};

export const Table = ({ columns, rows, align = {} }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
      <thead>
        <tr style={{ background: color.subtle }}>
          {columns.map((c, i) => (
            <th key={c} style={{
              textAlign: align[i] || 'left', padding: '11px 14px', fontSize: 12,
              fontWeight: 600, color: color.muted, whiteSpace: 'nowrap',
              borderBottom: '1px solid ' + color.border,
            }}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, r) => (
          <tr key={r}>
            {cells.map((cell, i) => (
              <td key={i} style={{
                textAlign: align[i] || 'left', padding: '13px 14px', fontSize: 13,
                borderBottom: r === rows.length - 1 ? 0 : '1px solid ' + color.border,
                verticalAlign: 'middle',
              }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const Num = ({ children, bold, tone }) => (
  <span style={{
    fontVariantNumeric: 'tabular-nums', fontWeight: bold ? 700 : 500,
    color: tone === 'green' ? color.green : tone === 'red' ? color.red : color.ink,
  }}>{children}</span>
);

/** Centre-screen dialog. */
export const Modal = ({ title, sub, width = 760, onClose, children, footer }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, background: 'rgba(27,36,48,0.42)', zIndex: 200,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32,
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      width: '100%', maxWidth: width, maxHeight: '86vh', overflowY: 'auto',
      background: '#fff', borderRadius: radius.xl, boxShadow: shadow.modal, padding: '26px 28px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.4px' }}>{title}</div>
          {sub && <div style={{ fontSize: 13, color: color.muted, marginTop: 4 }}>{sub}</div>}
        </div>
        <button onClick={onClose} style={closeBtn}><Icon.close size={15} /></button>
      </div>
      {children}
      {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>{footer}</div>}
    </div>
  </div>
);

/** Right-hand slide-over. */
export const Drawer = ({ title, sub, width = 520, onClose, children, footer }) => (
  <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(27,36,48,0.42)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
    <div onClick={e => e.stopPropagation()} style={{
      width: '100%', maxWidth: width, background: '#fff', height: '100%', overflowY: 'auto',
      boxShadow: shadow.modal, padding: '24px 26px', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.4px' }}>{title}</div>
          {sub && <div style={{ fontSize: 12.5, color: color.muted, marginTop: 4 }}>{sub}</div>}
        </div>
        <button onClick={onClose} style={closeBtn}><Icon.close size={15} /></button>
      </div>
      <div style={{ flex: 1 }}>{children}</div>
      {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>{footer}</div>}
    </div>
  </div>
);

const closeBtn = {
  width: 30, height: 30, flex: '0 0 30px', borderRadius: radius.sm,
  border: '1px solid ' + color.borderStrong, background: '#fff', color: color.muted,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
};

export const Field = ({ label, children }) => (
  <label style={{ display: 'block' }}>
    <span style={{ display: 'block', fontSize: 12.5, color: color.ink70, fontWeight: 500, marginBottom: 6 }}>{label}</span>
    {children}
  </label>
);

export const Input = ({ style, ...rest }) => (
  <input style={{
    width: '100%', background: '#fff', border: '1px solid ' + color.borderStrong,
    borderRadius: radius.md, padding: '11px 13px', fontSize: 13.5, outline: 'none', ...style,
  }} {...rest} />
);

export const Dropdown = ({ options, style, ...rest }) => (
  <select style={{
    width: '100%', background: '#fff', border: '1px solid ' + color.borderStrong,
    borderRadius: radius.md, padding: '11px 12px', fontSize: 13.5, cursor: 'pointer', ...style,
  }} {...rest}>
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

/** Bottom-right confirmation toast. */
export const Toast = ({ children }) => (
  <div style={{
    position: 'fixed', right: 24, bottom: 24, zIndex: 300,
    background: color.navy, color: '#fff', borderRadius: radius.md,
    padding: '13px 20px', fontSize: 13.5, fontWeight: 600, boxShadow: shadow.raised,
  }}>{children}</div>
);
