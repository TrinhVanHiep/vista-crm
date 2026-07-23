import {
  getWebPushConfig,
  listWebPushSubscriptions,
  registerWebPushSubscription,
  removeWebPushSubscription,
  sendWebPushTest,
} from "./notificationService";

function isIosDevice() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent)
    || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}

function getCapability() {
  const supported = window.isSecureContext
    && "serviceWorker" in window.navigator
    && "PushManager" in window
    && "Notification" in window;

  return {
    supported,
    needsHomeScreen: supported && isIosDevice() && !isStandalone(),
  };
}

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

function serializeSubscription(subscription) {
  const data = subscription.toJSON();
  return {
    endpoint: data.endpoint,
    p256dh: data.keys?.p256dh || "",
    auth: data.keys?.auth || "",
    user_agent: window.navigator.userAgent,
  };
}

export async function registerVistaServiceWorker() {
  if (!("serviceWorker" in window.navigator)) return null;
  const existing = await window.navigator.serviceWorker.getRegistration("/");
  return existing || window.navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

async function getCurrentSubscription() {
  const registration = await registerVistaServiceWorker();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

async function saveSubscription(subscription) {
  return registerWebPushSubscription(serializeSubscription(subscription));
}

export async function loadWebPushState({ sync = true } = {}) {
  const config = await getWebPushConfig();
  const capability = getCapability();
  let subscription = null;

  if (capability.supported) {
    subscription = await getCurrentSubscription();
    if (sync && window.Notification.permission === "granted" && subscription) {
      await saveSubscription(subscription);
    }
  }

  return {
    ...capability,
    configured: config.configured,
    publicKey: config.publicKey,
    permission: capability.supported ? window.Notification.permission : "unsupported",
    enabled: Boolean(subscription && window.Notification.permission === "granted"),
  };
}

export async function enableWebPush(publicKey) {
  const capability = getCapability();
  if (!capability.supported) {
    throw new Error("Thiết bị hoặc trình duyệt này không hỗ trợ Web Push.");
  }
  if (capability.needsHomeScreen) {
    throw new Error("Hãy thêm Vista CRM vào Màn hình chính rồi mở lại để bật thông báo.");
  }
  if (!publicKey) {
    throw new Error("Máy chủ chưa được cấu hình khóa Web Push.");
  }

  const permissionPromise = window.Notification.requestPermission();
  const registrationPromise = registerVistaServiceWorker();
  const permission = await permissionPromise;
  if (permission !== "granted") {
    throw new Error("Quyền gửi thông báo chưa được cho phép trong trình duyệt.");
  }

  const registration = await registrationPromise;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await saveSubscription(subscription);
  let testSent = false;
  try {
    const testResult = await sendWebPushTest();
    testSent = Number(testResult?.sent) > 0;
  } catch {
    testSent = false;
  }

  return {
    ...capability,
    configured: true,
    publicKey,
    permission,
    enabled: true,
    testSent,
  };
}

async function removeCurrentServerSubscription(subscription) {
  if (!subscription) return;
  const serverSubscriptions = await listWebPushSubscriptions();
  const matching = serverSubscriptions.find((item) => item.endpoint === subscription.endpoint);
  if (matching) {
    await removeWebPushSubscription(matching.id);
  }
}

export async function disableWebPush(publicKey = "") {
  const capability = getCapability();
  const subscription = capability.supported ? await getCurrentSubscription() : null;
  await removeCurrentServerSubscription(subscription);
  if (subscription) {
    await subscription.unsubscribe();
  }

  return {
    ...capability,
    configured: Boolean(publicKey),
    publicKey,
    permission: capability.supported ? window.Notification.permission : "unsupported",
    enabled: false,
  };
}

export async function detachCurrentWebPushSubscription() {
  const capability = getCapability();
  if (!capability.supported) return;
  const subscription = await getCurrentSubscription();
  await removeCurrentServerSubscription(subscription);
}
