import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getStudent,
  updateStudent,
  listMonthlyScorecards,
} from "../services/calendarService";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  Kpi,
  KpiGrid,
  Modal,
  Page,
  PageHeader,
} from "../ui";

/**
 * Hồ sơ học viên.
 *
 * Trước đây tuyến /students/:id dùng lại EmployeeProfile — màn dựng cho NHÂN SỰ,
 * nên hồ sơ một em nhỏ lại nằm cạnh "Chi tiết tính lương" và bị gác bằng quyền
 * employeeProfile.
 *
 * Thiết kế màn này bám vào thực trạng dữ liệu: đo trên 382 học viên thì 9/12
 * trường hồ sơ đang trống 0% (mã HV, ngày sinh, giới tính, ngày nhập học, địa
 * chỉ, cả 3 trường phụ huynh, ghi chú học vụ), chỉ họ tên 100%, lớp 99%, điện
 * thoại 77%. Nên màn KHÔNG bày một bảng dài toàn dấu gạch, mà:
 *   - đưa lên trước thứ THỰC SỰ có: kết quả học tập theo tháng và chuyên cần;
 *   - gom phần còn thiếu vào một chỗ, kèm nút bổ sung ngay tại màn.
 */

const NHAN_TINH_TRANG = {
  active: "Đang theo học",
  inactive: "Tạm nghỉ",
  graduated: "Đã hoàn thành",
  dropped: "Đã nghỉ",
  suspended: "Bảo lưu",
};
const TONE_TINH_TRANG = {
  active: "green",
  inactive: "orange",
  graduated: "blue",
  dropped: "red",
  suspended: "orange",
};
// Tên kỹ năng do giáo viên tự đặt khoá khi chấm; chỉ dịch những khoá hay gặp,
// khoá lạ thì hiện nguyên văn thay vì bỏ mất.
const NHAN_KY_NANG = {
  listening: "Nghe", speaking: "Nói", reading: "Đọc", writing: "Viết",
  vocabulary: "Từ vựng", grammar: "Ngữ pháp", homework: "Bài tập về nhà",
  pronunciation: "Phát âm", participation: "Phát biểu",
};

const TONE_XEP_LOAI = { "Giỏi": "green", "Khá": "blue", "Trung bình": "orange", "Yếu": "red" };

const so1 = (v) => (Number.isFinite(Number(v)) ? Number(v).toFixed(1) : null);
const ngay = (v) => (v ? new Date(v).toLocaleDateString("vi-VN") : null);
const hoTen = (u) => `${u?.last_name || ""} ${u?.first_name || ""}`.trim() || u?.username || "--";

const chuyenCan = (sc) => {
  const t = Number(sc.attendance_total);
  const c = Number(sc.attendance_present);
  return Number.isFinite(t) && t > 0 && Number.isFinite(c) ? (c / t) * 100 : null;
};

// Các trường tạo nên một hồ sơ dùng được. Dùng chung cho cả thanh đo độ đầy đủ
// lẫn form bổ sung, để hai chỗ không bao giờ lệch nhau.
const TRUONG_HO_SO = [
  { key: "student_code", nhan: "Mã học viên", nhom: "ca_nhan" },
  { key: "date_of_birth", nhan: "Ngày sinh", nhom: "ca_nhan", loai: "date" },
  { key: "gender", nhan: "Giới tính", nhom: "ca_nhan", loai: "select",
    chon: [["male", "Nam"], ["female", "Nữ"], ["other", "Khác"]] },
  { key: "admission_date", nhan: "Ngày nhập học", nhom: "ca_nhan", loai: "date" },
  { key: "phone_number", nhan: "Số điện thoại", nhom: "ca_nhan" },
  { key: "address", nhan: "Địa chỉ", nhom: "ca_nhan" },
  { key: "parent_name", nhan: "Họ tên phụ huynh", nhom: "phu_huynh" },
  { key: "parent_phone", nhan: "SĐT phụ huynh", nhom: "phu_huynh" },
  { key: "parent_email", nhan: "Email phụ huynh", nhom: "phu_huynh", loai: "email" },
  { key: "parent_relationship", nhan: "Quan hệ với học viên", nhom: "phu_huynh" },
  { key: "current_status", nhan: "Tình trạng học vụ", nhom: "hoc_vu", loai: "select", batBuoc: true,
    chon: [["active", "Đang theo học"], ["inactive", "Tạm nghỉ"], ["suspended", "Bảo lưu"],
           ["graduated", "Đã hoàn thành"], ["dropped", "Đã nghỉ"]] },
  { key: "learning_note", nhan: "Ghi chú học vụ", nhom: "hoc_vu", loai: "textarea" },
];

