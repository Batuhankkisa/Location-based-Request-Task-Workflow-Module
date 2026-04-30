<script setup lang="ts">
import { OrganizationType, Role } from '@lbrtw/shared';

definePageMeta({
  middleware: 'admin-auth',
  roles: [Role.ADMIN]
});

interface OrganizationItem {
  id: string;
  name: string;
  code: string;
  type: OrganizationType;
  isActive: boolean;
  telegramEnabled: boolean;
  telegramChatId: string | null;
  telegramNotificationThreadId: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    users: number;
    locations: number;
  };
}

const form = reactive({
  name: '',
  code: '',
  type: OrganizationType.HOSPITAL,
  isActive: true
});
const submitting = ref(false);
const formError = ref('');
const formMessage = ref('');
const pageMessage = ref('');
const isCreateModalOpen = ref(false);
const editingOrganization = ref<OrganizationItem | null>(null);
const searchTerm = ref('');
const typeFilter = ref<'ALL' | OrganizationType>('ALL');
const statusFilter = ref<'ALL' | 'ACTIVE' | 'PASSIVE'>('ALL');
const telegramFilter = ref<'ALL' | 'ACTIVE' | 'PASSIVE'>('ALL');
const telegramForms = reactive<
  Record<
    string,
    {
      telegramEnabled: boolean;
      telegramChatId: string;
      telegramNotificationThreadId: string;
      submitting: boolean;
      error: string;
      message: string;
    }
  >
>({});

const typeOptions = Object.values(OrganizationType);
const isEditMode = computed(() => Boolean(editingOrganization.value));
const typeLabels: Record<OrganizationType, string> = {
  [OrganizationType.HOSPITAL]: 'Hastane',
  [OrganizationType.CLINIC]: 'Klinik',
  [OrganizationType.HOTEL]: 'Otel',
  [OrganizationType.RESTAURANT]: 'Restoran',
  [OrganizationType.GENERAL]: 'Genel'
};

const { data, pending, error, refresh } = await useAsyncData('organizations', () =>
  useApiFetch<ApiResponse<OrganizationItem[]>>('/organizations')
);

const organizations = computed(() => data.value?.data ?? []);
const filteredOrganizations = computed(() =>
  organizations.value.filter((organization) => {
    const matchesType = typeFilter.value === 'ALL' ? true : organization.type === typeFilter.value;
    const matchesStatus =
      statusFilter.value === 'ALL'
        ? true
        : statusFilter.value === 'ACTIVE'
          ? organization.isActive
          : !organization.isActive;
    const hasTelegram = organization.telegramEnabled && Boolean(organization.telegramChatId);
    const matchesTelegram =
      telegramFilter.value === 'ALL' ? true : telegramFilter.value === 'ACTIVE' ? hasTelegram : !hasTelegram;
    const matchesSearch = !searchTerm.value.trim()
      ? true
      : `${organization.name} ${organization.code} ${organization.type}`
          .toLocaleLowerCase('tr')
          .includes(searchTerm.value.trim().toLocaleLowerCase('tr'));

    return matchesType && matchesStatus && matchesTelegram && matchesSearch;
  })
);
const summaryCards = computed(() => [
  {
    label: 'Toplam kurum',
    value: organizations.value.length,
    detail: 'Platformdaki tenant sayisi',
    tone: 'blue'
  },
  {
    label: 'Aktif kurum',
    value: organizations.value.filter((organization) => organization.isActive).length,
    detail: 'Operasyona acik',
    tone: 'green'
  },
  {
    label: 'Kullanici',
    value: organizations.value.reduce((total, organization) => total + organization._count.users, 0),
    detail: 'Kurumlara bagli hesaplar',
    tone: 'violet'
  },
  {
    label: 'Telegram aktif',
    value: organizations.value.filter((organization) => organization.telegramEnabled && organization.telegramChatId)
      .length,
    detail: 'Bildirim kanali bagli',
    tone: 'amber'
  }
]);

watch(
  organizations,
  (items) => {
    const activeIds = new Set(items.map((organization) => organization.id));

    for (const organization of items) {
      const existing = telegramForms[organization.id];
      telegramForms[organization.id] = {
        telegramEnabled: organization.telegramEnabled,
        telegramChatId: organization.telegramChatId ?? '',
        telegramNotificationThreadId: organization.telegramNotificationThreadId ?? '',
        submitting: existing?.submitting ?? false,
        error: existing?.error ?? '',
        message: existing?.message ?? ''
      };
    }

    for (const id of Object.keys(telegramForms)) {
      if (!activeIds.has(id)) {
        delete telegramForms[id];
      }
    }
  },
  { immediate: true }
);

