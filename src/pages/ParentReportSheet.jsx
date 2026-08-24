import "../styles/parentReport.css";

/* ==========================================================================
   ParentReportSheet — phần HIỂN THỊ của phiếu BÁO CÁO HỌC TẬP THÁNG (UI mới).
   Nhận đúng view-model "v" mà ParentReport.jsx đang tính (report_detail + fallback).
   Không gọi API, không tính toán dữ liệu -> chỉ dựng khổ phiếu 1055x1491.
   Ảnh/icon: đặt trong public/report/ (xem README-patch.md).
   ========================================================================== */

const A = "/report/";                       // đổi nếu để asset ở nơi khác
const isNum = (x) => x !== null && x !== undefined && x !== "" && !Number.isNaN(Number(x));
const r1 = (x) => { const n = Math.round(Number(x) * 10) / 10; return Number.isInteger(n) ? n : n.toFixed(1); };
const num = (x, s = "") => (isNum(x) ? `${r1(x)}${s}` : "—");
const txt = (x) => (x && String(x).trim() ? String(x).trim() : "—");
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const initialsOf = (name) => {
  const p = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[p.length - 2][0] + p[p.length - 1][0]).toUpperCase();
};

/** Sao đánh giá 0..5, hỗ trợ nửa sao. */
function Stars({ value, max = 5 }) {
  if (!isNum(value)) return <span className="pr2-dash">—</span>;
  const v = clamp(Number(value), 0, max);
  return (
    <span style={{ letterSpacing: "1.5px", color: "#F7610A", whiteSpace: "nowrap" }}>
      {Array.from({ length: max }, (_, i) => {
        const fill = clamp(v - i, 0, 1);
        if (fill >= 0.9) return <span key={i}>★</span>;
        if (fill <= 0.1) return <span key={i} style={{ color: "#E6DCD2" }}>☆</span>;
        return (
          <span key={i} style={{
            background: `linear-gradient(90deg,#F7610A ${Math.round(fill * 100)}%,#E6DCD2 ${Math.round(fill * 100)}%)`,
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>★</span>
        );
      })}
    </span>
  );
}

const Delta = ({ value, unit = "" }) =>
  !isNum(value) || Number(value) === 0 ? null : (
    <span className={Number(value) > 0 ? "" : "down"}>
      {Number(value) > 0 ? "▲" : "▼"} {r1(Math.abs(Number(value)))}{unit}
    </span>
  );

/** Radar 6 trục — vẽ tay, không thư viện. */
function Radar({ skills }) {
  const list = (skills || []).filter((s) => isNum(s?.score)).slice(0, 6);
  if (list.length < 3) return null;
  const cx = 163, cy = 120, R = 93, n = list.length;
  // Hệ thống chấm thang 0-10 chứ không phải 0-100 như bản in mẫu; để mặc định 100
  // thì thanh kỹ năng chỉ dài ~8% và radar co về gần tâm.
  const maxOf = (s) => (isNum(s?.max) && Number(s.max) > 0 ? Number(s.max) : 10);
  const pt = (i, ratio) => {
    const a = ((-90 + (360 / n) * i) * Math.PI) / 180, rr = R * clamp(ratio, 0, 1);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  };
  const poly = (rs) => rs.map((v, i) => pt(i, v).map((z) => z.toFixed(1)).join(",")).join(" ");
  const cur = list.map((s) => Number(s.score) / maxOf(s));
  const hasPrev = list.some((s) => isNum(s?.delta));
  const prev = list.map((s) => (Number(s.score) - (isNum(s.delta) ? Number(s.delta) : 0)) / maxOf(s));
  return (
    <svg viewBox="0 0 405 217" role="img" aria-label="Biểu đồ radar kỹ năng">
      {[1, 0.8, 0.6, 0.4, 0.2].map((rg) => (
        <polygon key={rg} points={poly(list.map(() => rg))} fill="none" stroke="#EFE3D5" strokeWidth="1" />
      ))}
      {list.map((s, i) => {
        const [x, y] = pt(i, 1);
        return <line key={`ax${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke="#EFE3D5" strokeWidth="1" />;
      })}
      {hasPrev && (
        <polygon points={poly(prev)} fill="rgba(169,154,136,.15)" stroke="#B0A296" strokeWidth="1.6" strokeDasharray="5 3" />
      )}
      <polygon points={poly(cur)} fill="rgba(247,97,10,.10)" stroke="#F7610A" strokeWidth="2.4" />
      {cur.map((v, i) => {
        const [x, y] = pt(i, v);
        return <circle key={`d${i}`} cx={x} cy={y} r="3.2" fill="#F7610A" />;
      })}
      {list.map((s, i) => {
        const [x, y] = pt(i, 1.13);
        const anchor = Math.abs(x - cx) < 10 ? "middle" : x > cx ? "start" : "end";
        return (
          <text key={`lb${i}`} x={x} y={y + (Math.abs(x - cx) < 10 ? (y < cy ? -6 : 15) : 4)} textAnchor={anchor} className="pr2-radar__ax">
            {s.label || s.key}
          </text>
        );
      })}
      {[100, 80, 60, 40, 20].map((t, i) => (
        <text key={t} x={155 - i * 3} y={28 + i * 19} textAnchor="end" className="pr2-radar__rg">{t}</text>
      ))}
    </svg>
  );
}

/** Lộ trình học tập cả năm học (05 -> 04) — dựng theo đúng bản UI chủ dự án gửi
 *  (lo-trinh-hoc-tap.html): thanh %, một đường ray liền chạy suốt, phần đã đi
 *  tô xanh đè lên, 12 mốc chia đều.
 *
 *  Đường ray là MỘT dải tuyệt đối chứ không phải viền của từng mốc: có vậy đoạn
 *  xanh mới dừng đúng tâm mốc đang học thay vì đứt theo từng ô.
 *  --lt-edge = nửa cột, để hai đầu ray khớp tâm mốc đầu và mốc cuối.
 *  --lt-done = từ tâm mốc đầu tới tâm mốc đang học = (vị trí / tổng số tháng). */
function MonthRoadmap({ months, percent }) {
  const pt = isNum(percent) ? clamp(Number(percent), 0, 100) : 0;
  const n = months.length || 1;
  const viTriDangHoc = months.findIndex((m) => m.state === "current");
  const style = {
    "--lt-edge": `${100 / (2 * n)}%`,
    "--lt-done": `${viTriDangHoc > 0 ? (viTriDangHoc / n) * 100 : 0}%`,
  };
  return (
    <div className="lt-body" style={style}>
      <div className="lt-bar">
        <div className="lt-bar-fill" style={{ width: `${pt}%` }}>
          <span>{Math.round(pt)}%</span>
        </div>
      </div>

      <div className="lt-track">
        <div className="lt-rail" />
        <div className="lt-rail-done" />

        <div className="lt-months">
          {months.map((m, i) => {
            const laCuoi = i === n - 1 && m.state === "upcoming";
            const nhan = m.state === "current" ? "is-current"
              : m.state === "done" || m.state === "past" ? "is-done" : "";
            const soBuoi = m.present !== null && m.total ? `${m.present}/${m.total}` : null;
            return (
              <div className="lt-month" key={`${m.year}-${m.month}`}>
                <div className={`lt-label ${nhan}`}>
                  {`${String(m.month).padStart(2, "0")}/${String(m.year).slice(2)}`}
                </div>
                <div className="lt-node-wrap">
                  {laCuoi ? (
                    <span className="lt-node lt-node--end">⚑</span>
                  ) : m.state === "done" ? (
                    <span className="lt-node lt-node--done">✓</span>
                  ) : m.state === "past" ? (
                    /* Tháng đã trôi qua nhưng chưa ai nộp phiếu: vòng xanh rỗng.
                       Không tick "hoàn thành" cho tháng chưa có số liệu. */
                    <span className="lt-node lt-node--past"><i /></span>
                  ) : m.state === "current" ? (
                    <span className="lt-node lt-node--current"><i /></span>
                  ) : (
                    <span className="lt-node lt-node--next"><i /></span>
                  )}
                </div>
                {laCuoi ? (
                  <div className="lt-sub is-end">Kết thúc</div>
                ) : soBuoi ? (
                  <div className="lt-sub">{soBuoi}</div>
                ) : null}
                {m.state === "current" ? <div className="lt-now">Đang học</div> : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Điểm thi tháng của khối cấp 2 — cột theo từng tháng đã lưu trong hệ thống. */
function ExamHistory({ rows }) {
  const max = 10;
  return (
    <div className="pr2-exam">
      {rows.map((x) => {
        const h = isNum(x.score) ? clamp((Number(x.score) / max) * 100, 0, 100) : 0;
        return (
          <div className={`pr2-exam__col${x.isCurrent ? " current" : ""}`} key={`${x.year}-${x.month}`}>
            <span className="pr2-exam__val">{num(x.score)}</span>
            <span className="pr2-exam__bar"><i style={{ height: `${h}%` }} /></span>
            <span className="pr2-exam__mon">{x.short}</span>
            <span className="pr2-exam__d"><Delta value={x.delta} /></span>
          </div>
        );
      })}
    </div>
  );
}

export default function ParentReportSheet({ v }) {
  const units = (v.units || []).slice(0, 8);
  const skills = v.skills || [];
  // Chỉ dựng lộ trình theo tháng khi backend thực sự trả về 12 mốc; phiếu cũ
  // chưa có trường này vẫn hiện dải Unit như trước, không vỡ.
  const coLoTrinhThang = Array.isArray(v.roadmapMonths) && v.roadmapMonths.length > 0;
  const diemThiThang = Array.isArray(v.monthlyExams) ? v.monthlyExams : [];
  const coDiemThiThang = v.isSecondary && diemThiThang.length > 0;
  const baiDangHoc = units.find((u) => u.state === "current") || null;
  const barMax = (s) => (isNum(s.max) && Number(s.max) > 0 ? Number(s.max) : 10);

  const info = [
    ["ident-1", "Họ tên:", v.studentName, true],
    ["ident-2", "Lớp:", v.classCode],
    ["ident-3", "Chương trình:", v.programLabel && v.programLabel[0] + v.programLabel.slice(1).toLowerCase()],
    ["ident-4", "Giáo viên:", v.teacherName],
    ["ident-5", "Cấp độ:", v.levelName],
    ["ident-6", "Cơ sở:", v.centerName],
  ];

  return (
    <div className="pr2-sheet">
      {/* ĐẦU PHIẾU */}
      <img className="pr2-logo" src={A + "logo.png"} alt="VISTA — Perfect Your English" />
      {v.avatarUrl ? (
        <img className="pr2-avatar" src={v.avatarUrl} alt={v.studentName || "Học viên"} />
      ) : (
        <div className="pr2-avatar pr2-avatar--ph">{initialsOf(v.studentName)}</div>
      )}

      <div className="pr2-head">
        <h1>BÁO CÁO HỌC TẬP THÁNG</h1>
        <div className="pr2-head__prog">CHƯƠNG TRÌNH <b>{v.programLabel || "—"}</b></div>
      </div>

      <div className="pr2-month">
        <div className="pr2-month__top">
          <img src={A + "ic-cal-hdr.png"} alt="" />
          <div style={{ textAlign: "center" }}>
            <div className="pr2-month__lb">THÁNG BÁO CÁO</div>
            <div className="pr2-month__val">{v.periodShort}</div>
          </div>
        </div>
        <div className="pr2-month__sub">Ngày xuất báo cáo: {v.exportedAt || "—"}</div>
      </div>

      {/* THÔNG TIN HỌC VIÊN */}
      <div className="pr2-ident">
        {info.map(([ico, lb, val, dark]) => (
          <div className="pr2-ident__cell" key={lb}>
            <span className="pr2-ident__ico"><img src={A + ico + ".png"} alt="" /></span>
            <div>
              <div className="pr2-ident__lb">{lb}</div>
              <div className={"pr2-ident__val" + (dark ? " dark" : "")}>{txt(val)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 5 THẺ CHỈ SỐ */}
      <div className="pr2-stats">
        <div className="pr2-stat">
          <span className="pr2-stat__ico"><img src={A + "ic-att.png"} alt="" /></span>
          <div className="pr2-stat__lb">{v.isSecondary ? "Điểm chuyên cần" : "Tỷ lệ chuyên cần"}</div>
          {/* Khối cấp 2 chấm chuyên cần Đạt / Chưa đạt, không đọc phần trăm. */}
          {v.isSecondary && v.attPassLabel ? (
            <div className={`pr2-stat__val pass${v.attPass ? "" : " fail"}`}>{v.attPassLabel}</div>
          ) : (
            <div className="pr2-stat__val">{num(v.attPercent, "%")}</div>
          )}
          <div className="pr2-stat__sub">{v.sessDone !== null && v.sessTotal ? `${v.sessDone} / ${v.sessTotal} buổi` : "—"}</div>
        </div>
        <div className="pr2-stat">
          <span className="pr2-stat__ico"><img src={A + "ic-task.png"} alt="" /></span>
          <div className="pr2-stat__lb">Tỷ lệ hoàn thành nhiệm vụ</div>
          <div className="pr2-stat__val">{num(v.taskPercent, "%")}</div>
          <div className="pr2-stat__sub">{v.taskDone !== null && v.taskTotal ? `${v.taskDone} / ${v.taskTotal} nhiệm vụ` : "—"}</div>
        </div>
        <div className="pr2-stat">
          <span className="pr2-stat__ico"><img src={A + "ic-score.png"} alt="" /></span>
          <div className="pr2-stat__lb">Điểm trung bình tổng thể</div>
          <div className="pr2-stat__val orange">{num(v.totalPercent)} <small>/ 10</small></div>
          <div className="pr2-stat__sub up">{isNum(v.totalDelta) && v.totalDelta !== 0 ? <Delta value={v.totalDelta} unit=" điểm" /> : "—"}</div>
        </div>
        <div className="pr2-stat">
          <span className="pr2-stat__ico"><img src={A + "ic-cefr.png"} alt="" /></span>
          <div className="pr2-stat__lb">CEFR Progress</div>
          <div className="pr2-stat__val">{num(v.cefrProgress, "%")}</div>
          <div className="pr2-stat__sub tight">{v.cefrTarget ? <>Đang tiến gần đến<br />{v.cefrTarget}</> : "—"}</div>
        </div>
        <div className="pr2-stat">
          <span className="pr2-stat__ico"><img src={A + "ic-rank.png"} alt="" /></span>
          <div className="pr2-stat__lb">Xếp hạng lớp</div>
          <div className="pr2-stat__val dark">{v.classRank !== null ? v.classRank : "—"}{v.classSize ? <small> / {v.classSize}</small> : null}</div>
          <div className="pr2-stat__sub">{v.classTopPercent !== null ? `Top ${r1(v.classTopPercent)}%` : "—"}</div>
        </div>
      </div>

      {/* 1. LỘ TRÌNH */}
      <div className={`pr2-card pr2-c1${coDiemThiThang ? " lt-full" : ""}`} data-screen-label="01">
        <div className="pr2-card__hd lt-head">
          <span className="pr2-no lt-badge">1</span>
          <h2 className="lt-title">
            LỘ TRÌNH HỌC TẬP{coLoTrinhThang && v.roadmapYearLabel
              ? ` ${v.roadmapYearLabel.replace(" - ", "–")}`
              : ` THÁNG ${v.monthNum || v.periodShort}`}
          </h2>
          {v.sessTotal ? (
            <span className="pr2-right lt-meta">
              Số buổi đã học:{" "}
              <b>
                {v.sessDone !== null ? v.sessDone : "—"}/{v.sessTotal}
                {v.sessPercent !== null ? ` (${r1(v.sessPercent)}%)` : ""}
              </b>
            </span>
          ) : null}
        </div>

        {coLoTrinhThang ? (
          <MonthRoadmap months={v.roadmapMonths} percent={v.roadmapPercent} />
        ) : (
          <div className="pr2-tl">
            {units.map((u, i) => {
              const st = u.state === "done" ? "done" : u.state === "current" ? "current" : "upcoming";
              return (
                <div className={`pr2-tl__item ${st}`} key={`${u.code || "u"}-${i}`}>
                  <span className="pr2-tl__dot">{st === "done" ? "✓" : <i />}</span>
                  <span className="pr2-tl__code">{txt(u.code)}</span>
                  <span className="pr2-tl__name">{u.title || ""}</span>
                </div>
              );
            })}
            <div className="pr2-tl__item flag">
              <img src={A + "ic-flag.png"} alt="" />
              <span className="pr2-tl__code">{v.mockName || "Mock Test"}</span>
              <span className="pr2-tl__name">(Progress)</span>
            </div>
          </div>
        )}

        {/* Ba ô "Đang học / Kiểm tra giữa tháng / Đánh giá giữa khoá" là khái niệm
            của chương trình Cambridge; khối cấp 2 không có nên bỏ hẳn, nhường
            chỗ cho lộ trình 12 tháng đúng như bản thiết kế. */}
        {coDiemThiThang ? null : (
        <div className="pr2-3box">
          <div className="pr2-3box__c1">
            <div className="pr2-box__lb">Đang học</div>
            {/* Dải Unit không còn nằm trên thẻ này nữa (đã nhường chỗ cho lộ trình
                12 tháng), nên bài đang học lấy luôn từ danh sách Unit khi giáo
                viên chưa điền riêng ô "Đang học" — để dữ liệu đã nhập không mất chỗ hiện. */}
            <div className="pr2-box__title">{txt(v.currentUnit?.title || baiDangHoc?.title || baiDangHoc?.code)}</div>
            <div className="pr2-box__note">{v.currentUnit?.note || baiDangHoc?.code || ""}</div>
          </div>
          <div className="pr2-3box__c2">
            <div className="pr2-box__lb">Bài kiểm tra giữa tháng</div>
            <div className="pr2-box__title red">{txt(v.midterm?.title)}</div>
            <div className="pr2-box__note">{v.midterm?.note || ""}</div>
          </div>
          <div className="pr2-3box__c3">
            <div className="pr2-box__lb">Đánh giá giữa khóa</div>
            <div className="pr2-box__line">{txt(v.checkpoint?.title)}</div>
            <div className="pr2-box__date">{v.checkpoint?.note || ""}</div>
            {v.checkpoint?.badge ? <span className="pr2-pill">{v.checkpoint.badge}</span> : null}
          </div>
        </div>
        )}
      </div>

      {/* 2. TỔNG QUAN KỸ NĂNG */}
      <div className="pr2-card pr2-c2" data-screen-label="02">
        <div className="pr2-card__hd">
          <span className="pr2-no">2</span>
          <h2>TỔNG QUAN KỸ NĂNG</h2>
          <div className="pr2-c2colhd">
            <span>Kỹ năng</span><span /><span />
            <span><span>Điểm số</span><span>Thay đổi</span></span>
          </div>
        </div>
        <div className="pr2-skill">
          <div className="pr2-big">
            <div className="pr2-big__lb">Điểm trung bình<br />tổng thể</div>
            <div className="pr2-big__val">{num(v.totalPercent)} <small>/ 10</small></div>
            {isNum(v.totalDelta) && v.totalDelta !== 0 ? (
              <div className="pr2-big__delta">
                {Number(v.totalDelta) > 0 ? "▲ Tăng" : "▼ Giảm"} {r1(Math.abs(v.totalDelta))} điểm so với tháng trước
              </div>
            ) : null}
            <div className="pr2-big__note">Thang điểm {v.levelName ? `Cambridge ${v.levelName.replace(/^A\d\s*/, "")}` : "Cambridge"}</div>
            <div className="pr2-big__note">(Tối đa 100 điểm)</div>
          </div>
          <div className="pr2-bars">
            {skills.map((s) => (
              <div className="pr2-bar" key={s.key || s.label}>
                <span className="pr2-bar__lb">{s.label}</span>
                <span className="pr2-bar__track">
                  <i style={{ width: `${isNum(s.score) ? clamp((Number(s.score) / barMax(s)) * 100, 0, 100) : 0}%` }} />
                </span>
                <span className="pr2-bar__val">{num(s.score)}</span>
                <span className="pr2-bar__d"><Delta value={s.delta} /></span>
                <span className="pr2-bar__d"><Delta value={s.delta} /></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pr2-card pr2-radar">
        <div className="pr2-radar__hd">
          <span>Biểu đồ kỹ năng</span>
          <span className="pr2-legend">
            <span><i />Tháng {v.periodShort}</span>
            <span><i className="prev" />Tháng trước</span>
          </span>
        </div>
        <Radar skills={skills} />
      </div>

      {/* 3. KHỐI CẤP 2 — ĐIỂM THI THÁNG / các khối khác — SẴN SÀNG KỲ THI */}
      {coDiemThiThang ? (
        <div className="pr2-card pr2-c3" data-screen-label="03">
          <div className="pr2-card__hd">
            <span className="pr2-no">3</span><h2>ĐIỂM THI THÁNG</h2>
            <span className="pr2-right">Kết quả đã lưu từ đầu năm học</span>
          </div>
          <div className="pr2-mock">
            <div>
              <div className="pr2-mock__ttl">
                <b>DIỄN BIẾN QUA CÁC THÁNG</b>
                <span className="pr2-mock__date">Thang điểm <b>10</b></span>
              </div>
              <ExamHistory rows={diemThiThang} />
            </div>
            <div className="pr2-panel">
              <div className="pr2-panel__lb">THÁNG {v.periodShort}</div>
              <div className="pr2-shield"><span>{num(v.monthlyExams.find((x) => x.isCurrent)?.score)}</span></div>
              <div className="pr2-panel__tag">{txt(v.gradeLabel) !== "—" ? v.gradeLabel : ""}</div>
              <div className="pr2-panel__note">
                {v.monthlyExamAverage !== null
                  ? <>Trung bình {diemThiThang.length} tháng:<br /><b>{num(v.monthlyExamAverage)}</b> / 10</>
                  : ""}
              </div>
            </div>
          </div>
        </div>
      ) : (
      <div className="pr2-card pr2-c3" data-screen-label="03">
        <div className="pr2-card__hd"><span className="pr2-no">3</span><h2>SẴN SÀNG KỲ THI CAMBRIDGE</h2></div>
        <div className="pr2-mock">
          <div>
            <div className="pr2-mock__ttl">
              <b>{(v.mockName || "KẾT QUẢ MOCK TEST").toUpperCase()}</b>
              {v.mockDate ? <span className="pr2-mock__date">Ngày thi: <b>{v.mockDate}</b></span> : null}
            </div>
            <div className="pr2-mrow hd">
              <span>Kỹ năng</span>
              <span>Điểm đạt được <small>(/100)</small></span>
              <span>Điểm Cambridge <small>(ước tính)</small></span>
            </div>
            {v.mockRows.map((r, i) => (
              <div className="pr2-mrow" key={`${r.skill || "r"}-${i}`}>
                <span>{txt(r.skill)}</span>
                <span><b className="sc">{num(r.score)}</b><Stars value={r.stars} /></span>
                <span>{num(r.cambridge)}</span>
              </div>
            ))}
            {v.mockOverall !== null ? (
              <div className="pr2-mrow total">
                <span>Tổng điểm</span>
                <span><b className="sc">{num(v.mockOverall)}</b></span>
                <span>{num(v.mockOverall)}</span>
              </div>
            ) : null}
          </div>
          <div className="pr2-panel">
            <div className="pr2-panel__lb">ĐÁNH GIÁ CHUNG</div>
            <div className="pr2-shield"><span>{num(v.mockOverall)}</span></div>
            <div className="pr2-panel__tag">{txt(v.mockOverallLabel)}</div>
            <div className="pr2-panel__note">{v.mockOverallNote || ""}</div>
          </div>
        </div>
        {v.mockFootnote ? <div className="pr2-foot-note">{v.mockFootnote}</div> : null}
      </div>
      )}

      {/* 4. TIẾN ĐỘ CẤP ĐỘ */}
      <div className="pr2-card pr2-c4" data-screen-label="04">
        <div className="pr2-card__hd"><span className="pr2-no">4</span><h2>TIẾN ĐỘ HƯỚNG TỚI CẤP ĐỘ TIẾP THEO</h2></div>
        <div className="pr2-level">
          <div className="pr2-lvl">
            <div className="pr2-lvl__lb">Cấp độ hiện tại</div>
            <div className="pr2-badge">
              <b>{(v.cefrCurrent || v.levelName || "—").split(" ")[0]}</b>
              <span>{(v.cefrCurrent || v.levelName || "").split(" ").slice(1).join(" ")}</span>
            </div>
            <div className="pr2-cefr">CEFR</div>
          </div>
          <div className="pr2-lvl">
            <div className="pr2-lvl__lb">Tiến độ tổng thể</div>
            <div className="pr2-donut" style={{ background: `conic-gradient(#1A8A45 0 ${isNum(v.cefrProgress) ? clamp(Number(v.cefrProgress), 0, 100) : 0}%, #E7E0D8 0)` }}>
              <span>{num(v.cefrProgress, "%")}</span>
            </div>
            <div className="pr2-stat__sub tight" style={{ marginTop: 8 }}>
              {v.cefrTarget ? <>Đang tiến gần đến<br />{v.cefrTarget}</> : "—"}
            </div>
          </div>
          <div className="pr2-lvl">
            <div className="pr2-lvl__lb">Mục tiêu tiếp theo</div>
            <div className="pr2-badge next">
              <b>{(v.cefrTarget || "—").split(" ")[0]}</b>
              <span>{(v.cefrTarget || "").split(" ").slice(1).join(" ")}</span>
            </div>
            <div className="pr2-cefr">CEFR</div>
          </div>
          <div className="pr2-req">
            <div className="pr2-req__hd">Để đạt {v.cefrTarget || "cấp độ tiếp theo"}, cần:</div>
            <div className="pr2-req__list">
              {v.nextLevelReq.map((t, i) => (
                <div className="pr2-tick" key={i}><i>✓</i><span>{t}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. CHI TIẾT ĐÁNH GIÁ */}
      <div className="pr2-card pr2-c5" data-screen-label="05">
        <div className="pr2-card__hd"><span className="pr2-no">5</span><h2>CHI TIẾT ĐÁNH GIÁ</h2></div>
        <div className="pr2-drow hd">
          <span>Hạng mục đánh giá</span>
          <span>Điểm số<br /><small>(/100)</small></span>
          <span>Mức đánh giá</span>
          <span>Đạt được</span>
          <span>Cần cải thiện</span>
          <span>Nhận xét của giáo viên</span>
        </div>
        {v.detailRows.map((r, i) => (
          <div className="pr2-drow" key={`${r.label || "d"}-${i}`}>
            <span>{txt(r.label)}</span>
            <span className="pr2-drow__sc">{num(r.score)}</span>
            <span><Stars value={r.stars} /></span>
            <span>{r.passed ? <i className="pr2-ok">✓</i> : <span className="pr2-dash">—</span>}</span>
            <span>{r.need_improve ? <span className="pr2-warn">⚠</span> : <span className="pr2-dash">—</span>}</span>
            <span className="pr2-drow__cmt">{r.comment || "—"}</span>
          </div>
        ))}
      </div>

      {/* 6. NHẬN XÉT GIÁO VIÊN */}
      <div className="pr2-card pr2-c6" data-screen-label="06">
        <div className="pr2-card__hd"><span className="pr2-no">6</span><h2>NHẬN XÉT CỦA GIÁO VIÊN</h2></div>
        <div style={{ padding: "9px 10px 0 11px" }}>
          <div className="pr2-cbox good">
            <img src={A + "ic-thumb.png"} alt="" />
            <div className="pr2-cbox__list">
              {v.strengths.map((t, i) => (<div className="pr2-dot" key={i}><i /><span>{t}</span></div>))}
            </div>
          </div>
          <div className="pr2-cbox warn">
            <img src={A + "ic-growth.png"} alt="" />
            <div className="pr2-cbox__list">
              {v.improvements.map((t, i) => (<div className="pr2-dot" key={i}><i /><span>{t}</span></div>))}
            </div>
          </div>
        </div>
      </div>

      {/* 7. ĐỊNH HƯỚNG */}
      <div className="pr2-card pr2-c7" data-screen-label="07">
        <div className="pr2-card__hd"><span className="pr2-no">7</span><h2>ĐỊNH HƯỚNG PHÁT TRIỂN THÁNG TỚI</h2></div>
        <div className="pr2-c7__list">
          {v.nextMonth.map((t, i) => (<div className="pr2-tick" key={i}><i>✓</i><span>{t}</span></div>))}
        </div>
      </div>

      {/* 8. PHỤ HUYNH ĐỒNG HÀNH */}
      <div className="pr2-card pr2-c8" data-screen-label="08">
        <div className="pr2-card__hd"><span className="pr2-no">8</span><h2>PHỤ HUYNH ĐỒNG HÀNH</h2></div>
        <div className="pr2-c8__body">
          <img src={A + "ic-hand.png"} alt="" />
          <div className="pr2-c8__list">
            {v.parentActions.map((t, i) => (<div className="pr2-dot" key={i}><i /><span>{t}</span></div>))}
          </div>
        </div>
        {v.parentNote ? (
          <>
            <div className="pr2-c8__rule" />
            <div className="pr2-c8__note"><div>{v.parentNote}</div><span>♥</span></div>
          </>
        ) : null}
      </div>

      {/* 9. VINH DANH */}
      {v.honorOn ? (
        <div className="pr2-card pr2-c9" data-screen-label="09">
          <div className="pr2-card__hd"><span className="pr2-no">9</span><h2>VINH DANH</h2></div>
          <div className="pr2-award">
            <img src={A + "img-trophy.png"} alt="" />
            <div>
              <div className="pr2-award__t">{v.honorTitle}</div>
              <div className="pr2-award__p">{v.honorPeriod || v.periodLong}</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 10. CHỨNG NHẬN */}
      {v.certOn ? (
        <div className="pr2-card pr2-c10" data-screen-label="10">
          <div className="pr2-card__hd"><span className="pr2-no wide">10</span><h2>CHỨNG NHẬN THÀNH TÍCH</h2></div>
          <div className="pr2-cert">
            <img src={A + "img-cert.png"} alt="" />
            <div className="pr2-cert__t">
              VISTA trân trọng ghi nhận<br />
              <b>{v.studentName}</b><br />
              đã có thành tích học tập tốt<br />
              trong {String(v.periodLong || "").toLowerCase()}.
            </div>
          </div>
        </div>
      ) : null}

      {/* CHỮ KÝ */}
      <div className="pr2-card pr2-signs">
        <div className="pr2-sign">
          <div className="pr2-sign__t">GIÁO VIÊN</div>
          <img src={A + "sig-teacher.png"} alt="" style={{ width: 115, height: 43, margin: "13px 0 0 31px" }} />
          <div className="pr2-sign__line" style={{ marginTop: 7 }} />
          <div className="pr2-sign__n">{v.teacherName || "—"}</div>
        </div>
        <div className="pr2-sign">
          <div className="pr2-sign__t">QUẢN LÝ ĐÀO TẠO</div>
          <img src={A + "sig-manager.png"} alt="" style={{ width: 83, height: 37, margin: "21px 0 0 54px" }} />
          <div className="pr2-sign__line" style={{ marginTop: 5 }} />
          <div className="pr2-sign__n">&nbsp;</div>
        </div>
        <div className="pr2-sign">
          <div className="pr2-sign__t">PHỤ HUYNH</div>
          <div className="pr2-sign__line" style={{ marginTop: 44 }} />
          <div className="pr2-sign__line" style={{ marginTop: 21 }} />
          <div className="pr2-sign__n ph">(Ký và ghi rõ họ tên)</div>
        </div>
      </div>

      {/* CHÂN PHIẾU */}
      <div className="pr2-footer">
        <b>VISTA EDUCATION</b>
        <span>Perfect Your English &nbsp;•&nbsp; Perfect Your Future</span>
        <em>Hotline: 024 7300 7788 &nbsp;&nbsp;|&nbsp;&nbsp; www.vistaedu.vn</em>
      </div>
    </div>
  );
}
