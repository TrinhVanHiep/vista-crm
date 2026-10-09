import { useEffect, useState } from "react";
import { dinhDangTien, loiApi } from "../../services/financeService";
import { layCauHinhLuong, layNhanSuChuaCoLuong, luuCauHinhLuong, themNhanSuLuong } from "../../services/payrollService";
import { Button, Field, Input, Modal } from "./v3/ui";
import { color } from "./v3/theme";

/**
 * Cấu hình lương CỐ ĐỊNH của một người (dùng cho mọi tháng) và thêm người mới
 * vào bảng lương. Trước đây chỉ sửa được trong Django admin, nên người chưa có
 * cấu hình (vd. tài khoản thiếu tên) không bao giờ hiện trên bảng lương.
 *
 * Giáo viên nước ngoài (chốt 08/10/2026): lương = đơn giá/ca × số ca dạy thực tế
 * (ca có báo cáo đã duyệt); không lương cứng, không chia % doanh thu lớp.
 */

const LOAI = [
  ["full_time", "Full-time"],
  ["part_time", "Part-time"],
  ["foreign", "Giáo viên nước ngoài"],
];
const VI_TRI = [
  ["", "—"],
  ["center_manager", "Quản lý cơ sở"],
  ["training_manager", "Quản lý đào tạo"],
  ["teacher_full_time", "Giáo viên full-time"],
  ["teacher_part_time", "Giáo viên part-time"],
  ["foreign_teacher", "Giáo viên nước ngoài"],
  ["intern", "Thực tập sinh / GV hỗ trợ"],
  ["designer", "Designer / Thiết kế"],
];

const so = (v) => {
  const t = String(v ?? "").replace(/[^\d]/g, "");
  return t === "" ? "" : Number(t);
};

