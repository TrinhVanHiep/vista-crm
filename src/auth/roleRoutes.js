import { ROUTE_PERMISSIONS } from './permissions';

const ROUTE_ORDER = [
  { path: '/', allowedRoles: ROUTE_PERMISSIONS.dashboard },
  { path: '/courses', allowedRoles: ROUTE_PERMISSIONS.courses },
  { path: '/calendar-detail', allowedRoles: ROUTE_PERMISSIONS.calendar },
  { path: '/monthly-scorecards', allowedRoles: ROUTE_PERMISSIONS.monthlyScorecards },
  { path: '/report-card', allowedRoles: ROUTE_PERMISSIONS.reportCard },
  { path: '/monthly-reports', allowedRoles: ROUTE_PERMISSIONS.monthlyReports },
  { path: '/truyen-thong', allowedRoles: ROUTE_PERMISSIONS.media },
  { path: '/hoc-phi', allowedRoles: ROUTE_PERMISSIONS.tuition },
  { path: '/kho-tai-lieu', allowedRoles: ROUTE_PERMISSIONS.documents },
  { path: '/cai-dat', allowedRoles: ROUTE_PERMISSIONS.settings },
  { path: '/students', allowedRoles: ROUTE_PERMISSIONS.students },
  { path: '/students/:studentId', allowedRoles: ROUTE_PERMISSIONS.employeeProfile },
  { path: '/teachers', allowedRoles: ROUTE_PERMISSIONS.teachers },
  { path: '/teachers/:teacherId', allowedRoles: ROUTE_PERMISSIONS.employeeProfile },
  { path: '/attendance', allowedRoles: ROUTE_PERMISSIONS.attendance },
  { path: '/employee-profile', allowedRoles: ROUTE_PERMISSIONS.employeeProfile },
  { path: '/finance', allowedRoles: ROUTE_PERMISSIONS.finance },
  { path: '/accounts/create', allowedRoles: ROUTE_PERMISSIONS.accounts },
  { path: '/documents', allowedRoles: ROUTE_PERMISSIONS.documents },
  { path: '/settings', allowedRoles: ROUTE_PERMISSIONS.settings },
];

const ROLE_ALIASES = {
  superadmin: ['superadmin', 'super admin', 'super-admin'],
  admin: ['admin', 'administrator', 'quan tri', 'quantri', 'quan ly', 'quanly'],
  center_manager: ['center_manager', 'center manager', 'centermanager', 'quan ly co so', 'quanly co so', 'ql co so', 'quan_ly_co_so', 'co so'],
  training_manager: ['training_manager', 'training manager', 'trainingmanager', 'academic manager', 'quan ly dao tao', 'quanly dao tao', 'ql dao tao', 'quan_ly_dao_tao', 'dao tao'],
  teacher: ['teacher', 'giang vien', 'gv', 'giao vien'],
  staff: ['staff', 'employee', 'academic staff', 'academic_staff', 'nhan vien', 'nhanvien', 'nhan_vien', 'dieu phoi', 'dieuphoi', 'coordinator'],
  student: ['student', 'hoc vien', 'hv'],
};

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

export function normalizeRole(role) {
  if (!role) return null;
  const raw = typeof role === 'string' ? role : role?.name ?? role?.display_name;
  if (!raw) return null;
  const normalized = normalizeText(raw);
  const alias = Object.entries(ROLE_ALIASES).find(([, items]) =>
    items.includes(normalized),
  );
  return alias ? alias[0] : normalized;
}

export function isRoleAllowed(allowedRoles, role) {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return false;
  if (normalizedRole === 'superadmin') return true;
  const list = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return list.includes(normalizedRole);
}

const ROLE_DEFAULT_ROUTES = {
  superadmin: '/',
  admin: '/',
  center_manager: '/report-card',
  training_manager: '/report-card',
  teacher: '/calendar-detail',
  staff: '/calendar-detail',
  student: '/monthly-scorecards',
};

export function getDefaultRouteForRole(role) {
  const normalizedRole = normalizeRole(role);
  return ROLE_DEFAULT_ROUTES[normalizedRole] || '/unauthorized';
}

function matchRoutePattern(pattern, path) {
  const patternParts = String(pattern || '').split('/').filter(Boolean);
  const pathParts = String(path || '').split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return false;
  return patternParts.every((part, index) => part.startsWith(':') || part === pathParts[index]);
}

export function isRouteAllowedForRole(path, role) {
  const match = ROUTE_ORDER.find((item) => matchRoutePattern(item.path, path));
  if (!match) return false;
  return isRoleAllowed(match.allowedRoles, role);
}

export function resolveRouteForRole(role, path) {
  if (path && isRouteAllowedForRole(path, role)) {
    return path;
  }
  return getDefaultRouteForRole(role);
}
