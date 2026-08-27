/**
 * KHUNG THI ĐUA — bảng tiêu chí dùng để chấm điểm thi đua tháng.
 *
 * Hai vai, một màn:
 * - Giáo viên / nhân viên: XEM để biết tháng này bị chấm theo tiêu chí nào,
 *   mỗi mục bao nhiêu điểm, cộng trừ ra sao.
 * - Admin / super admin: bấm "Sửa khung" để thêm, đổi tên, đổi điểm, bỏ mục.
 *
 * Khung này dùng CHUNG cho mọi tháng — sửa là áp dụng từ lần chấm sau. Phiếu đã
 * chấm giữ nguyên số cũ vì backend không bao giờ xoá cứng mục đã có điểm, chỉ
 * tắt nó đi (xem /kpi-frame/bulk-save/).
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  layKhungKpiDayDu,
  luuKhungKpi,
  taoKhungMacDinh,
} from "../../services/kpiService";

const laSo = (x) => x !== null && x !== undefined && x !== "" && !Number.isNaN(Number(x));
const g1 = (x) => {
  const n = Math.round(Number(x) * 10) / 10;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
};

/** Gỡ câu lỗi DRF trả về (chuỗi, mảng, {detail}, hoặc {field: [...]}). */
function thongDiepLoi(e, macDinh) {
  const d = e?.response?.data;
  if (typeof d === "string" && d && !d.startsWith("<")) return d;
  if (Array.isArray(d) && d.length) return String(d[0]);
  if (d?.detail) return String(d.detail);
  if (d && typeof d === "object") {
    const dau = Object.values(d)[0];
    if (Array.isArray(dau) && dau.length) return String(dau[0]);
    if (typeof dau === "string") return dau;
  }
  return macDinh;
}

/* Khoá tạm cho mục mới thêm — chưa có id từ máy chủ nên cần một khoá ổn định
   để React không remount cả danh sách mỗi lần gõ. Dùng bộ đếm chứ không dùng
   chỉ số mảng: xoá một dòng ở giữa là mọi dòng sau đổi khoá. */
let dem = 0;
const khoaMoi = () => `moi-${(dem += 1)}`;

