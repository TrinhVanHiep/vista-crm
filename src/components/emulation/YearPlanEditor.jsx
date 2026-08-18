import { useMemo, useState } from "react";
import apiClient from "../../services/apiClient";
import { Button, Field, Modal } from "../../ui";

/**
 * Form chỉnh sửa kế hoạch năm — MỘT chỗ duy nhất cho mọi thứ.
 *
 * Trước đây mỗi thứ một hộp thoại riêng (phần đầu, mục tiêu, tiến độ, đầu việc),
 * muốn sửa vài chỗ phải mở đóng bốn lần và mỗi lần một lần gọi API. Gom lại thành
 * một form có các mục, sửa thoải mái rồi bấm Lưu một lần — backend ghi trong một
 * transaction nên hoặc vào hết hoặc không gì cả.
 */

const NHAN_TRANG_THAI = {
  hoan_thanh: "Hoàn thành",
  dang_thuc_hien: "Đang thực hiện",
  dung_tien_do: "Đúng tiến độ",
  cham_tien_do: "Chậm tiến độ",
  chua_bat_dau: "Chưa bắt đầu",
};

const nhanThang = (m, y) => `${String(m).padStart(2, "0")}/${y}`;

const MUC = [
  { ma: "chung", ten: "Thông tin chung" },
  { ma: "muctieu", ten: "Mục tiêu tổng quát" },
  { ma: "tiendo", ten: "Tiến độ theo tháng" },
  { ma: "dauviec", ten: "Đầu việc theo tháng" },
];

