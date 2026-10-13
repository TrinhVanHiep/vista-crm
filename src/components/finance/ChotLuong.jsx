import { useEffect, useRef, useState } from "react";
import { dinhDangTien, loiApi } from "../../services/financeService";
import { boLuongChot, layLuongChot, nhapLuongChot } from "../../services/payrollService";
import { Button, Card, CardHead, Table } from "./v3/ui";
import { color } from "./v3/theme";

/**
 * Chốt lương tháng theo bảng đối soát kế toán (13/10/2026). Bảng lương CRM là tạm tính;
 * khi kế toán đã đối soát tay (file VISTA_Bao_cao_tai_chinh_MM-YYYY_Doi_soat.xlsx, sheet
 * "Bang luong") thì nhập vào đây — bảng lương, phiếu lương, file Excel hiện số chốt.
 * Người không khớp tên tự chọn tay; để "Ngoài CRM" nếu chưa có hồ sơ (vd. Bà Lĩnh).
 */
const t = (v) => dinhDangTien(Math.round(Number(v || 0)));

export default function ChotLuong({ thang, nam, ds, coTheGhi, onXong }) {
  const oFile = useRef(null);
  const [daChot, setDaChot] = useState([]);
  const [tep, setTep] = useState(null);
  const [xem, setXem] = useState(null);
  const [gan, setGan] = useState({});
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState("");

  const tai = () => layLuongChot({ thang, nam }).then(setDaChot).catch(() => setDaChot([]));
  useEffect(() => { tai(); setXem(null); setTep(null); }, [thang, nam]); // eslint-disable-line react-hooks/exhaustive-deps

  const nguoiCrm = ds.filter((x) => x.teacher_id);
  const chon = async (f) => {
    setTep(f);
    setXem(null);
    setLoi("");
    if (!f) return;
    setDang("xem");
    try {
      const kq = await nhapLuongChot(f, { thang, nam });
      setXem(kq);
      setGan(Object.fromEntries(kq.dong.map((d) => [d.ma_nv, d.teacher_goi_y ? String(d.teacher_goi_y) : ""])));
    } catch (e) {
      setLoi(loiApi(e, "Không đọc được file."));
    } finally {
      setDang("");
    }
  };
  const ghi = async () => {
    setDang("ghi");
    setLoi("");
    try {
      const kq = await nhapLuongChot(tep, { thang, nam, ghi: true, gan });
      setXem(null);
      setTep(null);
      if (oFile.current) oFile.current.value = "";
      await tai();
      onXong?.(`Đã chốt lương tháng ${thang}/${nam}: ${kq.dong.length} người, thực nhận ${t(kq.tong_thuc_nhan)}.`);
    } catch (e) {
      setLoi(loiApi(e, "Không chốt được."));
    } finally {
      setDang("");
    }
  };
  const bo = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Bỏ chốt lương tháng ${thang}/${nam}? Bảng lương quay về số tạm tính.`)) return;
    await boLuongChot({ thang, nam });
    await tai();
    onXong?.(`Đã bỏ chốt lương tháng ${thang}/${nam}.`);
  };

  return (
    <Card>
      <CardHead
        title="Chốt lương theo bảng đối soát"
        sub={daChot.length
          ? `Tháng ${thang}/${nam} ĐÃ CHỐT ${daChot.length} người · thực nhận ${t(daChot.reduce((n, x) => n + x.thuc_nhan, 0))} · nguồn ${daChot[0].nguon}`
          : "Nhập file đối soát kế toán (sheet “Bang luong”) — số chốt thay số tạm tính trên bảng lương, phiếu lương và file Excel."}
      />
      <div style={{ padding: "12px 22px 18px", display: "grid", gap: 12 }}>
        {coTheGhi ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input ref={oFile} type="file" accept=".xlsx" onChange={(e) => chon(e.target.files?.[0] || null)} />
            {dang === "xem" ? <span style={{ color: color.muted, fontSize: 13 }}>Đang đọc file…</span> : null}
            {daChot.length ? <Button variant="ghost" onClick={bo}>Bỏ chốt tháng {thang}</Button> : null}
          </div>
        ) : null}
        {loi ? <div style={{ color: color.red, fontSize: 13.5 }}>{loi}</div> : null}
        {xem ? (
          <>
            <div style={{ fontSize: 13.5 }}>
              Xem trước: <b>{xem.dong.length}</b> người, tổng thực nhận <b>{t(xem.tong_thuc_nhan)}</b>. Chưa ghi gì — kiểm tra cột “Người trên CRM”.
            </div>
            <Table
              columns={["Mã", "Họ tên (file)", "Người trên CRM", "Gross", "BH NLĐ", "Khấu trừ", "Thực nhận"]}
              rows={xem.dong.map((d) => [
                d.ma_nv, d.ho_ten,
                <select key="g" value={gan[d.ma_nv] ?? ""} onChange={(e) => setGan((g) => ({ ...g, [d.ma_nv]: e.target.value }))}>
                  <option value="">— Ngoài CRM —</option>
                  {nguoiCrm.map((x) => <option key={x.teacher_id} value={x.teacher_id}>{x.teacher_name}</option>)}
                </select>,
                t(d.gross), t(d.bh_nld), t(d.khau_tru), <b key="n">{t(d.thuc_nhan)}</b>,
              ])}
              align={{ 3: "right", 4: "right", 5: "right", 6: "right" }}
            />
            {xem.loi?.length ? (
              <ul style={{ margin: 0, paddingLeft: 18, color: color.red, fontSize: 12.5 }}>{xem.loi.map((l) => <li key={l}>{l}</li>)}</ul>
            ) : null}
            <div style={{ display: "flex", gap: 10 }}>
              <Button disabled={dang === "ghi"} onClick={ghi}>{dang === "ghi" ? "Đang chốt…" : `Chốt lương tháng ${thang}/${nam}`}</Button>
              <Button variant="ghost" onClick={() => chon(null)}>Huỷ</Button>
            </div>
          </>
        ) : null}
      </div>
    </Card>
  );
}
