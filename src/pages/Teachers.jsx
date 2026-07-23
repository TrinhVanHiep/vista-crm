import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PeopleList from "../components/PeopleList";
import apiClient from "../services/apiClient";
import styles from "../styles/employeeList.module.css";
import { useAuth } from "../auth/AuthProvider";
import ConfirmDialog from "../components/ConfirmDialog";
import { formatDate, formatGender, getAge } from "../utils/userFormatters";

const teacherStatusLabels = {
  active: "Đang làm",
  probation: "Thử việc",
  paused: "Tạm dừng",
  terminated: "Đã nghỉ",
};

const employmentTypeLabels = {
  director: "Giám đốc",
  full_time: "Full-time",
  part_time: "Part-time",
  freelance: "Freelance",
};

const formatCurrency = (value) =>
  `${new Intl.NumberFormat("vi-VN").format(Math.round(Number(value) || 0))} ₫`;

const teacherFields = [
  {
    label: "Mã giáo viên",
    getValue: (item) => item.teacher_code || "--",
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
    label: "Vị trí",
    getValue: (item) => employmentTypeLabels[item.employment_type] || "Giảng viên",
  },
  {
    label: "Lương cơ bản",
    getValue: (item) => formatCurrency(item.base_salary),
  },
  {
    label: "Trạng thái",
    getValue: (item) =>
      teacherStatusLabels[item.employment_status] ||
      item.employment_status ||
      "--",
  },
];

