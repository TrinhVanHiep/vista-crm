/**
 * Bản tiếng Anh cho toàn bộ giao diện (14/10/2026).
 *
 * Giao diện viết thẳng ~3.500 câu tiếng Việt trong 80 file; bọc từng câu bằng t()
 * là vài tuần công và dễ sót. Thay vào đó: một từ điển Việt -> Anh (src/i18n/en.json,
 * gồm cả câu thông báo / lỗi từ máy chủ) và một bộ dịch theo dõi DOM — khi chọn EN,
 * mọi chữ hiện ra (text, placeholder, title, aria-label, alert/confirm) được tra từ
 * điển; câu có số/tên ("Tháng 10/2026", "{0} ca dạy") khớp theo mẫu {0},{1}.
 * Chọn lại VI là trả nguyên chữ gốc. Câu chưa có trong từ điển giữ tiếng Việt —
 * thêm vào en.json là xong, không phải sửa component.
 *
 * Không dịch: ô nhập liệu người dùng gõ, vùng có [data-no-translate] / .notranslate.
 */

import TU_DIEN_CHINH from "./en.json";
import BO_SUNG from "./en-bo-sung.json";

// Bổ sung (câu quét thấy còn sót, ngày tháng) đè lên từ điển chính.
const TU_DIEN = { ...TU_DIEN_CHINH, ...BO_SUNG };

const KHOA = "vista_lang";
const THUOC_TINH = ["placeholder", "title", "aria-label", "alt"];
const BO_QUA = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE", "NOSCRIPT"]);

let ngonNgu = "vi";
try {
  ngonNgu = localStorage.getItem(KHOA) === "en" ? "en" : "vi";
} catch {
  /* storage bị chặn: mặc định tiếng Việt */
}

const chuan = (s) => s.replace(/\s+/g, " ").trim();
const tinh = new Map();
const mau = [];
Object.entries(TU_DIEN).forEach(([vi, en]) => {
  if (!en || vi === en) return;
  if (/\{\d+\}/.test(vi)) {
    const nguon = chuan(vi).replace(/[.*+?^$()|[\]\\]/g, "\\$&")
      .replace(/\\?\{(\d+)\\?\}/g, (_, n) => `(?<p${n}>.+?)`);
    try {
      mau.push({ re: new RegExp(`^${nguon}$`, "s"), en, do_dai: vi.replace(/\{\d+\}/g, "").length });
    } catch {
      /* mẫu hỏng: bỏ qua */
    }
  } else {
    tinh.set(chuan(vi), en);
  }
});
// Mẫu nhiều chữ cố định khớp trước mẫu ít chữ ("Tháng {0}/{1}" trước "{0}/{1}").
mau.sort((a, b) => b.do_dai - a.do_dai);

const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

/** Dịch một câu; trả null nếu không có trong từ điển. */
export function dichCau(s) {
  return dichCauCore(s, 0);
}

function dichCauCore(s, sau) {
  if (!s || !VI.test(s)) return null;
  const k = chuan(s);
  const co = tinh.get(k);
  if (co) return co;
  for (const m of mau) {
    const kq = m.re.exec(k);
    if (!kq) continue;
    // Phần chèn vào ({0}…) còn tiếng Việt mà không dịch được thì bỏ mẫu này — thà giữ
    // nguyên câu tiếng Việt còn hơn ra câu nửa Anh nửa Việt ("Search học sinh, …").
    let hong = false;
    const kqDich = m.en.replace(/\{(\d+)\}/g, (_, n) => {
      const v = kq.groups?.[`p${n}`] ?? "";
      if (!VI.test(v)) return v;
      const d = tinh.get(chuan(v)) || (sau < 3 ? dichCauSau(v, sau + 1) : null);
      // Tên riêng / dữ liệu ngắn (≤ 4 từ: "Nguyễn Văn A", "Lớp 701") giữ nguyên là đúng;
      // đoạn dài còn tiếng Việt thì coi như chưa dịch được.
      // Chỉ giữ nguyên phần chèn là tên riêng / mã (bắt đầu bằng chữ hoa hoặc số); chữ thường
      // ("ngày", "học sinh, …") nghĩa là mẫu đang khớp nhầm một câu khác.
      if (!d && (v.trim().split(/\s+/).length > 4 || !/^[\p{Lu}\d]/u.test(v.trim()))) hong = true;
      return d || v;
    });
    if (!hong) return kqDich;
  }
  return null;
}

function dichCauSau(s, sau) {
  return dichCauCore(s, sau);
}

// ---- Áp lên DOM -------------------------------------------------------------------
const gocText = new WeakMap(); // text node -> { goc, dich }
const gocAttr = new WeakMap(); // element -> { [attr]: { goc, dich } }

function boQua(el) {
  for (let e = el; e && e !== document.body; e = e.parentElement) {
    if (BO_QUA.has(e.tagName) || e.isContentEditable || e.hasAttribute?.("data-no-translate")
        || e.classList?.contains("notranslate")) return true;
  }
  return false;
}

