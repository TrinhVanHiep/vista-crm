import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  choHocVienNghi,
  listStudents,
  nhanHocVienHocLai,
} from "../../services/calendarService";
import { Badge, Button, DataTable, Field, Modal } from "../../ui";

/**
 * Danh sách từng học viên, kèm Sửa và Cho nghỉ.
 *
 * Màn Học sinh trước đây chỉ là dashboard thống kê THEO LỚP — không có dòng học
 * viên nào, nên cũng không có chỗ đặt nút sửa/cho nghỉ. Mọi thứ chỉ vào được
 * bằng nhập file Excel. Đây là phần còn thiếu đó.
 *
 * Cho nghỉ chứ KHÔNG xoá: xoá thật sẽ CASCADE mất bảng điểm, điểm danh, người
 * giám hộ, và làm dòng học phí mất chủ.
 */

const NHAN_TRANG_THAI = {
  active: "Đang học",
  paused: "Bảo lưu",
  graduated: "Hoàn thành",
  withdrawn: "Nghỉ học",
};

// Chỉ dùng tone .badge có thật trong vista4.css (green/blue/orange/red/purple/gray).
const TONE_TRANG_THAI = {
  active: "green",
  paused: "orange",
  graduated: "blue",
  withdrawn: "gray",
};

const CO_MOI_TRANG = 25;

