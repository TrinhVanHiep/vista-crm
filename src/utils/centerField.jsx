import { useEffect } from "react";

// Hệ thống hiện chỉ vận hành 1 cơ sở. Khi backend chỉ trả về ≤ 1 trung tâm,
// mọi chỗ "chọn trung tâm" sẽ tự chọn cơ sở duy nhất (Vista Academy) và hiện
// nhãn tĩnh thay cho dropdown, để không tạo dữ liệu rác ở trung tâm khác.

export const DEFAULT_CENTER_NAME = "Vista Academy";

/** True khi hệ thống chỉ có 1 cơ sở (hoặc chưa có cơ sở nào). */
export function isSingleCenter(centers) {
  return !Array.isArray(centers) || centers.length <= 1;
}

/** Tên cơ sở duy nhất để hiển thị (fallback: Vista Academy). */
export function soleCenterName(centers) {
  if (Array.isArray(centers) && centers.length >= 1) {
    return centers[0]?.name || DEFAULT_CENTER_NAME;
  }
  return DEFAULT_CENTER_NAME;
}

/** Id cơ sở duy nhất (chuỗi) hoặc "" nếu chưa có cơ sở nào. */
export function soleCenterId(centers) {
  if (Array.isArray(centers) && centers.length >= 1 && centers[0]?.id != null) {
    return String(centers[0].id);
  }
  return "";
}

/**
 * Tự điền state id trung tâm về cơ sở duy nhất khi chỉ có 1 cơ sở.
 * `setValue` là setState của caller (hỗ trợ functional updater).
 * Chỉ ghi đè khi state đang rỗng để không phá lựa chọn của người dùng
 * trong trường hợp (hiếm) có nhiều cơ sở.
 */
export function useAutoCenter(centers, setValue) {
  useEffect(() => {
    if (typeof setValue !== "function") return;
    if (Array.isArray(centers) && centers.length === 1 && centers[0]?.id != null) {
      const id = String(centers[0].id);
      setValue((prev) => (prev ? prev : id));
    }
  }, [centers, setValue]);
}

/**
 * Ô chọn cơ sở dùng chung.
 * - ≤ 1 cơ sở  -> nhãn tĩnh (khoá, không cho chọn), chỉ hiện tên cơ sở.
 * - > 1 cơ sở  -> <select> bình thường.
 * Dùng chung `value`/`onChange` như một <select> thật; nhớ kèm
 * `useAutoCenter(centers, setValue)` ở caller để state luôn có id khi single.
 */
export function CenterField({
  centers,
  value,
  onChange,
  placeholder = "Chọn trung tâm",
  disabled = false,
  className,
  id,
}) {
  if (isSingleCenter(centers)) {
    return (
      <div
        id={id}
        className={className}
        data-single-center=""
        aria-readonly="true"
        title="Hệ thống hiện chỉ vận hành 1 cơ sở"
        style={{
          display: "flex",
          alignItems: "center",
          minHeight: 38,
          padding: "0 12px",
          borderRadius: 8,
          border: "1px solid var(--v4-border, #e2e8f0)",
          background: "var(--v4-surface-muted, #f8fafc)",
          color: "var(--v4-text, #0f172a)",
          fontWeight: 600,
          cursor: "default",
        }}
      >
        {soleCenterName(centers)}
      </div>
    );
  }
  return (
    <select
      id={id}
      className={className}
      value={value}
      onChange={onChange}
      disabled={disabled}
    >
      <option value="">{placeholder}</option>
      {centers.map((center) => (
        <option key={center.id} value={center.id}>
          {center.name}
        </option>
      ))}
    </select>
  );
}
