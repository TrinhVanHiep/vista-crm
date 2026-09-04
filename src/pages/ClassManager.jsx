import BulkImportModal from "../components/bulk/BulkImportModal";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  listClassroomsAll,
  listClassesOverview,
  createClassroom,
  updateClassroom,
  listCentersAll,
} from "../services/calendarService";
import { CenterField } from "../utils/centerField";
import HocVienTrongLop from "../components/classes/HocVienTrongLop";
import { Button, Field, Modal } from "../ui";
import "../styles/vista4.css";
import "../styles/classManager.css";

// Quản lý lớp học: đổi mã/tên lớp, gán chương trình (kể cả chương trình mới),
// cấp độ, trạng thái — để danh sách lớp khớp với hệ thống và lịch dạy.

const STATUS_OPTIONS = [
  { value: "active", label: "Đang học" },
  { value: "planned", label: "Sắp khai giảng" },
  { value: "completed", label: "Đã kết thúc" },
  { value: "cancelled", label: "Đã huỷ" },
];

const MODE_OPTIONS = [
  { value: "offline", label: "Offline" },
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid" },
];

const statusLabel = (v) => STATUS_OPTIONS.find((s) => s.value === v)?.label || v || "--";

const emptyForm = {
  id: null,
  class_code: "",
  name: "",
  program_name: "",
  level_name: "",
  delivery_mode: "offline",
  status: "active",
  start_date: "",
  expected_end_date: "",
  center_id: "",
};

