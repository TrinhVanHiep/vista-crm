import { useEffect, useState } from "react";
import { listSessionReports, reviewApprovalEntity } from "../../services/calendarService";
import { Badge, Button, Modal } from "../../ui";

/**
 * Xem ĐẦY ĐỦ nội dung một báo cáo ca dạy, và duyệt ngay tại đây.
 *
 * Màn "Báo cáo ngày" trước nay được dựng cho GIÁO VIÊN NHẬP: bảng chỉ có 5 cột
 * trạng thái, và nội dung báo cáo chỉ được nạp khi báo cáo còn sửa được. Nghĩa
 * là đúng những báo cáo quản lý cần đọc (đã gửi / đã duyệt) thì không có đường
 * nào xem. API đã trả đủ 20 trường từ lâu, chỉ thiếu chỗ hiển thị.
 *
 * Ở đây in hết, kể cả trường rỗng, và nói rõ "giáo viên chưa nhập" thay vì bỏ
 * trắng — người duyệt cần phân biệt "không có gì để nói" với "chưa ai điền".
 *
 * Nút duyệt nằm ở ĐÂY chứ không phải một màn riêng: trước đây quản lý mở được
 * nội dung báo cáo ở màn Báo cáo ngày nhưng muốn duyệt thì phải nhớ lớp/giáo
 * viên rồi sang /monthly-reports tìm lại đúng dòng đó. Đọc và quyết ở hai màn
 * khác nhau thì người duyệt hoặc bỏ qua bước đọc, hoặc duyệt nhầm dòng.
 */

const NHAN_MUC_TIEU = {
  achieved: ["Đạt mục tiêu", "green"],
  partial: ["Đạt một phần", "yellow"],
  not_achieved: ["Chưa đạt", "red"],
};

const NHAN_TRANG_THAI = {
  draft: ["Bản nháp", "gray"],
  submitted: ["Chờ duyệt", "yellow"],
  approved: ["Đã duyệt", "green"],
  rejected: ["Bị từ chối", "red"],
  revision_required: ["Cần sửa lại", "red"],
};

