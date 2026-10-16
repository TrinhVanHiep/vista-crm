import XacNhanLuongTongHop from "./XacNhanLuongTongHop";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { dinhDangTien, loiApi, rutGonM } from "../../services/financeService";
import {
  layBangLuong, layCoCauLuong, layCongChoDuyet, layDonGiaLop, layNhanSuChuaCoLuong, layPhieuLuong,
  nhapChamCong, taiMauChamCong, xuatBangLuong,
} from "../../services/payrollService";
import { Button, Card, CardHead, NoteStrip, Num, Pill, Table } from "./v3/ui";
import PhieuLuong from "./PhieuLuong";
import ChotLuong from "./ChotLuong";
import { DonGiaTheoLop, HopDieuChinhThang } from "./DieuChinhLuong";
import CauHinhLuong from "./CauHinhLuong";
import { DiemDanhHsBoSung, DuyetCongBoSung, GanNguoiChamCong, SoDiemDanhGoc } from "./MayChamCong";
import { VAI_QUAN_TRI } from "../../auth/permissions";

const vaiHienTai = () => {
  try {
    const r = JSON.parse(localStorage.getItem("vista_user") || "{}").role;
    return (typeof r === "string" ? r : r?.name) || "";
  } catch {
    return "";
  }
};
import { color } from "./v3/theme";

/**
 * Phân hệ "Bảng lương".
 *
 * Lương TẠM TÍNH theo tháng, do máy chủ tính từ cấu hình lương từng người (theo
 * bảng cơ cấu thu nhập đang áp dụng), chấm công ca trực và các buổi dạy đã
 * duyệt. Không cho nhập tay số thực nhận ở đây: muốn số khác thì sửa nguồn
 * (cấu hình, buổi dạy, chấm công), để con số luôn truy ngược được.
 */

// Vai có thể cần bảng lương — tài khoản admin/super admin không tính là "thiếu mức lương".
const VAI_NHAN_SU = ["teacher", "staff", "center_manager", "training_manager", "accountant", "designer"];

// Khối lương: giáo viên (kể cả part-time, thực tập, nước ngoài) và quản lý & văn phòng.
const VI_TRI_GV = ["teacher_full_time", "teacher_part_time", "intern", "foreign_teacher"];
const khoiCua = (x) => {
  if (VI_TRI_GV.includes(x.position)) return "gv";
  if (x.position) return "ql";
  return ["part_time", "foreign"].includes(x.employment_type) ? "gv" : "ql";
};

const LOAI = { full_time: "Full-time", part_time: "Part-time", director: "Giám đốc", foreign: "GV nước ngoài" };

const tien = (v) => dinhDangTien(Math.round(Number(v || 0)));

/**
 * Nhập bảng chấm công tháng từ Excel (payroll/cham_cong_import.py). Hai bước:
 * chọn file → máy chủ đọc và trả bản xem trước (ai được ghép, bao nhiêu công,
 * bao nhiêu buổi trực, dòng nào lỗi) → bấm "Ghi vào bảng lương" mới lưu.
 * Ghi thẳng một lần thì gõ nhầm tháng là đè mất bảng công tháng khác.
 */
