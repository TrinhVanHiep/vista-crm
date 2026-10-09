import { useEffect, useMemo, useState } from "react";
import { loiApi } from "../../services/financeService";
import { listStudents, listTeachers } from "../../services/calendarService";
import {
  duyetCong, duyetDiemDanhHs, ganNguoiMay, layCongChoDuyet, layDiemDanhHsChoDuyet, layNguoiTrenMay,
  layNhanSuChuaCoLuong, nhapDiemDanhHs, taiMauDiemDanhHs,
} from "../../services/payrollService";
import { Button, Card, CardHead, Table } from "./v3/ui";
import { color } from "./v3/theme";

/**
 * Nối máy chấm công vào bảng lương (08/10/2026).
 *
 *  - GanNguoiChamCong: máy gửi mã nhân viên + tên KHÔNG DẤU; ở đây gán mỗi mã
 *    với giáo viên / nhân sự / học sinh trên CRM. Gán xong mọi lượt cũ của mã đó
 *    được nối lại, lượt mới tự khớp. Chưa gán = bảng lương không thấy lượt nào.
 *  - DuyetCongBoSung: file chấm công chỉ bổ sung ngày máy lỗi / mất điện, phải
 *    được quản lý hoặc super admin duyệt mới tính công.
 */

const NHAN_LOAI = { teacher: "Giáo viên / nhân sự", user: "Nhân sự (tạo hồ sơ)", student: "Học sinh" };
const giaTri = (g) => (g ? `${g.loai}:${g.id}` : "");
const nhanGoiY = (g) => `${g.ten} · ${NHAN_LOAI[g.loai]}${g.lop ? ` ${g.lop}` : ""}${g.vai ? ` (${g.vai})` : ""}`;

