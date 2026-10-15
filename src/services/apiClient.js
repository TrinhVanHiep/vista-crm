import axios from 'axios';
import { getCookie, removeCookie } from '../auth/cookie';

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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeCookie('vista_token');
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  },
);

export default apiClient;
