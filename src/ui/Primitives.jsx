/** Các khối nhỏ dùng chung: Thẻ, Nhãn trạng thái, Ô chỉ số, Trạng thái rỗng. */

export function Card({ title, action, children, className = "", bodyStyle }) {
  return (
    <div className={`card ${className}`.trim()}>
      {title || action ? (
        <div className="card-head">
          {typeof title === "string" ? <h3>{title}</h3> : title}
          {action}
        </div>
      ) : null}
      <div style={bodyStyle}>{children}</div>
    </div>
  );
}

/** tone: green | orange | red | blue | purple | gray */
export function Badge({ tone = "gray", children, className = "", ...rest }) {
  return (
    <span className={`badge ${tone} ${className}`.trim()} {...rest}>
      {children}
    </span>
  );
}

/** cols: số cột mong muốn ở màn rộng (tự co còn 2 rồi 1 cột ở màn nhỏ). */
export function KpiGrid({ cols = 4, children, className = "" }) {
  const colClass = cols === 5 ? "cols-5" : cols === 4 ? "cols-4" : "";
  return <div className={`kpi-grid ${colClass} ${className}`.trim()}>{children}</div>;
}

/** icoClass: orange | green | red | blue | purple | yellow */
export function Kpi({ ico, icoClass = "orange", label, value, sub, trend }) {
  return (
    <div className="kpi">
      {ico ? <div className={`ico ${icoClass}`}>{ico}</div> : null}
      <div style={{ minWidth: 0 }}>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
        {trend ? <div className={`trend ${trend.dir === "down" ? "down" : "up"}`}>{trend.text}</div> : null}
        {sub ? <div className="small muted">{sub}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({ icon = "📭", title, hint, action }) {
  return (
    <div className="ui-empty">
      <div className="ui-empty__icon" aria-hidden="true">{icon}</div>
      <div className="ui-empty__title">{title}</div>
      {hint ? <div className="ui-empty__hint">{hint}</div> : null}
      {action ? <div className="ui-empty__action">{action}</div> : null}
    </div>
  );
}

/** Nhãn + control cho form, thay cho mỗi màn tự viết <label><span class="field-label">. */
export function Field({ label, required, hint, error, children }) {
  return (
    <label className="ui-field">
      {label ? (
        <span className="ui-field__label">
          {label}
          {required ? <b className="ui-field__req"> *</b> : null}
        </span>
      ) : null}
      {children}
      {error ? <span className="ui-field__error">{error}</span> : hint ? <span className="ui-field__hint">{hint}</span> : null}
    </label>
  );
}