export default function KpiFrameBoard({ suaDuoc = false, onNotice }) {
  const [nhom, setNhom] = useState([]);
  const [quyTac, setQuyTac] = useState([]);
  const [boNhom, setBoNhom] = useState([]);
  const [boTieuChi, setBoTieuChi] = useState([]);
  const [boQuyTac, setBoQuyTac] = useState([]);

  const [dangSua, setDangSua] = useState(false);
  const [dangTai, setDangTai] = useState(true);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState("");

  const tai = useCallback(async () => {
    setDangTai(true);
    try {
      const kq = await layKhungKpiDayDu();
      // Chỉ dựng mục CÒN BẬT: mục đã tắt là dấu vết của khung cũ, bày ra thì
      // người dùng tưởng vẫn đang chấm theo nó.
      setNhom(
        (kq.groups || [])
          .filter((g) => g.is_active !== false)
          .map((g) => ({
            ...g,
            _k: `g${g.id}`,
            criteria: (g.criteria || [])
              .filter((c) => c.is_active !== false)
              .map((c) => ({ ...c, _k: `c${c.id}` })),
          })),
      );
      setQuyTac((kq.rules || []).filter((r) => r.is_active !== false).map((r) => ({ ...r, _k: `r${r.id}` })));
      setLoi("");
    } catch (e) {
      setLoi(thongDiepLoi(e, "Không tải được khung thi đua."));
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => { tai(); }, [tai]);

  /* Tổng điểm cộng từ TIÊU CHÍ, không lấy ô "điểm nhóm" người dùng gõ — hai con
     số đó lệch nhau được, và điểm thật chấm theo tiêu chí. */
  const tong = useMemo(
    () => nhom.reduce((t, g) => t + (g.criteria || []).reduce((x, c) => x + (Number(c.max_score) || 0), 0), 0),
    [nhom],
  );
  const tongNhom = (g) => (g.criteria || []).reduce((x, c) => x + (Number(c.max_score) || 0), 0);

  /* ------------------------------------------------------------ sửa khung */

  const doiNhom = (k, patch) =>
    setNhom((cu) => cu.map((g) => (g._k === k ? { ...g, ...patch } : g)));

  const doiTieuChi = (kg, kc, patch) =>
    setNhom((cu) =>
      cu.map((g) =>
        g._k === kg
          ? { ...g, criteria: g.criteria.map((c) => (c._k === kc ? { ...c, ...patch } : c)) }
          : g,
      ),
    );

  const themNhom = () =>
    setNhom((cu) => [...cu, { _k: khoaMoi(), name: "", icon: "", max_score: 0, criteria: [] }]);

  const xoaNhom = (k) => {
    const g = nhom.find((x) => x._k === k);
    if (g?.id) setBoNhom((cu) => [...cu, g.id]);
    setNhom((cu) => cu.filter((x) => x._k !== k));
  };

  const themTieuChi = (kg) =>
    setNhom((cu) =>
      cu.map((g) =>
        g._k === kg
          ? { ...g, criteria: [...g.criteria, { _k: khoaMoi(), title: "", description: "", max_score: 0 }] }
          : g,
      ),
    );

  const xoaTieuChi = (kg, kc) => {
    const c = nhom.find((g) => g._k === kg)?.criteria.find((x) => x._k === kc);
    if (c?.id) setBoTieuChi((cu) => [...cu, c.id]);
    setNhom((cu) =>
      cu.map((g) => (g._k === kg ? { ...g, criteria: g.criteria.filter((x) => x._k !== kc) } : g)),
    );
  };

  const doiQuyTac = (k, patch) =>
    setQuyTac((cu) => cu.map((r) => (r._k === k ? { ...r, ...patch } : r)));

  const themQuyTac = (kind) =>
    setQuyTac((cu) => [...cu, { _k: khoaMoi(), kind, title: "", formula: "", cap: 0 }]);

  const xoaQuyTac = (k) => {
    const r = quyTac.find((x) => x._k === k);
    if (r?.id) setBoQuyTac((cu) => [...cu, r.id]);
    setQuyTac((cu) => cu.filter((x) => x._k !== k));
  };

  const huySua = () => {
    setBoNhom([]); setBoTieuChi([]); setBoQuyTac([]);
    setDangSua(false);
    tai();
  };

  const luu = async () => {
    setDangLuu(true);
    setLoi("");
    try {
      const kq = await luuKhungKpi({
        groups: nhom.map((g) => ({
          id: typeof g.id === "number" ? g.id : undefined,
          name: g.name, icon: g.icon || "", max_score: Number(g.max_score) || 0,
          criteria: (g.criteria || []).map((c) => ({
            id: typeof c.id === "number" ? c.id : undefined,
            title: c.title, description: c.description || "",
            max_score: Number(c.max_score) || 0,
          })),
        })),
        adjustment_rules: quyTac.map((r) => ({
          id: typeof r.id === "number" ? r.id : undefined,
          kind: r.kind, title: r.title, formula: r.formula || "", cap: Number(r.cap) || 0,
        })),
        deleted_groups: boNhom,
        deleted_criteria: boTieuChi,
        deleted_rules: boQuyTac,
      });
      setBoNhom([]); setBoTieuChi([]); setBoQuyTac([]);
      setDangSua(false);
      await tai();

      // Mục đã có điểm thì backend chỉ TẮT chứ không xoá — phải nói ra, nếu
      // không người dùng tưởng đã xoá hẳn rồi đi tìm mãi không thấy.
      const tat = kq?.deactivated || {};
      const dsTat = [...(tat.groups || []), ...(tat.criteria || []), ...(tat.rules || [])];
      onNotice?.(
        dsTat.length
          ? `Đã lưu khung thi đua. ${dsTat.length} mục đã từng được chấm nên chỉ gỡ khỏi khung từ nay, phiếu cũ giữ nguyên điểm: ${dsTat.join(", ")}.`
          : "Đã lưu khung thi đua.",
      );
    } catch (e) {
      setLoi(thongDiepLoi(e, "Không lưu được khung thi đua. Kiểm tra lại các ô."));
    } finally {
      setDangLuu(false);
    }
  };

  const napMacDinh = async () => {
    setDangLuu(true);
    setLoi("");
    try {
      await taoKhungMacDinh();
      await tai();
      onNotice?.("Đã nạp khung thi đua mặc định.");
    } catch (e) {
      setLoi(thongDiepLoi(e, "Không nạp được khung mặc định."));
    } finally {
      setDangLuu(false);
    }
  };

  /* ------------------------------------------------------------ hiển thị */

  if (dangTai) return <div className="card"><p className="small muted">Đang tải khung thi đua…</p></div>;

  if (!nhom.length && !dangSua) {
    return (
      <div className="card">
        <p className="small muted" style={{ marginBottom: 10 }}>
          Chưa có khung thi đua nào. {suaDuoc ? "Nạp khung mặc định rồi chỉnh lại cho khớp quy chế của trung tâm." : "Nhờ quản trị viên tạo khung."}
        </p>
        {loi ? <div className="alert red" style={{ marginBottom: 10 }}>{loi}</div> : null}
        {suaDuoc ? (
          <div className="flex" style={{ gap: 8 }}>
            <button type="button" className="btn primary sm" onClick={napMacDinh} disabled={dangLuu}>
              {dangLuu ? "Đang nạp…" : "Nạp khung mặc định"}
            </button>
            <button type="button" className="btn ghost sm" onClick={() => { setDangSua(true); themNhom(); }}>
              Tự tạo từ đầu
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>Khung thi đua</h3>
        <div className="flex" style={{ gap: 8, alignItems: "center" }}>
          <span className="small muted">
            Tổng điểm tiêu chí: <b>{g1(tong)}</b>
            {Math.round(tong) !== 100 ? " (khung chuẩn là 100)" : ""}
          </span>
          {suaDuoc && !dangSua ? (
            <button type="button" className="btn ghost sm" onClick={() => setDangSua(true)}>Sửa khung</button>
          ) : null}
          {dangSua ? (
            <>
              <button type="button" className="btn ghost sm" onClick={huySua} disabled={dangLuu}>Huỷ</button>
              <button type="button" className="btn primary sm" onClick={luu} disabled={dangLuu}>
                {dangLuu ? "Đang lưu…" : "Lưu khung"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {loi ? <div className="alert red" style={{ marginBottom: 10 }}>{loi}</div> : null}

      {!dangSua ? (
        <p className="small muted" style={{ marginBottom: 12 }}>
          Đây là bộ tiêu chí dùng để chấm thi đua tháng. Điểm của bạn ở mỗi mục không vượt quá cột “Điểm tối đa”.
        </p>
      ) : (
        <div className="alert" style={{ marginBottom: 12 }}>
          <span>⚠️</span>
          <div>
            Khung dùng chung cho mọi tháng, sửa xong áp dụng từ lần chấm sau.
            Mục đã từng được chấm sẽ chỉ được gỡ khỏi khung — phiếu cũ giữ nguyên điểm, không mất dữ liệu.
          </div>
        </div>
      )}

      {/* ---------------- Nhóm + tiêu chí ---------------- */}
      {nhom.map((g, iNhom) => (
        <section key={g._k} className="kf-group">
          <div className="kf-group__head">
            {dangSua ? (
              <>
                <span className="kf-no">{iNhom + 1}</span>
                <input
                  className="kf-in kf-in--name"
                  value={g.name || ""}
                  placeholder="Tên nhóm tiêu chí"
                  aria-label={`Tên nhóm ${iNhom + 1}`}
                  onChange={(e) => doiNhom(g._k, { name: e.target.value })}
                />
                <span className="small muted kf-nowrap">Điểm nhóm</span>
                <input
                  className="kf-in kf-in--num" type="number" min="0" step="1"
                  value={g.max_score ?? ""}
                  aria-label={`Điểm nhóm ${g.name || iNhom + 1}`}
                  onChange={(e) => doiNhom(g._k, { max_score: e.target.value })}
                />
                <button type="button" className="btn ghost sm kf-del" onClick={() => xoaNhom(g._k)}>
                  Bỏ nhóm
                </button>
              </>
            ) : (
              <>
                <span className="kf-no">{iNhom + 1}</span>
                <h4>{g.name}</h4>
                <span className="kf-pts">{g1(tongNhom(g))} điểm</span>
              </>
            )}
          </div>

          <div className="tbl-wrap">
            <table className="tbl kf-tbl">
              <thead>
                <tr>
                  <th style={{ width: 52 }}>STT</th>
                  <th>Tiêu chí</th>
                  <th>Cách hiểu / ghi chú</th>
                  <th style={{ width: 104 }} className="t-center">Điểm tối đa</th>
                  {dangSua ? <th style={{ width: 72 }} /> : null}
                </tr>
              </thead>
              <tbody>
                {(g.criteria || []).map((c, iTc) => (
                  <tr key={c._k}>
                    <td className="muted">{iNhom + 1}.{iTc + 1}</td>
                    <td>
                      {dangSua ? (
                        <input className="kf-in" value={c.title || ""} placeholder="Tên tiêu chí"
                               aria-label={`Tên tiêu chí ${iNhom + 1}.${iTc + 1}`}
                               onChange={(e) => doiTieuChi(g._k, c._k, { title: e.target.value })} />
                      ) : (
                        c.title
                      )}
                    </td>
                    <td className="muted">
                      {dangSua ? (
                        <input className="kf-in" value={c.description || ""} placeholder="Không bắt buộc"
                               aria-label={`Ghi chú tiêu chí ${iNhom + 1}.${iTc + 1}`}
                               onChange={(e) => doiTieuChi(g._k, c._k, { description: e.target.value })} />
                      ) : (
                        c.description || "—"
                      )}
                    </td>
                    <td className="t-center">
                      {dangSua ? (
                        <input className="kf-in kf-in--num" type="number" min="0" step="0.5"
                               value={c.max_score ?? ""}
                               aria-label={`Điểm tối đa ${iNhom + 1}.${iTc + 1}`}
                               onChange={(e) => doiTieuChi(g._k, c._k, { max_score: e.target.value })} />
                      ) : (
                        <b>{laSo(c.max_score) ? g1(c.max_score) : "—"}</b>
                      )}
                    </td>
                    {dangSua ? (
                      <td className="t-center">
                        <button type="button" className="btn ghost sm kf-del"
                                aria-label={`Bỏ tiêu chí ${c.title || iTc + 1}`}
                                onClick={() => xoaTieuChi(g._k, c._k)}>✕</button>
                      </td>
                    ) : null}
                  </tr>
                ))}
                {!(g.criteria || []).length ? (
                  <tr><td colSpan={dangSua ? 5 : 4} className="muted">Nhóm này chưa có tiêu chí nào.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {dangSua ? (
            <button type="button" className="btn ghost sm" style={{ marginTop: 8 }}
                    onClick={() => themTieuChi(g._k)}>+ Thêm tiêu chí</button>
          ) : null}
        </section>
      ))}

      {dangSua ? (
        <button type="button" className="btn ghost sm" style={{ marginTop: 4 }} onClick={themNhom}>
          + Thêm nhóm tiêu chí
        </button>
      ) : null}

      {/* ---------------- Điểm cộng / điểm trừ ---------------- */}
      <div className="kf-adj-grid">
        {["bonus", "penalty"].map((loai) => {
          const cong = loai === "bonus";
          const ds = quyTac.filter((r) => r.kind === loai);
          return (
            <section className={`kf-adj ${cong ? "kf-adj--plus" : "kf-adj--minus"}`} key={loai}>
              <h4>{cong ? "ĐIỂM CỘNG" : "ĐIỂM TRỪ"}</h4>
              <div className="tbl-wrap">
                <table className="tbl kf-tbl">
                  <thead>
                    <tr>
                      <th>Hạng mục</th>
                      <th>Cách tính</th>
                      <th style={{ width: 78 }} className="t-center">Trần</th>
                      {dangSua ? <th style={{ width: 60 }} /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {ds.map((r) => (
                      <tr key={r._k}>
                        <td>
                          {dangSua ? (
                            <input className="kf-in" value={r.title || ""} placeholder="Tên hạng mục"
                                   aria-label="Tên hạng mục điểm cộng/trừ"
                                   onChange={(e) => doiQuyTac(r._k, { title: e.target.value })} />
                          ) : r.title}
                        </td>
                        <td className="muted">
                          {dangSua ? (
                            <input className="kf-in" value={r.formula || ""} placeholder="Không bắt buộc"
                                   aria-label="Cách tính"
                                   onChange={(e) => doiQuyTac(r._k, { formula: e.target.value })} />
                          ) : (r.formula || "—")}
                        </td>
                        <td className="t-center">
                          {dangSua ? (
                            <input className="kf-in kf-in--num" type="number" min="0" step="0.5"
                                   value={r.cap ?? ""} aria-label="Trần điểm"
                                   onChange={(e) => doiQuyTac(r._k, { cap: e.target.value })} />
                          ) : (
                            <b>{cong ? "+" : "−"}{g1(r.cap)}</b>
                          )}
                        </td>
                        {dangSua ? (
                          <td className="t-center">
                            <button type="button" className="btn ghost sm kf-del"
                                    aria-label={`Bỏ ${r.title}`}
                                    onClick={() => xoaQuyTac(r._k)}>✕</button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                    {!ds.length ? (
                      <tr><td colSpan={dangSua ? 4 : 3} className="muted">Chưa có hạng mục nào.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {dangSua ? (
                <button type="button" className="btn ghost sm" style={{ marginTop: 8 }}
                        onClick={() => themQuyTac(loai)}>+ Thêm hạng mục</button>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
