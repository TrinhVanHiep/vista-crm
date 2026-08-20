import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  importReportCards,
  listClassroomsAll,
  listMonthlyScorecards,
  reportCardTemplate,
} from "../services/calendarService";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Modal,
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

/** Hiển thị mức tăng/giảm so với tháng trước. null = tháng trước chưa có bảng điểm. */
function MucThayDoi({ delta, chuThich = "mới" }) {
  if (delta == null) return <span className="muted" title="Tháng trước chưa có bảng điểm">{chuThich}</span>;
  // Chênh lệch dưới 0.05 điểm % thì coi như đứng yên, tránh hiện "+0.0 ▲".
  if (Math.abs(delta) < 0.05) return <span className="muted">≈ 0</span>;
  const tang = delta > 0;
  return (
    <span className={tang ? "slr-up" : "slr-down"}>
      {tang ? "▲" : "▼"} {tang ? "+" : ""}{delta.toFixed(1)}
    </span>
  );
}

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
  // Nhập bảng điểm ngay tại màn này thay vì đẩy sang màn cũ khác hẳn thiết kế.
  const [moNhap, setMoNhap] = useState(false);
  const [fileNhap, setFileNhap] = useState(null);
  const [dangNhap, setDangNhap] = useState(false);
  const [loiNhap, setLoiNhap] = useState("");
  const [ketQuaNhap, setKetQuaNhap] = useState(null);
  // Khoá nạp lại sau khi nhập file. Khai ở đây, TRÊN useEffect tải dữ liệu.
  const [taiLai, setTaiLai] = useState(0);
  const [xepLoai, setXepLoai] = useState("");
  const [chiXemGiam, setChiXemGiam] = useState(false);

  const [lops, setLops] = useState([]);
  const [items, setItems] = useState([]);
  const [itemsTruoc, setItemsTruoc] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");
  const [dangXuat, setDangXuat] = useState(false);
  const [thongBao, setThongBao] = useState("");

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
    // Tải luôn tháng liền trước để so sánh. Tháng 1 thì lùi về tháng 12 năm trước.
    const thangTruoc = thang === 1 ? 12 : thang - 1;
    const namTruoc = thang === 1 ? nam - 1 : nam;
    const paramsTruoc = { ...params, month: thangTruoc, year: namTruoc };

    Promise.all([
      listMonthlyScorecards(params),
      // Thiếu dữ liệu tháng trước không phải lỗi (tháng đầu tiên chẳng hạn) —
      // nuốt lỗi ở đây để không làm hỏng cả màn, cột so sánh sẽ hiện "mới".
      listMonthlyScorecards(paramsTruoc).catch(() => ({ results: [] })),
    ])
      .then(([nay, truoc]) => {
        if (huy) return;
        setItems(Array.isArray(nay?.results) ? nay.results : []);
        setItemsTruoc(Array.isArray(truoc?.results) ? truoc.results : []);
      })
      .catch(() => {
        if (!huy) {
          setItems([]);
          setItemsTruoc([]);
          setLoi("Không tải được bảng điểm. Vui lòng thử lại.");
        }
      })
      .finally(() => { if (!huy) setDangTai(false); });
    return () => { huy = true; };
  }, [thang, nam, lopId, taiLai]);

  // Kết quả tháng trước, tra theo mã học sinh.
  const diemTruocTheoHS = useMemo(() => {
    const m = new Map();
    itemsTruoc.forEach((i) => {
      const v = Number(i.total_percent);
      if (Number.isFinite(v)) m.set(i.student, v);
    });
    return m;
  }, [itemsTruoc]);

  const chenhLech = (item) => {
    const truoc = diemTruocTheoHS.get(item.student);
    const nay = Number(item.total_percent);
    if (!Number.isFinite(truoc) || !Number.isFinite(nay)) return null;
    return nay - truoc;
  };

  const soEmDangGiam = useMemo(
    () => items.filter((i) => { const d = chenhLech(i); return d != null && d < -0.05; }).length,
    [items, diemTruocTheoHS],
  );

  const danhSachHienThi = useMemo(() => {
    let ds = xepLoai ? items.filter((i) => i.grade_label === xepLoai) : items;
    if (chiXemGiam) {
      ds = ds.filter((i) => { const d = chenhLech(i); return d != null && d < -0.05; });
      // Tụt nhiều nhất lên đầu — đó là những em cần can thiệp trước.
      ds = [...ds].sort((a, b) => (chenhLech(a) ?? 0) - (chenhLech(b) ?? 0));
    }
    return ds;
  }, [items, xepLoai, chiXemGiam, diemTruocTheoHS]);

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
    // Trung bình lớp tháng trước, tính trên CÙNG danh sách học sinh đang xét để
    // lớp thêm/bớt học sinh không bị hiểu nhầm thành điểm tăng hay giảm.
    const tbTruoc = (ds) => trungBinh(ds.map((i) => diemTruocTheoHS.get(i.student)));
    return [...nhom.values()]
      .map((n) => ({
        id: n.id,
        ten: n.ten,
        soHS: new Set(n.ds.map((i) => i.student)).size,
        diemTB: trungBinh(n.ds.map((i) => Number(i.total_percent))),
        delta: (() => {
          const nay = trungBinh(n.ds.map((i) => Number(i.total_percent)));
          const truoc = tbTruoc(n.ds);
          return Number.isFinite(nay) && Number.isFinite(truoc) ? nay - truoc : null;
        })(),
        ccTB: trungBinh(n.ds.map(tiLeChuyenCan)),
        canHoTro: n.ds.filter(
          (i) => i.grade_label === "Yếu" || i.grade_label === "Trung bình",
        ).length,
      }))
      .sort((a, b) => (b.diemTB ?? -1) - (a.diemTB ?? -1));
  }, [items, diemTruocTheoHS]);

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
      key: "thaydoi",
      header: "So tháng trước",
      align: "right",
      render: (r) => <MucThayDoi delta={r.delta} chuThich="--" />,
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
      key: "thaydoi",
      header: "So tháng trước",
      align: "right",
      render: (r) => <MucThayDoi delta={chenhLech(r)} />,
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

  // Xuất Excel TOÀN BỘ học viên đang lọc, 3 sheet: tổng quan, theo lớp, chi tiết.
  // Nạp xlsx bằng import động như màn Lịch để không kéo thư viện vào bundle chính.
  const xuatExcel = async () => {
    setLoi("");
    setThongBao("");
    setDangXuat(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const tenLop = lopId
        ? lops.find((l) => String(l.id) === String(lopId))
        : null;

      const themSheet = (ten, rows) => {
        const an = rows.length ? rows : [{ "Không có dữ liệu": "" }];
        const ws = XLSX.utils.json_to_sheet(an);
        ws["!cols"] = Object.keys(an[0] || {}).map((k) => ({
          wch: Math.min(Math.max(String(k).length + 6, 14), 40),
        }));
        XLSX.utils.book_append_sheet(wb, ws, ten);
      };

      themSheet("Tong quan", [
        { "Chỉ số": "Kỳ báo cáo", "Giá trị": `Tháng ${thang}/${nam}` },
        { "Chỉ số": "Phạm vi", "Giá trị": tenLop ? `Lớp ${tenLop.class_code || tenLop.name}` : "Toàn trung tâm" },
        { "Chỉ số": "Học sinh có bảng điểm", "Giá trị": tongQuan.soHocSinh },
        { "Chỉ số": "Điểm trung bình (%)", "Giá trị": so1(tongQuan.diemTB) ?? "" },
        { "Chỉ số": "Chuyên cần trung bình (%)", "Giá trị": so1(tongQuan.ccTB) ?? "" },
        { "Chỉ số": "Cần hỗ trợ (Trung bình + Yếu)", "Giá trị": tongQuan.canHoTro },
        { "Chỉ số": "Giảm điểm so với tháng trước", "Giá trị": soEmDangGiam },
        ...phanBo.map((x) => ({
          "Chỉ số": `Xếp loại ${x.key}`,
          "Giá trị": `${x.soLuong} (${so1(x.phanTram)}%)`,
        })),
      ]);

      themSheet("Theo lop", theoLop.map((l) => ({
        "Lớp": l.ten,
        "Sĩ số có bảng điểm": l.soHS,
        "Điểm trung bình (%)": so1(l.diemTB) ?? "",
        "Thay đổi so tháng trước (điểm %)": l.delta == null ? "" : Number(l.delta.toFixed(1)),
        "Chuyên cần (%)": so1(l.ccTB) ?? "",
        "Cần hỗ trợ": l.canHoTro,
      })));

      // Sheet chi tiết luôn xuất TOÀN BỘ học viên của kỳ, không phụ thuộc bộ lọc
      // xếp loại đang bật trên màn — người dùng bấm "xuất báo cáo cho toàn bộ học
      // viên" thì mong đợi đủ danh sách, không phải đúng phần đang xem.
      themSheet("Chi tiet hoc vien", items.map((i) => ({
        "Học sinh": i.student_name || "",
        "Lớp": i.classroom_name || "",
        "Giáo viên": i.teacher_name || "",
        "Số buổi có mặt": i.attendance_present ?? "",
        "Tổng số buổi": i.attendance_total ?? "",
        "Chuyên cần (%)": so1(tiLeChuyenCan(i)) ?? "",
        "Kết quả (%)": so1(i.total_percent) ?? "",
        "Tháng trước (%)": so1(diemTruocTheoHS.get(i.student)) ?? "",
        "Thay đổi (điểm %)": (() => { const d = chenhLech(i); return d == null ? "" : Number(d.toFixed(1)); })(),
        "Xếp loại": i.grade_label || "",
        "Cảnh báo": i.crm_warning || "",
        "Trạng thái": NHAN_TRANG_THAI[i.status] || i.status || "",
        "Điểm mạnh": i.strengths || "",
        "Cần cải thiện": i.improvements || "",
        "Mục tiêu tháng tới": i.next_goal || "",
        "Nhận xét của giáo viên": i.teacher_comment || "",
      })));

      const hau = tenLop ? `-${(tenLop.class_code || tenLop.name).replace(/\s+/g, "")}` : "";
      XLSX.writeFile(wb, `Bao-cao-hoc-tap-${nam}-${String(thang).padStart(2, "0")}${hau}.xlsx`, {
        compression: true,
      });
      setThongBao(`Đã xuất ${items.length} học viên ra Excel.`);
    } catch {
      setLoi("Không xuất được Excel. Vui lòng thử lại.");
    } finally {
      setDangXuat(false);
    }
  };

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

  const taiFileMau = async () => {
    setLoiNhap("");
    try {
      // Truyền lớp đang lọc để file mẫu điền sẵn họ tên học viên của lớp đó.
      const blob = await reportCardTemplate(lopId ? { classroom: lopId } : {});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Mau-bao-cao-hoc-tap-${nam}-${String(thang).padStart(2, "0")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setLoiNhap("Không tải được file mẫu. Vui lòng thử lại.");
    }
  };

  const guiFileNhap = async (event) => {
    event.preventDefault();
    if (!fileNhap) {
      setLoiNhap("Vui lòng chọn file Excel (.xlsx) để nhập.");
      return;
    }
    setDangNhap(true);
    setLoiNhap("");
    setKetQuaNhap(null);
    try {
      const fd = new FormData();
      fd.append("file", fileNhap);
      fd.append("month", thang);
      fd.append("year", nam);
      const kq = await importReportCards(fd);
      setKetQuaNhap(kq);
      setTaiLai((v) => v + 1);
    } catch (error) {
      setLoiNhap(
        error?.response?.data?.detail || "Không nhập được file. Kiểm tra lại định dạng.",
      );
    } finally {
      setDangNhap(false);
    }
  };

  return (
    <Page className="v4page">
      <PageHeader
        crumbs={[{ label: "Tổng quan", to: "/" }, { label: "Báo cáo kết quả học tập" }]}
        title="Báo cáo kết quả học tập"
        description={`Kết quả học tập của học sinh theo tháng — Tháng ${thang}/${nam}`}
        actions={
          <>
          {/* Nhập ngay tại đây. Trước kia nút này đẩy sang /monthly-scorecards —
              một màn dựng từ trước, thiết kế khác hẳn phần còn lại của hệ thống. */}
          <Button variant="ghost" onClick={() => { setMoNhap(true); setLoiNhap(""); setKetQuaNhap(null); }}>
            Nhập bảng điểm
          </Button>
          <Button
            variant="primary"
            onClick={xuatExcel}
            loading={dangXuat}
            loadingText="Đang xuất..."
            disabled={dangTai || !items.length}
          >
            ⬇ Xuất Excel toàn bộ học viên
          </Button>
          </>
        }
      />

      {boLoc}

      {loi ? (
        <div className="alert red" role="alert" style={{ marginBottom: 14 }}>
          <span>⚠️</span>
          <div>{loi}</div>
        </div>
      ) : null}
      {thongBao ? (
        <div className="alert green" role="status" style={{ marginBottom: 14 }}>
          <span>✅</span>
          <div style={{ flex: 1 }}>{thongBao}</div>
          <button type="button" className="btn ghost sm" onClick={() => setThongBao("")}>Đóng</button>
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
        title={`Danh sách học sinh${xepLoai ? ` — xếp loại ${xepLoai}` : ""}${chiXemGiam ? " — đang giảm" : ""}`}
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button
              variant={chiXemGiam ? "primary" : "ghost"}
              size="sm"
              disabled={!soEmDangGiam}
              onClick={() => setChiXemGiam((v) => !v)}
            >
              {chiXemGiam ? "Đang lọc: giảm điểm" : `Chỉ xem em đang giảm (${soEmDangGiam})`}
            </Button>
            {xepLoai ? (
              <Button variant="ghost" size="sm" onClick={() => setXepLoai("")}>Bỏ lọc xếp loại</Button>
            ) : null}
          </div>
        }
      >
        <DataTable
          columns={cotHocSinh}
          rows={danhSachHienThi}
          loading={dangTai}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(`/phieu-bao-cao/${r.id}`)}
          empty="Không có học sinh nào khớp bộ lọc."
          minWidth={880}
        />
        {!dangTai && danhSachHienThi.length ? (
          <p className="small muted" style={{ marginTop: 10 }}>
            Bấm vào một dòng để mở phiếu báo cáo gửi phụ huynh.
          </p>
        ) : null}
      </Card>
      <Modal
        open={moNhap}
        onClose={() => setMoNhap(false)}
        title="Nhập bảng điểm học viên"
        subtitle={(() => {
          const l = lops.find((x) => String(x.id) === String(lopId));
          return `Tháng ${thang}/${nam}${l ? ` — lớp ${l.class_code || l.name}` : " — toàn trung tâm"}`;
        })()}
        size="md"
      >
        <form onSubmit={guiFileNhap}>
          <p className="small muted" style={{ marginBottom: 12, lineHeight: 1.6 }}>
            Tải file mẫu về, điền điểm rồi nhập lại. File mẫu điền sẵn họ tên và lớp
            của học viên nên không phải gõ tay.{" "}
            <strong>Ô để trống nghĩa là không đổi</strong> — giáo viên chỉ cần điền
            phần mình phụ trách, không ghi rỗng đè lên dữ liệu người khác đã nhập.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <Button type="button" variant="ghost" onClick={taiFileMau}>
              Tải file mẫu
            </Button>
            <label className="btn ghost" style={{ cursor: "pointer", margin: 0 }}>
              {fileNhap ? fileNhap.name : "Chọn file .xlsx"}
              <input
                type="file"
                accept=".xlsx"
                hidden
                onChange={(e) => { setFileNhap(e.target.files?.[0] || null); setLoiNhap(""); }}
              />
            </label>
          </div>

          {loiNhap ? <div className="alert red" style={{ marginBottom: 12 }}><span>⚠️</span><div>{loiNhap}</div></div> : null}

          {ketQuaNhap ? (
            <div className="alert green" style={{ marginBottom: 12, display: "block" }}>
              {/* Backend trả created_count / updated_count riêng, không có
                  success_count — đọc sai khoá thì lúc nào cũng hiện "0 phiếu". */}
              <div>
                Đã tạo mới <strong>{ketQuaNhap.created_count ?? 0}</strong> phiếu, cập nhật{" "}
                <strong>{ketQuaNhap.updated_count ?? 0}</strong> phiếu
                {ketQuaNhap.error_count ? `, ${ketQuaNhap.error_count} dòng lỗi:` : "."}
              </div>
              {Array.isArray(ketQuaNhap.errors) && ketQuaNhap.errors.length ? (
                <ul style={{ margin: "6px 0 0 18px", fontSize: 12.5 }}>
                  {ketQuaNhap.errors.slice(0, 12).map((e, i) => (
                    <li key={i}>{typeof e === "string" ? e : JSON.stringify(e)}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="alert orange" style={{ marginBottom: 14, display: "block" }}>
            <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
              <strong>Muốn nhập tay từng học viên?</strong> Đóng hộp này, bấm vào
              một dòng trong bảng để mở phiếu của học viên đó, rồi bấm
              “Nhập thông tin phiếu”.
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button type="button" variant="ghost" onClick={() => setMoNhap(false)}>
              Đóng
            </Button>
            <Button type="submit" variant="primary" loading={dangNhap} loadingText="Đang nhập..." disabled={!fileNhap}>
              Nhập file
            </Button>
          </div>
        </form>
      </Modal>
    </Page>
  );
}
