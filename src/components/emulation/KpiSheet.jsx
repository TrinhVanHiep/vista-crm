import "../../styles/emulationRedesign.css";
import {
  ICON_NHOM_2, IcBanhRang, IcBongDen, IcCheck, IcCongTron, IcCupSao, IcDat, IcExcel,
  IcLoa, IcNguoi, IcNguoiVien, IcPDF, IcSao, IcSaoTron, IcTruTron,
} from "./KpiIcons2";

/**
 * KpiSheet — phần HIỂN THỊ của màn "Báo cáo thi đua tháng" (UI mới).
 *
 * Tách hẳn khỏi KpiScoreBoard.jsx: component này KHÔNG gọi API, không giữ state
 * chấm điểm. Nó nhận đúng những gì KpiScoreBoard đã tính sẵn (dsNhom, theoNhom,
 * tong, quyTac, phieu…) rồi dựng lại đúng bố cục bản thiết kế.
 *
 * Nhờ vậy toàn bộ logic tải/lưu/ký duyệt ở KpiScoreBoard giữ nguyên, chỉ đổi lớp
 * vỏ giao diện — và nếu cần quay lại UI cũ thì chỉ việc bỏ component này ra.
 */

const soGon = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? String(Number(n.toFixed(2))) : "0";
};
const hienSo = (v) => (v === null || v === undefined || v === "" ? "—" : String(Number(v)));

/** Màu chữ của ô "Điểm cộng / Điểm trừ / Điểm trần" trên dải chỉ số. */
const MAU_TONG = { bonus: "green", penalty: "red", cap: "orange" };

function StatNhom({ Ico, nhan, dat, toiDa }) {
  return (
    <div className="kpi2-stat">
      {Ico ? <Ico /> : null}
      <div>
        <div className="kpi2-stat__lb">{nhan}</div>
        <div className="kpi2-stat__val">
          {soGon(dat)} <small>/ {soGon(toiDa)}</small>
        </div>
      </div>
    </div>
  );
}

function StatGon({ ico, nhan, giaTri, mau }) {
  return (
    <div className="kpi2-stat kpi2-stat--tight">
      {ico}
      <div>
        <div className="kpi2-stat__lb">{nhan}</div>
        <div className={`kpi2-stat__val ${mau}`}>{giaTri}</div>
      </div>
    </div>
  );
}

/** Bảng điểm cộng hoặc điểm trừ — cùng cấu trúc, khác tone màu. */
function BangDieuChinh({ loai, nhan, quyTac, tran, dangCham, nhapGhiNhan = {}, onDoiGhiNhan }) {
  const dau = loai === "plus" ? "+" : "-";
  return (
    <div className={`kpi2-adj kpi2-adj--${loai}${dangCham ? " kpi2-adj--cham" : ""}`}>
      <div className="kpi2-adj__h">
        {loai === "plus" ? <IcCongTron w={21} /> : <IcTruTron w={21} />}
        {nhan}
      </div>
      <div className="kpi2-adj__cols kpi2-adj__hd">
        <span>STT</span><span>Tiêu chí</span><span>Cách tính</span><span>Trần</span>
        {dangCham ? <span>Ghi nhận</span> : null}
      </div>
      {quyTac.map((r, i) => (
        <div className="kpi2-adj__cols kpi2-adj__r" key={r.id ?? i}>
          <span className="kpi2-adj__no">{i + 1}</span>
          <span className="kpi2-adj__t">{r.title || r.name || "—"}</span>
          <span className="kpi2-adj__how">{r.description || r.formula || "—"}</span>
          <span className="kpi2-adj__cap">{soGon(r.cap ?? r.max_points ?? 5)}</span>
          {dangCham ? (
          <span className="kpi2-adj__got">
            {onDoiGhiNhan ? (
              <input
                type="number"
                min="0"
                max={Number(r.cap ?? r.max_points ?? 5)}
                step="any"
                value={nhapGhiNhan[r.id] ?? ""}
                onChange={(e) => onDoiGhiNhan(r.id, e.target.value)}
              />
            ) : (
              <span>{nhapGhiNhan[r.id] ? `${dau}${soGon(nhapGhiNhan[r.id])}` : "—"}</span>
            )}
          </span>
          ) : null}
        </div>
      ))}
      <div className="kpi2-adj__f">
        <span>Tổng điểm {loai === "plus" ? "cộng" : "trừ"} tối đa:</span>
        <b>{dau === "+" ? soGon(tran) : soGon(tran)}</b>
      </div>
    </div>
  );
}

