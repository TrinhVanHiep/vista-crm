import styles from "../styles/employeeList.module.css";

function ConfirmDialog({
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <header className={styles.modalHeader}>
          <h2>{title}</h2>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Đóng"
            onClick={onCancel}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M6 6 18 18M6 18 18 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </header>
        <div className={styles.modalBody}>
          <p className={styles.note}>{message}</p>
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onCancel}
              disabled={isLoading}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? "Đang xử lý..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
