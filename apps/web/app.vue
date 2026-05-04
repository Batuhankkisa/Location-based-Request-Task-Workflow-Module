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
const adminSearchTerm = ref('');
const adminSearchFocused = ref(false);
const adminSearchInput = ref<HTMLInputElement | null>(null);

const adminNavItems = computed(() =>
  [
    canViewTasks.value
      ? {
          to: '/admin/tasks',
          label: 'Açık Talepler',
          meta: 'Requests',
          keywords: ['gorev', 'talep', 'task', 'request', 'operasyon', 'bildirim']
        }
      : null,
    canViewQrAdmin.value
      ? {
          to: '/admin/qrs',
          label: 'QR Envanteri',
          meta: 'QR Inventory',
          keywords: ['qr', 'envanter', 'kod', 'token', 'oda', 'link']
        }
      : null,
    canViewQrAdmin.value
      ? {
          to: '/admin/locations',
          label: 'Lokasyon Ağacı',
          meta: 'Location Trees',
          keywords: ['lokasyon', 'agac', 'tesis', 'kat', 'oda', 'alan', 'konum']
        }
      : null,
    canManageOrganizations.value
      ? {
          to: '/admin/organizations',
          label: 'Kurumlar',
          meta: 'Organizations',
          keywords: ['kurum', 'organizasyon', 'organization', 'firma', 'musteri']
        }
      : null,
    canManageUsers.value
      ? {
          to: '/admin/users',
          label: 'Kullanıcılar',
          meta: 'Users',
          keywords: ['kullanici', 'user', 'rol', 'yetki', 'admin', 'supervisor']
        }
      : null
  ].filter((item): item is { to: string; label: string; meta: string; keywords: string[] } => Boolean(item))
);

const adminSearchMatches = computed(() => {
  const query = normalizeAdminSearch(adminSearchTerm.value);
  const items = adminNavItems.value;

  if (!query) {
    return items.slice(0, 3);
  }

  return items
    .filter((item) =>
      [item.label, item.meta, ...item.keywords].some((value) => normalizeAdminSearch(value).includes(query))
    )
    .slice(0, 4);
});

const showAdminSearchMatches = computed(
  () => adminSearchFocused.value && adminSearchMatches.value.length > 0
);

const adminTopbarLinks = computed(() =>
  [
    canViewTasks.value
      ? {
          to: '/admin/tasks',
          label: 'Bildirimler'
        }
      : null,
    canManageOrganizations.value
      ? {
          to: '/admin/organizations',
          label: 'Ayarlar'
        }
      : canViewQrAdmin.value
        ? {
            to: '/admin/qrs',
            label: 'Ayarlar'
          }
        : null
  ].filter((item): item is { to: string; label: string } => Boolean(item))
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

function normalizeAdminSearch(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

async function navigateFromAdminSearch(item = adminSearchMatches.value[0]) {
  if (!item) {
    return;
  }

  adminSearchTerm.value = '';
  adminSearchFocused.value = false;
  await navigateTo(item.to);
}

function focusAdminSearch() {
  adminSearchFocused.value = true;
  adminSearchInput.value?.focus();
}
</script>

<template>
  <div :class="['app-shell', { 'admin-shell': isAdminRoute, 'public-shell': !isAdminRoute }]">
    <template v-if="isAdminRoute">
      <aside class="admin-sidebar">
        <div class="admin-brand-block">
          <NuxtLink class="admin-brand-link" to="/">
            <img class="admin-brand-logo" src="/qr-logo.svg" alt="" aria-hidden="true" />
            <span>
              <strong>QR Talep</strong>
              <small>WORKFLOW</small>
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
          <NuxtLink class="admin-ghost-link" to="/admin/tasks">Görev Akışı</NuxtLink>
          <NuxtLink v-if="canViewQrAdmin" class="admin-ghost-link" to="/admin/qrs">QR Linkleri</NuxtLink>

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
          <div class="admin-search-wrapper">
            <form class="admin-search-shell" role="search" @submit.prevent="navigateFromAdminSearch()">
              <span class="admin-search-icon" aria-hidden="true"></span>
              <input
                ref="adminSearchInput"
                v-model="adminSearchTerm"
                type="search"
                placeholder="Sayfalarda ara..."
                autocomplete="off"
                @focus="adminSearchFocused = true"
                @blur="adminSearchFocused = false"
              />
            </form>

            <div v-if="showAdminSearchMatches" class="admin-search-results">
              <button
                v-for="item in adminSearchMatches"
                :key="item.to"
                class="admin-search-result"
                type="button"
                @mousedown.prevent="navigateFromAdminSearch(item)"
              >
                <strong>{{ item.meta }}</strong>
                <span>{{ item.label }}</span>
              </button>
            </div>
          </div>

          <div class="admin-topbar-meta">
            <NuxtLink
              v-for="item in adminTopbarLinks"
              :key="item.label"
              class="admin-icon-button"
              :to="item.to"
              :aria-label="item.label"
              :title="item.label"
            />
            <button class="admin-icon-button" type="button" aria-label="Kısayollar" title="Kısayollar" @click="focusAdminSearch"></button>

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