const gioPhut = (s) => {
  if (!s) return "";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/`
    + `${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** Một mục nội dung. Rỗng thì nói rõ là chưa nhập chứ không để trắng. */
function Muc({ nhan, giaTri, rong = false }) {
  const co = giaTri != null && String(giaTri).trim() !== "";
  return (
    <div className={`bcn-muc${rong ? " bcn-muc--rong" : ""}`}>
      <div className="bcn-muc__nhan">{nhan}</div>
      <div className={`bcn-muc__noi${co ? "" : " bcn-muc__noi--trong"}`}>
        {co ? String(giaTri) : "Giáo viên chưa nhập mục này."}
      </div>
    </div>
  );
}

export default function ChiTietBaoCaoNgay({ buoi, onDong, coQuyenDuyet = false, onDaDuyet }) {
  const [bc, setBc] = useState(null);
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState("");
  // Quyết định đang chờ nhập lý do. Từ chối / cần sửa lại BẮT BUỘC có lý do —
  // giáo viên nhận thông báo "bị trả lại" mà không kèm lý do thì không biết
  // phải sửa gì, lại nộp y nguyên.
  const [quyetDinh, setQuyetDinh] = useState("");
  const [lyDo, setLyDo] = useState("");
  const [dangDuyet, setDangDuyet] = useState(false);
  const [loiDuyet, setLoiDuyet] = useState("");

  useEffect(() => {
    if (!buoi?.id) return undefined;
    let con = true;
    setDangTai(true);
    setLoi("");
    setBc(null);
    setQuyetDinh("");
    setLyDo("");
    setLoiDuyet("");
    listSessionReports({ session: Number(buoi.id) })
      .then((res) => {
        if (!con) return;
        const ds = Array.isArray(res) ? res : res?.results || [];
        setBc(ds[0] || null);
      })
      .catch((e) => con && setLoi(e?.response?.data?.detail || "Không tải được nội dung báo cáo."))
      .finally(() => con && setDangTai(false));
    return () => { con = false; };
  }, [buoi?.id]);

  const guiQuyetDinh = async (qd, ghiChu) => {
    setDangDuyet(true);
    setLoiDuyet("");
    try {
      const kq = await reviewApprovalEntity("session_report", bc.id, qd, {
        comment: ghiChu.trim() || "Quản lý duyệt báo cáo ca dạy.",
        payroll_eligible: qd === "approve",
      });
      // Cập nhật tại chỗ để người duyệt thấy ngay kết quả, không phải đóng
      // hộp thoại rồi mở lại mới biết đã ăn.
      setBc((truoc) => ({
        ...truoc,
        report_status: kq.entity_status || truoc.report_status,
        rejected_reason: qd === "approve" ? "" : ghiChu.trim(),
      }));
      setQuyetDinh("");
      setLyDo("");
      onDaDuyet?.();
    } catch (e) {
      setLoiDuyet(
        e?.response?.data?.detail
          || "Không gửi được quyết định duyệt. Kiểm tra lại báo cáo đã được nộp chưa.",
      );
    } finally {
      setDangDuyet(false);
    }
  };

  const [nhanTt, toneTt] = NHAN_TRANG_THAI[bc?.report_status] || ["Chưa báo cáo", "orange"];
  const [nhanMt, toneMt] = NHAN_MUC_TIEU[bc?.objective_status] || ["Chưa đánh giá", "gray"];
  const checklist = Array.isArray(bc?.completion_checklist) ? bc.completion_checklist : [];

  // Chỉ báo cáo ĐÃ NỘP mới duyệt được: bản nháp thì giáo viên còn đang sửa, còn
  // báo cáo đã duyệt/đã trả lại thì backend không còn Approval nào đang chờ nên
  // bấm vào chỉ nhận lỗi 400. Hiện nút trong hai trường hợp đó là bẫy người dùng.
  const duyetDuoc = coQuyenDuyet && bc?.report_status === "submitted";

  const chanTrang = !duyetDuoc ? null : quyetDinh ? (
    <div className="bcn-duyet">
      <label className="bcn-duyet__nhan" htmlFor="bcn-ly-do">
        {quyetDinh === "reject" ? "Lý do từ chối" : "Nêu rõ cần sửa những gì"}
      </label>
      <textarea
        id="bcn-ly-do"
        className="bcn-duyet__o"
        rows={3}
        value={lyDo}
        onChange={(e) => setLyDo(e.target.value)}
        placeholder="Giáo viên sẽ nhận đúng nội dung này trong thông báo."
      />
      <div className="bcn-duyet__nut">
        <Button
          variant="ghost"
          onClick={() => { setQuyetDinh(""); setLyDo(""); }}
          disabled={dangDuyet}
        >
          Quay lại
        </Button>
        <Button
          variant={quyetDinh === "reject" ? "danger" : "primary"}
          loading={dangDuyet}
          loadingText="Đang gửi..."
          disabled={!lyDo.trim()}
          onClick={() => guiQuyetDinh(quyetDinh, lyDo)}
        >
          {quyetDinh === "reject" ? "Từ chối báo cáo" : "Yêu cầu sửa lại"}
        </Button>
      </div>
      {!lyDo.trim() ? (
        <div className="bcn-duyet__nhac">Phải nhập lý do trước khi gửi.</div>
      ) : null}
    </div>
  ) : (
    <div className="bcn-duyet__nut">
      <Button variant="danger" disabled={dangDuyet} onClick={() => setQuyetDinh("reject")}>
        Từ chối
      </Button>
      <Button variant="ghost" disabled={dangDuyet} onClick={() => setQuyetDinh("request-revision")}>
        Cần sửa lại
      </Button>
      <Button
        variant="primary"
        loading={dangDuyet}
        loadingText="Đang duyệt..."
        onClick={() => guiQuyetDinh("approve", "")}
      >
        ✓ Duyệt báo cáo
      </Button>
    </div>
  );

  return (
    <Modal
      open={!!buoi}
      onClose={onDong}
      title="Nội dung báo cáo ca dạy"
      subtitle={buoi ? `${buoi.classroom_name || "--"} — ${buoi.teacher_name || "--"}` : ""}
      size="lg"
      footer={chanTrang}
    >
      {loiDuyet ? (
        <div className="alert red" style={{ marginBottom: 12 }}><span>⚠️</span><div>{loiDuyet}</div></div>
      ) : null}
      {loi ? <div className="alert red" style={{ marginBottom: 12 }}><span>⚠️</span><div>{loi}</div></div> : null}

      {dangTai ? (
        <div className="bcn-trong">Đang tải nội dung...</div>
      ) : !bc ? (
        <div className="bcn-trong">
          Buổi dạy này chưa có báo cáo nào. Giáo viên cần nộp báo cáo trước khi duyệt.
        </div>
      ) : (
        <>
          <div className="bcn-nhan">
            <Badge tone={toneTt}>{nhanTt}</Badge>
            <Badge tone={toneMt}>{nhanMt}</Badge>
            {bc.student_count != null && bc.student_count !== ""
              ? <Badge tone="blue">{bc.student_count} học sinh</Badge> : null}
            {bc.reported_on_zalo ? <Badge tone="green">Đã gửi Zalo phụ huynh</Badge> : null}
            {bc.is_late_submission ? <Badge tone="red">Nộp muộn</Badge> : null}
          </div>

          {bc.rejected_reason ? (
            <div className="alert red" style={{ margin: "12px 0" }}>
              <span>⚠️</span><div><b>Lý do trả lại:</b> {bc.rejected_reason}</div>
            </div>
          ) : null}

          <div className="bcn-luoi">
            <Muc nhan="Nội dung đã dạy" giaTri={bc.content_taught} rong />
            <Muc nhan="Đánh giá buổi học" giaTri={bc.session_evaluation} rong />
            <Muc nhan="Tình hình chuyên cần" giaTri={bc.attendance_summary} />
            <Muc nhan="Bài tập về nhà" giaTri={bc.homework_assigned} />
            <Muc nhan="Học sinh cần lưu ý" giaTri={bc.student_risk_summary} />
            <Muc nhan="Lời nhắn phụ huynh" giaTri={bc.parent_note} />
            <Muc nhan="Kế hoạch buổi tới" giaTri={bc.next_session_plan} rong />
          </div>

          {checklist.length ? (
            <div className="bcn-muc bcn-muc--rong" style={{ marginTop: 12 }}>
              <div className="bcn-muc__nhan">Việc đã hoàn thành</div>
              <ul className="bcn-ds">
                {checklist.map((x, i) => (
                  <li key={typeof x === "string" ? x : i}>
                    {typeof x === "string" ? x : (x?.label || x?.title || JSON.stringify(x))}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {bc.payroll_decision_note ? (
            <div className="bcn-muc bcn-muc--rong" style={{ marginTop: 12 }}>
              <div className="bcn-muc__nhan">Ghi chú của người duyệt</div>
              <div className="bcn-muc__noi">{bc.payroll_decision_note}</div>
            </div>
          ) : null}

          <div className="bcn-moc">
            {bc.submitted_at ? <span>Nộp lúc {gioPhut(bc.submitted_at)}</span> : null}
            {bc.approved_at ? <span>Duyệt lúc {gioPhut(bc.approved_at)}</span> : null}
            {bc.reported_on_zalo_at ? <span>Gửi Zalo lúc {gioPhut(bc.reported_on_zalo_at)}</span> : null}
          </div>
        </>
      )}
    </Modal>
  );
}
