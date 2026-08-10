/**
 * Nút chuẩn — MỘT nguồn duy nhất cho toàn hệ thống.
 *
 * Trước đây tồn tại song song 2 hệ: class toàn cục (.btn primary/.btn ghost/.btn
 * ghost sm) và class CSS-module (styles.primaryButton/secondaryButton/iconButton)
 * -> cùng một loại nút nhưng trông khác nhau tuỳ màn, và nút dùng class toàn cục
 * đặt trong modal CSS-module thì mất sạch style.
 */
export default function Button({
  variant = "ghost", // primary | ghost | danger | link
  size = "md", // md | sm
  icon = null,
  loading = false,
  loadingText,
  children,
  className = "",
  disabled,
  type = "button",
  ...rest
}) {
  const cls = [
    "ui-btn",
    `ui-btn--${variant}`,
    size === "sm" ? "ui-btn--sm" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={cls} disabled={disabled || loading} {...rest}>
      {loading ? (
        loadingText || "Đang xử lý..."
      ) : (
        <>
          {icon ? <span className="ui-btn__icon">{icon}</span> : null}
          {children}
        </>
      )}
    </button>
  );
}
