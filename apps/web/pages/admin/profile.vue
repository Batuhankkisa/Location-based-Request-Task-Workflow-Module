<script setup lang="ts">
import { Role } from '@lbrtw/shared';

definePageMeta({
  middleware: 'admin-auth',
  roles: [Role.ADMIN, Role.SUPERVISOR, Role.STAFF]
});

const auth = useAuth();
const user = computed(() => auth.user.value);

const roleLabels: Record<Role, string> = {
  [Role.ADMIN]: 'Admin',
  [Role.SUPERVISOR]: 'Supervisor',
  [Role.STAFF]: 'Staff'
};

const roleLabel = computed(() => (user.value ? roleLabels[user.value.role] : '-'));
const organizationLabel = computed(() => user.value?.organization?.name ?? 'Global admin');
const statusLabel = computed(() => (user.value?.isActive ? 'Aktif' : 'Pasif'));

function getInitial(value?: string) {
  return value?.trim().slice(0, 1).toLocaleUpperCase('tr-TR') || 'K';
}

async function logout() {
  await auth.logout('/login');
}
</script>

<template>
  <section class="section admin-profile-page">
    <header class="admin-profile-header">
      <div>
        <p class="eyebrow">Profil</p>
        <h1>Hesap Bilgileri</h1>
      </div>

      <button class="button danger" type="button" @click="logout">Çıkış Yap</button>
    </header>

    <div v-if="user" class="admin-profile-grid">
      <article class="admin-profile-summary">
        <span class="admin-profile-avatar">{{ getInitial(user.fullName) }}</span>
        <div>
          <strong>{{ user.fullName }}</strong>
          <small>{{ user.email }}</small>
        </div>
      </article>

      <article class="admin-profile-panel">
        <div class="admin-profile-row">
          <span>Ad soyad</span>
          <strong>{{ user.fullName }}</strong>
        </div>
        <div class="admin-profile-row">
          <span>E-posta</span>
          <strong>{{ user.email }}</strong>
        </div>
        <div class="admin-profile-row">
          <span>Rol</span>
          <strong>{{ roleLabel }}</strong>
        </div>
        <div class="admin-profile-row">
          <span>Kurum</span>
          <strong>{{ organizationLabel }}</strong>
        </div>
        <div class="admin-profile-row">
          <span>Durum</span>
          <strong>{{ statusLabel }}</strong>
        </div>
      </article>
    </div>

    <p v-else class="muted">Profil bilgisi yükleniyor.</p>
  </section>
</template>
