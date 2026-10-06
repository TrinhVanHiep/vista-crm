import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listStudents, themHocSinhVaoLop, updateStudent } from "../../services/calendarService";
import { Badge, Button, Field } from "../../ui";

/**
 * Danh sách học viên của MỘT lớp, nằm ngay trong hộp thoại sửa lớp.
 *
 * Trước đây muốn đổi lớp cho một em phải đi đường vòng: mở màn Học sinh, tìm em
 * đó, vào hồ sơ rồi sửa. Còn ở màn Quản lý lớp thì chỉ nhập được cả file Excel.
 * Sửa lớp mà không sửa được danh sách lớp là thiếu đúng nửa việc.
 *
 * Chuyển lớp = PATCH classroom_id của học viên, KHÔNG xoá hồ sơ: "bỏ khỏi lớp"
 * chỉ gỡ em ra khỏi lớp này, em vẫn còn trong hệ thống để xếp vào lớp khác.
 */

const NHAN_TRANG_THAI = {
  active: "Đang học",
  paused: "Bảo lưu",
  graduated: "Hoàn thành",
  withdrawn: "Nghỉ học",
};

const HS_MOI_TRONG = { ten: "", sdt: "", bo: "", me: "", ngay_sinh: "", gioi_tinh: "", dia_chi: "" };

const tenHV = (r) =>
  (r?.user?.full_name || `${r?.user?.last_name || ""} ${r?.user?.first_name || ""}`).trim()
  || r?.user?.username
  || "--";

