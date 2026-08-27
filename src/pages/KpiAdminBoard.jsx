/**
 * CHẤM THI ĐUA — màn của quản trị (/cham-thi-dua).
 *
 * Dựng theo bản UI chủ dự án gửi (export/index.html): cột trái là danh sách
 * người được chấm, cột giữa là bảng chấm + điểm cộng/trừ, cột phải là tổng hợp,
 * nhận xét, quy trình duyệt, nhật ký và dải nút hành động.
 *
 * Khác màn tự chấm (/thi-dua-thang): ở đây chấm cột ĐIỂM QUẢN LÝ cho NGƯỜI
 * KHÁC, nên mọi thứ đi qua /kpi-reports/admin-board/ và /admin-score/ —
 * backend chặn vai không đủ quyền ngay tại hai endpoint đó.
 *
 * Khung tiêu chí đọc từ /kpi-frame/, KHÔNG viết cứng 5 nhóm như bản thiết kế:
 * trung tâm đang chạy khung 4 nhóm, viết cứng là lệch ngay với quy chế thật.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import {
  kyDuyetPhieu,
  layBangChamQuanTri,
  layKhungKpi,
  layPhieu,
  layQuyTacDieuChinh,
  quanTriChamDiem,
  traLaiPhieu,
} from "../services/kpiService";
import { listCentersAll } from "../services/calendarService";
import "../styles/kpiAdmin.css";

/* ---------------------------------------------------------------- tiện ích */

const THANG = Array.from({ length: 12 }, (_, i) => i + 1);
const NAM = [2025, 2026, 2027];
const MOI_TRANG = 5;
const TOI_DA_NHAN_XET = 500;

const TRANG_THAI = [
  { ma: "", ten: "Tất cả" },
  { ma: "submitted", ten: "Chờ chấm" },
  { ma: "approved", ten: "Đã duyệt" },
  { ma: "revision_required", ten: "Cần bổ sung" },
  { ma: "draft", ten: "Nháp" },
];

// Nhãn + màu viên trạng thái, khớp bảng màu bản thiết kế.
const VIEN = {
  submitted: { lop: "ka-wait", ten: "Chờ duyệt" },
  revision_required: { lop: "ka-more", ten: "Cần bổ sung" },
  approved: { lop: "ka-done", ten: "Đã duyệt" },
  draft: { lop: "ka-draft", ten: "Nháp" },
};

// Bản thiết kế tô 4 màu luân phiên cho các nhóm tiêu chí. Lấy theo THỨ TỰ nhóm
// chứ không theo mã nhóm, để trung tâm đổi khung chấm vẫn ra màu hợp lý.
const MAU_NHOM = ["ka-blue", "ka-green", "ka-purple", "ka-orange"];
const MAU_THANH = ["var(--ka-blue)", "var(--ka-green)", "#7a3fbf", "var(--ka-orange)"];

const laSo = (x) => x !== null && x !== undefined && x !== "" && !Number.isNaN(Number(x));
const g1 = (x) => {
  const n = Math.round(Number(x) * 10) / 10;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
};
const soHoacGach = (x) => (laSo(x) ? g1(x) : "—");

/** Kẹp điểm vào khoảng 0..toiDa ngay lúc gõ. Chuỗi rỗng giữ nguyên = chưa chấm. */
function kepDiem(v, toiDa) {
  if (v === "" || v === null || v === undefined) return "";
  const n = Number(v);
  if (Number.isNaN(n)) return "";
  return String(Math.min(Math.max(n, 0), Number(toiDa) || 0));
}

