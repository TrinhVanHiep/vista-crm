import { useMemo, useState } from "react";
import apiClient from "../../services/apiClient";
import { Button, Field, Modal } from "../../ui";

/**
 * Form nhập thông tin phiếu báo cáo học tập.
 *
 * Nguyên tắc: CHỈ hỏi những gì không lấy được từ nơi khác.
 * - Điểm từng kỹ năng, chuyên cần, nhận xét: giáo viên đã nhập ở màn Bảng điểm
 *   học viên → ở đây chỉ hiện lại để đối chiếu, kèm chỉ dẫn sang đó sửa.
 * - Điểm trung bình, xếp loại, tỉ lệ chuyên cần, tỉ lệ nhiệm vụ, mức tăng so
 *   tháng trước, xếp hạng lớp, số sao: hệ thống TỰ TÍNH, không ai nhập.
 * Hỏi lại những thứ này vừa mất công vừa tạo ra hai nguồn số liệu lệch nhau.
 */

const TRANG_THAI_UNIT = [
  ["done", "Đã học xong"],
  ["current", "Đang học"],
  ["upcoming", "Chưa học"],
];

const MUC = [
  { ma: "capdo", ten: "Cấp độ & nhiệm vụ" },
  { ma: "lotrinh", ten: "Lộ trình học tập" },
  { ma: "mocktest", ten: "Bài kiểm tra thử" },
  { ma: "vinhdanh", ten: "Lên cấp & vinh danh" },
];

const soHoacRong = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