export default function HocVienTrongLop({ lopId, tenLop, onNotice, onDongHopThoai }) {
  const navigate = useNavigate();
  const [dsTrongLop, setDsTrongLop] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");
  const [dangXuLy, setDangXuLy] = useState(0); // id học viên đang xử lý
  const [taiLai, setTaiLai] = useState(0);

  const [tuKhoa, setTuKhoa] = useState("");
  const [ketQuaTim, setKetQuaTim] = useState([]);
  const [dangTim, setDangTim] = useState(false);

  const [moThemMoi, setMoThemMoi] = useState(false);
  const [hsMoi, setHsMoi] = useState(HS_MOI_TRONG);
  const [dangThem, setDangThem] = useState(false);
  const [canhBao, setCanhBao] = useState([]);

  const tai = useCallback(async () => {
    if (!lopId) return;
    setDangTai(true);
    setLoi("");
    try {
      const kq = await listStudents({ classroom: lopId, page_size: 200 });
      setDsTrongLop(Array.isArray(kq?.results) ? kq.results : []);
    } catch (e) {
      setLoi(e?.response?.data?.detail || e?.message || "Không tải được danh sách học viên.");
      setDsTrongLop([]);
    } finally {
      setDangTai(false);
    }
  }, [lopId, taiLai]);

  useEffect(() => { tai(); }, [tai]);

  // Gõ tới đâu gọi API tới đó thì mỗi phím một lượt gọi; chờ người dùng gõ xong.
  useEffect(() => {
    const tu = tuKhoa.trim();
    if (tu.length < 2) { setKetQuaTim([]); return undefined; }
    const h = setTimeout(async () => {
      setDangTim(true);
      try {
        const kq = await listStudents({ search: tu, page_size: 20 });
        const co = new Set(dsTrongLop.map((x) => x.id));
        setKetQuaTim((Array.isArray(kq?.results) ? kq.results : []).filter((x) => !co.has(x.id)));
      } catch {
        setKetQuaTim([]);
      } finally {
        setDangTim(false);
      }
    }, 400);
    return () => clearTimeout(h);
  }, [tuKhoa, dsTrongLop]);

  const chuyenLop = async (hv, lopDich, thongBao) => {
    setDangXuLy(hv.id);
    setLoi("");
    try {
      await updateStudent(hv.id, { classroom_id: lopDich });
      setTuKhoa("");
      setTaiLai((v) => v + 1);
      if (onNotice) onNotice(thongBao);
    } catch (e) {
      setLoi(
        e?.response?.data?.classroom_id
          || e?.response?.data?.detail
          || e?.message
          || "Không cập nhật được lớp của học viên.",
      );
    } finally {
      setDangXuLy(0);
    }
  };

  // Thêm tay một em MỚI ngay tại lớp — backend dùng chung luật chống trùng của
  // nhập Excel (classrooms/views.py::them_hoc_sinh): trùng tên trong lớp thì cập
  // nhật hồ sơ sẵn có thay vì đẻ thêm một em "ảo".
  const themMoi = async (e) => {
    e.preventDefault();
    if (!hsMoi.ten.trim()) { setLoi("Nhập họ tên học sinh."); return; }
    setDangThem(true);
    setLoi("");
    setCanhBao([]);
    try {
      const kq = await themHocSinhVaoLop(lopId, { ...hsMoi, ten: hsMoi.ten.trim() });
      setCanhBao(Array.isArray(kq?.warnings) ? kq.warnings : []);
      setHsMoi(HS_MOI_TRONG);
      setMoThemMoi(false);
      setTaiLai((v) => v + 1);
      if (onNotice) onNotice(kq?.detail || `Đã thêm học sinh vào lớp ${tenLop}.`);
    } catch (err) {
      setLoi(err?.response?.data?.detail || err?.message || "Không thêm được học sinh.");
    } finally {
      setDangThem(false);
    }
  };

  const soDangHoc = dsTrongLop.filter((x) => x.current_status === "active").length;
  const soKhac = dsTrongLop.length - soDangHoc;

  // Đang tìm thì thu gọn danh sách hiện có, nếu không khung kết quả bị đẩy
  // xuống dưới nếp gấp và người dùng tưởng tìm không ra.
  const dangMoTim = tuKhoa.trim().length >= 2;

  return (
    <div className={`cls-roster${dangMoTim ? " cls-roster--dang-tim" : ""}`}>
      <div className="cls-roster__hd">
        <span>
          Sĩ số thực lớp {tenLop}: <b>{dangTai ? "..." : soDangHoc}</b> em đang học
          {!dangTai && soKhac > 0 ? <small className="muted"> (+{soKhac} bảo lưu/nghỉ, không tính)</small> : null}
        </span>
      </div>

      {loi ? <div className="alert red" style={{ marginBottom: 10 }}><span>⚠️</span><div>{loi}</div></div> : null}
      {canhBao.length ? (
        <div className="alert" style={{ marginBottom: 10 }}><span>ℹ️</span><div>{canhBao.join(" ")}</div></div>
      ) : null}

      <div className="cls-roster__list">
        {dangTai ? (
          <div className="cls-roster__empty">Đang tải...</div>
        ) : dsTrongLop.length === 0 ? (
          <div className="cls-roster__empty">Lớp chưa có học viên nào.</div>
        ) : (
          dsTrongLop.map((hv) => (
            <div className="cls-roster__row" key={hv.id}>
              <div className="cls-roster__who">
                <b>{tenHV(hv)}</b>
                <small>
                  {hv.parent_phone || hv.phone_number || "chưa có số liên hệ"}
                </small>
              </div>
              <Badge tone={hv.current_status === "withdrawn" ? "gray" : "green"}>
                {NHAN_TRANG_THAI[hv.current_status] || hv.current_status || "--"}
              </Badge>
              <div className="cls-roster__nut">
                {/* Thấy sai số điện thoại hay thiếu tên phụ huynh thì sửa ngay
                    tại đây, khỏi phải nhớ tên em rồi đi vòng qua màn Học sinh. */}
                <Button
                  size="sm"
                  onClick={() => {
                    onDongHopThoai?.();
                    // Mang theo lớp đang mở để hồ sơ có nút "← Về lớp" quay lại đúng chỗ.
                    navigate(`/students/${hv.id}`, { state: { tuLop: { id: lopId, ten: tenLop } } });
                  }}
                >
                  Sửa thông tin
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={dangXuLy === hv.id}
                  onClick={() => chuyenLop(hv, null, `Đã bỏ ${tenHV(hv)} khỏi lớp ${tenLop}.`)}
                >
                  Bỏ khỏi lớp
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="cls-roster__add">
        {moThemMoi ? (
          <form className="cls-roster__moi" onSubmit={themMoi}>
            <div className="cls-roster__moi-hd">
              <b>Thêm học sinh mới vào lớp {tenLop}</b>
              <small className="muted">Trùng tên với em đã có trong lớp thì hồ sơ cũ được cập nhật, không tạo thêm.</small>
            </div>
            <div className="cls-form">
              <Field label="Họ và tên" required>
                <input value={hsMoi.ten} onChange={(e) => setHsMoi((p) => ({ ...p, ten: e.target.value }))} required maxLength={150} autoFocus />
              </Field>
              <Field label="SĐT phụ huynh">
                <input value={hsMoi.sdt} onChange={(e) => setHsMoi((p) => ({ ...p, sdt: e.target.value }))} inputMode="tel" maxLength={20} />
              </Field>
              <Field label="Họ tên bố">
                <input value={hsMoi.bo} onChange={(e) => setHsMoi((p) => ({ ...p, bo: e.target.value }))} maxLength={150} />
              </Field>
              <Field label="Họ tên mẹ">
                <input value={hsMoi.me} onChange={(e) => setHsMoi((p) => ({ ...p, me: e.target.value }))} maxLength={150} />
              </Field>
              <Field label="Ngày sinh">
                <input type="date" value={hsMoi.ngay_sinh} onChange={(e) => setHsMoi((p) => ({ ...p, ngay_sinh: e.target.value }))} />
              </Field>
              <Field label="Giới tính">
                <select value={hsMoi.gioi_tinh} onChange={(e) => setHsMoi((p) => ({ ...p, gioi_tinh: e.target.value }))}>
                  <option value="">—</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </Field>
              <Field label="Địa chỉ">
                <input value={hsMoi.dia_chi} onChange={(e) => setHsMoi((p) => ({ ...p, dia_chi: e.target.value }))} maxLength={255} />
              </Field>
            </div>
            <div className="cls-roster__nut" style={{ justifyContent: "flex-end", marginTop: 8 }}>
              <Button size="sm" variant="ghost" onClick={() => { setMoThemMoi(false); setHsMoi(HS_MOI_TRONG); }}>Hủy</Button>
              <Button size="sm" type="submit" variant="primary" loading={dangThem} loadingText="Đang thêm...">Thêm vào lớp</Button>
            </div>
          </form>
        ) : (
          <Button size="sm" variant="primary" onClick={() => setMoThemMoi(true)} style={{ marginBottom: 10 }}>
            + Thêm học sinh mới vào lớp
          </Button>
        )}

        <Field
          label="Hoặc chuyển em đã có hồ sơ vào lớp"
          hint="Gõ từ 2 ký tự để tìm trong toàn bộ học viên của trung tâm."
        >
          <input
            type="search"
            value={tuKhoa}
            onChange={(e) => setTuKhoa(e.target.value)}
            placeholder="Tìm theo tên, mã hoặc số điện thoại..."
          />
        </Field>

        {dangMoTim ? (
          <div className="cls-roster__found">
            {dangTim ? (
              <div className="cls-roster__empty">Đang tìm...</div>
            ) : ketQuaTim.length === 0 ? (
              <div className="cls-roster__empty">Không tìm thấy em nào (hoặc em đã ở trong lớp).</div>
            ) : (
              ketQuaTim.map((hv) => (
                <div className="cls-roster__row" key={hv.id}>
                  <div className="cls-roster__who">
                    <b>{tenHV(hv)}</b>
                    <small>
                      {hv.classroom?.name
                        ? `Đang ở lớp ${hv.classroom.name}`
                        : "Chưa xếp lớp"}
                    </small>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={dangXuLy === hv.id}
                    onClick={() => chuyenLop(
                      hv, lopId,
                      hv.classroom?.name
                        ? `Đã chuyển ${tenHV(hv)} từ lớp ${hv.classroom.name} sang ${tenLop}.`
                        : `Đã xếp ${tenHV(hv)} vào lớp ${tenLop}.`,
                    )}
                  >
                    {hv.classroom?.name ? "Chuyển sang lớp này" : "Thêm vào lớp"}
                  </Button>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