function openCreateModal() {
  pageMessage.value = '';
  formError.value = '';
  formMessage.value = '';
  editingOrganization.value = null;
  resetForm();
  isCreateModalOpen.value = true;
}

function openEditModal(organization: OrganizationItem) {
  pageMessage.value = '';
  formError.value = '';
  formMessage.value = '';
  editingOrganization.value = organization;
  form.name = organization.name;
  form.code = organization.code;
  form.type = organization.type;
  form.isActive = organization.isActive;
  isCreateModalOpen.value = true;
}

function closeCreateModal() {
  if (submitting.value) {
    return;
  }

  isCreateModalOpen.value = false;
  editingOrganization.value = null;
  formError.value = '';
  formMessage.value = '';
}

function resetForm() {
  form.name = '';
  form.code = '';
  form.type = OrganizationType.HOSPITAL;
  form.isActive = true;
}

async function submit() {
  formError.value = '';
  formMessage.value = '';
  pageMessage.value = '';
  submitting.value = true;

  try {
    await useApiFetch<ApiResponse<OrganizationItem>>(
      isEditMode.value ? `/organizations/${editingOrganization.value?.id}` : '/organizations',
      {
      method: isEditMode.value ? 'PATCH' : 'POST',
      body: {
        name: form.name,
        code: form.code,
        type: form.type,
        isActive: form.isActive
      }
    });

    const wasEditMode = isEditMode.value;
    resetForm();
    isCreateModalOpen.value = false;
    editingOrganization.value = null;
    pageMessage.value = wasEditMode ? 'Kurum guncellendi.' : 'Kurum olusturuldu.';
    await refresh();
  } catch (requestError) {
    formError.value = getApiErrorMessage(
      requestError,
      isEditMode.value ? 'Kurum guncellenemedi.' : 'Kurum olusturulamadi.'
    );
  } finally {
    submitting.value = false;
  }
}

