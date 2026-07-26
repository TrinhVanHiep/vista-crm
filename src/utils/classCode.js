// Chuẩn hoá mã lớp để đối chiếu giữa dữ liệu học phí (vd "501", "901-2026")
// và mã lớp roster (vd "V501", "901"). Roster canonical hoá số 3 chữ số thành V###.
export function normCode(code) {
  let c = (code || "").toString().trim().toUpperCase();
  c = c.replace(/-\d{4}$/, "");        // bỏ hậu tố năm: 901-2026 -> 901
  c = c.replace(/^V([3-9]\d{2})$/, "$1"); // V501 -> 501
  return c;
}

// Từ by_class của getTuitionSummary -> Map(normCode -> {total_fee, remaining, paid, students}).
export function tuitionByNormCode(byClass) {
  const map = new Map();
  (byClass || []).forEach((r) => {
    const total = Number(r.total_fee) || 0;
    const remaining = Number(r.remaining) || 0;
    map.set(normCode(r.class_code), {
      total_fee: total,
      remaining,
      paid: Math.max(0, total - remaining),
      students: Number(r.students) || 0,
    });
  });
  return map;
}
