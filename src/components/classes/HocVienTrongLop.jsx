import { useCallback, useEffect, useState } from "react";
import { listStudents, updateStudent } from "../../services/calendarService";
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

const tenHV = (r) =>
  (r?.user?.full_name || `${r?.user?.last_name || ""} ${r?.user?.first_name || ""}`).trim()
  || r?.user?.username
  || "--";

export default function HocVienTrongLop({ lopId, tenLop, onNotice }) {
  const [dsTrongLop, setDsTrongLop] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");
  const [dangXuLy, setDangXuLy] = useState(0); // id học viên đang xử lý
  const [taiLai, setTaiLai] = useState(0);

  const [tuKhoa, setTuKhoa] = useState("");
  const [ketQuaTim, setKetQuaTim] = useState([]);
  const [dangTim, setDangTim] = useState(false);

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

  // Đang tìm thì thu gọn danh sách hiện có, nếu không khung kết quả bị đẩy
  // xuống dưới nếp gấp và người dùng tưởng tìm không ra.
  const dangMoTim = tuKhoa.trim().length >= 2;

  return (
    <div className={`cls-roster${dangMoTim ? " cls-roster--dang-tim" : ""}`}>
      <div className="cls-roster__hd">
        <span>
          Đang có <b>{dangTai ? "..." : dsTrongLop.length}</b> học viên trong lớp {tenLop}
        </span>
      </div>

      {loi ? <div className="alert red" style={{ marginBottom: 10 }}><span>⚠️</span><div>{loi}</div></div> : null}

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
              <Button
                size="sm"
                variant="danger"
                disabled={dangXuLy === hv.id}
                onClick={() => chuyenLop(hv, null, `Đã bỏ ${tenHV(hv)} khỏi lớp ${tenLop}.`)}
              >
                Bỏ khỏi lớp
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="cls-roster__add">
        <Field
          label="Thêm học viên vào lớp"
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
