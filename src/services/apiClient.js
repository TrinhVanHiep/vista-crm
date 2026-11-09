import axios from 'axios';
import { getCookie, removeCookie, setCookie } from '../auth/cookie';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
});

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

// Unikey "Unicode tổ hợp" gửi dấu rời ("Đình" = D-gạch + i + dấu huyền): chuẩn hoá về
// dạng dựng sẵn (NFC) để dữ liệu lưu và tìm khớp nhau (15/10/2026).
const nfc = (v) => {
  if (typeof v === 'string') return v.normalize('NFC');
  if (Array.isArray(v)) return v.map(nfc);
  if (v && Object.getPrototypeOf(v) === Object.prototype) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, nfc(x)]));
  }
  return v;
};

apiClient.interceptors.request.use((config) => {
  if (config.params) config.params = nfc(config.params);
  if (config.data && Object.getPrototypeOf(config.data) === Object.prototype) config.data = nfc(config.data);
  const token = getCookie('vista_token');
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

// Tự gia hạn phiên (09/11/2026): access token sống 60 phút; trước đây hết hạn là bị đăng xuất giữa chừng
// (QLCS đang sửa lương thì văng ra). Gặp 401 → đổi refresh token lấy access mới (một lần cho mọi request
// cùng lúc) rồi gửi lại request đó. Refresh hỏng / hết hạn (1 ngày không dùng) → mới đăng xuất.
let dangGiaHan = null;

function giaHan() {
  const refresh = getCookie('vista_refresh');
  if (!refresh) return Promise.reject(new Error('no refresh'));
  if (!dangGiaHan) {
    dangGiaHan = axios
      .post(`${apiClient.defaults.baseURL}/users/refresh/`, { refresh }, { timeout: 15000 })
      .then(({ data }) => {
        setCookie('vista_token', data.access);
        if (data.refresh) setCookie('vista_refresh', data.refresh);
        return data.access;
      })
      .finally(() => { dangGiaHan = null; });
  }
  return dangGiaHan;
}

const KHONG_GIA_HAN = ['/users/login/', '/users/refresh/', '/users/register/', '/lms/ph/dang-nhap/', '/lms/ph/otp/'];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const cfg = error.config;
    if (error.response?.status === 401) {
      if (cfg && !cfg._daGiaHan && !KHONG_GIA_HAN.some((u) => (cfg.url || '').includes(u)) && getCookie('vista_refresh')) {
        try {
          const access = await giaHan();
          cfg._daGiaHan = true;
          cfg.headers = { ...cfg.headers, Authorization: `Bearer ${access}` };
          return apiClient(cfg);
        } catch {
          // refresh hết hạn / bị từ chối → đăng xuất như cũ
        }
      }
      removeCookie('vista_token');
      removeCookie('vista_refresh');
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  },
);

export default apiClient;
