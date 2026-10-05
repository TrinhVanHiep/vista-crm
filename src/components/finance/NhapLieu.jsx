import { useRef, useState } from "react";
import {
  LOAI_NHAP, loiApi, nhapFileTaiChinh, taiFileMau,
} from "../../services/financeService";
import { color, radius } from "./v3/theme";
import { Button, Drawer, NoteStrip, Pill } from "./v3/ui";

/**
 * Nhập liệu Tài chính từ Excel — bốn đường, mỗi đường một file mẫu.
 *
 * Luồng cố ý là hai bước rõ ràng: TẢI MẪU rồi mới CHỌN FILE. Cho tải file tuỳ ý
 * lên trước khi biết cần cột gì thì phần lớn lần nhập đầu sẽ hỏng, và người
 * dùng không hiểu vì sao.
 *
 * Kết quả in ra ĐẦY ĐỦ số dòng lỗi kèm SỐ DÒNG trong file, không gộp thành một
 * câu "có lỗi" — kế toán cần biết sửa dòng nào.
 */

/** Danh sách dòng kèm số dòng (và tên sheet với file nhiều sheet). */
function DanhSachDong({ tieuDe, ds, mau, chuThich }) {
  if (!ds?.length) return null;
  return (
    <>
      <div style={{ fontSize: 12.5, fontWeight: 700, margin: "12px 0 7px" }}>{tieuDe}</div>
      <div style={{
        maxHeight: 220, overflow: "auto",
        border: "1px solid " + color.border, borderRadius: radius.sm,
      }}>
        {ds.map((e, i) => (
          <div key={`${e.sheet || ""}-${e.row}-${i}`} style={{
            display: "flex", gap: 10, padding: "8px 11px", fontSize: 12.5,
            borderTop: i ? "1px solid " + color.border : "none",
          }}>
            <span style={{
              flex: "0 0 auto", fontWeight: 700, color: mau,
              fontVariantNumeric: "tabular-nums",
            }}>
              {e.sheet ? `${e.sheet}${e.row ? " · " : ""}` : ""}
              {e.row ? `Dòng ${e.row}` : (e.sheet ? "" : "—")}
            </span>
            <span style={{ color: color.ink70, lineHeight: 1.5 }}>{e.message}</span>
          </div>
        ))}
      </div>
      {chuThich ? (
        <div style={{ fontSize: 11.5, color: color.faint, marginTop: 8 }}>{chuThich}</div>
      ) : null}
    </>
  );
}