export default function DanhSachHocVien({ lops = [], coQuyenChoNghi = false, onNotice }) {
  const navigate = useNavigate();

  const [tuKhoa, setTuKhoa] = useState("");
  const [timNgay, setTimNgay] = useState("");
  const [lopId, setLopId] = useState("");
  const [trangThai, setTrangThai] = useState("active");
  const [trang, setTrang] = useState(1);

  const [items, setItems] = useState([]);
  const [tong, setTong] = useState(0);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");
  const [dangXuLy, setDangXuLy] = useState(false);
  const [taiLai, setTaiLai] = useState(0);

  // { hs, kieu: "nghi" | "hoclai" }
  const [hoi, setHoi] = useState(null);
  const [lyDo, setLyDo] = useState("");
  const [ngayNghi, setNgayNghi] = useState(() => new Date().toISOString().slice(0, 10));

  // Gõ tới đâu gọi API tới đó thì mỗi phím một lượt gọi; chờ 400ms cho người
  // dùng gõ xong đã.
  useEffect(() => {
    const h = setTimeout(() => { setTimNgay(tuKhoa.trim()); setTrang(1); }, 400);
    return () => clearTimeout(h);
  }, [tuKhoa]);

  useEffect(() => { setTrang(1); }, [lopId, trangThai]);

  const tai = useCallback(async () => {
    setDangTai(true);
    setLoi("");
    try {
      const params = { page: trang, page_size: CO_MOI_TRANG };
      if (timNgay) params.search = timNgay;
      if (lopId) params.classroom = lopId;
      if (trangThai) params.current_status = trangThai;
      const kq = await listStudents(params);
      setItems(Array.isArray(kq?.results) ? kq.results : []);
      setTong(Number(kq?.count) || 0);
    } catch (e) {
      setLoi(e?.response?.data?.detail || e?.message || "Không tải được danh sách học viên.");
      setItems([]);
      setTong(0);
    } finally {
      setDangTai(false);
    }
  }, [trang, timNgay, lopId, trangThai, taiLai]);

  useEffect(() => { tai(); }, [tai]);

  const soTrang = Math.max(1, Math.ceil(tong / CO_MOI_TRANG));

  const tenHocVien = (r) =>
    (r?.user?.full_name || `${r?.user?.last_name || ""} ${r?.user?.first_name || ""}`).trim()
    || r?.user?.username
    || "--";

  const xuLy = async (viec, thongBao) => {
    setDangXuLy(true);
    setLoi("");
    try {
      await viec();
      setHoi(null);
      setLyDo("");
      setTaiLai((v) => v + 1);
      if (onNotice) onNotice(thongBao);
    } catch (e) {
      setLoi(
        e?.response?.data?.reason
          || e?.response?.data?.detail
          || e?.message
          || "Không thực hiện được.",
      );
    } finally {
      setDangXuLy(false);
    }
  };

  const cot = useMemo(() => {
    const c = [
      {
        key: "ten",
        header: "Học viên",
        render: (r) => (
          <div style={{ minWidth: 0 }}>
            <b>{tenHocVien(r)}</b>
            {r.student_code ? <div className="small muted">Mã {r.student_code}</div> : null}
          </div>
        ),
      },
      { key: "lop", header: "Lớp", render: (r) => r?.classroom?.name || "--" },
      {
        key: "lienhe",
        header: "Liên hệ phụ huynh",
        render: (r) => (
          <div style={{ minWidth: 0 }}>
            <div>{r.parent_name || "--"}</div>
            {r.parent_phone ? <div className="small muted">{r.parent_phone}</div> : null}
          </div>
        ),
      },
      {
        key: "trangthai",
        header: "Trạng thái",
        align: "center",
        render: (r) => (
          <div>
            <Badge tone={TONE_TRANG_THAI[r.current_status] || "gray"}>
              {NHAN_TRANG_THAI[r.current_status] || r.current_status || "--"}
            </Badge>
            {r.current_status === "withdrawn" && r.withdrawn_date ? (
              <div className="small muted" style={{ marginTop: 3 }}>
                Nghỉ {r.withdrawn_date}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        key: "lydo",
        header: "Lý do nghỉ",
        render: (r) =>
          r.current_status === "withdrawn"
            ? (
              <div style={{ minWidth: 0 }}>
                <div className="small">{r.withdrawn_reason || "--"}</div>
                {r.withdrawn_by_name ? (
                  <div className="small muted">Xác nhận: {r.withdrawn_by_name}</div>
                ) : null}
              </div>
            )
            : <span className="muted">--</span>,
      },
      {
        key: "thaotac",
        header: "Thao tác",
        align: "right",
        // DataTable chỉ nhận `width` cho cột, không nhận className.
        width: "1%",
        render: (r) => (
          <div className="dshv-thaotac" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" onClick={() => navigate(`/students/${r.id}`)}>Sửa</Button>
            {coQuyenChoNghi ? (
              r.current_status === "withdrawn" ? (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={dangXuLy}
                  onClick={() => setHoi({ hs: r, kieu: "hoclai" })}
                >
                  Nhận học lại
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="danger"
                  disabled={dangXuLy}
                  onClick={() => { setHoi({ hs: r, kieu: "nghi" }); setLyDo(""); }}
                >
                  Cho nghỉ
                </Button>
              )
            ) : null}
          </div>
        ),
      },
    ];
    return c;
  }, [coQuyenChoNghi, dangXuLy, navigate]);

  return (
    <div className="card">
      <div className="card-head" style={{ flexWrap: "wrap", gap: 8 }}>
        <h3>Danh sách học viên</h3>
        <span className="small muted">
          {dangTai ? "Đang tải..." : `${tong} học viên`}
          {trangThai === "withdrawn" ? " đã nghỉ" : ""}
        </span>
      </div>

      <div className="flex" style={{ gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input
          className="dshv-o"
          type="search"
          value={tuKhoa}
          onChange={(e) => setTuKhoa(e.target.value)}
          placeholder="Tìm theo tên, mã, số điện thoại..."
          aria-label="Tìm học viên"
        />
        <select
          className="dshv-o"
          value={lopId}
          onChange={(e) => setLopId(e.target.value)}
          aria-label="Lọc theo lớp"
        >
          <option value="">Tất cả lớp</option>
          {lops.map((l) => (
            <option key={l.id} value={l.id}>{l.class_code || l.name}</option>
          ))}
        </select>
        <select
          className="dshv-o"
          value={trangThai}
          onChange={(e) => setTrangThai(e.target.value)}
          aria-label="Lọc theo trạng thái"
        >
          <option value="">Mọi trạng thái</option>
          {Object.entries(NHAN_TRANG_THAI).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {loi ? <div className="alert red" style={{ marginBottom: 12 }}><span>⚠️</span><div>{loi}</div></div> : null}

      <DataTable
        columns={cot}
        rows={items}
        loading={dangTai}
        rowKey={(r) => r.id}
        empty={
          trangThai === "withdrawn"
            ? "Chưa có học viên nào được đánh dấu đã nghỉ."
            : "Không có học viên nào khớp bộ lọc."
        }
        minWidth={960}
      />

      {soTrang > 1 ? (
        <div className="flex" style={{ justifyContent: "center", gap: 8, marginTop: 12 }}>
          <Button size="sm" disabled={trang <= 1 || dangTai} onClick={() => setTrang((t) => t - 1)}>
            ‹ Trước
          </Button>
          <span className="small muted" style={{ alignSelf: "center" }}>
            Trang {trang}/{soTrang}
          </span>
          <Button size="sm" disabled={trang >= soTrang || dangTai} onClick={() => setTrang((t) => t + 1)}>
            Sau ›
          </Button>
        </div>
      ) : null}

      <Modal
        open={Boolean(hoi)}
        onClose={() => setHoi(null)}
        title={hoi?.kieu === "hoclai" ? "Nhận học viên quay lại" : "Cho học viên nghỉ"}
        subtitle={hoi ? tenHocVien(hoi.hs) : ""}
        size="sm"
      >
        {hoi?.kieu === "hoclai" ? (
          <>
            <p className="small" style={{ lineHeight: 1.6 }}>
              Học viên sẽ trở lại trạng thái <b>Đang học</b>, và ngày nghỉ cùng lý do
              nghỉ cũ sẽ được xoá khỏi hồ sơ.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <Button type="button" variant="ghost" onClick={() => setHoi(null)}>Đóng</Button>
              <Button
                type="button"
                variant="primary"
                loading={dangXuLy}
                onClick={() => xuLy(
                  () => nhanHocVienHocLai(hoi.hs.id),
                  `Đã nhận ${tenHocVien(hoi.hs)} học lại.`,
                )}
              >
                Nhận học lại
              </Button>
            </div>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              xuLy(
                () => choHocVienNghi(hoi.hs.id, { reason: lyDo.trim(), date: ngayNghi }),
                `Đã đánh dấu ${tenHocVien(hoi.hs)} nghỉ học.`,
              );
            }}
          >
            <p className="small muted" style={{ lineHeight: 1.6, marginBottom: 12 }}>
              Hồ sơ <b>không bị xoá</b> — bảng điểm, điểm danh và học phí của em giữ
              nguyên để còn tra lại. Em sẽ biến khỏi danh sách đang học và nằm ở
              bộ lọc <b>Nghỉ học</b>.
            </p>
            <Field label="Ngày nghỉ" required>
              <input type="date" value={ngayNghi} onChange={(e) => setNgayNghi(e.target.value)} />
            </Field>
            <Field label="Lý do nghỉ" required hint="Ghi rõ để sau này rà lại còn hiểu.">
              <textarea
                rows={3}
                value={lyDo}
                onChange={(e) => setLyDo(e.target.value)}
                placeholder="Ví dụ: gia đình chuyển nơi ở, xin nghỉ từ 01/09."
              />
            </Field>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <Button type="button" variant="ghost" onClick={() => setHoi(null)}>Đóng</Button>
              <Button type="submit" variant="danger" loading={dangXuLy} disabled={!lyDo.trim()}>
                Cho nghỉ
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
