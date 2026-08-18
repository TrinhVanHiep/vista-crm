import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getMonthlyScorecard,
  getMonthlyScorecardSchema,
} from "../services/calendarService";
import "../styles/vista4.css";

// Phiếu báo cáo tháng gửi phụ huynh — dựng từ bảng điểm tháng (MonthlyStudentScorecard).
// Giáo viên mở phiếu -> in ra giấy hoặc sao chép nội dung để gửi Zalo cho phụ huynh.

const pad2 = (v) => String(v).padStart(2, "0");

const periodText = (card) => {
  if (card?.period_month && card?.period_year) {
    return `Tháng ${pad2(card.period_month)}/${card.period_year}`;
  }
  return card?.period_label || "--";
};

const attendanceOf = (card) => {
  const total = Number(card?.attendance_total) || 0;
  const present = Number(card?.attendance_present) || 0;
  const late = Number(card?.attendance_late) || 0;
  const percent = total > 0 ? Math.round((present / total) * 100) : null;
  return { total, present, late, percent };
};

// Các đầu điểm: ghép giá trị đã chấm với nhãn lấy từ schema theo chương trình.
const componentsOf = (card, schema) => {
  const defs = schema?.[card?.program_type]?.components || [];
  const values = card?.score_components || {};
  if (defs.length) {
    return defs
      .filter((d) => values[d.key] !== undefined && values[d.key] !== null && values[d.key] !== "")
      .map((d) => ({
        key: d.key,
        label: d.label || d.key,
        value: values[d.key],
        max: d.max_score || null,
      }));
  }
  // Chưa tải được schema -> hiển thị thô theo key để phiếu vẫn dùng được.
  return Object.entries(values)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([key, value]) => ({ key, label: key, value, max: null }));
};

const Section = ({ no, title, children }) => (
  <section style={{ marginTop: 18, breakInside: "avoid" }}>
    <h2
      style={{
        fontSize: 13.5,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: 0.3,
        color: "#9A4A12",
        borderBottom: "2px solid #F26522",
        paddingBottom: 5,
        margin: "0 0 10px",
      }}
    >
      {no}. {title}
    </h2>
    {children}
  </section>
);

const Field = ({ label, value }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8a7a6a", marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
      {value?.trim() ? value : "—"}
    </div>
  </div>
);

