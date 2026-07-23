const COLOR_PALETTE = [
  "#3f8cff",
  "#ff9f43",
  "#6c63ff",
  "#10b981",
  "#f97316",
  "#0ea5e9",
  "#f43f5e",
  "#6366f1",
];

export function getFullName(user) {
  if (!user) return "Chưa có tên";
  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  return fullName || user.username || user.email || "Chưa có tên";
}

export function getInitials(name, fallback = "") {
  const source = name || fallback;
  if (!source) return "VA";
  const initials = source
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return initials || source.slice(0, 2).toUpperCase();
}

export function getAvatarColor(seed) {
  if (!seed) return COLOR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}

export function formatGender(value) {
  if (!value) return "--";
  const normalized = String(value).toLowerCase();
  if (normalized === "male") return "Nam";
  if (normalized === "female") return "Nữ";
  return value;
}

export function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function getAge(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return String(age);
}