function NhapChamCong({ thang, nam, onDaGhi }) {
  const oFile = useRef(null);
  const [tep, setTep] = useState(null);
  const [xem, setXem] = useState(null);
  const [dang, setDang] = useState("");
  const [loi, setLoi] = useState("");

  const chon = async (f) => {
    setTep(f);
    setXem(null);
    setLoi("");
    if (!f) return;
    setDang("xem");
    try {
      setXem(await nhapChamCong(f, { thang, nam }));
    } catch (e) {
      setLoi(loiApi(e, "Không đọc được file chấm công."));
    } finally {
      setDang("");
    }
  };

  const ghi = async () => {
    setDang("ghi");
    setLoi("");
    try {
      const kq = await nhapChamCong(tep, { thang, nam, ghi: true });
      setXem(null);
      setTep(null);
      if (oFile.current) oFile.current.value = "";
      onDaGhi?.(`Đã gửi chấm công bổ sung tháng ${thang}/${nam} của ${kq.matched_count} nhân sự — chờ quản lý hoặc super admin duyệt mới tính công.`);
    } catch (e) {
      setLoi(loiApi(e, "Không ghi được chấm công."));
    } finally {
      setDang("");
    }
  };

  return (
    <Card>
      <CardHead
        title="Nhập file chấm công"
        sub={`Bổ sung công tháng ${String(thang).padStart(2, "0")}/${nam} cho ngày máy chấm công lỗi / mất điện và ca trực: X = đi làm, T = ca trực, trống = không bổ sung. File phải được quản lý hoặc super admin duyệt mới tính.`}
      />
      <div style={{ padding: "14px 22px 20px", display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Button variant="ghost" onClick={() => taiMauChamCong({ thang, nam }).catch((e) => setLoi(loiApi(e, "Không tải được file mẫu.")))}>
            Tải file mẫu tháng {thang}
          </Button>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
            <input
              ref={oFile}
              type="file"
              accept=".xlsx"
              onChange={(e) => chon(e.target.files?.[0] || null)}
            />
          </label>
          {dang === "xem" ? <span style={{ color: color.muted, fontSize: 13 }}>Đang đọc file...</span> : null}
        </div>
        {loi ? <div style={{ color: color.red, fontSize: 13.5 }}>{loi}</div> : null}
        {xem ? (
          <>
            <div style={{ fontSize: 13.5 }}>
              Xem trước: nhận được <b>{xem.matched_count}</b> nhân sự
              {xem.error_count ? <>, <b style={{ color: color.red }}>{xem.error_count}</b> dòng có vấn đề</> : null}. Chưa ghi gì.
            </div>
            {xem.rows?.length ? (
              <Table
                columns={["Nhân sự", "Số công", "Trực T2–T6", "Trực T7", "Trực CN"]}
                rows={xem.rows.map((r) => [r.ten, r.so_cong, r.truc_t2_t6, r.truc_t7, r.truc_cn])}
                align={{ 1: "right", 2: "right", 3: "right", 4: "right" }}
              />
            ) : null}
            {xem.errors?.length ? (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: color.red, display: "grid", gap: 2 }}>
                {xem.errors.map((l) => <li key={l}>{l}</li>)}
              </ul>
            ) : null}
            <div style={{ display: "flex", gap: 10 }}>
              <Button disabled={!xem.matched_count || dang === "ghi"} onClick={ghi}>
                {dang === "ghi" ? "Đang ghi..." : `Ghi vào bảng lương tháng ${thang}/${nam}`}
              </Button>
              <Button variant="ghost" onClick={() => chon(null)}>Huỷ</Button>
            </div>
          </>
        ) : null}
      </div>
    </Card>
  );
}

