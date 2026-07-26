// Đầu mục đánh giá / kỹ năng theo chương trình của lớp.
// Nguồn dữ liệu thật: /api/evaluation-items/ (model EvaluationItem, theo program_family).
// Vẫn có bộ mặc định hardcode làm fallback khi chưa tải được API.
// Điểm mỗi đầu mục theo thang 0-100. Dùng chung cho form nhập điểm + hiển thị.

// Xếp chương trình vào nhóm: 'phonics' (Finger/Starter/Mover/Pre/Kid) hoặc 'general'.
export function familyOf(programName) {
  const s = (programName || "").toUpperCase();
  return /FINGER|PHONICS|\bPRE\b|STARTER|MOVER|KID/.test(s) ? "phonics" : "general";
}

const DEFAULTS = {
  phonics: ["Nghe", "Phát âm", "Nhận diện", "Tương tác"],
  general: ["Listening", "Speaking", "Reading", "Writing"],
};

// skillsFor(program) -> mặc định; skillsFor(program, evalItems) -> theo dữ liệu API.
export function skillsFor(programName, evalItems) {
  const fam = familyOf(programName);
  if (Array.isArray(evalItems) && evalItems.length) {
    const labels = evalItems
      .filter((i) => i.program_family === fam)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((i) => i.label);
    if (labels.length) return labels;
  }
  return DEFAULTS[fam];
}
