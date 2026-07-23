import { useEffect, useMemo, useRef, useState } from "react";
import {
  listTuitionRecords,
  getTuitionSummary,
  createTuitionRecord,
  importTuitionFile,
} from "../services/calendarService";
import "../styles/vista4.css";

const YEAR = 2026;
const PAGE_SIZE = 20;
const fmtVnd = (n) => `${new Intl.NumberFormat("vi-VN").format(Math.round(Number(n) || 0))}₫`;
const fmtCompact = (n) =>
  new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(Number(n) || 0);

const emptyForm = {
  class_code: "",
  program: "",
  student_name: "",
  phone: "",
  total_fee: "",
  paid_1: "",
  paid_1_at: "",
  paid_2: "",
  paid_2_at: "",
  discount: "",
  note: "",
};

function Kpi({ icon, iconBg, iconColor, label, value, sub }) {
  return (
    <div className="kpi">
      <div className="ico" style={{ background: iconBg, color: iconColor, fontSize: 18 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
        {sub ? <div className="small muted">{sub}</div> : null}
      </div>
    </div>
  );
}

function Modal({ title, onClose, width = 600, children }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(40, 26, 12, 0.42)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "44px 16px",
        overflowY: "auto",
      }}
    >
      <div
        className="card rp-form"
        onClick={(e) => e.stopPropagation()}
        style={{ width, maxWidth: "100%", margin: "auto", boxShadow: "0 24px 60px rgba(40,26,12,0.28)" }}
      >
        <div className="card-head">
          <h3>{title}</h3>
          <button type="button" className="btn ghost" style={{ padding: "5px 10px" }} onClick={onClose} aria-label="Đóng">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Tuition() {
  const [summary, setSummary] = useState({ total_fee: 0, collected: 0, discount: 0, remaining: 0, students: 0, by_class: [] });
  const [records, setRecords] = useState([]);
  const [recordCount, setRecordCount] = useState(0);
  const [classCode, setClassCode] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [modal, setModal] = useState(null); // 'manual' | 'import' | null
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const fileRef = useRef(null);

  // Summary + class list.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getTuitionSummary({ year: YEAR });
        if (active) setSummary(data);
      } catch (error) {
        /* giữ nguyên */
      }
    })();
    return () => { active = false; };
  }, [reloadKey]);

  // Records (filter by class / search).
  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = { year: YEAR, page_size: PAGE_SIZE, page };
    if (search.trim()) params.search = search.trim();
    else if (classCode) params.class_code = classCode;
    (async () => {
      try {
        const data = await listTuitionRecords(params);
        if (!active) return;
        setRecords(Array.isArray(data?.results) ? data.results : []);
        setRecordCount(Number(data?.count) || (data?.results ? data.results.length : 0));
      } catch (error) {
        if (active) setRecords([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [classCode, search, page, reloadKey]);

  const computedRemaining = useMemo(() => {
    const num = (v) => Number(v) || 0;
    const r = num(form.total_fee) - num(form.paid_1) - num(form.paid_2) - num(form.discount);
    return r > 0 ? r : 0;
  }, [form.total_fee, form.paid_1, form.paid_2, form.discount]);

  const handleSave = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!form.student_name.trim()) {
      setFormError("Vui lòng nhập họ tên học sinh.");
      return;
    }
    setSaving(true);
    try {
      const num = (v) => (v === "" || v == null ? 0 : Number(v));
      await createTuitionRecord({
        student_name: form.student_name.trim(),
        phone: form.phone.trim(),
        class_code: form.class_code.trim(),
        program: form.program.trim(),
        total_fee: num(form.total_fee),
        paid_1: num(form.paid_1),
        paid_1_at: form.paid_1_at.trim(),
        paid_2: num(form.paid_2),
        paid_2_at: form.paid_2_at.trim(),
        discount: num(form.discount),
        note: form.note.trim(),
        year: YEAR,
      });
      setNotice("Đã lưu bản ghi học phí.");
      setForm(emptyForm);
      setModal(null);
      setReloadKey((k) => k + 1);
    } catch (error) {
      setFormError(error?.response?.data?.detail || "Không lưu được. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    setImportError("");
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setImportError("Vui lòng chọn file Excel học phí.");
      return;
    }
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("tuition_file", file);
      fd.append("year", String(YEAR));
      const res = await importTuitionFile(fd);
      setNotice(`Đã import ${(res.created || 0) + (res.updated || 0)} bản ghi từ ${res.class_count || 0} lớp.`);
      if (fileRef.current) fileRef.current.value = "";
      setModal(null);
      setReloadKey((k) => k + 1);
    } catch (error) {
      setImportError(error?.response?.data?.detail || "Không import được file. Vui lòng kiểm tra lại.");
    } finally {
      setImporting(false);
    }
  };

  const inputProps = { className: "", style: {} };
  const collectedPct = summary.total_fee ? Math.round((summary.collected / summary.total_fee) * 100) : 0;
  const totalPages = Math.max(1, Math.ceil(recordCount / PAGE_SIZE));
  const startIdx = recordCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIdx = (page - 1) * PAGE_SIZE + records.length;

  return (
    <div className="v4page">
      <div className="content-col">
        <div className="page-head">
          <div className="flex-between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1>Học phí {YEAR}</h1>
              <p>Theo dõi &amp; thu học phí học viên — nhập tay hoặc import từ file Excel</p>
            </div>
            <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn ghost" onClick={() => { setForm(emptyForm); setFormError(""); setModal("manual"); }}>➕ Nhập tay</button>
              <button type="button" className="btn primary" onClick={() => { setImportError(""); setModal("import"); }}>📥 Nhập file Excel</button>
            </div>
          </div>
        </div>

        {notice ? (
          <div className="alert green" style={{ marginBottom: 16 }}>
            {notice}{" "}
            <button type="button" onClick={() => setNotice("")} style={{ border: "none", background: "none", cursor: "pointer", color: "inherit", fontWeight: 800 }} aria-label="Đóng">✕</button>
          </div>
        ) : null}

        <div className="kpi-grid cols-4">
          <Kpi icon="👥" iconBg="#eef2fb" iconColor="#3b82f6" label="Số học sinh" value={summary.students} sub={`${summary.by_class?.length || 0} lớp`} />
          <Kpi icon="💰" iconBg="#e9f7ef" iconColor="#2e9e5b" label="Tổng học phí" value={`${fmtCompact(summary.total_fee)}₫`} sub={fmtVnd(summary.total_fee)} />
          <Kpi icon="✅" iconBg="#e9f7ef" iconColor="#2e9e5b" label="Đã thu" value={`${fmtCompact(summary.collected)}₫`} sub={`${collectedPct}% · ưu đãi ${fmtCompact(summary.discount)}₫`} />
          <Kpi icon="⚠️" iconBg="#fdf2e3" iconColor="#d9822b" label="Còn thiếu" value={`${fmtCompact(summary.remaining)}₫`} sub={fmtVnd(summary.remaining)} />
        </div>

        {modal === "manual" && (
          <Modal title="NHẬP / NỘP HỌC PHÍ" width={640} onClose={() => setModal(null)}>
            <form onSubmit={handleSave}>
              <div className="grid c2">
                <label><span className="field-label">Lớp</span>
                  <input type="text" placeholder="VD: 501, f101" value={form.class_code} onChange={(e) => setForm((p) => ({ ...p, class_code: e.target.value }))} {...inputProps} />
                </label>
                <label><span className="field-label">Chương trình</span>
                  <input type="text" placeholder="VD: finger print 2" value={form.program} onChange={(e) => setForm((p) => ({ ...p, program: e.target.value }))} />
                </label>
                <label><span className="field-label">Họ và tên *</span>
                  <input type="text" placeholder="Họ tên học sinh" value={form.student_name} onChange={(e) => setForm((p) => ({ ...p, student_name: e.target.value }))} />
                </label>
                <label><span className="field-label">Số điện thoại</span>
                  <input type="text" placeholder="SĐT phụ huynh" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                </label>
                <label><span className="field-label">Tổng học phí</span>
                  <input type="number" min="0" placeholder="0" value={form.total_fee} onChange={(e) => setForm((p) => ({ ...p, total_fee: e.target.value }))} />
                </label>
                <label><span className="field-label">Ưu đãi / học bổng</span>
                  <input type="number" min="0" placeholder="0" value={form.discount} onChange={(e) => setForm((p) => ({ ...p, discount: e.target.value }))} />
                </label>
                <label><span className="field-label">Đã đóng lần 1</span>
                  <input type="number" min="0" placeholder="0" value={form.paid_1} onChange={(e) => setForm((p) => ({ ...p, paid_1: e.target.value }))} />
                </label>
                <label><span className="field-label">Ngày / hình thức lần 1</span>
                  <input type="text" placeholder="VD: 15/4 (CK VA)" value={form.paid_1_at} onChange={(e) => setForm((p) => ({ ...p, paid_1_at: e.target.value }))} />
                </label>
                <label><span className="field-label">Đã đóng lần 2</span>
                  <input type="number" min="0" placeholder="0" value={form.paid_2} onChange={(e) => setForm((p) => ({ ...p, paid_2: e.target.value }))} />
                </label>
                <label><span className="field-label">Ngày / hình thức lần 2</span>
                  <input type="text" placeholder="VD: 19/7 (Q THU)" value={form.paid_2_at} onChange={(e) => setForm((p) => ({ ...p, paid_2_at: e.target.value }))} />
                </label>
                <label style={{ gridColumn: "1 / -1" }}><span className="field-label">Ghi chú</span>
                  <input type="text" placeholder="Ghi chú" value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} />
                </label>
              </div>
              <div className="flex-between mt12" style={{ gap: 10 }}>
                <span className="small muted">Còn thiếu (tự tính): <b style={{ color: "var(--danger)" }}>{fmtVnd(computedRemaining)}</b></span>
                <div className="flex" style={{ gap: 8 }}>
                  <button type="button" className="btn ghost" onClick={() => { setForm(emptyForm); setFormError(""); }}>Xóa</button>
                  <button type="submit" className="btn primary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu học phí"}</button>
                </div>
              </div>
              {formError ? <div className="alert red" style={{ marginTop: 10 }}>{formError}</div> : null}
            </form>
          </Modal>
        )}

        {modal === "import" && (
          <Modal title="IMPORT FILE EXCEL HỌC PHÍ" width={560} onClose={() => setModal(null)}>
            <p className="small muted" style={{ marginTop: 0 }}>
              Tải lên file Excel học phí (mỗi sheet là 1 lớp với cột Họ và tên, Tổng tiền, Đã đóng lần 1/2, Còn thiếu…). Hệ thống tự đọc toàn bộ các lớp.
            </p>
            <label><span className="field-label">Chọn file (.xlsx)</span>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" />
            </label>
            {importError ? <div className="alert red" style={{ marginTop: 10 }}>{importError}</div> : null}
            <div className="flex mt16" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="btn primary" disabled={importing} onClick={handleImport}>
                {importing ? "Đang import..." : "📥 Import Excel"}
              </button>
            </div>
            <div className="card-foot" style={{ marginTop: 16 }}>
              <span className="small muted">Import sẽ cập nhật (không nhân đôi) theo Lớp + Họ tên + Năm.</span>
            </div>
          </Modal>
        )}

        {/* Records table */}
        <div className="card">
          <div className="card-head" style={{ flexWrap: "wrap", gap: 10 }}>
            <h3>DANH SÁCH HỌC PHÍ</h3>
            <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
              <select
                value={classCode}
                onChange={(e) => { setClassCode(e.target.value); setSearch(""); setPage(1); }}
                disabled={Boolean(search.trim())}
                style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "#fff", font: "inherit", fontSize: 13 }}
              >
                <option value="">Tất cả lớp</option>
                {(summary.by_class || []).map((c, i) => (
                  <option key={`${c.class_code}-${i}`} value={c.class_code}>{c.class_code || "(chưa gán lớp)"} · {c.program || ""} ({c.students})</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Tìm học sinh…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "#fff", font: "inherit", fontSize: 13, minWidth: 180 }}
              />
            </div>
          </div>
          {loading ? (
            <div className="small muted" style={{ padding: 12 }}>Đang tải danh sách…</div>
          ) : records.length ? (
            <>
              <div className="small muted" style={{ marginBottom: 8 }}>Hiển thị {startIdx}–{endIdx} / {recordCount} bản ghi</div>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Họ và tên</th><th>Lớp</th><th>SĐT</th>
                      <th style={{ textAlign: "right" }}>Tổng HP</th>
                      <th style={{ textAlign: "right" }}>Đã đóng</th>
                      <th style={{ textAlign: "right" }}>Còn thiếu</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id}>
                        <td className="bold">{r.student_name}</td>
                        <td className="muted">{r.class_code}</td>
                        <td className="muted">{r.phone || "--"}</td>
                        <td style={{ textAlign: "right" }}>{fmtVnd(r.total_fee)}</td>
                        <td style={{ textAlign: "right", color: "#2e9e5b", fontWeight: 700 }}>{fmtVnd(r.paid_total)}</td>
                        <td style={{ textAlign: "right", color: Number(r.remaining) > 0 ? "#e03131" : "#2e9e5b", fontWeight: 700 }}>{fmtVnd(r.remaining)}</td>
                        <td className="muted" style={{ maxWidth: 220 }}>
                          {[r.paid_1_at, r.paid_2_at, r.note].filter(Boolean).join(" · ") || "--"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 ? (
                <div className="flex-between mt12" style={{ flexWrap: "wrap", gap: 8 }}>
                  <span className="small muted">Trang {page} / {totalPages}</span>
                  <div className="flex" style={{ gap: 6 }}>
                    <button type="button" className="btn ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹ Trước</button>
                    <button type="button" className="btn ghost" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Sau ›</button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="small muted" style={{ padding: 12 }}>
              Chưa có bản ghi học phí. Nhập tay ở form bên trên hoặc import file Excel.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Tuition;