export default function ClassManager() {
  const [classes, setClasses] = useState([]);
  const [counts, setCounts] = useState(new Map()); // classroomId -> student_count
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState("");
  // "thongtin" | "hocvien" — sửa lớp mà không sửa được danh sách lớp là thiếu
  // đúng nửa việc, nên gộp luôn vào đây thay vì bắt đi vòng qua màn Học sinh.
  const [tabForm, setTabForm] = useState("thongtin");
  const [saving, setSaving] = useState(false);
  const [moNhapExcel, setMoNhapExcel] = useState(false);

  // Gán chương trình hàng loạt
  const [selected, setSelected] = useState(() => new Set());
  const [bulkProgram, setBulkProgram] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  // Không dùng useAutoCenter ở đây: cơ sở đã được điền sẵn khi mở form
  // (openCreate lấy cơ sở duy nhất, openEdit lấy theo lớp).

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      listClassroomsAll(),
      listClassesOverview({}).catch(() => []),
      listCentersAll().catch(() => []),
    ])
      .then(([rows, overview, ctrs]) => {
        if (!active) return;
        setClasses(Array.isArray(rows) ? rows : []);
        const map = new Map();
        (Array.isArray(overview) ? overview : overview?.results || []).forEach((o) => {
          map.set(String(o.id), o.student_count);
        });
        setCounts(map);
        setCenters(Array.isArray(ctrs) ? ctrs : []);
      })
      .catch(() => {
        if (active) setError("Không tải được danh sách lớp.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const programs = useMemo(() => {
    const set = new Set();
    classes.forEach((c) => {
      if (c.program_name?.trim()) set.add(c.program_name.trim());
    });
    return [...set].sort((a, b) => a.localeCompare(b, "vi"));
  }, [classes]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return classes
      .filter((c) => {
        if (programFilter === "__none__") return !c.program_name?.trim();
        if (programFilter) return c.program_name === programFilter;
        return true;
      })
      .filter((c) => {
        if (!q) return true;
        return [c.class_code, c.name, c.program_name, c.level_name]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      })
      .sort((a, b) =>
        String(a.class_code || a.name || "").localeCompare(
          String(b.class_code || b.name || ""),
          "vi",
          { numeric: true },
        ),
      );
  }, [classes, search, programFilter]);

  const noProgramCount = useMemo(
    () => classes.filter((c) => !c.program_name?.trim()).length,
    [classes],
  );

  const openCreate = () => {
    setFormError("");
    setForm({
      ...emptyForm,
      center_id: centers.length ? String(centers[0].id) : "",
    });
    setTabForm("thongtin");
    setIsFormOpen(true);
  };

  const openEdit = (cls) => {
    setFormError("");
    setForm({
      id: cls.id,
      class_code: cls.class_code || "",
      name: cls.name || "",
      program_name: cls.program_name || "",
      level_name: cls.level_name || "",
      delivery_mode: cls.delivery_mode || "offline",
      status: cls.status || "active",
      start_date: cls.start_date || "",
      expected_end_date: cls.expected_end_date || "",
      center_id: cls.center?.id ? String(cls.center.id) : "",
    });
    setTabForm("thongtin");
    setIsFormOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!form.name.trim()) {
      setFormError("Vui lòng nhập tên lớp.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        class_code: form.class_code.trim() || null,
        name: form.name.trim(),
        program_name: form.program_name.trim() || null,
        level_name: form.level_name.trim() || null,
        delivery_mode: form.delivery_mode,
        status: form.status,
        start_date: form.start_date || null,
        expected_end_date: form.expected_end_date || null,
      };
      if (form.center_id) payload.center_id = Number(form.center_id);
      if (form.id) {
        await updateClassroom(form.id, payload);
        setNotice(`Đã cập nhật lớp ${payload.class_code || payload.name}.`);
      } else {
        await createClassroom(payload);
        setNotice(`Đã tạo lớp ${payload.class_code || payload.name}.`);
      }
      setIsFormOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      const data = err?.response?.data;
      const detail =
        data?.class_code?.[0] ||
        data?.name?.[0] ||
        data?.detail ||
        "Không lưu được lớp. Vui lòng kiểm tra lại thông tin.";
      setFormError(detail);
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) =>
      prev.size === visible.length ? new Set() : new Set(visible.map((c) => String(c.id))),
    );
  };

  // Gán 1 chương trình cho nhiều lớp cùng lúc — đây là cách "lên chương trình mới":
  // gõ tên chương trình chưa có rồi gán cho các lớp thuộc chương trình đó.
  const handleBulkProgram = async () => {
    const name = bulkProgram.trim();
    if (!name || !selected.size) return;
    setBulkSaving(true);
    setNotice("");
    setError("");
    try {
      const ids = [...selected];
      const results = await Promise.allSettled(
        ids.map((id) => updateClassroom(id, { program_name: name })),
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;
      setNotice(
        `Đã gán chương trình "${name}" cho ${ok} lớp.` +
          (fail ? ` (${fail} lớp không cập nhật được)` : ""),
      );
      setSelected(new Set());
      setBulkProgram("");
      setReloadKey((k) => k + 1);
    } catch {
      setError("Không gán được chương trình. Vui lòng thử lại.");
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="v4page">
      <div className="content-col">
        <div className="page-head">
          <div className="crumb">
            <Link to="/students">Học sinh - Lớp học</Link>
            {" / "}
            <span>Quản lý lớp học</span>
          </div>
          <h1 style={{ marginTop: 8 }}>Quản lý lớp học</h1>
          <p>Đổi mã/tên lớp, gán chương trình và cấp độ để khớp với hệ thống và lịch dạy.</p>
        </div>

        {/* KPI */}
        <div className="kpi-grid cols-4" style={{ marginBottom: 14 }}>
          <div className="kpi">
            <div className="kpi-label">Tổng số lớp</div>
            <div className="kpi-value">{classes.length}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Số chương trình</div>
            <div className="kpi-value">{programs.length}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Lớp chưa gán chương trình</div>
            <div className="kpi-value">{noProgramCount}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Đang chọn</div>
            <div className="kpi-value">{selected.size}</div>
          </div>
        </div>

        {notice ? (
          <div className="card" style={{ padding: "10px 14px", marginBottom: 12 }}>{notice}</div>
        ) : null}
        {error ? (
          <div className="card" style={{ padding: "10px 14px", marginBottom: 12, color: "#c0392b" }}>
            {error}
          </div>
        ) : null}

        {/* Thanh công cụ */}
        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="search"
              placeholder="Tìm theo mã lớp, tên lớp, chương trình..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: "1 1 260px", minWidth: 200, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)" }}
            />
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8 }}
            >
              <option value="">Tất cả chương trình</option>
              {programs.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
              <option value="__none__">— Chưa gán chương trình —</option>
            </select>
            <button type="button" className="btn ghost" onClick={() => setMoNhapExcel(true)}>
              📥 Nhập Excel
            </button>
            <button type="button" className="btn primary" onClick={openCreate}>
              + Thêm lớp
            </button>
          </div>

          {/* Gán chương trình hàng loạt */}
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid var(--border-soft, #F0E6DA)",
            }}
          >
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--muted)" }}>
              Gán chương trình cho {selected.size} lớp đã chọn:
            </span>
            <input
              list="program-options"
              placeholder="Chọn hoặc gõ tên chương trình mới"
              value={bulkProgram}
              onChange={(e) => setBulkProgram(e.target.value)}
              style={{ flex: "1 1 240px", minWidth: 200, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)" }}
            />
            <datalist id="program-options">
              {programs.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <button
              type="button"
              className="btn ghost sm"
              disabled={!selected.size || !bulkProgram.trim() || bulkSaving}
              onClick={handleBulkProgram}
            >
              {bulkSaving ? "Đang gán..." : "Gán chương trình"}
            </button>
          </div>
        </div>

        {/* Bảng lớp */}
        <div className="card" style={{ padding: 0 }}>
          <div className="tbl-wrap">
            <table className="tbl" style={{ minWidth: 900, width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: 38 }}>
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả"
                      checked={visible.length > 0 && selected.size === visible.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>Mã lớp</th>
                  <th>Tên lớp</th>
                  <th>Chương trình</th>
                  <th>Cấp độ</th>
                  <th className="t-center">Sĩ số</th>
                  <th>Trạng thái</th>
                  <th className="t-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: 20 }}>Đang tải danh sách lớp...</td></tr>
                ) : visible.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 20 }}>Không có lớp nào khớp bộ lọc.</td></tr>
                ) : (
                  visible.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Chọn lớp ${c.class_code || c.name}`}
                          checked={selected.has(String(c.id))}
                          onChange={() => toggleSelect(c.id)}
                        />
                      </td>
                      <td><strong>{c.class_code || "--"}</strong></td>
                      <td>{c.name || "--"}</td>
                      <td>
                        {c.program_name?.trim() ? (
                          c.program_name
                        ) : (
                          <span style={{ color: "#c0392b" }}>Chưa gán</span>
                        )}
                      </td>
                      <td>{c.level_name || "--"}</td>
                      <td className="t-center">{counts.get(String(c.id)) ?? "--"}</td>
                      <td>{statusLabel(c.status)}</td>
                      <td className="t-center">
                        <button type="button" className="btn ghost sm" onClick={() => openEdit(c)}>
                          Sửa
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal thêm/sửa lớp */}
      <Modal
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={form.id ? "Sửa lớp học" : "Thêm lớp học"}
        subtitle={form.id ? `${form.class_code || ""} ${form.name || ""}`.trim() : "Điền thông tin lớp mới"}
        size="lg"
        footer={
          tabForm === "thongtin" ? (
            <>
              <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Đóng</Button>
              <Button type="submit" form="form-lop" variant="primary" loading={saving} loadingText="Đang lưu...">
                {form.id ? "Lưu thay đổi" : "Tạo lớp"}
              </Button>
            </>
          ) : (
            <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Đóng</Button>
          )
        }
      >
        {/* Lớp chưa tạo thì chưa có gì để xếp học viên vào — chỉ hiện tab khi sửa. */}
        {form.id ? (
          <div className="cls-tabs" role="tablist">
            <button
              type="button" role="tab" aria-selected={tabForm === "thongtin"}
              className={tabForm === "thongtin" ? "is-active" : ""}
              onClick={() => setTabForm("thongtin")}
            >
              Thông tin lớp
            </button>
            <button
              type="button" role="tab" aria-selected={tabForm === "hocvien"}
              className={tabForm === "hocvien" ? "is-active" : ""}
              onClick={() => setTabForm("hocvien")}
            >
              Học viên trong lớp
            </button>
          </div>
        ) : null}

        {tabForm === "hocvien" && form.id ? (
          <HocVienTrongLop
            lopId={form.id}
            tenLop={form.class_code || form.name}
            onNotice={(t) => { setFormError(""); setNotice(t); setReloadKey((k) => k + 1); }}
          />
        ) : (
          <form id="form-lop" onSubmit={handleSave}>
            <div className="cls-form">
              <Field label="Mã lớp">
                <input
                  value={form.class_code}
                  onChange={(e) => setForm((p) => ({ ...p, class_code: e.target.value }))}
                  placeholder="VD: V701"
                  maxLength={50}
                />
              </Field>
              <Field label="Tên lớp" required>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="VD: Lớp 701"
                  maxLength={255}
                  required
                />
              </Field>
              <Field label="Chương trình" hint="Tên này in trên phiếu báo cáo gửi phụ huynh.">
                <input
                  list="program-options"
                  value={form.program_name}
                  onChange={(e) => setForm((p) => ({ ...p, program_name: e.target.value }))}
                  placeholder="Chọn hoặc gõ chương trình mới"
                  maxLength={255}
                />
              </Field>
              <Field label="Cấp độ">
                <input
                  value={form.level_name}
                  onChange={(e) => setForm((p) => ({ ...p, level_name: e.target.value }))}
                  placeholder="VD: Khối 8"
                  maxLength={255}
                />
              </Field>
              <Field label="Cơ sở">
                <CenterField
                  centers={centers}
                  value={form.center_id}
                  onChange={(e) => setForm((p) => ({ ...p, center_id: e.target.value }))}
                  placeholder="-- Chọn cơ sở --"
                />
              </Field>
              <Field label="Hình thức">
                <select
                  value={form.delivery_mode}
                  onChange={(e) => setForm((p) => ({ ...p, delivery_mode: e.target.value }))}
                >
                  {MODE_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Trạng thái">
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Ngày bắt đầu">
                <input
                  type="date"
                  value={form.start_date || ""}
                  onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                />
              </Field>
              <Field label="Dự kiến kết thúc">
                <input
                  type="date"
                  value={form.expected_end_date || ""}
                  onChange={(e) => setForm((p) => ({ ...p, expected_end_date: e.target.value }))}
                />
              </Field>
            </div>

            {formError ? (
              <div className="alert red" style={{ marginTop: 12 }}><span>⚠️</span><div>{formError}</div></div>
            ) : null}
          </form>
        )}
      </Modal>

      <BulkImportModal
        loai="lop"
        open={moNhapExcel}
        onClose={() => setMoNhapExcel(false)}
        onXong={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