function ChonNguoi({ dong, onGan, dangGan }) {
  const [tim, setTim] = useState("");
  const [kq, setKq] = useState([]);
  const [mo, setMo] = useState(false);

  useEffect(() => {
    const t = tim.trim();
    if (t.length < 2) { setKq([]); return undefined; }
    const h = setTimeout(async () => {
      const [gv, hs, ns] = await Promise.all([
        listTeachers({ search: t, page_size: 10 }).catch(() => ({ results: [] })),
        listStudents({ search: t, page_size: 10 }).catch(() => ({ results: [] })),
        // Nhân sự chưa có hồ sơ (QLCS, kế toán…) — tài khoản có thể đặt tên khác tên trên máy.
        layNhanSuChuaCoLuong().catch(() => []),
      ]);
      const khop = (x) => `${x.ten} ${x.email}`.toLowerCase().includes(t.toLowerCase());
      const ten = (u) => (u?.full_name || `${u?.last_name || ""} ${u?.first_name || ""}`).trim() || u?.email;
      setKq([
        ...(gv?.results || []).map((x) => ({ loai: "teacher", id: x.id, ten: ten(x.user) })),
        ...ns.filter((x) => x.loai === "user" && khop(x)).map((x) => ({ loai: "user", id: x.id, ten: `${x.ten} (${x.email})`, vai: x.vai })),
        ...(hs?.results || []).map((x) => ({ loai: "student", id: x.id, ten: ten(x.user), lop: x.classroom?.class_code || "" })),
      ]);
    }, 350);
    return () => clearTimeout(h);
  }, [tim]);

  const luaChon = [...(dong.da_gan ? [dong.da_gan] : []), ...dong.goi_y.filter((g) => giaTri(g) !== giaTri(dong.da_gan))];
  return (
    <div style={{ display: "grid", gap: 6, minWidth: 260 }}>
      <select
        value={giaTri(dong.da_gan)}
        disabled={dangGan}
        onChange={(e) => {
          if (e.target.value === "__khac") { setMo(true); return; }
          const g = luaChon.find((x) => giaTri(x) === e.target.value);
          onGan(g || null);
        }}
        style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${color.borderStrong}`, fontSize: 13 }}
      >
        <option value="">— Chưa gán —</option>
        {luaChon.map((g) => <option key={giaTri(g)} value={giaTri(g)}>{nhanGoiY(g)}</option>)}
        <option value="__khac">Tìm người khác…</option>
      </select>
      {mo ? (
        <div style={{ display: "grid", gap: 4 }}>
          <input autoFocus value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Gõ tên / email giáo viên, nhân sự, học sinh…"
                 style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${color.borderStrong}`, fontSize: 13 }} />
          {kq.map((g) => (
            <button key={giaTri(g)} type="button" onClick={() => { setMo(false); setTim(""); onGan(g); }}
                    style={{ textAlign: "left", border: 0, background: "#faf6f0", borderRadius: 6, padding: "6px 8px", cursor: "pointer", fontSize: 12.5 }}>
              {nhanGoiY(g)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function GanNguoiChamCong({ onDaGan }) {
  const [dl, setDl] = useState(null);
  const [loi, setLoi] = useState("");
  const [loc, setLoc] = useState("chua");
  const [dang, setDang] = useState("");
  const [tuKhoa, setTuKhoa] = useState("");

  const tai = () => layNguoiTrenMay().then(setDl).catch((e) => setLoi(loiApi(e, "Không tải được danh sách máy chấm công.")));
  useEffect(() => { tai(); }, []);

  const ds = useMemo(() => {
    const t = tuKhoa.trim().toLowerCase();
    return (dl?.ds || []).filter((d) => (loc === "tat_ca" || !d.da_gan)
      && (!t || `${d.employee_no} ${d.ten_tren_may}`.toLowerCase().includes(t)));
  }, [dl, loc, tuKhoa]);
  const soChacChan = (dl?.ds || []).filter((d) => !d.da_gan && d.chac_chan).length;

  const gan = async (d, g) => {
    setDang(d.employee_no);
    setLoi("");
    try {
      const kq = await ganNguoiMay({ employee_no: d.employee_no, loai: g ? g.loai : null, id: g?.id, ten_tren_may: d.ten_tren_may });
      await tai();
      onDaGan?.(g ? `Đã gán mã ${d.employee_no} cho ${g.ten} (${kq.so_luot} lượt quẹt).` : `Đã bỏ gán mã ${d.employee_no}.`);
    } catch (e) {
      setLoi(loiApi(e, "Không gán được."));
    } finally {
      setDang("");
    }
  };

  const ganHet = async () => {
    setDang("__all");
    setLoi("");
    try {
      const kq = await ganNguoiMay({ tat_ca_chac_chan: true });
      await tai();
      onDaGan?.(`Đã gán ${kq.so_ma} mã (${kq.so_luot} lượt quẹt) theo gợi ý trùng tên.`);
    } catch (e) {
      setLoi(loiApi(e, "Không gán được."));
    } finally {
      setDang("");
    }
  };

  return (
    <Card>
      <CardHead
        title="Gán người chấm công"
        sub={dl?.device
          ? `${dl.device.name} · ${dl.ds.length} mã trên máy · ${dl.chua_gan} mã chưa gán (lượt quẹt của mã chưa gán không được tính công / điểm danh)`
          : "Chưa có máy chấm công gửi dữ liệu về."}
      />
      <div style={{ padding: "14px 22px 18px", display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select value={loc} onChange={(e) => setLoc(e.target.value)}
                  style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${color.borderStrong}`, fontSize: 13 }}>
            <option value="chua">Chưa gán</option>
            <option value="tat_ca">Tất cả</option>
          </select>
          <input value={tuKhoa} onChange={(e) => setTuKhoa(e.target.value)} placeholder="Tìm mã / tên trên máy…"
                 style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${color.borderStrong}`, fontSize: 13, minWidth: 220 }} />
          {soChacChan ? (
            <Button disabled={!!dang} onClick={ganHet}>
              {dang === "__all" ? "Đang gán..." : `Gán tất cả gợi ý trùng tên (${soChacChan})`}
            </Button>
          ) : null}
        </div>
        {loi ? <div style={{ color: color.red, fontSize: 13.5 }}>{loi}</div> : null}
        {!dl ? <p style={{ color: color.muted }}>Đang tải...</p> : (
          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            <Table
              columns={["Mã trên máy", "Tên trên máy", "Số lượt", "Gán với người trên CRM"]}
              align={{ 2: "right" }}
              rows={ds.slice(0, 200).map((d) => [
                <b key="m">{d.employee_no}</b>,
                <div key="t">
                  {d.ten_tren_may || <span style={{ color: color.muted }}>(không tên)</span>}
                  {!d.da_gan && d.goi_y.length > 1 ? (
                    <div style={{ fontSize: 11.5, color: color.amber || "#b7791f" }}>{d.goi_y.length} người trùng tên — chọn đúng em</div>
                  ) : null}
                  {!d.da_gan && !d.goi_y.length ? (
                    <div style={{ fontSize: 11.5, color: color.muted }}>Không thấy ai trùng tên — tìm tay</div>
                  ) : null}
                </div>,
                d.so_luot,
                <ChonNguoi key="g" dong={d} dangGan={dang === d.employee_no} onGan={(g) => gan(d, g)} />,
              ])}
            />
            {ds.length > 200 ? <p style={{ fontSize: 12.5, color: color.muted }}>Đang hiện 200/{ds.length} mã — gõ để lọc.</p> : null}
          </div>
        )}
      </div>
    </Card>
  );
}

export function DuyetCongBoSung({ thang, nam, duocDuyet, taiLai, onDaDuyet }) {
  const [ds, setDs] = useState([]);
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);

  useEffect(() => {
    layCongChoDuyet({ thang, nam }).then(setDs).catch(() => setDs([]));
  }, [thang, nam, taiLai]);

  if (!ds.length) return null;

  const quyet = async (qd, ids) => {
    setDang(true);
    setLoi("");
    try {
      const kq = await duyetCong({ thang, nam }, qd, ids);
      setDs(await layCongChoDuyet({ thang, nam }));
      onDaDuyet?.(`${qd === "approve" ? "Đã duyệt" : "Đã từ chối"} ${kq.so_luot} ngày công bổ sung tháng ${thang}/${nam}.`);
    } catch (e) {
      setLoi(loiApi(e, "Không duyệt được."));
    } finally {
      setDang(false);
    }
  };

  return (
    <Card>
      <CardHead
        title={`Chấm công bổ sung chờ duyệt (${ds.length} người)`}
        sub="Ngày công nhập từ file (máy lỗi / mất điện) chỉ được tính sau khi quản lý hoặc super admin duyệt."
      />
      <div style={{ padding: "14px 22px 18px", display: "grid", gap: 10 }}>
        <Table
          columns={["Nhân sự", "Các ngày bổ sung", "Ca trực", ...(duocDuyet ? [""] : [])]}
          rows={ds.map((x) => [
            <b key="t">{x.ten}</b>,
            x.ngay.join(", "),
            x.truc,
            ...(duocDuyet ? [
              <div key="b" style={{ display: "flex", gap: 6 }}>
                <Button disabled={dang} onClick={() => quyet("approve", [x.teacher_id])}>Duyệt</Button>
                <Button variant="ghost" disabled={dang} onClick={() => quyet("reject", [x.teacher_id])}>Từ chối</Button>
              </div>,
            ] : []),
          ])}
        />
        {duocDuyet ? (
          <div><Button disabled={dang} onClick={() => quyet("approve")}>Duyệt tất cả</Button></div>
        ) : <div style={{ fontSize: 13, color: color.muted }}>Chờ quản lý hoặc super admin duyệt.</div>}
        {loi ? <div style={{ color: color.red, fontSize: 13.5 }}>{loi}</div> : null}
      </div>
    </Card>
  );
}

/**
 * Điểm danh HỌC SINH bổ sung từ file (hôm máy chấm công lỗi / mất mạng / mất điện).
 * Mẫu theo lớp: mỗi sheet một lớp, cột là các ngày lớp có ca. Tải lên -> chờ quản
 * lý hoặc super admin duyệt -> mới tính chuyên cần và lương dạy.
 */
export function DiemDanhHsBoSung({ thang, nam, coTheNhap, duocDuyet, onXong }) {
  const [tep, setTep] = useState(null);
  const [xem, setXem] = useState(null);
  const [cho, setCho] = useState([]);
  const [dang, setDang] = useState("");
  const [loi, setLoi] = useState("");
  const [khoa, setKhoa] = useState(0);

  useEffect(() => {
    layDiemDanhHsChoDuyet({ thang, nam }).then(setCho).catch(() => setCho([]));
  }, [thang, nam, khoa]);

  const chon = async (f) => {
    setTep(f);
    setXem(null);
    setLoi("");
    if (!f) return;
    setDang("xem");
    try {
      setXem(await nhapDiemDanhHs(f, { thang, nam }));
    } catch (e) {
      setLoi(loiApi(e, "Không đọc được file."));
    } finally {
      setDang("");
    }
  };
  const ghi = async () => {
    setDang("ghi");
    try {
      const kq = await nhapDiemDanhHs(tep, { thang, nam, ghi: true });
      setXem(null);
      setTep(null);
      setKhoa((k) => k + 1);
      onXong?.(`Đã gửi ${kq.so_luot} lượt điểm danh bổ sung — chờ quản lý hoặc super admin duyệt.`);
    } catch (e) {
      setLoi(loiApi(e, "Không ghi được."));
    } finally {
      setDang("");
    }
  };
  const quyet = async (qd, ids) => {
    setDang("duyet");
    setLoi("");
    try {
      const kq = await duyetDiemDanhHs({ thang, nam }, qd, ids);
      setKhoa((k) => k + 1);
      onXong?.(`${qd === "approve" ? "Đã duyệt" : "Đã từ chối"} ${kq.so_luot} lượt điểm danh bổ sung.`);
    } catch (e) {
      setLoi(loiApi(e, "Không duyệt được."));
    } finally {
      setDang("");
    }
  };

  if (!coTheNhap && !cho.length) return null;
  return (
    <Card>
      <CardHead
        title="Điểm danh học sinh bổ sung"
        sub={`Cho những hôm máy chấm công lỗi / mất mạng / mất điện trong tháng ${thang}/${nam}. X = có mặt. Phải được quản lý hoặc super admin duyệt mới tính chuyên cần và lương dạy.`}
      />
      <div style={{ padding: "14px 22px 18px", display: "grid", gap: 12 }}>
        {coTheNhap ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Button variant="ghost" onClick={() => taiMauDiemDanhHs({ thang, nam }).catch((e) => setLoi(loiApi(e, "Không tải được mẫu.")))}>
              Tải mẫu theo lớp tháng {thang}
            </Button>
            <input type="file" accept=".xlsx" onChange={(e) => chon(e.target.files?.[0] || null)} />
            {dang === "xem" ? <span style={{ color: color.muted, fontSize: 13 }}>Đang đọc...</span> : null}
          </div>
        ) : null}
        {xem ? (
          <div style={{ display: "grid", gap: 8, fontSize: 13.5 }}>
            <div>Xem trước: <b>{xem.so_luot}</b> lượt có mặt — {xem.theo_lop.filter((x) => x.so_luot).map((x) => `${x.lop}: ${x.so_luot}`).join(" · ") || "không có ô X nào"}. Chưa ghi gì.</div>
            {xem.loi?.length ? (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: color.red }}>{xem.loi.map((l) => <li key={l}>{l}</li>)}</ul>
            ) : null}
            <div style={{ display: "flex", gap: 10 }}>
              <Button disabled={!xem.so_luot || dang === "ghi"} onClick={ghi}>{dang === "ghi" ? "Đang gửi..." : "Gửi duyệt"}</Button>
              <Button variant="ghost" onClick={() => chon(null)}>Huỷ</Button>
            </div>
          </div>
        ) : null}
        {cho.length ? (
          <>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>Đang chờ duyệt</div>
            <Table
              columns={["Lớp", "Số lượt có mặt", "Các ngày", ...(duocDuyet ? [""] : [])]}
              rows={cho.map((c) => [
                <b key="l">{c.lop}</b>, c.so_luot, c.ngay.join(", "),
                ...(duocDuyet ? [
                  <div key="b" style={{ display: "flex", gap: 6 }}>
                    <Button disabled={!!dang} onClick={() => quyet("approve", [c.lop_id])}>Duyệt</Button>
                    <Button variant="ghost" disabled={!!dang} onClick={() => quyet("reject", [c.lop_id])}>Từ chối</Button>
                  </div>,
                ] : []),
              ])}
            />
            {duocDuyet ? <div><Button disabled={!!dang} onClick={() => quyet("approve")}>Duyệt tất cả</Button></div>
              : <div style={{ fontSize: 13, color: color.muted }}>Chờ quản lý hoặc super admin duyệt.</div>}
          </>
        ) : null}
        {loi ? <div style={{ color: color.red, fontSize: 13.5 }}>{loi}</div> : null}
      </div>
    </Card>
  );
}
