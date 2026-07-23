import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PeopleList from "../components/PeopleList";
import apiClient from "../services/apiClient";
import styles from "../styles/employeeList.module.css";
import { useAuth } from "../auth/AuthProvider";
import ConfirmDialog from "../components/ConfirmDialog";
import { formatDate, formatGender, getAge } from "../utils/userFormatters";

const studentStatusLabels = {
  active: "Đang học",
  paused: "Bảo lưu",
  graduated: "Hoàn thành",
  withdrawn: "Nghỉ học",
};

const studentFields = [
  {
    label: "Mã học viên",
    getValue: (item) => item.student_code || "--",
  },
  {
    label: "Giới tính",
    getValue: (item) => formatGender(item.gender),
  },
  {
    label: "Ngày sinh",
    getValue: (item) => formatDate(item.date_of_birth),
  },
  {
    label: "Tuổi",
    getValue: (item) => getAge(item.date_of_birth),
  },
  {
    label: "Lớp học",
    getValue: (item) =>
      item.classroom
        ? `${item.classroom.class_code || "--"} • ${item.classroom.name}`
        : "Chưa phân lớp",
  },
  {
    label: "Trạng thái",
    getValue: (item) =>
      studentStatusLabels[item.current_status] || item.current_status || "--",
  },
];

