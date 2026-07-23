import apiClient from "./apiClient";

const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) {
    return {
      results: payload,
      count: payload.length,
      next: null,
      previous: null,
    };
  }

  return {
    results: Array.isArray(payload?.results) ? payload.results : [],
    count: Number(payload?.count) || 0,
    next: payload?.next || null,
    previous: payload?.previous || null,
  };
};

export async function listAttendanceDevices() {
  const { data } = await apiClient.get("/attendance/devices/");
  return normalizeCollection(data);
}

export async function probeAttendanceDevice(deviceId) {
  const { data } = await apiClient.post(`/attendance/devices/${deviceId}/probe/`);
  return data;
}

export async function syncAttendanceDevice(deviceId, payload) {
  const { data } = await apiClient.post(
    `/attendance/devices/${deviceId}/sync_events/`,
    payload,
  );
  return data;
}

export async function listAttendanceEvents(params) {
  const { data } = await apiClient.get("/attendance/events/", { params });
  return normalizeCollection(data);
}

export async function listPayrollConfigs() {
  const { data } = await apiClient.get("/attendance/payroll-configs/");
  return normalizeCollection(data);
}

export async function getPayrollPreview(teacherId, params) {
  const { data } = await apiClient.get(
    `/attendance/payroll-configs/preview/${teacherId}/`,
    { params },
  );
  return data;
}

export async function listClassroomFinanceConfigs() {
  const { data } = await apiClient.get("/attendance/classroom-finance-configs/");
  return normalizeCollection(data);
}

export async function getClassroomPreview(classroomId, params) {
  const { data } = await apiClient.get(
    `/attendance/classroom-finance-configs/preview/${classroomId}/`,
    { params },
  );
  return data;
}
