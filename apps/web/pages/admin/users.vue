<script setup lang="ts">
import { OrganizationType, Role } from '@lbrtw/shared';

definePageMeta({
  middleware: 'admin-auth',
  roles: [Role.ADMIN]
});

interface OrganizationOption {
  id: string;
  name: string;
  code: string;
  type: OrganizationType;
  isActive: boolean;
}

interface UserItem {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  organizationId: string | null;
  organization: {
    id: string;
    name: string;
    code: string;
    type: OrganizationType;
    isActive: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
}

const route = useRoute();
const router = useRouter();
const searchTerm = ref('');
const roleFilter = ref<'ALL' | Role>('ALL');
const statusFilter = ref<'ALL' | 'ACTIVE' | 'PASSIVE'>('ALL');
const isCreateModalOpen = ref(false);
const editingUser = ref<UserItem | null>(null);
const pageMessage = ref('');

function readOrganizationIdFromRoute() {
  return typeof route.query.organizationId === 'string' ? route.query.organizationId : 'ALL';
}

const selectedOrganizationId = ref(readOrganizationIdFromRoute());
const form = reactive({
  fullName: '',
  email: '',
  password: '',
  role: Role.SUPERVISOR as Role,
  organizationId: '',
  isActive: true
});
const submitting = ref(false);
const formError = ref('');
const formMessage = ref('');
const isEditMode = computed(() => Boolean(editingUser.value));

const roleOptions = [Role.SUPERVISOR, Role.STAFF, Role.ADMIN];

const { data: organizationData } = await useAsyncData('user-organizations', () =>
  useApiFetch<ApiResponse<OrganizationOption[]>>('/organizations')
);

const organizationOptions = computed(() => organizationData.value?.data ?? []);
const activeOrganizationId = computed(() => (selectedOrganizationId.value === 'ALL' ? '' : selectedOrganizationId.value));

const { data, pending, error, refresh } = await useAsyncData(
  'users',
  () =>
    useApiFetch<ApiResponse<UserItem[]>>('/users', {
      query: activeOrganizationId.value
        ? {
            organizationId: activeOrganizationId.value
          }
        : undefined
    }),
  {
    watch: [selectedOrganizationId]
  }
);

const users = computed(() => data.value?.data ?? []);
const currentOrganizationLabel = computed(() =>
  selectedOrganizationId.value === 'ALL'
    ? 'Tüm kurumlar'
    : organizationOptions.value.find((item) => item.id === selectedOrganizationId.value)?.name ?? 'Seçili kurum'
);
const filteredUsers = computed(() =>
  users.value.filter((user) => {
    const matchesRole = roleFilter.value === 'ALL' ? true : user.role === roleFilter.value;
    const matchesStatus =
      statusFilter.value === 'ALL'
        ? true
        : statusFilter.value === 'ACTIVE'
          ? user.isActive
          : !user.isActive;
    const matchesSearch = !searchTerm.value.trim()
      ? true
      : `${user.fullName} ${user.email} ${user.organization?.name ?? ''} ${user.organization?.code ?? ''} ${user.role}`
          .toLocaleLowerCase('tr')
          .includes(searchTerm.value.trim().toLocaleLowerCase('tr'));

    return matchesRole && matchesStatus && matchesSearch;
  })
);
const summaryCards = computed(() => [
  {
    label: 'Toplam kullanıcı',
    value: users.value.length,
    detail: currentOrganizationLabel.value,
    tone: 'blue'
  },
  {
    label: 'Aktif hesap',
    value: users.value.filter((user) => user.isActive).length,
    detail: 'Oturum acabilir',
    tone: 'green'
  },
  {
    label: 'Supervisor',
    value: users.value.filter((user) => user.role === Role.SUPERVISOR).length,
    detail: 'Onay ve ekip yönetimi',
    tone: 'violet'
  },
  {
    label: 'Staff',
    value: users.value.filter((user) => user.role === Role.STAFF).length,
    detail: 'Operasyon personeli',
    tone: 'amber'
  }
]);

watch(
  () => route.query.organizationId,
  (organizationId) => {
    const nextOrganizationId = typeof organizationId === 'string' ? organizationId : 'ALL';
    if (selectedOrganizationId.value !== nextOrganizationId) {
      selectedOrganizationId.value = nextOrganizationId;
    }
  }
);

watch(selectedOrganizationId, (organizationId) => {
  const routeOrganizationId = readOrganizationIdFromRoute();
  if (routeOrganizationId === organizationId) {
    return;
  }

  const nextQuery = { ...route.query };
  if (organizationId === 'ALL') {
    delete nextQuery.organizationId;
  } else {
    nextQuery.organizationId = organizationId;
  }

  void router.replace({ query: nextQuery });
});

watch(
  [selectedOrganizationId, () => form.role, organizationOptions],
  () => {
    formError.value = '';
    formMessage.value = '';

    if (form.role === Role.ADMIN) {
      form.organizationId = '';
      return;
    }

    if (activeOrganizationId.value) {
      form.organizationId = activeOrganizationId.value;
      return;
    }

    if (!organizationOptions.value.some((item) => item.id === form.organizationId)) {
      form.organizationId = organizationOptions.value[0]?.id ?? '';
    }
  },
  { immediate: true }
);

function openCreateModal() {
  pageMessage.value = '';
  formError.value = '';
  formMessage.value = '';
  editingUser.value = null;
  resetForm();
  isCreateModalOpen.value = true;
}

function openEditModal(user: UserItem) {
  pageMessage.value = '';
  formError.value = '';
  formMessage.value = '';
  editingUser.value = user;
  form.fullName = user.fullName;
  form.email = user.email;
  form.password = '';
  form.role = user.role;
  form.organizationId = user.organizationId ?? '';
  form.isActive = user.isActive;
  isCreateModalOpen.value = true;
}

function closeCreateModal() {
  if (submitting.value) {
    return;
  }

  isCreateModalOpen.value = false;
  editingUser.value = null;
  formError.value = '';
  formMessage.value = '';
}

function resetForm() {
  form.fullName = '';
  form.email = '';
  form.password = '';
  form.role = Role.SUPERVISOR;
  form.organizationId = activeOrganizationId.value || organizationOptions.value[0]?.id || '';
  form.isActive = true;
}

async function submit() {
  formError.value = '';
  formMessage.value = '';
  pageMessage.value = '';

  if (form.role !== Role.ADMIN && !form.organizationId) {
    formError.value = 'Supervisor ve staff kullanıcılarını bir kuruma bağlamalısın.';
    return;
  }

  if (!isEditMode.value && !form.password.trim()) {
    formError.value = 'Yeni kullanıcı için şifre zorunlu.';
    return;
  }

  submitting.value = true;

  try {
    const body: Record<string, unknown> = {
      fullName: form.fullName,
      email: form.email,
      role: form.role,
      organizationId: form.role === Role.ADMIN ? (isEditMode.value ? null : undefined) : form.organizationId,
      isActive: form.isActive
    };

    if (form.password.trim()) {
      body.password = form.password;
    }

    await useApiFetch<ApiResponse<UserItem>>(isEditMode.value ? `/users/${editingUser.value?.id}` : '/users', {
      method: isEditMode.value ? 'PATCH' : 'POST',
      body
    });

    const wasEditMode = isEditMode.value;
    resetForm();
    isCreateModalOpen.value = false;
    editingUser.value = null;
    pageMessage.value = wasEditMode ? 'Kullanıcı güncellendi.' : 'Kullanıcı oluşturuldu.';
    await refresh();
  } catch (requestError) {
    formError.value = getApiErrorMessage(
      requestError,
      isEditMode.value ? 'Kullanıcı güncellenemedi.' : 'Kullanıcı oluşturulamadı.'
    );
  } finally {
    submitting.value = false;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

function getInitials(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toLocaleUpperCase('tr') ?? '').join('') || 'U';
}
</script>

<template>
  <section class="section users-azure-page">
    <header class="users-azure-header">
      <div class="users-title-block">
        <p class="eyebrow">Azure Directory</p>
        <h1>Kullanıcı Yönetimi</h1>
        <p>{{ currentOrganizationLabel }} kapsamında roller, durumlar ve kurum bağlantıları.</p>
      </div>

      <div class="users-header-actions">
        <button class="button primary users-create-button" type="button" @click="openCreateModal">
          <span class="users-plus-icon" aria-hidden="true"></span>
          Yeni kullanıcı
        </button>

        <label class="users-filter-card">
          <span>Kurum</span>
          <select v-model="selectedOrganizationId">
            <option value="ALL">Tüm kurumlar</option>
            <option v-for="organization in organizationOptions" :key="organization.id" :value="organization.id">
              {{ organization.name }}
            </option>
          </select>
        </label>
        <button class="button users-refresh-button" type="button" @click="refresh">Yenile</button>
      </div>
    </header>

    <p v-if="pageMessage" class="success-text users-page-message">{{ pageMessage }}</p>

    <div class="users-stat-grid">
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

    <section class="users-directory-panel">
      <div class="users-directory-toolbar">
        <label class="users-search-field">
          <span aria-hidden="true"></span>
          <input v-model="searchTerm" type="text" placeholder="Kullanıcı, e-posta veya kurum ara" />
        </label>

        <div class="users-toolbar-controls">
          <label class="users-filter-card compact">
            <span>Rol</span>
            <select v-model="roleFilter">
              <option value="ALL">Tüm roller</option>
              <option :value="Role.SUPERVISOR">SUPERVISOR</option>
              <option :value="Role.STAFF">STAFF</option>
              <option :value="Role.ADMIN">ADMIN</option>
            </select>
          </label>

          <label class="users-filter-card compact">
            <span>Durum</span>
            <select v-model="statusFilter">
              <option value="ALL">Tüm durumlar</option>
              <option value="ACTIVE">Aktif</option>
              <option value="PASSIVE">Pasif</option>
            </select>
          </label>
        </div>
      </div>

      <div class="users-directory-head">
        <div>
          <p class="eyebrow">Kullanıcılar</p>
          <h2>Hesap listesi</h2>
        </div>
        <span class="users-count-pill">{{ filteredUsers.length }} kayıt</span>
      </div>

      <div v-if="pending" class="users-empty-state">
        <p>Kullanıcılar yükleniyor...</p>
      </div>

      <div v-else-if="error" class="users-empty-state error-panel">
        <p>Kullanıcı listesi alınamadı.</p>
      </div>

      <div v-else class="users-table-wrap">
        <table class="users-azure-table">
          <thead>
            <tr>
              <th>Kullanıcı</th>
              <th>Rol</th>
              <th>Kurum</th>
              <th>Durum</th>
              <th>Oluşturulma</th>
              <th>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id">
              <td>
                <div class="users-person-cell">
                  <span class="users-avatar">{{ getInitials(user.fullName) }}</span>
                  <span>
                    <strong>{{ user.fullName }}</strong>
                    <small>{{ user.email }}</small>
                  </span>
                </div>
              </td>
              <td>
                <span class="users-role-pill">{{ user.role }}</span>
              </td>
              <td>
                <div class="users-stack-cell">
                  <strong>{{ user.organization?.name ?? 'Global Admin' }}</strong>
                  <small>{{ user.organization?.code ?? '-' }}</small>
                </div>
              </td>
              <td>
                <span class="users-status-pill" :class="{ active: user.isActive, passive: !user.isActive }">
                  <span aria-hidden="true"></span>
                  {{ user.isActive ? 'Aktif' : 'Pasif' }}
                </span>
              </td>
              <td>{{ formatDate(user.createdAt) }}</td>
              <td>
                <button class="button small" type="button" @click="openEditModal(user)">Düzenle</button>
              </td>
            </tr>

            <tr v-if="filteredUsers.length === 0">
              <td colspan="6">Seçili filtrelerde kullanıcı yok.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="isCreateModalOpen" class="users-modal-backdrop" role="presentation" @click.self="closeCreateModal">
      <section class="users-create-modal" role="dialog" aria-modal="true" aria-labelledby="createUserTitle">
        <header class="users-modal-header">
          <div>
            <p class="eyebrow">{{ isEditMode ? 'Kullanıcı düzenle' : 'Yeni kullanıcı' }}</p>
            <h2 id="createUserTitle">{{ isEditMode ? 'Hesabı güncelle' : 'Hesap oluştur' }}</h2>
          </div>
          <button class="users-modal-close" type="button" aria-label="Kapat" @click="closeCreateModal"></button>
        </header>

        <form class="users-modal-form" @submit.prevent="submit">
          <div class="users-modal-grid">
            <label>
              <span>Rol</span>
              <select id="userRole" v-model="form.role">
                <option v-for="role in roleOptions" :key="role" :value="role">{{ role }}</option>
              </select>
            </label>

            <label>
              <span>Durum</span>
              <select id="userStatus" v-model="form.isActive">
                <option :value="true">Aktif</option>
                <option :value="false">Pasif</option>
              </select>
            </label>
          </div>

          <label>
            <span>Kurum</span>
            <select id="userOrganization" v-model="form.organizationId" :disabled="form.role === Role.ADMIN">
              <option v-if="!organizationOptions.length" value="">Kurum yok</option>
              <option v-for="organization in organizationOptions" :key="organization.id" :value="organization.id">
                {{ organization.name }}
              </option>
            </select>
          </label>

          <label>
            <span>Ad soyad</span>
            <input
              id="userFullName"
              v-model="form.fullName"
              type="text"
              maxlength="160"
              placeholder="Dr. Ayse Yilmaz"
              required
            />
          </label>

          <label>
            <span>E-posta</span>
            <input
              id="userEmail"
              v-model="form.email"
              type="email"
              maxlength="160"
              placeholder="supervisor@example.com"
              required
            />
          </label>

          <label>
            <span>Şifre</span>
            <input
              id="userPassword"
              v-model="form.password"
              type="password"
              minlength="6"
              :placeholder="isEditMode ? 'Değiştirmeyeceksen boş bırak' : 'Admin123!'"
              :required="!isEditMode"
            />
          </label>

          <p v-if="form.role !== Role.ADMIN && !form.organizationId" class="info-text">
            Supervisor veya staff için kurum seçimi zorunlu.
          </p>
          <p v-if="formError" class="error-text">{{ formError }}</p>
          <p v-if="formMessage" class="success-text">{{ formMessage }}</p>

          <div class="users-modal-actions">
            <button class="button small" type="button" :disabled="submitting" @click="closeCreateModal">Vazgec</button>
            <button class="button primary" type="submit" :disabled="submitting">
              {{ submitting ? 'Kaydediliyor...' : isEditMode ? 'Güncelle' : 'Oluştur' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </section>
</template>
