import { useCallback, useEffect, useState } from "react";
import {
  dinhDangTien, khoaKy, kiemTraDongSo, layDanhSachKy, layNhatKy, loiApi,
  moLaiKy, taoKy, tongHopCongNo, tongHopSo,
} from "../../services/financeService";
import { Badge, Button, Card } from "../../ui";
import Ico from "./Ico";
import TheSo, { HangThe } from "./TheSo";

/**
 * Phân hệ "Báo cáo & Đóng sổ".
 *
 * Nút đóng sổ KHÔNG bao giờ đóng thẳng: bấm vào là chạy kiểm tra điều kiện
 * trước, còn thiếu gì thì nói rõ thiếu gì. Đóng sổ nhầm rồi mở lại được, nhưng
 * lần mở nào cũng phải ghi lý do và để lại dấu vết trong nhật ký.
 */

const thoiDiem = (s) => {
  if (!s) return "";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
    + ` ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function DongSo({ thang, nam, onNotice, laQuanTri }) {
  const [ky, setKy] = useState(null);
  const [kiemTra, setKiemTra] = useState(null);
  const [soLieu, setSoLieu] = useState({ so: null, congNo: null });
  const [nhatKy, setNhatKy] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loi, setLoi] = useState("");
  const [taiLai, setTaiLai] = useState(0);

  const tai = useCallback(async () => {
    setDangTai(true);
    setLoi("");
    try {
      const ds = await layDanhSachKy();
      let k = ds.find((x) => x.period_month === thang && x.period_year === nam);
      if (!k) {
        // Kỳ chưa tồn tại là chuyện bình thường — chưa có giao dịch nào thì
        // chưa ai tạo. Tạo sẵn để màn hình có gì mà hiển thị.
        k = await taoKy({ period_month: thang, period_year: nam });
      }
      setKy(k);
      const [kt, so, cn, log] = await Promise.all([
        kiemTraDongSo(k.id),
        tongHopSo({ month: thang, year: nam }),
        tongHopCongNo({ month: thang, year: nam }),
        layNhatKy({ page_size: 25 }),
      ]);
      setKiemTra(kt);
      setSoLieu({ so, congNo: cn });
      setNhatKy(Array.isArray(log) ? log : log?.results || []);
    } catch (e) {
      setLoi(loiApi(e, "Không tải được dữ liệu đóng sổ."));
    } finally {
      setDangTai(false);
    }
  }, [thang, nam, taiLai]);

  useEffect(() => { tai(); }, [tai]);

  const khoa = async () => {
    setLoi("");
    setDangXuLy(true);
    try {
      await khoaKy(ky.id);
      onNotice?.(`Đã khóa sổ kỳ ${String(thang).padStart(2, "0")}/${nam}.`);
      setTaiLai((v) => v + 1);
    } catch (e) {
      setLoi(loiApi(e, "Chưa đóng sổ được."));
    } finally {
      setDangXuLy(false);
    }
  };

  const moLai = async () => {
    const ly_do = window.prompt(
      "Mở lại kỳ đã khóa phải ghi lý do (sẽ lưu vào nhật ký):", "",
    );
    if (ly_do === null) return;
    setLoi("");
    setDangXuLy(true);
    try {
      await moLaiKy(ky.id, ly_do);
      onNotice?.("Đã mở lại kỳ.");
      setTaiLai((v) => v + 1);
    } catch (e) {
      setLoi(loiApi(e, "Không mở lại được kỳ."));
    } finally {
      setDangXuLy(false);
    }
  };

  // Sổ gồm cả thu ngoài học phí nên chỉ cần KHÔNG THIẾU so với phiếu thu;
  // thiếu mới là dấu hiệu có phiếu thu không sinh được dòng sổ.
  const khopSo = soLieu.so?.thu_khop_phieu !== false;

  const daKhoa = ky?.status === "closed";
  const duDieuKien = kiemTra?.du_dieu_kien;

  return (
    <>
      {loi ? <div className="alert red" style={{ marginBottom: 12 }}><span>⚠️</span><div>{loi}</div></div> : null}

      <HangThe>
        <TheSo ico="check" mau="xanh" nhan="Tổng thu trong kỳ"
               so={`${dinhDangTien(soLieu.so?.tong_thu)} đ`} />
        <TheSo ico="wallet" mau="do" nhan="Tổng chi trong kỳ"
               so={`${dinhDangTien(soLieu.so?.tong_chi)} đ`} />
        <TheSo ico="chart" mau="cam" nhan="Chênh lệch"
               so={`${dinhDangTien(soLieu.so?.chenh_lech)} đ`} />
        <TheSo ico="lock" mau={daKhoa ? "xanh" : "vang"} nhan="Trạng thái kỳ"
               so={dangTai ? "..." : (ky?.status === "closed" ? "Đã khóa" : "Đang mở")}
               phu={daKhoa ? `${ky.closed_by_name || ""} ${thoiDiem(ky.closed_at)}`.trim() : "Chưa đóng sổ"} />
      </HangThe>

      <div className="fin-21" style={{ marginTop: 16 }}>
        <Card title={<div><h3>Điều kiện đóng sổ {String(thang).padStart(2, "0")}/{nam}</h3>
          <div className="sub">Còn việc dang dở thì hệ thống không cho khóa — khóa nhầm rồi gỡ ra rất tốn công.</div></div>}>
          {dangTai ? (
            <div className="fin-pb__trong">Đang kiểm tra...</div>
          ) : (
            <>
              <div className="fin-viec">
                {(kiemTra?.con_thieu || []).length === 0 ? (
                  <div className="fin-viec__d">
                    <div className="fin-viec__ico fin-viec__ico--ok"><Ico ten="check" co={15} /></div>
                    <div>
                      <b>Đủ điều kiện đóng sổ</b>
                      <small>Đã đối soát hết giao dịch ngân hàng, không còn tiền chưa phân bổ
                        và không còn khoản giảm trừ chờ duyệt.</small>
                    </div>
                  </div>
                ) : (
                  kiemTra.con_thieu.map((v) => (
                    <div className="fin-viec__d" key={v}>
                      <div className="fin-viec__ico fin-viec__ico--cho"><Ico ten="alert" co={15} /></div>
                      <div>
                        <b>{v}</b>
                        <small>Xử lý xong mục này rồi quay lại đóng sổ.</small>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {daKhoa ? (
                  <>
                    <Badge tone="green">Kỳ đã khóa — không ghi thêm giao dịch được</Badge>
                    {laQuanTri ? (
                      <Button onClick={moLai} loading={dangXuLy}>Mở lại kỳ</Button>
                    ) : null}
                  </>
                ) : laQuanTri ? (
                  <Button variant="primary" onClick={khoa} loading={dangXuLy} disabled={!duDieuKien}>
                    {duDieuKien ? "Đóng sổ kỳ này" : "Chưa đủ điều kiện đóng sổ"}
                  </Button>
                ) : (
                  <span className="fin-mo" style={{ fontSize: 13 }}>
                    Việc đóng sổ do tầng quản trị thực hiện.
                  </span>
                )}
              </div>
            </>
          )}
        </Card>

        <div className="fin-cot">
          <Card title={<div><h3>Đối chiếu sổ</h3>
            <div className="sub">Hai số cùng tính theo NGÀY NỘP TIỀN nên bắt buộc phải khớp.</div></div>}>
            <div className="fin-viec">
              <div className="fin-viec__d">
                <div className="fin-viec__ico fin-viec__ico--ok"><Ico ten="receipt" co={15} /></div>
                <div>
                  <b>Tổng thu trên sổ giao dịch</b>
                  <small className="fin-tien">{dinhDangTien(soLieu.so?.tong_thu)} đ</small>
                </div>
              </div>
              <div className="fin-viec__d">
                <div className="fin-viec__ico fin-viec__ico--ok"><Ico ten="receipt" co={15} /></div>
                <div>
                  <b>Tổng các phiếu thu trong kỳ</b>
                  <small className="fin-tien">{dinhDangTien(soLieu.so?.tong_phieu_thu)} đ</small>
                </div>
              </div>
              <div className="fin-viec__d">
                <div className={`fin-viec__ico fin-viec__ico--${khopSo ? "ok" : "cho"}`}>
                  <Ico ten={khopSo ? "check" : "alert"} co={15} />
                </div>
                <div>
                  <b>{khopSo ? "Sổ khớp phiếu thu" : "Sổ chưa khớp phiếu thu"}</b>
                  <small>
                    {khopSo
                      ? "Phần chênh là các khoản thu ngoài học phí ghi thẳng vào sổ."
                      : `Sổ đang thiếu ${dinhDangTien(-(Number(soLieu.so?.chenh_thu_phieu) || 0))} đ so với phiếu thu — cần rà lại.`}
                  </small>
                </div>
              </div>
            </div>
          </Card>

          <Card title={<div><h3>Công nợ của kỳ {String(thang).padStart(2, "0")}/{nam}</h3>
            <div className="sub">Tính theo kỳ của khoản phải thu, KHÔNG theo ngày nộp tiền.</div></div>}>
            <div className="fin-viec">
              <div className="fin-viec__d">
                <div className="fin-viec__ico fin-viec__ico--ok"><Ico ten="chart" co={15} /></div>
                <div>
                  <b>Đã thu cho các khoản của kỳ này</b>
                  <small className="fin-tien">{dinhDangTien(soLieu.congNo?.tong_da_thu)} đ</small>
                  {/* Nói thẳng vì sao số này khác số trên sổ, nếu không người
                      xem sẽ tưởng hệ thống tính sai. Học phí kỳ 9 có thể đã được
                      phụ huynh nộp từ tháng 5, khi đó tiền nằm ở sổ tháng 5. */}
                  <small className="fin-mo">
                    Tiền có thể đã nộp ở tháng khác, khi đó nó nằm ở sổ giao dịch của tháng đó.
                  </small>
                </div>
              </div>
              <div className="fin-viec__d">
                <div className="fin-viec__ico fin-viec__ico--cho"><Ico ten="alert" co={15} /></div>
                <div>
                  <b>Còn phải thu cuối kỳ</b>
                  <small className="fin-tien">{dinhDangTien(soLieu.congNo?.tong_con_no)} đ</small>
                </div>
              </div>
            </div>
          </Card>

          <Card title={<div><h3>Nhật ký thao tác</h3>
            <div className="sub">Chỉ ghi thêm, không sửa, không xóa.</div></div>}>
            {nhatKy.length === 0 ? (
              <div className="fin-pb__trong">Chưa có thao tác nào.</div>
            ) : (
              <div className="fin-log">
                {nhatKy.map((l) => (
                  <div className="fin-log__d" key={l.id}>
                    <b>{thoiDiem(l.created_at)} — {l.actor_name}</b>
                    <small>{l.action}{l.detail ? ` — ${l.detail}` : ""}</small>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
