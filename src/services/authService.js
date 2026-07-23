import apiClient from './apiClient';
import { normalizeRole } from '../auth/roleRoutes';

const ROLE_ID_MAP = {
  superadmin: 1,
  admin: 2,
  teacher: 3,
  student: 4,
  staff: 5,
};

const normalizeUser = (profile) => {
  if (!profile) return null;
  const roleName = normalizeRole(profile.role ?? profile.role?.name ?? profile.role?.display_name);
  const fullName = [profile.last_name, profile.first_name].filter(Boolean).join(' ').trim();
  return {
    id: profile.id,
    name: fullName || profile.username || profile.email,
    email: profile.email,
    role: roleName,
    avatar: profile.image ?? null,
    teacher_id: profile.teacher_id ?? null,
    student_id: profile.student_id ?? null,
  };
};

const splitName = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const firstName = parts.pop() || '';
  return { firstName, lastName: parts.join(' ') };
};

export async function login(credentials) {
  if (!import.meta.env.VITE_API_BASE_URL) {
    return {
      token: `demo-token-${Date.now()}`,
      user: {
        id: 'demo-user',
        name: 'Quản trị demo',
        email: credentials.email ?? 'demo@vista.dev',
        role: 'admin',
      },
    };
  }

  const { data } = await apiClient.post('/users/login/', {
    username: credentials.email,
    password: credentials.password,
  });

  const accessToken = data.access ?? data.token;
  if (!accessToken) {
    throw new Error('Missing access token from login response.');
  }

  const profileResponse = await apiClient.get('/users/profile/', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return {
    token: accessToken,
    user: normalizeUser(profileResponse.data),
    refreshToken: data.refresh,
  };
}

export async function register(payload) {
  if (!import.meta.env.VITE_API_BASE_URL) {
    return {
      token: `demo-token-${Date.now()}`,
      user: {
        id: `demo-${Date.now()}`,
        name: payload.name ?? 'Học viên demo',
        email: payload.email ?? 'student@vista.dev',
        role: 'student',
      },
    };
  }

  const { firstName, lastName } = splitName(payload.name);
  const { data } = await apiClient.post('/users/register/', {
    first_name: firstName,
    last_name: lastName,
    email: payload.email,
    password: payload.password,
    confirm_password: payload.confirmPassword,
    role: payload.role ?? 'student',
  });

  const accessToken = data.access ?? data.token;
  if (!accessToken) {
    throw new Error('Missing access token from register response.');
  }

  if (data.user) {
    return {
      token: accessToken,
      user: normalizeUser(data.user),
      refreshToken: data.refresh,
    };
  }

  const profileResponse = await apiClient.get('/users/profile/', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return {
    token: accessToken,
    user: normalizeUser(profileResponse.data),
    refreshToken: data.refresh,
  };
}

export async function createAccount(payload) {
  if (!import.meta.env.VITE_API_BASE_URL) {
    return {
      id: `demo-${Date.now()}`,
      ...payload,
    };
  }
  const { firstName, lastName } = splitName(payload.name);
  const roleId = ROLE_ID_MAP[payload.role] ?? payload.roleId;
  const { data } = await apiClient.post('/users/users/', {
    username: payload.email,
    email: payload.email,
    first_name: firstName,
    last_name: lastName,
    password: payload.password,
    role_id: roleId,
  });
  return data;
}
