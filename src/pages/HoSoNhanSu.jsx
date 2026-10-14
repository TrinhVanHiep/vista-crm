import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import apiClient from "../services/apiClient";
import { useAuth } from "../auth/AuthProvider";
import SuaNhanSuModal from "../components/teacher/SuaNhanSuModal";

/**
 * Hồ sơ nhân sự — "Hồ sơ của tôi" (/ho-so-cua-toi) và "Chi tiết nhân sự" (/teachers/:id).
 * Dựng theo thiết kế HoSoCuaToi.jsx (14/10/2026). Toàn bộ số liệu từ GET /teachers/ho-so/
 * (giasu_online/teachers/ho_so.py), máy chủ đã lọc theo quyền người xem: QL cơ sở / đào tạo
 * không thấy lương người khác; giáo viên xem đồng nghiệp chỉ thấy thông tin cơ bản và lớp.
 */

const C = {
  orange: "#F26A21", orangeSoft: "#FFF1E8", ink: "#1F2433", muted: "#6B7280", line: "#ECEEF2",
  green: "#16A34A", greenSoft: "#E7F6EC", blue: "#2F6BFF", blueSoft: "#EAF0FF", red: "#E5484D", redSoft: "#FDECEC",
  amber: "#D98A00", amberSoft: "#FFF5DD", purple: "#7C5CFF", purpleSoft: "#F0ECFF",
};
const P = {
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7M22 21a7 7 0 0 0-4-6.3",
  task: "M9 3h6v3H9zM7 4.5H5V21h14V4.5h-2M9 13l2 2 4-4",
  star: "M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z",
  file: "M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6",
  calendar: "M4 5h16v16H4zM4 10h16M8 3v4M16 3v4",
  phone: "M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2",
  mail: "M3 5h18v14H3zM3 6l9 7 9-7",
  pin: "M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  check: "M5 12l5 5 9-10", chev: "M9 6l6 6-6 6", plus: "M12 5v14M5 12h14",
  brief: "M3 7h18v13H3zM8 7V4h8v3", book: "M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z",
  building: "M4 21V4h10v17M14 9h6v12M8 8h2M8 12h2M8 16h2",
  camera: "M4 8h3l2-3h6l2 3h3v12H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  edit: "M4 20h4L19 9l-4-4L4 16z", trend: "M3 17l6-6 4 4 8-8M15 7h6v6", down: "M3 7l6 6 4-4 8 8M15 17h6v-6",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  chat: "M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z", alert: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
};
const Icon = ({ n, s = 18, c = "currentColor", w = 2, fill = "none" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={c} strokeWidth={w} strokeLinecap="round"
       strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true"><path d={P[n]} /></svg>
);
const card = { background: "#fff", borderRadius: 14, border: `1px solid ${C.line}`, boxShadow: "0 1px 2px rgba(16,24,40,.04)" };
const Pill = ({ children, fg, bg, style }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999, fontSize: 11.5,
                 fontWeight: 600, color: fg, background: bg, whiteSpace: "nowrap", ...style }}>{children}</span>
);
const Bar = ({ v, color, h = 6 }) => (
  <div style={{ height: h, borderRadius: h, background: "#EEF0F3", overflow: "hidden", flex: 1, minWidth: 40 }}>
    <div style={{ width: `${Math.max(0, Math.min(v || 0, 100))}%`, height: "100%", borderRadius: h, background: color }} />
  </div>
);
const CardHead = ({ title, right, extra }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.ink }}>{title}</h3>
    {extra}
    <div style={{ marginLeft: "auto" }}>{right}</div>
  </div>
);
const XemThem = ({ to, label = "Xem tất cả", onClick }) => (to ? (
  <Link to={to} style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 12.5, fontWeight: 600, color: C.orange, textDecoration: "none" }}>
    {label}<Icon n="chev" s={14} />
  </Link>
) : (
  <button type="button" onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 12.5, fontWeight: 600, color: C.orange, background: "none", border: 0, cursor: "pointer", padding: 0 }}>
    {label}<Icon n="chev" s={14} />
  </button>
));
const Avatar = ({ name = "", src, size = 40 }) => {
  const ini = String(name).trim().split(/\s+/).slice(-2).map((w) => w[0] || "").join("").toUpperCase();
  return src
    ? <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: "50%", background: "#FFD9C2", color: C.orange, display: "grid", placeItems: "center", fontWeight: 700, fontSize: size * 0.36, flexShrink: 0 }}>{ini}</div>;
};
const tien = (v) => `${Number(v || 0) < 0 ? "-" : ""}${Math.abs(Math.round(Number(v || 0))).toLocaleString("vi-VN")}`;
const ngayVN = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "—");
const th = { textAlign: "left", fontWeight: 600, fontSize: 11.5, color: C.muted, padding: "8px", borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap" };
const td = { padding: "9px 8px", borderBottom: `1px solid ${C.line}`, fontSize: 12.5, color: C.ink, whiteSpace: "nowrap" };
const PRIORITY = { Cao: [C.red, C.redSoft], "Trung bình": [C.amber, C.amberSoft], Thấp: [C.green, C.greenSoft] };
const STATUS = { "Cần làm": [C.orange, C.orangeSoft], "Quá hạn": [C.red, C.redSoft], "Đang làm": [C.blue, C.blueSoft], "Đã xong": [C.green, C.greenSoft],
  "Chờ duyệt": [C.purple, C.purpleSoft], "Không đạt": [C.red, C.redSoft] };
const TABS = ["Tổng quan", "Nhiệm vụ", "Học sinh & Lớp học", "Bảng lương", "Đánh giá & Phản hồi", "Mục tiêu tháng sau", "Tài liệu"];
const MAU_MT = { ca: [C.orange, C.orangeSoft, "task"], bao_cao: [C.blue, C.blueSoft, "clock"], chuyen_can: [C.green, C.greenSoft, "users"],
  nhiem_vu: [C.purple, C.purpleSoft, "check"], thi_dua: [C.amber, C.amberSoft, "star"], loi: [C.red, C.redSoft, "alert"] };
const CAP = { mam_non: "Mầm non", tieu_hoc: "Tiểu học", thcs: "THCS", thpt: "THPT", khac: "Khác" };

function Delta({ nay, truoc, don_vi = "", ten = "so với tháng trước" }) {
  if (nay == null || truoc == null) return <span style={{ color: C.muted }}>Chưa có số tháng trước</span>;
  const d = Math.round((nay - truoc) * 10) / 10;
  const len = d >= 0;
  return (
    <span style={{ color: len ? C.green : C.red, display: "flex", alignItems: "center", gap: 4 }}>
      <Icon n={len ? "trend" : "down"} s={13} />{len ? "Tăng" : "Giảm"} {Math.abs(d)}{don_vi} {ten}
    </span>
  );
}

export default function HoSoNhanSu() {
  const { teacherId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const homNay = new Date();
  const [thang, setThang] = useState(homNay.getMonth() + 1);
  const [nam, setNam] = useState(homNay.getFullYear());
  const [d, setD] = useState(null);
  const [loi, setLoi] = useState("");
  const [tab, setTab] = useState(0);
  const [loc, setLoc] = useState("Tất cả");
  const [thongBao, setThongBao] = useState("");
  const [gvSua, setGvSua] = useState(null);
  const [taiLai, setTaiLai] = useState(0);
  const oAnh = useRef(null);

  const tai = useCallback(() => {
    setLoi("");
    apiClient.get("/teachers/ho-so/", { params: { month: thang, year: nam, ...(teacherId ? { teacher: teacherId } : {}) } })
      .then(({ data }) => setD(data))
      .catch((e) => setLoi(e?.response?.data?.detail || "Không tải được hồ sơ."));
  }, [thang, nam, teacherId]);
  useEffect(() => { tai(); }, [tai, taiLai]);

  if (loi) return <div style={{ padding: 24, color: C.red }}>{loi}</div>;
  if (!d) return <div style={{ padding: 24, color: C.muted }}>Đang tải hồ sơ…</div>;

  const n = d.nguoi;
  const q = d.quyen;
  const laMinh = !teacherId || Number(n.user_id) === Number(user?.id);
  const cs = d.chi_so || {};
  const nv = d.nhiem_vu || [];
  const dem = {
    "Tất cả": nv.length,
    "Cần làm": nv.filter((t) => t.trang_thai === "Cần làm" || t.trang_thai === "Quá hạn").length,
    "Đang làm": nv.filter((t) => ["Đang làm", "Không đạt"].includes(t.trang_thai)).length,
    "Chờ duyệt": nv.filter((t) => t.trang_thai === "Chờ duyệt").length,
    "Đã hoàn thành": nv.filter((t) => t.trang_thai === "Đã xong").length,
  };
  const nvLoc = nv.filter((t) => loc === "Tất cả" || (loc === "Cần làm" && ["Cần làm", "Quá hạn"].includes(t.trang_thai))
    || (loc === "Đang làm" && ["Đang làm", "Không đạt"].includes(t.trang_thai)) || (loc === "Chờ duyệt" && t.trang_thai === "Chờ duyệt")
    || (loc === "Đã hoàn thành" && t.trang_thai === "Đã xong"));

  const hoanThanh = async (t) => {
    setThongBao("");
    if (!t.lich_id) { navigate(t.link); return; }
    const moi = t.trang_thai === "Đã xong" ? "todo" : "done";
    try {
      await apiClient.patch(`/schedules/schedules/${t.lich_id}/`, { status: moi });
      setTaiLai((v) => v + 1);
    } catch (e) {
      setThongBao(e?.response?.data?.detail || "Không cập nhật được nhiệm vụ.");
    }
  };
  const doiAnh = async (f) => {
    if (!f) return;
    const fd = new FormData();
    fd.append("image", f);
    try {
      await apiClient.patch("/users/avatar/", fd);
      setTaiLai((v) => v + 1);
    } catch (e) {
      setThongBao(e?.response?.data?.detail || "Không đổi được ảnh đại diện.");
    }
  };
  const moSua = async () => {
    const { data } = await apiClient.get(`/teachers/teachers/${n.teacher_id}/`);
    setGvSua(data);
  };
  const doiThang = (gt) => { const [m, y] = gt.split("/").map(Number); setThang(m); setNam(y); };
  const dsThang = Array.from({ length: 12 }, (_, i) => {
    const t = new Date(homNay.getFullYear(), homNay.getMonth() - i, 1);
    return `${t.getMonth() + 1}/${t.getFullYear()}`;
  });
  const hien = (i) => tab === 0 || tab === i;
  const nut = { display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 9, border: `1px solid ${C.line}`,
    background: "#fff", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: C.ink, cursor: "pointer", textDecoration: "none" };

  /* ---------------- các khối ---------------- */
  const khoiNhiemVu = (
    <div style={{ ...card, padding: 18, minWidth: 0 }}>
      <CardHead title={laMinh ? "Nhiệm vụ của tôi" : "Nhiệm vụ"} right={laMinh ? (
        <button type="button" onClick={() => navigate("/calendar-detail")} style={{ ...nut, borderColor: C.orange, color: C.orange }}>
          <Icon n="plus" s={14} />Thêm nhiệm vụ
        </button>
      ) : q.quan_ly ? (
        <button type="button" onClick={() => navigate("/calendar-detail")} style={{ ...nut, borderColor: C.orange, color: C.orange }}>
          <Icon n="plus" s={14} />Giao việc
        </button>
      ) : null} />
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {Object.keys(dem).map((k) => (
          <button key={k} type="button" onClick={() => setLoc(k)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${loc === k ? C.orange : C.line}`,
            background: loc === k ? C.orangeSoft : "#fff", color: loc === k ? C.orange : "#3F4654", fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {k} ({dem[k]})
          </button>
        ))}
      </div>
      {thongBao ? <div style={{ fontSize: 12.5, color: C.red, marginBottom: 8 }}>{thongBao}</div> : null}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["", "Nhiệm vụ", "Loại", "Lớp liên quan", "Hạn hoàn thành", "Tiến độ", "Ưu tiên", "Trạng thái"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {nvLoc.length ? nvLoc.map((t) => {
              const xong = t.trang_thai === "Đã xong";
              return (
                <tr key={t.id}>
                  <td style={{ ...td, width: 20 }}>
                    {laMinh ? (
                      <button type="button" onClick={() => hoanThanh(t)} title={t.lich_id ? (xong ? "Mở lại" : "Đánh dấu hoàn thành (cần minh chứng)") : "Mở báo cáo"}
                              style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${xong ? C.green : "#C9CED6"}`, background: xong ? C.green : "#fff",
                                       display: "grid", placeItems: "center", cursor: "pointer", padding: 0 }}>
                        {xong ? <Icon n="check" s={12} c="#fff" w={3} /> : null}
                      </button>
                    ) : null}
                  </td>
                  <td style={{ ...td, fontWeight: 500, whiteSpace: "normal", minWidth: 200 }}>
                    <Link to={t.link} style={{ color: xong ? C.muted : C.ink, textDecoration: xong ? "line-through" : "none" }}>{t.ten}</Link>
                    {t.giao_boi ? <div style={{ fontSize: 11, color: C.muted }}>Giao bởi {t.giao_boi}</div> : null}
                    {t.so_loi ? <div style={{ fontSize: 11, color: C.red }}>{t.so_loi} lỗi nhiệm vụ</div> : null}
                  </td>
                  <td style={{ ...td, color: C.muted }}>{t.loai}</td>
                  <td style={td}>{t.lop || "—"}</td>
                  <td style={{ ...td, color: t.trang_thai === "Quá hạn" ? C.red : C.ink }}>{ngayVN(t.han)}</td>
                  <td style={{ ...td, minWidth: 110 }}>
                    {t.tien_do == null ? "—" : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Bar v={t.tien_do} color={t.trang_thai === "Không đạt" ? C.red : C.orange} />
                        <span style={{ fontSize: 11.5, color: C.muted, width: 32 }}>{t.tien_do}%</span>
                      </div>
                    )}
                  </td>
                  <td style={td}><Pill fg={PRIORITY[t.uu_tien][0]} bg={PRIORITY[t.uu_tien][1]}>{t.uu_tien}</Pill></td>
                  <td style={td}><Pill fg={STATUS[t.trang_thai][0]} bg={STATUS[t.trang_thai][1]}>{t.trang_thai}</Pill></td>
                </tr>
              );
            }) : <tr><td colSpan={8} style={{ ...td, color: C.muted, padding: 16 }}>Không có nhiệm vụ nào trong tháng {thang}/{nam}.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  const mt = d.muc_tieu;
  const khoiMucTieu = mt ? (
    <div style={{ ...card, padding: 18 }}>
      <CardHead title={`Tiến độ mục tiêu tháng ${thang}/${nam}`} right={q.chi_tiet ? <XemThem to="/thi-dua-thang" label="Xem thi đua" /> : null} />
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        {mt.ds.map((m) => {
          // "Không lỗi nhiệm vụ" đạt đủ thì xanh; có lỗi mới tô đỏ.
          const [c, bg, ic] = m.ma === "loi" && m.pt >= 100 ? [C.green, C.greenSoft, "check"] : MAU_MT[m.ma];
          return (
            <div key={m.ma} style={{ display: "grid", gridTemplateColumns: "28px minmax(0,1.3fr) minmax(0,1fr) 64px 38px", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: bg, color: c, display: "grid", placeItems: "center" }}><Icon n={ic} s={14} /></div>
              <div style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.nhan}</div>
              <Bar v={m.pt} color={c} h={7} />
              <div style={{ fontSize: 12, fontWeight: 600, textAlign: "right" }}>{m.gia}</div>
              <div style={{ fontSize: 12, color: C.muted, textAlign: "right" }}>{m.pt == null ? "—" : `${m.pt}%`}</div>
            </div>
          );
        })}
      </div>
      {mt.tong != null ? (
        <div style={{ marginTop: 16, padding: "10px 12px", borderRadius: 10, background: mt.tong >= 80 ? C.greenSoft : C.amberSoft,
                      color: mt.tong >= 80 ? C.green : C.amber, fontSize: 12.5, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon n="trend" s={15} />{laMinh ? "Bạn" : n.ho_ten} đang hoàn thành <b>{mt.tong}%</b> mục tiêu tháng.{mt.tong < 100 ? " Cố gắng thêm nhé!" : ""}
        </div>
      ) : null}
    </div>
  ) : null;

  const khoiLop = (
    <div style={{ ...card, padding: 18, minWidth: 0 }}>
      <CardHead title={`Danh sách lớp ${laMinh ? "tôi " : ""}phụ trách (${d.lop.length} lớp)`} right={<XemThem to="/students" />} />
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["#", "Tên lớp", "Chương trình", "Cấp học", "Sĩ số", ...(q.chi_tiet ? ["Tỷ lệ chuyên cần"] : []), "Tiến độ khoá học", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {d.lop.length ? d.lop.map((l, i) => (
              <tr key={l.id}>
                <td style={{ ...td, color: C.muted, width: 20 }}>{i + 1}</td>
                <td style={{ ...td, fontWeight: 600 }}>{l.ten}</td>
                <td style={{ ...td, color: C.muted }}>{l.chuong_trinh || "—"}</td>
                <td style={{ ...td, color: C.muted }}>{CAP[l.cap_hoc] || "—"}</td>
                <td style={td}>{l.si_so}</td>
                {q.chi_tiet ? <td style={{ ...td, color: C.green, fontWeight: 600 }}>{l.chuyen_can == null ? "—" : `${l.chuyen_can}%`}</td> : null}
                <td style={{ ...td, minWidth: 150 }}>
                  {l.tien_do == null ? <span style={{ color: C.muted }}>Chưa khai số buổi</span> : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Bar v={l.tien_do} color={C.green} />
                      <span style={{ fontSize: 12, color: C.muted, width: 70 }}>{l.da_hoc}/{l.tong_buoi}</span></div>
                  )}
                </td>
                <td style={{ ...td, textAlign: "right" }}><Link to={`/classrooms/${l.id}`} style={{ color: C.orange, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>Chi tiết</Link></td>
              </tr>
            )) : <tr><td colSpan={8} style={{ ...td, color: C.muted, padding: 16 }}>Chưa được gán lớp nào.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  const luong = d.luong;
  const khoiLuong = q.luong ? (
    <div style={{ ...card, padding: 18, display: "flex", flexDirection: "column" }}>
      <CardHead title={`Bảng lương tháng ${thang}/${nam}`}
                extra={luong?.da_chot ? <Pill fg={C.green} bg={C.greenSoft}><Icon n="check" s={11} w={3} />Đã chốt</Pill>
                  : luong ? <Pill fg={C.amber} bg={C.amberSoft}>Tạm tính</Pill> : null}
                right={<XemThem to={laMinh ? "/phieu-luong" : `/finance?tab=payroll&nv=${n.teacher_id}`} label="Xem phiếu lương" />} />
      {luong ? (
        <>
          {luong.dong.map((r, i) => (
            <div key={r.nhan} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px dashed ${C.line}`, fontSize: 13 }}>
              <span style={{ width: 20, height: 20, borderRadius: 6, background: C.orangeSoft, color: C.orange, fontSize: 11, fontWeight: 700, display: "grid", placeItems: "center" }}>{i + 1}</span>
              <span style={{ color: "#3F4654" }}>{r.nhan}</span>
              <span style={{ marginLeft: "auto", fontWeight: 600, color: r.gia < 0 ? C.red : C.ink }}>{tien(r.gia)}</span>
            </div>
          ))}
          <div style={{ marginTop: "auto", paddingTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderRadius: 10, background: C.orange, color: "#fff" }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Thực nhận</span>
              <span style={{ marginLeft: "auto", fontSize: 20, fontWeight: 800 }}>{tien(luong.thuc_nhan)} đ</span>
            </div>
          </div>
        </>
      ) : <div style={{ color: C.muted, fontSize: 13 }}>Chưa có cấu hình lương.</div>}
    </div>
  ) : null;

  const td_ = d.thi_dua;
  const khoiDanhGia = q.chi_tiet ? (
    <div style={{ ...card, padding: 18 }}>
      <CardHead title="Đánh giá & Phản hồi"
                extra={td_ ? <Pill fg={C.orange} bg={C.orangeSoft}>Thi đua {td_.diem} / 100</Pill> : <Pill fg={C.muted} bg="#F3F4F6">Chưa có phiếu thi đua</Pill>}
                right={<XemThem to="/thi-dua-thang" label="Thi đua tháng" />} />
      {(d.phan_hoi || []).length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          {d.phan_hoi.map((p, i) => (
            <div key={i} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 30, height: 30, borderRadius: "50%", background: p.tieu_cuc ? C.redSoft : C.blueSoft, color: p.tieu_cuc ? C.red : C.blue, display: "grid", placeItems: "center" }}><Icon n="chat" s={15} /></span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.nguon}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{p.tieu_cuc ? "Quản lý yêu cầu sửa" : "Nhận xét của quản lý"}{p.ngay ? ` · ${ngayVN(p.ngay)}` : ""}</div>
                </div>
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#3F4654" }}>{p.noi_dung}</div>
            </div>
          ))}
        </div>
      ) : <div style={{ color: C.muted, fontSize: 13 }}>Chưa có nhận xét nào của quản lý.</div>}
    </div>
  ) : null;

  const mts = d.muc_tieu_sau;
  const khoiMucTieuSau = mts ? (
    <div style={{ ...card, padding: 18 }}>
      <CardHead title={`Mục tiêu tháng sau (${mts.thang}/${mts.nam})`} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {mts.ds.map((g) => (
          <div key={g.nhan} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
            <span style={{ width: 18, height: 18, borderRadius: "50%", border: `1.5px solid ${C.green}`, color: C.green, display: "grid", placeItems: "center" }}><Icon n="check" s={10} w={3} /></span>
            <span>{g.nhan}</span>
            <span style={{ marginLeft: "auto", color: C.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{g.hien_tai}</span>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const khoiTaiLieu = q.chi_tiet ? (
    <div style={{ ...card, padding: 18 }}>
      <CardHead title={laMinh ? "Tài liệu của tôi" : "Tài liệu"} />
      {(d.tai_lieu || []).length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {d.tai_lieu.map((f, i) => (
            <a key={i} href={f.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: C.ink, textDecoration: "none" }}>
              <span style={{ width: 28, height: 28, borderRadius: 7, background: f.loai === "anh" ? C.blueSoft : C.redSoft, color: f.loai === "anh" ? C.blue : C.red, display: "grid", placeItems: "center" }}><Icon n="file" s={15} /></span>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{f.ten}</span>
              <span style={{ color: C.muted, fontSize: 11, whiteSpace: "nowrap" }}>{ngayVN(f.ngay)}</span>
            </a>
          ))}
        </div>
      ) : <div style={{ color: C.muted, fontSize: 13 }}>Chưa tải lên minh chứng nào.</div>}
    </div>
  ) : null;

  /* ---------------- bố cục ---------------- */
  return (
    <div className="v4page" style={{ padding: "4px 0 28px", display: "flex", flexDirection: "column", gap: 16, color: C.ink, minWidth: 0 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>{laMinh ? "Hồ sơ của tôi" : "Thông tin nhân sự"}</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
            {laMinh ? "Quản lý công việc, theo dõi tiến độ và phát triển bản thân" : "Công việc, lớp phụ trách, thi đua và tiến độ của nhân sự"}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {!laMinh ? <button type="button" onClick={() => navigate(-1)} style={nut}>← Quay lại</button> : null}
          <label style={{ ...nut, cursor: "default" }}>
            <Icon n="calendar" s={16} c={C.muted} />
            <select value={`${thang}/${nam}`} onChange={(e) => doiThang(e.target.value)} aria-label="Chọn tháng"
                    style={{ border: 0, background: "transparent", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {dsThang.map((g) => <option key={g} value={g}>Tháng {g}</option>)}
            </select>
          </label>
        </div>
      </header>

      {/* Thẻ hồ sơ + khẩu hiệu */}
      <section>
        <div style={{ ...card, padding: 20, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Avatar name={n.ho_ten} src={n.anh} size={112} />
            {laMinh ? (
              <button type="button" onClick={() => oAnh.current?.click()} title="Đổi ảnh đại diện"
                      style={{ position: "absolute", right: 2, bottom: 4, width: 30, height: 30, borderRadius: "50%", background: C.orange, color: "#fff",
                               display: "grid", placeItems: "center", border: "3px solid #fff", cursor: "pointer", padding: 0 }}>
                <Icon n="camera" s={14} />
              </button>
            ) : null}
            <input ref={oAnh} type="file" accept="image/*" hidden onChange={(e) => doiAnh(e.target.files?.[0])} />
          </div>
          <div style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{n.ho_ten}</h2>
              <Pill fg={n.trang_thai === "Đang làm việc" ? C.green : C.amber} bg={n.trang_thai === "Đang làm việc" ? C.greenSoft : C.amberSoft}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: "currentColor" }} />{n.trang_thai}
              </Pill>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
                {q.quan_ly && n.teacher_id ? <button type="button" onClick={moSua} style={nut}><Icon n="edit" s={14} />Sửa thông tin</button> : null}
                {q.quan_ly ? <button type="button" onClick={() => navigate("/thi-dua-thang")} style={nut}><Icon n="star" s={14} />Chấm thi đua</button> : null}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {n.chuc_danh ? <Pill fg={C.orange} bg={C.orangeSoft} style={{ padding: "5px 10px" }}><Icon n="brief" s={13} />{n.chuc_danh}{n.loai_hd ? ` (${n.loai_hd})` : ""}</Pill> : null}
              {n.khoi ? <Pill fg={C.blue} bg={C.blueSoft} style={{ padding: "5px 10px" }}><Icon n="book" s={13} />Khối {n.khoi}</Pill> : null}
              <Pill fg={C.purple} bg={C.purpleSoft} style={{ padding: "5px 10px" }}><Icon n="building" s={13} />{n.co_so}</Pill>
              {n.ma ? <Pill fg={C.muted} bg="#F3F4F6" style={{ padding: "5px 10px" }}>{n.ma}</Pill> : null}
            </div>
            <div style={{ display: "flex", gap: 22, flexWrap: "wrap", fontSize: 13, color: "#3F4654" }}>
              {n.sdt ? <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon n="phone" s={15} c={C.orange} />{n.sdt}</span> : null}
              <span style={{ display: "flex", alignItems: "center", gap: 6 }} data-no-translate><Icon n="mail" s={15} c={C.orange} />{n.email}</span>
              {n.dia_chi ? <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon n="pin" s={15} c={C.orange} />{n.dia_chi}</span> : null}
            </div>
            <div style={{ fontSize: 12.5, color: C.muted, display: "flex", gap: 14, flexWrap: "wrap" }}>
              <span>Ngày vào làm: <b style={{ color: C.ink, fontWeight: 600 }}>{ngayVN(n.ngay_vao)}</b></span>
              {n.tham_nien ? <><span style={{ color: C.line }}>|</span><span>Thâm niên: <b style={{ color: C.ink, fontWeight: 600 }}>{n.tham_nien}</b></span></> : null}
              {n.chuyen_mon ? <><span style={{ color: C.line }}>|</span><span>Chuyên môn: <b style={{ color: C.ink, fontWeight: 600 }}>{n.chuyen_mon}</b></span></> : null}
            </div>
          </div>
          {/* Khẩu hiệu nằm trong thẻ thông tin cá nhân (14/10/2026). */}
          <div style={{ flex: "0 1 300px", minWidth: 220, alignSelf: "stretch", padding: "16px 18px", borderRadius: 12,
                        background: "linear-gradient(160deg,#FFF6EF,#FFE9DA)", border: "1px solid #FFE0CC",
                        display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
            <div style={{ fontSize: 34, lineHeight: 0.5, color: C.orange, fontFamily: "Georgia, serif" }}>“</div>
            <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.5 }}>Mỗi buổi dạy hôm nay là một bước tiến cho tương lai của học sinh.</div>
            <div style={{ fontSize: 12, color: C.orange, fontWeight: 600 }}>— VISTA Academy</div>
          </div>
        </div>
      </section>

      {/* 4 chỉ số */}
      {q.chi_tiet ? (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
          {[
            { ic: "calendar", c: C.orange, bg: C.orangeSoft, nhan: `Số buổi dạy (tháng ${thang})`,
              gia: <>{cs.ca.da_day} <span style={{ fontSize: 15, color: C.muted, fontWeight: 600 }}>/ {cs.ca.lich}</span></>,
              chan: <Bar v={cs.ca.lich ? (cs.ca.da_day * 100) / cs.ca.lich : 0} color={C.orange} /> },
            { ic: "check", c: C.green, bg: C.greenSoft, nhan: "Tỉ lệ chuyên cần lớp",
              gia: cs.chuyen_can == null ? "—" : `${cs.chuyen_can}%`, chan: <Delta nay={cs.chuyen_can} truoc={cs.chuyen_can_truoc} don_vi="%" /> },
            { ic: "star", c: C.blue, bg: C.blueSoft, nhan: "Điểm thi đua",
              gia: cs.thi_dua == null ? "—" : <>{cs.thi_dua} <span style={{ fontSize: 15, color: C.muted, fontWeight: 600 }}>/ 100</span></>,
              chan: <Delta nay={cs.thi_dua} truoc={cs.thi_dua_truoc} /> },
            { ic: "users", c: C.red, bg: C.redSoft, nhan: "Tổng học sinh phụ trách",
              gia: <>{cs.tong_hoc_sinh} <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>học sinh</span></>,
              chan: <span style={{ color: C.muted }}>{cs.so_lop} lớp{cs.so_lop !== cs.so_lop_truoc ? <> · <span style={{ color: cs.so_lop > cs.so_lop_truoc ? C.green : C.red }}>{cs.so_lop > cs.so_lop_truoc ? "+" : ""}{cs.so_lop - cs.so_lop_truoc} lớp so với tháng trước</span></> : null}{cs.loi_nhiem_vu ? <> · <span style={{ color: C.red }}>{cs.loi_nhiem_vu} lỗi nhiệm vụ</span></> : null}</span> },
          ].map((s) => (
            <div key={s.nhan} style={{ ...card, padding: 16, display: "flex", gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: s.bg, color: s.c, display: "grid", placeItems: "center", flexShrink: 0 }}><Icon n={s.ic} s={22} /></div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 12.5, color: C.muted }}>{s.nhan}</div>
                <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15 }}>{s.gia}</div>
                <div style={{ fontSize: 11.5, display: "flex", alignItems: "center", marginTop: 2 }}>{s.chan}</div>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {/* Tab */}
      {q.chi_tiet ? (
        <nav style={{ ...card, display: "flex", padding: 5, gap: 4, overflowX: "auto" }}>
          {TABS.map((t, i) => ((i === 3 && !q.luong) ? null : (
            <button key={t} type="button" onClick={() => setTab(i)} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: 13, fontWeight: tab === i ? 700 : 500, whiteSpace: "nowrap",
              background: tab === i ? C.orange : "transparent", color: tab === i ? "#fff" : "#3F4654" }}>{t}</button>
          )))}
        </nav>
      ) : null}

      {q.chi_tiet ? (
        <>
          {(hien(1) || hien(5)) ? (
            <section style={{ display: "grid", gridTemplateColumns: tab === 0 ? "repeat(auto-fit,minmax(min(100%,460px),1fr))" : "1fr", gap: 16 }}>
              {hien(1) ? khoiNhiemVu : null}
              {tab === 0 ? khoiMucTieu : null}
            </section>
          ) : null}
          {(hien(2) || hien(3)) ? (
            <section style={{ display: "grid", gridTemplateColumns: tab === 0 && khoiLuong ? "repeat(auto-fit,minmax(min(100%,460px),1fr))" : "1fr", gap: 16 }}>
              {hien(2) ? khoiLop : null}
              {hien(3) ? khoiLuong : null}
            </section>
          ) : null}
          {(hien(4) || hien(5) || hien(6)) ? (
            <section style={{ display: "grid", gridTemplateColumns: tab === 0 ? "repeat(auto-fit,minmax(min(100%,300px),1fr))" : "1fr", gap: 16 }}>
              {hien(4) ? khoiDanhGia : null}
              {hien(5) ? <>{tab === 5 ? khoiMucTieu : null}{khoiMucTieuSau}</> : null}
              {hien(6) ? khoiTaiLieu : null}
            </section>
          ) : null}
        </>
      ) : khoiLop}

      {gvSua ? (
        <SuaNhanSuModal giaoVien={gvSua} onClose={() => setGvSua(null)} onXong={() => { setGvSua(null); setTaiLai((v) => v + 1); }} />
      ) : null}
    </div>
  );
}
