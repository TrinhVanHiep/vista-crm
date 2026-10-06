import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { choHocVienNghi, listStudents, updateStudent } from "../../services/calendarService";
import { Button, Modal } from "../../ui";

/**
 * Nơi gom học sinh "đang học" mà không có lớp thật: bị bỏ khỏi lớp, hoặc lớp
 * cũ đã giải tán. Trước đây các em này rơi khỏi mọi danh sách lớp nhưng vẫn
 * được đếm vào sĩ số — nên sĩ số trên CRM cao hơn thực tế.
 *
 * Ở đây chỉ có hai lối ra: xếp vào một lớp đang chạy, hoặc cho nghỉ (giữ hồ sơ).
 * Lọc khớp backend: students/filters.py::loc_chua_xep_lop.
 */

const tenHV = (r) =>
  (r?.user?.full_name || `${r?.user?.last_name || ""} ${r?.user?.first_name || ""}`).trim()
  || r?.user?.username
  || "--";

export default function HocSinhChuaXepLop({ open, onClose, lopDangChay, onDaDoi }) {
  const navigate = useNavigate();
  const [ds, setDs] = useState([]);
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState("");
  const [tuKhoa, setTuKhoa] = useState("");
  const [chonLop, setChonLop] = useState({}); // id học sinh -> id lớp
  const [dangXuLy, setDangXuLy] = useState(0);
  const [thongBao, setThongBao] = useState("");

  const tai = useCallback(async () => {
    setDangTai(true);
    setLoi("");
    try {
      const kq = await listStudents({ chua_xep_lop: true, page_size: 500 });
      setDs(Array.isArray(kq?.results) ? kq.results : []);
    } catch (e) {
      setLoi(e?.response?.data?.detail || e?.message || "Không tải được danh sách.");
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => {
    if (open) { setThongBao(""); setTuKhoa(""); tai(); }
  }, [open, tai]);

  const xong = (hv, tb) => {
    setDs((cu) => cu.filter((x) => x.id !== hv.id));
    setThongBao(tb);
    onDaDoi?.();
  };

  const xepLop = async (hv) => {
    const lop = lopDangChay.find((l) => String(l.id) === String(chonLop[hv.id]));
    if (!lop) { setLoi(`Chọn lớp cho ${tenHV(hv)} trước.`); return; }
    setDangXuLy(hv.id);
    setLoi("");
    try {
      await updateStudent(hv.id, { classroom_id: lop.id });
      xong(hv, `Đã xếp ${tenHV(hv)} vào lớp ${lop.class_code || lop.name}.`);
    } catch (e) {
      setLoi(e?.response?.data?.classroom_id || e?.response?.data?.detail || "Không xếp được lớp.");
    } finally {
      setDangXuLy(0);
    }
  };

  const choNghi = async (hv) => {
    // eslint-disable-next-line no-alert
    const lyDo = window.prompt(`Lý do cho ${tenHV(hv)} nghỉ học (hồ sơ vẫn được giữ):`, "Không còn theo học");
    if (lyDo === null) return;
    setDangXuLy(hv.id);
    setLoi("");
    try {
      await choHocVienNghi(hv.id, { reason: lyDo.trim() || "Không còn theo học" });
      xong(hv, `Đã chuyển ${tenHV(hv)} sang Nghỉ học.`);
    } catch (e) {
      setLoi(e?.response?.data?.detail || "Không cho nghỉ được.");
    } finally {
      setDangXuLy(0);
    }
  };

  const tu = tuKhoa.trim().toLowerCase();
  const hien = tu
    ? ds.filter((hv) => `${tenHV(hv)} ${hv.parent_phone || ""} ${hv.classroom?.name || ""}`.toLowerCase().includes(tu))
    : ds;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`Học sinh chưa xếp lớp (${ds.length})`}
      subtitle="Em đang học nhưng bị bỏ khỏi lớp hoặc lớp cũ đã giải tán — không tính vào sĩ số. Xếp lại lớp hoặc cho nghỉ."
      footer={<Button variant="ghost" onClick={onClose}>Đóng</Button>}
    >
      {thongBao ? <div className="alert green" style={{ marginBottom: 10 }}><span>✓</span><div>{thongBao}</div></div> : null}
      {loi ? <div className="alert red" style={{ marginBottom: 10 }}><span>⚠️</span><div>{loi}</div></div> : null}
      <input
        type="search"
        value={tuKhoa}
        onChange={(e) => setTuKhoa(e.target.value)}
        placeholder="Lọc theo tên, số điện thoại, lớp cũ..."
        style={{ width: "100%", marginBottom: 10 }}
      />
      <div className="cls-roster__list" style={{ maxHeight: "55vh" }}>
        {dangTai ? (
          <div className="cls-roster__empty">Đang tải...</div>
        ) : hien.length === 0 ? (
          <div className="cls-roster__empty">{ds.length ? "Không có em nào khớp." : "Không còn em nào chưa xếp lớp."}</div>
        ) : hien.map((hv) => (
          <div className="cls-roster__row" key={hv.id} style={{ flexWrap: "wrap" }}>
            <div className="cls-roster__who" style={{ minWidth: 180 }}>
              <b>{tenHV(hv)}</b>
              <small>
                {hv.classroom ? `Lớp cũ ${hv.classroom.class_code || hv.classroom.name} (đã giải tán)` : "Chưa có lớp"}
                {hv.parent_phone ? ` · ${hv.parent_phone}` : ""}
              </small>
            </div>
            <div className="cls-roster__nut" style={{ flexWrap: "wrap" }}>
              <select
                value={chonLop[hv.id] || ""}
                onChange={(e) => setChonLop((c) => ({ ...c, [hv.id]: e.target.value }))}
                aria-label={`Chọn lớp cho ${tenHV(hv)}`}
              >
                <option value="">— Chọn lớp —</option>
                {lopDangChay.map((l) => (
                  <option key={l.id} value={l.id}>{l.class_code ? `${l.class_code} · ${l.name}` : l.name}</option>
                ))}
              </select>
              <Button size="sm" variant="primary" disabled={dangXuLy === hv.id || !chonLop[hv.id]} onClick={() => xepLop(hv)}>
                Xếp vào lớp
              </Button>
              <Button size="sm" variant="danger" disabled={dangXuLy === hv.id} onClick={() => choNghi(hv)}>
                Cho nghỉ
              </Button>
              <Button size="sm" onClick={() => { onClose?.(); navigate(`/students/${hv.id}`); }}>
                Hồ sơ
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
