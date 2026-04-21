<script setup lang="ts">
import { Role } from '@lbrtw/shared';

const auth = useAuth();
await auth.restoreSession();

const user = computed(() => auth.user.value);
const canViewOperations = computed(() => Boolean(user.value));
const canViewQrAdmin = computed(() => auth.hasRole(Role.ADMIN, Role.SUPERVISOR));

async function logout() {
  await auth.logout('/login');
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <NuxtLink class="brand" to="/">Location Workflow</NuxtLink>

      <div class="topbar-actions">
        <nav class="nav-links" aria-label="Ana gezinme">
          <NuxtLink to="/q/room-401-demo-token">401 QR</NuxtLink>
          <NuxtLink v-if="canViewOperations" to="/admin/tasks">Tasklar</NuxtLink>
          <NuxtLink v-if="canViewQrAdmin" to="/admin/qrs">QRlar</NuxtLink>
          <NuxtLink v-if="canViewQrAdmin" to="/admin/locations">Lokasyonlar</NuxtLink>
          <NuxtLink v-if="!user" to="/login">Login</NuxtLink>
        </nav>

        <div v-if="user" class="auth-meta">
          <div>
            <strong>{{ user.fullName }}</strong>
            <span class="auth-chip">{{ user.role }}</span>
          </div>
          <button class="button small" type="button" @click="logout">Logout</button>
        </div>
      </div>
    </header>

    <main class="page">
      <NuxtPage />
    </main>
  </div>
</template>
