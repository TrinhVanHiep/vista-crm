import { useEffect, useState } from "react";
import { datNgonNgu, layNgonNgu, theoDoiNgonNgu } from "./dich";

/** Nút chuyển VI / EN — đặt ở menu tài khoản và màn đăng nhập (14/10/2026). */
export default function NutNgonNgu({ style }) {
  const [ma, setMa] = useState(layNgonNgu());
  useEffect(() => theoDoiNgonNgu(setMa), []);
  const nut = (gt, nhan) => (
    <button
      type="button"
      onClick={() => datNgonNgu(gt)}
      aria-pressed={ma === gt}
      data-no-translate
      style={{
        border: 0, padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12.5,
        background: ma === gt ? "#F26522" : "transparent", color: ma === gt ? "#fff" : "#6b5b4b",
      }}
    >
      {nhan}
    </button>
  );
  return (
    <div data-no-translate role="group" aria-label="Language"
         style={{ display: "inline-flex", gap: 2, padding: 2, borderRadius: 8, border: "1px solid #eadfd2", background: "#fff", ...style }}>
      {nut("vi", "VI")}
      {nut("en", "EN")}
    </div>
  );
}
