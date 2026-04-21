<script setup lang="ts">
import { Role } from '@lbrtw/shared';

const auth = useAuth();
const route = useRoute();

await auth.restoreSession();

const user = computed(() => auth.user.value);
const isAdminRoute = computed(() => route.path.startsWith('/admin'));
const canViewTasks = computed(() => Boolean(user.value));
const canViewQrAdmin = computed(() => auth.hasRole(Role.ADMIN, Role.SUPERVISOR));

const adminNavItems = computed(() =>
  [
    canViewTasks.value
      ? {
          to: '/admin/tasks',
          label: 'Acik Talepler',
          meta: 'Operasyon akisi'
        }
      : null,
    canViewQrAdmin.value
      ? {
          to: '/admin/qrs',
          label: 'QR Envanteri',
          meta: 'QR ve lokasyon'
        }
      : null,
    canViewQrAdmin.value
      ? {
          to: '/admin/locations',
          label: 'Lokasyon Agaci',
          meta: 'Kat ve oda yapisi'
        }
      : null
  ].filter((item): item is { to: string; label: string; meta: string } => Boolean(item))
);

const pageMeta = computed(() => {
  if (route.path.startsWith('/admin/qrs')) {
    return {
      kicker: 'Envanter',
      title: 'QR Kayitlari'
    };
  }

  if (route.path.startsWith('/admin/locations')) {
    return {
      kicker: 'Lokasyon',
      title: 'Tesis Yapisi'
    };
  }

  if (route.path.startsWith('/admin/tasks')) {
    return {
      kicker: 'Operasyon',
      title: 'Gorev Akisi'
    };
  }

  if (route.path.startsWith('/login')) {
    return {
      kicker: 'Personel',
      title: 'Giris'
    };
  }

  if (route.path.startsWith('/q/')) {
    return {
      kicker: 'QR Talep',
      title: 'Misafir Akisi'
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
          <NuxtLink class="admin-brand-link" to="/">QRTALEP</NuxtLink>
          <p>Operasyon Yonetimi</p>
        </div>

        <nav class="admin-nav" aria-label="Admin menu">
          <NuxtLink
            v-for="item in adminNavItems"
            :key="item.to"
            :to="item.to"
            class="admin-nav-link"
            active-class="is-active"
          >
            <strong>{{ item.label }}</strong>
            <span>{{ item.meta }}</span>
          </NuxtLink>
        </nav>

        <div class="admin-sidebar-footer">
          <NuxtLink class="admin-ghost-link" to="/q/room-401-demo-token">Public QR ekrani</NuxtLink>

          <div v-if="user" class="admin-user-card">
            <div>
              <strong>{{ user.fullName }}</strong>
              <span>{{ user.role }}</span>
            </div>
            <button class="button small" type="button" @click="logout">Cikis</button>
          </div>
        </div>
      </aside>

      <div class="admin-main">
        <header class="admin-topbar">
          <label class="admin-search-shell">
            <span class="admin-search-icon">/</span>
            <input type="text" placeholder="Envanterde ara..." disabled />
          </label>

          <div class="admin-topbar-meta">
            <div class="admin-page-meta">
              <span>{{ pageMeta.kicker }}</span>
              <strong>{{ pageMeta.title }}</strong>
            </div>

            <div v-if="user" class="admin-topbar-user">
              <div>
                <strong>{{ user.fullName }}</strong>
                <span>{{ user.email }}</span>
              </div>
              <span class="auth-chip">{{ user.role }}</span>
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
