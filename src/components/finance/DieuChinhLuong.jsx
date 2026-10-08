import { useEffect, useState } from "react";
import { dinhDangTien, loiApi } from "../../services/financeService";
import { layDieuChinh, layDonGiaLop, luuDieuChinh, luuDonGiaLop } from "../../services/payrollService";
import { Button, Card, CardHead, Field, Input, Modal, Table } from "./v3/ui";
import { color } from "./v3/theme";

/**
 * Hai chỗ kế toán chỉnh tay bảng lương (chủ trung tâm chốt 08/10/2026):
 *  - HopDieuChinhThang: khấu trừ của MỘT người trong MỘT tháng — BHXH (để trống
 *    = tự tính), thuế thu nhập 2 nguồn, phạt, điều chỉnh khác, và ngưỡng điểm
 *    thi đua để được thưởng.
 *  - DonGiaTheoLop: đơn giá trả giáo viên / lượt học sinh của từng lớp; lớp chưa
 *    set thì dùng bảng mặc định theo chương trình.
 * Máy chủ tính lại toàn bộ bảng lương từ các số này (attendance/services.py).
 */

const soTu = (v) => {
  const t = String(v ?? "").replace(/[^\d-]/g, "");
  return t === "" || t === "-" ? "" : Number(t);
};
const hienSo = (v) => (v === null || v === undefined || v === "" ? "" : dinhDangTien(v));

function OTien({ value, onChange, placeholder }) {
  return (
    <Input
      inputMode="numeric"
      value={hienSo(value)}
      placeholder={placeholder}
      onChange={(e) => onChange(soTu(e.target.value))}
    />
  );
}

export function HopDieuChinhThang({ nguoi, thang, nam, onDong, onDaLuu }) {
  const [f, setF] = useState(null);
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);

  useEffect(() => {
    layDieuChinh(nguoi.teacher_id, { thang, nam })
      .then(setF)
      .catch((e) => setLoi(loiApi(e, "Không tải được khoản điều chỉnh.")));
  }, [nguoi.teacher_id, thang, nam]);

  const doi = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const luu = async () => {
    setDang(true);
    setLoi("");
    try {
      await luuDieuChinh(nguoi.teacher_id, { thang, nam }, {
        ...f,
        insurance_override: f.insurance_override === "" ? null : f.insurance_override,
      });
      onDaLuu?.(`Đã lưu khấu trừ tháng ${thang}/${nam} của ${nguoi.teacher_name}.`);
    } catch (e) {
      setLoi(loiApi(e, "Không lưu được."));
    } finally {
      setDang(false);
    }
  };

  return (
    <Modal
      title={`Khấu trừ & điều chỉnh — ${nguoi.teacher_name}`}
      sub={`Tháng ${thang}/${nam}. Chỉ áp dụng cho tháng này.`}
      width={620}
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
          <Field label="BHXH (đ) — để trống = tự tính theo cấu hình">
            <OTien value={f.insurance_override ?? ""} onChange={doi("insurance_override")} placeholder="Để trống = tự tính" />
          </Field>
          <Field label="Thuế thu nhập 2 nguồn (đ)">
            <OTien value={f.tax_two_sources} onChange={doi("tax_two_sources")} placeholder="0" />
          </Field>
          <Field label="Phạt (đ)">
            <OTien value={f.penalty} onChange={doi("penalty")} placeholder="0" />
          </Field>
          <Field label="Lý do phạt">
            <Input value={f.penalty_note} maxLength={255} onChange={(e) => doi("penalty_note")(e.target.value)} />
          </Field>
          <Field label="Điều chỉnh khác (+ cộng / − trừ, đ)">
            <OTien value={f.other_adjustment} onChange={doi("other_adjustment")} placeholder="0" />
          </Field>
          <Field label="Ghi chú điều chỉnh">
            <Input value={f.note} maxLength={255} onChange={(e) => doi("note")(e.target.value)} />
          </Field>
          <Field label={`Ngưỡng điểm thi đua để thưởng ${f.kpi_bonus_percent}%`}>
            <Input
              inputMode="numeric"
              value={f.kpi_bonus_min_score}
              onChange={(e) => doi("kpi_bonus_min_score")(e.target.value.replace(/[^\d.]/g, ""))}
            />
          </Field>
          {loi ? <div style={{ color: color.red, fontSize: 13.5, gridColumn: "1 / -1" }}>{loi}</div> : null}
        </div>
      )}
    </Modal>
  );
}

export function DonGiaTheoLop({ coTheGhi, onDaLuu }) {
  const [ds, setDs] = useState(null);
  const [nhap, setNhap] = useState({});
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(0);

  const tai = () => layDonGiaLop().then(setDs).catch((e) => setLoi(loiApi(e, "Không tải được đơn giá lớp.")));
  useEffect(() => { tai(); }, []);

  const luu = async (lop) => {
    setDang(lop.classroom_id);
    setLoi("");
    try {
      const v = nhap[lop.classroom_id];
      await luuDonGiaLop(lop.classroom_id, v === "" ? null : v);
      setNhap((p) => { const n = { ...p }; delete n[lop.classroom_id]; return n; });
      await tai();
      onDaLuu?.(`Đã lưu đơn giá lớp ${lop.class_code || lop.name}.`);
    } catch (e) {
      setLoi(loiApi(e, "Không lưu được đơn giá."));
    } finally {
      setDang(0);
    }
  };

  return (
    <Card>
      <CardHead
        title="Đơn giá lương dạy theo lớp"
        sub="Tiền trả giáo viên cho 1 lượt học sinh có mặt, trước khi nhân % chia. Ô trống = dùng mặc định theo chương trình."
      />
      <div style={{ padding: "14px 0 6px" }}>
        {loi ? <p style={{ padding: "0 22px", color: color.red }}>{loi}</p> : null}
        {!ds ? (
          <p style={{ padding: "0 22px", color: color.muted }}>Đang tải...</p>
        ) : (
          <Table
            columns={["Lớp", "Chương trình", "Mặc định", "Đơn giá áp dụng", ""]}
            align={{ 2: "right", 3: "right" }}
            rows={ds.map((l) => {
              const dangSua = Object.prototype.hasOwnProperty.call(nhap, l.classroom_id);
              const apDung = l.manual_rate ?? l.default_rate;
              return [
                <b key="l">{l.class_code || l.name}</b>,
                `${l.program_name || "—"}${l.level_name ? ` · ${l.level_name}` : ""}`,
                <span key="m" style={{ color: l.default_rate ? color.muted : color.red }}>
                  {l.default_rate ? dinhDangTien(l.default_rate) : "chưa có"}
                </span>,
                coTheGhi ? (
                  <div key="i" style={{ maxWidth: 140, marginLeft: "auto" }}>
                    <OTien
                      value={dangSua ? nhap[l.classroom_id] : (l.manual_rate ?? "")}
                      placeholder={l.default_rate ? dinhDangTien(l.default_rate) : "Nhập đơn giá"}
                      onChange={(v) => setNhap((p) => ({ ...p, [l.classroom_id]: v }))}
                    />
                  </div>
                ) : (
                  <b key="i" style={{ color: apDung ? undefined : color.red }}>{apDung ? dinhDangTien(apDung) : "0"}</b>
                ),
                coTheGhi && dangSua ? (
                  <Button key="s" disabled={dang === l.classroom_id} onClick={() => luu(l)}>Lưu</Button>
                ) : (l.manual_rate !== null ? <span key="s" style={{ fontSize: 12, color: color.muted }}>set tay</span> : null),
              ];
            })}
          />
        )}
      </div>
    </Card>
  );
}
