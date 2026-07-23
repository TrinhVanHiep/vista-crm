export const teachingShiftChecklist = [
  { key: "attendance", label: "Điểm danh và xác nhận sĩ số" },
  { key: "lesson_completed", label: "Hoàn thành nội dung bài giảng" },
  { key: "homework", label: "Giao bài tập/nhiệm vụ về nhà" },
  { key: "evidence", label: "Đính kèm evidence/recording" },
  { key: "parent_note", label: "Ghi chú phụ huynh hoặc học sinh cần theo sát" },
  { key: "score_update", label: "Cập nhật đầu điểm phát sinh" },
];

export const monthlyTeachingPlanSteps = [
  {
    title: "27-28 hằng tháng",
    description: "Giáo viên/điều phối lên lịch báo giảng cho toàn bộ tháng sau.",
  },
  {
    title: "Sửa theo từng tuần",
    description: "Lịch tháng được nhóm theo tuần 1-5 để cập nhật ca, bài, link học và ghi chú.",
  },
  {
    title: "Gửi quản lý",
    description: "Kế hoạch chuyển trạng thái submitted để quản lý thấy trên dashboard vận hành.",
  },
  {
    title: "Duyệt trước tuần 1",
    description: "Quản lý approve/revision/reject trước khi triển khai tuần đầu tiên.",
  },
];

export const competitionFrame = {
  title: "Khung thi đua tháng",
  payoutTiming: "Thưởng được chốt cuối tháng và trả cuối kỳ.",
  rules: [
    "Điểm thi tháng hoặc bài giấy là trọng tâm thi đua chương trình cơ bản.",
    "Finger Print ưu tiên nghe, nói, phản xạ, nền nếp và sản phẩm tháng.",
    "Cambridge dùng tổng % và số khiên theo Listening, Speaking, Reading & Writing.",
    "Quản lý duyệt khung thi đua cuối tháng trước khi khóa kết quả.",
  ],
};

export const scorecardFrameworks = [
  {
    key: "basic",
    title: "Cơ bản khối 4-9",
    subtitle: "HS1, HS2, HS3 và phân tích kỹ năng",
    components: [
      "Chuyên cần HS1",
      "Bài tập HS1",
      "Mini test HS1",
      "Tham gia lớp HS1",
      "Thi tháng/Giữa kỳ HS2",
      "Kỹ năng làm bài HS2",
      "Cuối kỳ HS3",
      "Grammar",
      "Vocabulary",
      "Reading",
      "Listening",
      "Writing",
      "Exam Skills",
    ],
  },
  {
    key: "fingerprint",
    title: "Finger Print 4-6 tuổi",
    subtitle: "100 điểm, không bắt buộc Writing",
    components: [
      "Nền nếp /10",
      "Từ vựng /20",
      "Nghe phản xạ /10",
      "Nói phát âm /10",
      "Tương tác /10",
      "Home /10",
      "Sản phẩm /30",
      "Minh chứng",
      "Cần CSKH",
      "Vinh danh",
    ],
  },
  {
    key: "cambridge",
    title: "Cambridge",
    subtitle: "Tổng %, tổng khiên và nhận xét phụ huynh",
    components: [
      "Sĩ số buổi",
      "Có mặt",
      "Chuyên cần %",
      "Listening %",
      "Listening khiên",
      "Speaking %",
      "Speaking khiên",
      "Reading %",
      "Writing %",
      "R&W %",
      "R&W khiên",
      "Exam Skills %",
      "Project %",
      "Tổng %",
      "Tổng khiên",
    ],
  },
];
