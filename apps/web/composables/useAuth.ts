import type { OrganizationType, Role } from '@lbrtw/shared';

export interface AuthOrganization {
  id: string;
  name: string;
  code: string;
  type: OrganizationType;
  isActive: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  organizationId: string | null;
  organization: AuthOrganization | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LoginPayload {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  user: AuthUser;
}

export function useAuth() {
  const accessToken = useCookie<string | null>('lbrtw_access_token', {
    default: () => null,
    sameSite: 'lax'
  });
  const user = useState<AuthUser | null>('auth:user', () => null);
  const initialized = useState<boolean>('auth:initialized', () => false);

  async function restoreSession(force = false) {
    if (!force && initialized.value) {
      return user.value;
    }

    if (!accessToken.value) {
      clearSession();
      initialized.value = true;
      return null;
    }

    try {
      const response = await useApiFetch<ApiResponse<AuthUser>>('/auth/me');
      user.value = response.data;
      return user.value;
    } catch {
      clearSession();
      return null;
    } finally {
      initialized.value = true;
    }
  }

  async function login(credentials: { email: string; password: string }) {
    const response = await useApiFetch<ApiResponse<LoginPayload>>('/auth/login', {
      method: 'POST',
      body: credentials
    });

    accessToken.value = response.data.accessToken;
    user.value = response.data.user;
    initialized.value = true;

    return response.data;
  }

  function clearSession() {
    accessToken.value = null;
    user.value = null;
    initialized.value = false;
  }

  async function logout(redirectTo = '/login') {
    clearSession();

    if (redirectTo) {
      await navigateTo(redirectTo);
    }
  }

  function hasRole(...roles: Role[]) {
    return Boolean(user.value && roles.includes(user.value.role));
  }

  return {
    accessToken,
    user,
    initialized,
    login,
    logout,
    clearSession,
    restoreSession,
    hasRole
  };
}
