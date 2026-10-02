import { useEffect, useState } from "react";
import { dinhDangTien, loiApi, rutGonM } from "../../services/financeService";
import { layBangLuong, layCoCauLuong } from "../../services/payrollService";
import { Card, CardHead, NoteStrip, Num, Pill, StatCard, Table } from "./v3/ui";
import { color } from "./v3/theme";

/**
 * Phân hệ "Bảng lương".
 *
 * Lương TẠM TÍNH theo tháng, do máy chủ tính từ cấu hình lương từng người (theo
 * bảng cơ cấu thu nhập đang áp dụng), chấm công ca trực và các buổi dạy đã
 * duyệt. Không cho nhập tay số thực nhận ở đây: muốn số khác thì sửa nguồn
 * (cấu hình, buổi dạy, chấm công), để con số luôn truy ngược được.
 */

const LOAI = { full_time: "Full-time", part_time: "Part-time", director: "Giám đốc" };

const tien = (v) => dinhDangTien(Math.round(Number(v || 0)));

export default function BangLuong({ thang, nam }) {
  const [ds, setDs] = useState([]);
  const [coCau, setCoCau] = useState(null);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");

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
  }, [thang, nam]);

  const tong = ds.reduce(
    (a, x) => {
      const c = x.salary_components || {};
      a.thucNhan += Number(c.net_salary || 0);
      a.day += Number(c.teaching_salary || 0);
      a.bhxh += Number(c.insurance_deduction || 0);
      return a;
    },
    { thucNhan: 0, day: 0, bhxh: 0 },
  );

  const dong = ds.map((x) => {
    const c = x.salary_components || {};
    const cc = x.attendance || {};
    const khac = Number(c.sale_commission || 0) + Number(c.allowance || 0)
      + Number(c.manual_adjustment || 0);
    return [
      <div key="t">
        <div style={{ fontWeight: 700 }}>{x.teacher_name}</div>
        <div style={{ fontSize: 12, color: color.muted, marginTop: 2 }}>
          {x.position_label || LOAI[x.employment_type] || x.employment_type}
          {x.position_label ? ` · ${LOAI[x.employment_type] || x.employment_type}` : ""}
        </div>
      </div>,
      <div key="cd">
        <Num>{tien(c.prorated_base_salary)}</Num>
        {Number(c.base_salary) > 0 ? (
          <div style={{ fontSize: 11.5, color: color.faint }}>
            {cc.attendance_days || 0}/{cc.base_salary_standard_days || 30} công · {rutGonM(c.base_salary)}
          </div>
        ) : null}
      </div>,
      <div key="d">
        <Num>{tien(c.teaching_salary)}</Num>
        {Number(c.teaching_salary) > 0 || Number(c.share_percent) > 0 ? (
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
      <Num key="th">{tien(c.monthly_bonus)}</Num>,
      <Num key="b" tone={Number(c.insurance_deduction) > 0 ? "red" : undefined}>
        {Number(c.insurance_deduction) > 0 ? `-${tien(c.insurance_deduction)}` : 0}
      </Num>,
      <Num key="n" bold>{tien(c.net_salary)}</Num>,
    ];
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <StatCard label="Tổng thực nhận (tạm tính)" value={rutGonM(tong.thucNhan)} note={`Tháng ${thang}/${nam}`} icon="wallet" />
        <StatCard label="Lương dạy theo doanh thu lớp" value={rutGonM(tong.day)} note="Buổi dạy đã duyệt" icon="doc" tone="blue" />
        <StatCard label="BHXH người lao động" value={rutGonM(tong.bhxh)} note="Trừ vào lương" icon="doc" tone="amber" />
        <StatCard label="Số người có cấu hình lương" value={ds.length} note="Theo cấu hình từng nhân sự" icon="doc" tone="green" />
      </div>

      <NoteStrip>
        Lương tạm tính: chỉ tính buổi dạy có báo cáo đã duyệt và đủ điều kiện tính lương, học sinh vắng
        không tính doanh thu; ca trực lấy từ chấm công (T2–T6, T7, CN tính giá khác nhau). Thưởng năm theo
        LNST và các khoản chưa đối soát không nằm trong bảng này.
      </NoteStrip>

      <Card>
        <CardHead title="Bảng lương tạm tính" sub={`Tháng ${String(thang).padStart(2, "0")}/${nam}`} />
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
                "Sale, phụ cấp, điều chỉnh", "Thưởng tháng", "BHXH", "Thực nhận",
              ]}
              rows={dong}
              align={{ 1: "right", 2: "right", 3: "right", 4: "right", 5: "right", 6: "right", 7: "right", 8: "right" }}
            />
          )}
        </div>
      </Card>

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
