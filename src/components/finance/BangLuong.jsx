import { useEffect, useRef, useState } from "react";
import { dinhDangTien, loiApi, rutGonM } from "../../services/financeService";
import { layBangLuong, layCoCauLuong, nhapChamCong, taiMauChamCong, xuatBangLuong } from "../../services/payrollService";
import { Button, Card, CardHead, NoteStrip, Num, Pill, StatCard, Table } from "./v3/ui";
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

  const tong = ds.reduce(
    (a, x) => {
      const c = x.salary_components || {};
      a.thucNhan += Number(c.net_salary || 0);
      a.day += Number(c.teaching_salary || 0);
      a.khauTru += Number(c.total_deduction ?? c.insurance_deduction ?? 0);
      return a;
    },
    { thucNhan: 0, day: 0, khauTru: 0 },
  );

  const dong = ds.map((x) => {
    const c = x.salary_components || {};
    const cc = x.attendance || {};
    const khac = Number(c.sale_commission || 0) + Number(c.allowance || 0)
      + Number(c.manual_adjustment || 0) + Number(c.other_adjustment || 0);
    const khauTru = Number(c.total_deduction ?? c.insurance_deduction ?? 0);
    const chiTietTru = [
      Number(c.insurance_deduction) > 0 ? `BHXH ${rutGonM(c.insurance_deduction)}${c.insurance_overridden ? " (tay)" : ""}` : "",
      Number(c.tax_deduction) > 0 ? `Thuế ${rutGonM(c.tax_deduction)}` : "",
      Number(c.penalty) > 0 ? `Phạt ${rutGonM(c.penalty)}` : "",
    ].filter(Boolean).join(" · ");
    return [
      <div key="t">
        <div style={{ fontWeight: 700 }}>{x.teacher_name}</div>
        <div style={{ fontSize: 12, color: color.muted, marginTop: 2 }}>
          {x.position_label || LOAI[x.employment_type] || x.employment_type}
          {x.position_label ? ` · ${LOAI[x.employment_type] || x.employment_type}` : ""}
        </div>
        <div style={{ fontSize: 11.5, color: color.faint, marginTop: 2 }}>
          {cc.attendance_days || 0} công
          {Number(cc.single_punch_days) ? ` · ${cc.single_punch_days} ngày chỉ 1 lượt quẹt (không tính)` : ""}
          {Number(cc.pending_file_days) ? ` · ${cc.pending_file_days} ngày chờ duyệt` : ""}
          {Number(cc.teaching_sessions_total) ? ` · ${cc.teaching_sessions_with_punch || 0}/${cc.teaching_sessions_total} ca dạy có quẹt máy` : ""}
        </div>
      </div>,
      <div key="cd">
        <Num>{tien(c.prorated_base_salary)}</Num>
        {Number(c.base_salary) > 0 ? (
          <div style={{ fontSize: 11.5, color: color.faint }}>
            {cc.payable_workdays ?? cc.attendance_days ?? 0}/{cc.base_salary_standard_days || 26} công
            {Number(cc.payable_workdays) > Number(cc.attendance_days) ? ` (thực ${cc.attendance_days}, tối thiểu 15)` : ""}
            {" · "}{rutGonM(c.base_salary)}
          </div>
        ) : null}
      </div>,
      <div key="d">
        <Num>{tien(c.teaching_salary)}</Num>
        {x.employment_type === "foreign" ? (
          <div style={{ fontSize: 11.5, color: color.faint }}>
            {x.teaching_summary?.approved_sessions_count || 0} ca × {tien(c.rate_per_session)}
          </div>
        ) : Number(c.teaching_salary) > 0 || Number(c.share_percent) > 0 ? (
          <div style={{ fontSize: 11.5, color: color.faint }}>
            {c.share_percent || 0}% × {rutGonM(c.salary_basis_revenue_total)}
          </div>
        ) : null}
      </div>,
      <div key="tr">
        <Num>{tien(c.duty_salary)}</Num>
        {Number(cc.duty_shift_count) > 0 ? (
          <div style={{ fontSize: 11.5, color: color.faint }}>
            {cc.duty_weekday_count || 0} T2–T6 · {cc.duty_saturday_count || 0} T7 · {cc.duty_sunday_count || 0} CN
          </div>
        ) : null}
      </div>,
      <div key="k">
        <Num>{tien(c.student_management_pay)}</Num>
        {Number(c.student_management_rate) > 0 ? (
          <div style={{ fontSize: 11.5, color: color.faint }}>
            {c.center_payable_attendance_count || 0} lượt × {tien(c.student_management_rate)} × KPI {c.kpi_coefficient_percent}%
          </div>
        ) : null}
      </div>,
      <Num key="s">{tien(khac)}</Num>,
      <div key="th" title={c.kpi_bonus_reason || ""}>
        <Num>{tien(c.monthly_bonus)}</Num>
        <div style={{ fontSize: 11.5, color: color.faint }}>
          {c.kpi_score != null ? `Thi đua ${c.kpi_score} đ` : "Chưa có phiếu"}
          {c.kpi_score != null && c.kpi_status !== "approved" ? " · chưa duyệt" : ""}
        </div>
      </div>,
      <div key="b" title={c.penalty_note || ""}>
        <Num tone={khauTru > 0 ? "red" : undefined}>{khauTru > 0 ? `-${tien(khauTru)}` : 0}</Num>
        {chiTietTru ? <div style={{ fontSize: 11.5, color: color.faint }}>{chiTietTru}</div> : null}
      </div>,
      <Num key="n" bold>{tien(c.net_salary)}</Num>,
      ...(coTheGhi ? [
        <div key="c" style={{ display: "flex", gap: 6 }}>
          <Button variant="ghost" onClick={() => setDangChinh(x)}>Chỉnh</Button>
          <Button variant="ghost" onClick={() => setCauHinh(x.teacher_id)}>Cấu hình</Button>
        </div>,
      ] : []),
    ];
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <StatCard label="Tổng thực nhận (tạm tính)" value={rutGonM(tong.thucNhan)} note={`Tháng ${thang}/${nam}`} icon="wallet" />
        <StatCard label="Lương dạy theo doanh thu lớp" value={rutGonM(tong.day)} note="Buổi dạy đã duyệt" icon="doc" tone="blue" />
        <StatCard label="Khấu trừ" value={rutGonM(tong.khauTru)} note="BHXH, thuế 2 nguồn, phạt" icon="doc" tone="amber" />
        <StatCard label="Số người có cấu hình lương" value={ds.length} note="Theo cấu hình từng nhân sự" icon="doc" tone="green" />
      </div>

      <NoteStrip>
        {ds.length && ds.every((x) => x.attendance?.machine_enabled === false) ? (
          <b>Công đang tính THEO FILE chấm công đã duyệt (máy chấm công tạm tắt). </b>
        ) : null}
        Lương cứng = lương × công ÷ 26 (quản lý đào tạo tính ít nhất 15 công). Lương dạy = đơn giá lớp ×
        lượt học sinh của ca đã duyệt × % chia. Thưởng thi đua = 10% tổng lương khi phiếu thi đua đã duyệt và
        đạt ngưỡng điểm. Khấu trừ BHXH, thuế thu nhập 2 nguồn, phạt chỉnh tay từng tháng bằng nút "Chỉnh".
      </NoteStrip>

      <DuyetCongBoSung
        thang={thang}
        nam={nam}
        duocDuyet={laQuanTri}
        taiLai={taiLai}
        onDaDuyet={(tb) => { onNotice?.(tb); setTaiLai((v) => v + 1); }}
      />

      {coTheGhi ? (
        <NhapChamCong
          thang={thang}
          nam={nam}
          onDaGhi={(tb) => { onNotice?.(tb); setTaiLai((v) => v + 1); }}
        />
      ) : null}

      <Card>
        <CardHead
          title="Bảng lương tạm tính"
          sub={`Tháng ${String(thang).padStart(2, "0")}/${nam}`}
          action={coTheGhi ? "+ Thêm nhân sự vào bảng lương" : undefined}
          onAction={coTheGhi ? () => setCauHinh(null) : undefined}
        />
        <div style={{ padding: "10px 22px 0" }}>
          <Button variant="ghost" onClick={() => xuatBangLuong({ thang, nam }).catch((e) => setLoi(loiApi(e, "Không xuất được bảng lương.")))}>
            ⬇ Xuất bảng lương Excel (kèm lương dạy theo lớp)
          </Button>
        </div>
        <div style={{ padding: "14px 0 6px" }}>
          {dangTai ? (
            <p style={{ padding: "0 22px", color: color.muted }}>Đang tải...</p>
          ) : loi ? (
            <p style={{ padding: "0 22px", color: color.red }}>{loi}</p>
          ) : ds.length === 0 ? (
            <p style={{ padding: "0 22px", color: color.muted }}>
              Chưa có nhân sự nào được khai cấu hình lương.
            </p>
          ) : (
            <Table
              columns={[
                "Nhân sự", "Lương cố định", "Lương dạy", "Trực / demo", "Khoán QLHS",
                "Sale, phụ cấp, điều chỉnh", "Thưởng thi đua", "Khấu trừ", "Thực nhận",
                ...(coTheGhi ? [""] : []),
              ]}
              rows={dong}
              align={{ 1: "right", 2: "right", 3: "right", 4: "right", 5: "right", 6: "right", 7: "right", 8: "right" }}
            />
          )}
        </div>
      </Card>

      {laQuanTri ? (
        <SoDiemDanhGoc thang={thang} nam={nam} onXong={(tb) => { onNotice?.(tb); setTaiLai((v) => v + 1); }} />
      ) : null}

      <DiemDanhHsBoSung
        thang={thang}
        nam={nam}
        coTheNhap={coTheGhi || laQuanTri}
        duocDuyet={laQuanTri}
        onXong={(tb) => { onNotice?.(tb); setTaiLai((v) => v + 1); }}
      />

      {coTheGhi || laQuanTri ? (
        <GanNguoiChamCong onDaGan={(tb) => { onNotice?.(tb); setTaiLai((v) => v + 1); }} />
      ) : null}

      <MinhHoaLuongDay ds={ds} chon={gvMinhHoa} onChon={setGvMinhHoa} />

      <DonGiaTheoLop
        coTheGhi={coTheGhi}
        onDaLuu={(tb) => { onNotice?.(tb); setTaiLai((v) => v + 1); }}
      />

      {cauHinh !== undefined ? (
        <CauHinhLuong
          teacherId={cauHinh}
          onDong={() => setCauHinh(undefined)}
          onDaLuu={(tb) => { setCauHinh(undefined); onNotice?.(tb); setTaiLai((v) => v + 1); }}
        />
      ) : null}

      {dangChinh ? (
        <HopDieuChinhThang
          nguoi={dangChinh}
          thang={thang}
          nam={nam}
          onDong={() => setDangChinh(null)}
          onDaLuu={(tb) => { setDangChinh(null); onNotice?.(tb); setTaiLai((v) => v + 1); }}
        />
      ) : null}

      {coCau ? (
        <Card>
          <CardHead
            title="Cơ cấu thu nhập đang áp dụng"
            sub={`Cập nhật ${coCau.ngay_cap_nhat} · bảng minh hoạ cấu phần thu nhập, không thay thế HĐLĐ`}
          />
          <div style={{ padding: "14px 0 6px" }}>
            <Table
              columns={[
                "Vị trí", "Nhân sự", "Lương cố định", "Doanh thu / khoán", "Trực / demo / công",
                "Sale / thưởng / KPI", "BHXH",
              ]}
              rows={(coCau.vi_tri || []).map((v) => [
                <Pill key="vt" tone="orange">{v.vi_tri}</Pill>,
                v.nhan_su,
                v.luong_co_dinh,
                v.doanh_thu_khoan,
                v.truc_demo_cong,
                v.sale_thuong_kpi,
                v.bhxh,
              ])}
            />
          </div>
          <p style={{ padding: "4px 22px 18px", fontSize: 12.5, color: color.muted, margin: 0 }}>
            {coCau.nguyen_tac_doi_soat}
          </p>
        </Card>
      ) : null}
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
