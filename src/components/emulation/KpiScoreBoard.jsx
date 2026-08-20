import { Fragment, useEffect, useMemo, useState } from "react";
import KpiSheet from "./KpiSheet";
import apiClient from "../../services/apiClient";
import { Badge, Button, Card, DataTable, EmptyState, Field, Kpi } from "../../ui";
import { ICON_NHOM, IcCong, IcCup, IcSao, IcTru } from "./KpiIcons";

/**
 * Bảng chấm điểm thi đua tháng của MỘT người trong MỘT tháng.
 *
 * Khác YearPlan cùng thư mục (khung kế hoạch cả năm cho cả trung tâm): đây là
 * phiếu chấm điểm cá nhân, chấm hai lần trên cùng một tiêu chí — giáo viên tự
 * chấm rồi quản lý chấm lại — nên mọi thứ trên màn đều xoay quanh việc đối
 * chiếu hai cột đó.
 *
 * Component KHÔNG tự đọc quyền: nơi nhúng truyền vào canScoreSelf /
 * canScoreManager / canReview. Nhờ vậy cùng một bảng dùng được cho cả màn tự
 * chấm lẫn màn quản lý duyệt mà không phải nhân bản giao diện.
 */

// 100 điểm tiêu chí + tối đa 15 điểm cộng. Điểm trừ không hạ trần nên không trừ.
const DIEM_TRAN = 115;
const TONG_TIEU_CHI = 100;
const TRAN_CONG = 15;
const TRAN_TRU = 15;

// Thang xếp loại đúng theo hàm xep_loai() ở backend (kpi/serializers.py) —
// để bảng chú thích không bao giờ nói khác con số phiếu trả về.
const THANG_XEP_LOAI = [
  { ten: "Xuất sắc", mo_ta: "91 - 100 điểm", sao: 5, tone: "green" },
  { ten: "Tốt", mo_ta: "81 - 90 điểm", sao: 4, tone: "blue" },
  { ten: "Khá", mo_ta: "71 - 80 điểm", sao: 3, tone: "orange" },
  { ten: "Trung bình", mo_ta: "61 - 70 điểm", sao: 2, tone: "purple" },
  { ten: "Không đạt", mo_ta: "Dưới 60 điểm", sao: 1, tone: "red" },
];

// Ba ô ký khớp đúng MonthlyKpiReport.STAGES. Ban giám đốc chốt XẾP LOẠI chứ
// không chấm lại điểm, nên ô đó dùng ô chọn thay vì ô nhập số.
const O_DUYET = [
  {
    stage: "training",
    mau: "#178A4C",
    ten: "Quản lý đào tạo",
    moTa: "Đối chiếu điểm tự chấm với hồ sơ chuyên môn: giáo án, dự giờ, chất lượng lớp.",
    kieu: "diem",
  },
  {
    stage: "center",
    mau: "#2F6BD8",
    ten: "Quản lý cơ sở",
    moTa: "Xác nhận phần vận hành và truyền thông tại cơ sở: kỷ luật, sĩ số, hoạt động.",
    kieu: "diem",
  },
  {
    stage: "director",
    mau: "#F86A0B",
    ten: "Ban giám đốc",
    moTa: "Chốt xếp loại thi đua cuối cùng của tháng sau khi hai cấp trên đã ký.",
    kieu: "xep_loai",
  },
];

const NHAN_TRANG_THAI = {
  draft: "Nháp",
  submitted: "Chờ duyệt",
  revision_required: "Yêu cầu chỉnh sửa",
  approved: "Đã duyệt",
};

// Chỉ dùng tone .badge có thật trong vista4.css (green/blue/orange/red/purple/
// gray) — KHÔNG có .badge.yellow, dùng nhầm là nhãn mất nền thành chữ trơn.
const TONE_TRANG_THAI = {
  draft: "gray",
  submitted: "orange",
  revision_required: "purple",
  approved: "green",
};

const NHAN_QUYET_DINH = {
  pending: "Chờ ký",
  approved: "Đã duyệt",
  revision_required: "Yêu cầu chỉnh sửa",
};

const TONE_QUYET_DINH = {
  pending: "gray",
  approved: "green",
  revision_required: "red",
};

// Màu ô biểu tượng của thẻ nhóm, xoay vòng theo thứ tự nhóm để bốn nhóm không
// bị trùng màu. Đây là các lớp .ico có thật (yellow chỉ thiếu ở .badge).
const MAU_NHOM = ["orange", "blue", "green", "purple", "yellow", "red"];

/** Số của API là chuỗi Decimal ("10.00"); đưa về dạng gọn để so sánh và hiển thị. */
const chuanHoa = (v) =>
  v === null || v === undefined || v === "" ? "" : String(Number(v));

/** Hiển thị số cho ô chỉ đọc; chưa chấm khác hẳn chấm 0 nên để dấu gạch. */
const hienSo = (v) => (v === null || v === undefined || v === "" ? "—" : String(Number(v)));

const soGon = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? String(Number(n.toFixed(2))) : "0";
};

