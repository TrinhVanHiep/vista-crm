import { useEffect, useMemo, useState } from "react";
import apiClient from "../../services/apiClient";
import { Card, EmptyState } from "../../ui";

/**
 * Kế hoạch năm học — khung thi đua chung mà bảng chấm từng tháng bám theo.
 *
 * Đặt cùng màn với bảng chấm (không tách route) vì hai thứ chỉ có nghĩa khi đi
 * cùng nhau: đầu tháng nhìn khung để biết tháng này trọng tâm là gì, cuối tháng
 * chấm điểm dựa trên chính khung đó.
 */

const NHAN_TRANG_THAI = {
  hoan_thanh: { nhan: "Hoàn thành", mau: "#2E9E5B" },
  dang_thuc_hien: { nhan: "Đang thực hiện", mau: "#3B82F6" },
  dung_tien_do: { nhan: "Đúng tiến độ", mau: "#F26522" },
  cham_tien_do: { nhan: "Chậm tiến độ", mau: "#8B5CF6" },
  chua_bat_dau: { nhan: "Chưa bắt đầu", mau: "#E03131" },
};
const THU_TU_TRANG_THAI = ["hoan_thanh", "dang_thuc_hien", "dung_tien_do", "cham_tien_do", "chua_bat_dau"];

const nhanThang = (m, y) => `${String(m).padStart(2, "0")}/${y}`;

/** Vòng tròn tiến độ vẽ bằng SVG — không kéo thêm thư viện biểu đồ cho một hình. */
function VongTienDo({ phanTram, mau }) {
  const r = 15;
  const chu_vi = 2 * Math.PI * r;
  const day = (Math.max(0, Math.min(100, phanTram)) / 100) * chu_vi;
  return (
    <svg className="yp-ring" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
      <circle cx="20" cy="20" r={r} fill="none" stroke="#F0E4D7" strokeWidth="5" />
      <circle
        cx="20" cy="20" r={r} fill="none" stroke={mau} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${day} ${chu_vi}`} transform="rotate(-90 20 20)"
      />
    </svg>
  );
}

export default function YearPlan() {
  const [kh, setKh] = useState(null);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");

  useEffect(() => {
    let huy = false;
    apiClient
      .get("/school-year-plans/")
      .then(({ data }) => {
        if (huy) return;
        const ds = Array.isArray(data) ? data : data?.results || [];
        setKh(ds[0] || null);
      })
      .catch(() => { if (!huy) setLoi("Không tải được kế hoạch năm học."); })
      .finally(() => { if (!huy) setDangTai(false); });
    return () => { huy = true; };
  }, []);

  // Danh sách tháng lấy từ khoảng bắt đầu - kết thúc của kế hoạch, không hard-code
  // 08/2026-04/2027, để năm học sau đổi mốc là màn tự chạy theo.
  const cacThang = useMemo(() => {
    if (!kh) return [];
    const ra = [];
    let m = kh.start_month, y = kh.start_year;
    for (let i = 0; i < 24; i++) {
      ra.push({ m, y, key: `${y}-${m}` });
      if (m === kh.end_month && y === kh.end_year) break;
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
    return ra;
  }, [kh]);

  const tienDoThang = useMemo(() => {
    const map = new Map();
    (kh?.month_progress || []).forEach((p) => map.set(`${p.period_year}-${p.period_month}`, p.progress));
    return map;
  }, [kh]);

  if (dangTai) return <p className="small muted">Đang tải kế hoạch năm học...</p>;
  if (loi || !kh) {
    return (
      <EmptyState
        icon="🗓️"
        title={loi || "Chưa có kế hoạch năm học"}
        hint="Chạy lệnh seed_school_year_plan để nạp khung kế hoạch, hoặc tạo mới trong phần quản trị."
      />
    );
  }

  return (
    <div className="yp">
      <div className="yp-head">
        <div>
          <h2 className="yp-title">KẾ HOẠCH NĂM HỌC {kh.year_label}</h2>
          <p className="yp-sub">{kh.title}</p>
        </div>
      </div>

      <div className="yp-goals">
        {(kh.goals || []).map((g) => (
          <div className="yp-goal" key={g.id}>
            <span className="yp-goal__ico">{g.icon || "🎯"}</span>
            <span className="yp-goal__name">{g.title}</span>
            <span className="yp-goal__val">{g.target_value}</span>
            {g.unit ? <span className="yp-goal__unit">{g.unit}</span> : null}
            {g.note ? <span className="yp-goal__note">{g.note}</span> : null}
          </div>
        ))}
      </div>

      <Card title={`KẾ HOẠCH TRIỂN KHAI THEO THÁNG (${nhanThang(kh.start_month, kh.start_year)} - ${nhanThang(kh.end_month, kh.end_year)})`}>
        <div className="yp-legend">
          {THU_TU_TRANG_THAI.map((k) => (
            <span className="yp-lg" key={k}>
              <i style={{ background: NHAN_TRANG_THAI[k].mau }} />
              {NHAN_TRANG_THAI[k].nhan}
            </span>
          ))}
        </div>

        <div className="tbl-wrap">
          <table className="yp-grid">
            <thead>
              <tr>
                <th className="yp-grid__corner">PHÂN MẢNG</th>
                {cacThang.map((t) => (
                  <th key={t.key}>{nhanThang(t.m, t.y)}</th>
                ))}
              </tr>
              <tr className="yp-grid__progress">
                <th />
                {cacThang.map((t) => {
                  const p = tienDoThang.get(t.key) ?? 0;
                  const mau = p >= 60 ? "#2E9E5B" : p >= 30 ? "#3B82F6" : p > 0 ? "#F26522" : "#8B5CF6";
                  return (
                    <th key={t.key}>
                      <span className="yp-prog">
                        <VongTienDo phanTram={p} mau={mau} />
                        <b>{p}%</b>
                      </span>
                      <span className="yp-prog__bar"><i style={{ width: `${p}%`, background: mau }} /></span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {(kh.tracks || []).map((tr, i) => (
                <tr key={tr.id}>
                  <th className="yp-grid__track">
                    <span className="yp-track__ico">{tr.icon || "▦"}</span>
                    <span>{i + 1}. {tr.name}</span>
                  </th>
                  {cacThang.map((t) => {
                    // API gom sẵn đầu việc thành từng cột tháng (track.months),
                    // đúng cách bảng này được đọc, nên dùng thẳng thay vì tự lọc.
                    const cot = (tr.months || []).find(
                      (c) => c.period_month === t.m && c.period_year === t.y,
                    );
                    const viec = cot?.activities || [];
                    return (
                      <td key={t.key}>
                        <ul className="yp-acts">
                          {viec.map((a) => (
                            <li key={a.id} title={a.status_label || NHAN_TRANG_THAI[a.status]?.nhan}>
                              <i style={{ background: NHAN_TRANG_THAI[a.status]?.mau || "#A99A88" }} />
                              {a.title}
                            </li>
                          ))}
                        </ul>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={`TIẾN ĐỘ TỔNG THỂ NĂM HỌC ${kh.year_label}`}>
        <div className="yp-overall">
          <span className="yp-overall__track">
            <i style={{ width: `${kh.overall_progress}%` }} />
            <b style={{ left: `${Math.min(kh.overall_progress, 92)}%` }}>{kh.overall_progress}%</b>
          </span>
          <span className="yp-overall__flag">🏁</span>
        </div>
      </Card>
    </div>
  );
}
