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
    ? 'Tum kurumlar'
    : organizationOptions.value.find((item) => item.id === selectedOrganizationId.value)?.name ?? 'Secili kurum'
);
const filteredUsers = computed(() =>
  users.value.filter((user) => {
    const matchesRole = roleFilter.value === 'ALL' ? true : user.role === roleFilter.value;
    const matchesSearch = !searchTerm.value.trim()
      ? true
      : `${user.fullName} ${user.email} ${user.organization?.name ?? ''} ${user.role}`
          .toLocaleLowerCase('tr')
          .includes(searchTerm.value.trim().toLocaleLowerCase('tr'));

    return matchesRole && matchesSearch;
  })
);
const summaryCards = computed(() => [
  {
    label: 'Toplam kullanici',
    value: users.value.length,
    detail: 'Secili scope icindeki tum hesaplar.',
    tone: 'indigo'
  },
  {
    label: 'Supervisor',
    value: users.value.filter((user) => user.role === Role.SUPERVISOR).length,
    detail: 'Kurum yonetimi yapabilen hesaplar.',
    tone: 'teal'
  },
  {
    label: 'Staff',
    value: users.value.filter((user) => user.role === Role.STAFF).length,
    detail: 'Operasyon gorevlerini yurutur.',
    tone: 'amber'
  },
  {
    label: 'Global admin',
    value: users.value.filter((user) => user.role === Role.ADMIN).length,
    detail: 'Tum kurumlardan sorumlu hesaplar.',
    tone: 'rose'
  }
]);
const recentUsers = computed(() => users.value.slice(0, 4));

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
  [selectedOrganizationId, () => form.role],
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

