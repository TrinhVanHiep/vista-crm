import { useState } from "react";
import { bulkImport, bulkImportTemplate } from "../../services/calendarService";
import { Button, Modal } from "../../ui";

/**
 * Hộp thoại nhập Excel dùng chung cho Lớp / Học sinh / Giáo viên.
 *
 * Ba màn dùng chung một component thay vì mỗi màn tự dựng lại: luồng giống hệt
 * nhau (tải mẫu, chọn file, nhập, xem kết quả) nên tách ra một chỗ thì sửa một
 * lần là cả ba cùng đúng.
 */

const CAU_HINH = {
  lop: {
    tieuDe: "Nhập lớp từ Excel",
    tenFile: "Mau-nhap-lop.xlsx",
    moTa: "Mỗi dòng là một lớp. Trùng mã lớp thì cập nhật lớp cũ, không tạo bản mới.",
    donVi: "lớp",
  },
  hocSinh: {
    tieuDe: "Nhập học sinh từ Excel",
    tenFile: "Mau-nhap-hoc-sinh.xlsx",
    moTa:
      "Mỗi dòng là một học sinh. Dùng được cả file danh sách sẵn có của trung tâm " +
      "— loại chia mỗi lớp một sheet (lấy tên sheet làm mã lớp), và cả file sổ điểm danh. " +
      "Hệ thống tự nhận dạng, không phải chọn loại file.",
    donVi: "học sinh",
    coTaoLop: true,
    coTaoGiaoVien: true,
  },
  giaoVien: {
    tieuDe: "Nhập giáo viên từ Excel",
    tenFile: "Mau-nhap-giao-vien.xlsx",
    moTa: "Mỗi dòng là một giáo viên. Email dùng làm tài khoản, trùng email thì cập nhật người cũ.",
    donVi: "giáo viên",
  },
};

export default function BulkImportModal({ loai, open, onClose, onXong }) {
  const cfg = CAU_HINH[loai] || CAU_HINH.hocSinh;
  const [file, setFile] = useState(null);
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState("");
  const [ketQua, setKetQua] = useState(null);
  const [taoLopThieu, setTaoLopThieu] = useState(false);
  const [taoGiaoVienThieu, setTaoGiaoVienThieu] = useState(false);

  const dong = () => {
    setFile(null);
    setLoi("");
    setKetQua(null);
    onClose?.();
  };

  const taiMau = async () => {
    setLoi("");
    try {
      const blob = await bulkImportTemplate(loai);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = cfg.tenFile;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setLoi("Không tải được file mẫu. Vui lòng thử lại.");
    }
  };

  const gui = async (e) => {
    e.preventDefault();
    if (!file) {
      setLoi("Vui lòng chọn file Excel (.xlsx).");
      return;
    }
    setDangGui(true);
    setLoi("");
    setKetQua(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (cfg.coTaoLop && taoLopThieu) fd.append("create_missing_classes", "1");
      if (cfg.coTaoGiaoVien && taoGiaoVienThieu) fd.append("create_missing_teachers", "1");
      const kq = await bulkImport(loai, fd);
      setKetQua(kq);
      onXong?.(kq);
    } catch (error) {
      setLoi(
        error?.response?.data?.detail ||
          "Không nhập được file. Kiểm tra lại định dạng và tên cột.",
      );
    } finally {
      setDangGui(false);
    }
  };

  return (
    <Modal open={open} onClose={dong} title={cfg.tieuDe} size="md">
      <form onSubmit={gui}>
        <p className="small muted" style={{ marginBottom: 12, lineHeight: 1.6 }}>
          {cfg.moTa} <strong>Ô để trống nghĩa là không đổi</strong>, nhập lại cùng
          một file nhiều lần không tạo bản trùng.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <Button type="button" variant="ghost" onClick={taiMau}>
            Tải file mẫu
          </Button>
          <label className="btn ghost" style={{ cursor: "pointer", margin: 0 }}>
            {file ? file.name : "Chọn file .xlsx"}
            <input
              type="file"
              accept=".xlsx"
              hidden
              onChange={(ev) => {
                setFile(ev.target.files?.[0] || null);
                setLoi("");
                setKetQua(null);
              }}
            />
          </label>
        </div>

        {cfg.coTaoLop ? (
          <label
            style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 14,
                     fontSize: 13, lineHeight: 1.5, cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={taoLopThieu}
              onChange={(ev) => setTaoLopThieu(ev.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span>
              Tự tạo lớp còn thiếu.{" "}
              <span className="muted">
                Không bật thì học sinh thuộc lớp chưa có trong hệ thống sẽ bị bỏ qua
                và liệt kê ở phần lỗi.
              </span>
            </span>
          </label>
        ) : null}

        {cfg.coTaoGiaoVien ? (
          <label
            style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 14,
                     fontSize: 13, lineHeight: 1.5, cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={taoGiaoVienThieu}
              onChange={(ev) => setTaoGiaoVienThieu(ev.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span>
              Tạo giáo viên mới nếu chưa có.{" "}
              <span className="muted">
                Áp dụng cho cột “Giáo viên phụ trách”. Không bật thì giáo viên chưa
                có sẽ được liệt kê để bạn tự thêm.
              </span>
            </span>
          </label>
        ) : null}

        {loi ? (
          <div className="alert red" style={{ marginBottom: 12 }}>
            <span>⚠️</span>
            <div>{loi}</div>
          </div>
        ) : null}

        {ketQua ? (
          <div className="alert green" style={{ marginBottom: 12, display: "block" }}>
            <div>
              Đọc <strong>{ketQua.read_count ?? 0}</strong> dòng — tạo mới{" "}
              <strong>{ketQua.created_count ?? 0}</strong>, cập nhật{" "}
              <strong>{ketQua.updated_count ?? 0}</strong> {cfg.donVi}
              {ketQua.error_count ? `, ${ketQua.error_count} dòng cần xem lại:` : "."}
            </div>
            {Array.isArray(ketQua.teachers_created) && ketQua.teachers_created.length ? (
              <div style={{ marginTop: 4, fontSize: 12.5 }}>
                Đã tạo thêm giáo viên: <strong>{ketQua.teachers_created.join(", ")}</strong>
              </div>
            ) : null}
            {ketQua.format ? (
              <div style={{ marginTop: 4, fontSize: 12.5 }}>
                Nhận dạng file: <strong>{ketQua.format}</strong>
              </div>
            ) : null}
            {Array.isArray(ketQua.classes_created) && ketQua.classes_created.length ? (
              <div style={{ marginTop: 4, fontSize: 12.5 }}>
                Đã tạo thêm lớp: <strong>{ketQua.classes_created.join(", ")}</strong>
              </div>
            ) : null}
            {Array.isArray(ketQua.errors) && ketQua.errors.length ? (
              <ul style={{ margin: "6px 0 0 18px", fontSize: 12.5, lineHeight: 1.55 }}>
                {ketQua.errors.slice(0, 15).map((x, i) => (
                  <li key={i}>{typeof x === "string" ? x : JSON.stringify(x)}</li>
                ))}
                {ketQua.errors.length > 15 ? (
                  <li>… và {ketQua.errors.length - 15} dòng nữa.</li>
                ) : null}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Button type="button" variant="ghost" onClick={dong}>
            Đóng
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={dangGui}
            loadingText="Đang nhập..."
            disabled={!file}
          >
            Nhập file
          </Button>
        </div>
      </form>
    </Modal>
  );
}
