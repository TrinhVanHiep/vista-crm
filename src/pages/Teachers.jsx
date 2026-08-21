import BulkImportModal from "../components/bulk/BulkImportModal";
import GanLopModal from "../components/teacher/GanLopModal";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";
import { useAuth } from "../auth/AuthProvider";
import {
  formatDate,
  formatGender,
  getAge,
  getAvatarColor,
  getFullName,
  getInitials,
} from "../utils/userFormatters";
import { CenterField, useAutoCenter } from "../utils/centerField";
import {
  Page,
  PageHeader,
  Card,
  DataTable,
  Modal,
  Button,
  Badge,
  KpiGrid,
  Kpi,
  Field,
} from "../ui";

const TEACHERS_ENDPOINT = "/teachers/teachers/";

const teacherStatusLabels = {
  active: "Đang làm",
  probation: "Thử việc",
  paused: "Tạm dừng",
  terminated: "Đã nghỉ",
};

const teacherStatusTones = {
  active: "green",
  probation: "blue",
  paused: "orange",
  terminated: "red",
};

const employmentTypeLabels = {
  director: "Giám đốc",
  full_time: "Full-time",
  part_time: "Part-time",
  freelance: "Freelance",
};

// Lương cơ bản hiển thị trong danh sách (giữ như bản trước khi chuẩn hoá).
const formatSalary = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "--";
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(n))} ₫`;
};

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
    <path
      d="M9 3.75h6a.75.75 0 0 1 .75.75V6h4a.75.75 0 0 1 0 1.5h-1.1l-.86 11.1a2.5 2.5 0 0 1-2.5 2.3H8.71a2.5 2.5 0 0 1-2.5-2.3L5.35 7.5H4.25a.75.75 0 0 1 0-1.5h4V4.5a.75.75 0 0 1 .75-.75Zm.75 2.25h4.5v-1.5h-4.5Zm-1.83 1.5.8 10.4a1 1 0 0 0 1 .92h6.56a1 1 0 0 0 1-.92l.8-10.4Z"
      fill="currentColor"
    />
  </svg>
);

const ChevronIcon = ({ dir = "left" }) => (
  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
    <path
      d={dir === "left" ? "m14 7-5 5 5 5" : "m10 7 5 5-5 5"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function Teachers() {
  const navigate = useNavigate();
  const [reloadKey, setReloadKey] = useState(0);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [moNhapExcel, setMoNhapExcel] = useState(false);
  // Gán lớp phụ trách — phân quyền theo lớp chỉ có nghĩa khi gán được lớp.
  const [gvGanLop, setGvGanLop] = useState(null);
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

  // ----- Danh sách giảng viên (trước đây nằm trong component PeopleList) -----
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { role } = useAuth();
  const canManageTeachers = ["superadmin", "admin"].includes(role);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let isActive = true;

    const fetchList = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const response = await apiClient.get(TEACHERS_ENDPOINT, {
          params: {
            page,
            search: debouncedSearch || undefined,
          },
        });
        if (!isActive) return;
        const data = response.data;
        if (Array.isArray(data)) {
          setItems(data);
          setCount(data.length);
          setHasNext(false);
          setHasPrev(false);
          setPageSize(data.length || 10);
        } else {
          const results = data?.results ?? [];
          setItems(results);
          setCount(data?.count ?? results.length);
          setHasNext(Boolean(data?.next));
          setHasPrev(Boolean(data?.previous));
          if (page === 1) {
            setPageSize(results.length || 10);
          }
        }
      } catch (error) {
        if (!isActive) return;
        const apiError = error?.response?.data;
        const message =
          apiError?.detail ||
          apiError?.message ||
          "Không thể tải dữ liệu. Vui lòng thử lại.";
        setErrorMessage(message);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchList();
    return () => {
      isActive = false;
    };
  }, [debouncedSearch, page, reloadKey]);

  const totalCount = count || items.length;
  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + items.length;

  // KPI phải tính trên TOÀN BỘ giáo viên, không phải 10 dòng của trang đang xem
  // (nếu không sẽ đọc thành "tổng 57 giáo viên, chỉ 6 đang làm").
  const [allTeachers, setAllTeachers] = useState([]);
  useEffect(() => {
    let isActive = true;
    apiClient
      .get(TEACHERS_ENDPOINT, { params: { page_size: 500 } })
      .then((res) => {
        if (!isActive) return;
        const data = res.data;
        setAllTeachers(Array.isArray(data) ? data : data?.results ?? []);
      })
      .catch(() => {
        if (isActive) setAllTeachers([]);
      });
    return () => {
      isActive = false;
    };
  }, [reloadKey]);

  const stats = useMemo(() => {
    const src = allTeachers.length ? allTeachers : items;
    return {
      total: allTeachers.length || count || items.length,
      activeCount: src.filter((i) => i.employment_status === "active").length,
      fullTimeCount: src.filter((i) => i.employment_type === "full_time").length,
      terminatedCount: src.filter((i) => i.employment_status === "terminated").length,
    };
  }, [allTeachers, items, count]);

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

  useAutoCenter(centers, setImportCenterId);
  useAutoCenter(centers, setCreateCenterId);

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

  const columns = useMemo(() => {
    const base = [
      {
        key: "teacher",
        header: "Giáo viên",
        render: (item) => {
          const user = item.user || {};
          const name = getFullName(user);
          const email = user.email || user.username || "--";
          return (
            <div className="who">
              <span
                className="avatar"
                style={{
                  background: getAvatarColor(name || email),
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10.5,
                  fontWeight: 800,
                }}
                aria-hidden="true"
              >
                {getInitials(name, email)}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{name}</div>
                <div className="small muted">{email}</div>
              </div>
            </div>
          );
        },
      },
      {
        key: "teacher_code",
        header: "Mã GV",
        render: (item) => item.teacher_code || "--",
      },
      {
        key: "gender",
        header: "Giới tính",
        render: (item) => formatGender(item.gender),
      },
      {
        key: "date_of_birth",
        header: "Ngày sinh",
        render: (item) => formatDate(item.date_of_birth),
      },
      {
        key: "age",
        header: "Tuổi",
        align: "center",
        render: (item) => getAge(item.date_of_birth) ?? "--",
      },
      {
        key: "employment_type",
        header: "Vị trí",
        render: (item) =>
          employmentTypeLabels[item.employment_type] || "Giảng viên",
      },
      {
        key: "base_salary",
        header: "Lương cơ bản",
        align: "right",
        render: (item) => formatSalary(item.base_salary),
      },
      {
        key: "employment_status",
        header: "Trạng thái",
        render: (item) => (
          <Badge tone={teacherStatusTones[item.employment_status] || "gray"}>
            {teacherStatusLabels[item.employment_status] ||
              item.employment_status ||
              "--"}
          </Badge>
        ),
      },
    ];

    if (canManageTeachers) {
      base.push({
        key: "lop",
        header: "Lớp phụ trách",
        align: "center",
        width: 132,
        render: (item) => (
          <Button
            variant="ghost"
            size="sm"
            // Bảng có sự kiện bấm-dòng để mở hồ sơ; không chặn nổi bọt thì bấm
            // nút này lại nhảy sang trang giáo viên.
            onClick={(e) => {
              e.stopPropagation();
              setGvGanLop(item);
            }}
          >
            Gán lớp
          </Button>
        ),
      });
      base.push({
        key: "actions",
        header: "Thao tác",
        align: "center",
        width: 96,
        render: (item) => (
          <Button
            variant="danger"
            size="sm"
            aria-label="Xoá giảng viên"
            title="Xoá giảng viên"
            disabled={deletingId === item.id}
            onClick={(event) => {
              event.stopPropagation();
              requestDeleteTeacher(item);
            }}
            icon={<TrashIcon />}
          />
        ),
      });
    }

    return base;
  }, [canManageTeachers, deletingId]);

  const headerActions = canManageTeachers ? (
    <>
      <Button variant="ghost" onClick={() => setMoNhapExcel(true)}>
        📥 Nhập Excel
      </Button>
      <Button
        onClick={() => {
          setImportMessage("");
          setImportErrors([]);
          setIsImportOpen(true);
        }}
      >
        Nhập Excel
      </Button>
      <Button
        variant="primary"
        onClick={() => {
          setCreateMessage("");
          setCreateError("");
          setIsCreateOpen(true);
        }}
      >
        + Thêm giảng viên
      </Button>
    </>
  ) : null;

  return (
    <Page>
      <PageHeader
        title="Hành chính - Nhân sự"
        description="Quản lý hồ sơ giáo viên và nhân sự trung tâm"
        actions={headerActions}
      />

      <KpiGrid cols={4}>
        <Kpi ico="👥" icoClass="orange" label="Tổng giáo viên" value={stats.total} sub="toàn trung tâm" />
        <Kpi
          ico="✅"
          icoClass="green"
          label="Đang làm"
          value={stats.activeCount}
          sub="toàn trung tâm"
        />
        <Kpi
          ico="🕒"
          icoClass="blue"
          label="Full-time"
          value={stats.fullTimeCount}
          sub="toàn trung tâm"
        />
        <Kpi
          ico="🚪"
          icoClass="red"
          label="Đã nghỉ"
          value={stats.terminatedCount}
          sub="toàn trung tâm"
        />
      </KpiGrid>

      {/* Bỏ 2 tab "Danh sách"/"Hoạt động": vốn là nút chết (không onClick, active
          cứng index===0) từ bản cũ. Không giữ nút không có tính năng. */}
      <Card title={`Đội ngũ giảng viên (${totalCount})`}>
        <div className="flex" style={{ gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm kiếm giảng viên"
            aria-label="Tìm kiếm giảng viên"
            style={{
              flex: "1 1 260px",
              padding: "9px 12px",
              border: "1px solid var(--border)",
              borderRadius: 9,
              fontSize: 13,
              fontFamily: "inherit",
              background: "var(--card)",
              color: "var(--text)",
            }}
          />
        </div>

        {listNotice ? (
          <div
            className="alert"
            style={{
              background: "var(--success-soft)",
              color: "var(--success)",
              marginBottom: 12,
            }}
          >
            {listNotice}
          </div>
        ) : null}
        {listError ? (
          <div className="alert red" style={{ marginBottom: 12 }}>
            {listError}
          </div>
        ) : null}

        {!loading && errorMessage ? (
          <div className="alert red">{errorMessage}</div>
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            loading={loading}
            empty="Chưa có giảng viên."
            rowKey={(item, index) => item.id ?? index}
            onRowClick={(item) =>
              navigate(`/teachers/${item.id}`, { state: { teacher: item } })
            }
            minWidth={860}
          />
        )}

        <div
          className="flex-between"
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid var(--border-soft)",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span className="small muted">
            {startIndex}-{endIndex} of {totalCount}
          </span>
          <div className="flex" style={{ gap: 6 }}>
            <Button
              size="sm"
              aria-label="Trang trước"
              disabled={!hasPrev}
              onClick={() => hasPrev && setPage((prev) => Math.max(prev - 1, 1))}
              icon={<ChevronIcon dir="left" />}
            />
            <Button
              size="sm"
              aria-label="Trang sau"
              disabled={!hasNext}
              onClick={() => hasNext && setPage((prev) => prev + 1)}
              icon={<ChevronIcon dir="right" />}
            />
          </div>
        </div>
      </Card>

      <Modal
        open={Boolean(confirmTeacher)}
        onClose={() => setConfirmTeacher(null)}
        title="Xoá giảng viên"
        size="sm"
        footer={
          <>
            <Button
              onClick={() => setConfirmTeacher(null)}
              disabled={deletingId === confirmTeacher?.id}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={() => handleDeleteTeacher(confirmTeacher)}
              loading={deletingId === confirmTeacher?.id}
              loadingText="Đang xử lý..."
            >
              Xoá giảng viên
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 13, color: "var(--text-2)" }}>
          {`Bạn có chắc muốn xoá giảng viên ${
            confirmTeacher?.user?.first_name || ""
          } ${confirmTeacher?.user?.last_name || ""}?`}
        </p>
      </Modal>

      <Modal
        open={isImportOpen && canManageTeachers}
        onClose={() => setIsImportOpen(false)}
        title="Nhập danh sách giảng viên"
        subtitle="Hỗ trợ file Excel theo mẫu chuẩn. Bạn có thể chọn trung tâm để gán mặc định khi import."
        size="md"
        footer={
          <>
            <Button onClick={() => setIsImportOpen(false)}>Đóng</Button>
            <Button
              variant="primary"
              type="submit"
              form="teacher-import-form"
              loading={importLoading}
              loadingText="Đang nhập..."
            >
              Nhập file
            </Button>
          </>
        }
      >
        <form id="teacher-import-form" onSubmit={handleImportSubmit}>
          <div className="ui-form-grid">
            <Field label="File Excel">
              <input
                type="file"
                accept=".xlsx"
                onChange={(event) =>
                  setImportFile(event.target.files?.[0] || null)
                }
              />
            </Field>
            <Field label="Trung tâm (tuỳ chọn)">
              <CenterField
                centers={centers}
                value={importCenterId}
                onChange={(event) => setImportCenterId(event.target.value)}
                placeholder="Chọn trung tâm"
              />
            </Field>
          </div>
          {importMessage ? (
            <div className="alert orange" style={{ marginTop: 12 }}>
              {importMessage}
            </div>
          ) : null}
          {importErrors.length > 0 ? (
            <div
              className="alert red"
              style={{ marginTop: 12, flexDirection: "column", gap: 4 }}
            >
              {importErrors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={isCreateOpen && canManageTeachers}
        onClose={() => setIsCreateOpen(false)}
        title="Thêm giảng viên"
        subtitle="Mật khẩu mặc định sẽ lấy theo số điện thoại (hoặc email nếu thiếu)."
        size="lg"
        footer={
          <>
            <Button onClick={() => setIsCreateOpen(false)}>Đóng</Button>
            <Button
              variant="primary"
              type="submit"
              form="teacher-create-form"
              loading={createLoading}
              loadingText="Đang lưu..."
            >
              Lưu giảng viên
            </Button>
          </>
        }
      >
        <form id="teacher-create-form" onSubmit={handleCreateSubmit}>
          <div className="ui-form-grid">
            <Field label="Mã giáo viên">
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
            </Field>
            <Field label="Họ" required>
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
            </Field>
            <Field label="Tên" required>
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
            </Field>
            <Field label="Email" required>
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
            </Field>
            <Field label="Số điện thoại">
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
            </Field>
            <Field label="Giới tính">
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
            </Field>
            <Field label="Ngày sinh">
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
            </Field>
            <Field label="Trung tâm">
              <CenterField
                centers={centers}
                value={createCenterId}
                onChange={(event) => setCreateCenterId(event.target.value)}
                placeholder="Chọn trung tâm"
              />
            </Field>
            <Field label="Lớp học">
              <select
                value={createClassroomId}
                onChange={(event) => setCreateClassroomId(event.target.value)}
                disabled={!createCenterId}
              >
                <option value="">Chọn lớp</option>
                {createClassrooms.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Trạng thái công tác">
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
            </Field>
            <Field label="Loại hợp đồng">
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
            </Field>
            <Field label="Lương cơ bản">
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
            </Field>
            <Field label="Ngày vào làm">
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
            </Field>
            <Field label="Chuyên môn">
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
            </Field>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Địa chỉ">
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
              </Field>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Bằng cấp/chứng chỉ">
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
              </Field>
            </div>
          </div>
          {createError ? (
            <div className="alert red" style={{ marginTop: 12 }}>
              {createError}
            </div>
          ) : null}
          {createMessage ? (
            <div
              className="alert"
              style={{
                background: "var(--success-soft)",
                color: "var(--success)",
                marginTop: 12,
              }}
            >
              {createMessage}
            </div>
          ) : null}
        </form>
      </Modal>

      <GanLopModal
        giaoVien={gvGanLop}
        onClose={() => setGvGanLop(null)}
        onXong={() => setReloadKey((k) => k + 1)}
      />

      <BulkImportModal
        loai="giaoVien"
        open={moNhapExcel}
        onClose={() => setMoNhapExcel(false)}
        onXong={() => setReloadKey((k) => k + 1)}
      />
    </Page>
  );
}

export default Teachers;
