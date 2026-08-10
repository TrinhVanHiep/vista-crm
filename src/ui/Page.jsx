import { Link } from "react-router-dom";

/**
 * Khung trang chuẩn: mọi màn đều có cùng nhịp
 *   đường dẫn -> tiêu đề + mô tả -> nút hành động -> nội dung
 *
 * Trước đây 10 màn tự dựng .page-head mỗi màn một kiểu (có màn không có tiêu đề,
 * có màn để nút thành dải riêng, lề trái lệch nhau 22px).
 */
export function PageHeader({ crumbs = [], title, description, actions }) {
  return (
    <div className="page-head">
      {crumbs.length ? (
        <div className="crumb">
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`}>
              {c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
              {i < crumbs.length - 1 ? " / " : null}
            </span>
          ))}
        </div>
      ) : null}

      <div className="ui-page-head__row">
        <div>
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="ui-page-head__actions">{actions}</div> : null}
      </div>
    </div>
  );
}

/** Bọc toàn trang: dùng cho màn KHÔNG có cột phải. */
export function Page({ children, className = "" }) {
  return (
    <div className={`v4page ${className}`.trim()}>
      <div className="content-col">{children}</div>
    </div>
  );
}

/** Bọc toàn trang có cột phải (sidebar nội dung). */
export function PageWithAside({ children, aside, className = "" }) {
  return (
    <div className={`v4page ${className}`.trim()}>
      <div className="content">
        <div className="content-col">{children}</div>
        {aside ? <div className="rightbar">{aside}</div> : null}
      </div>
    </div>
  );
}
