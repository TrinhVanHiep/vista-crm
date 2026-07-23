import apiClient from "./apiClient";

const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) {
    return { results: payload, count: payload.length, next: null, previous: null };
  }
  return {
    results: Array.isArray(payload?.results) ? payload.results : [],
    count: Number(payload?.count) || 0,
    next: payload?.next || null,
    previous: payload?.previous || null,
  };
};

export async function listNotifications(params = {}) {
  const { data } = await apiClient.get("/notifications/notifications/", { params });
  return normalizeCollection(data);
}

export async function getUnreadNotificationCount() {
  const { data } = await apiClient.get("/notifications/notifications/unread-count/");
  return Number(data?.count) || 0;
}

export async function markNotificationRead(notificationId) {
  const { data } = await apiClient.post(
    `/notifications/notifications/${notificationId}/mark-read/`,
  );
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await apiClient.post("/notifications/notifications/mark-all-read/");
  return data;
}

export async function getWebPushConfig() {
  const { data } = await apiClient.get("/notifications/push-subscriptions/config/");
  return {
    configured: Boolean(data?.configured),
    publicKey: data?.public_key || "",
  };
}

export async function listWebPushSubscriptions() {
  const { data } = await apiClient.get("/notifications/push-subscriptions/");
  return normalizeCollection(data).results;
}

export async function registerWebPushSubscription(payload) {
  const { data } = await apiClient.post("/notifications/push-subscriptions/", payload);
  return data;
}

export async function removeWebPushSubscription(subscriptionId) {
  await apiClient.delete(`/notifications/push-subscriptions/${subscriptionId}/`);
}

export async function sendWebPushTest() {
  const { data } = await apiClient.post("/notifications/push-subscriptions/test/");
  return data;
}

export async function listZaloLinks(params = {}) {
  const { data } = await apiClient.get("/notifications/zalo-links/", { params });
  return normalizeCollection(data);
}

export async function createZaloLink(payload) {
  const { data } = await apiClient.post("/notifications/zalo-links/", payload);
  return data;
}

export async function updateZaloLink(linkId, payload) {
  const { data } = await apiClient.patch(`/notifications/zalo-links/${linkId}/`, payload);
  return data;
}