function dichText(node) {
  const gt = node.nodeValue;
  const ghi = gocText.get(node);
  if (ghi && gt === ghi.dich) return; // chính mình vừa ghi
  const goc = gt;
  if (!VI.test(goc) || boQua(node.parentElement)) return;
  const dich = dichCau(goc);
  if (!dich) return;
  const dau = goc.match(/^\s*/)[0];
  const cuoi = goc.match(/\s*$/)[0];
  const moi = dau + dich + cuoi;
  gocText.set(node, { goc, dich: moi });
  node.nodeValue = moi;
}

function dichAttr(el) {
  if (boQua(el)) return;
  THUOC_TINH.forEach((a) => {
    const v = el.getAttribute?.(a);
    if (!v) return;
    const ghi = gocAttr.get(el) || {};
    if (ghi[a] && v === ghi[a].dich) return;
    const dich = dichCau(v);
    if (!dich) return;
    ghi[a] = { goc: v, dich };
    gocAttr.set(el, ghi);
    el.setAttribute(a, dich);
  });
  if (el.tagName === "INPUT" && ["button", "submit"].includes(el.type) && VI.test(el.value)) {
    const dich = dichCau(el.value);
    if (dich) el.value = dich;
  }
}

function duyet(goc) {
  if (!goc) return;
  if (goc.nodeType === Node.TEXT_NODE) { dichText(goc); return; }
  if (goc.nodeType !== Node.ELEMENT_NODE) return;
  dichAttr(goc);
  const w = document.createTreeWalker(goc, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) dichText(n);
    else dichAttr(n);
  }
}

function traLaiGoc(goc) {
  const w = document.createTreeWalker(goc, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) {
      const g = gocText.get(n);
      if (g && n.nodeValue === g.dich) n.nodeValue = g.goc;
      gocText.delete(n);
    } else {
      const g = gocAttr.get(n);
      if (g) Object.entries(g).forEach(([a, { goc: v, dich }]) => {
        if (n.getAttribute(a) === dich) n.setAttribute(a, v);
      });
      gocAttr.delete(n);
    }
  }
}

let quanSat = null;
let hangCho = new Set();
let henGio = 0;
const xuLyHang = () => {
  henGio = 0;
  const ds = hangCho;
  hangCho = new Set();
  ds.forEach((n) => n.isConnected && duyet(n));
};

function batDauDich() {
  if (quanSat) return;
  duyet(document.body);
  dichTieuDe();
  quanSat = new MutationObserver((ds) => {
    ds.forEach((m) => {
      if (m.type === "characterData") hangCho.add(m.target);
      else if (m.type === "attributes") hangCho.add(m.target);
      else m.addedNodes.forEach((n) => hangCho.add(n));
    });
    // setTimeout chứ không requestAnimationFrame: tab bị ẩn thì rAF dừng, chữ mới hiện ra
    // trong lúc đó không bao giờ được dịch.
    if (!henGio) henGio = setTimeout(xuLyHang, 30);
  });
  quanSat.observe(document.body, {
    subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: THUOC_TINH,
  });
}

function dungDich() {
  quanSat?.disconnect();
  quanSat = null;
  traLaiGoc(document.body);
}

let tieuDeGoc = null;
function dichTieuDe() {
  const d = dichCau(document.title);
  if (d) { tieuDeGoc = document.title; document.title = d; }
}

// alert / confirm / prompt trong code cũ cũng phải ra tiếng Anh.
const alertGoc = window.alert.bind(window);
const confirmGoc = window.confirm.bind(window);
window.alert = (m) => alertGoc(ngonNgu === "en" ? dichDoan(m) : m);
window.confirm = (m) => confirmGoc(ngonNgu === "en" ? dichDoan(m) : m);

/** Dịch cả đoạn nhiều dòng (alert/confirm hay ghép nhiều câu bằng \n). */
export function dichDoan(s) {
  if (typeof s !== "string") return s;
  return s.split("\n").map((dong) => dichCau(dong) || dong).join("\n");
}

const nguoiNghe = new Set();
export const layNgonNgu = () => ngonNgu;
export function theoDoiNgonNgu(fn) {
  nguoiNghe.add(fn);
  return () => nguoiNghe.delete(fn);
}

export function datNgonNgu(ma) {
  const moi = ma === "en" ? "en" : "vi";
  if (moi === ngonNgu) return;
  ngonNgu = moi;
  try { localStorage.setItem(KHOA, moi); } catch { /* bỏ qua */ }
  document.documentElement.lang = moi;
  if (moi === "en") batDauDich();
  else {
    dungDich();
    if (tieuDeGoc) document.title = tieuDeGoc;
  }
  nguoiNghe.forEach((fn) => fn(moi));
}

export function khoiDongDich() {
  document.documentElement.lang = ngonNgu;
  if (ngonNgu === "en") {
    if (document.body) batDauDich();
    else document.addEventListener("DOMContentLoaded", batDauDich, { once: true });
  }
}
