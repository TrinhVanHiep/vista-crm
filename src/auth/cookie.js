const DEFAULT_MAX_AGE_DAYS = 7;

export function setCookie(name, value, days = DEFAULT_MAX_AGE_DAYS) {
  if (typeof document === 'undefined') return;
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

export function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  const target = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  return target ? target.split('=').slice(1).join('=') : null;
}

export function removeCookie(name) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}
