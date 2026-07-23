export const defaultUser = "Sophia Trần";

export const plannerCategories = [
  {
    id: "student",
    label: "Học sinh - Lớp học",
    description: "Học sinh",
    color: "#3f8cff",
  },
  {
    id: "marketing",
    label: "Truyền thông - Bán hàng",
    description: "Truyền thông",
    color: "#ff6b6b",
  },
  {
    id: "finance",
    label: "Tài chính - Kế toán",
    description: "Thu chi",
    color: "#2f9e44",
  },
  {
    id: "hr",
    label: "Hành chính - Nhân sự",
    description: "Nhân sự",
    color: "#845ef7",
  },
];

export const plannerSummary = {
  student: ["Học sinh", "Lớp học"],
  marketing: ["Chiến dịch quảng bá", "Tuyển sinh - tuyển dụng"],
  finance: ["Báo cáo thu - chi", "Đối soát công nợ"],
  hr: ["Hợp đồng lao động", "Hồ sơ nhân viên"],
};

export const weeklyEvents = {
  student: {
    week48: [
      { badge: "Học sinh", title: "Học sinh", time: "", detail: "", color: "green", owner: "Sophia Trần" },
      { badge: "Lớp học", title: "Lớp học", time: "", detail: "", color: "blue", owner: "Sophia Trần" },
      { badge: "+5", title: "more", time: "", detail: "", color: "blue", isCount: true },
    ],
    week49: [
      {
        badge: "Báo cáo",
        title: "Báo cáo tiến độ giảng dạy",
        time: "11:00 - 12:30",
        detail: "",
        color: "purple",
        owner: "Sophia Trần",
      },
      {
        badge: "Họp",
        title: "Họp phụ huynh tháng 12",
        time: "11:00 - 12:30",
        detail: "",
        color: "orange",
        owner: "Sophia Trần",
      },
      { badge: "+5", title: "more", time: "", detail: "", color: "blue", isCount: true },
    ],
    week50: [
      {
        badge: "Kế hoạch",
        title: "Họp chiến lược marketing",
        time: "11:00 - 12:30",
        detail: "",
        color: "green",
        owner: "Sophia Trần",
      },
      {
        badge: "Training",
        title: "Training kỹ năng tư vấn",
        time: "11:00 - 12:30",
        detail: "",
        color: "orange",
        owner: "Sophia Trần",
      },
      { badge: "+2", title: "more", time: "", detail: "", color: "blue", isCount: true },
    ],
    week51: [
      {
        badge: "Workshop",
        title: "Workshop kỹ năng",
        time: "11:00 - 12:30",
        detail: "",
        color: "purple",
        owner: "Sophia Trần",
      },
    ],
  },
  marketing: {
    week48: [
      {
        badge: "Chiến dịch",
        title: "Chiến dịch quảng bá",
        time: "11:00 - 12:30",
        detail: "",
        color: "orange",
        owner: "An Phạm",
      },
      {
        badge: "Tuyển sinh",
        title: "Tuyển sinh - tuyển dụng",
        time: "",
        detail: "",
        color: "orange",
        owner: "An Phạm",
      },
    ],
    week49: [
      {
        badge: "Marketing",
        title: "Họp chiến lược marketing",
        time: "11:00 - 12:30",
        detail: "",
        color: "blue",
        owner: "Minh Hà",
      },
      {
        badge: "Training",
        title: "Training kỹ năng tư vấn",
        time: "11:00 - 12:30",
        detail: "",
        color: "orange",
        owner: "Minh Hà",
      },
      {
        badge: "Báo cáo",
        title: "Tổng kết doanh số quý 4",
        time: "11:00 - 12:30",
        detail: "",
        color: "red",
        owner: "An Phạm",
      },
      { badge: "+2", title: "more", time: "", detail: "", color: "blue", isCount: true },
    ],
    week50: [],
    week51: [],
  },
  finance: {
    week48: [
      {
        badge: "Thu chi",
        title: "Báo cáo thu - chi",
        time: "",
        detail: "",
        color: "green",
        owner: "Hồng Ngân",
      },
      {
        badge: "Đối soát",
        title: "Đối soát công nợ",
        time: "",
        detail: "",
        color: "green",
        owner: "Hồng Ngân",
      },
    ],
    week49: [
      {
        badge: "Kế toán",
        title: "Họp duyệt ngân sách",
        time: "11:00 - 12:30",
        detail: "",
        color: "blue",
        owner: "Hồng Ngân",
      },
      {
        badge: "Kiểm toán",
        title: "Kiểm toán nội bộ định kỳ",
        time: "11:00 - 12:30",
        detail: "",
        color: "orange",
        owner: "Hồng Ngân",
      },
      {
        badge: "Báo cáo",
        title: "Nộp báo cáo tài chính",
        time: "11:00 - 12:30",
        detail: "",
        color: "purple",
        owner: "Hồng Ngân",
      },
      { badge: "+2", title: "more", time: "", detail: "", color: "blue", isCount: true },
    ],
    week50: [
      {
        badge: "Kiểm toán",
        title: "Kiểm toán nội bộ định kỳ",
        time: "11:00 - 12:30",
        detail: "",
        color: "blue",
        owner: "Hồng Ngân",
      },
      {
        badge: "Thuế",
        title: "Nộp báo cáo thuế tháng 12",
        time: "11:00 - 12:30",
        detail: "",
        color: "orange",
        owner: "Hồng Ngân",
      },
      {
        badge: "Ngân sách",
        title: "Họp duyệt ngân sách quý 1",
        time: "11:00 - 12:30",
        detail: "",
        color: "blue",
        owner: "Hồng Ngân",
      },
      { badge: "+2", title: "more", time: "", detail: "", color: "blue", isCount: true },
    ],
    week51: [],
  },
  hr: {
    week48: [
      {
        badge: "Hợp đồng",
        title: "Hợp đồng lao động",
        time: "",
        detail: "",
        color: "green",
        owner: "Thu Hà",
      },
      {
        badge: "Hồ sơ",
        title: "Hồ sơ nhân viên",
        time: "",
        detail: "",
        color: "purple",
        owner: "Thu Hà",
      },
    ],
    week49: [],
    week50: [
      {
        badge: "Phỏng vấn",
        title: "Phỏng vấn ứng viên mới",
        time: "11:00 - 12:30",
        detail: "",
        color: "orange",
        owner: "Thu Hà",
      },
      {
        badge: "Đào tạo",
        title: "Đào tạo nội quy công ty",
        time: "11:00 - 12:30",
        detail: "",
        color: "blue",
        owner: "Thu Hà",
      },
      {
        badge: "Kỹ năng",
        title: "Đánh giá năng lực nhân viên",
        time: "11:00 - 12:30",
        detail: "",
        color: "purple",
        owner: "Thu Hà",
      },
      { badge: "+2", title: "more", time: "", detail: "", color: "blue", isCount: true },
    ],
    week51: [],
  },
};

export const allOwners = [
  "Sophia Trần",
  "An Phạm",
  "Minh Hà",
  "Hồng Ngân",
  "Thu Hà",
];