async function submit() {
  formError.value = '';
  formMessage.value = '';

  if (form.role !== Role.ADMIN && !form.organizationId) {
    formError.value = 'Supervisor ve staff kullanicilari bir kuruma baglamalisin.';
    return;
  }

  submitting.value = true;

  try {
    await useApiFetch<ApiResponse<UserItem>>('/users', {
      method: 'POST',
      body: {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        role: form.role,
        organizationId: form.role === Role.ADMIN ? undefined : form.organizationId,
        isActive: form.isActive
      }
    });

    form.fullName = '';
    form.email = '';
    form.password = '';
    form.role = Role.SUPERVISOR;
    form.isActive = true;
    formMessage.value = 'Kullanici olusturuldu.';
    await refresh();
  } catch (requestError) {
    formError.value = getApiErrorMessage(requestError, 'Kullanici olusturulamadi.');
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
</script>

<template>
  <section class="section workspace-shell">
    <header class="workspace-hero workspace-hero-users">
      <div class="workspace-title-block">
        <p class="eyebrow">Kullanici yonetimi</p>
        <h1>Supervisor ve staff hesaplari</h1>
        <p class="lead">
          {{ currentOrganizationLabel }} scope'undaki yonetici ve saha ekiplerini olustur, filtrele ve dagilimi izle.
        </p>
      </div>

      <div class="workspace-actions">
        <label class="workspace-control">
          <span>Kurum</span>
          <select v-model="selectedOrganizationId">
            <option value="ALL">Tum kurumlar</option>
            <option v-for="organization in organizationOptions" :key="organization.id" :value="organization.id">
              {{ organization.name }}
            </option>
          </select>
        </label>
        <button class="button secondary" type="button" @click="refresh">Yenile</button>
      </div>
    </header>

    <div class="workspace-metrics-grid">
      <article
        v-for="card in summaryCards"
        :key="card.label"
        class="metric-card"
        :class="`tone-${card.tone}`"
      >
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
        <p>{{ card.detail }}</p>
      </article>
    </div>

    <div class="workspace-grid workspace-grid-wide">
      <section class="panel workspace-form-card">
        <div class="workspace-card-head">
          <div>
            <p class="eyebrow">Yeni kullanici</p>
            <h2>Kurum yoneticisi veya personel ekle</h2>
          </div>
          <span class="workspace-badge">Rol tabanli olusturma</span>
        </div>

        <p class="workspace-card-copy">
          Admin olarak bir kuruma supervisor ya da staff baglayabilir, istersen global admin hesabi da acabilirsin.
        </p>

        <form class="workspace-form-stack" @submit.prevent="submit">
          <div>
            <label for="userRole">Rol</label>
            <select id="userRole" v-model="form.role">
              <option v-for="role in roleOptions" :key="role" :value="role">{{ role }}</option>
            </select>
          </div>

          <div>
            <label for="userOrganization">Kurum</label>
            <select id="userOrganization" v-model="form.organizationId" :disabled="form.role === Role.ADMIN">
              <option v-if="!organizationOptions.length" value="">Kurum yok</option>
              <option v-for="organization in organizationOptions" :key="organization.id" :value="organization.id">
                {{ organization.name }}
              </option>
            </select>
          </div>

          <div>
            <label for="userFullName">Ad soyad</label>
            <input
              id="userFullName"
              v-model="form.fullName"
              type="text"
              maxlength="160"
              placeholder="Dr. Ayse Yilmaz"
              required
            />
          </div>

          <div>
            <label for="userEmail">E-posta</label>
            <input
              id="userEmail"
              v-model="form.email"
              type="email"
              maxlength="160"
              placeholder="supervisor.c@example.com"
              required
            />
          </div>

          <div>
            <label for="userPassword">Sifre</label>
            <input
              id="userPassword"
              v-model="form.password"
              type="text"
              minlength="6"
              placeholder="Admin123!"
              required
            />
          </div>

          <div>
            <label for="userStatus">Durum</label>
            <select id="userStatus" v-model="form.isActive">
              <option :value="true">Aktif</option>
              <option :value="false">Pasif</option>
            </select>
          </div>

          <div class="form-actions">
            <button class="button primary" type="submit" :disabled="submitting">
              {{ submitting ? 'Olusturuluyor...' : 'Kullanici olustur' }}
            </button>
          </div>

          <p v-if="form.role !== Role.ADMIN && !form.organizationId" class="info-text">
            Supervisor veya staff olusturmak icin bir kurum sec.
          </p>
          <p v-if="formError" class="error-text">{{ formError }}</p>
          <p v-if="formMessage" class="success-text">{{ formMessage }}</p>
        </form>
      </section>

      <section class="panel workspace-aside-card">
        <div class="workspace-card-head">
          <div>
            <p class="eyebrow">Hizli gorunum</p>
            <h2>Son eklenen hesaplar</h2>
          </div>
        </div>

        <div class="workspace-stack-list">
          <article v-for="user in recentUsers" :key="user.id" class="workspace-list-card">
            <div>
              <strong>{{ user.fullName }}</strong>
              <span>{{ user.email }}</span>
            </div>
            <div class="workspace-chip-row">
              <span class="auth-chip">{{ user.role }}</span>
              <span class="status-pill" :class="{ approved: user.isActive, rejected: !user.isActive }">
                {{ user.isActive ? 'Aktif' : 'Pasif' }}
              </span>
            </div>
          </article>

          <article v-if="recentUsers.length === 0" class="workspace-empty-card">
            <strong>Henuz kullanici yok</strong>
            <p>Soldaki form ile supervisor ya da staff hesaplarini olusturabilirsin.</p>
          </article>
        </div>
      </section>
    </div>

    <section class="panel workspace-toolbar-card">
      <div class="workspace-toolbar">
        <label class="workspace-search">
          <span>Ara</span>
          <input v-model="searchTerm" type="text" placeholder="Ad, e-posta veya kurum ara..." />
        </label>

        <div class="workspace-toolbar-filters">
          <label class="workspace-control compact">
            <span>Rol</span>
            <select v-model="roleFilter">
              <option value="ALL">Tum roller</option>
              <option :value="Role.SUPERVISOR">SUPERVISOR</option>
              <option :value="Role.STAFF">STAFF</option>
              <option :value="Role.ADMIN">ADMIN</option>
            </select>
          </label>
        </div>
      </div>
    </section>

    <section class="panel workspace-table-card">
      <div class="workspace-table-header">
        <div>
          <p class="eyebrow">Kullanici listesi</p>
          <h2>Filtrelenmis hesaplar</h2>
          <p class="workspace-card-copy">
            Tum kurumlarda ya da secili kurum scope'unda supervisor, staff ve global admin dagilimini izle.
          </p>
        </div>
      </div>

      <div v-if="pending" class="workspace-empty-card">
        <p>Kullanicilar yukleniyor...</p>
      </div>

      <div v-else-if="error" class="workspace-empty-card error-panel">
        <p>Kullanici listesi alinamadi.</p>
      </div>

      <div v-else class="table-wrap workspace-table-wrap">
        <table class="workspace-table users-table">
          <thead>
            <tr>
              <th>Ad soyad</th>
              <th>E-posta</th>
              <th>Rol</th>
              <th>Kurum</th>
              <th>Durum</th>
              <th>Olusturulma</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id">
              <td>
                <div class="workspace-cell-stack">
                  <strong>{{ user.fullName }}</strong>
                  <span>ID: {{ user.id.slice(0, 8) }}</span>
                </div>
              </td>
              <td>{{ user.email }}</td>
              <td><span class="auth-chip">{{ user.role }}</span></td>
              <td>
                <div class="workspace-cell-stack">
                  <strong>{{ user.organization?.name ?? 'Global Admin' }}</strong>
                  <span>{{ user.organization?.code ?? '-' }}</span>
                </div>
              </td>
              <td>
                <span class="status-pill" :class="{ approved: user.isActive, rejected: !user.isActive }">
                  {{ user.isActive ? 'Aktif' : 'Pasif' }}
                </span>
              </td>
              <td>{{ formatDate(user.createdAt) }}</td>
            </tr>

            <tr v-if="filteredUsers.length === 0">
              <td colspan="6">Secili filtrelerde kullanici yok.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
