/**
 * Bảng dữ liệu chuẩn — thay cho 9 màn tự dựng bảng mỗi màn một kiểu.
 *
 * Tự lo sẵn: cuộn ngang trên màn nhỏ (.tbl-wrap), trạng thái đang tải, trạng
 * thái rỗng lịch sự, canh giữa/phải theo cột. Nhờ vậy không còn cảnh bảng bị
 * cắt cột trên laptop hay mỗi màn một câu "chưa có dữ liệu" khác nhau.
 *
 * columns: [{ key, header, align?, width?, render?(row, index) }]
 */
export default function DataTable({
  columns = [],
  rows = [],
  loading = false,
  loadingText = "Đang tải...",
  empty = "Chưa có dữ liệu.",
  rowKey = (row, i) => row?.id ?? i,
  onRowClick,
  minWidth = 720,
  className = "",
}) {
  const alignCls = (a) => (a === "center" ? "t-center" : a === "right" ? "t-right" : "");

  return (
    <div className="tbl-wrap">
      {/* minWidth là ngưỡng để bảng CUỘN trong khung, không phải bề rộng ép:
          dùng min() nên trên màn hẹp hơn ngưỡng thì bảng co lại vừa khung rồi
          mới cuộn, thay vì đẩy cả trang rộng ra. */}
      <table className={`tbl ui-table ${className}`.trim()} style={{ minWidth: `min(${typeof minWidth === "number" ? `${minWidth}px` : minWidth}, 100%)` }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={alignCls(c.align)} style={c.width ? { width: c.width } : undefined}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="ui-table__state">
                {loadingText}
              </td>
            </tr>
          ) : rows.length ? (
            rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                className={onRowClick ? "ui-table__row--click" : undefined}
                // Dòng bấm được thì phải dùng được bằng bàn phím / trình đọc màn
                // hình (bản cũ dạng thẻ có role=button + Enter/Space).
                role={onRowClick ? "button" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(row, i);
                        }
                      }
                    : undefined
                }
              >
                {columns.map((c) => (
                  <td key={c.key} className={alignCls(c.align)}>
                    {c.render ? c.render(row, i) : row[c.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="ui-table__state">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
