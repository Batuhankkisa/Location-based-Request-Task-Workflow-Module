import type { Role } from '@lbrtw/shared';

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuth();
  const user = await auth.restoreSession();

  if (!user) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }

  const allowedRoles = (to.meta.roles as Role[] | undefined) ?? [];
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return navigateTo('/admin/tasks');
  }
});