function ngayGon(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function ngayGioGon(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}\u00a0\u00a0${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Gỡ câu lỗi DRF trả về (chuỗi, mảng, {detail}, hoặc {field: [...]}). */
function thongDiepLoi(e, macDinh) {
  const d = e?.response?.data;
  if (typeof d === "string" && d && !d.startsWith("<")) return d;
  if (Array.isArray(d) && d.length) return String(d[0]);
  if (d?.detail) return String(d.detail);
  if (d && typeof d === "object") {
    const dau = Object.values(d)[0];
    if (Array.isArray(dau) && dau.length) return String(dau[0]);
    if (typeof dau === "string") return dau;
  }
  return macDinh;
}

/* ------------------------------------------------------------------- icons */
/* Bản thiết kế dùng font icon Material Symbols tải từ Google; ứng dụng không
   nạp font đó nên vẽ bằng SVG để không phụ thuộc mạng ngoài. */

const Ico = ({ d, fill = false, ...rest }) => (
  <span className="ka-ms" aria-hidden="true" {...rest}>
    <svg viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke="currentColor"
         strokeWidth={fill ? 0 : 1.9} strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  </span>
);

const IcoNguoi = (p) => <Ico {...p} d={<><circle cx="9" cy="8" r="3.2" /><path d="M3 19c0-3 2.7-4.6 6-4.6s6 1.6 6 4.6" /><path d="M16 6.2a3 3 0 0 1 0 5.6M17.5 19c0-2.4-1-3.7-2.4-4.4" /></>} />;
const IcoDaXong = (p) => <Ico {...p} fill d={<><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.7 7.7-5.6 5.6a1 1 0 0 1-1.4 0l-2.6-2.6a1 1 0 1 1 1.4-1.4l1.9 1.9 4.9-4.9a1 1 0 0 1 1.4 1.4Z" /></>} />;
const IcoTim = (p) => <Ico {...p} d={<><circle cx="11" cy="11" r="6.4" /><path d="m16 16 4 4" /></>} />;
const IcoBieuDo = (p) => <Ico {...p} d={<><path d="M4 16.5 9 11l3.5 3.5L20 7" /><path d="M15.5 7H20v4.5" /></>} />;
const IcoLich = (p) => <Ico {...p} d={<><rect x="3.5" y="5" width="17" height="15.5" rx="2.4" /><path d="M8 3v4M16 3v4M3.5 10h17" /></>} />;
const IcoTai = (p) => <Ico {...p} d={<><path d="M12 4v11" /><path d="m7.5 10.5 4.5 4.5 4.5-4.5" /><path d="M4.5 19.5h15" /></>} />;
const IcoTich = (p) => <Ico {...p} d={<><path d="m5 12.5 4.5 4.5L19 7.5" /></>} />;
const IcoSua = (p) => <Ico {...p} d={<><path d="M4 20h4.2L19 9.2a2.1 2.1 0 0 0-3-3L5.2 17.1 4 20Z" /><path d="m14.5 7 2.5 2.5" /></>} />;
const IcoQuayLai = (p) => <Ico {...p} d={<><path d="M9 7 4.5 11.5 9 16" /><path d="M4.5 11.5H14a5.5 5.5 0 0 1 0 11h-2" /></>} />;
const IcoKep = (p) => <Ico {...p} d={<><path d="M17 8.5 10 15.5a2.6 2.6 0 0 1-3.7-3.7l7.6-7.6a4 4 0 0 1 5.6 5.6l-7.6 7.6a5.4 5.4 0 0 1-7.6-7.6l6.6-6.6" /></>} />;
const IcoAnh = (p) => <Ico {...p} d={<><rect x="3.5" y="5" width="17" height="14" rx="2.4" /><circle cx="9" cy="10" r="1.6" /><path d="m4.5 17 4.6-4.4 3.4 3.2 3-2.6 4 3.8" /></>} />;
const IcoCanhBao = (p) => <Ico {...p} fill d={<><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4.6a1.1 1.1 0 0 1 1.1 1.1v5a1.1 1.1 0 0 1-2.2 0v-5A1.1 1.1 0 0 1 12 6.6Zm0 9a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Z" /></>} />;
const IcoDongHo = (p) => <Ico {...p} d={<><circle cx="12" cy="12" r="8.6" /><path d="M12 7v5.3l3.2 2" /></>} />;
const IcoTrai = (p) => <Ico {...p} d={<><path d="M14.5 6 9 12l5.5 6" /></>} />;
const IcoPhai = (p) => <Ico {...p} d={<><path d="M9.5 6 15 12l-5.5 6" /></>} />;

/* ------------------------------------------------------------------- trang */

/**
 * @param {boolean} nhungTrongTrang  Đang nằm trong màn Thi đua tháng: bỏ tiêu đề,
 *   breadcrumb, chip tài khoản và ô chọn tháng/năm — trang cha đã có sẵn cả bốn
 *   thứ đó, để lại là màn hình có hai tiêu đề và hai bộ chọn kỳ chống nhau.
 * @param {number} month, @param {number} year  Kỳ do trang cha quyết định khi nhúng.
 */
export default function KpiAdminBoard({ nhungTrongTrang = false, month, year } = {}) {
  const { user } = useAuth();
  const homNay = new Date();

  const [thangTuQuan, setThangTuQuan] = useState(homNay.getMonth() + 1);
  const [namTuQuan, setNamTuQuan] = useState(homNay.getFullYear());
  // Khi nhúng thì kỳ lấy từ trang cha; khi đứng riêng thì tự quản.
  const thang = nhungTrongTrang && month ? month : thangTuQuan;
  const nam = nhungTrongTrang && year ? year : namTuQuan;
  const setThang = setThangTuQuan;
  const setNam = setNamTuQuan;
  const [coSo, setCoSo] = useState("");
  const [trangThai, setTrangThai] = useState("");
  const [tuKhoa, setTuKhoa] = useState("");
  const [tuKhoaGoi, setTuKhoaGoi] = useState("");
  const [trang, setTrang] = useState(1);

  const [khung, setKhung] = useState([]);
  const [quyTac, setQuyTac] = useState([]);
  const [dsCoSo, setDsCoSo] = useState([]);
  const [bang, setBang] = useState({ summary: {}, results: [], count: 0, pages: 1 });
  const [chonId, setChonId] = useState(null);
  const [phieu, setPhieu] = useState(null);

  const [dangTai, setDangTai] = useState(true);
  const [dangTaiPhieu, setDangTaiPhieu] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState("");
  const [thongBao, setThongBao] = useState("");
  const [xemHetNhatKy, setXemHetNhatKy] = useState(false);

  // Bản nháp đang gõ. Tách khỏi `phieu` để gõ dở chưa lưu không bị ghi đè mỗi
  // lần backend trả phiếu mới về.
  const [diemNhap, setDiemNhap] = useState({});
  const [dieuChinhNhap, setDieuChinhNhap] = useState({});
  const [nhanXet, setNhanXet] = useState("");

  /* Gõ tìm kiếm thì chờ 400ms mới gọi API, khỏi bắn một lượt mỗi phím. */
  const oCho = useRef(null);
  useEffect(() => {
    oCho.current = setTimeout(() => {
      setTuKhoaGoi(tuKhoa.trim());
      setTrang(1);
    }, 400);
    return () => clearTimeout(oCho.current);
  }, [tuKhoa]);

  useEffect(() => {
    let song = true;
    Promise.all([layKhungKpi(), layQuyTacDieuChinh(), listCentersAll()])
      .then(([k, q, c]) => {
        if (!song) return;
        setKhung(k);
        setQuyTac(q);
        setDsCoSo(Array.isArray(c) ? c : c?.results || []);
      })
      .catch((e) => song && setLoi(thongDiepLoi(e, "Không tải được khung chấm thi đua.")));
    return () => { song = false; };
  }, []);

  /* Mỗi lượt tải mang một số thứ tự; chỉ lượt MỚI NHẤT được phép ghi vào state.
     Không có nó thì đổi bộ lọc nhanh hai lần, lượt cũ về sau sẽ đè lên lượt mới. */
  const luotBang = useRef(0);
  const luotPhieu = useRef(0);

  const taiBang = useCallback(async () => {
    const luot = ++luotBang.current;
    setDangTai(true);
    try {
      const kq = await layBangChamQuanTri({
        month: thang, year: nam, center: coSo, status: trangThai,
        q: tuKhoaGoi, page: trang, page_size: MOI_TRANG,
      });
      if (luot !== luotBang.current) return null;
      setBang(kq);
      setLoi("");
      return kq;
    } catch (e) {
      if (luot === luotBang.current) setLoi(thongDiepLoi(e, "Không tải được danh sách phiếu thi đua."));
      return null;
    } finally {
      if (luot === luotBang.current) setDangTai(false);
    }
  }, [thang, nam, coSo, trangThai, tuKhoaGoi, trang]);

  useEffect(() => { taiBang(); }, [taiBang]);

  /* Chọn sẵn phiếu đầu tiên khi danh sách đổi mà phiếu đang xem không còn. */
  useEffect(() => {
    if (!bang.results.length) { setChonId(null); setPhieu(null); return; }

    if (!bang.results.some((x) => x.id === chonId)) setChonId(bang.results[0].id);
  }, [bang.results, chonId]);

  useEffect(() => {
    // Danh sách rỗng đi giữa lúc đang tải: phải tắt cờ, không thì màn kẹt
    // "Đang tải phiếu…" vĩnh viễn.
    if (!chonId) { setPhieu(null); setDangTaiPhieu(false); return undefined; }
    const luot = ++luotPhieu.current;
    setDangTaiPhieu(true);
    layPhieu(chonId)
      .then((d) => {
        if (luot !== luotPhieu.current) return;
        setPhieu(d);
        setXemHetNhatKy(false);
      })
      .catch((e) => {
        if (luot === luotPhieu.current) setLoi(thongDiepLoi(e, "Không tải được phiếu thi đua."));
      })
      .finally(() => { if (luot === luotPhieu.current) setDangTaiPhieu(false); });
    return undefined;
  }, [chonId]);

  /* Nạp bản nháp từ phiếu mỗi khi đổi sang phiếu khác.
   *
   * CHỈ lấy điểm quản lý, KHÔNG mồi bằng điểm tự chấm. Mồi sẵn thì lượt "Lưu"
   * đầu tiên chép nguyên bảng tự chấm sang cột quản lý — biến đề xuất của giáo
   * viên thành quyết định của quản trị trên cả những tiêu chí chưa ai xem tới.
   * Ô để trống hiện điểm tự chấm dưới dạng gợi ý (placeholder), và tổng vẫn
   * tính bằng điểm tự chấm y như backend, nên nhìn không khác gì mà không ghi bừa. */
  useEffect(() => {
    if (!phieu) return;
    const d = {};
    (phieu.scores || []).forEach((s) => {
      d[s.criterion] = s.manager_score ?? "";
    });
    const dc = {};
    (phieu.adjustments || []).forEach((a) => {
      dc[a.rule] = a.manager_quantity ?? "";
    });
    setDiemNhap(d);
    setDieuChinhNhap(dc);
    setNhanXet(phieu.manager_note || "");
  }, [phieu?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ------------------------------------------------- tính toán hiển thị */

  const dsTieuChi = useMemo(() => {
    const theoId = {};
    (phieu?.scores || []).forEach((s) => { theoId[s.criterion] = s; });
    return theoId;
  }, [phieu]);

  /** Điểm chốt của một tiêu chí — ĐÚNG luật của backend (MonthlyKpiScore.final_score):
   *  điểm quản lý là điểm chốt, quản lý chưa chấm thì lấy điểm tự chấm.
   *  Coi ô trống là 0 thì cột phải hiện một số, lưu xong backend trả về số khác. */
  const diemChot = useCallback((tcId) => {
    const v = diemNhap[tcId];
    if (laSo(v)) return Number(v);
    const s = dsTieuChi[tcId];
    return laSo(s?.self_score) ? Number(s.self_score) : 0;
  }, [diemNhap, dsTieuChi]);

  /** Tổng tạm tính theo bản đang gõ, để cột phải nhảy số ngay khi nhập. */
  const tamTinh = useMemo(() => {
    const theoNhom = {};
    let tongTieuChi = 0;
    khung.forEach((nhom) => {
      let dat = 0;
      let toiDa = 0;
      (nhom.criteria || []).forEach((tc) => {
        toiDa += Number(tc.max_score) || 0;
        const d = diemChot(tc.id);
        dat += d;
        tongTieuChi += d;
      });
      theoNhom[nhom.id] = { dat, toiDa };
    });
    let cong = 0;
    let tru = 0;
    quyTac.forEach((r) => {
      // Cùng luật với MonthlyKpiAdjustment.final_quantity: chưa điều chỉnh thì
      // lấy mức chủ phiếu đề xuất. Bỏ qua thì chọn "— giữ —" làm tổng về 0
      // trong khi ô "Điểm cuối" ngay bên cạnh vẫn hiện mức đề xuất.
      const v = dieuChinhNhap[r.id];
      const deXuat = (phieu?.adjustments || []).find((a) => a.rule === r.id)?.quantity;
      const raw = laSo(v) ? v : deXuat;
      if (!laSo(raw)) return;
      const muc = Math.min(Math.abs(Number(raw)), Number(r.cap) || 0);
      if (r.kind === "bonus") cong += muc; else tru += muc;
    });
    const cuoi = tongTieuChi + cong - tru;
    return { theoNhom, tongTieuChi, cong, tru, cuoi };
  }, [khung, quyTac, dieuChinhNhap, diemChot, phieu]);

  const xepLoai = useMemo(() => {
    const d = tamTinh.cuoi;
    if (d >= 91) return "XUẤT SẮC";
    if (d >= 81) return "TỐT";
    if (d >= 71) return "KHÁ";
    if (d >= 61) return "TRUNG BÌNH";
    return "KHÔNG ĐẠT";
  }, [tamTinh.cuoi]);

  const ho = phieu?.owner_profile || {};
  const oDuyet = useMemo(() => {
    const m = {};
    (phieu?.approvals || []).forEach((a) => { m[a.stage] = a; });
    return m;
  }, [phieu]);

  const nhatKy = phieu?.activities || [];
  const nhatKyHien = xemHetNhatKy ? nhatKy : nhatKy.slice(0, 3);

  // Cộng từ TIÊU CHÍ chứ không lấy KpiGroup.max_score: hai con số này có thể
  // lệch nhau (nhóm khai 40 nhưng 5 tiêu chí chỉ cộng được 35), và điểm thật
  // chấm theo tiêu chí. Lấy nhầm là mẫu số của "85/100" không khớp bảng.
  const tongToiDa = useMemo(
    () => khung.reduce(
      (t, n) => t + (n.criteria || []).reduce((x, c) => x + (Number(c.max_score) || 0), 0),
      0,
    ),
    [khung],
  );

  const duocSua = Boolean(phieu) && phieu.status !== "approved";
  // Ký được khi phiếu đã nộp và chưa duyệt xong — đúng điều kiện backend đặt ra
  // ở review() (phiếu draft bị từ chối) và _chan_neu_da_duyet.
  const kyDuocKhong = duocSua && !dangLuu && phieu.status !== "draft";

  /* ------------------------------------------------------------ thao tác */

  const luuCham = async ({ imLang = false } = {}) => {
    if (!phieu) return false;
    if (nhanXet.length > TOI_DA_NHAN_XET) {
      setLoi(`Nhận xét tối đa ${TOI_DA_NHAN_XET} ký tự.`);
      return false;
    }
    setDangLuu(true);
    setLoi("");
    try {
      const moi = await quanTriChamDiem(phieu.id, {
        scores: Object.entries(diemNhap).map(([criterion, value]) => ({
          criterion: Number(criterion), value: value === "" ? null : value,
        })),
        adjustments: Object.entries(dieuChinhNhap).map(([rule, q]) => ({
          rule: Number(rule), manager_quantity: q === "" ? null : q,
        })),
        manager_note: nhanXet,
      });
      setPhieu(moi);
      await taiBang();
      if (!imLang) setThongBao("Đã lưu bảng chấm điểm.");
      return true;
    } catch (e) {
      setLoi(thongDiepLoi(e, "Không lưu được bảng chấm. Vui lòng kiểm tra lại các ô điểm."));
      return false;
    } finally {
      setDangLuu(false);
    }
  };

  /** Những ô ký mà người đang đăng nhập được phép ký.
   *
   *  Phải KHỚP QUYEN_DUYET bên kpi/views.py:
   *    training : training_manager, admin, superadmin
   *    center   : center_manager,   admin, superadmin
   *    director : admin, superadmin
   *
   *  Admin và super admin ký được CẢ BA ô, nên bấm "Duyệt" là ký hết những ô còn
   *  đang chờ. Trước đây chỉ ký mỗi ô "Ban giám đốc": phiếu ký xong vẫn ở trạng
   *  thái chờ (phải đủ 3 ô mới thành "đã duyệt"), nên bấm Duyệt mà nhìn như
   *  không có gì xảy ra. */
  const cacOKyDuoc = () => {
    const vai = user?.role;
    if (vai === "admin" || vai === "superadmin") return ["training", "center", "director"];
    if (vai === "training_manager") return ["training"];
    if (vai === "center_manager") return ["center"];
    return [];
  };

  /** Lưu điểm rồi ký ô duyệt — duyệt mà chưa lưu là ký lên bản điểm cũ. */
  const kyDuyet = async (quyetDinh) => {
    if (!phieu) return;
    const oKy = cacOKyDuoc();
    if (!oKy.length) {
      setLoi("Vai của bạn không ký được ô duyệt nào.");
      return;
    }
    if (!(await luuCham({ imLang: true }))) return;
    setDangLuu(true);
    try {
      // Yêu cầu bổ sung: một ô là đủ để trả phiếu về, không cần ký hết.
      // Duyệt: ký mọi ô mình được phép mà còn đang chờ, để bấm một lần là xong.
      const canKy = quyetDinh === "approved"
        ? oKy.filter((o) => oDuyet[o]?.decision !== "approved")
        : oKy.slice(0, 1);
      let moi = phieu;
      for (const stage of canKy) {
        // Tuần tự chứ không song song: backend tính lại status của phiếu sau
        // MỖI lần ký, chạy song song thì các lượt đọc chồng lên nhau.
        // eslint-disable-next-line no-await-in-loop
        moi = await kyDuyetPhieu(phieu.id, { stage, decision: quyetDinh, note: nhanXet });
      }
      setPhieu(moi);
      await taiBang();
      setThongBao(
        quyetDinh === "approved"
          ? (moi?.status === "approved"
              ? "Đã duyệt phiếu."
              : `Đã ký ${canKy.length} ô duyệt. Phiếu chờ các cấp còn lại ký.`)
          : "Đã gửi yêu cầu bổ sung.",
      );
    } catch (e) {
      setLoi(thongDiepLoi(e, "Không ghi được quyết định duyệt."));
    } finally {
      setDangLuu(false);
    }
  };

  const traLai = async () => {
    if (!phieu) return;
    setDangLuu(true);
    setLoi("");
    try {
      const moi = await traLaiPhieu(phieu.id, { note: nhanXet });
      setPhieu(moi);
      await taiBang();
      setThongBao("Đã trả phiếu về cho người nộp.");
    } catch (e) {
      setLoi(thongDiepLoi(e, "Không trả lại được phiếu."));
    } finally {
      setDangLuu(false);
    }
  };

  const xuatBaoCao = () => {
    const hang = [
      ["Họ tên", "Cơ sở", "Trạng thái", "Điểm cuối", "Xếp loại", "Ngày nộp"],
      ...bang.results.map((x) => [
        x.owner_name, x.center_name, x.status_label,
        soHoacGach(x.final_total), x.rating, ngayGon(x.submitted_at),
      ]),
    ];
    // BOM \uFEFF để Excel nhận ra UTF-8; thiếu nó là tiếng Việt mở ra ký tự lạ.
    // Viết bằng mã thoát chứ không dán ký tự thật: BOM nằm trong mã nguồn là
    // một ký tự trắng vô hình, nhìn không ra mà lint thì báo lỗi.
    const csv = "\uFEFF" + hang.map((r) => r.map((o) => `"${String(o ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `Cham-thi-dua-${String(thang).padStart(2, "0")}-${nam}.csv`;
    // Firefox bỏ qua click() trên thẻ chưa gắn vào DOM.
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!thongBao) return undefined;
    const t = setTimeout(() => setThongBao(""), 4000);
    return () => clearTimeout(t);
  }, [thongBao]);

  /* ------------------------------------------------------------- hiển thị */

  const tt = bang.summary || {};

  return (
    <div className={`ka-page${nhungTrongTrang ? " ka-page--nhung" : ""}`}>
      <div className="ka-wrap">
        {/* ---------------- Thanh trên ---------------- */}
        <header className="ka-topbar">
          {!nhungTrongTrang && (
          <div className="ka-topbar-main">
            <h1 className="ka-page-title">
              Chấm thi đua giáo viên tháng {String(thang).padStart(2, "0")}/{nam}
            </h1>
            <nav className="ka-crumbs">
              {/* "/dashboard" không phải route có thật; nó rơi vào path="*" rồi
                  bị đẩy đi lung tung với hai vai quản lý — vốn là hai vai
                  chính dùng màn này. */}
              <Link to="/">Trang chủ</Link><i>›</i>
              <Link to="/thi-dua-thang">Thi đua tháng</Link><i>›</i>
              <b>Chấm thi đua</b>
            </nav>
          </div>
          )}
          <div className="ka-topbar-actions">
            {!nhungTrongTrang && (
              <>
                <select className="ka-sel" style={{ width: 104 }} value={thang}
                        onChange={(e) => { setThang(Number(e.target.value)); setTrang(1); }}>
                  {THANG.map((m) => <option key={m} value={m}>Tháng {m}</option>)}
                </select>
                <select className="ka-sel" style={{ width: 86 }} value={nam}
                        onChange={(e) => { setNam(Number(e.target.value)); setTrang(1); }}>
                  {NAM.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </>
            )}
            <button type="button" className="ka-btn" onClick={() => luuCham()}
                    disabled={!phieu || dangLuu || !duocSua}>
              <IcoLich />Lưu nháp
            </button>
            <button type="button" className="ka-btn ka-btn-primary"
                    onClick={() => kyDuyet("approved")} disabled={!kyDuocKhong}>
              <IcoDaXong />Duyệt kết quả
            </button>
            <button type="button" className="ka-btn" onClick={xuatBaoCao} disabled={!bang.results.length}>
              <IcoTai />Xuất báo cáo
            </button>
            {!nhungTrongTrang && (
              <>
                <div className="ka-sep" />
                <div className="ka-me">
                  <div className="ka-avatar ka-s30">
                    {(user?.name || "?").trim().split(/\s+/).slice(-2).map((x) => x[0]).join("").toUpperCase()}
                  </div>
                  <span className="ka-name">{user?.name || "Quản trị"}</span>
                </div>
              </>
            )}
          </div>
        </header>

        {loi ? <div className="ka-alert ka-err">{loi}</div> : null}
        {thongBao ? <div className="ka-alert ka-info">{thongBao}</div> : null}

        {/* ---------------- Dải chỉ số ---------------- */}
        <div className="ka-pad">
          <div className="ka-card ka-kpis">
            <div className="ka-kpi">
              <IcoNguoi className="ka-ms ka-c-orange" />
              <div>
                <div className="ka-kpi-label">Chờ chấm</div>
                <div className="ka-kpi-value">{tt.pending ?? 0} <small>giáo viên</small></div>
              </div>
            </div>
            <div className="ka-kpi">
              <IcoDaXong className="ka-ms ka-c-green" />
              <div>
                <div className="ka-kpi-label">Đã hoàn thành</div>
                <div className="ka-kpi-value">
                  {tt.approved ?? 0} <small className="ka-slash">/ {tt.total ?? 0}</small>
                </div>
              </div>
            </div>
            <div className="ka-kpi">
              <IcoTim className="ka-ms ka-c-orange" />
              <div>
                <div className="ka-kpi-label">Cần rà soát</div>
                <div className="ka-kpi-value">{tt.needs_review ?? 0} <small>hồ sơ</small></div>
              </div>
            </div>
            <div className="ka-kpi">
              <IcoBieuDo className="ka-ms ka-c-blue" />
              <div>
                <div className="ka-kpi-label">Điểm TB tháng</div>
                <div className="ka-kpi-value">{soHoacGach(tt.average_score)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="ka-layout">
          {/* ================= CỘT TRÁI ================= */}
          <aside className="ka-card ka-col-left">
            <div className="ka-card-title">Danh sách giáo viên</div>
            <div className="ka-filters">
              <div>
                <div className="ka-lbl">Cơ sở</div>
                <select className="ka-sel" value={coSo}
                        onChange={(e) => { setCoSo(e.target.value); setTrang(1); }}>
                  <option value="">Tất cả</option>
                  {dsCoSo.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <div className="ka-lbl">Trạng thái</div>
                <select className="ka-sel" value={trangThai}
                        onChange={(e) => { setTrangThai(e.target.value); setTrang(1); }}>
                  {TRANG_THAI.map((t) => <option key={t.ma} value={t.ma}>{t.ten}</option>)}
                </select>
              </div>
            </div>
            <div className="ka-search">
              <input type="text" placeholder="Tìm giáo viên..." value={tuKhoa}
                     onChange={(e) => setTuKhoa(e.target.value)} aria-label="Tìm giáo viên" />
              <IcoTim />
            </div>

            {dangTai && !bang.results.length ? (
              <div className="ka-empty">Đang tải…</div>
            ) : !bang.results.length ? (
              <div className="ka-empty">
                Chưa có phiếu thi đua nào của kỳ này.
                <br />Giáo viên mở phiếu ở màn Thi đua tháng là danh sách sẽ có tên.
              </div>
            ) : (
              <div className="ka-tlist">
                {bang.results.map((x, i) => {
                  const v = VIEN[x.status] || VIEN.draft;
                  const mau = ["", "ka-grey", "ka-sage"][i % 3];
                  return (
                    <button type="button" key={x.id}
                            className={`ka-tcard${x.id === chonId ? " ka-active" : ""}`}
                            onClick={() => {
                              if (x.id === chonId) return;
                              // Xoá nháp NGAY khi đổi người: để lại thì các ô
                              // của phiếu mới nháy điểm của phiếu cũ cho tới
                              // lúc tải xong, và bấm Lưu sớm là ghi nhầm người.
                              setDiemNhap({});
                              setDieuChinhNhap({});
                              setNhanXet("");
                              setPhieu(null);
                              setChonId(x.id);
                            }}>
                      <div className="ka-tcard-body">
                        <div className={`ka-avatar ka-s38 ${mau}`}>{x.initials}</div>
                        <div className="ka-tcard-info">
                          <div className="ka-tcard-row">
                            <div className="ka-tcard-name" title={x.owner_name}>
                              {(trang - 1) * MOI_TRANG + i + 1}. {x.owner_name}
                            </div>
                            <div className="ka-tcard-hint">
                              {x.manager_scored ? "Đã chấm" : "Dự kiến"}
                            </div>
                          </div>
                          <div className="ka-tcard-role">{x.role_label || "Giáo viên"}</div>
                          <div className="ka-tcard-row ka-bottom">
                            <div className="ka-tcard-meta">
                              {x.specialization || "—"}<em>•</em>{x.classroom_count} lớp
                            </div>
                            <div className="ka-tcard-score">
                              <b>{soHoacGach(x.final_total)}</b><span>/{tongToiDa || 100}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="ka-tcard-foot">
                        <span className={`ka-pill ${v.lop}`}><i />{v.ten}</span>
                        <span className="ka-stamp">
                          <IcoLich />{x.submitted_at ? `Nộp: ${ngayGon(x.submitted_at)}` : "Chưa nộp"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {bang.pages > 1 ? (
              <div className="ka-pager">
                <button type="button" onClick={() => setTrang((t) => Math.max(1, t - 1))}
                        disabled={trang <= 1} aria-label="Trang trước"><IcoTrai /></button>
                {Array.from({ length: bang.pages }, (_, i) => i + 1).map((p) =>
                  p === trang
                    ? <b key={p}>{p}</b>
                    : <span key={p} className="ka-pg" role="button" tabIndex={0}
                            onClick={() => setTrang(p)}
                            onKeyDown={(e) => e.key === "Enter" && setTrang(p)}>{p}</span>,
                )}
                <button type="button" onClick={() => setTrang((t) => Math.min(bang.pages, t + 1))}
                        disabled={trang >= bang.pages} aria-label="Trang sau"><IcoPhai /></button>
              </div>
            ) : null}
            <div className="ka-list-note">
              {bang.count
                ? `Hiển thị ${(trang - 1) * MOI_TRANG + 1} - ${Math.min(trang * MOI_TRANG, bang.count)} của ${bang.count} giáo viên`
                : "Không có bản ghi"}
            </div>
          </aside>

          {/* ================= CỘT GIỮA ================= */}
          <main className="ka-col-mid">
            <section className="ka-card">
              {!phieu ? (
                <div className="ka-empty">
                  {dangTaiPhieu ? "Đang tải phiếu…" : "Chọn một giáo viên ở danh sách bên trái để chấm."}
                </div>
              ) : (
                <>
                  <div className="ka-profile">
                    <div className="ka-avatar ka-s46">{ho.initials || "?"}</div>
                    <div>
                      <div className="ka-profile-name" title={phieu.owner_name}>{phieu.owner_name}</div>
                      <div className="ka-profile-role">{ho.role_label || "Giáo viên"}</div>
                    </div>
                    <div className="ka-profile-facts">
                      <div>
                        <div className="ka-fact-k">Cơ sở</div>
                        <div className="ka-fact-v">{phieu.center_name || "—"}</div>
                      </div>
                      <div>
                        <div className="ka-fact-k">Số lớp phụ trách</div>
                        <div className="ka-fact-v">{ho.classroom_count ?? 0} lớp</div>
                      </div>
                      <div>
                        <div className="ka-fact-k">Kỳ đánh giá</div>
                        <div className="ka-fact-v">
                          {String(phieu.period_month).padStart(2, "0")}/{phieu.period_year}
                        </div>
                      </div>
                    </div>
                    <div className="ka-profile-tags">
                      {phieu.submitted_at ? (
                        <span className="ka-tag ka-ok"><IcoDaXong />Đã nộp báo cáo</span>
                      ) : (
                        <span className="ka-tag ka-neutral"><IcoDongHo />Chưa nộp báo cáo</span>
                      )}
                      <span className={`ka-tag ${phieu.status === "approved" ? "ka-ok" : "ka-pending"}`}>
                        <IcoDongHo />
                        {phieu.status === "approved" ? "Đã duyệt" : "Chờ quản trị chấm"}
                      </span>
                    </div>
                  </div>

                  <div className="ka-body-pad">
                    <div className="ka-card-title">Bảng chấm điểm thi đua</div>
                    <table className="ka-score">
                      <thead>
                        <tr>
                          <th className="ka-l" style={{ width: 46 }}>STT</th>
                          <th className="ka-l">Tiêu chí</th>
                          <th style={{ width: 70 }}>Minh chứng</th>
                          <th style={{ width: 76 }}>Điểm tối đa</th>
                          <th style={{ width: 84 }}>Điểm đề xuất</th>
                          <th style={{ width: 116 }}>Admin chấm</th>
                          <th style={{ width: 106 }}>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {khung.map((nhom, iNhom) => {
                          const mau = MAU_NHOM[iNhom % MAU_NHOM.length];
                          const g = tamTinh.theoNhom[nhom.id] || { dat: 0, toiDa: 0 };
                          return [
                            <tr className={`ka-grp ${mau}`} key={`g-${nhom.id}`}>
                              <td colSpan={7}>{iNhom + 1}. {nhom.name} ({nhom.max_score} điểm)</td>
                            </tr>,
                            ...(nhom.criteria || []).map((tc, iTc) => {
                              const s = dsTieuChi[tc.id];
                              const v = diemNhap[tc.id];
                              const toiDa = Number(tc.max_score) || 0;
                              const dat = laSo(v) && Number(v) >= toiDa * 0.8;
                              return (
                                <tr key={tc.id}>
                                  <td className="ka-stt">{iNhom + 1}.{iTc + 1}</td>
                                  <td className="ka-crit">{tc.title}</td>
                                  <td>{s?.note ? <IcoKep className="ka-ms ka-ev" /> : <IcoAnh className="ka-ms ka-ev" />}</td>
                                  <td>{g1(toiDa)}</td>
                                  <td className="ka-prop">{soHoacGach(s?.self_score)}</td>
                                  <td className="ka-mark">
                                    {/* Kẹp ngay lúc gõ: để lọt số âm hay vượt khung thì
                                        backend từ chối CẢ lượt lưu, mất luôn mọi ô khác
                                        vừa sửa. Ô trống hiển thị điểm tự chấm mờ làm gợi
                                        ý — đúng con số hệ thống sẽ dùng nếu không chấm lại. */}
                                    <input type="number" min="0" max={toiDa} step="0.5"
                                           value={v ?? ""} disabled={!duocSua}
                                           placeholder={laSo(s?.self_score) ? g1(s.self_score) : ""}
                                           aria-label={`Điểm admin chấm cho ${tc.title}`}
                                           onChange={(e) => setDiemNhap((c) => ({ ...c, [tc.id]: kepDiem(e.target.value, toiDa) }))} />
                                    <span>/ {g1(toiDa)}</span>
                                  </td>
                                  <td>
                                    {!laSo(v) ? (
                                      <span className="ka-st ka-none">Chưa chấm</span>
                                    ) : dat ? (
                                      <span className="ka-st ka-ok"><IcoDaXong />Đạt</span>
                                    ) : (
                                      <span className="ka-st ka-warn"><IcoCanhBao />Cần rà soát</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            }),
                            <tr className={`ka-sum ${mau}`} key={`s-${nhom.id}`}>
                              <td colSpan={7}>
                                Tổng điểm {nhom.name}: <b>{g1(g.dat)}/{g1(g.toiDa)}</b>
                              </td>
                            </tr>,
                          ];
                        })}
                      </tbody>
                    </table>

                    <div className="ka-card-title" style={{ margin: "20px 0 11px" }}>
                      Điểm cộng / Điểm trừ
                    </div>
                    <div className="ka-adj-grid">
                      {["bonus", "penalty"].map((loai) => {
                        const ds = quyTac.filter((r) => r.kind === loai);
                        const cong = loai === "bonus";
                        const tran = ds.reduce((m, r) => Math.max(m, Number(r.cap) || 0), 0);
                        const tong = cong ? tamTinh.cong : tamTinh.tru;
                        return (
                          <div className={`ka-adj ${cong ? "ka-bonus" : "ka-pen"}`} key={loai}>
                            <h4>
                              {cong ? "ĐIỂM CỘNG" : "ĐIỂM TRỪ"}{" "}
                              <span>(Tối đa {cong ? "+" : "−"}{g1(tran)} điểm mỗi mục)</span>
                            </h4>
                            <table className="ka-adjt">
                              <thead>
                                <tr>
                                  <th className="ka-l">Hạng mục</th>
                                  <th style={{ width: 78 }}>Điểm đề xuất</th>
                                  <th style={{ width: 92 }}>Admin điều chỉnh</th>
                                  <th className="ka-r" style={{ width: 62 }}>Điểm cuối</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ds.map((r) => {
                                  const daCo = (phieu.adjustments || []).find((a) => a.rule === r.id);
                                  const deXuat = daCo?.quantity;
                                  const v = dieuChinhNhap[r.id];
                                  const cuoi = laSo(v) ? Number(v) : Number(deXuat || 0);
                                  const buoc = 0.5;
                                  const cacMuc = [];
                                  for (let x = 0; x <= Number(r.cap); x += buoc) cacMuc.push(x);
                                  return (
                                    <tr key={r.id}>
                                      <td className="ka-l">{r.title}</td>
                                      <td>{laSo(deXuat) && Number(deXuat) ? `${cong ? "+" : "−"}${g1(deXuat)}` : "—"}</td>
                                      <td className="ka-selcell">
                                        <select value={v ?? ""} disabled={!duocSua}
                                                aria-label={`Admin điều chỉnh ${r.title}`}
                                                onChange={(e) => setDieuChinhNhap((c) => ({ ...c, [r.id]: e.target.value }))}>
                                          <option value="">— giữ —</option>
                                          {cacMuc.map((x) => (
                                            <option key={x} value={x}>{cong ? "+" : "−"} {g1(x)}</option>
                                          ))}
                                        </select>
                                      </td>
                                      <td className="ka-r">{cuoi ? `${cong ? "+" : "−"}${g1(cuoi)}` : "0"}</td>
                                    </tr>
                                  );
                                })}
                                <tr className="ka-total">
                                  <td className="ka-l" style={cong ? undefined : { color: "var(--ka-red)" }}>
                                    Tổng điểm {cong ? "cộng" : "trừ"}
                                  </td>
                                  <td /><td />
                                  <td className="ka-r">{tong ? `${cong ? "+" : "−"}${g1(tong)}` : "0"}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </section>
          </main>

          {/* ================= CỘT PHẢI ================= */}
          <aside className="ka-col-right">
            <section className="ka-card">
              <div className="ka-card-title">Tổng hợp chấm điểm</div>
              <table className="ka-sm">
                <thead>
                  <tr>
                    <th>Hạng mục</th>
                    <th className="ka-c">Điểm tối đa</th>
                    <th className="ka-barh" />
                    <th className="ka-r">Điểm đạt</th>
                  </tr>
                </thead>
                <tbody>
                  {khung.map((nhom, i) => {
                    const g = tamTinh.theoNhom[nhom.id] || { dat: 0, toiDa: 0 };
                    const pt = g.toiDa ? Math.min(100, (g.dat / g.toiDa) * 100) : 0;
                    return (
                      <tr key={nhom.id}>
                        <td>{i + 1}. {nhom.name}</td>
                        <td className="ka-c">{nhom.max_score}</td>
                        <td>
                          <div className="ka-bar">
                            <i style={{ width: `${pt}%`, background: MAU_THANH[i % MAU_THANH.length] }} />
                          </div>
                        </td>
                        <td className="ka-r"><b>{g1(g.dat)}</b><span>/{g1(g.toiDa)}</span></td>
                      </tr>
                    );
                  })}
                  <tr className="ka-plusminus">
                    <td colSpan={2}>Điểm cộng <b className="ka-p">+{g1(tamTinh.cong)}</b></td>
                    <td className="ka-r" colSpan={2}>Điểm trừ <b className="ka-m">−{g1(tamTinh.tru)}</b></td>
                  </tr>
                </tbody>
              </table>
              <div className="ka-finals">
                <div className="ka-final">
                  <div className="ka-final-k">Điểm cuối cùng</div>
                  <div><b>{g1(tamTinh.cuoi)}</b><span>/{tongToiDa || 100}</span></div>
                </div>
                <div className="ka-rank">
                  <div className="ka-rank-k">Xếp loại</div>
                  <div className="ka-rank-v"><i>❰</i><b>{xepLoai}</b><i>❱</i></div>
                </div>
              </div>
            </section>

            <section className="ka-card">
              <div className="ka-card-title">Nhận xét của admin</div>
              <textarea className="ka-comment" value={nhanXet} disabled={!phieu || !duocSua}
                        aria-label="Nhận xét của admin"
                        placeholder="Ghi nhận xét gửi kèm kết quả chấm…"
                        onChange={(e) => setNhanXet(e.target.value)} />
              <div className={`ka-counter${nhanXet.length > TOI_DA_NHAN_XET ? " ka-over" : ""}`}>
                {nhanXet.length}/{TOI_DA_NHAN_XET} ký tự
              </div>
            </section>

            <section className="ka-card">
              <div className="ka-card-title">Quy trình phê duyệt</div>
              <div className="ka-steps">
                {[
                  { ma: "training", ten: "Quản lý đào tạo" },
                  { ma: "center", ten: "Quản lý cơ sở" },
                  { ma: "director", ten: "Ban giám đốc" },
                ].map((o, i) => {
                  const a = oDuyet[o.ma];
                  const xong = a?.decision === "approved";
                  const canSua = a?.decision === "revision_required";
                  const dangCho = !xong && !canSua;
                  return (
                    <div className="ka-step" key={o.ma}>
                      {xong ? (
                        <IcoDaXong className="ka-ms" />
                      ) : (
                        <span className={`ka-step-num ${canSua ? "ka-warn" : i === 0 || oDuyet[["training", "center"][i - 1]]?.decision === "approved" ? "ka-cur" : "ka-todo"}`}>
                          {i + 1}
                        </span>
                      )}
                      <div className="ka-step-txt">
                        <div className={`ka-step-name${dangCho ? " ka-muted" : ""}`}>{o.ten}</div>
                        <div className="ka-step-sub">
                          {xong ? `Đã duyệt lúc ${ngayGioGon(a.decided_at)}`
                            : canSua ? "Yêu cầu bổ sung"
                            : "Chưa xử lý"}
                        </div>
                      </div>
                      <span className={`ka-chip ${xong ? "ka-ok" : canSua ? "ka-cur" : "ka-todo"}`}>
                        {xong ? "Đã duyệt" : canSua ? "Cần bổ sung" : "Chưa xử lý"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="ka-card">
              <div className="ka-card-title">Nhật ký hệ thống</div>
              {nhatKy.length ? (
                <>
                  <div className="ka-logs">
                    {nhatKyHien.map((n) => (
                      <div className="ka-log" key={n.id}>
                        <time>{ngayGioGon(n.created_at)}</time>
                        <p>{n.message}</p>
                      </div>
                    ))}
                  </div>
                  {nhatKy.length > 3 ? (
                    <div className="ka-log-more">
                      <button type="button" onClick={() => setXemHetNhatKy((v) => !v)}>
                        {xemHetNhatKy ? "Thu gọn" : `Xem tất cả ${nhatKy.length} mục`}
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="ka-empty" style={{ padding: "12px 0" }}>Chưa có hoạt động nào.</div>
              )}
            </section>

            <div className="ka-actions">
              {/* Phiếu nháp chưa nộp thì backend từ chối ký (review yêu cầu đã
                  nộp), phiếu đã duyệt thì không chấm lại được — khoá nút cho
                  khớp thay vì để bấm rồi hiện báo lỗi. */}
              <button type="button" className="ka-act-approve"
                      onClick={() => kyDuyet("approved")} disabled={!kyDuocKhong}>
                <IcoTich />Duyệt
              </button>
              <button type="button" className="ka-act-more"
                      onClick={() => kyDuyet("revision_required")} disabled={!kyDuocKhong}>
                <IcoSua />Yêu cầu bổ sung
              </button>
              <button type="button" className="ka-act-back"
                      onClick={traLai} disabled={!phieu || dangLuu || phieu.status === "draft"}>
                <IcoQuayLai />Trả lại
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