export default function ParentReport() {
  const { scorecardId } = useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState(null);
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      getMonthlyScorecard(scorecardId),
      getMonthlyScorecardSchema().catch(() => null),
    ])
      .then(([cardData, schemaData]) => {
        if (!active) return;
        setCard(cardData);
        setSchema(schemaData);
      })
      .catch(() => {
        if (active) setError("Không tải được phiếu báo cáo. Vui lòng thử lại.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [scorecardId]);

  const att = useMemo(() => attendanceOf(card), [card]);
  const comps = useMemo(() => componentsOf(card, schema), [card, schema]);

  // Bản chữ để dán vào Zalo/tin nhắn gửi phụ huynh.
  const plainText = useMemo(() => {
    if (!card) return "";
    const lines = [];
    lines.push(`PHIẾU BÁO CÁO HỌC TẬP ${periodText(card).toUpperCase()}`);
    lines.push(`${card.center_name || "Vista Academy"}`);
    lines.push("");
    lines.push(`Học viên: ${card.student_name || "--"}`);
    lines.push(`Lớp: ${card.classroom_name || "--"}`);
    if (card.teacher_name) lines.push(`Giáo viên: ${card.teacher_name}`);
    lines.push("");
    lines.push("1. CHUYÊN CẦN");
    lines.push(
      att.total
        ? `- Đi học ${att.present}/${att.total} buổi${att.percent !== null ? ` (${att.percent}%)` : ""}${att.late ? `, đi muộn ${att.late} buổi` : ""}`
        : "- Chưa có dữ liệu điểm danh",
    );
    lines.push("");
    lines.push("2. KẾT QUẢ HỌC TẬP");
    if (comps.length) {
      comps.forEach((c) => lines.push(`- ${c.label}: ${c.value}${c.max ? `/${c.max}` : ""}`));
    } else {
      lines.push("- Chưa nhập đầu điểm");
    }
    if (card.total_percent !== null && card.total_percent !== undefined) {
      lines.push(`- Tổng kết: ${card.total_percent}%${card.grade_label ? ` — ${card.grade_label}` : ""}`);
    } else if (card.grade_label) {
      lines.push(`- Xếp loại: ${card.grade_label}`);
    }
    lines.push("");
    lines.push("3. NHẬN XÉT CỦA GIÁO VIÊN");
    if (card.teacher_comment?.trim()) lines.push(card.teacher_comment.trim());
    if (card.strengths?.trim()) lines.push(`* Điểm mạnh: ${card.strengths.trim()}`);
    if (card.improvements?.trim()) lines.push(`* Cần cải thiện: ${card.improvements.trim()}`);
    if (card.next_goal?.trim()) lines.push(`* Mục tiêu tháng tới: ${card.next_goal.trim()}`);
    if (card.parent_support_note?.trim()) {
      lines.push("");
      lines.push("4. PHỤ HUYNH HỖ TRỢ THÊM");
      lines.push(card.parent_support_note.trim());
    }
    lines.push("");
    lines.push("Trân trọng cảm ơn quý phụ huynh đã đồng hành cùng trung tâm!");
    return lines.join("\n");
  }, [card, att, comps]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied("Đã sao chép nội dung phiếu — dán vào Zalo để gửi phụ huynh.");
    } catch {
      setCopied("Trình duyệt không cho sao chép tự động. Anh/chị bôi đen nội dung phiếu để chép.");
    }
    setTimeout(() => setCopied(""), 4000);
  };

  if (loading) {
    return (
      <div className="v4page">
        <div className="content-col">
          <div className="card" style={{ padding: 24 }}>Đang tải phiếu báo cáo...</div>
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="v4page">
        <div className="content-col">
          <div className="card" style={{ padding: 24 }}>
            <p>{error || "Không tìm thấy phiếu báo cáo."}</p>
            <button type="button" className="btn ghost sm" onClick={() => navigate(-1)}>
              ‹ Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="v4page pr-print">
      {/* CSS in ấn: ẩn toàn bộ giao diện, chỉ in vùng phiếu (giống ClassDetail). */}
      <style>{`
        @media print {
          html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
          body * { visibility: hidden !important; }
          .pr-print, .pr-print * { visibility: visible !important; }
          .pr-print .no-print { display: none !important; }
          .pr-print {
            position: absolute !important;
            left: 0 !important; top: 0 !important;
            width: 100% !important;
            padding: 0 !important; margin: 0 !important;
            background: #fff !important;
          }
          .pr-sheet { box-shadow: none !important; border: none !important; padding: 0 !important; }
          @page { size: A4; margin: 14mm; }
        }
      `}</style>

      <div className="content-col">
        <div className="page-head no-print">
          <div className="crumb">
            <Link to="/monthly-scorecards">Bảng điểm học viên</Link>
            {" / "}
            <span>Phiếu báo cáo phụ huynh</span>
          </div>
          <div className="flex" style={{ gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button type="button" className="btn ghost sm" onClick={() => navigate(-1)}>
              ‹ Quay lại
            </button>
            <button type="button" className="btn ghost sm" onClick={handleCopy}>
              📋 Sao chép để gửi Zalo
            </button>
            <button type="button" className="btn primary" onClick={() => window.print()}>
              🖨️ In phiếu
            </button>
          </div>
          {copied ? (
            <div className="card" style={{ marginTop: 10, padding: "8px 12px", fontSize: 12.5 }}>
              {copied}
            </div>
          ) : null}
          {card.status !== "approved" ? (
            <div
              className="card"
              style={{ marginTop: 10, padding: "8px 12px", fontSize: 12.5, color: "#9A4A12" }}
            >
              ⚠️ Bảng điểm này chưa được duyệt (trạng thái: {card.status || "nháp"}). Nên gửi phụ
              huynh sau khi quản lý duyệt.
            </div>
          ) : null}
        </div>

        {/* ------- PHIẾU (vùng được in) ------- */}
        <div
          className="card pr-sheet"
          style={{ padding: 28, maxWidth: 820, margin: "0 auto", background: "#fff" }}
        >
          <header style={{ textAlign: "center", borderBottom: "2px solid #F26522", paddingBottom: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: 1, color: "#F26522" }}>
              {(card.center_name || "VISTA ACADEMY").toUpperCase()}
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: "8px 0 4px" }}>
              PHIẾU BÁO CÁO HỌC TẬP
            </h1>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#8a7a6a" }}>
              {periodText(card)}
            </div>
          </header>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 10,
              marginTop: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8a7a6a" }}>Học viên</div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{card.student_name || "--"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8a7a6a" }}>Lớp</div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{card.classroom_name || "--"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8a7a6a" }}>Giáo viên</div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{card.teacher_name || "--"}</div>
            </div>
          </div>

          <Section no={1} title="Chuyên cần">
            {att.total ? (
              <div style={{ fontSize: 13.5 }}>
                Đi học <strong>{att.present}/{att.total}</strong> buổi
                {att.percent !== null ? (
                  <>
                    {" "}
                    (<strong>{att.percent}%</strong>)
                  </>
                ) : null}
                {att.late ? (
                  <>
                    {" · "}đi muộn <strong>{att.late}</strong> buổi
                  </>
                ) : null}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#8a7a6a" }}>Chưa có dữ liệu điểm danh.</div>
            )}
          </Section>

          <Section no={2} title="Kết quả học tập">
            {comps.length ? (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  {comps.map((c) => (
                    <tr key={c.key}>
                      <td style={{ padding: "6px 0", borderBottom: "1px solid #F0E6DA" }}>{c.label}</td>
                      <td
                        style={{
                          padding: "6px 0",
                          borderBottom: "1px solid #F0E6DA",
                          textAlign: "right",
                          fontWeight: 800,
                          width: 110,
                        }}
                      >
                        {c.value}
                        {c.max ? <span style={{ fontWeight: 600, color: "#8a7a6a" }}> / {c.max}</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ fontSize: 13, color: "#8a7a6a" }}>Chưa nhập đầu điểm cho kỳ này.</div>
            )}

            {(card.total_percent !== null && card.total_percent !== undefined) || card.grade_label ? (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  background: "var(--primary-soft, #FDECD6)",
                  borderRadius: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontWeight: 800, fontSize: 13.5 }}>Tổng kết</span>
                <span style={{ fontWeight: 800, fontSize: 15, color: "#9A4A12" }}>
                  {card.total_percent !== null && card.total_percent !== undefined
                    ? `${card.total_percent}%`
                    : ""}
                  {card.grade_label ? `  ·  ${card.grade_label}` : ""}
                </span>
              </div>
            ) : null}
          </Section>

          <Section no={3} title="Nhận xét của giáo viên">
            <Field label="Nhận xét chung" value={card.teacher_comment} />
            <Field label="Điểm mạnh" value={card.strengths} />
            <Field label="Cần cải thiện" value={card.improvements} />
            <Field label="Mục tiêu tháng tới" value={card.next_goal} />
          </Section>

          {card.parent_support_note?.trim() ? (
            <Section no={4} title="Phụ huynh hỗ trợ thêm">
              <div style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                {card.parent_support_note}
              </div>
            </Section>
          ) : null}

          <div
            style={{
              marginTop: 26,
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              fontSize: 12.5,
            }}
          >
            <div style={{ maxWidth: 380, color: "#8a7a6a", lineHeight: 1.5 }}>
              Trân trọng cảm ơn quý phụ huynh đã đồng hành cùng trung tâm. Mọi trao đổi thêm xin
              liên hệ giáo viên chủ nhiệm lớp.
            </div>
            <div style={{ textAlign: "center", minWidth: 190 }}>
              <div style={{ fontStyle: "italic", color: "#8a7a6a" }}>Giáo viên phụ trách</div>
              <div style={{ height: 46 }} />
              <div style={{ fontWeight: 800 }}>{card.teacher_name || ""}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
