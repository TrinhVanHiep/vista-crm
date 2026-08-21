import { useEffect, useMemo, useState } from "react";
import {
  listClassroomsAll,
  setTeacherClassrooms,
  teacherClassrooms,
} from "../../services/calendarService";
import { Button, Modal } from "../../ui";

/**
 * Gán lớp phụ trách cho một giáo viên.
 *
 * Đây là mảnh còn thiếu của phân quyền theo lớp: mọi chỗ đều đã chặn theo lớp
 * giáo viên phụ trách, nhưng bảng phân công trước đây chỉ ghi được qua file
 * Excel hoặc sửa tay trong CSDL — nên giáo viên mới tạo không thấy lớp nào và
 * tưởng hệ thống hỏng.
 */
export default function GanLopModal({ giaoVien, onClose, onXong }) {
  const [dsLop, setDsLop] = useState([]);
  const [chon, setChon] = useState(() => new Set());
  const [tim, setTim] = useState("");
  const [dangTai, setDangTai] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState("");

  useEffect(() => {
    if (!giaoVien) return undefined;
    let huy = false;
    setDangTai(true);
    setLoi("");
    Promise.all([listClassroomsAll(), teacherClassrooms(giaoVien.id)])
      .then(([tatCa, dangCo]) => {
        if (huy) return;
        setDsLop(Array.isArray(tatCa) ? tatCa : []);
        setChon(new Set((dangCo || []).map((x) => x.classroom)));
      })
      .catch(() => {
        if (!huy) setLoi("Không tải được danh sách lớp.");
      })
      .finally(() => {
        if (!huy) setDangTai(false);
      });
    return () => {
      huy = true;
    };
  }, [giaoVien]);

  const hienThi = useMemo(() => {
    const k = tim.trim().toLowerCase();
    if (!k) return dsLop;
    return dsLop.filter((l) =>
      `${l.class_code || ""} ${l.name || ""} ${l.program_name || ""}`.toLowerCase().includes(k),
    );
  }, [dsLop, tim]);

  const doi = (id) =>
    setChon((cu) => {
      const moi = new Set(cu);
      if (moi.has(id)) moi.delete(id);
      else moi.add(id);
      return moi;
    });

  const luu = async () => {
    setDangLuu(true);
    setLoi("");
    try {
      await setTeacherClassrooms(giaoVien.id, [...chon]);
      onXong?.();
      onClose?.();
    } catch (e) {
      setLoi(e?.response?.data?.detail || "Không lưu được phân công.");
    } finally {
      setDangLuu(false);
    }
  };

  const ten = giaoVien?.user?.full_name || giaoVien?.full_name || giaoVien?.user?.email || "";

  return (
    <Modal
      open={Boolean(giaoVien)}
      onClose={onClose}
      title="Gán lớp phụ trách"
      subtitle={ten}
      size="md"
    >
      <p className="small muted" style={{ marginBottom: 12, lineHeight: 1.6 }}>
        Giáo viên chỉ xem và nhập được dữ liệu của những lớp tick ở đây — bảng điểm,
        lịch dạy, báo cáo ca dạy, danh sách học viên. Bỏ tick là gỡ quyền với lớp đó.
      </p>

      <input
        type="text"
        placeholder="Tìm theo mã lớp, tên lớp hoặc chương trình..."
        value={tim}
        onChange={(e) => setTim(e.target.value)}
        style={{
          width: "100%", height: 36, padding: "0 12px", marginBottom: 10,
          border: "1px solid #E3E6EE", borderRadius: 8, fontFamily: "inherit", fontSize: 13,
        }}
      />

      {loi ? (
        <div className="alert red" style={{ marginBottom: 12 }}>
          <span>⚠️</span>
          <div>{loi}</div>
        </div>
      ) : null}

      {dangTai ? (
        <p className="small muted">Đang tải danh sách lớp...</p>
      ) : (
        <div
          style={{
            maxHeight: 320, overflowY: "auto", border: "1px solid #EEF0F4",
            borderRadius: 10, padding: 6, marginBottom: 12,
          }}
        >
          {hienThi.length === 0 ? (
            <p className="small muted" style={{ padding: 12, margin: 0 }}>
              Không có lớp nào khớp.
            </p>
          ) : (
            hienThi.map((l) => (
              <label
                key={l.id}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "7px 10px",
                  borderRadius: 8, cursor: "pointer", fontSize: 13,
                  background: chon.has(l.id) ? "#FFF6EC" : "transparent",
                }}
              >
                <input type="checkbox" checked={chon.has(l.id)} onChange={() => doi(l.id)} />
                <span style={{ fontWeight: 600, minWidth: 74 }}>
                  {l.class_code || l.name}
                </span>
                <span className="muted" style={{ flex: 1, minWidth: 0 }}>
                  {l.program_name || "Chưa phân loại"}
                  {l.level_name ? ` · ${l.level_name}` : ""}
                </span>
              </label>
            ))
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="small muted" style={{ flex: 1 }}>
          Đang chọn <strong>{chon.size}</strong> lớp
        </span>
        <Button variant="ghost" onClick={onClose}>
          Đóng
        </Button>
        <Button variant="primary" onClick={luu} loading={dangLuu} loadingText="Đang lưu...">
          Lưu phân công
        </Button>
      </div>
    </Modal>
  );
}
