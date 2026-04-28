<script setup lang="ts">
import { Role } from '@lbrtw/shared';

const auth = useAuth();
const route = useRoute();

await auth.restoreSession();

const user = computed(() => auth.user.value);
const isAdminRoute = computed(() => route.path.startsWith('/admin'));
const canViewTasks = computed(() => Boolean(user.value));
const canViewQrAdmin = computed(() => auth.hasRole(Role.ADMIN, Role.SUPERVISOR));
const canManageOrganizations = computed(() => auth.hasRole(Role.ADMIN));
const canManageUsers = computed(() => auth.hasRole(Role.ADMIN));

const adminNavItems = computed(() =>
  [
    canViewTasks.value
      ? {
          to: '/admin/tasks',
          label: 'Açık Talepler',
          meta: 'Requests'
        }
      : null,
    canViewQrAdmin.value
      ? {
          to: '/admin/qrs',
          label: 'QR Envanteri',
          meta: 'QR Inventory'
        }
      : null,
    canViewQrAdmin.value
      ? {
          to: '/admin/locations',
          label: 'Lokasyon Ağacı',
          meta: 'Location Trees'
        }
      : null,
    canManageOrganizations.value
      ? {
          to: '/admin/organizations',
          label: 'Kurumlar',
          meta: 'Organizations'
        }
      : null,
    canManageUsers.value
      ? {
          to: '/admin/users',
          label: 'Kullanıcılar',
          meta: 'Users'
        }
      : null
  ].filter((item): item is { to: string; label: string; meta: string } => Boolean(item))
);

const pageMeta = computed(() => {
  if (route.path.startsWith('/admin/qrs')) {
    return {
      kicker: 'Envanter',
      title: 'QR Kayıtları'
    };
  }

  if (route.path.startsWith('/admin/locations')) {
    return {
      kicker: 'Lokasyon',
      title: 'Tesis Yapısı'
    };
  }

  if (route.path.startsWith('/admin/organizations')) {
    return {
      kicker: 'Kurumlar',
      title: 'Multi-Organization'
    };
  }

  if (route.path.startsWith('/admin/users')) {
    return {
      kicker: 'Kullanıcılar',
      title: 'Rol ve Kurum'
    };
  }

  if (route.path.startsWith('/admin/tasks')) {
    return {
      kicker: 'Operasyon',
      title: 'Görev Akışı'
    };
  }

  if (route.path.startsWith('/login')) {
    return {
      kicker: 'Personel',
      title: 'Giriş'
    };
  }

  if (route.path.startsWith('/q/')) {
    return {
      kicker: 'QR Talep',
      title: 'Misafir Akışı'
    };
  }

  return {
    kicker: 'Platform',
    title: 'Location Workflow'
  };
});

async function logout() {
  await auth.logout('/login');
}
</script>

<template>
  <div :class="['app-shell', { 'admin-shell': isAdminRoute, 'public-shell': !isAdminRoute }]">
    <template v-if="isAdminRoute">
      <aside class="admin-sidebar">
        <div class="admin-brand-block">
          <NuxtLink class="admin-brand-link" to="/">
            <span class="admin-brand-mark">N</span>
            <span>
              <strong>Nexus Enterprise</strong>
              <small>OPS MANAGEMENT</small>
            </span>
          </NuxtLink>
        </div>

        <nav class="admin-nav" aria-label="Admin menu">
          <NuxtLink
            v-for="item in adminNavItems"
            :key="item.to"
            :to="item.to"
            class="admin-nav-link"
            active-class="is-active"
          >
            <span class="admin-nav-icon" aria-hidden="true"></span>
            <span class="admin-nav-text">
              <strong>{{ item.meta }}</strong>
              <small>{{ item.label }}</small>
            </span>
          </NuxtLink>
        </nav>

        <div class="admin-sidebar-footer">
          <NuxtLink class="admin-ghost-link" to="/q/room-401-demo-token">System Logs</NuxtLink>
          <span class="admin-ghost-link">Support</span>

          <div v-if="user" class="admin-user-card">
            <div>
              <strong>{{ user.fullName }}</strong>
              <span>{{ user.organization?.name ?? 'Global Admin' }} · {{ user.role }}</span>
            </div>
            <button class="button small" type="button" @click="logout">Çıkış</button>
          </div>
        </div>
      </aside>

      <div class="admin-main">
        <header class="admin-topbar">
          <label class="admin-search-shell">
            <span class="admin-search-icon" aria-hidden="true"></span>
            <input type="text" placeholder="Ara..." disabled />
          </label>

          <div class="admin-topbar-meta">
            <button class="admin-icon-button" type="button" aria-label="Bildirimler"></button>
            <button class="admin-icon-button" type="button" aria-label="Ayarlar"></button>
            <button class="admin-icon-button" type="button" aria-label="Kısayollar"></button>

            <div v-if="user" class="admin-topbar-user">
              <span class="admin-avatar">{{ user.fullName.slice(0, 1) }}</span>
            </div>
          </div>
        </header>

        <main class="admin-page">
          <NuxtPage />
        </main>
      </div>
    </template>

    <main v-else class="public-page">
      <NuxtPage />
    </main>
  </div>
</template>
