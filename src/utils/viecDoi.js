// Báo cho cảnh báo "việc cần hoàn thành" tải lại danh sách sau khi người dùng vừa làm xong một
// việc ngay trên trang (03/11/2026).
export const SU_KIEN_VIEC_DOI = "vista:viec-doi";

export const baoViecDoi = () => {
  try {
    window.dispatchEvent(new Event(SU_KIEN_VIEC_DOI));
  } catch {
    /* môi trường không có window: bỏ qua */
  }
};
