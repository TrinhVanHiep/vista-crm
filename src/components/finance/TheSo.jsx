import Ico from "./Ico";

/**
 * Thẻ chỉ số của phân hệ Tài chính, dựng theo bản mẫu VISTA-FIN-CRM-V2:
 * nhãn + số lớn + dòng phụ bên TRÁI, ô biểu tượng bo góc nền nhạt bên PHẢI.
 *
 * Không dùng lại <Kpi> chung của app vì thẻ đó đặt biểu tượng bên trái và dùng
 * emoji — khác hẳn bố cục bản mẫu, và emoji thì phá tiêu chuẩn "một family icon
 * dạng line" của tài liệu.
 */
export default function TheSo({ ico, mau = "cam", nhan, so, phu }) {
  return (
    <div className="fin-the">
      <div style={{ minWidth: 0 }}>
        <span className="fin-the__nhan">{nhan}</span>
        <div className="fin-the__so">{so}</div>
        {phu ? <div className="fin-the__phu">{phu}</div> : null}
      </div>
      {ico ? (
        <div className={`fin-the__ico fin-the__ico--${mau}`}>
          <Ico ten={ico} co={20} />
        </div>
      ) : null}
    </div>
  );
}

/** Hàng 4 thẻ, tự co còn 2 rồi 1 cột ở màn hẹp. */
export function HangThe({ children }) {
  return <div className="fin-the-luoi">{children}</div>;
}
