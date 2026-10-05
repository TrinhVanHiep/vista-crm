import { useEffect, useState } from "react";
import { Button, Modal } from "../../ui";
import { BANG_CHUNG, TEN_CAP, thieuPhieuKiem } from "../../utils/duyetBaoCao";

/**
 * Hộp ký duyệt báo cáo ca dạy — dùng chung cho màn Báo cáo và hộp chi tiết.
 *
 * Trước đây bấm "Duyệt" là duyệt ngay, không có dấu vết người duyệt đã đọc báo
 * cáo hay chưa. Nay hai cấp cùng tick một phiếu kiểm (đã duyệt trên Zalo / trên
 * CRM / đã trao đổi trực tiếp — ít nhất một) và ghi vấn đề phát sinh nếu có. Backend kiểm lại đúng luật
 * này (approval/services.py), giao diện chỉ chặn trước cho đỡ một vòng lỗi.
 */
export default function HopKyDuyet({ open, cap, dangGui = false, onDong, onXacNhan }) {
  const [phieu, setPhieu] = useState({});
  const [ghiChu, setGhiChu] = useState("");

  useEffect(() => {
    if (open) {
      setPhieu({});
      setGhiChu("");
    }
  }, [open]);

  const thieu = thieuPhieuKiem(cap, phieu);
  const doi = (k) => setPhieu((p) => ({ ...p, [k]: !p[k] }));

  const o = ([k, nhan]) => (
    <label key={k} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13.5, cursor: "pointer" }}>
      <input type="checkbox" checked={!!phieu[k]} onChange={() => doi(k)} style={{ marginTop: 3 }} />
      <span>{nhan}</span>
    </label>
  );

  return (
    <Modal
      open={open}
      onClose={onDong}
      title={`Duyệt cấp ${cap || ""}`}
      subtitle={cap ? TEN_CAP[cap] : ""}
      size="sm"
      footer={(
        <>
          <Button onClick={onDong} disabled={dangGui}>Hủy</Button>
          <Button
            variant="primary"
            loading={dangGui}
            loadingText="Đang gửi..."
            disabled={!!thieu}
            onClick={() => onXacNhan({ ...phieu, issues: (phieu.issues || "").trim() }, ghiChu)}
          >
            ✓ Duyệt cấp {cap}
          </Button>
        </>
      )}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 8 }}>
          <legend style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Đã kiểm tra (tick ít nhất một)</legend>
          {BANG_CHUNG.map(o)}
        </fieldset>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          <span>Vấn đề phát sinh (nếu có)</span>
          <textarea
            rows={2}
            value={phieu.issues || ""}
            onChange={(e) => setPhieu((p) => ({ ...p, issues: e.target.value }))}
            placeholder="Ví dụ: 2 học sinh đến muộn, phòng học thiếu máy chiếu…"
          />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          <span>Ghi chú gửi giáo viên (không bắt buộc)</span>
          <textarea rows={2} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
        </label>
        {thieu ? <div className="small muted">{thieu}</div> : null}
      </div>
    </Modal>
  );
}
