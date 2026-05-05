<script setup lang="ts">
import { OrganizationType, Role, TaskStatus } from '@lbrtw/shared';

definePageMeta({
  middleware: 'admin-auth',
  roles: [Role.ADMIN, Role.SUPERVISOR, Role.STAFF]
});

interface OrganizationOption {
  id: string;
  name: string;
  code: string;
  type: OrganizationType;
  isActive: boolean;
}

interface TaskListItem {
  id: string;
  status: TaskStatus;
  createdAt: string;
  location: {
    name: string;
    code: string;
    organization?: {
      id: string;
      name: string;
      code: string;
    };
  };
  request: {
    requestText: string;
    channel: string;
  };
}

const auth = useAuth();
const route = useRoute();
const router = useRouter();
const canSelectOrganization = computed(() => auth.hasRole(Role.ADMIN));

function readOrganizationIdFromRoute() {
  return typeof route.query.organizationId === 'string' ? route.query.organizationId : 'ALL';
}

const selectedOrganizationId = ref(
  auth.hasRole(Role.ADMIN)
    ? readOrganizationIdFromRoute()
    : (auth.user.value?.organizationId ?? 'ALL')
);
const searchTerm = ref('');
const statusFilter = ref<'ALL' | TaskStatus>('ALL');

const { data: organizationData } = await useAsyncData('task-organizations', async () => {
  if (!canSelectOrganization.value) {
    return {
      success: true,
      data: [] as OrganizationOption[]
    };
  }

  return useApiFetch<ApiResponse<OrganizationOption[]>>('/organizations');
});

const organizationOptions = computed(() => organizationData.value?.data ?? []);

const { data, pending, error, refresh } = await useAsyncData(
  'tasks',
  () =>
    useApiFetch<ApiResponse<TaskListItem[]>>('/tasks', {
      query:
        selectedOrganizationId.value !== 'ALL'
          ? {
              organizationId: selectedOrganizationId.value
            }
          : undefined
    }),
  {
    watch: [selectedOrganizationId]
  }
);

const tasks = computed(() => data.value?.data ?? []);
const filteredTasks = computed(() =>
  tasks.value.filter((task) => {
    const requestSummary = parseRequestSummary(task.request.requestText);
    const matchesStatus = statusFilter.value === 'ALL' ? true : task.status === statusFilter.value;
    const matchesSearch = !searchTerm.value.trim()
      ? true
      : `${requestSummary.category} ${requestSummary.title} ${requestSummary.description} ${task.location.name} ${task.location.code} ${task.location.organization?.name ?? ''} ${task.status}`
          .toLocaleLowerCase('tr')
          .includes(searchTerm.value.trim().toLocaleLowerCase('tr'));

    return matchesStatus && matchesSearch;
  })
);
const currentOrganizationLabel = computed(() => {
  if (canSelectOrganization.value) {
    return selectedOrganizationId.value === 'ALL'
      ? 'Tüm kurumlar'
      : organizationOptions.value.find((item) => item.id === selectedOrganizationId.value)?.name ?? 'Seçili kurum';
  }

  return auth.user.value?.organization?.name ?? 'Kurum tanımsız';
});
const summaryCards = computed(() => [
  {
    label: 'Toplam görev',
    value: tasks.value.length,
    detail: currentOrganizationLabel.value,
    tone: 'blue'
  },
  {
    label: 'Yeni',
    value: tasks.value.filter((task) => task.status === TaskStatus.NEW).length,
    detail: 'Ilk aksiyon bekliyor',
    tone: 'amber'
  },
  {
    label: 'İşlemde',
    value: tasks.value.filter((task) => task.status === TaskStatus.IN_PROGRESS).length,
    detail: 'Sahada devam ediyor',
    tone: 'violet'
  },
  {
    label: 'Onay bekleyen',
    value: tasks.value.filter((task) => task.status === TaskStatus.DONE_WAITING_APPROVAL).length,
    detail: 'Supervisor kontrolunde',
    tone: 'green'
  }
]);

function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short'
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    timeStyle: 'short'
  }).format(new Date(value));
}

function taskStatusLabel(status: TaskStatus) {
  switch (status) {
    case TaskStatus.NEW:
      return 'Yeni';
    case TaskStatus.IN_PROGRESS:
      return 'İşlemde';
    case TaskStatus.DONE_WAITING_APPROVAL:
      return 'Onay bekliyor';
    case TaskStatus.APPROVED:
      return 'Onaylandi';
    case TaskStatus.REJECTED:
      return 'Reddedildi';
    default:
      return status;
  }
}

function taskStatusTone(status: TaskStatus) {
  switch (status) {
    case TaskStatus.NEW:
      return 'tone-new';
    case TaskStatus.IN_PROGRESS:
      return 'tone-progress';
    case TaskStatus.DONE_WAITING_APPROVAL:
      return 'tone-awaiting';
    case TaskStatus.APPROVED:
      return 'tone-approved';
    case TaskStatus.REJECTED:
      return 'tone-rejected';
    default:
      return '';
  }
}