/** Đọc ô nhập số: "" là bỏ trống (xoá điểm), NaN là gõ sai. */
const docSo = (raw) => {
  const t = String(raw ?? "").trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

/** Gỡ câu lỗi DRF trả về (chuỗi, mảng, {detail}, hoặc {field: [...]}) . */
function thongDiepLoi(e, macDinh) {
  const d = e?.response?.data;
  if (typeof d === "string" && d && !d.startsWith("<")) return d;
  if (Array.isArray(d) && d.length) return String(d[0]);
  if (d?.detail) return String(d.detail);
  if (d && typeof d === "object") {
    const dau = Object.values(d)[0];
    if (Array.isArray(dau) && dau.length) return String(dau[0]);
    if (typeof dau === "string") return dau;
  }
  return macDinh;
}

/** Trạng thái một dòng tiêu chí, đọc từ chênh lệch giữa hai cột điểm. */
function trangThaiDong(dong) {
  const tu = dong?.self_score;
  const ql = dong?.manager_score;
  if (tu == null && ql == null) return { nhan: "Chưa chấm", tone: "gray" };
  if (ql == null) return { nhan: "GV đã chấm", tone: "blue" };
  if (tu == null) return { nhan: "QL đã chấm", tone: "purple" };
  const lech = Number(ql) - Number(tu);
  if (Math.abs(lech) < 0.005) return { nhan: "Hai bên khớp", tone: "green" };
  return { nhan: `Lệch ${lech > 0 ? "+" : ""}${soGon(lech)}`, tone: "orange" };
}

export default function KpiScoreBoard({
  month,
  year,
  canScoreSelf = false,
  canScoreManager = false,
  canReview = false,
  taoDuocKhung = false,
  onNotice,
}) {
  const [khung, setKhung] = useState([]);
  const [dangTaoKhung, setDangTaoKhung] = useState(false);
  // Khoá nạp lại sau khi tạo khung. PHẢI khai ở đây, trên useEffect tải dữ liệu:
  // để dưới thì effect tham chiếu biến chưa khởi tạo và cả trang trắng xoá.
  const [taiLai, setTaiLai] = useState(0);
  const [quyTac, setQuyTac] = useState([]);
  const [phieu, setPhieu] = useState(null);

  const [dangTai, setDangTai] = useState(true);
  const [dangLuu, setDangLuu] = useState(false);
  const [dangKy, setDangKy] = useState("");
  const [loi, setLoi] = useState("");
  const [thongTin, setThongTin] = useState("");

  // Toàn bộ ô nhập là state cục bộ; chỉ đẩy lên API khi bấm nút, không gọi
  // mỗi lần gõ (một tiêu chí gõ 2 ký tự đã là 2 lượt POST cả phiếu).
  const [nhapTuCham, setNhapTuCham] = useState({});
  const [nhapQuanLy, setNhapQuanLy] = useState({});
  const [nhapGhiNhan, setNhapGhiNhan] = useState({});
  const [ghiChuChung, setGhiChuChung] = useState("");
  const [nhapDuyet, setNhapDuyet] = useState({});

  /** Nạp phiếu vừa lấy/lưu vào state và đồng bộ lại mọi ô nhập theo phiếu đó. */
  const apDungPhieu = (p) => {
    setPhieu(p);
    const tuCham = {};
    const quanLy = {};
    (p?.scores || []).forEach((s) => {
      tuCham[s.criterion] = chuanHoa(s.self_score);
      quanLy[s.criterion] = chuanHoa(s.manager_score);
    });
    setNhapTuCham(tuCham);
    setNhapQuanLy(quanLy);

    const ghiNhan = {};
    (p?.adjustments || []).forEach((a) => {
      ghiNhan[a.rule] = chuanHoa(a.quantity);
    });
    setNhapGhiNhan(ghiNhan);

    setGhiChuChung(p?.general_note || "");

    const duyet = {};
    (p?.approvals || []).forEach((o) => {
      duyet[o.stage] = {
        diem: chuanHoa(o.suggested_score),
        xepLoai: o.suggested_rating || "",
        ghiChu: o.note || "",
      };
    });
    setNhapDuyet(duyet);
  };

  useEffect(() => {
    let huy = false;
    setDangTai(true);
    setLoi("");
    setThongTin("");

    // ensure/ vừa lấy vừa tạo phiếu kèm đủ dòng tiêu chí và 3 ô ký, nên giao
    // diện không phải xử lý trường hợp "dòng chưa tồn tại".
    Promise.all([
      apiClient.get("/kpi-frame/"),
      apiClient.get("/kpi-frame/adjustment-rules/"),
      apiClient.post("/kpi-reports/ensure/", { month, year }),
    ])
      .then(([khungRes, quyTacRes, phieuRes]) => {
        if (huy) return;
        const dsKhung = khungRes.data;
        const dsQuyTac = quyTacRes.data;
        setKhung(Array.isArray(dsKhung) ? dsKhung : dsKhung?.results || []);
        setQuyTac(Array.isArray(dsQuyTac) ? dsQuyTac : dsQuyTac?.results || []);
        apDungPhieu(phieuRes.data);
      })
      .catch((e) => {
        if (huy) return;
        setPhieu(null);
        setLoi(thongDiepLoi(e, "Không tải được phiếu thi đua tháng. Vui lòng thử lại."));
      })
      .finally(() => {
        if (!huy) setDangTai(false);
      });

    return () => {
      huy = true;
    };
  }, [month, year, taiLai]);

  // Tách hẳn xem và chấm. Mặc định là XEM: bảng hiện số trơn đúng như bản thiết
  // kế. Bật chấm mới hiện ô nhập — trước đây lúc nào cũng bày ô nhập nên bảng
  // trông lệch hẳn so với mẫu và rối mắt với người chỉ vào xem.
  const [dangCham, setDangCham] = useState(false);

  const daDuyet = phieu?.status === "approved";
  // Phiếu đã duyệt thì backend chặn tự chấm lại; khoá luôn ở giao diện để người
  // dùng không gõ xong mới nhận lỗi 403.
  const chamDuocTuCham = canScoreSelf && !!phieu && !daDuyet;
  const suaDuocTuCham = chamDuocTuCham && dangCham;
  const chamDuocQuanLy = canScoreManager && !!phieu;
  const suaDuocQuanLy = chamDuocQuanLy && dangCham;
  // Điểm cộng/trừ do chính chủ phiếu hoặc quản lý ghi nhận (khớp quyền của
  // endpoint adjust/), nên mở theo cả hai cờ chấm điểm.
  const suaDuocDieuChinh = (suaDuocTuCham || suaDuocQuanLy) && !!phieu;

  const tong = phieu?.totals || {};
  const theoNhom = tong.by_group || {};

  // Đánh số STT chạy suốt bảng và số thứ tự trong từng nhóm — làm sẵn một lần
  // để phần dựng bảng không phải giữ biến đếm chạy giữa các vòng lặp lồng nhau.
  const dsNhom = useMemo(() => {
    let stt = 0;
    return (khung || []).map((g) => ({
      ...g,
      criteria: (g.criteria || []).map((c, i) => ({
        ...c,
        stt: (stt += 1),
        soTrongNhom: i + 1,
      })),
    }));
  }, [khung]);

  const diemTheoTieuChi = useMemo(() => {
    const m = new Map();
    (phieu?.scores || []).forEach((s) => m.set(s.criterion, s));
    return m;
  }, [phieu]);

  const quyTacCong = useMemo(() => quyTac.filter((r) => r.kind === "bonus"), [quyTac]);
  const quyTacTru = useMemo(() => quyTac.filter((r) => r.kind === "penalty"), [quyTac]);

  // Màn cha hứng thông báo thành công (dải xanh của cả trang). Không truyền
  // onNotice thì tự hiện tại chỗ để component vẫn dùng độc lập được.
  const baoTin = (cau) => {
    if (onNotice) onNotice(cau);
    else setThongTin(cau);
  };

  // --- Lưu điểm: gom hết thay đổi rồi bắn tối đa 3 lượt API ------------------
  // Trước đây khung chỉ nạp được bằng lệnh trên máy chủ, nên hệ thống mới dựng
  // lên là màn này trống trơn và không có đường nào tự thoát ra.
  const taoKhungMacDinh = async () => {
    setDangTaoKhung(true);
    setLoi("");
    try {
      await apiClient.post("/kpi-frame/seed-default/");
      setTaiLai((v) => v + 1);
    } catch (error) {
      setLoi(getErrorMessage(error, "Không tạo được khung chấm mặc định."));
    } finally {
      setDangTaoKhung(false);
    }
  };

  const luuDiem = async () => {
    if (!phieu) return;
    setLoi("");
    setThongTin("");

    const tuCham = [];
    const quanLy = [];
    const dieuChinh = [];

    for (const s of phieu.scores || []) {
      const tran = Number(s.max_score);
      if (suaDuocTuCham) {
        const raw = nhapTuCham[s.criterion] ?? "";
        if (chuanHoa(raw) !== chuanHoa(s.self_score)) {
          const n = docSo(raw);
          if (Number.isNaN(n)) return setLoi("Cột điểm GV chấm có ô không phải số.");
          if (n !== null && (n < 0 || n > tran)) {
            return setLoi(`Điểm GV chấm phải trong khoảng 0 - ${soGon(tran)}.`);
          }
          tuCham.push({ criterion: s.criterion, value: n });
        }
      }
      if (suaDuocQuanLy) {
        const raw = nhapQuanLy[s.criterion] ?? "";
        if (chuanHoa(raw) !== chuanHoa(s.manager_score)) {
          const n = docSo(raw);
          if (Number.isNaN(n)) return setLoi("Cột điểm QL chấm có ô không phải số.");
          if (n !== null && (n < 0 || n > tran)) {
            return setLoi(`Điểm QL chấm phải trong khoảng 0 - ${soGon(tran)}.`);
          }
          quanLy.push({ criterion: s.criterion, value: n });
        }
      }
    }

    if (suaDuocDieuChinh) {
      const daGhi = new Map((phieu.adjustments || []).map((a) => [a.rule, a]));
      for (const r of quyTac) {
        const raw = nhapGhiNhan[r.id] ?? "";
        const cu = chuanHoa(daGhi.get(r.id)?.quantity);
        if (chuanHoa(raw) === cu) continue;
        const n = docSo(raw);
        if (Number.isNaN(n)) return setLoi(`"${r.title}": ô ghi nhận không phải số.`);
        // Bỏ trống = ghi nhận 0; backend không có đường xoá dòng điều chỉnh.
        const soLuong = n === null ? 0 : Math.abs(n);
        if (soLuong > Number(r.cap)) {
          return setLoi(`"${r.title}": tối đa ${soGon(r.cap)} điểm.`);
        }
        dieuChinh.push({ rule: r.id, quantity: soLuong });
      }
    }

    if (!tuCham.length && !quanLy.length && !dieuChinh.length) {
      setThongTin("Chưa có thay đổi nào để lưu.");
      return;
    }

    setDangLuu(true);
    try {
      // Mỗi endpoint đều trả về nguyên phiếu, nên bản trả về cuối cùng là bản
      // mới nhất — không cần gọi thêm lượt GET để làm tươi.
      let ketQua = phieu;
      if (tuCham.length) {
        ketQua = (
          await apiClient.post(`/kpi-reports/${phieu.id}/score/`, {
            column: "self",
            scores: tuCham,
          })
        ).data;
      }
      if (quanLy.length) {
        ketQua = (
          await apiClient.post(`/kpi-reports/${phieu.id}/score/`, {
            column: "manager",
            scores: quanLy,
          })
        ).data;
      }
      if (dieuChinh.length) {
        ketQua = (
          await apiClient.post(`/kpi-reports/${phieu.id}/adjust/`, { adjustments: dieuChinh })
        ).data;
      }
      apDungPhieu(ketQua);
      baoTin(`Đã lưu bảng chấm điểm thi đua tháng ${month}/${year}.`);
      return true;
    } catch (e) {
      setLoi(thongDiepLoi(e, "Không lưu được điểm. Vui lòng thử lại."));
      return false;
    } finally {
      setDangLuu(false);
    }
  };

  const nopPhieu = async () => {
    if (!phieu) return;
    setLoi("");
    setThongTin("");
    setDangLuu(true);
    try {
      const { data } = await apiClient.post(`/kpi-reports/${phieu.id}/submit/`);
      apDungPhieu(data);
      baoTin("Đã nộp phiếu thi đua, chờ ba cấp ký duyệt.");
    } catch (e) {
      setLoi(thongDiepLoi(e, "Không nộp được phiếu."));
    } finally {
      setDangLuu(false);
    }
  };

  const luuGhiChu = async () => {
    if (!phieu) return;
    setLoi("");
    setThongTin("");
    setDangLuu(true);
    try {
      const { data } = await apiClient.patch(`/kpi-reports/${phieu.id}/`, {
        general_note: ghiChuChung,
      });
      apDungPhieu(data);
      baoTin("Đã lưu ghi chú chung.");
    } catch (e) {
      setLoi(thongDiepLoi(e, "Không lưu được ghi chú chung."));
    } finally {
      setDangLuu(false);
    }
  };

  const kyDuyet = async (stage, decision) => {
    if (!phieu) return;
    setLoi("");
    setThongTin("");
    const o = nhapDuyet[stage] || {};
    const payload = { stage, decision, note: o.ghiChu || "" };

    if (stage === "director") {
      if (o.xepLoai) payload.suggested_rating = o.xepLoai;
    } else {
      const n = docSo(o.diem);
      if (Number.isNaN(n)) return setLoi("Điểm đề xuất phải là số.");
      if (n !== null && (n < 0 || n > TONG_TIEU_CHI)) {
        return setLoi(`Điểm đề xuất phải trong khoảng 0 - ${TONG_TIEU_CHI}.`);
      }
      if (n !== null) payload.suggested_score = n;
    }

    setDangKy(`${stage}-${decision}`);
    try {
      const { data } = await apiClient.post(`/kpi-reports/${phieu.id}/review/`, payload);
      apDungPhieu(data);
      baoTin(
        decision === "approved"
          ? "Đã ký duyệt phiếu thi đua."
          : "Đã gửi yêu cầu chỉnh sửa cho chủ phiếu.",
      );
    } catch (e) {
      setLoi(thongDiepLoi(e, "Không ký được ô duyệt này."));
    } finally {
      setDangKy("");
    }
  };

  const doiDuyet = (stage, truong, giaTri) =>
    setNhapDuyet((cu) => ({ ...cu, [stage]: { ...(cu[stage] || {}), [truong]: giaTri } }));

  // --- Bảng điểm cộng / điểm trừ -------------------------------------------
  // Dùng DataTable dùng chung vì hai bảng này phẳng. Dòng tổng cuối bảng được
  // gắn cờ __tong để render khác đi, thay vì tự dựng lại một cái bảng nữa.
  const cotDieuChinh = (kieu) => {
    const dau = kieu === "bonus" ? "+" : "-";
    return [
      {
        key: "stt",
        header: "STT",
        align: "center",
        // Cột chỉ chứa một chữ số; 54px là lấy mất chỗ của "Cách tính" — cột
        // chữ dài nhất và là thứ người chấm thực sự phải đọc.
        width: 32,
        render: (r) => (r.__tong ? "" : r.stt),
      },
      {
        key: "title",
        header: "Tiêu chí",
        width: 86,
        render: (r) => (r.__tong ? <b>{r.title}</b> : r.title),
      },
      {
        key: "formula",
        header: "Cách tính",
        render: (r) => (r.__tong ? "" : r.formula || "—"),
      },
      {
        key: "cap",
        header: "Trần",
        align: "center",
        width: 46,
        render: (r) => (r.__tong ? "" : `${dau}${soGon(r.cap)}`),
      },
      // Cột "Ghi nhận" chỉ có nghĩa khi đang chấm; bản thiết kế ở chế độ xem
      // chỉ có STT / Tiêu chí / Cách tính / Trần.
      ...(dangCham
        ? [
          {
            key: "ghinhan",
            header: "Ghi nhận",
            align: "center",
            width: 68,
            render: (r) => {
              if (r.__tong) {
                return (
                  <b className={kieu === "bonus" ? "kpi-num kpi-num--cong" : "kpi-num kpi-num--tru"}>
                    {dau}
                    {soGon(r.__giaTri)}
                  </b>
                );
              }
              if (!suaDuocDieuChinh) {
                return <span>{nhapGhiNhan[r.id] ? `${dau}${nhapGhiNhan[r.id]}` : "—"}</span>;
              }
              return (
                <input
                  className="kpi-inp"
                  type="number"
                  min="0"
                  max={Number(r.cap)}
                  step="any"
                  value={nhapGhiNhan[r.id] ?? ""}
                  aria-label={`Ghi nhận — ${r.title}`}
                  onChange={(e) =>
                    setNhapGhiNhan((cu) => ({ ...cu, [r.id]: e.target.value }))
                  }
                />
              );
            },
          },
          ]
        : []),
    ];
  };

  const dongDieuChinh = (ds, kieu, tongDiem, nhanTong) => [
    ...ds.map((r, i) => ({ ...r, stt: i + 1 })),
    { id: `tong-${kieu}`, __tong: true, __giaTri: tongDiem, title: nhanTong },
  ];

  // --- Dựng giao diện -------------------------------------------------------
  if (dangTai) {
    return <p className="kpi-load">Đang tải bảng chấm điểm thi đua tháng...</p>;
  }

  if (!phieu) {
    return (
      <>
        {loi ? (
          <div className="alert red" role="alert" style={{ marginBottom: 14 }}>
            <span>⚠️</span>
            <div>{loi}</div>
          </div>
        ) : null}
        <EmptyState
          icon="🏅"
          title="Chưa mở được phiếu thi đua tháng này"
          hint="Kiểm tra lại tháng/năm, hoặc liên hệ quản trị nếu lỗi vẫn còn."
        />
      </>
    );
  }

  if (!dsNhom.length) {
    return (
      <EmptyState
        icon="📋"
        title="Chưa có khung chấm điểm thi đua"
        hint={
          taoDuocKhung
            ? "Bấm nút bên dưới để tạo khung mặc định: 4 nhóm chủ đề, 20 tiêu chí và 6 quy tắc cộng/trừ. Tạo xong sửa lại nội dung tuỳ ý."
            : "Hệ thống chưa có khung chấm. Nhờ admin tạo khung trước khi chấm điểm."
        }
        action={
          taoDuocKhung ? (
            <Button variant="primary" onClick={taoKhungMacDinh} disabled={dangTaoKhung}>
              {dangTaoKhung ? "Đang tạo..." : "Tạo khung mặc định"}
            </Button>
          ) : null
        }
      />
    );
  }

  // Một giao diện duy nhất cho cả xem lẫn chấm điểm — trước đây bấm "Chấm điểm"
  // sẽ nhảy sang một bảng khác hẳn, rất mất mạch.
  {
    return (
      <>
        {loi ? (
          <div className="alert red" role="alert" style={{ marginBottom: 14 }}>
            <span>⚠️</span>
            <div>{loi}</div>
          </div>
        ) : null}
        {thongTin ? (
          <div className="alert orange" role="status" style={{ marginBottom: 14 }}>
            <span>ℹ️</span>
            <div style={{ flex: 1 }}>{thongTin}</div>
          </div>
        ) : null}
        <KpiSheet
          nhungTrongKhung
          month={month}
          year={year}
          phieu={phieu}
          dsNhom={dsNhom}
          theoNhom={theoNhom}
          tong={tong}
          diemTheoTieuChi={diemTheoTieuChi}
          quyTacCong={quyTacCong}
          quyTacTru={quyTacTru}
          oDuyet={O_DUYET}
          nhanQuyetDinh={NHAN_QUYET_DINH}
          nhanTrangThai={NHAN_TRANG_THAI}
          trangThaiDong={trangThaiDong}
          nhapDuyet={nhapDuyet}
          onDoiDuyet={canReview ? doiDuyet : undefined}
          dangKy={dangKy}
          dangCham={dangCham}
          dangLuu={dangLuu}
          suaDuocTuCham={suaDuocTuCham}
          suaDuocQuanLy={suaDuocQuanLy}
          suaDuocDieuChinh={suaDuocDieuChinh}
          nhapTuCham={nhapTuCham}
          nhapQuanLy={nhapQuanLy}
          nhapGhiNhan={nhapGhiNhan}
          onDoiTuCham={(id, v) => setNhapTuCham((cu) => ({ ...cu, [id]: v }))}
          onDoiQuanLy={(id, v) => setNhapQuanLy((cu) => ({ ...cu, [id]: v }))}
          onDoiGhiNhan={(id, v) => setNhapGhiNhan((cu) => ({ ...cu, [id]: v }))}
          onLuuDiem={async () => { const ok = await luuDiem(); if (ok) setDangCham(false); }}
          onHuyCham={() => setDangCham(false)}
          thangXepLoai={THANG_XEP_LOAI}
          tranCong={TRAN_CONG}
          tranTru={TRAN_TRU}
          diemTran={DIEM_TRAN}
          tongTieuChi={TONG_TIEU_CHI}
          // KHÔNG truyền `thongBao`: gói mẫu để sẵn số 6, mà hệ thống chưa có
          // nguồn đếm thông báo nào — hiện lên là con số bịa.
          nguoiDung={{ ten: phieu?.owner_name }}
          ghiChuChung={ghiChuChung}
          onGhiChuChung={suaDuocDieuChinh ? setGhiChuChung : undefined}
          onChamDiem={chamDuocTuCham || chamDuocQuanLy ? () => setDangCham(true) : undefined}
          onNopBaoCao={chamDuocTuCham ? nopPhieu : undefined}
          onDuyet={canReview ? (stage) => kyDuyet(stage, "approved") : undefined}
          onYeuCauSua={canReview ? (stage) => kyDuyet(stage, "revision_required") : undefined}
          onXuatBaoCao={() => setThongTin("Xuất báo cáo sẽ được bổ sung ở bước sau.")}
          onXuatPDF={() => setThongTin("Xuất PDF sẽ được bổ sung ở bước sau.")}
          onXuatExcel={() => setThongTin("Xuất Excel sẽ được bổ sung ở bước sau.")}
        />
      </>
    );
  }

  return (
    <div className="kpi-board">
      {loi ? (
        <div className="alert red" role="alert" style={{ marginBottom: 14 }}>
          <span>⚠️</span>
          <div>{loi}</div>
        </div>
      ) : null}
      {thongTin ? (
        <div className="alert orange" role="status" style={{ marginBottom: 14 }}>
          <span>ℹ️</span>
          <div style={{ flex: 1 }}>{thongTin}</div>
        </div>
      ) : null}

      {/* A. Thẻ tóm tắt: từng nhóm chủ đề, rồi bốn thẻ tổng của cả phiếu. */}
      <div className="kpi-sum">
        {dsNhom.map((g, i) => {
          const t = theoNhom[g.code] || {};
          return (
            <Kpi
              key={g.id}
              // Icon vẽ bằng SVG theo mã nhóm: emoji mỗi hệ điều hành một kiểu,
              // không đặt được màu và trông không giống bản thiết kế.
              ico={(() => { const I = ICON_NHOM[g.code]; return I ? <I /> : (g.icon || "🏅"); })()}
              icoClass={MAU_NHOM[i % MAU_NHOM.length]}
              label={g.name}
              // Bản thiết kế chỉ có nhãn + số; dòng "GV x · QL y" làm thẻ cao
              // gấp rưỡi và đẩy cả hàng xuống, trong khi số chi tiết đã có ngay
              // trong bảng bên dưới.
              value={`${soGon(t.final)}/${soGon(t.max ?? g.max_score)}`}
            />
          );
        })}

        <Kpi
          ico={<IcCup />}
          icoClass="orange"
          label="Điểm KPI tháng"
          value={`${soGon(tong.criteria_total)}/${TONG_TIEU_CHI}`}
          sub={`Xếp loại tạm tính: ${tong.rating || "—"}`}
        />
        <Kpi
          ico={<IcCong />}
          icoClass="green"
          label="Điểm cộng"
          value={`+${soGon(tong.bonus_total)}`}
          sub={`Tối đa +${TRAN_CONG} điểm`}
        />
        <Kpi
          ico={<IcTru />}
          icoClass="red"
          label="Điểm trừ"
          value={`-${soGon(tong.penalty_total)}`}
          sub={`Tối đa -${TRAN_TRU} điểm`}
        />
        <Kpi
          ico={<IcSao />}
          icoClass="purple"
          label="Điểm trần"
          value={DIEM_TRAN}
          sub={`${TONG_TIEU_CHI} điểm tiêu chí + ${TRAN_CONG} điểm cộng`}
        />
      </div>

      {/* Bố cục theo bản thiết kế: bảng chấm chiếm cột trái, điểm cộng/trừ nằm
          cột phải cùng tầm mắt — chấm tới đâu nhìn thấy thưởng phạt tới đó, thay
          vì phải cuộn xuống cuối trang mới thấy. */}
      <div className="kpi-main">
        <div className="kpi-main__left">
      {/* B. Bảng chấm điểm. Bảng này gộp ô theo nhóm (rowSpan) nên không dùng
          được DataTable — DataTable luôn sinh đúng một <td> cho mỗi cột. Vẫn
          mượn nguyên lớp .ui-table để trông hệt các bảng khác trong hệ thống. */}
      {/* Bản thiết kế đặt tiêu đề lớn và hai nút hành động ở ĐẦU TRANG, còn tiêu
          đề mục 1 để trơn. Trước đây em nhét hết vào tiêu đề mục 1 nên vừa chật
          vừa khác mẫu. */}
      <div className="kpi-head">
        <div>
          <h2 className="kpi-head__title">
            BÁO CÁO THI ĐUA THÁNG {String(month).padStart(2, "0")}/{year}
          </h2>
          <div className="kpi-head__meta">
            <Badge tone={TONE_TRANG_THAI[phieu.status] || "gray"}>
              {NHAN_TRANG_THAI[phieu.status] || phieu.status}
            </Badge>
            {phieu.owner_name ? <span className="kpi-owner">{phieu.owner_name}</span> : null}
          </div>
        </div>
        <div className="kpi-head__acts">
          {dangCham ? (
            <>
              <Button variant="ghost" onClick={() => { setDangCham(false); apDungPhieu(phieu); setLoi(""); }} disabled={dangLuu}>
                Huỷ
              </Button>
              <Button variant="primary" onClick={async () => { const ok = await luuDiem(); if (ok) setDangCham(false); }}
                      loading={dangLuu} loadingText="Đang lưu...">
                💾 Lưu điểm
              </Button>
            </>
          ) : (
            <>
              {chamDuocTuCham || chamDuocQuanLy ? (
                <Button variant="ghost" onClick={() => setDangCham(true)}>✎ Chấm điểm</Button>
              ) : null}
              {chamDuocTuCham ? (
                <Button variant="primary" onClick={nopPhieu} disabled={dangLuu}>
                  📤 Nộp báo cáo
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>

      <Card
        title={`1. BẢNG CHẤM ĐIỂM THI ĐUA THÁNG ${month}`}
      >
        <div className="tbl-wrap">
          <table className="ui-table kpi-tbl">
            {/* Khoá bề rộng từng cột: bảng 9 cột trong nửa màn hình, để trình
                duyệt tự chia thì cột mô tả nuốt hết chỗ của hai cột điểm. */}
            <colgroup>
              <col className="c-stt" /><col className="c-nhom" /><col className="c-idx" />
              <col className="c-tieuchi" /><col className="c-mota" /><col className="c-max" />
              <col className="c-gv" /><col className="c-tt" />
            </colgroup>
            <thead>
              <tr>
                <th className="t-center" style={{ width: 54 }}>STT</th>
                <th style={{ width: 172 }}>Nhóm chủ đề</th>
                <th className="t-center" style={{ width: 46 }}>#</th>
                <th style={{ width: 230 }}>Tiêu chí</th>
                <th>Mô tả / Chỉ mục</th>
                <th className="t-center" style={{ width: 86 }}>Điểm tối đa</th>
                <th className="t-center" style={{ width: 108 }}>Điểm đạt</th>
                <th className="t-center" style={{ width: 128 }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {dsNhom.map((g, gi) => {
                const t = theoNhom[g.code] || {};
                return (
                  <Fragment key={g.id}>
                    {g.criteria.map((c, i) => {
                      const dong = diemTheoTieuChi.get(c.id);
                      const tt = trangThaiDong(dong);
                      return (
                        <tr key={c.id}>
                          {/* Bản thiết kế: cột STT là SỐ THỨ TỰ NHÓM (1-4) in to,
                              gộp ô suốt cả nhóm — không phải đánh số 1→20 từng
                              dòng. Nhìn vào là biết đang ở nhóm mấy. */}
                          {i === 0 ? (
                            <td className="kpi-stt" rowSpan={g.criteria.length}>
                              {gi + 1}
                            </td>
                          ) : null}
                          {i === 0 ? (
                            <td className="kpi-tbl__group" rowSpan={g.criteria.length}>
                              <span className="kpi-tbl__group-ico">
                                {(() => { const I = ICON_NHOM[g.code]; return I ? <I /> : (g.icon || "🏅"); })()}
                              </span>
                              <b>{g.name}</b>
                              <span className="kpi-tbl__group-sum">
                                {soGon(t.final)}/{soGon(t.max ?? g.max_score)} điểm
                              </span>
                            </td>
                          ) : null}
                          <td className="t-center">{c.soTrongNhom}</td>
                          <td className="kpi-tbl__title">{c.title}</td>
                          <td className="kpi-tbl__desc">{c.description || "—"}</td>
                          <td className="t-center">{soGon(c.max_score)} điểm</td>
                          {/* MỘT cột "Điểm đạt" như bản thiết kế, nhưng không mất
                              việc chấm hai lần: ai có quyền nào thì ô nhập gắn vào
                              cột đó, và khi quản lý chấm thì điểm giáo viên tự chấm
                              hiện ngay bên dưới làm tham chiếu — chỗ hai bên lệch
                              nhau vẫn nhìn ra, mà bảng không phải phình thêm cột. */}
                          <td className="t-center">
                            {suaDuocQuanLy ? (
                              <>
                                <input
                                  className="kpi-inp"
                                  type="number"
                                  min="0"
                                  max={Number(c.max_score)}
                                  step="any"
                                  value={nhapQuanLy[c.id] ?? ""}
                                  aria-label={`Điểm quản lý chấm — ${c.title}`}
                                  onChange={(e) =>
                                    setNhapQuanLy((cu) => ({ ...cu, [c.id]: e.target.value }))
                                  }
                                />
                                {dong?.self_score != null ? (
                                  <span className="kpi-refgv">GV: {hienSo(dong.self_score)}</span>
                                ) : null}
                              </>
                            ) : suaDuocTuCham ? (
                              <input
                                className="kpi-inp"
                                type="number"
                                min="0"
                                max={Number(c.max_score)}
                                step="any"
                                value={nhapTuCham[c.id] ?? ""}
                                aria-label={`Điểm tự chấm — ${c.title}`}
                                onChange={(e) =>
                                  setNhapTuCham((cu) => ({ ...cu, [c.id]: e.target.value }))
                                }
                              />
                            ) : (
                              <>
                                <span>{hienSo(dong?.manager_score ?? dong?.self_score)}</span>
                                {dong?.manager_score != null && dong?.self_score != null ? (
                                  <span className="kpi-refgv">GV: {hienSo(dong.self_score)}</span>
                                ) : null}
                              </>
                            )}
                          </td>
                          <td className="t-center">
                            <Badge tone={tt.tone}>{tt.nhan}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="kpi-tbl__sum">
                      <td colSpan={8}>
                        Tổng điểm {g.name}: <b>{soGon(t.final)}</b> điểm
                        <span className="kpi-tbl__sum-max">
                          / {soGon(t.max ?? g.max_score)} điểm tối đa
                        </span>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {!suaDuocTuCham && !suaDuocQuanLy ? (
          <p className="kpi-hint">Bạn chỉ có quyền xem bảng chấm điểm này.</p>
        ) : null}
      </Card>

        </div>

        <div className="kpi-main__right">
      {/* C. Điểm cộng / điểm trừ. */}
      <Card title="2. ĐIỂM CỘNG / ĐIỂM TRỪ">
        <h4 className="kpi-sub">A. ĐIỂM CỘNG (tối đa +{TRAN_CONG} điểm)</h4>
        <DataTable
          className="kpi-adj-tbl"
          columns={cotDieuChinh("bonus")}
          rows={dongDieuChinh(quyTacCong, "bonus", tong.bonus_total, "Tổng điểm cộng")}
          empty="Chưa khai báo quy tắc điểm cộng."
          minWidth={0}
        />

        <h4 className="kpi-sub kpi-sub--tru">B. ĐIỂM TRỪ (tối đa -{TRAN_TRU} điểm)</h4>
        <DataTable
          className="kpi-adj-tbl"
          columns={cotDieuChinh("penalty")}
          rows={dongDieuChinh(quyTacTru, "penalty", tong.penalty_total, "Tổng điểm trừ")}
          empty="Chưa khai báo quy tắc điểm trừ."
          minWidth={0}
        />
      </Card>

      {/* D. Ba ô ký duyệt. */}
        </div>
      </div>

      {/* Hàng dưới cùng chia 3 cột đúng bản thiết kế. */}
      <div className="kpi-bottom">
      <Card title="3. PHÊ DUYỆT">
        <div className="kpi-approve">
          {O_DUYET.map((o) => {
            const daKy = (phieu.approvals || []).find((a) => a.stage === o.stage);
            const quyetDinh = daKy?.decision || "pending";
            const nhap = nhapDuyet[o.stage] || {};
            return (
              <div className="kpi-approve__box" key={o.stage}>
                <div className="kpi-approve__head">
                  <b>{o.ten}</b>
                  <Badge tone={TONE_QUYET_DINH[quyetDinh] || "gray"}>
                    {NHAN_QUYET_DINH[quyetDinh] || quyetDinh}
                  </Badge>
                </div>
                <p className="kpi-approve__desc">{o.moTa}</p>

                {o.kieu === "diem" ? (
                  <Field label={`Điểm đề xuất __/${TONG_TIEU_CHI}`}>
                    <input
                      type="number"
                      min="0"
                      max={TONG_TIEU_CHI}
                      step="any"
                      value={nhap.diem ?? ""}
                      disabled={!canReview}
                      placeholder={`0 - ${TONG_TIEU_CHI}`}
                      onChange={(e) => doiDuyet(o.stage, "diem", e.target.value)}
                    />
                  </Field>
                ) : (
                  <Field label="Xếp loại đề xuất">
                    <select
                      value={nhap.xepLoai ?? ""}
                      disabled={!canReview}
                      onChange={(e) => doiDuyet(o.stage, "xepLoai", e.target.value)}
                    >
                      <option value="">-- Chọn xếp loại --</option>
                      {THANG_XEP_LOAI.map((x) => (
                        <option key={x.ten} value={x.ten}>{x.ten}</option>
                      ))}
                    </select>
                  </Field>
                )}

                <Field label="Ý kiến">
                  <input
                    type="text"
                    value={nhap.ghiChu ?? ""}
                    disabled={!canReview}
                    placeholder="Ghi chú cho chủ phiếu"
                    onChange={(e) => doiDuyet(o.stage, "ghiChu", e.target.value)}
                  />
                </Field>

                {canReview ? (
                  <div className="kpi-approve__acts">
                    <Button
                      size="sm"
                      className="kpi-btn-ok"
                      loading={dangKy === `${o.stage}-approved`}
                      disabled={!!dangKy}
                      onClick={() => kyDuyet(o.stage, "approved")}
                    >
                      ✓ Duyệt
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={dangKy === `${o.stage}-revision_required`}
                      disabled={!!dangKy}
                      onClick={() => kyDuyet(o.stage, "revision_required")}
                    >
                      ↩ Yêu cầu chỉnh sửa
                    </Button>
                  </div>
                ) : null}

                {daKy?.decided_by_name ? (
                  <p className="kpi-approve__by">
                    Đã ký: {daKy.decided_by_name}
                    {daKy.decided_at
                      ? ` — ${new Date(daKy.decided_at).toLocaleDateString("vi-VN")}`
                      : ""}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>

      {/* E. Ghi chú chung + xuất file. */}
      <Card title="4. GHI CHÚ CHUNG">
        <Field
          label="Nhận xét chung về tháng"
          hint="Ghi nhận nổi bật, việc cần cải thiện, cam kết tháng tới."
        >
          <textarea
            rows={4}
            value={ghiChuChung}
            disabled={!suaDuocDieuChinh}
            placeholder="Nhập ghi chú chung cho phiếu thi đua tháng..."
            onChange={(e) => setGhiChuChung(e.target.value)}
          />
        </Field>
        <div className="kpi-note__acts">
          {suaDuocDieuChinh ? (
            <Button variant="primary" size="sm" onClick={luuGhiChu} disabled={dangLuu}>
              💾 Lưu ghi chú
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={() => setThongTin("Xuất PDF sẽ được bổ sung ở bước sau.")}
          >
            📄 Xuất PDF
          </Button>
          <Button
            size="sm"
            onClick={() => setThongTin("Xuất Excel sẽ được bổ sung ở bước sau.")}
          >
            📊 Xuất Excel
          </Button>
        </div>
      </Card>

      {/* F. Thang điểm xếp loại. */}
      <Card title="5. THANG ĐIỂM XẾP LOẠI">
        <div className="kpi-scale">
          {THANG_XEP_LOAI.map((x) => (
            <div
              className={`kpi-scale__item${tong.rating === x.ten ? " is-current" : ""}`}
              key={x.ten}
            >
              {/* Thứ tự đúng bản thiết kế: sao bên trái, tên và khoảng điểm bên phải. */}
              <span className="kpi-scale__stars" aria-label={`${x.sao} sao`}>
                {"★".repeat(x.sao)}
                <i>{"☆".repeat(5 - x.sao)}</i>
              </span>
              <span>
                <span className="kpi-scale__name">{x.ten}: </span>
                <span className="kpi-scale__range">{x.mo_ta}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="kpi-hint">
          Điểm chốt tháng {month}/{year}: <b>{soGon(tong.final_total)}</b> điểm —
          xếp loại <b>{tong.rating || "—"}</b> (tiêu chí {soGon(tong.criteria_total)} +
          cộng {soGon(tong.bonus_total)} − trừ {soGon(tong.penalty_total)}).
        </p>
      </Card>
      </div>
    </div>
  );
}
