import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listClassroomsAll, listMonthlyScorecards } from "../services/calendarService";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Kpi,
  KpiGrid,
  Page,
  PageHeader,
} from "../ui";

/**
 * Báo cáo kết quả học tập của học sinh theo tháng.
 *
 * Khác hai màn đã có:
 * - "Bảng điểm tháng" (MonthlyScorecards) là nơi giáo viên NHẬP từng đầu điểm.
 * - "Phiếu báo cáo" (ParentReport) là phiếu của MỘT em, để in/gửi phụ huynh.
 * Màn này là chỗ TỔNG HỢP cả trung tâm trong một tháng: xếp loại chung, so sánh
 * giữa các lớp, và lọc ra những em cần hỗ trợ — thứ mà hai màn kia không trả lời.
 */

const THANG = Array.from({ length: 12 }, (_, i) => i + 1);
const NAM = [2025, 2026, 2027];

// Ngưỡng theo grade_label mà giáo viên đang chấm (xem dữ liệu thật: Giỏi/Khá/
// Trung bình/Yếu). Giữ đúng thứ tự này để cột phân bố luôn đọc từ cao xuống thấp.
const XEP_LOAI = [
  { key: "Giỏi", mau: "#2E9E5B" },
  { key: "Khá", mau: "#3B82F6" },
  { key: "Trung bình", mau: "#F5A623" },
  { key: "Yếu", mau: "#D64545" },
];

// Chỉ dùng các tone .badge có thật trong vista4.css (green/blue/orange/red/
// purple/gray) — không có .badge.yellow, dùng nhầm là badge mất nền.
const TONE_XEP_LOAI = {
  "Giỏi": "green",
  "Khá": "blue",
  "Trung bình": "orange",
  "Yếu": "red",
};

const NHAN_TRANG_THAI = {
  draft: "Nháp",
  submitted: "Chờ duyệt",
  approved: "Đã duyệt",
  revision_required: "Cần sửa",
  rejected: "Từ chối",
  locked: "Đã khoá",
};

const TONE_TRANG_THAI = {
  draft: "gray",
  submitted: "orange",
  approved: "green",
  revision_required: "purple",
  rejected: "red",
  locked: "gray",
};

const so1 = (v) => (Number.isFinite(Number(v)) ? Number(v).toFixed(1) : null);

function tiLeChuyenCan(item) {
  const tong = Number(item.attendance_total);
  const comat = Number(item.attendance_present);
  if (!Number.isFinite(tong) || tong <= 0 || !Number.isFinite(comat)) return null;
  return (comat / tong) * 100;
}

function trungBinh(ds) {
  const so = ds.filter((v) => Number.isFinite(v));
  if (!so.length) return null;
  return so.reduce((a, b) => a + b, 0) / so.length;
}