export default function NhapLieu({ mo, loaiBanDau, thang, nam, onDong, onXong }) {
  const [loai, setLoai] = useState(loaiBanDau || "phai-thu");
  const [dangTai, setDangTai] = useState("");
  const [dangNhap, setDangNhap] = useState(false);
  const [ketQua, setKetQua] = useState(null);
  const [loi, setLoi] = useState("");
  // Máy chủ nhận ra file thuộc loại khác (vd. file học phí gốc mỗi lớp một sheet
  // mà chọn "Khoản phải thu") → gợi ý loại đúng và cho gửi lại chính file đó.
  const [goiYLoai, setGoiYLoai] = useState("");
  const tepVuaChon = useRef(null);
  const oTep = useRef(null);

  const chon = LOAI_NHAP.find((x) => x.ma === loai) || LOAI_NHAP[0];

  const taiMau = async (ma, coDuLieu = false) => {
    setLoi("");
    setDangTai(coDuLieu ? `${ma}+` : ma);
    try {
      await taiFileMau(ma, { coDuLieu, thang, nam });
    } catch (e) {
      setLoi(loiApi(e, "Không tải được file mẫu."));
    } finally {
      setDangTai("");
    }
  };

  const gui = async (tep, loaiGui = loai) => {
    if (!tep) return;
    tepVuaChon.current = tep;
    setLoi("");
    setGoiYLoai("");
    setKetQua(null);
    setDangNhap(true);
    try {
      // Kỳ dùng cho khoản phải thu (dòng bỏ trống tháng/năm) và học phí theo
      // lớp (mọi khoản vào kỳ này). Gửi kèm luôn, backend tự bỏ qua với loại khác.
      const kq = await nhapFileTaiChinh(loaiGui, tep, { month: thang, year: nam });
      setKetQua(kq);
      if (kq.created_count > 0 || kq.updated_count > 0) onXong?.(kq.detail);
    } catch (e) {
      setLoi(loiApi(e, "Không nhập được file."));
      const goiY = e?.response?.data?.goi_y_loai;
      setGoiYLoai(typeof goiY === "string" ? goiY : Array.isArray(goiY) ? String(goiY[0] || "") : "");
    } finally {
      setDangNhap(false);
      // Xoá ô file để chọn lại đúng file vừa rồi vẫn kích hoạt onChange.
      if (oTep.current) oTep.current.value = "";
    }
  };

  if (!mo) return null;

  return (
    <Drawer
      title="Nhập liệu từ Excel"
      sub="Tải file mẫu, điền dữ liệu rồi tải lên. Một dòng hỏng không làm hỏng cả lần nhập."
      width={620}
      onClose={onDong}
      footer={<Button variant="ghost" onClick={onDong}>Đóng</Button>}
    >
      {/* Bước 1 — chọn loại dữ liệu */}
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>1. Chọn loại dữ liệu</div>
      <div style={{ display: "grid", gap: 10, marginBottom: 22 }}>
        {LOAI_NHAP.map((x) => {
          const dang = x.ma === loai;
          return (
            <button
              key={x.ma}
              type="button"
              onClick={() => { setLoai(x.ma); setKetQua(null); setLoi(""); setGoiYLoai(""); }}
              style={{
                textAlign: "left", cursor: "pointer", width: "100%",
                background: dang ? color.orangeSoft : "#fff",
                border: "1px solid " + (dang ? color.orange : color.border),
                borderRadius: radius.md, padding: "12px 14px",
              }}
            >
              <div style={{
                fontSize: 13.5, fontWeight: 700,
                color: dang ? color.orange : color.ink,
              }}>{x.ten}</div>
              <div style={{ fontSize: 12, color: color.muted, marginTop: 3, lineHeight: 1.5 }}>
                {x.mo}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bước 2 — tải mẫu */}
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
        2. Tải file mẫu <span style={{ fontWeight: 500, color: color.muted }}>— {chon.ten}</span>
      </div>
      <div style={{
        border: "1px solid " + color.border, borderRadius: radius.md,
        padding: "13px 15px", marginBottom: 22,
      }}>
        <div style={{ fontSize: 12, color: color.muted, lineHeight: 1.6, marginBottom: 11 }}>
          Các cột trong mẫu:
          <div style={{ color: color.ink70, marginTop: 4 }}>{chon.cot}</div>
        </div>
        {chon.goiY ? (
          <div style={{
            fontSize: 12, color: color.ink70, lineHeight: 1.6, marginBottom: 11,
            background: color.orangeSoft, borderRadius: radius.sm, padding: "9px 11px",
          }}>
            {chon.goiY} Kỳ ghi công nợ: <b>{String(thang).padStart(2, "0")}/{nam}</b>.
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            variant="outline"
            onClick={() => taiMau(chon.ma)}
            disabled={!!dangTai}
            style={{ padding: "8px 14px", fontSize: 12.5 }}
          >
            {dangTai === chon.ma ? "Đang tải..." : "Tải mẫu trống"}
          </Button>
          {/* Mẫu điền sẵn HỌC VIÊN THẬT của trung tâm: tải về là nhập lên được
              ngay để nhìn thấy giao diện, khỏi phải tự gõ danh sách. */}
          <Button
            variant="ghost"
            onClick={() => taiMau(chon.ma, true)}
            disabled={!!dangTai}
            style={{ padding: "8px 14px", fontSize: 12.5 }}
          >
            {dangTai === `${chon.ma}+` ? "Đang tải..." : "Tải mẫu có sẵn dữ liệu"}
          </Button>
        </div>
        <div style={{ fontSize: 11.5, color: color.faint, marginTop: 9, lineHeight: 1.55 }}>
          “Có sẵn dữ liệu” điền học viên thật của trung tâm vào kỳ đang chọn
          ({String(thang).padStart(2, "0")}/{nam}), <b>số tiền chỉ là con số gợi ý</b> để
          xem thử giao diện — sửa lại theo mức thu thật trước khi tải lên.
        </div>
      </div>

      {/* Bước 3 — tải file lên */}
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>3. Tải file đã điền lên</div>
      <div style={{
        border: "1px dashed " + color.borderStrong, borderRadius: radius.md,
        padding: "18px 15px", textAlign: "center", marginBottom: 18,
      }}>
        <input
          ref={oTep}
          type="file"
          accept=".xlsx,.xlsm"
          onChange={(e) => gui(e.target.files?.[0])}
          disabled={dangNhap}
          style={{ fontSize: 13 }}
        />
        <div style={{ fontSize: 11.5, color: color.faint, marginTop: 8 }}>
          {dangNhap ? "Đang đọc file, chờ một chút..." : "Chỉ nhận .xlsx"}
        </div>
      </div>

      {loi ? (
        <div style={{
          background: color.redSoft, color: color.red, borderRadius: radius.md,
          padding: "12px 14px", fontSize: 13, marginBottom: 16, lineHeight: 1.5,
        }}>
          {loi}
          {goiYLoai && tepVuaChon.current ? (
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                onClick={() => { setLoai(goiYLoai); gui(tepVuaChon.current, goiYLoai); }}
                style={{
                  border: 0, borderRadius: radius.md, padding: "8px 14px", cursor: "pointer",
                  background: color.orange, color: "#fff", fontWeight: 700, fontSize: 13,
                }}
              >
                Nhập bằng loại “{(LOAI_NHAP.find((x) => x.ma === goiYLoai) || {}).ten || goiYLoai}” với file này
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {ketQua ? (
        <div style={{
          border: "1px solid " + color.border, borderRadius: radius.md,
          padding: "14px 16px", marginBottom: 18,
        }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <Pill tone="green">Đã nhập {ketQua.created_count || 0} dòng</Pill>
            {ketQua.updated_count ? <Pill tone="green">Bổ sung {ketQua.updated_count} dòng</Pill> : null}
            {ketQua.error_count ? <Pill tone="red">{ketQua.error_count} dòng lỗi</Pill> : null}
            {ketQua.skipped_count ? <Pill tone="amber">{ketQua.skipped_count} dòng bỏ qua</Pill> : null}
            {ketQua.warning_count ? <Pill tone="amber">{ketQua.warning_count} cảnh báo</Pill> : null}
          </div>

          {ketQua.sheets?.length ? (
            <div style={{ fontSize: 12, color: color.ink70, lineHeight: 1.6 }}>
              {ketQua.sheets.length} sheet lớp · {ketQua.payment_count || 0} phiếu thu ·{" "}
              {ketQua.adjustment_count || 0} khoản ưu đãi/học bổng
              {ketQua.note ? <div style={{ color: color.orange, marginTop: 4 }}>{ketQua.note}</div> : null}
            </div>
          ) : null}

          <DanhSachDong
            tieuDe="Dòng cần sửa rồi nhập lại"
            ds={ketQua.errors}
            mau={color.red}
            chuThich={"Chỉ những dòng này chưa vào; các dòng còn lại đã được ghi nhận. "
              + "Sửa trong file rồi tải lên lại — đừng xoá các dòng đã vào, hệ thống "
              + "sẽ bỏ qua phần đã nhập chứ không ghi hai lần."}
          />
          <DanhSachDong tieuDe="Cảnh báo — đã nhập, nên kiểm tra lại" ds={ketQua.warnings} mau={color.orange} />
          <DanhSachDong tieuDe="Dòng bỏ qua" ds={ketQua.skipped} mau={color.muted} />
          <DanhSachDong
            tieuDe="Sheet không nhập"
            ds={(ketQua.skipped_sheets || []).map((x) => ({ sheet: x.sheet, message: x.reason }))}
            mau={color.muted}
          />
        </div>
      ) : null}

      <NoteStrip>
        Dữ liệu nhập vào đi qua đúng luật như nhập tay: không ghi được vào kỳ đã khóa sổ,
        không phân bổ vượt số còn nợ, và mỗi phiếu thu sinh đúng một dòng trong Sổ giao dịch.
        Mọi lần nhập đều được ghi vào nhật ký thao tác.
      </NoteStrip>
    </Drawer>
  );
}