function Teachers() {
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
  const [confirmTeacher, setConfirmTeacher] = useState(null);
  const [centers, setCenters] = useState([]);
  const [createClassrooms, setCreateClassrooms] = useState([]);
  const [importCenterId, setImportCenterId] = useState("");
  const [createCenterId, setCreateCenterId] = useState("");
  const [createClassroomId, setCreateClassroomId] = useState("");
  const [formData, setFormData] = useState({
    teacher_code: "",
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    gender: "",
    date_of_birth: "",
    address: "",
    employment_status: "active",
    employment_type: "full_time",
    base_salary: "",
    join_date: "",
    specialization: "",
    qualifications: "",
  });

  const { role } = useAuth();
  const canManageTeachers = ["superadmin", "admin"].includes(role);

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

  useEffect(() => {
    const fetchClassrooms = async () => {
      if (!createCenterId) {
        setCreateClassrooms([]);
        return;
      }
      try {
        const response = await apiClient.get(
          `/centers/centers/${createCenterId}/classrooms/`,
        );
        const data = Array.isArray(response.data) ? response.data : [];
        setCreateClassrooms(data);
      } catch (error) {
        setCreateClassrooms([]);
      }
    };

    fetchClassrooms();
    setCreateClassroomId("");
  }, [createCenterId]);

  const importCenterName = useMemo(() => {
    if (!importCenterId) return "";
    return centers.find((center) => String(center.id) === String(importCenterId))
      ?.name;
  }, [centers, importCenterId]);

  const resetCreateForm = () => {
    setFormData({
      teacher_code: "",
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      gender: "",
      date_of_birth: "",
      address: "",
      employment_status: "active",
      employment_type: "full_time",
      base_salary: "",
      join_date: "",
      specialization: "",
      qualifications: "",
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
        "/teachers/teachers/import_teachers/",
        data,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const payload = response?.data || {};
      const successCount = payload.success_count ?? 0;
      const errorCount = payload.error_count ?? 0;
      setImportErrors(payload.errors || []);
      setImportMessage(
        `Đã nhập ${successCount} giảng viên. Lỗi: ${errorCount}.`,
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
      setCreateError("Vui lòng nhập họ, tên và email giảng viên.");
      return;
    }

    const basePassword =
      formData.phone_number || formData.email || "Teacher@2025";
    const password =
      basePassword.length >= 8 ? basePassword : `${basePassword}12345678`;

    const payload = {
      teacher_code: formData.teacher_code.trim() || undefined,
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
      employment_status: formData.employment_status || "active",
      employment_type: formData.employment_type || "full_time",
      base_salary: formData.base_salary || "0",
      join_date: formData.join_date || null,
      specialization: formData.specialization || "",
      qualifications: formData.qualifications || "",
    };

    if (createCenterId && createClassroomId) {
      payload.centers_classrooms = [
        {
          center: Number(createCenterId),
          classroom: Number(createClassroomId),
        },
      ];
    }

    setCreateLoading(true);
    try {
      await apiClient.post("/teachers/teachers/", payload);
      setCreateMessage("Đã thêm giảng viên mới.");
      setReloadKey((prev) => prev + 1);
      setListNotice("Đã thêm giảng viên mới.");
      resetCreateForm();
    } catch (error) {
      const apiError = error?.response?.data;
      const message =
        apiError?.detail ||
        (apiError && typeof apiError === "object"
          ? Object.values(apiError)?.[0]?.[0]
          : null) ||
        "Không thể thêm giảng viên. Vui lòng thử lại.";
      setCreateError(message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteTeacher = async (teacher) => {
    if (!teacher?.id) return;
    setListNotice("");
    setListError("");
    setConfirmTeacher(null);
    setDeletingId(teacher.id);
    try {
      await apiClient.delete(`/teachers/teachers/${teacher.id}/`);
      setListNotice("Đã xoá giảng viên.");
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      const apiError = error?.response?.data;
      setListError(
        apiError?.detail ||
          apiError?.message ||
          "Không thể xoá giảng viên. Vui lòng thử lại.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const requestDeleteTeacher = (teacher) => {
    setConfirmTeacher(teacher);
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
      {canManageTeachers && (
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
            + Thêm giảng viên
          </button>
        </>
      )}
    </>
  );

  return (
    <PeopleList
      title="Đội ngũ giảng viên"
      endpoint="/teachers/teachers/"
      searchPlaceholder="Tìm kiếm giảng viên"
      emptyLabel="Chưa có giảng viên."
      fields={teacherFields}
      actions={actions}
      reloadKey={reloadKey}
      rowActions={
        canManageTeachers
          ? (item) => (
              <button
                type="button"
                className={`${styles.menuButton} ${styles.dangerButton}`}
                aria-label="Xoá giảng viên"
                onClick={(event) => {
                  event.stopPropagation();
                  requestDeleteTeacher(item);
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
      onRowClick={(item) => navigate(`/teachers/${item.id}`, { state: { teacher: item } })}
    >
      {listNotice && <div className={styles.state}>{listNotice}</div>}
      {listError && (
        <div className={`${styles.state} ${styles["state--error"]}`}>
          {listError}
        </div>
      )}
      {confirmTeacher && (
        <ConfirmDialog
          title="Xoá giảng viên"
          message={`Bạn có chắc muốn xoá giảng viên ${
            confirmTeacher.user?.first_name || ""
          } ${confirmTeacher.user?.last_name || ""}?`}
          confirmLabel="Xoá giảng viên"
          cancelLabel="Hủy"
          isLoading={deletingId === confirmTeacher.id}
          onConfirm={() => handleDeleteTeacher(confirmTeacher)}
          onCancel={() => setConfirmTeacher(null)}
        />
      )}
      {isImportOpen && canManageTeachers && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <header className={styles.modalHeader}>
              <h2>Nhập danh sách giảng viên</h2>
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
                Hỗ trợ file Excel theo mẫu chuẩn. Bạn có thể chọn trung tâm để
                gán mặc định khi import.
              </p>
              <div className={styles.formGrid}>
                <label className={styles.formGroup}>
                  <span>File Excel</span>
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={(event) =>
                      setImportFile(event.target.files?.[0] || null)
                    }
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
              {importMessage && <div className={styles.state}>{importMessage}</div>}
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

      {isCreateOpen && canManageTeachers && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <header className={styles.modalHeader}>
              <h2>Thêm giảng viên</h2>
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
                  <span>Mã giáo viên</span>
                  <input
                    type="text"
                    value={formData.teacher_code}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        teacher_code: event.target.value,
                      }))
                    }
                    placeholder="VD: T001"
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
                  <span>Trạng thái công tác</span>
                  <select
                    value={formData.employment_status}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        employment_status: event.target.value,
                      }))
                    }
                  >
                    {Object.entries(teacherStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.formGroup}>
                  <span>Loại hợp đồng</span>
                  <select
                    value={formData.employment_type}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        employment_type: event.target.value,
                      }))
                    }
                  >
                    {Object.entries(employmentTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.formGroup}>
                  <span>Lương cơ bản</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.base_salary}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        base_salary: event.target.value,
                      }))
                    }
                    placeholder="VD: 5500000"
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Ngày vào làm</span>
                  <input
                    type="date"
                    value={formData.join_date}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        join_date: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Chuyên môn</span>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        specialization: event.target.value,
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
                  <span>Bằng cấp/chứng chỉ</span>
                  <textarea
                    rows={2}
                    value={formData.qualifications}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        qualifications: event.target.value,
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
                  {createLoading ? "Đang lưu..." : "Lưu giảng viên"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PeopleList>
  );
}

export default Teachers;