export default function StudentLearningReport() {
  const navigate = useNavigate();
  const homNay = new Date();

  const [thang, setThang] = useState(homNay.getMonth() + 1);
  const [nam, setNam] = useState(homNay.getFullYear());
  const [lopId, setLopId] = useState("");
  const [xepLoai, setXepLoai] = useState("");

  const [lops, setLops] = useState([]);
  const [items, setItems] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");

  useEffect(() => {
    let huy = false;
    listClassroomsAll()
      .then((ds) => { if (!huy) setLops(Array.isArray(ds) ? ds : []); })
      .catch(() => { if (!huy) setLops([]); });
    return () => { huy = true; };
  }, []);

  useEffect(() => {
    let huy = false;
    setDangTai(true);
    setLoi("");
    const params = { month: thang, year: nam, page_size: 500 };
    if (lopId) params.classroom = lopId;
    // listMonthlyScorecards trả về {results, count, ...} (normalizeCollection),
    // KHÔNG phải mảng — đọc thẳng như mảng thì lúc nào cũng ra rỗng.
    listMonthlyScorecards(params)
      .then((res) => { if (!huy) setItems(Array.isArray(res?.results) ? res.results : []); })
      .catch(() => {
        if (!huy) {
          setItems([]);
          setLoi("Không tải được bảng điểm. Vui lòng thử lại.");
        }
      })
      .finally(() => { if (!huy) setDangTai(false); });
    return () => { huy = true; };
  }, [thang, nam, lopId]);

  const locTheoXepLoai = useMemo(
    () => (xepLoai ? items.filter((i) => i.grade_label === xepLoai) : items),
    [items, xepLoai],
  );

  const tongQuan = useMemo(() => {
    const diem = items.map((i) => Number(i.total_percent)).filter(Number.isFinite);
    const cc = items.map(tiLeChuyenCan).filter(Number.isFinite);
    const canHoTro = items.filter(
      (i) => i.grade_label === "Yếu" || i.grade_label === "Trung bình",
    ).length;
    return {
      soBangDiem: items.length,
      soHocSinh: new Set(items.map((i) => i.student)).size,
      diemTB: trungBinh(diem),
      ccTB: trungBinh(cc),
      canHoTro,
    };
  }, [items]);

  const phanBo = useMemo(() => {
    const dem = new Map(XEP_LOAI.map((x) => [x.key, 0]));
    items.forEach((i) => {
      if (dem.has(i.grade_label)) dem.set(i.grade_label, dem.get(i.grade_label) + 1);
    });
    const tong = items.length || 1;
    return XEP_LOAI.map((x) => ({
      ...x,
      soLuong: dem.get(x.key) || 0,
      phanTram: ((dem.get(x.key) || 0) / tong) * 100,
    }));
  }, [items]);

  const theoLop = useMemo(() => {
    const nhom = new Map();
    items.forEach((i) => {
      const khoa = i.classroom;
      if (!nhom.has(khoa)) {
        nhom.set(khoa, { id: khoa, ten: i.classroom_name || "--", ds: [] });
      }
      nhom.get(khoa).ds.push(i);
    });
    return [...nhom.values()]
      .map((n) => ({
        id: n.id,
        ten: n.ten,
        soHS: new Set(n.ds.map((i) => i.student)).size,
        diemTB: trungBinh(n.ds.map((i) => Number(i.total_percent))),
        ccTB: trungBinh(n.ds.map(tiLeChuyenCan)),
        canHoTro: n.ds.filter(
          (i) => i.grade_label === "Yếu" || i.grade_label === "Trung bình",
        ).length,
      }))
      .sort((a, b) => (b.diemTB ?? -1) - (a.diemTB ?? -1));
  }, [items]);

  const cotLop = [
    { key: "ten", header: "Lớp", render: (r) => <b>{r.ten}</b> },
    { key: "soHS", header: "Sĩ số có bảng điểm", align: "center" },
    {
      key: "diemTB",
      header: "Điểm trung bình",
      align: "right",
      render: (r) => (so1(r.diemTB) ? `${so1(r.diemTB)}%` : "--"),
    },
    {
      key: "ccTB",
      header: "Chuyên cần",
      align: "right",
      render: (r) => (so1(r.ccTB) ? `${so1(r.ccTB)}%` : "--"),
    },
    {
      key: "canHoTro",
      header: "Cần hỗ trợ",
      align: "center",
      render: (r) =>
        r.canHoTro > 0 ? <Badge tone="orange">{r.canHoTro} em</Badge> : <span className="muted">0</span>,
    },
  ];

  const cotHocSinh = [
    {
      key: "student_name",
      header: "Học sinh",
      render: (r) => <b>{r.student_name || "--"}</b>,
    },
    { key: "classroom_name", header: "Lớp", render: (r) => r.classroom_name || "--" },
    {
      key: "chuyencan",
      header: "Chuyên cần",
      align: "center",
      render: (r) => {
        const t = tiLeChuyenCan(r);
        if (t == null) return "--";
        return `${r.attendance_present}/${r.attendance_total} (${so1(t)}%)`;
      },
    },
    {
      key: "total_percent",
      header: "Kết quả",
      align: "right",
      render: (r) => (so1(r.total_percent) ? `${so1(r.total_percent)}%` : "--"),
    },
    {
      key: "grade_label",
      header: "Xếp loại",
      align: "center",
      render: (r) =>
        r.grade_label ? (
          <Badge tone={TONE_XEP_LOAI[r.grade_label] || "gray"}>{r.grade_label}</Badge>
        ) : (
          "--"
        ),
    },
    {
      key: "crm_warning",
      header: "Cảnh báo",
      render: (r) => (r.crm_warning ? <span className="slr-warn">⚠ {r.crm_warning}</span> : ""),
    },
    {
      key: "status",
      header: "Trạng thái",
      align: "center",
      render: (r) => (
        <Badge tone={TONE_TRANG_THAI[r.status] || "gray"}>
          {NHAN_TRANG_THAI[r.status] || r.status}
        </Badge>
      ),
    },
  ];

  const boLoc = (
    <div className="slr-filters">
      <label>
        <span>Tháng</span>
        <select value={thang} onChange={(e) => setThang(Number(e.target.value))}>
          {THANG.map((m) => (
            <option key={m} value={m}>Tháng {m}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Năm</span>
        <select value={nam} onChange={(e) => setNam(Number(e.target.value))}>
          {NAM.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Lớp</span>
        <select value={lopId} onChange={(e) => setLopId(e.target.value)}>
          <option value="">Tất cả lớp</option>
          {lops.map((l) => (
            <option key={l.id} value={l.id}>{l.class_code || l.name}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Xếp loại</span>
        <select value={xepLoai} onChange={(e) => setXepLoai(e.target.value)}>
          <option value="">Tất cả</option>
          {XEP_LOAI.map((x) => (
            <option key={x.key} value={x.key}>{x.key}</option>
          ))}
        </select>
      </label>
    </div>
  );

  return (
    <Page className="v4page">
      <PageHeader
        crumbs={[{ label: "Tổng quan", to: "/" }, { label: "Báo cáo kết quả học tập" }]}
        title="Báo cáo kết quả học tập"
        description={`Kết quả học tập của học sinh theo tháng — Tháng ${thang}/${nam}`}
      />

      {boLoc}

      {loi ? (
        <div className="alert red" role="alert" style={{ marginBottom: 14 }}>
          <span>⚠️</span>
          <div>{loi}</div>
        </div>
      ) : null}

      <KpiGrid cols={4}>
        <Kpi ico="🎓" icoClass="orange" label="Học sinh có bảng điểm"
             value={dangTai ? "..." : tongQuan.soHocSinh}
             sub={`${tongQuan.soBangDiem} bảng điểm trong tháng`} />
        <Kpi ico="📊" icoClass="orange" label="Điểm trung bình"
             value={dangTai ? "..." : so1(tongQuan.diemTB) ? `${so1(tongQuan.diemTB)}%` : "--"}
             sub="toàn trung tâm" />
        <Kpi ico="🗓️" icoClass="yellow" label="Chuyên cần trung bình"
             value={dangTai ? "..." : so1(tongQuan.ccTB) ? `${so1(tongQuan.ccTB)}%` : "--"}
             sub="số buổi có mặt / tổng số buổi" />
        <Kpi ico="🩺" icoClass="red" label="Cần hỗ trợ"
             value={dangTai ? "..." : tongQuan.canHoTro}
             sub="xếp loại Trung bình hoặc Yếu" />
      </KpiGrid>

      <Card title="Phân bố xếp loại">
        {dangTai ? (
          <p className="small muted">Đang tải...</p>
        ) : !items.length ? (
          <EmptyState icon="📭" title="Chưa có bảng điểm trong tháng này"
                      hint="Chọn tháng khác, hoặc để giáo viên nhập bảng điểm ở màn Bảng điểm tháng." />
        ) : (
          <div className="slr-dist">
            {phanBo.map((x) => (
              <div className="slr-dist__row" key={x.key}>
                <span className="slr-dist__label">{x.key}</span>
                <span className="slr-dist__track">
                  <span className="slr-dist__bar"
                        style={{ width: `${x.phanTram}%`, background: x.mau }} />
                </span>
                <span className="slr-dist__num">
                  {x.soLuong} <small>({so1(x.phanTram)}%)</small>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="So sánh giữa các lớp">
        <DataTable columns={cotLop} rows={theoLop} loading={dangTai}
                   rowKey={(r) => r.id}
                   empty="Chưa có lớp nào có bảng điểm trong tháng này."
                   minWidth={620} />
      </Card>

      <Card
        title={`Danh sách học sinh${xepLoai ? ` — xếp loại ${xepLoai}` : ""}`}
        action={
          xepLoai ? (
            <Button variant="ghost" size="sm" onClick={() => setXepLoai("")}>Bỏ lọc xếp loại</Button>
          ) : null
        }
      >
        <DataTable
          columns={cotHocSinh}
          rows={locTheoXepLoai}
          loading={dangTai}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(`/phieu-bao-cao/${r.id}`)}
          empty="Không có học sinh nào khớp bộ lọc."
          minWidth={880}
        />
        {!dangTai && locTheoXepLoai.length ? (
          <p className="small muted" style={{ marginTop: 10 }}>
            Bấm vào một dòng để mở phiếu báo cáo gửi phụ huynh.
          </p>
        ) : null}
      </Card>
    </Page>
  );
}
