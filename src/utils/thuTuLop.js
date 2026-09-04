/**
 * Thứ tự chuẩn của danh sách lớp — MỘT nguồn duy nhất cho mọi màn.
 *
 * Chủ dự án chốt (04/09/2026): xếp theo chương trình rồi tới độ tuổi/cấp độ.
 *   1. KID    — 4-5 tuổi
 *   2. TACB   — lớp 1 đến 12
 *   3. CAM    — Starter → Mover → Flyer
 *   4. IELTS  — 0-2.0 → 3.0 → 4.0 → 5.0-5.5 → 6.0-6.5
 *
 * Trước đây danh sách chỉ sắp theo mã lớp nên "501, 502, 601..." đứng trước
 * "KID1, M1, ST01" — nhìn không ra khối nào với khối nào.
 *
 * Dữ liệu thật viết KHÔNG thống nhất ("Kid"/"KID", "Cambridge"/"CAM",
 * "Finger Print 1", "Khối 9 + Luyện thi"), nên mọi phép so đều bỏ dấu và
 * thường hoá trước; nhận diện theo TỪ KHOÁ chứ không so bằng chuỗi tuyệt đối.
 */

/** Bỏ dấu tiếng Việt, hạ chữ thường, gộp khoảng trắng. */
export function boDau(v) {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Nhóm chương trình đã chuẩn hoá: "kid" | "tacb" | "cam" | "ielts" | "" */
export function nhomChuongTrinh(tenChuongTrinh, tenCapDo = "") {
  const s = `${boDau(tenChuongTrinh)} ${boDau(tenCapDo)}`;
  if (/\bielts\b/.test(s)) return "ielts";
  // "cam" phải khớp cả "cambridge"; đặt TRƯỚC kid vì lớp Cambridge cũng có thể
  // ghi kèm chữ "starter" chứ không bao giờ ghi "kid".
  if (/\bcam(bridge)?\b/.test(s)) return "cam";
  if (/\bkid\b|finger ?print|mau giao|mam non/.test(s)) return "kid";
  if (/\btacb\b|tieng anh co ban|\bkhoi \d/.test(s)) return "tacb";
  return "";
}

const HANG_NHOM = { kid: 1, tacb: 2, cam: 3, ielts: 4 };

// Cambridge xếp theo bậc thi, không theo bảng chữ cái: Pre-Starter đứng trước
// Starter, còn Flyer là cao nhất.
const BAC_CAM = [
  [/pre[ -]?starter|\bpre\b/, 1],
  [/starter|\bst\d*\b/, 2],
  [/mover|\bmv?\d*\b/, 3],
  [/flyer|\bfl\d*\b/, 4],
];

/** Số thứ tự cấp độ TRONG một nhóm. Không đoán được thì trả về +vô cùng. */
export function hangCapDo(nhom, tenCapDo, tenLop = "") {
  const s = `${boDau(tenCapDo)} ${boDau(tenLop)}`.trim();
  if (!s) return Number.POSITIVE_INFINITY;

  if (nhom === "cam") {
    for (const [mau, hang] of BAC_CAM) if (mau.test(s)) return hang;
    return Number.POSITIVE_INFINITY;
  }

  if (nhom === "ielts") {
    // "0-2.0" -> 0, "5.0-5.5" -> 5. Lấy số ĐẦU TIÊN làm mốc dải điểm.
    const m = s.match(/(\d+(?:[.,]\d+)?)/);
    return m ? parseFloat(m[1].replace(",", ".")) : Number.POSITIVE_INFINITY;
  }

  // KID ("Finger Print 1" -> 1, "4 tuổi" -> 4) và TACB ("Khối 5" -> 5,
  // "Khối 9 + Luyện thi" -> 9) đều lấy số đầu tiên xuất hiện.
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : Number.POSITIVE_INFINITY;
}

/** So sánh hai lớp theo thứ tự chuẩn. Dùng trực tiếp trong Array.sort. */
export function soSanhLop(a, b) {
  const na = nhomChuongTrinh(a?.program_name, a?.level_name);
  const nb = nhomChuongTrinh(b?.program_name, b?.level_name);
  // Lớp chưa gán chương trình dồn xuống cuối, không xen giữa các nhóm.
  const ha = HANG_NHOM[na] || 99;
  const hb = HANG_NHOM[nb] || 99;
  if (ha !== hb) return ha - hb;

  // Cùng hạng nhưng khác tên chương trình (ví dụ hai lớp đều chưa gán) thì
  // xếp theo tên cho ổn định.
  if (ha === 99) {
    const ta = boDau(a?.program_name);
    const tb = boDau(b?.program_name);
    if (ta !== tb) return ta < tb ? -1 : 1;
  }

  const ca = hangCapDo(na, a?.level_name, a?.class_code || a?.name);
  const cb = hangCapDo(nb, b?.level_name, b?.class_code || b?.name);
  if (ca !== cb) return ca - cb;

  // Cùng cấp độ thì theo mã lớp, so kiểu tự nhiên để "M2" đứng sau "M1" chứ
  // không phải "M10" chen vào giữa.
  const ma = String(a?.class_code || a?.name || "");
  const mb = String(b?.class_code || b?.name || "");
  return ma.localeCompare(mb, "vi", { numeric: true, sensitivity: "base" });
}

/** Bản sao đã sắp xếp — không sửa mảng gốc. */
export function sapXepLop(danhSach) {
  return Array.isArray(danhSach) ? [...danhSach].sort(soSanhLop) : [];
}

/** Nhãn nhóm để hiện tiêu đề phân nhóm trên bảng. */
export const NHAN_NHOM = {
  kid: "KID · 4-5 tuổi",
  tacb: "TACB · lớp 1-12",
  cam: "CAM · Starter - Mover - Flyer",
  ielts: "IELTS · theo dải điểm",
  "": "Chưa gán chương trình",
};
