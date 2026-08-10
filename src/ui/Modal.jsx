import { useEffect } from "react";
import Button from "./Button";

/**
 * Hộp thoại chuẩn — dùng chung cho mọi màn.
 *
 * Sửa 3 vấn đề của các modal đang có:
 *  1. Nhiều modal render NGOÀI .v4page nên mất token màu -> nay token ở :root
 *     và modal có class riêng nên luôn đúng tông.
 *  2. Mỗi màn tự dựng backdrop/kích thước/khoảng cách khác nhau.
 *  3. Chỉ 1/6 modal đóng được khi bấm nền; không modal nào đóng bằng phím Esc.
 */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md", // sm | md | lg
  closeOnBackdrop = true,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    // Khoá cuộn nền để không bị "cuộn xuyên" khi modal mở.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="ui-modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : undefined}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className={`ui-modal ui-modal--${size}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ui-modal__head">
          <div>
            {title ? <h2 className="ui-modal__title">{title}</h2> : null}
            {subtitle ? <p className="ui-modal__sub">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="ui-modal__close"
            aria-label="Đóng"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M6 6 18 18M6 18 18 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="ui-modal__body">{children}</div>

        {footer === null ? null : (
          <footer className="ui-modal__foot">
            {footer || (
              <Button onClick={onClose}>Đóng</Button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}