export default function ReportCardEditor({ card, onXong, onDong }) {
  const rd = card.report_detail || {};
  const [muc, setMuc] = useState("capdo");
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState("");

  const [form, setForm] = useState(() => ({
    cefr_current: card.cefr_current || "",
    cefr_target: card.cefr_target || "",
    cefr_progress: card.cefr_progress ?? "",
    task_done: card.task_done ?? "",
    task_total: card.task_total ?? "",
  }));

  const [lotrinh, setLotrinh] = useState(() => {
    const r = card.roadmap || {};
    return {
      sessions_done: r.sessions_done ?? "",
      sessions_total: r.sessions_total ?? "",
      units: Array.isArray(r.units) ? r.units.map((u) => ({ ...u })) : [],
      current_unit: { ...(r.current_unit || { title: "", note: "" }) },
      midterm: { ...(r.midterm || { title: "", note: "" }) },
      checkpoint: { ...(r.checkpoint || { title: "", note: "", badge: "" }) },
    };
  });

  const [mock, setMock] = useState(() => {
    const m = card.mock_test || {};
    return {
      name: m.name || "",
      date: m.date || "",
      rows: Array.isArray(m.rows) ? m.rows.map((r) => ({ ...r })) : [],
      overall: m.overall ?? "",
      overall_label: m.overall_label || "",
      overall_note: m.overall_note || "",
    };
  });

  const [dieuKien, setDieuKien] = useState(() => (card.next_level_requirements || []).join("\n"));
  const [vinhDanh, setVinhDanh] = useState(() => (card.honor || {}).title || "");

  const daCo = useMemo(() => ([
    { nhan: "Điểm từng kỹ năng",
      gt: (rd.skills || []).length ? (rd.skills || []).map((s) => `${s.label} ${s.score}`).join(" · ") : "chưa có",
      nguon: "Bảng điểm học viên" },
    { nhan: "Chuyên cần",
      gt: rd.attendance_percent != null ? `${card.attendance_present}/${card.attendance_total} (${rd.attendance_percent}%)` : "chưa có",
      nguon: "Bảng điểm học viên" },
    { nhan: "Điểm trung bình",
      gt: rd.total_score != null ? `${rd.total_score}/10` : "chưa có", nguon: "tự tính từ các kỹ năng" },
    { nhan: "Xếp loại", gt: card.grade_label || "chưa có", nguon: "tự tính từ điểm trung bình" },
    { nhan: "Mức tăng so tháng trước",
      gt: rd.total_score_delta != null ? `${rd.total_score_delta > 0 ? "+" : ""}${rd.total_score_delta}` : "chưa có kỳ trước",
      nguon: "tự so với phiếu tháng trước" },
    { nhan: "Xếp hạng lớp",
      gt: rd.class_rank ? `${rd.class_rank}/${rd.class_size}` : "chưa có", nguon: "tự so điểm với bạn cùng lớp" },
    { nhan: "Nhận xét, điểm mạnh, định hướng",
      gt: (rd.strengths || []).length ? `${(rd.strengths || []).length} ý` : "chưa có", nguon: "Bảng điểm học viên" },
  ]), [rd, card]);

  const luu = async () => {
    setDangLuu(true);
    setLoi("");
    try {
      const payload = {
        cefr_current: form.cefr_current.trim(),
        cefr_target: form.cefr_target.trim(),
        cefr_progress: soHoacRong(form.cefr_progress),
        task_done: soHoacRong(form.task_done),
        task_total: soHoacRong(form.task_total),
        roadmap: {
          ...lotrinh,
          sessions_done: soHoacRong(lotrinh.sessions_done),
          sessions_total: soHoacRong(lotrinh.sessions_total),
          units: lotrinh.units.filter((u) => (u.code || "").trim() || (u.title || "").trim()),
        },
        mock_test: {
          ...mock,
          overall: soHoacRong(mock.overall),
          rows: mock.rows
            .filter((r) => (r.skill || "").trim())
            .map((r) => ({ ...r, score: soHoacRong(r.score), cambridge: soHoacRong(r.cambridge) })),
        },
        next_level_requirements: dieuKien.split("\n").map((d) => d.trim()).filter(Boolean),
        honor: vinhDanh.trim()
          ? { enabled: true, title: vinhDanh.trim(),
              period: `Tháng ${String(card.period_month).padStart(2, "0")}/${card.period_year}` }
          : {},
      };
      const { data } = await apiClient.patch(`/monthly-scorecards/${card.id}/`, payload);
      onXong(data);
    } catch (e) {
      const d = e?.response?.data;
      setLoi(
        d && typeof d === "object"
          ? Object.entries(d).map(([k, v]) => `${k}: ${[].concat(v).join(" ")}`).join(" · ")
          : "Không lưu được. Vui lòng kiểm tra lại các ô.",
      );
    } finally {
      setDangLuu(false);
    }
  };

  const doiUnit = (i, patch) =>
    setLotrinh((c) => ({ ...c, units: c.units.map((u, j) => (j === i ? { ...u, ...patch } : u)) }));
  const doiMockRow = (i, patch) =>
    setMock((c) => ({ ...c, rows: c.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));

  return (
    <Modal
      open
      onClose={onDong}
      title="Nhập thông tin phiếu báo cáo"
      subtitle={`${card.student_name} — Tháng ${card.period_month}/${card.period_year}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onDong}>Huỷ</Button>
          <Button variant="primary" onClick={luu} loading={dangLuu} loadingText="Đang lưu...">
            Lưu thông tin
          </Button>
        </>
      }
    >
      {loi ? <div className="alert red" style={{ marginBottom: 12 }}>{loi}</div> : null}

      <div className="rce-daco">
        <b>Hệ thống đã có sẵn — không cần nhập lại</b>
        <ul>
          {daCo.map((d) => (
            <li key={d.nhan}><span>{d.nhan}:</span> <b>{d.gt}</b> <i>({d.nguon})</i></li>
          ))}
        </ul>
        <p>Muốn sửa điểm hoặc chuyên cần thì vào màn <b>Bảng điểm học viên</b>.</p>
      </div>

      <div className="ype-tabs" role="group" aria-label="Mục nhập liệu">
        {MUC.map((m) => (
          <button key={m.ma} type="button" className={muc === m.ma ? "is-active" : ""}
                  aria-pressed={muc === m.ma} onClick={() => setMuc(m.ma)}>{m.ten}</button>
        ))}
      </div>

      {muc === "capdo" ? (
        <div className="ype-grid">
          <Field label="Cấp độ hiện tại" hint="Ví dụ: A1 Movers">
            <input value={form.cefr_current}
                   onChange={(e) => setForm((c) => ({ ...c, cefr_current: e.target.value }))} />
          </Field>
          <Field label="Cấp độ mục tiêu" hint="Ví dụ: A2 Flyers">
            <input value={form.cefr_target}
                   onChange={(e) => setForm((c) => ({ ...c, cefr_target: e.target.value }))} />
          </Field>
          <Field label="Tiến độ lên cấp (%)">
            <input type="number" min="0" max="100" value={form.cefr_progress}
                   onChange={(e) => setForm((c) => ({ ...c, cefr_progress: e.target.value }))} />
          </Field>
          <Field label="Nhiệm vụ đã hoàn thành">
            <input type="number" min="0" value={form.task_done}
                   onChange={(e) => setForm((c) => ({ ...c, task_done: e.target.value }))} />
          </Field>
          <Field label="Tổng số nhiệm vụ" hint="Tỉ lệ hoàn thành hệ thống tự tính.">
            <input type="number" min="0" value={form.task_total}
                   onChange={(e) => setForm((c) => ({ ...c, task_total: e.target.value }))} />
          </Field>
        </div>
      ) : null}

      {muc === "lotrinh" ? (
        <>
          <div className="ype-grid">
            <Field label="Số buổi đã học">
              <input type="number" min="0" value={lotrinh.sessions_done}
                     onChange={(e) => setLotrinh((c) => ({ ...c, sessions_done: e.target.value }))} />
            </Field>
            <Field label="Tổng số buổi">
              <input type="number" min="0" value={lotrinh.sessions_total}
                     onChange={(e) => setLotrinh((c) => ({ ...c, sessions_total: e.target.value }))} />
            </Field>
          </div>

          <div className="ype-track__head" style={{ marginTop: 16 }}>
            <b>Các bài học trong tháng</b>
            <Button variant="ghost" size="sm"
                    onClick={() => setLotrinh((c) => ({ ...c, units: [...c.units, { code: "", title: "", state: "upcoming" }] }))}>
              + Thêm bài
            </Button>
          </div>
          {lotrinh.units.map((u, i) => (
            <div className="ype-row ype-row--unit" key={i}>
              <input value={u.code || ""} placeholder="Unit 1" aria-label="Mã bài"
                     onChange={(e) => doiUnit(i, { code: e.target.value })} />
              <input value={u.title || ""} placeholder="At School" aria-label="Tên bài"
                     onChange={(e) => doiUnit(i, { title: e.target.value })} />
              <select value={u.state || "upcoming"} aria-label="Trạng thái"
                      onChange={(e) => doiUnit(i, { state: e.target.value })}>
                {TRANG_THAI_UNIT.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button type="button" className="ype-del" title="Xoá"
                      onClick={() => setLotrinh((c) => ({ ...c, units: c.units.filter((_, j) => j !== i) }))}>✕</button>
            </div>
          ))}
          {!lotrinh.units.length ? <p className="small muted">Chưa có bài học nào.</p> : null}

          <div className="ype-grid" style={{ marginTop: 16 }}>
            <Field label="Đang học — tên bài">
              <input value={lotrinh.current_unit.title || ""}
                     onChange={(e) => setLotrinh((c) => ({ ...c, current_unit: { ...c.current_unit, title: e.target.value } }))} />
            </Field>
            <Field label="Đang học — ghi chú" hint="Ví dụ: Hoàn thành 70% nội dung">
              <input value={lotrinh.current_unit.note || ""}
                     onChange={(e) => setLotrinh((c) => ({ ...c, current_unit: { ...c.current_unit, note: e.target.value } }))} />
            </Field>
            <Field label="Kiểm tra giữa tháng — tên">
              <input value={lotrinh.midterm.title || ""}
                     onChange={(e) => setLotrinh((c) => ({ ...c, midterm: { ...c.midterm, title: e.target.value } }))} />
            </Field>
            <Field label="Kiểm tra giữa tháng — ghi chú">
              <input value={lotrinh.midterm.note || ""}
                     onChange={(e) => setLotrinh((c) => ({ ...c, midterm: { ...c.midterm, note: e.target.value } }))} />
            </Field>
            <Field label="Đánh giá giữa khoá — tên">
              <input value={lotrinh.checkpoint.title || ""}
                     onChange={(e) => setLotrinh((c) => ({ ...c, checkpoint: { ...c.checkpoint, title: e.target.value } }))} />
            </Field>
            <Field label="Đánh giá giữa khoá — nhãn" hint="Ví dụ: Sắp diễn ra">
              <input value={lotrinh.checkpoint.badge || ""}
                     onChange={(e) => setLotrinh((c) => ({ ...c, checkpoint: { ...c.checkpoint, badge: e.target.value } }))} />
            </Field>
          </div>
        </>
      ) : null}

      {muc === "mocktest" ? (
        <>
          <div className="ype-grid">
            <Field label="Tên bài kiểm tra">
              <input value={mock.name} onChange={(e) => setMock((c) => ({ ...c, name: e.target.value }))} />
            </Field>
            <Field label="Ngày kiểm tra" hint="Ví dụ: 18/06/2026">
              <input value={mock.date} onChange={(e) => setMock((c) => ({ ...c, date: e.target.value }))} />
            </Field>
            <Field label="Điểm tổng" hint="Thang 0-10">
              <input type="number" min="0" max="10" step="0.1" value={mock.overall}
                     onChange={(e) => setMock((c) => ({ ...c, overall: e.target.value }))} />
            </Field>
            <Field label="Nhận định" hint="Ví dụ: Rất tốt">
              <input value={mock.overall_label}
                     onChange={(e) => setMock((c) => ({ ...c, overall_label: e.target.value }))} />
            </Field>
            <Field label="Ghi chú" hint="Ví dụ: Sẵn sàng cho kỳ thi A1 Movers">
              <input value={mock.overall_note}
                     onChange={(e) => setMock((c) => ({ ...c, overall_note: e.target.value }))} />
            </Field>
          </div>

          <div className="ype-track__head" style={{ marginTop: 16 }}>
            <b>Điểm từng phần</b>
            <Button variant="ghost" size="sm"
                    onClick={() => setMock((c) => ({ ...c, rows: [...c.rows, { skill: "", score: "", cambridge: "" }] }))}>
              + Thêm phần
            </Button>
          </div>
          {mock.rows.map((r, i) => (
            <div className="ype-row ype-row--mock" key={i}>
              <input value={r.skill || ""} placeholder="Listening" aria-label="Phần thi"
                     onChange={(e) => doiMockRow(i, { skill: e.target.value })} />
              <input type="number" min="0" max="10" step="0.1" value={r.score ?? ""} placeholder="Điểm"
                     aria-label="Điểm" onChange={(e) => doiMockRow(i, { score: e.target.value })} />
              <input type="number" value={r.cambridge ?? ""} placeholder="Cambridge"
                     aria-label="Điểm Cambridge" onChange={(e) => doiMockRow(i, { cambridge: e.target.value })} />
              <button type="button" className="ype-del" title="Xoá"
                      onClick={() => setMock((c) => ({ ...c, rows: c.rows.filter((_, j) => j !== i) }))}>✕</button>
            </div>
          ))}
          {!mock.rows.length ? <p className="small muted">Chưa có phần thi nào.</p> : null}
        </>
      ) : null}

      {muc === "vinhdanh" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Điều kiện để lên cấp tiếp theo" hint="Mỗi ý một dòng.">
            <textarea rows={5} value={dieuKien} onChange={(e) => setDieuKien(e.target.value)}
                      placeholder={"Mở rộng vốn từ vựng & cấu trúc ngữ pháp\nTăng độ chính xác khi nói & viết"} />
          </Field>
          <Field label="Vinh danh tháng này" hint="Để trống nếu tháng này em không được vinh danh.">
            <input value={vinhDanh} onChange={(e) => setVinhDanh(e.target.value)}
                   placeholder="Học viên chăm chỉ & tiến bộ vượt bậc" />
          </Field>
        </div>
      ) : null}
    </Modal>
  );
}