async function saveTelegramSettings(organization: OrganizationItem) {
  const state = telegramForms[organization.id];
  if (!state) {
    return;
  }

  state.error = '';
  state.message = '';
  state.submitting = true;

  try {
    await useApiFetch<ApiResponse<OrganizationItem>>(`/organizations/${organization.id}`, {
      method: 'PATCH',
      body: {
        telegramEnabled: state.telegramEnabled,
        telegramChatId: state.telegramChatId,
        telegramNotificationThreadId: state.telegramNotificationThreadId
      }
    });

    await refresh();
    const nextState = telegramForms[organization.id] ?? state;
    nextState.message = 'Telegram ayarlari kaydedildi.';
  } catch (requestError) {
    state.error = getApiErrorMessage(requestError, 'Telegram ayarlari kaydedilemedi.');
  } finally {
    const nextState = telegramForms[organization.id] ?? state;
    nextState.submitting = false;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

function getTypeLabel(type: OrganizationType) {
  return typeLabels[type] ?? type;
}

function getTypeInitial(type: OrganizationType) {
  return getTypeLabel(type).slice(0, 1).toLocaleUpperCase('tr');
}
</script>

<template>
  <section class="section users-azure-page organizations-azure-page">
    <header class="users-azure-header organizations-azure-header">
      <div class="users-title-block">
        <p class="eyebrow">Azure Directory</p>
        <h1>Organizasyon Yonetimi</h1>
        <p>Kurum portfoyu, bildirim kanallari ve operasyon baglantilari.</p>
      </div>

      <div class="users-header-actions">
        <button class="button primary users-create-button" type="button" @click="openCreateModal">
          <span class="users-plus-icon" aria-hidden="true"></span>
          Yeni kurum
        </button>
        <button class="button users-refresh-button" type="button" @click="refresh">Yenile</button>
      </div>
    </header>

    <p v-if="pageMessage" class="success-text users-page-message">{{ pageMessage }}</p>

    <div class="users-stat-grid organizations-stat-grid">
      <article
        v-for="card in summaryCards"
        :key="card.label"
        class="users-stat-card"
        :class="`tone-${card.tone}`"
      >
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
        <small>{{ card.detail }}</small>
      </article>
    </div>

    <section class="users-directory-panel organizations-directory-panel">
      <div class="users-directory-toolbar">
        <label class="users-search-field">
          <span aria-hidden="true"></span>
          <input v-model="searchTerm" type="text" placeholder="Kurum adi, kod veya tur ara" />
        </label>

        <div class="users-toolbar-controls organizations-toolbar-controls">
          <label class="users-filter-card compact">
            <span>Tur</span>
            <select v-model="typeFilter">
              <option value="ALL">Tum turler</option>
              <option v-for="type in typeOptions" :key="type" :value="type">{{ getTypeLabel(type) }}</option>
            </select>
          </label>

          <label class="users-filter-card compact">
            <span>Durum</span>
            <select v-model="statusFilter">
              <option value="ALL">Tum durumlar</option>
              <option value="ACTIVE">Aktif</option>
              <option value="PASSIVE">Pasif</option>
            </select>
          </label>

          <label class="users-filter-card compact">
            <span>Telegram</span>
            <select v-model="telegramFilter">
              <option value="ALL">Tum kanallar</option>
              <option value="ACTIVE">Aktif</option>
              <option value="PASSIVE">Kapali</option>
            </select>
          </label>
        </div>
      </div>

      <div class="users-directory-head">
        <div>
          <p class="eyebrow">Kurumlar</p>
          <h2>Kurum listesi</h2>
        </div>
        <span class="users-count-pill">{{ filteredOrganizations.length }} kayit</span>
      </div>

      <div v-if="pending" class="users-empty-state">
        <p>Kurumlar yukleniyor...</p>
      </div>

      <div v-else-if="error" class="users-empty-state error-panel">
        <p>Kurumlar alinamadi.</p>
      </div>

      <div v-else class="users-table-wrap">
        <table class="users-azure-table organizations-azure-table">
          <thead>
            <tr>
              <th>Kurum</th>
              <th>Tur</th>
              <th>Durum</th>
              <th>Telegram</th>
              <th>Kullanici</th>
              <th>Lokasyon</th>
              <th>Olusturulma</th>
              <th>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="organization in filteredOrganizations" :key="organization.id">
              <td>
                <div class="users-person-cell">
                  <span
                    class="users-avatar organizations-avatar"
                    :class="`organizations-avatar--${organization.type.toLowerCase()}`"
                  >
                    {{ getTypeInitial(organization.type) }}
                  </span>
                  <span>
                    <NuxtLink class="organization-link" :to="`/admin/locations?organizationId=${organization.id}`">
                      <strong>{{ organization.name }}</strong>
                    </NuxtLink>
                    <small>{{ organization.code }}</small>
                  </span>
                </div>
              </td>
              <td>
                <span class="users-role-pill organizations-type-pill">{{ getTypeLabel(organization.type) }}</span>
              </td>
              <td>
                <span class="users-status-pill" :class="{ active: organization.isActive, passive: !organization.isActive }">
                  <span aria-hidden="true"></span>
                  {{ organization.isActive ? 'Aktif' : 'Pasif' }}
                </span>
              </td>
              <td>
                <span
                  class="users-status-pill"
                  :class="{
                    active: organization.telegramEnabled && organization.telegramChatId,
                    passive: !organization.telegramEnabled || !organization.telegramChatId
                  }"
                >
                  <span aria-hidden="true"></span>
                  {{ organization.telegramEnabled && organization.telegramChatId ? 'Aktif' : 'Kapali' }}
                </span>
              </td>
              <td>{{ organization._count.users }}</td>
              <td>{{ organization._count.locations }}</td>
              <td>{{ formatDate(organization.createdAt) }}</td>
              <td>
                <div class="organizations-action-row">
                  <NuxtLink
                    class="button small organizations-action-button action-users"
                    :to="`/admin/users?organizationId=${organization.id}`"
                  >
                    Kullanicilar
                  </NuxtLink>
                  <NuxtLink
                    class="button small organizations-action-button action-tasks"
                    :to="`/admin/tasks?organizationId=${organization.id}`"
                  >
                    Tasklar
                  </NuxtLink>
                  <NuxtLink
                    class="button small organizations-action-button action-qr"
                    :to="`/admin/qrs?organizationId=${organization.id}`"
                  >
                    QR
                  </NuxtLink>
                  <NuxtLink
                    class="button small organizations-action-button action-locations"
                    :to="`/admin/locations?organizationId=${organization.id}`"
                  >
                    Lokasyon
                  </NuxtLink>
                  <button
                    class="button small organizations-action-button"
                    type="button"
                    @click="openEditModal(organization)"
                  >
                    Duzenle
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="filteredOrganizations.length === 0">
              <td colspan="8">Secili filtrelerde kurum yok.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="organizations-telegram-panel">
      <div class="organizations-telegram-head">
        <div>
          <p class="eyebrow">Telegram</p>
          <h2>Kurum bildirim ayarlari</h2>
          <p>Yeni QR talepleri icin kurum bazli Telegram grup chat ID ve topic ID degerlerini yonet.</p>
        </div>
      </div>

      <div v-if="pending" class="users-empty-state">
        <p>Telegram ayarlari yukleniyor...</p>
      </div>

      <div v-else-if="error" class="users-empty-state error-panel">
        <p>Telegram ayarlari alinamadi.</p>
      </div>

      <div v-else class="organizations-telegram-grid">
        <article
          v-for="organization in organizations"
          :key="organization.id"
          class="organizations-telegram-card"
        >
          <div class="organizations-telegram-card-head">
            <div class="users-stack-cell">
              <strong>{{ organization.name }}</strong>
              <small>{{ organization.code }}</small>
            </div>
            <span
              class="users-status-pill"
              :class="{
                active: organization.telegramEnabled && organization.telegramChatId,
                passive: !organization.telegramEnabled || !organization.telegramChatId
              }"
            >
              <span aria-hidden="true"></span>
              {{ organization.telegramEnabled && organization.telegramChatId ? 'Telegram aktif' : 'Kapali' }}
            </span>
          </div>

          <form
            v-if="telegramForms[organization.id]"
            class="organizations-telegram-form"
            @submit.prevent="saveTelegramSettings(organization)"
          >
            <label class="organizations-toggle-row">
              <input v-model="telegramForms[organization.id].telegramEnabled" type="checkbox" />
              <span>Telegram bildirimi gonder</span>
            </label>

            <div class="organizations-telegram-fields">
              <label>
                <span>Chat ID</span>
                <input
                  v-model="telegramForms[organization.id].telegramChatId"
                  type="text"
                  maxlength="120"
                  placeholder="-1001234567890"
                />
              </label>

              <label>
                <span>Topic ID</span>
                <input
                  v-model="telegramForms[organization.id].telegramNotificationThreadId"
                  type="text"
                  maxlength="80"
                  placeholder="Opsiyonel"
                />
              </label>
            </div>

            <div class="organizations-telegram-actions">
              <button
                class="button small organizations-telegram-save"
                type="submit"
                :disabled="telegramForms[organization.id].submitting"
              >
                {{ telegramForms[organization.id].submitting ? 'Kaydediliyor...' : 'Kaydet' }}
              </button>
            </div>

            <p v-if="telegramForms[organization.id].error" class="error-text">
              {{ telegramForms[organization.id].error }}
            </p>
            <p v-if="telegramForms[organization.id].message" class="success-text">
              {{ telegramForms[organization.id].message }}
            </p>
          </form>
        </article>

        <article v-if="organizations.length === 0" class="users-empty-state">
          <p>Telegram ayari icin once kurum olustur.</p>
        </article>
      </div>
    </section>

    <div v-if="isCreateModalOpen" class="users-modal-backdrop" role="presentation" @click.self="closeCreateModal">
      <section class="users-create-modal" role="dialog" aria-modal="true" aria-labelledby="createOrganizationTitle">
        <header class="users-modal-header">
          <div>
            <p class="eyebrow">{{ isEditMode ? 'Kurum duzenle' : 'Yeni kurum' }}</p>
            <h2 id="createOrganizationTitle">{{ isEditMode ? 'Kurum guncelle' : 'Kurum olustur' }}</h2>
          </div>
          <button class="users-modal-close" type="button" aria-label="Kapat" @click="closeCreateModal"></button>
        </header>

        <form class="users-modal-form" @submit.prevent="submit">
          <label>
            <span>Kurum adi</span>
            <input
              id="organizationName"
              v-model="form.name"
              type="text"
              maxlength="160"
              placeholder="Ozel Hastane C"
              required
            />
          </label>

          <div class="users-modal-grid">
            <label>
              <span>Kod</span>
              <input
                id="organizationCode"
                v-model="form.code"
                type="text"
                maxlength="80"
                placeholder="HOSPITAL_C"
                required
              />
            </label>

            <label>
              <span>Tur</span>
              <select id="organizationType" v-model="form.type">
                <option v-for="type in typeOptions" :key="type" :value="type">{{ getTypeLabel(type) }}</option>
              </select>
            </label>

            <label>
              <span>Durum</span>
              <select id="organizationStatus" v-model="form.isActive">
                <option :value="true">Aktif</option>
                <option :value="false">Pasif</option>
              </select>
            </label>
          </div>

          <p v-if="formError" class="error-text">{{ formError }}</p>
          <p v-if="formMessage" class="success-text">{{ formMessage }}</p>

          <div class="users-modal-actions">
            <button class="button small" type="button" :disabled="submitting" @click="closeCreateModal">Vazgec</button>
            <button class="button primary" type="submit" :disabled="submitting">
              {{ submitting ? 'Kaydediliyor...' : isEditMode ? 'Guncelle' : 'Olustur' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </section>
</template>
