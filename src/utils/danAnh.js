import { useEffect, useRef } from "react";

// Dán ảnh bằng Ctrl/Cmd + V vào ô minh chứng (03/11/2026, chủ TT): chụp màn hình / copy ảnh rồi
// dán thẳng, không phải lưu file rồi chọn lại.
//
// Nhiều ô minh chứng có thể cùng mở (vd. danh sách việc) -> chỉ ô MỞ GẦN NHẤT nhận ảnh, tránh một
// lần dán tải lên hai nơi.
const NGAN_XEP = [];
let dem = 0;

export const anhTuClipboard = (e) => {
  const items = Array.from(e?.clipboardData?.items || []);
  return items
    .filter((it) => it.kind === "file" && String(it.type).startsWith("image/"))
    .map((it, i) => {
      const f = it.getAsFile();
      if (!f) return null;
      const duoi = (f.type.split("/")[1] || "png").replace("jpeg", "jpg");
      return new File([f], f.name && f.name !== "image.png" ? f.name : `anh-dan-${Date.now()}-${i}.${duoi}`, { type: f.type });
    })
    .filter(Boolean);
};

export function useDanAnh(onFiles, batDuoc = true) {
  const goi = useRef(onFiles);
  goi.current = onFiles;
  useEffect(() => {
    if (!batDuoc) return undefined;
    const id = ++dem;
    NGAN_XEP.push(id);
    const nghe = (e) => {
      if (NGAN_XEP[NGAN_XEP.length - 1] !== id) return;
      const files = anhTuClipboard(e);
      if (!files.length) return; // dán chữ thì để ô nhập xử lý như thường
      e.preventDefault();
      goi.current(files);
    };
    document.addEventListener("paste", nghe);
    return () => {
      document.removeEventListener("paste", nghe);
      const i = NGAN_XEP.indexOf(id);
      if (i >= 0) NGAN_XEP.splice(i, 1);
    };
  }, [batDuoc]);
}