export default function BangLuong({ thang, nam, coTheGhi = false, onNotice }) {
  const [taiLai, setTaiLai] = useState(0);
  const [ds, setDs] = useState([]);
  const [coCau, setCoCau] = useState(null);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");
  const [dangChinh, setDangChinh] = useState(null);
  const [cauHinh, setCauHinh] = useState(undefined); // undefined = đóng, null = thêm mới, id = sửa
  const [gvMinhHoa, setGvMinhHoa] = useState("");
  const [thamSo, setThamSo] = useSearchParams();
  const nguoiXem = thamSo.get("nv");
  const moNguoi = (id) => {
    const p = new URLSearchParams(thamSo);
    if (id) p.set("nv", id); else p.delete("nv");
    setThamSo(p);
    window.scrollTo({ top: 0 });
  };
  const [moBuoc, setMoBuoc] = useState("");
  const [chuaCoLuong, setChuaCoLuong] = useState([]);
  const [congChoDuyet, setCongChoDuyet] = useState(0);
  const [donGia, setDonGia] = useState(null);
  const laQuanTri = VAI_QUAN_TRI.includes(vaiHienTai());

  useEffect(() => {
    let huy = false;
    setDangTai(true);
    setLoi("");
    Promise.all([layBangLuong({ thang, nam }), layCoCauLuong()])
      .then(([luong, cc]) => {
        if (huy) return;
        setDs(luong);
        setCoCau(cc);
      })
      .catch((e) => !huy && setLoi(loiApi(e, "Không tải được bảng lương.")))
      .finally(() => !huy && setDangTai(false));
    return () => { huy = true; };
  }, [thang, nam, taiLai]);

  // Trạng thái từng bước chốt lương; lỗi thì coi như "chưa biết", không chặn bảng lương.
  useEffect(() => {
    let huy = false;
    layCongChoDuyet({ thang, nam }).then((x) => !huy && setCongChoDuyet(x.length)).catch(() => {});
    layDonGiaLop().then((x) => !huy && setDonGia(x)).catch(() => {});
    layNhanSuChuaCoLuong()
      .then((x) => !huy && setChuaCoLuong(x.filter((n) => VAI_NHAN_SU.includes(n.vai))))
      .catch(() => {});
    return () => { huy = true; };
  }, [thang, nam, taiLai]);

  // Tổng quan cho admin (12/10/2026): tổng lương, khối giáo viên, khối quản lý & văn phòng,
  // các yếu tố khác. Gộp khoản giống dong_phieu (payroll/phieu_luong.py).
  const khoan = (x) => {
    const c = x.salary_components || {};
    const dc = Number(c.manual_adjustment || 0) + Number(c.other_adjustment || 0);
    return {
      thucNhan: Number(c.net_salary || 0),
      coBan: Number(c.prorated_base_salary || 0),
      day: Number(c.teaching_salary || 0),
      thuong: Number(c.sale_commission || 0) + Number(c.monthly_bonus || 0),
      troCap: Number(c.allowance || 0) + Number(c.duty_salary || 0) + Number(c.student_management_pay || 0) + Math.max(dc, 0),
      bhxh: Number(c.insurance_deduction || 0),
      bhxhCty: Math.round(Number(c.insurance_salary || 0) * 0.215),
      thue: Number(c.tax_deduction || 0),
      khauTru: Number(c.penalty || 0) + Math.max(-dc, 0),
    };
  };
  const cong = (list) => list.reduce((t, x) => {
    const k = khoan(x);
    Object.keys(k).forEach((m) => { t[m] = (t[m] || 0) + k[m]; });
    return t;
  }, {});
  // Tháng đã chốt: chỉ cộng người có trong bảng chốt (người ngoài bảng vẫn hiện, đánh dấu đỏ).
  const ngoaiChot = (x) => Boolean(x.chot?.khong_co_trong_file);
  const khoiGv = ds.filter((x) => khoiCua(x) === "gv");
  const khoiQl = ds.filter((x) => khoiCua(x) !== "gv");
  const tong = cong(ds.filter((x) => !ngoaiChot(x)));
  const tongGv = cong(khoiGv.filter((x) => !ngoaiChot(x)));
  const tongQl = cong(khoiQl.filter((x) => !ngoaiChot(x)));

  // Thứ tự cột theo chủ trung tâm (12/10/2026): Thực nhận → Lương cơ bản → Lương dạy →
  // Thưởng sale → BHXH → Trợ cấp → Thuế TNCN → Khấu trừ. Gộp khoản giống payroll/phieu_luong.py
  // (dong_phieu) để bảng trên màn, phiếu cá nhân và file Excel cùng một con số.
  const phu = (s) => (s ? <div style={{ fontSize: 11.5, color: color.faint, marginTop: 2 }}>{s}</div> : null);
  const dongCua = (list) => list.map((x) => {
    const c = x.salary_components || {};
    const cc = x.attendance || {};
    const dieuChinh = Number(c.manual_adjustment || 0) + Number(c.other_adjustment || 0);
    const troCap = Number(c.allowance || 0) + Number(c.duty_salary || 0) + Number(c.student_management_pay || 0) + Math.max(dieuChinh, 0);
    const thuong = Number(c.sale_commission || 0) + Number(c.monthly_bonus || 0);
    const khauTru = Number(c.penalty || 0) + Math.max(-dieuChinh, 0);
    const soCa = (x.classrooms || []).reduce((n, l) => n + (l.session_attendance || []).length, 0);
    const am = (v) => (Number(v) > 0 ? <Num tone="red">-{tien(v)}</Num> : <Num>0</Num>);
    return [
      <div key="t" style={{ minWidth: 190 }}>
        <button type="button" disabled={!x.teacher_id} onClick={() => x.teacher_id && moNguoi(x.teacher_id)}
                title={x.teacher_id ? "Mở bảng lương của người này" : "Chưa có hồ sơ trên CRM"}
                style={{ all: "unset", cursor: "pointer", fontWeight: 700, color: color.orange || "#F26522" }}>
          {x.teacher_name}
        </button>
        <div style={{ fontSize: 12, color: color.muted, marginTop: 2 }}>
          {x.position_label || LOAI[x.employment_type] || x.employment_type}
        </div>
        {x.chot && !x.chot.khong_co_trong_file
          ? phu(`ĐÃ CHỐT · ${x.chot.so_buoi || 0} buổi${x.chot.ghi_chu ? ` · ${x.chot.ghi_chu}` : ""}`)
          : x.chot?.khong_co_trong_file
            ? <div style={{ fontSize: 11.5, color: color.red, marginTop: 2 }}>Không có trong bảng chốt — số tạm tính</div>
            : phu(`${cc.attendance_days || 0} công · ${soCa} ca dạy${Number(cc.pending_file_days) ? ` · ${cc.pending_file_days} ngày chờ duyệt` : ""}`)}
      </div>,
      <Num key="n" bold>{tien(c.net_salary)}</Num>,
      <div key="cb">
        <Num>{tien(c.prorated_base_salary)}</Num>
        {Number(c.base_salary) > 0 ? phu(`${cc.payable_workdays ?? cc.attendance_days ?? 0}/${cc.base_salary_standard_days || 25} công × ${rutGonM(c.base_salary)}`) : null}
      </div>,
      <div key="d">
        <Num>{tien(c.teaching_salary)}</Num>
        {x.employment_type === "foreign"
          ? phu(`${x.teaching_summary?.approved_sessions_count || 0} ca × ${tien(c.rate_per_session)}`)
          : Number(c.teaching_salary) > 0 ? phu(`${soCa} ca · ${c.share_percent || 0}%`) : null}
      </div>,
      <div key="th" title={c.kpi_bonus_reason || ""}>
        <Num>{tien(thuong)}</Num>
        {phu([Number(c.sale_commission) ? `Sale ${rutGonM(c.sale_commission)}` : "",
              Number(c.monthly_bonus) ? `Thi đua ${rutGonM(c.monthly_bonus)}` : c.kpi_score != null ? `Thi đua ${c.kpi_score} đ${c.kpi_status !== "approved" ? " (chưa duyệt)" : ""}` : ""]
          .filter(Boolean).join(" · "))}
      </div>,
      <div key="bh">{am(c.insurance_deduction)}{c.insurance_overridden ? phu("chỉnh tay") : null}</div>,
      <div key="tc">
        <Num>{tien(troCap)}</Num>
        {phu([Number(c.allowance) ? `Phụ cấp ${rutGonM(c.allowance)}` : "", Number(c.duty_salary) ? `Trực ${rutGonM(c.duty_salary)}` : "",
              Number(c.student_management_pay) ? `QLHS ${rutGonM(c.student_management_pay)}` : ""].filter(Boolean).join(" · "))}
      </div>,
      <div key="tax">{am(c.tax_deduction)}</div>,
      <div key="kt" title={c.penalty_note || ""}>{am(khauTru)}</div>,
      x.teacher_id ? <Button key="c" variant="ghost" onClick={() => moNguoi(x.teacher_id)}>Xem →</Button> : <span key="c" />,
    ];
  });

  // ---- Quy trình chốt lương (12/10/2026): chủ trung tâm thấy màn lương "rối mắt, không biết
  // phải chuẩn bị gì". Gom mọi công cụ vào 6 bước, mỗi bước tự báo đã xong hay còn thiếu;
  // bấm bước nào mới mở công cụ của bước đó. Bảng lương luôn nằm dưới cùng.
  const fullTime = ds.filter((x) => !["part_time", "foreign"].includes(x.employment_type));
  const chuaCong = fullTime.filter((x) => !Number(x.attendance?.attendance_days)).length;
  const soCa = ds.reduce((n, x) => n + (x.classrooms || []).reduce((m, l) => m + (l.session_attendance || []).length, 0), 0);
  const lopThieuGia = (donGia || []).filter((l) => !Number(l.manual_rate ?? l.default_rate)).length;
  const daChot = ds.some((x) => x.chot && !x.chot.khong_co_trong_file);
  const kpiDuyet = ds.filter((x) => x.salary_components?.kpi_status === "approved").length;
  const BUOC = [
    {
      ma: "nhansu", ten: "Nhân sự & mức lương",
      tt: chuaCoLuong.length ? ["warn", `${chuaCoLuong.length} nhân sự chưa có mức lương`] : ["ok", `${ds.length} người đã có mức lương`],
      can: ["Mỗi người: loại hợp đồng, lương cơ bản, mức đóng BHXH, % chia lương dạy (GV nước ngoài: đơn giá 1 ca).",
            "Gán mã trên máy chấm công cho từng người (chỉ làm 1 lần)."],
    },
    {
      ma: "chamcong", ten: "Chấm công",
      tt: congChoDuyet ? ["warn", `${congChoDuyet} người có công chờ duyệt`]
        : chuaCong ? ["warn", `${chuaCong}/${fullTime.length} người chưa có công`] : ["ok", "Đủ công cả tháng"],
      can: ["File chấm công tháng theo mẫu (X = đi làm, T = ca trực).",
            "Sau khi tải lên, quản lý hoặc super admin bấm Duyệt thì mới tính công."],
    },
    {
      ma: "diemdanh", ten: "Ca dạy & điểm danh",
      tt: soCa ? ["ok", `${soCa} ca dạy đã duyệt`] : ["warn", "Chưa có ca dạy nào được duyệt"],
      can: ["Giáo viên báo cáo cuối mỗi ca; quản lý duyệt báo cáo ca dạy.",
            "Sổ điểm danh gốc của tháng (file Excel mỗi lớp một sheet) — số lượt học sinh có mặt quyết định lương dạy."],
    },
    {
      ma: "dongia", ten: "Đơn giá lớp",
      tt: donGia == null ? ["idle", "…"] : lopThieuGia ? ["warn", `${lopThieuGia} lớp chưa có đơn giá`] : ["ok", "Lớp nào cũng có đơn giá"],
      can: ["Tiền trả giáo viên cho 1 lượt học sinh có mặt của từng lớp (trống = theo chương trình)."],
    },
    {
      ma: "dieuchinh", ten: "Thi đua & điều chỉnh",
      tt: ["info", `${kpiDuyet}/${ds.length} phiếu thi đua đã duyệt`],
      can: ["Duyệt phiếu thi đua tháng (đạt ngưỡng thì thưởng 10%).",
            "Nếu có: thưởng sale, thuế TNCN, phạt, BHXH khác mức — bấm \"Chỉnh\" ở dòng của người đó trong bảng lương."],
    },
    {
      ma: "xuat", ten: "Chốt & xuất",
      tt: daChot ? ["ok", "Đã chốt theo đối soát"] : ["info", "Chưa chốt — đang tạm tính"],
      can: ["Kế toán đối soát xong thì nhập file đối soát (sheet “Bang luong”) để CHỐT số chính thức.",
            "Xuất Excel bảng thanh toán lương (đúng mẫu giấy) để trình ký.",
            "Mỗi nhân sự tự xem và in phiếu lương của mình ở menu \"Phiếu lương\"."],
    },
  ];
  const MAU = { ok: ["#E7F6EC", "#1E8E4F", "✓"], warn: ["#FFF4E0", "#B7791F", "!"], info: ["#EEF2FB", "#1F3A93", "i"], idle: ["#F3EFEA", "#8a7a66", "·"] };
  const lamMoi = (tb) => { onNotice?.(tb); setTaiLai((v) => v + 1); };
  const buocMo = BUOC.find((b) => b.ma === moBuoc);

  const hopThoai = (
    <>
      {cauHinh !== undefined ? (
        <CauHinhLuong
          teacherId={cauHinh}
          onDong={() => setCauHinh(undefined)}
          onDaLuu={(tb) => { setCauHinh(undefined); lamMoi(tb); }}
        />
      ) : null}
      {dangChinh ? (
        <HopDieuChinhThang
          nguoi={dangChinh}
          thang={thang}
          nam={nam}
          onDong={() => setDangChinh(null)}
          onDaLuu={(tb) => { setDangChinh(null); lamMoi(tb); }}
        />
      ) : null}
    </>
  );

  // Bấm một người -> trang lương riêng của người đó (cùng giao diện nhân viên thấy ở menu
  // "Phiếu lương"), thay vì nhồi chi tiết vào bảng chung.
  const nguoi = nguoiXem ? ds.find((x) => String(x.teacher_id) === String(nguoiXem)) : null;
  if (nguoiXem) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={() => moNguoi(null)}>← Bảng lương tháng {thang}/{nam}</Button>
          <span style={{ flex: 1 }} />
          {coTheGhi && nguoi ? <Button variant="ghost" onClick={() => setDangChinh(nguoi)}>Chỉnh thưởng / thuế / phạt tháng này</Button> : null}
          {coTheGhi && nguoi ? <Button variant="ghost" onClick={() => setCauHinh(nguoi.teacher_id)}>⚙ Cấu hình lương</Button> : null}
        </div>
        <Card>
          <div style={{ padding: "20px 24px", maxWidth: 820, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
            <PhieuNhanSu teacherId={nguoiXem} thang={thang} nam={nam} taiLai={taiLai} />
          </div>
        </Card>
        {hopThoai}
      </div>
    );
  }

  const tongChiPhi = tong.coBan + tong.day + tong.thuong + tong.troCap + tong.bhxhCty;
  const CO_CAU = [
    ["Lương cơ bản", tong.coBan, "#1F3A93"], ["Lương dạy", tong.day, "#F26522"],
    ["Thưởng", tong.thuong, "#1E8E4F"], ["Trợ cấp", tong.troCap, "#B7791F"], ["BHXH công ty đóng", tong.bhxhCty, "#8a7a66"],
  ];
  const oKhoi = (ten, t, n, mo) => (
    <Card>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ fontSize: 12.5, color: color.muted }}>{ten} · {n} người</div>
        <div style={{ fontSize: 24, fontWeight: 800, margin: "6px 0 4px" }}>{rutGonM(t.thucNhan || 0)}</div>
        <div style={{ fontSize: 12, color: color.faint }}>{mo}</div>
      </div>
    </Card>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <XacNhanLuongTongHop thang={thang} nam={nam} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        {oKhoi("Tổng lương thực nhận", tong, ds.length, `Chi phí lương công ty ${rutGonM(tongChiPhi)} (gồm BHXH công ty đóng)`)}
        {oKhoi("Khối giáo viên", tongGv, khoiGv.length, `Lương dạy ${rutGonM(tongGv.day || 0)} · cơ bản ${rutGonM(tongGv.coBan || 0)}`)}
        {oKhoi("Khối quản lý & văn phòng", tongQl, khoiQl.length, `Cơ bản ${rutGonM(tongQl.coBan || 0)} · trợ cấp ${rutGonM(tongQl.troCap || 0)}`)}
        <Card>
          <div style={{ padding: "16px 18px", fontSize: 12.5, display: "grid", gap: 4 }}>
            <div style={{ color: color.muted, marginBottom: 2 }}>Các yếu tố khác</div>
            {[["Thưởng (sale, thi đua)", tong.thuong], ["Trợ cấp (phụ cấp, trực, QLHS)", tong.troCap],
              ["BHXH nhân viên đóng", -tong.bhxh], ["Thuế TNCN", -tong.thue], ["Khấu trừ / phạt", -tong.khauTru],
              ["BHXH công ty đóng (21,5%)", tong.bhxhCty]].map(([n, v]) => (
              <div key={n} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span>{n}</span>
                <b style={{ color: v < 0 ? color.red : undefined }}>{v < 0 ? "-" : ""}{rutGonM(Math.abs(v || 0))}</b>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {tongChiPhi > 0 ? (
        <Card>
          <div style={{ padding: "14px 18px" }}>
            <div style={{ fontSize: 12.5, color: color.muted, marginBottom: 8 }}>Cơ cấu chi phí lương tháng {thang}/{nam}</div>
            <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", background: "#F3EFEA" }}>
              {CO_CAU.map(([n, v, m]) => (v > 0 ? <div key={n} title={`${n}: ${tien(v)}`} style={{ width: `${(v / tongChiPhi) * 100}%`, background: m }} /> : null))}
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8, fontSize: 12 }}>
              {CO_CAU.map(([n, v, m]) => (
                <span key={n} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <i style={{ width: 9, height: 9, borderRadius: 2, background: m, display: "inline-block" }} />
                  {n} <b>{Math.round((v / tongChiPhi) * 100)}%</b>
                </span>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHead
          title={`Chốt lương tháng ${String(thang).padStart(2, "0")}/${nam}`}
          sub="Làm lần lượt 6 bước. Bấm vào từng bước để xem cần chuẩn bị gì và làm ngay tại đó."
        />
        <div style={{ padding: "14px 22px 18px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          {BUOC.map((b, i) => {
            const [nen, chu, ky] = MAU[b.tt[0]];
            const dangMo = moBuoc === b.ma;
            return (
              <button key={b.ma} type="button" onClick={() => setMoBuoc(dangMo ? "" : b.ma)}
                      style={{ textAlign: "left", cursor: "pointer", borderRadius: 12, padding: "12px 12px 10px",
                               border: dangMo ? `2px solid ${color.orange}` : "1px solid #eadfd2", background: dangMo ? "#FFF8F3" : "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 11, background: nen, color: chu, fontWeight: 800,
                                 display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                    {b.tt[0] === "ok" ? ky : i + 1}
                  </span>
                  <b style={{ fontSize: 13.5 }}>{b.ten}</b>
                </div>
                <div style={{ fontSize: 12, color: chu, marginTop: 6, fontWeight: 600 }}>{b.tt[1]}</div>
              </button>
            );
          })}
        </div>
        {buocMo ? (
          <div style={{ margin: "0 22px 18px", padding: "12px 14px", borderRadius: 10, background: "#FBF7F2" }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Cần chuẩn bị</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4, fontSize: 13.5 }}>
              {buocMo.can.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </div>
        ) : null}
      </Card>

      {moBuoc === "nhansu" ? (
        <>
          {coTheGhi ? (
            <div><Button onClick={() => setCauHinh(null)}>+ Thêm nhân sự vào bảng lương</Button></div>
          ) : null}
          {chuaCoLuong.length ? (
            <NoteStrip>Chưa có mức lương: {chuaCoLuong.map((x) => x.ten).join(", ")}.</NoteStrip>
          ) : null}
          {coTheGhi || laQuanTri ? <GanNguoiChamCong onDaGan={lamMoi} /> : null}
          {coCau ? (
            <details>
              <summary style={{ cursor: "pointer", fontWeight: 700, padding: "6px 0" }}>Xem cơ cấu thu nhập đang áp dụng</summary>
              <Card>
                <div style={{ padding: "14px 0 6px" }}>
                  <Table
                    columns={["Vị trí", "Nhân sự", "Lương cố định", "Doanh thu / khoán", "Trực / demo / công", "Sale / thưởng / KPI", "BHXH"]}
                    rows={(coCau.vi_tri || []).map((v) => [
                      <Pill key="vt" tone="orange">{v.vi_tri}</Pill>, v.nhan_su, v.luong_co_dinh, v.doanh_thu_khoan,
                      v.truc_demo_cong, v.sale_thuong_kpi, v.bhxh,
                    ])}
                  />
                </div>
              </Card>
            </details>
          ) : null}
        </>
      ) : null}

      {moBuoc === "chamcong" ? (
        <>
          {coTheGhi ? <NhapChamCong thang={thang} nam={nam} onDaGhi={lamMoi} /> : null}
          <DuyetCongBoSung thang={thang} nam={nam} duocDuyet={laQuanTri} taiLai={taiLai} onDaDuyet={lamMoi} />
          {!congChoDuyet ? <NoteStrip>Không có ngày công nào đang chờ duyệt.</NoteStrip> : null}
        </>
      ) : null}

      {moBuoc === "diemdanh" ? (
        <>
          {laQuanTri ? <SoDiemDanhGoc thang={thang} nam={nam} onXong={lamMoi} /> : null}
          <DiemDanhHsBoSung thang={thang} nam={nam} coTheNhap={coTheGhi || laQuanTri} duocDuyet={laQuanTri} onXong={lamMoi} />
        </>
      ) : null}

      {moBuoc === "dongia" ? (
        <>
          <DonGiaTheoLop coTheGhi={coTheGhi} onDaLuu={lamMoi} />
          <MinhHoaLuongDay ds={ds} chon={gvMinhHoa} onChon={setGvMinhHoa} />
        </>
      ) : null}

      {moBuoc === "dieuchinh" ? (
        <NoteStrip>
          Phiếu thi đua duyệt ở menu <b>Thi đua tháng</b>. Thưởng sale, thuế TNCN, phạt, BHXH khác mức: bấm <b>Chỉnh</b> ở
          dòng của người đó trong bảng lương bên dưới — chỉ áp dụng cho tháng này.
        </NoteStrip>
      ) : null}

      {moBuoc === "xuat" ? (
        <ChotLuong thang={thang} nam={nam} ds={ds} coTheGhi={coTheGhi} onXong={lamMoi} />
      ) : null}
      {moBuoc === "xuat" ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Button onClick={() => xuatBangLuong({ thang, nam }).catch((e) => setLoi(loiApi(e, "Không xuất được bảng lương.")))}>
            ⬇ Xuất bảng thanh toán lương (Excel)
          </Button>
          <span style={{ fontSize: 13, color: color.muted }}>Nhân sự tự xem phiếu ở menu "Phiếu lương".</span>
        </div>
      ) : null}

      <Card>
        <CardHead
          title={daChot ? `Bảng lương ĐÃ CHỐT tháng ${thang}/${nam}` : "Bảng lương tạm tính"}
          sub={`Tháng ${String(thang).padStart(2, "0")}/${nam} · bấm tên một người để mở bảng lương chi tiết của người đó`}
          action="⬇ Xuất Excel"
          onAction={() => xuatBangLuong({ thang, nam }).catch((e) => setLoi(loiApi(e, "Không xuất được bảng lương.")))}
        />
        <div style={{ padding: "6px 0 6px" }}>
          {dangTai ? (
            <p style={{ padding: "0 22px", color: color.muted }}>Đang tải...</p>
          ) : loi ? (
            <p style={{ padding: "0 22px", color: color.red }}>{loi}</p>
          ) : ds.length === 0 ? (
            <p style={{ padding: "0 22px", color: color.muted }}>
              Chưa có nhân sự nào có mức lương — bắt đầu từ bước 1.
            </p>
          ) : (
            [["Khối giáo viên", khoiGv, tongGv], ["Khối quản lý & văn phòng", khoiQl, tongQl]].map(([ten, list, t]) => (list.length ? (
              <div key={ten} style={{ marginTop: 10 }}>
                <div style={{ padding: "6px 22px", fontWeight: 800, display: "flex", gap: 10 }}>
                  {ten} <span style={{ fontWeight: 500, color: color.muted }}>{list.length} người · thực nhận {tien(t.thucNhan)}</span>
                </div>
                <Table
                  columns={[
                    "Nhân sự", "Lương thực nhận", "Lương cơ bản", "Lương dạy", "Thưởng sale",
                    "BHXH", "Trợ cấp", "Thuế TNCN", "Khấu trừ", "",
                  ]}
                  rows={dongCua(list)}
                  align={{ 1: "right", 2: "right", 3: "right", 4: "right", 5: "right", 6: "right", 7: "right", 8: "right" }}
                />
              </div>
            ) : null))
          )}
        </div>
        <details style={{ padding: "0 22px 16px", fontSize: 12.5, color: color.muted }}>
          <summary style={{ cursor: "pointer" }}>Cách tính</summary>
          {ds.length && ds.every((x) => x.attendance?.machine_enabled === false) ? (
            <b>Công đang tính THEO FILE chấm công đã duyệt (máy chấm công tạm tắt). </b>
          ) : null}
          Lương cơ bản = lương × công ÷ 25 (đủ 25 công = trọn lương; quản lý đào tạo tính ít nhất 15 công). Lương dạy
          = đơn giá lớp × lượt học sinh của ca đã duyệt × % chia. Thưởng thi đua = 10% tổng lương khi phiếu thi đua đã
          duyệt và đạt ngưỡng điểm.
        </details>
      </Card>

      {hopThoai}
    </div>
  );
}

/**
 * Minh hoạ lương dạy theo lớp của một giáo viên (09/10/2026): mỗi lớp một dòng
 * Đơn giá × Lượt HS × % chia = Lương dạy, để giáo viên / kế toán đối chiếu.
 */
function MinhHoaLuongDay({ ds, chon, onChon }) {
  const coLop = ds.filter((x) => (x.classrooms || []).length);
  if (!coLop.length) return null;
  const x = coLop.find((g) => String(g.teacher_id) === String(chon)) || coLop[0];
  const c = x.salary_components || {};
  const nn = x.employment_type === "foreign";
  const NGUON = { diem_danh: "điểm danh tay", may_cham_cong: "máy / file bổ sung", si_so_bao_cao: "sĩ số báo cáo" };
  return (
    <Card>
      <CardHead
        title="Minh hoạ lương dạy theo lớp"
        sub={nn
          ? "Giáo viên nước ngoài: Đơn giá 1 ca × Số ca có báo cáo đã duyệt."
          : "Lương dạy 1 lớp = Đơn giá / lượt HS × Lượt HS có mặt (ca có báo cáo đã duyệt) × % chia của giáo viên."}
      />
      <div style={{ padding: "12px 22px 18px", display: "grid", gap: 12 }}>
        <select value={String(x.teacher_id)} onChange={(e) => onChon(e.target.value)}
                style={{ maxWidth: 320, padding: "9px 12px", borderRadius: 8, border: `1px solid ${color.borderStrong}`, fontSize: 13.5 }}>
          {coLop.map((g) => <option key={g.teacher_id} value={g.teacher_id}>{g.teacher_name}</option>)}
        </select>
        <Table
          columns={nn
            ? ["Lớp", "Số ca đã duyệt", "Đơn giá 1 ca", "Lương dạy"]
            : ["Lớp", "Căn cứ đơn giá", "Số ca đã duyệt", "Lượt HS", "Đơn giá / lượt", "Doanh thu tính lương", "% chia", "Lương dạy"]}
          align={nn ? { 1: "right", 2: "right", 3: "right" } : { 2: "right", 3: "right", 4: "right", 5: "right", 6: "right", 7: "right" }}
          rows={x.classrooms.map((l) => {
            const nguon = [...new Set((l.session_attendance || []).map((s) => NGUON[s.payable_source]).filter(Boolean))].join(", ");
            return nn
              ? [<b key="l">{l.classroom_name}</b>, l.approved_sessions_count, tien(c.rate_per_session), <b key="t">{tien(l.teaching_salary)}</b>]
              : [
                <b key="l">{l.classroom_name}</b>,
                l.salary_basis_label,
                l.approved_sessions_count,
                <span key="h" title={nguon ? `Nguồn: ${nguon}` : ""}>{l.payable_student_attendance_count}</span>,
                tien(l.salary_basis_per_student),
                tien(l.salary_basis_revenue),
                `${l.teacher_revenue_share_percent}%`,
                <b key="t">{tien(l.teaching_salary)}</b>,
              ];
          })}
        />
        <div style={{ fontSize: 13.5 }}>Tổng lương dạy: <b>{tien(c.teaching_salary)}</b></div>
      </div>
    </Card>
  );
}

/** Phiếu lương một người — đúng giao diện trang "Phiếu lương của tôi" của nhân viên. */
function PhieuNhanSu({ teacherId, thang, nam, taiLai }) {
  const [duLieu, setDuLieu] = useState(null);
  const [loi, setLoi] = useState("");
  useEffect(() => {
    let huy = false;
    setLoi("");
    layPhieuLuong({ thang, nam, teacher: teacherId })
      .then((d) => !huy && setDuLieu(d))
      .catch((e) => !huy && setLoi(loiApi(e, "Không tải được phiếu lương.")));
    return () => { huy = true; };
  }, [teacherId, thang, nam, taiLai]);
  if (loi) return <p style={{ color: color.red }}>{loi}</p>;
  return duLieu ? <PhieuLuong key={`${teacherId}-${thang}-${nam}`} duLieu={duLieu} /> : <p style={{ color: color.muted }}>Đang tải…</p>;
}
