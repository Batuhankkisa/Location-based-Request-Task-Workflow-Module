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
const currentOrganizationLabel = computed(() => {
  if (canSelectOrganization.value) {
    return selectedOrganizationId.value === 'ALL'
      ? 'Tum kurumlar'
      : organizationOptions.value.find((item) => item.id === selectedOrganizationId.value)?.name ?? 'Secili kurum';
  }

  return auth.user.value?.organization?.name ?? 'Kurum tanimsiz';
});
const summaryCards = computed(() => [
  {
    label: 'Toplam task',
    value: tasks.value.length,
    detail: 'Secili scope icindeki tum talepler.',
    tone: 'indigo'
  },
  {
    label: 'Yeni',
    value: tasks.value.filter((task) => task.status === TaskStatus.NEW).length,
    detail: 'Ilk aksiyon bekleyen talepler.',
    tone: 'teal'
  },
  {
    label: 'Islemde',
    value: tasks.value.filter((task) => task.status === TaskStatus.IN_PROGRESS).length,
    detail: 'Sahada devam eden isler.',
    tone: 'amber'
  },
  {
    label: 'Onay bekleyen',
    value: tasks.value.filter((task) => task.status === TaskStatus.DONE_WAITING_APPROVAL).length,
    detail: 'Supervisor kontrolune hazir kayitlar.',
    tone: 'rose'
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
      return 'Islemde';
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
  <section class="section workspace-shell">
    <header class="workspace-hero workspace-hero-operations">
      <div class="workspace-title-block">
        <p class="eyebrow">Operasyon</p>
        <h1>Task listesi</h1>
        <p class="lead">
          {{ currentOrganizationLabel }} icindeki gorev akislarini izle, kritik yogunlugu gor ve kayit detayina in.
        </p>
      </div>

      <div class="workspace-actions">
        <label v-if="canSelectOrganization" class="workspace-control">
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

    <section class="panel workspace-table-card">
      <div class="workspace-table-header">
        <div>
          <p class="eyebrow">Canli liste</p>
          <h2>Acik ve gecmis talepler</h2>
          <p class="workspace-card-copy">
            Task satirlarinda kurum, lokasyon, talep ozet ve durum bilgisi birlikte sunulur.
          </p>
        </div>
        <span class="workspace-badge">{{ currentOrganizationLabel }}</span>
      </div>

      <div v-if="pending" class="workspace-empty-card">
        <p>Tasklar yukleniyor...</p>
      </div>

      <div v-else-if="error" class="workspace-empty-card error-panel">
        <p>Tasklar alinamadi.</p>
      </div>

      <div v-else class="table-wrap workspace-table-wrap">
        <table class="workspace-table tasks-table">
          <thead>
            <tr>
              <th>Olusturulma</th>
              <th v-if="canSelectOrganization">Kurum</th>
              <th>Lokasyon</th>
              <th>Talep</th>
              <th>Durum</th>
              <th>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="task in tasks" :key="task.id">
              <td>
                <div class="workspace-cell-stack">
                  <strong>{{ formatDate(task.createdAt) }}</strong>
                  <span>{{ formatTime(task.createdAt) }}</span>
                </div>
              </td>
              <td v-if="canSelectOrganization">
                <div class="workspace-cell-stack">
                  <strong>{{ task.location.organization?.name ?? '-' }}</strong>
                  <span>{{ task.location.organization?.code ?? 'Genel scope' }}</span>
                </div>
              </td>
              <td>
                <div class="workspace-cell-stack">
                  <strong>{{ task.location.name }}</strong>
                  <span>{{ task.location.code }}</span>
                </div>
              </td>
              <td>
                <div class="workspace-cell-stack">
                  <strong>{{ task.request.requestText }}</strong>
                  <span>{{ task.request.channel }}</span>
                </div>
              </td>
              <td>
                <span class="status-pill" :class="taskStatusTone(task.status)">
                  {{ taskStatusLabel(task.status) }}
                </span>
              </td>
              <td>
                <NuxtLink class="button small" :to="`/admin/tasks/${task.id}`">Detay</NuxtLink>
              </td>
            </tr>
            <tr v-if="tasks.length === 0">
              <td :colspan="canSelectOrganization ? 6 : 5">Henuz task yok.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
