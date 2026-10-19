import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";
import { Button, Card, CardHead, Pill } from "./v3/ui";
import { color } from "./v3/theme";

/**
 * Chốt lương TỪ ĐẦU VÀO CHUẨN (19/10/2026) — chủ TT: "chốt chỉ từ đầu vào chuẩn, không cần chốt đầu ra".
 * Đầu vào: QLCS = chấm công (đi làm + trực) + file sale; QLĐT = chấm công + ca dạy, thi đua = trung bình
 * khối GV; giáo viên = ca dạy. Đủ thì bấm chốt — số hệ thống tính được thành số chính thức.
 * Máy chủ: payroll/chot_dau_vao.py.
 */
const tien = (v) => Math.round(Number(v || 0)).toLocaleString("vi-VN");

export default function ChotDauVao({ thang, nam, onXong }) {
  const [d, setD] = useState(null);
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);

  useEffect(() => {
    let con = true;
    setD(null);
    apiClient.get("/payroll/luong-chot/dau-vao/", { params: { month: thang, year: nam }, timeout: 120000 })
      .then(({ data }) => con && setD(data))
      .catch((e) => con && setLoi(e?.response?.status === 403 ? "" : (e?.response?.data?.detail || "Không tải được số chốt.")));
    return () => { con = false; };
  }, [thang, nam]);

  if (!d) return loi ? <Card><div style={{ padding: 14, color: color.red }}>{loi}</div></Card> : null;
  const thieu = d.ds.filter((x) => x.thieu.length);

  const chot = async () => {
    const ma = `CHOT ${thang}/${nam}`;
    const go = window.prompt(
      `Chốt lương tháng ${thang}/${nam} từ đầu vào: ${d.ds.length} người, thực nhận ${tien(d.tong_thuc_nhan)} đ.`
      + (thieu.length ? `\n${thieu.length} người còn thiếu đầu vào — vẫn chốt theo số hiện có.` : "")
      + `\nGõ đúng "${ma}" để chốt:`);
    if (go == null) return;
    setDang(true);
    setLoi("");
    try {
      const { data } = await apiClient.post("/payroll/luong-chot/dau-vao/", { month: thang, year: nam, xac_nhan: go });
      onXong?.(`Đã chốt lương T${thang}/${nam} từ đầu vào: ${data.so_nguoi} người, thực nhận ${tien(data.tong_thuc_nhan)} đ.`);
    } catch (e) {
      setLoi(e?.response?.data?.detail || "Không chốt được.");
    } finally {
      setDang(false);
    }
  };

  return (
    <Card>
      <CardHead title={`Chốt lương tháng ${thang}/${nam} từ đầu vào`}
                sub="QLCS: chấm công + ca trực + file sale · QLĐT: chấm công + ca dạy, thi đua = trung bình khối GV · Giáo viên: ca dạy. Không cần nhập file đối soát đầu ra." />
      <div style={{ padding: "0 18px 16px", display: "grid", gap: 10 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
            <thead>
              <tr style={{ background: color.subtle, color: color.muted, fontSize: 12 }}>
                {["Nhân sự", "Lương cơ bản", "Lương dạy", "Trực", "Phụ cấp, sale, thi đua", "Thực nhận", "Đầu vào"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.ds.map((x) => (
                <tr key={x.teacher_id} style={{ borderTop: "1px solid " + color.border }}>
                  <td style={{ padding: 8 }}><b>{x.ten}</b><div style={{ fontSize: 11.5, color: color.muted }}>{x.vi_tri}</div></td>
                  <td style={{ padding: 8 }}>{tien(x.so.luong_nen)}</td>
                  <td style={{ padding: 8 }}>{tien(x.so.luong_day)}</td>
                  <td style={{ padding: 8 }}>{tien(x.so.truc_demo)}</td>
                  <td style={{ padding: 8 }}>{tien(x.so.phu_cap_khac)}</td>
                  <td style={{ padding: 8, fontWeight: 700 }}>{tien(x.so.thuc_nhan)}</td>
                  <td style={{ padding: 8, fontSize: 12, color: x.thieu.length ? color.red : color.green }}>
                    {x.da_co_dong ? "Đã có dòng chốt" : x.thieu.length ? x.thieu.join(" · ") : "Đủ"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          {d.da_chot ? <Pill tone="green">Tháng này đã chốt</Pill>
            : thieu.length ? <Pill tone="amber">{thieu.length} người còn thiếu đầu vào</Pill> : <Pill tone="green">Đủ đầu vào</Pill>}
          <span style={{ fontSize: 13 }}>Tổng thực nhận: <b style={{ color: color.orange }}>{tien(d.tong_thuc_nhan)} đ</b></span>
          {!d.da_chot ? (
            <Button style={{ marginLeft: "auto" }} onClick={chot} disabled={dang}>{dang ? "Đang chốt…" : "✓ Chốt lương từ đầu vào"}</Button>
          ) : null}
        </div>
        {loi ? <div style={{ color: color.red, fontSize: 13 }}>{loi}</div> : null}
      </div>
    </Card>
  );
}