function Students() {
  const navigate = useNavigate();
  const [reloadKey, setReloadKey] = useState(0);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importMessage, setImportMessage] = useState("");
  const [importErrors, setImportErrors] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createMessage, setCreateMessage] = useState("");
  const [createError, setCreateError] = useState("");
  const [listNotice, setListNotice] = useState("");
  const [listError, setListError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [confirmStudent, setConfirmStudent] = useState(null);
  const [centers, setCenters] = useState([]);
  const [createClassrooms, setCreateClassrooms] = useState([]);
  const [importCenterId, setImportCenterId] = useState("");
  const [createCenterId, setCreateCenterId] = useState("");
  const [createClassroomId, setCreateClassroomId] = useState("");
  const [formData, setFormData] = useState({
    student_code: "",
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    gender: "",
    date_of_birth: "",
    address: "",
    parent_name: "",
    parent_phone: "",
    parent_email: "",
    parent_relationship: "",
    current_status: "active",
    admission_date: "",
    learning_note: "",
  });
  const { role } = useAuth();
  const canManageStudents = ["superadmin", "admin"].includes(role);

  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const response = await apiClient.get("/centers/centers/all/");
        const data = Array.isArray(response.data) ? response.data : [];
        setCenters(data);
      } catch (error) {
        setCenters([]);
      }
    };

    fetchCenters();
  }, []);

  const fetchClassrooms = async (centerId, setItems) => {
    if (!centerId) {
      setItems([]);
      return;
    }
    try {
      const response = await apiClient.get(
        `/centers/centers/${centerId}/classrooms/`,
      );
      const data = Array.isArray(response.data) ? response.data : [];
      setItems(data);
    } catch (error) {
      setItems([]);
    }
  };

  useEffect(() => {
    fetchClassrooms(createCenterId, setCreateClassrooms);
    setCreateClassroomId("");
  }, [createCenterId]);

  const importCenterName = useMemo(() => {
    if (!importCenterId) return "";
    return centers.find((center) => String(center.id) === String(importCenterId))
      ?.name;
  }, [centers, importCenterId]);

  const resetCreateForm = () => {
    setFormData({
      student_code: "",
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      gender: "",
      date_of_birth: "",
      address: "",
      parent_name: "",
      parent_phone: "",
      parent_email: "",
      parent_relationship: "",
      current_status: "active",
      admission_date: "",
      learning_note: "",
    });
    setCreateCenterId("");
    setCreateClassroomId("");
  };

  const handleImportSubmit = async (event) => {
    event.preventDefault();
    setImportMessage("");
    setImportErrors([]);
    setListNotice("");
    setListError("");
    if (!importFile) {
      setImportMessage("Vui lòng chọn file Excel để nhập.");
      return;
    }
    const data = new FormData();
    data.append("file", importFile);
    if (importCenterName) {
      data.append("center_name", importCenterName);
    }
    setImportLoading(true);
    try {
      const response = await apiClient.post(
        "/students/students/import_students/",
        data,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const payload = response?.data || {};
      const successCount = payload.success_count ?? 0;
      const errorCount = payload.error_count ?? 0;
      setImportErrors(payload.errors || []);
      setImportMessage(
        `Đã nhập ${successCount} học viên. Lỗi: ${errorCount}.`,
      );
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      const apiError = error?.response?.data;
      setImportMessage(
        apiError?.detail ||
          apiError?.message ||
          "Không thể nhập dữ liệu. Vui lòng thử lại.",
      );
    } finally {
      setImportLoading(false);
    }
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    setCreateMessage("");
    setCreateError("");
    setListNotice("");
    setListError("");
    if (!formData.first_name || !formData.last_name || !formData.email) {
      setCreateError("Vui lòng nhập họ, tên và email học viên.");
      return;
    }

    const basePassword =
      formData.phone_number || formData.email || "Student@2025";
    const password =
      basePassword.length >= 8 ? basePassword : `${basePassword}12345678`;

    const payload = {
      student_code: formData.student_code.trim() || undefined,
      user: {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        username: (formData.phone_number || formData.email).trim(),
        password,
      },
      gender: formData.gender || null,
      date_of_birth: formData.date_of_birth || null,
      phone_number: formData.phone_number || null,
      address: formData.address || null,
      current_status: formData.current_status || "active",
      admission_date: formData.admission_date || null,
      learning_note: formData.learning_note || null,
      parent_name: formData.parent_name || null,
      parent_phone: formData.parent_phone || null,
      parent_email: formData.parent_email || null,
      parent_relationship: formData.parent_relationship || null,
      center_id: createCenterId || undefined,
      classroom_id: createClassroomId || undefined,
    };

    if (!payload.center_id) delete payload.center_id;
    if (!payload.classroom_id) delete payload.classroom_id;

    setCreateLoading(true);
    try {
      await apiClient.post("/students/students/", payload);
      setCreateMessage("Đã thêm học viên mới.");
      setReloadKey((prev) => prev + 1);
      setListNotice("Đã thêm học viên mới.");
      resetCreateForm();
    } catch (error) {
      const apiError = error?.response?.data;
      const message =
        apiError?.detail ||
        (apiError && typeof apiError === "object"
          ? Object.values(apiError)?.[0]?.[0]
          : null) ||
        "Không thể thêm học viên. Vui lòng thử lại.";
      setCreateError(message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteStudent = async (student) => {
    if (!student?.id) return;
    setListNotice("");
    setListError("");
    setConfirmStudent(null);
    setDeletingId(student.id);
    try {
      await apiClient.delete(`/students/students/${student.id}/`);
      setListNotice("Đã xoá học viên.");
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      const apiError = error?.response?.data;
      setListError(
        apiError?.detail ||
          apiError?.message ||
          "Không thể xoá học viên. Vui lòng thử lại.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const requestDeleteStudent = (student) => {
    setConfirmStudent(student);
  };

  const actions = (
    <>
      <button type="button" className={styles.iconButton} aria-label="Bộ lọc">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M4 6.5h16a.75.75 0 0 1 .58 1.23L14 15.5v4a.75.75 0 0 1-1.12.66l-2-1.1a.75.75 0 0 1-.38-.66v-2.9L3.42 7.73A.75.75 0 0 1 4 6.5Z"
            fill="currentColor"
          />
        </svg>
      </button>
      {canManageStudents && (
        <>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              setImportMessage("");
              setImportErrors([]);
              setIsImportOpen(true);
            }}
          >
            Nhập Excel
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => {
              setCreateMessage("");
              setCreateError("");
              setIsCreateOpen(true);
            }}
          >
            + Thêm học viên
          </button>
        </>
      )}
    </>
  );

  return (
    <PeopleList
      title="Danh sách học viên"
      endpoint="/students/students/"
      searchPlaceholder="Tìm kiếm học viên"
      emptyLabel="Chưa có học viên."
      fields={studentFields}
      actions={actions}
      reloadKey={reloadKey}
      rowActions={
        canManageStudents
          ? (item) => (
              <button
                type="button"
                className={`${styles.menuButton} ${styles.dangerButton}`}
                aria-label="Xoá học viên"
                onClick={(event) => {
                  event.stopPropagation();
                  requestDeleteStudent(item);
                }}
                disabled={deletingId === item.id}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M9 3.75h6a.75.75 0 0 1 .75.75V6h4a.75.75 0 0 1 0 1.5h-1.1l-.86 11.1a2.5 2.5 0 0 1-2.5 2.3H8.71a2.5 2.5 0 0 1-2.5-2.3L5.35 7.5H4.25a.75.75 0 0 1 0-1.5h4V4.5a.75.75 0 0 1 .75-.75Zm.75 2.25h4.5v-1.5h-4.5Zm-1.83 1.5.8 10.4a1 1 0 0 0 1 .92h6.56a1 1 0 0 0 1-.92l.8-10.4Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            )
          : null
      }
      onRowClick={(item) =>
        navigate(`/students/${item.id}`, {
          state: { profileType: "student", student: item },
        })
      }
    >
      {listNotice && <div className={styles.state}>{listNotice}</div>}
      {listError && (
        <div className={`${styles.state} ${styles["state--error"]}`}>
          {listError}
        </div>
      )}
      {confirmStudent && (
        <ConfirmDialog
          title="Xoá học viên"
          message={`Bạn có chắc muốn xoá học viên ${confirmStudent.user?.first_name || ""} ${
            confirmStudent.user?.last_name || ""
          }?`}
          confirmLabel="Xoá học viên"
          cancelLabel="Hủy"
          isLoading={deletingId === confirmStudent.id}
          onConfirm={() => handleDeleteStudent(confirmStudent)}
          onCancel={() => setConfirmStudent(null)}
        />
      )}
      {isImportOpen && canManageStudents && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <header className={styles.modalHeader}>
              <h2>Nhập danh sách học viên</h2>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Đóng"
                onClick={() => setIsImportOpen(false)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M6 6 18 18M6 18 18 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </header>
            <form className={styles.modalBody} onSubmit={handleImportSubmit}>
              <p className={styles.note}>
                Hỗ trợ file Excel theo mẫu chuẩn xuất từ hệ thống hoặc file
                VIS-2025. Bạn có thể chọn trung tâm/lớp để gán mặc định khi
                import.
              </p>
              <div className={styles.formGrid}>
                <label className={styles.formGroup}>
                  <span>File Excel</span>
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={(event) => setImportFile(event.target.files?.[0] || null)}
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Trung tâm (tuỳ chọn)</span>
                  <select
                    value={importCenterId}
                    onChange={(event) => setImportCenterId(event.target.value)}
                  >
                    <option value="">Chọn trung tâm</option>
                    {centers.map((center) => (
                      <option key={center.id} value={center.id}>
                        {center.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {importMessage && (
                <div className={styles.state}>{importMessage}</div>
              )}
              {importErrors.length > 0 && (
                <div className={styles.errorList}>
                  {importErrors.map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              )}
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setIsImportOpen(false)}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={importLoading}
                >
                  {importLoading ? "Đang nhập..." : "Nhập file"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateOpen && canManageStudents && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <header className={styles.modalHeader}>
              <h2>Thêm học viên</h2>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Đóng"
                onClick={() => setIsCreateOpen(false)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M6 6 18 18M6 18 18 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </header>
            <form className={styles.modalBody} onSubmit={handleCreateSubmit}>
              <p className={styles.note}>
                Mật khẩu mặc định sẽ lấy theo số điện thoại (hoặc email nếu
                thiếu).
              </p>
              <div className={styles.formGrid}>
                <label className={styles.formGroup}>
                  <span>Mã học viên</span>
                  <input
                    type="text"
                    value={formData.student_code}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        student_code: event.target.value,
                      }))
                    }
                    placeholder="VD: STU-001"
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Họ</span>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        last_name: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Tên</span>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        first_name: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Email</span>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Số điện thoại</span>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        phone_number: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Giới tính</span>
                  <select
                    value={formData.gender}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        gender: event.target.value,
                      }))
                    }
                  >
                    <option value="">Chọn giới tính</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                  </select>
                </label>
                <label className={styles.formGroup}>
                  <span>Ngày sinh</span>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        date_of_birth: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Trung tâm</span>
                  <select
                    value={createCenterId}
                    onChange={(event) => setCreateCenterId(event.target.value)}
                  >
                    <option value="">Chọn trung tâm</option>
                    {centers.map((center) => (
                      <option key={center.id} value={center.id}>
                        {center.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.formGroup}>
                  <span>Lớp học</span>
                  <select
                    value={createClassroomId}
                    onChange={(event) =>
                      setCreateClassroomId(event.target.value)
                    }
                    disabled={!createCenterId}
                  >
                    <option value="">Chọn lớp</option>
                    {createClassrooms.map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.formGroup}>
                  <span>Trạng thái</span>
                  <select
                    value={formData.current_status}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        current_status: event.target.value,
                      }))
                    }
                  >
                    {Object.entries(studentStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.formGroup}>
                  <span>Ngày nhập học</span>
                  <input
                    type="date"
                    value={formData.admission_date}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        admission_date: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Địa chỉ</span>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        address: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Ghi chú học vụ</span>
                  <textarea
                    rows={2}
                    value={formData.learning_note}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        learning_note: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Tên phụ huynh</span>
                  <input
                    type="text"
                    value={formData.parent_name}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        parent_name: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>SĐT phụ huynh</span>
                  <input
                    type="tel"
                    value={formData.parent_phone}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        parent_phone: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Email phụ huynh</span>
                  <input
                    type="email"
                    value={formData.parent_email}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        parent_email: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Quan hệ</span>
                  <input
                    type="text"
                    value={formData.parent_relationship}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        parent_relationship: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              {createError && (
                <div className={`${styles.state} ${styles["state--error"]}`}>
                  {createError}
                </div>
              )}
              {createMessage && <div className={styles.state}>{createMessage}</div>}
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setIsCreateOpen(false)}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={createLoading}
                >
                  {createLoading ? "Đang lưu..." : "Lưu học viên"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PeopleList>
  );
}

export default Students;