// current_status luôn có giá trị (mặc định "active") nên không tính vào thanh đo
// độ đầy đủ — nếu tính, mọi hồ sơ đều được cộng điểm miễn phí một cách vô nghĩa.
const TRUONG_TINH_DAY_DU = TRUONG_HO_SO.filter((f) => f.key !== "current_status");

const coGiaTri = (v) => v != null && String(v).trim() !== "";

export default function StudentProfile() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [hs, setHs] = useState(null);
  const [bangDiem, setBangDiem] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");
  const [thongBao, setThongBao] = useState("");

  const [moSua, setMoSua] = useState(false);
  const [form, setForm] = useState({});
  const [dangLuu, setDangLuu] = useState(false);
  const [loiLuu, setLoiLuu] = useState("");

  const tai = useCallback(async () => {
    setDangTai(true);
    setLoi("");
    try {
      const chiTiet = await getStudent(studentId);
      setHs(chiTiet);
      // Bảng điểm không có thì hồ sơ vẫn phải mở được — nuốt lỗi riêng phần này.
      const sc = await listMonthlyScorecards({ student: studentId, page_size: 100 }).catch(
        () => ({ results: [] }),
      );
      const ds = Array.isArray(sc?.results) ? sc.results : [];
      ds.sort(
        (a, b) =>
          (b.period_year - a.period_year) || (b.period_month - a.period_month),
      );
      setBangDiem(ds);
    } catch {
      setLoi("Không tải được hồ sơ học viên.");
      setHs(null);
    } finally {
      setDangTai(false);
    }
  }, [studentId]);

  useEffect(() => { tai(); }, [tai]);

  const thieu = useMemo(
    () => (hs ? TRUONG_TINH_DAY_DU.filter((f) => !coGiaTri(hs[f.key])) : []),
    [hs],
  );
  const doDayDu = useMemo(
    () => (hs ? Math.round(((TRUONG_TINH_DAY_DU.length - thieu.length) / TRUONG_TINH_DAY_DU.length) * 100) : 0),
    [hs, thieu],
  );

  const moiNhat = bangDiem[0] || null;
  const truocDo = bangDiem[1] || null;
  const chenh =
    moiNhat && truocDo && Number.isFinite(Number(moiNhat.total_percent)) && Number.isFinite(Number(truocDo.total_percent))
      ? Number(moiNhat.total_percent) - Number(truocDo.total_percent)
      : null;
  const ccTB = useMemo(() => {
    const ds = bangDiem.map(chuyenCan).filter(Number.isFinite);
    return ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : null;
  }, [bangDiem]);

  const moForm = () => {
    setLoiLuu("");
    const f = {};
    TRUONG_HO_SO.forEach((t) => { f[t.key] = hs?.[t.key] ?? ""; });
    setForm(f);
    setMoSua(true);
  };

  const luu = async () => {
    setDangLuu(true);
    setLoiLuu("");
    try {
      // Chỉ gửi những trường thực sự đổi, tránh ghi đè rỗng lên dữ liệu có sẵn.
      const payload = {};
      TRUONG_HO_SO.forEach((t) => {
        const moi = String(form[t.key] ?? "").trim();
        const cu = String(hs?.[t.key] ?? "").trim();
        if (moi !== cu) payload[t.key] = moi === "" ? null : moi;
      });
      if (!Object.keys(payload).length) {
        setMoSua(false);
        return;
      }
      await updateStudent(studentId, payload);
      setMoSua(false);
      setThongBao("Đã cập nhật hồ sơ học viên.");
      await tai();
    } catch (e) {
      const d = e?.response?.data;
      setLoiLuu(
        d && typeof d === "object"
          ? Object.entries(d).map(([k, v]) => `${k}: ${[].concat(v).join(" ")}`).join(" · ")
          : "Không lưu được. Vui lòng thử lại.",
      );
    } finally {
      setDangLuu(false);
    }
  };

  const cotBangDiem = [
    { key: "ky", header: "Kỳ", render: (r) => <b>{r.period_label || `Tháng ${r.period_month}/${r.period_year}`}</b> },
    { key: "lop", header: "Lớp", render: (r) => r.classroom_name || "--" },
    {
      key: "cc", header: "Chuyên cần", align: "center",
      render: (r) => {
        const t = chuyenCan(r);
        return t == null ? "--" : `${r.attendance_present}/${r.attendance_total} (${so1(t)}%)`;
      },
    },
    { key: "kq", header: "Kết quả", align: "right", render: (r) => (so1(r.total_percent) ? `${so1(r.total_percent)}%` : "--") },
    {
      key: "xl", header: "Xếp loại", align: "center",
      render: (r) => (r.grade_label ? <Badge tone={TONE_XEP_LOAI[r.grade_label] || "gray"}>{r.grade_label}</Badge> : "--"),
    },
    { key: "nx", header: "Nhận xét của giáo viên", render: (r) => r.teacher_comment || <span className="muted">--</span> },
  ];

  if (dangTai) {
    return <Page className="v4page"><p className="small muted">Đang tải hồ sơ...</p></Page>;
  }
  if (loi || !hs) {
    return (
      <Page className="v4page">
        <EmptyState icon="⚠️" title={loi || "Không tìm thấy học viên"}
                    action={<Button onClick={() => navigate("/students")}>Về danh sách học viên</Button>} />
      </Page>
    );
  }

  const ten = hoTen(hs.user);
  const tinhTrang = hs.current_status;

  return (
    <Page className="v4page">
      <PageHeader
        crumbs={[{ label: "Tổng quan", to: "/" }, { label: "Học sinh - Lớp học", to: "/students" }, { label: ten }]}
        title={ten}
        description={`${hs.classroom?.class_code || hs.classroom?.name || "Chưa xếp lớp"}${hs.classroom?.program_name ? ` · ${hs.classroom.program_name}` : ""}`}
        actions={<Button variant="primary" onClick={moForm}>Bổ sung hồ sơ</Button>}
      />

      {thongBao ? (
        <div className="alert green" role="status" style={{ marginBottom: 14 }}>
          <span>✅</span><div style={{ flex: 1 }}>{thongBao}</div>
          <button type="button" className="btn ghost sm" onClick={() => setThongBao("")}>Đóng</button>
        </div>
      ) : null}

      <KpiGrid cols={4}>
        <Kpi ico="📊" icoClass="orange" label="Kết quả gần nhất"
             value={moiNhat && so1(moiNhat.total_percent) ? `${so1(moiNhat.total_percent)}%` : "--"}
             sub={moiNhat ? moiNhat.period_label : "chưa có bảng điểm"} />
        <Kpi ico="📈" icoClass={chenh == null ? "orange" : chenh >= 0 ? "green" : "red"} label="So với kỳ trước"
             value={chenh == null ? "--" : `${chenh > 0 ? "+" : ""}${chenh.toFixed(1)}`}
             sub={truocDo ? truocDo.period_label : "chưa có kỳ trước để so"} />
        <Kpi ico="🗓️" icoClass="yellow" label="Chuyên cần trung bình"
             value={so1(ccTB) ? `${so1(ccTB)}%` : "--"}
             sub={`trên ${bangDiem.length} kỳ có bảng điểm`} />
        <Kpi ico="📋" icoClass={doDayDu >= 80 ? "green" : "red"} label="Độ đầy đủ hồ sơ"
             value={`${doDayDu}%`}
             sub={thieu.length ? `thiếu ${thieu.length} thông tin` : "đã đủ thông tin"} />
      </KpiGrid>

      <Card title="Kết quả học tập theo tháng">
        <DataTable
          columns={cotBangDiem}
          rows={bangDiem}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(`/phieu-bao-cao/${r.id}`)}
          empty="Chưa có bảng điểm nào cho học viên này."
          minWidth={860}
        />
        {bangDiem.length ? (
          <p className="small muted" style={{ marginTop: 10 }}>
            Bấm vào một kỳ để mở phiếu báo cáo gửi phụ huynh.
          </p>
        ) : null}
      </Card>

      <div className="sp-2col">
        <Card title="Thông tin học viên">
          <dl className="sp-dl">
            <div><dt>Họ và tên</dt><dd>{ten}</dd></div>
            <div><dt>Tình trạng</dt>
              <dd><Badge tone={TONE_TINH_TRANG[tinhTrang] || "gray"}>{NHAN_TINH_TRANG[tinhTrang] || tinhTrang || "--"}</Badge></dd></div>
            <div><dt>Lớp</dt><dd>{hs.classroom?.class_code || hs.classroom?.name || "Chưa xếp lớp"}</dd></div>
            <div><dt>Chương trình</dt><dd>{hs.classroom?.program_name || "--"}</dd></div>
            {TRUONG_HO_SO.filter((f) => f.nhom === "ca_nhan" && coGiaTri(hs[f.key])).map((f) => (
              <div key={f.key}>
                <dt>{f.nhan}</dt>
                <dd>{f.loai === "date" ? ngay(hs[f.key]) : f.loai === "select"
                  ? (f.chon.find(([v]) => v === hs[f.key])?.[1] || hs[f.key]) : hs[f.key]}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card title="Phụ huynh & liên hệ">
          {TRUONG_HO_SO.some((f) => f.nhom === "phu_huynh" && coGiaTri(hs[f.key])) ? (
            <dl className="sp-dl">
              {TRUONG_HO_SO.filter((f) => f.nhom === "phu_huynh" && coGiaTri(hs[f.key])).map((f) => (
                <div key={f.key}><dt>{f.nhan}</dt><dd>{hs[f.key]}</dd></div>
              ))}
            </dl>
          ) : (
            <EmptyState
              icon="👪"
              title="Chưa có thông tin phụ huynh"
              hint="Trung tâm trao đổi kết quả học tập qua phụ huynh, nên đây là thông tin cần nhất."
              action={<Button variant="primary" size="sm" onClick={moForm}>Bổ sung ngay</Button>}
            />
          )}
        </Card>
      </div>

      {/* Điểm theo kỹ năng của kỳ gần nhất: score_components là dict tự do do
          giáo viên chấm (listening/speaking/reading/writing/...), nên duyệt động
          chứ không cứng danh sách kỹ năng. */}
      {moiNhat && moiNhat.score_components && Object.keys(moiNhat.score_components).length ? (
        <Card title={`Điểm theo kỹ năng — ${moiNhat.period_label || "kỳ gần nhất"}`}>
          <div className="sp-skills">
            {Object.entries(moiNhat.score_components).map(([ten, diem]) => {
              const v = Number(diem);
              const pt = Number.isFinite(v) ? Math.max(0, Math.min(100, (v / 10) * 100)) : 0;
              return (
                <div className="sp-skill" key={ten}>
                  <span className="sp-skill__name">{NHAN_KY_NANG[ten] || ten}</span>
                  <span className="sp-skill__track">
                    <span className="sp-skill__bar" style={{ width: `${pt}%` }} />
                  </span>
                  <span className="sp-skill__val">{Number.isFinite(v) ? v : "--"}</span>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <div className="sp-2col">
        <Card title="Lịch sử lớp học">
          {hs.enrollments?.length ? (
            <DataTable
              columns={[
                { key: "lop", header: "Lớp", render: (r) => <b>{r.classroom_code || r.classroom_name}</b> },
                { key: "tu", header: "Từ ngày", render: (r) => ngay(r.enrolled_at) || "--" },
                { key: "den", header: "Đến ngày", render: (r) => ngay(r.ended_at) || "đang học" },
                { key: "tt", header: "Trạng thái", align: "center", render: (r) => r.enrollment_status || "--" },
              ]}
              rows={hs.enrollments}
              rowKey={(r) => r.id}
              minWidth={420}
            />
          ) : (
            <EmptyState icon="🏫" title="Chưa có lịch sử chuyển lớp"
                        hint={`Học viên đang ở lớp ${hs.classroom?.class_code || hs.classroom?.name || "--"}.`} />
          )}
        </Card>

        <Card title="Người giám hộ">
          {hs.guardians?.length ? (
            <dl className="sp-dl">
              {hs.guardians.map((g) => (
                <div key={g.id}>
                  <dt>{g.full_name}{g.is_primary_contact ? " ★" : ""}</dt>
                  <dd>{[g.relationship, g.phone_number, g.email].filter(Boolean).join(" · ") || "--"}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <EmptyState icon="🧑‍🤝‍🧑" title="Chưa khai báo người giám hộ"
                        hint="Dùng khi học viên có nhiều người liên hệ (bố, mẹ, ông bà)." />
          )}
        </Card>
      </div>

      <Card title="Ghi chú học vụ" action={<Button variant="ghost" size="sm" onClick={moForm}>Sửa</Button>}>
        {coGiaTri(hs.learning_note)
          ? <p style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{hs.learning_note}</p>
          : <p className="small muted">Chưa có ghi chú. Dùng để lưu tình hình học tập, trao đổi với phụ huynh, lưu ý riêng của em.</p>}
      </Card>

      {thieu.length ? (
        <Card title={`Còn thiếu ${thieu.length} thông tin`}
              action={<Button variant="ghost" size="sm" onClick={moForm}>Bổ sung</Button>}>
          <div className="sp-missing">
            {thieu.map((f) => <span className="sp-chip" key={f.key}>{f.nhan}</span>)}
          </div>
        </Card>
      ) : null}

      <Modal
        open={moSua}
        onClose={() => setMoSua(false)}
        title="Bổ sung hồ sơ học viên"
        subtitle={ten}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setMoSua(false)}>Đóng</Button>
            <Button variant="primary" onClick={luu} loading={dangLuu} loadingText="Đang lưu...">Lưu</Button>
          </>
        }
      >
        {loiLuu ? <div className="alert red" style={{ marginBottom: 12 }}>{loiLuu}</div> : null}
        <div className="ui-form-grid">
          {TRUONG_HO_SO.map((f) => (
            <Field key={f.key} label={f.nhan}>
              {f.loai === "textarea" ? (
                <textarea
                  rows={3}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                />
              ) : f.loai === "select" ? (
                <select value={form[f.key] ?? ""} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}>
                  <option value="">-- chọn --</option>
                  {f.chon.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ) : (
                <input
                  type={f.loai === "date" ? "date" : f.loai === "email" ? "email" : "text"}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                />
              )}
            </Field>
          ))}
        </div>
      </Modal>
    </Page>
  );
}