export default function YearPlanEditor({ kh, cacThang, onXong, onDong }) {
  const [muc, setMuc] = useState("chung");
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState("");

  const [chung, setChung] = useState({
    title: kh.title || "",
    year_label: kh.year_label || "",
    overall_progress: kh.overall_progress ?? 0,
  });
  const [mucTieu, setMucTieu] = useState(() => (kh.goals || []).map((g) => ({ ...g })));
  const [tienDo, setTienDo] = useState(() => {
    const m = new Map((kh.month_progress || []).map((p) => [`${p.period_year}-${p.period_month}`, p.progress]));
    return cacThang.map((t) => ({ thang: t.m, nam: t.y, progress: m.get(t.key) ?? 0 }));
  });

  // Đầu việc gom phẳng để sửa; đánh dấu xoá thay vì bỏ khỏi mảng, để bấm Huỷ là
  // mọi thứ về như cũ.
  const [dauViec, setDauViec] = useState(() => {
    const ra = [];
    (kh.tracks || []).forEach((tr) => {
      (tr.months || []).forEach((c) => {
        (c.activities || []).forEach((a) => {
          ra.push({
            id: a.id, track: tr.id, trackTen: tr.name,
            thang: c.period_month, nam: c.period_year,
            title: a.title, status: a.status, xoa: false, moi: false,
          });
        });
      });
    });
    return ra;
  });
  const [thangDangXem, setThangDangXem] = useState(cacThang[0]?.key || "");

  const dauViecTheoThang = useMemo(
    () => dauViec.filter((d) => `${d.nam}-${d.thang}` === thangDangXem),
    [dauViec, thangDangXem],
  );

  const doiDauViec = (idx, patch) =>
    setDauViec((cu) => cu.map((d, i) => (d === dauViecTheoThang[idx] ? { ...d, ...patch } : d)));

  const themDauViec = (trackId) => {
    const [nam, thang] = thangDangXem.split("-").map(Number);
    setDauViec((cu) => [
      ...cu,
      { id: null, track: trackId, thang, nam, title: "", status: "chua_bat_dau", xoa: false, moi: true },
    ]);
  };

  const luuTatCa = async () => {
    setDangLuu(true);
    setLoi("");
    try {
      const payload = {
        ...chung,
        overall_progress: Number(chung.overall_progress) || 0,
        goals: mucTieu.map((g) => ({
          id: g.id, title: g.title, target_value: g.target_value,
          unit: g.unit, note: g.note,
        })),
        month_progress: tienDo.map((t) => ({
          period_month: t.thang, period_year: t.nam, progress: Number(t.progress) || 0,
        })),
        activities: dauViec
          .filter((d) => !d.xoa && d.title.trim())
          .map((d) => ({
            id: d.id, track: d.track, period_month: d.thang, period_year: d.nam,
            title: d.title, status: d.status,
          })),
        deleted_activities: dauViec.filter((d) => d.xoa && d.id).map((d) => d.id),
      };
      const { data } = await apiClient.post(`/school-year-plans/${kh.id}/bulk-save/`, payload);
      onXong(data);
    } catch (e) {
      const d = e?.response?.data;
      setLoi(Array.isArray(d) ? d.join(" ") : d?.detail || "Không lưu được. Vui lòng kiểm tra lại các ô.");
    } finally {
      setDangLuu(false);
    }
  };

  const soThayDoi =
    dauViec.filter((d) => d.xoa || d.moi).length;

  return (
    <Modal
      open
      onClose={onDong}
      title="Chỉnh sửa kế hoạch năm học"
      subtitle={kh.year_label}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onDong}>Huỷ</Button>
          <Button variant="primary" onClick={luuTatCa} loading={dangLuu} loadingText="Đang lưu...">
            Lưu tất cả{soThayDoi ? ` (${soThayDoi} thay đổi đầu việc)` : ""}
          </Button>
        </>
      }
    >
      {loi ? <div className="alert red" style={{ marginBottom: 12 }}>{loi}</div> : null}

      <div className="ype-tabs" role="group" aria-label="Mục chỉnh sửa">
        {MUC.map((m) => (
          <button key={m.ma} type="button"
                  className={muc === m.ma ? "is-active" : ""}
                  aria-pressed={muc === m.ma}
                  onClick={() => setMuc(m.ma)}>
            {m.ten}
          </button>
        ))}
      </div>

      {muc === "chung" ? (
        <div className="ype-grid">
          <Field label="Tên kế hoạch" required>
            <input value={chung.title} onChange={(e) => setChung((c) => ({ ...c, title: e.target.value }))} />
          </Field>
          <Field label="Nhãn năm học" hint="Ví dụ: 2026 - 2027">
            <input value={chung.year_label} onChange={(e) => setChung((c) => ({ ...c, year_label: e.target.value }))} />
          </Field>
          <Field label="Tiến độ tổng thể (%)" hint="Hoặc dùng nút “Tính lại tiến độ” ngoài màn để máy tự tính.">
            <input type="number" min="0" max="100" value={chung.overall_progress}
                   onChange={(e) => setChung((c) => ({ ...c, overall_progress: e.target.value }))} />
          </Field>
        </div>
      ) : null}

      {muc === "muctieu" ? (
        <div className="ype-rows">
          {mucTieu.map((g, i) => (
            <div className="ype-row ype-row--goal" key={g.id}>
              <input value={g.title} aria-label="Tên mục tiêu" placeholder="Tên mục tiêu"
                     onChange={(e) => setMucTieu((c) => c.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
              <input value={g.target_value ?? ""} aria-label="Con số" placeholder="450 / 100% / Số 1"
                     onChange={(e) => setMucTieu((c) => c.map((x, j) => (j === i ? { ...x, target_value: e.target.value } : x)))} />
              <input value={g.unit ?? ""} aria-label="Đơn vị" placeholder="học sinh"
                     onChange={(e) => setMucTieu((c) => c.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)))} />
              <input value={g.note ?? ""} aria-label="Ghi chú" placeholder="Trước 31/03/2027"
                     onChange={(e) => setMucTieu((c) => c.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} />
            </div>
          ))}
        </div>
      ) : null}

      {muc === "tiendo" ? (
        <div className="ype-rows">
          {tienDo.map((t, i) => (
            <div className="ype-row ype-row--prog" key={`${t.nam}-${t.thang}`}>
              <span className="ype-lbl">Tháng {nhanThang(t.thang, t.nam)}</span>
              <input type="number" min="0" max="100" value={t.progress}
                     aria-label={`Tiến độ tháng ${nhanThang(t.thang, t.nam)}`}
                     onChange={(e) => setTienDo((c) => c.map((x, j) => (j === i ? { ...x, progress: e.target.value } : x)))} />
              <span className="ype-unit">%</span>
            </div>
          ))}
        </div>
      ) : null}

      {muc === "dauviec" ? (
        <>
          <Field label="Chọn tháng để sửa">
            <select value={thangDangXem} onChange={(e) => setThangDangXem(e.target.value)}>
              {cacThang.map((t) => (
                <option key={t.key} value={t.key}>Tháng {nhanThang(t.m, t.y)}</option>
              ))}
            </select>
          </Field>
          {(kh.tracks || []).map((tr) => (
            <div className="ype-track" key={tr.id}>
              <div className="ype-track__head">
                <b>{tr.name}</b>
                <Button variant="ghost" size="sm" onClick={() => themDauViec(tr.id)}>+ Thêm việc</Button>
              </div>
              {dauViecTheoThang.filter((d) => d.track === tr.id).map((d, i) => {
                const idx = dauViecTheoThang.indexOf(d);
                return (
                  <div className={`ype-row ype-row--act${d.xoa ? " is-xoa" : ""}`} key={d.id ?? `moi-${i}`}>
                    <input value={d.title} placeholder="Nội dung đầu việc" aria-label="Nội dung đầu việc"
                           onChange={(e) => doiDauViec(idx, { title: e.target.value })} />
                    <select value={d.status} aria-label="Trạng thái"
                            onChange={(e) => doiDauViec(idx, { status: e.target.value })}>
                      {Object.entries(NHAN_TRANG_THAI).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <button type="button" className="ype-del" title={d.xoa ? "Bỏ đánh dấu xoá" : "Xoá"}
                            onClick={() => doiDauViec(idx, { xoa: !d.xoa })}>
                      {d.xoa ? "↩" : "✕"}
                    </button>
                  </div>
                );
              })}
              {!dauViecTheoThang.some((d) => d.track === tr.id) ? (
                <p className="small muted">Tháng này chưa có đầu việc nào.</p>
              ) : null}
            </div>
          ))}
        </>
      ) : null}
    </Modal>
  );
}