function Chon({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", padding: "11px 12px", borderRadius: 10, border: `1px solid ${color.borderStrong}`, fontSize: 13.5 }}
    >
      {options.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
    </select>
  );
}

const TIEN = [
  ["base_salary", "Lương cứng (đ/tháng)"],
  ["insurance_salary", "Mức đóng BHXH (đ) — 0 = theo lương cứng"],
  ["student_management_rate", "Khoán QL học sinh (đ/lượt)"],
  ["allowance", "Phụ cấp (đ/tháng)"],
];

export default function CauHinhLuong({ teacherId, onDong, onDaLuu }) {
  const [f, setF] = useState(null);
  const [dsGv, setDsGv] = useState([]);
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  const moi = !teacherId;

  useEffect(() => {
    layCauHinhLuong()
      .then(async (ds) => {
        if (!moi) {
          const c = ds.find((x) => Number(x.teacher) === Number(teacherId));
          setF(c || null);
          if (!c) setLoi("Không tìm thấy cấu hình lương.");
          return;
        }
        // Giáo viên chưa có cấu hình + nhân sự khác (QLCS, thiết kế…) chưa có hồ sơ.
        setDsGv(await layNhanSuChuaCoLuong());
        setF({ teacher: "", employment_type: "part_time", position: "", base_salary: 0,
          class_revenue_share_percent: 30, rate_per_session: 0, insurance_salary: 0,
          student_management_rate: 0, allowance: 0 });
      })
      .catch((e) => setLoi(loiApi(e, "Không tải được cấu hình lương.")));
  }, [teacherId, moi]);

  const doi = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const nuocNgoai = f?.employment_type === "foreign";

  const luu = async () => {
    if (moi && !f.teacher) { setLoi("Chọn nhân sự."); return; }
    setDang(true);
    setLoi("");
    try {
      const { id, teacher, employment_type, position, base_salary, class_revenue_share_percent,
        rate_per_session, insurance_salary, student_management_rate, allowance } = f;
      const [loaiNs, idNs] = String(teacher || "").split(":");
      const ns = dsGv.find((x) => `${x.loai}:${x.id}` === teacher);
      let xacNhanTrung = false;
      if (moi && ns?.trung_voi) {
        // eslint-disable-next-line no-alert
        xacNhanTrung = window.confirm(
          `“${ns.ten}” trùng tên với ${ns.trung_voi} đã có trong bảng lương.\n`
          + "Nếu đây là tài khoản thứ hai của CÙNG một người thì bấm Huỷ — thêm vào sẽ tính lương 2 lần.\n"
          + "Bấm OK chỉ khi đây là người khác.",
        );
        if (!xacNhanTrung) { setDang(false); return; }
      }
      const luu = moi ? themNhanSuLuong : (payload) => luuCauHinhLuong(id, payload);
      await luu({
        ...(moi ? { [loaiNs]: Number(idNs), ...(xacNhanTrung ? { xac_nhan_trung: true } : {}) } : {}),
        employment_type, position, class_revenue_share_percent: Number(class_revenue_share_percent) || 0,
        base_salary: nuocNgoai ? 0 : Number(base_salary) || 0, rate_per_session: Number(rate_per_session) || 0,
        insurance_salary: Number(insurance_salary) || 0, student_management_rate: Number(student_management_rate) || 0,
        allowance: Number(allowance) || 0,
      });
      onDaLuu?.(moi ? "Đã thêm nhân sự vào bảng lương." : "Đã lưu cấu hình lương.");
    } catch (e) {
      setLoi(loiApi(e, "Không lưu được cấu hình."));
    } finally {
      setDang(false);
    }
  };

  const VAI = { center_manager: "QL cơ sở", training_manager: "QL đào tạo", teacher: "Giáo viên", accountant: "Kế toán", admin: "Admin", staff: "Nhân viên" };
  const tenNs = (t) => `${t.trung_voi ? "⚠ " : ""}${t.ten}${t.vai ? ` · ${VAI[t.vai] || t.vai}` : ""}${t.email ? ` · ${t.email}` : ""}${t.trung_voi ? ` — TRÙNG TÊN với ${t.trung_voi} đã có lương` : ""}`;

  return (
    <Modal
      title={moi ? "Thêm nhân sự vào bảng lương" : `Cấu hình lương — ${f?.teacher_name || ""}`}
      sub="Áp dụng cho mọi tháng. Khoản riêng của một tháng (phạt, thuế…) dùng nút Chỉnh."
      width={640}
      onClose={onDong}
      footer={(
        <>
          <Button variant="ghost" onClick={onDong}>Huỷ</Button>
          <Button disabled={!f || dang} onClick={luu}>{dang ? "Đang lưu..." : "Lưu"}</Button>
        </>
      )}
    >
      {!f ? (
        <p style={{ color: loi ? color.red : color.muted }}>{loi || "Đang tải..."}</p>
      ) : (
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {moi ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Nhân sự (chưa có trong bảng lương)">
                <Chon value={f.teacher} onChange={doi("teacher")}
                      options={[["", "— Chọn —"], ...dsGv.map((t) => [`${t.loai}:${t.id}`, tenNs(t)])]} />
              </Field>
            </div>
          ) : null}
          <Field label="Loại"><Chon value={f.employment_type} onChange={doi("employment_type")} options={LOAI} /></Field>
          <Field label="Vị trí"><Chon value={f.position || ""} onChange={doi("position")} options={VI_TRI} /></Field>
          {nuocNgoai ? (
            <Field label="Đơn giá 1 ca dạy (đ)">
              <Input inputMode="numeric" value={f.rate_per_session ? dinhDangTien(f.rate_per_session) : ""}
                     onChange={(e) => doi("rate_per_session")(so(e.target.value))} />
            </Field>
          ) : (
            <Field label="% chia lương dạy">
              <Input inputMode="numeric" value={f.class_revenue_share_percent}
                     onChange={(e) => doi("class_revenue_share_percent")(e.target.value.replace(/[^\d.]/g, ""))} />
            </Field>
          )}
          {TIEN.filter(([k]) => !(nuocNgoai && k === "base_salary")).map(([k, nhan]) => (
            <Field key={k} label={nhan}>
              <Input inputMode="numeric" value={Number(f[k]) ? dinhDangTien(f[k]) : ""} placeholder="0"
                     onChange={(e) => doi(k)(so(e.target.value))} />
            </Field>
          ))}
          {nuocNgoai ? (
            <div style={{ gridColumn: "1 / -1", fontSize: 12.5, color: color.muted }}>
              Lương = đơn giá × số ca dạy có báo cáo đã duyệt trong tháng. Không lương cứng, không chia % học phí.
            </div>
          ) : null}
          {loi ? <div style={{ gridColumn: "1 / -1", color: color.red, fontSize: 13.5 }}>{loi}</div> : null}
        </div>
      )}
    </Modal>
  );
}