function parseRequestSummary(value: string) {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const readField = (name: string) => {
    const prefix = `${name}:`;
    return lines.find((line) => line.toLocaleLowerCase('tr').startsWith(prefix.toLocaleLowerCase('tr')))
      ?.slice(prefix.length)
      .trim();
  };
  const category = readField('Kategori') ?? 'Genel Talep';
  const title = readField('Başlık') ?? readField('Baslik') ?? lines[0] ?? 'Başlık yok';
  const description = readField('Açıklama') ?? readField('Aciklama') ?? lines.find((line) => !line.includes(':')) ?? value;

  return {
    category,
    title: compactText(title, 92),
    description: compactText(description, 140)
  };
}

function compactText(value: string, maxLength: number) {
  const cleanValue = value.replace(/\s+/g, ' ').trim();
  return cleanValue.length > maxLength ? `${cleanValue.slice(0, maxLength - 1)}...` : cleanValue;
}

watch(
  () => route.query.organizationId,
  (organizationId) => {
    if (!canSelectOrganization.value) {
      return;
    }

    const nextOrganizationId = typeof organizationId === 'string' ? organizationId : 'ALL';
    if (selectedOrganizationId.value !== nextOrganizationId) {
      selectedOrganizationId.value = nextOrganizationId;
    }
  }
);

watch(selectedOrganizationId, (organizationId) => {
  if (!canSelectOrganization.value) {
    return;
  }

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
</script>

<template>
  <section class="section users-azure-page tasks-azure-page">
    <header class="users-azure-header tasks-azure-header">
      <div class="users-title-block">
        <p class="eyebrow">Request Center</p>
        <h1>Görev Listesi</h1>
        <p>{{ currentOrganizationLabel }} içindeki talep kaynaklı görev akışlarını izle ve kayıt detayına in.</p>
      </div>

      <div class="users-header-actions">
        <label v-if="canSelectOrganization" class="users-filter-card">
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

    <div class="users-stat-grid tasks-stat-grid">
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

    <section class="users-directory-panel tasks-directory-panel">
      <div class="users-directory-toolbar">
        <label class="users-search-field tasks-search-field">
          <span aria-hidden="true"></span>
          <input v-model="searchTerm" type="text" placeholder="Talep, lokasyon, kurum veya durum ara" />
        </label>

        <div class="users-toolbar-controls">
          <label class="users-filter-card compact">
            <span>Durum</span>
            <select v-model="statusFilter">
              <option value="ALL">Tüm durumlar</option>
              <option :value="TaskStatus.NEW">Yeni</option>
              <option :value="TaskStatus.IN_PROGRESS">İşlemde</option>
              <option :value="TaskStatus.DONE_WAITING_APPROVAL">Onay bekliyor</option>
              <option :value="TaskStatus.APPROVED">Onaylandi</option>
              <option :value="TaskStatus.REJECTED">Reddedildi</option>
            </select>
          </label>
        </div>
      </div>

      <div class="users-directory-head">
        <div>
          <p class="eyebrow">Canli liste</p>
          <h2>Talep görevleri</h2>
        </div>
        <span class="users-count-pill">{{ filteredTasks.length }} kayıt</span>
      </div>

      <div v-if="pending" class="users-empty-state">
        <p>Görevler yükleniyor...</p>
      </div>

      <div v-else-if="error" class="users-empty-state error-panel">
        <p>Görevler alınamadı.</p>
      </div>

      <div v-else class="users-table-wrap">
        <table class="users-azure-table tasks-azure-table">
          <thead>
            <tr>
              <th v-if="canSelectOrganization">Kurum</th>
              <th>Lokasyon</th>
              <th>Talep</th>
              <th>Durum</th>
              <th>Oluşturulma</th>
              <th>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="task in filteredTasks" :key="task.id">
              <td v-if="canSelectOrganization">
                <div class="users-stack-cell">
                  <strong>{{ task.location.organization?.name ?? '-' }}</strong>
                  <small>{{ task.location.organization?.code ?? 'Genel scope' }}</small>
                </div>
              </td>
              <td>
                <div class="tasks-location-cell">
                  <span class="tasks-location-icon" aria-hidden="true"></span>
                  <span>
                    <strong>{{ task.location.name }}</strong>
                    <small>{{ task.location.code }}</small>
                  </span>
                </div>
              </td>
              <td>
                <div class="tasks-request-cell">
                  <span class="tasks-category-pill">{{ parseRequestSummary(task.request.requestText).category }}</span>
                  <strong>{{ parseRequestSummary(task.request.requestText).title }}</strong>
                  <small>{{ parseRequestSummary(task.request.requestText).description }}</small>
                  <code>{{ task.request.channel }}</code>
                </div>
              </td>
              <td>
                <span class="users-status-pill tasks-status-pill" :class="taskStatusTone(task.status)">
                  <span aria-hidden="true"></span>
                  {{ taskStatusLabel(task.status) }}
                </span>
              </td>
              <td>
                <div class="users-stack-cell">
                  <strong>{{ formatDate(task.createdAt) }}</strong>
                  <small>{{ formatTime(task.createdAt) }}</small>
                </div>
              </td>
              <td>
                <NuxtLink class="button small tasks-detail-button" :to="`/admin/tasks/${task.id}`">Detay</NuxtLink>
              </td>
            </tr>
            <tr v-if="filteredTasks.length === 0">
              <td :colspan="canSelectOrganization ? 6 : 5">Seçili filtrelerde görev yok.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
