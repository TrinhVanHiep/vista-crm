import { useEffect } from "react";

/**
 * Ngăn kéo trượt từ mép phải — dùng cho nghiệp vụ thu tiền.
 *
 * Bản mẫu chọn ngăn kéo thay vì hộp thoại giữa màn, và đúng cho nghiệp vụ này:
 * kế toán vẫn nhìn thấy bảng công nợ ở nửa trái trong lúc gõ số tiền, không
 * phải đóng ra đóng vào để đối chiếu từng dòng.
 */
export default function NganKeo({ mo, onDong, tieuDe, moTa, chan, children }) {
  useEffect(() => {
    if (!mo) return undefined;
    const onPhim = (e) => { if (e.key === "Escape") onDong?.(); };
    document.addEventListener("keydown", onPhim);
    // Khoá cuộn nền để không bị "cuộn xuyên" ra trang phía sau.
    const cu = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onPhim);
      document.body.style.overflow = cu;
    };
  }, [mo, onDong]);

  if (!mo) return null;

  return (
    <div
      className="fin-nk__nen"
      role="dialog"
      aria-modal="true"
      aria-label={typeof tieuDe === "string" ? tieuDe : undefined}
      onClick={onDong}
    >
      {/* Chặn nổi bọt: bấm trong ngăn kéo không được tính là bấm ra nền. */}
      <div className="fin-nk" onClick={(e) => e.stopPropagation()}>
        <div className="fin-nk__dau">
          <div>
            <h3>{tieuDe}</h3>
            {moTa ? <p>{moTa}</p> : null}
          </div>
          <button type="button" className="fin-nk__dong" onClick={onDong} aria-label="Đóng">
            ×
          </button>
        </div>
        <div className="fin-nk__than">{children}</div>
        {chan ? <div className="fin-nk__chan">{chan}</div> : null}
      </div>
    </div>
  );
}