export default function KpiSheet({
  month,
  year,
  phieu,
  dsNhom = [],
  theoNhom = {},
  tong = {},
  diemTheoTieuChi,
  quyTacCong = [],
  quyTacTru = [],
  oDuyet = [],
  thangXepLoai = [],
  tranCong = 15,
  tranTru = 15,
  diemTran = 115,
  tongTieuChi = 100,
  nguoiDung = {},
  ghiChuChung = "",
  onGhiChuChung,
  onXuatBaoCao,
  onNopBaoCao,
  // Móc THÊM so với gói gốc: bản gốc không có nút vào chế độ chấm điểm nên
  // giáo viên không có đường nào để nhập điểm.
  onChamDiem,
  // Bản mẫu dựng cho một trang đứng riêng nên có sẵn breadcrumb, chuông và
  // avatar. Khi nhúng vào khung ứng dụng thì ba thứ đó TRÙNG với thanh trên
  // cùng — màn hình thành hai chuông, hai avatar, hai breadcrumb.
  nhungTrongKhung = false,
  // Nhãn + tông màu của trạng thái ký, do KpiScoreBoard truyền sang.
  nhanQuyetDinh = {},
  // Nhãn trạng thái phiếu (Nháp / Chờ duyệt / Đã duyệt...) — bản mẫu không có
  // chỗ nào hiện trạng thái nên người dùng không biết mình đã nộp hay chưa.
  nhanTrangThai = {},
  // Điểm GV tự chấm + nhãn đối chiếu hai cột, để giáo viên biết mình bị hạ điểm.
  trangThaiDong,
  // Ô nhập của người duyệt: điểm/xếp loại đề xuất và ý kiến. Bản mẫu chỉ có chỗ
  // HIỂN THỊ nên bấm "Yêu cầu chỉnh sửa" sẽ gửi đi lý do rỗng, giáo viên nhận
  // phiếu trả về mà không biết phải sửa gì.
  nhapDuyet = {},
  onDoiDuyet,
  dangKy = "",
  // Chấm điểm NGAY TRONG màn này thay vì nhảy sang một giao diện khác.
  dangCham = false,
  suaDuocTuCham = false,
  suaDuocQuanLy = false,
  suaDuocDieuChinh = false,
  nhapTuCham = {},
  nhapQuanLy = {},
  nhapGhiNhan = {},
  onDoiTuCham,
  onDoiQuanLy,
  onDoiGhiNhan,
  onLuuDiem,
  onHuyCham,
  dangLuu = false,
  onDuyet,
  onYeuCauSua,
  onXuatPDF,
  onXuatExcel,
  fixed = true,
}) {
  const thang = String(month).padStart(2, "0");

  return (
    <div className={`kpi2${fixed ? " kpi2--fixed" : ""}`}>
      {/* ── tiêu đề trang ── */}
      <div className="kpi2-head">
        <div className="kpi2-head__t">
          {nhungTrongKhung ? null : (
            <h1>
              BÁO CÁO THI ĐUA THÁNG {thang}/{year}
              {phieu?.status ? (
                <span className="kpi2-appr__st kpi2-status" data-tt={phieu.status}>
                  {nhanTrangThai[phieu.status] || phieu.status}
                </span>
              ) : null}
            </h1>
          )}
          {nhungTrongKhung ? null : (
          <div className="kpi2-crumb">
            <span>Trang chủ</span><i>›</i><span>KPI &amp; Đánh giá</span><i>›</i><span>Báo cáo thi đua</span>
          </div>
          )}
        </div>
        <div className="kpi2-acts kpi2-noprint">
          {dangCham ? (
            <>
              <button type="button" className="kpi2-btn kpi2-btn--ghost" onClick={onHuyCham}>
                Huỷ
              </button>
              <button
                type="button"
                className="kpi2-btn kpi2-btn--primary"
                disabled={dangLuu}
                onClick={onLuuDiem}
              >
                {dangLuu ? "Đang lưu..." : "Lưu điểm"}
              </button>
            </>
          ) : null}
          {!dangCham && onChamDiem ? (
            <button type="button" className="kpi2-btn kpi2-btn--ghost" onClick={onChamDiem}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4z" />
              </svg>
              Chấm điểm
            </button>
          ) : null}
          <button type="button" className="kpi2-btn kpi2-btn--ghost" onClick={onXuatBaoCao}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3.6v10.8M7.6 10.4 12 14.8l4.4-4.4M4.4 19.2h15.2" />
            </svg>
            Xuất báo cáo
          </button>
          {onNopBaoCao ? (
          <button type="button" className="kpi2-btn kpi2-btn--primary" onClick={onNopBaoCao}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 14.4V3.6M7.6 8 12 3.6 16.4 8M4.4 19.2h15.2" />
            </svg>
            Nộp báo cáo
          </button>
          ) : null}
          {nhungTrongKhung ? null : (<>
          <span className="kpi2-bell">
            <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="#3B4165" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.2 15.6V10a6.2 6.2 0 1 0-12.4 0v5.6L4 18h16z" /><path d="M9.6 18a2.4 2.4 0 0 0 4.8 0" />
            </svg>
            {nguoiDung.thongBao ? <b>{nguoiDung.thongBao}</b> : null}
          </span>
          <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="#3B4165" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.6 9.4a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1.1 1-1.1 1.8v.3" />
            <circle cx="12" cy="17" r=".9" fill="#3B4165" stroke="none" />
          </svg>
          <span className="kpi2-user">
            {nguoiDung.anh ? <img src={nguoiDung.anh} alt="" /> : null}
            <span>{nguoiDung.ten || phieu?.owner_name || "—"}</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#8A8FA3" strokeWidth="2.2" strokeLinecap="round"><path d="m6 9.5 6 6 6-6" /></svg>
          </span>
          </>)}
        </div>
      </div>

      {/* ── dải chỉ số ── */}
      <div className="kpi2-strip">
        {dsNhom.slice(0, 4).map((g) => {
          const t = theoNhom[g.code] || {};
          const Ico = ICON_NHOM_2[g.code] || IcNguoi;
          return <StatNhom key={g.id} Ico={Ico} nhan={g.name} dat={t.final} toiDa={t.max ?? g.max_score} />;
        })}
        <StatNhom Ico={IcCupSao} nhan="Điểm KPI tháng" dat={tong.criteria_total} toiDa={tongTieuChi} />
        <StatGon ico={<IcCongTron />} nhan="Điểm cộng" giaTri={`+${soGon(tong.bonus_total)}`} mau={MAU_TONG.bonus} />
        <StatGon ico={<IcTruTron />} nhan="Điểm trừ" giaTri={`-${soGon(tong.penalty_total)}`} mau={MAU_TONG.penalty} />
        <StatGon ico={<IcSaoTron />} nhan="Điểm trần" giaTri={diemTran} mau={MAU_TONG.cap} />
      </div>

      {/* ── cột trái: bảng chấm điểm · cột phải: điểm cộng/trừ ── */}
      <div className="kpi2-main">
        <section className="kpi2-card" data-screen-label="01">
          <h2 className="kpi2-card__h">1.&nbsp;&nbsp;BẢNG CHẤM ĐIỂM THI ĐUA THÁNG {month}</h2>
          <div className="kpi2-tbl__cols kpi2-tbl__hd">
            <span>STT</span><span>Nhóm chủ đề</span><span>#</span><span>Tiêu chí</span>
            <span>Mô tả / Chỉ mục tháng {month}</span><span>Điểm tối đa</span><span>Điểm đạt</span><span>Trạng thái</span>
          </div>

          {dsNhom.map((g, gi) => {
            const t = theoNhom[g.code] || {};
            const Ico = ICON_NHOM_2[g.code] || IcNguoi;
            return (
              <div className="kpi2-grp" key={g.id}>
                <div className="kpi2-grp__no">{gi + 1}</div>
                <div className="kpi2-grp__id">
                  <Ico w={27} />
                  <span>{g.name}</span>
                  <span>{soGon(t.max ?? g.max_score)} điểm</span>
                </div>
                <div>
                  {(g.criteria || []).map((c, i) => {
                    const dong = diemTheoTieuChi?.get?.(c.id);
                    const dat = dong?.manager_score ?? dong?.self_score;
                    const daDat = dat != null && Number(dat) >= Number(c.max_score);
                    const tt = trangThaiDong ? trangThaiDong(dong) : null;
                    return (
                      <div className="kpi2-row" key={c.id}>
                        <span className="kpi2-row__i">{i + 1}</span>
                        <span className={`kpi2-row__t${(c.title || "").length > 26 ? " kpi2-row__t--wrap" : ""}`}>{c.title}</span>
                        <span className="kpi2-row__d">{c.description || "—"}</span>
                        <span>{soGon(c.max_score)} điểm</span>
                        <span className="kpi2-row__got">
                          {suaDuocQuanLy ? (
                            <input
                              className="kpi2-inp"
                              type="number"
                              min="0"
                              max={Number(c.max_score)}
                              step="any"
                              value={nhapQuanLy[c.id] ?? ""}
                              onChange={(e) => onDoiQuanLy?.(c.id, e.target.value)}
                            />
                          ) : suaDuocTuCham ? (
                            <input
                              className="kpi2-inp"
                              type="number"
                              min="0"
                              max={Number(c.max_score)}
                              step="any"
                              value={nhapTuCham[c.id] ?? ""}
                              onChange={(e) => onDoiTuCham?.(c.id, e.target.value)}
                            />
                          ) : (
                            <>{hienSo(dat)}{dat != null ? " điểm" : ""}</>
                          )}
                          {/* Khi quản lý chấm lại, điểm giáo viên tự chấm bị
                              nuốt mất — giáo viên không biết mình bị hạ bao
                              nhiêu, mà đối chiếu hai cột mới là mục đích chính
                              của màn này. */}
                          {dong?.manager_score != null && dong?.self_score != null ? (
                            <small className="kpi2-row__gv">GV: {soGon(dong.self_score)}</small>
                          ) : null}
                        </span>
                        <span className="kpi2-row__st">
                          {tt ? (
                            <span className="kpi2-appr__st" data-tone={tt.tone}>{tt.nhan}</span>
                          ) : daDat ? (
                            <><IcDat /><b>Đạt</b></>
                          ) : (
                            <span style={{ color: "#B5A899" }}>—</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                  <div className="kpi2-sum">
                    Tổng điểm {g.name}: &nbsp;&nbsp;{soGon(t.final)} điểm
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="kpi2-card" data-screen-label="02">
          <h2 className="kpi2-card__h kpi2-card__h--md">2.&nbsp;&nbsp;ĐIỂM CỘNG / ĐIỂM TRỪ</h2>
          <BangDieuChinh loai="plus" nhan={`A.  Điểm cộng (tối đa +${tranCong} điểm)`} quyTac={quyTacCong}
            dangCham={suaDuocDieuChinh}
            nhapGhiNhan={nhapGhiNhan}
            onDoiGhiNhan={onDoiGhiNhan} tran={tranCong} />
          <BangDieuChinh loai="minus" nhan={`B.  Điểm trừ (tối đa –${tranTru} điểm)`} quyTac={quyTacTru}
            dangCham={suaDuocDieuChinh}
            nhapGhiNhan={nhapGhiNhan}
            onDoiGhiNhan={onDoiGhiNhan} tran={tranTru} />
        </section>
      </div>

      {/* ── hàng dưới: phê duyệt · ghi chú · thang xếp loại ── */}
      <div className="kpi2-bottom">
        <section className="kpi2-card" data-screen-label="03">
          <h2 className="kpi2-card__h kpi2-card__h--sm">3.&nbsp;&nbsp;PHÊ DUYỆT</h2>
          <div className="kpi2-appr">
            {oDuyet.map((o) => {
              // Bản mẫu để ô "Điểm đề xuất" TRỐNG và luôn hiện hai nút. Phải đọc
              // trạng thái ký thật, nếu không người xem không biết cấp nào đã ký,
              // và người không có quyền vẫn thấy nút bấm vào không có tác dụng.
              const daKy = (phieu?.approvals || []).find((a) => a.stage === o.stage);
              const quyetDinh = daKy?.decision || "pending";
              const daXong = quyetDinh !== "pending";
              return (
              <div className="kpi2-appr__c" key={o.stage}>
                <div className="kpi2-appr__t" style={{ color: o.mau }}>
                  <IcNguoiVien mau={o.mau} />
                  {o.ten}
                  <span className="kpi2-appr__st" data-tt={quyetDinh}>
                    {nhanQuyetDinh[quyetDinh] || quyetDinh}
                  </span>
                </div>
                <div className="kpi2-appr__d">{o.moTa}</div>
                {onDuyet && !daXong && onDoiDuyet ? (
                  <div className="kpi2-appr__in">
                    <label>
                      {o.kieu === "xep_loai" ? "Xếp loại đề xuất" : `Điểm đề xuất /${tongTieuChi}`}
                      {o.kieu === "xep_loai" ? (
                        <select
                          value={nhapDuyet[o.stage]?.xepLoai ?? ""}
                          onChange={(e) => onDoiDuyet(o.stage, "xepLoai", e.target.value)}
                        >
                          <option value="">— chọn —</option>
                          {thangXepLoai.map((x) => (
                            <option key={x.ten} value={x.ten}>{x.ten}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          max={tongTieuChi}
                          step="any"
                          value={nhapDuyet[o.stage]?.diem ?? ""}
                          onChange={(e) => onDoiDuyet(o.stage, "diem", e.target.value)}
                        />
                      )}
                    </label>
                    <label>
                      Ý kiến
                      <input
                        type="text"
                        placeholder="Bắt buộc khi yêu cầu sửa"
                        value={nhapDuyet[o.stage]?.ghiChu ?? ""}
                        onChange={(e) => onDoiDuyet(o.stage, "ghiChu", e.target.value)}
                      />
                    </label>
                  </div>
                ) : (
                <div className="kpi2-appr__f">
                  {o.kieu === "xep_loai" ? "Xếp loại đề xuất:" : "Điểm đề xuất:"}
                  <i>
                    {o.kieu === "xep_loai"
                      ? daKy?.suggested_rating || ""
                      : daKy?.suggested_score === null || daKy?.suggested_score === undefined
                        ? ""
                        : soGon(daKy.suggested_score)}
                  </i>
                  {o.kieu === "xep_loai" ? null : `/${tongTieuChi}`}
                </div>
                )}
                {onDuyet && !daXong ? (
                <div className="kpi2-appr__b kpi2-noprint">
                  <button
                    type="button"
                    className="kpi2-ok"
                    disabled={!!dangKy}
                    onClick={() => onDuyet?.(o.stage)}
                  >
                    <IcCheck />{dangKy === `${o.stage}-approved` ? "Đang gửi..." : "Duyệt"}
                  </button>
                  <button
                    type="button"
                    className="kpi2-fix"
                    disabled={!!dangKy}
                    onClick={() => onYeuCauSua?.(o.stage)}
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#E8342B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16.4 3.8a2 2 0 0 1 2.8 2.8L8.4 17.4l-4 1.2 1.2-4z" />
                    </svg>
                    Yêu cầu chỉnh sửa
                  </button>
                </div>
                ) : null}
                {daKy?.note ? <div className="kpi2-appr__note">{daKy.note}</div> : null}
              </div>
              );
            })}
          </div>
        </section>

        <section className="kpi2-card" data-screen-label="04">
          <h2 className="kpi2-card__h kpi2-card__h--sm">4.&nbsp;&nbsp;GHI CHÚ CHUNG</h2>
          <textarea
            className="kpi2-note"
            placeholder="Nhập ghi chú của giáo viên..."
            value={ghiChuChung}
            onChange={(e) => onGhiChuChung?.(e.target.value)}
            readOnly={!onGhiChuChung}
          />
          <div className="kpi2-exp kpi2-noprint">
            <button type="button" onClick={onXuatPDF}><IcPDF />Xuất PDF</button>
            <button type="button" onClick={onXuatExcel}><IcExcel />Xuất Excel</button>
          </div>
        </section>

        <section className="kpi2-card" data-screen-label="05">
          <h2 className="kpi2-card__h kpi2-card__h--sm">5.&nbsp;&nbsp;THANG ĐIỂM XẾP LOẠI</h2>
          <div className="kpi2-scale">
            {thangXepLoai.map((x) => {
              const [tu, den] = String(x.mo_ta).split(/\s*[-–]\s*/);
              const gopMotDong = !den;
              return (
                <div
                  className={`kpi2-scale__r${x.ten === tong.rating ? " is-current" : ""}`}
                  key={x.ten}
                >
                  <span className="kpi2-scale__s">
                    {[1, 2, 3, 4, 5].map((i) => <IcSao key={i} day={i <= x.sao} />)}
                  </span>
                  {gopMotDong ? (
                    <span className="wide">{x.ten}: {x.mo_ta}</span>
                  ) : (
                    <><span>{x.ten}:</span><span>{x.mo_ta}</span></>
                  )}
                </div>
              );
            })}
          </div>
          {/* Kết luận của cả phiếu. Bản mẫu chỉ có các số thành phần (tiêu chí,
              cộng, trừ) mà không có điểm chốt và xếp loại — người xem phải tự
              cộng trừ nhẩm mới biết kết quả tháng của mình. */}
          {tong.final_total !== undefined && tong.final_total !== null ? (
            <div className="kpi2-final">
              Điểm chốt tháng {thang}/{year}: <b>{soGon(tong.final_total)}</b> điểm
              {tong.rating ? <> — xếp loại <b>{tong.rating}</b></> : null}
              <small>
                (tiêu chí {soGon(tong.criteria_total)} + cộng {soGon(tong.bonus_total)} − trừ{" "}
                {soGon(tong.penalty_total)})
              </small>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
