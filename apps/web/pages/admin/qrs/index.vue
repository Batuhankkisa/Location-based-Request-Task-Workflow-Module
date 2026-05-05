<script setup lang="ts">
import { LocationType, OrganizationType, Role } from '@lbrtw/shared';

definePageMeta({
  middleware: 'admin-auth',
  roles: [Role.ADMIN, Role.SUPERVISOR]
});

interface QrCodeListItem {
  id: string;
  token: string;
  label: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deactivatedAt: string | null;
  lastScannedAt: string | null;
  scanCount: number;
  imagePath: string | null;
  note: string | null;
  location: {
    id?: string;
    name: string;
    code: string;
    type: string;
    organization?: {
      id: string;
      name: string;
      code: string;
      type: OrganizationType;
    };
  };
}

interface QrCodeDetail extends QrCodeListItem {
  location: {
    id: string;
    name: string;
    code: string;
    type: string;
    organization?: {
      id: string;
      name: string;
      code: string;
      type: OrganizationType;
    };
  };
}

interface QrScanLog {
  id: string;
  tokenSnapshot: string;
  scannedAt: string;
  ip: string | null;
  userAgent: string | null;
  status: string;
  requestId: string | null;
  createdTaskId: string | null;
  errorMessage: string | null;
}

interface OrganizationOption {
  id: string;
  name: string;
  code: string;
  type: OrganizationType;
  isActive: boolean;
}

interface LocationNode {
  id: string;
  name: string;
  code: string;
  type: string;
  children: LocationNode[];
}

interface LocationOption {
  id: string;
  label: string;
  type: string;
}

const auth = useAuth();
const route = useRoute();
const router = useRouter();
const requestUrl = useRequestURL();
const apiBaseUrl = useApiBaseUrl();
const searchTerm = ref('');
const statusFilter = ref<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
const typeFilter = ref('ALL');
const floorFilter = ref('ALL');
function readOrganizationIdFromRoute() {
  return typeof route.query.organizationId === 'string' ? route.query.organizationId : 'ALL';
}

const selectedOrganizationId = ref(
  auth.hasRole(Role.ADMIN)
    ? readOrganizationIdFromRoute()
    : (auth.user.value?.organizationId ?? 'ALL')
);
const selectedQrId = ref('');
const actionLoading = ref('');
const actionError = ref('');
const actionMessage = ref('');
const copyMessage = ref('');
const previewImageFailed = ref(false);
const isCreateModalOpen = ref(false);
const pageMessage = ref('');
const formSubmitting = ref(false);
const formError = ref('');
const formMessage = ref('');
const qrForm = reactive({
  token: '',
  label: '',
  locationId: '',
  isActive: true,
  imagePath: '',
  note: ''
});

const canManageQr = computed(() => auth.hasRole(Role.ADMIN, Role.SUPERVISOR));
const canSelectOrganization = computed(() => auth.hasRole(Role.ADMIN));
const { data: organizationData } = await useAsyncData('qr-organizations', async () => {
  if (!canSelectOrganization.value) {
    return {
      success: true,
      data: [] as OrganizationOption[]
    };
  }

  return useApiFetch<ApiResponse<OrganizationOption[]>>('/organizations');
});

const organizationOptions = computed(() => organizationData.value?.data ?? []);
const activeOrganizationId = computed(() => {
  if (!canSelectOrganization.value) {
    return auth.user.value?.organizationId ?? '';
  }

  return selectedOrganizationId.value === 'ALL' ? '' : selectedOrganizationId.value;
});
const {
  data: locationTreeData,
  pending: locationTreePending,
  error: locationTreeError,
  refresh: refreshLocationTree
} = await useAsyncData(
  'qr-location-tree',
  async () => {
    if (!activeOrganizationId.value) {
      return {
        success: true,
        data: [] as LocationNode[]
      };
    }

    return useApiFetch<ApiResponse<LocationNode[]>>('/locations/tree', {
      query: {
        organizationId: activeOrganizationId.value
      }
    });
  },
  {
    watch: [activeOrganizationId]
  }
);
const { data, pending, error, refresh } = await useAsyncData(
  'qr-codes',
  () =>
    useApiFetch<ApiResponse<QrCodeListItem[]>>('/qr-codes', {
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

const qrCodes = computed(() => data.value?.data ?? []);
const locationOptions = computed<LocationOption[]>(() => {
  const items: LocationOption[] = [];

  const walk = (nodes: LocationNode[], depth = 0) => {
    for (const node of nodes) {
      if (node.type !== LocationType.ORGANIZATION) {
        items.push({
          id: node.id,
          label: `${'-- '.repeat(depth)}${node.name} (${node.type})`,
          type: node.type
        });
      }

      if (node.children.length) {
        walk(node.children, depth + 1);
      }
    }
  };

  walk(locationTreeData.value?.data ?? []);
  return items;
});
const canSubmitQr = computed(() => Boolean(activeOrganizationId.value) && locationOptions.value.length > 0 && canManageQr.value);
const currentOrganizationLabel = computed(() => {
  if (canSelectOrganization.value) {
    return selectedOrganizationId.value === 'ALL'
      ? 'Tüm kurumlar'
      : organizationOptions.value.find((item) => item.id === selectedOrganizationId.value)?.name ?? 'Seçili kurum';
  }

  return auth.user.value?.organization?.name ?? 'Kurum tanımsız';
});

const typeOptions = computed(() =>
  Array.from(new Set(qrCodes.value.map((item) => item.location.type).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, 'tr')
  )
);
const floorOptions = computed(() =>
  Array.from(
    new Set(
      qrCodes.value
        .map((item) => getFloorLabel(item.location.name))
        .filter((value) => value !== 'Belirsiz kat')
    )
  ).sort((left, right) => left.localeCompare(right, 'tr'))
);
const filteredQrCodes = computed(() =>
  qrCodes.value.filter((item) => {
    const matchesSearch = !searchTerm.value.trim()
      ? true
      : `${item.label} ${item.token} ${item.location.name} ${item.location.code} ${item.location.organization?.name ?? ''}`
          .toLocaleLowerCase('tr')
          .includes(searchTerm.value.trim().toLocaleLowerCase('tr'));
    const matchesStatus =
      statusFilter.value === 'ALL'
        ? true
        : statusFilter.value === 'ACTIVE'
          ? item.isActive
          : !item.isActive;
    const matchesType = typeFilter.value === 'ALL' ? true : item.location.type === typeFilter.value;
    const matchesFloor =
      floorFilter.value === 'ALL' ? true : getFloorLabel(item.location.name) === floorFilter.value;

    return matchesSearch && matchesStatus && matchesType && matchesFloor;
  })
);
const stats = computed(() => ({
  total: qrCodes.value.length,
  active: qrCodes.value.filter((item) => item.isActive).length,
  inactive: qrCodes.value.filter((item) => !item.isActive).length,
  scans: qrCodes.value.reduce((total, item) => total + item.scanCount, 0)
}));

watch(
  filteredQrCodes,
  (items) => {
    if (!items.some((item) => item.id === selectedQrId.value)) {
      selectedQrId.value = items[0]?.id ?? '';
    }
  },
  { immediate: true }
);

watch(
  [selectedOrganizationId, locationOptions],
  () => {
    formError.value = '';
    formMessage.value = '';

    if (!locationOptions.value.some((item) => item.id === qrForm.locationId)) {
      qrForm.locationId = locationOptions.value[0]?.id ?? '';
    }
  },
  { immediate: true }
);

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

const {
  data: qrDetailData,
  pending: qrDetailPending,
  error: qrDetailError,
  refresh: refreshQrDetail
} = await useAsyncData(
  'selected-qr-detail',
  async () => {
    if (!selectedQrId.value) {
      return null;
    }

    return useApiFetch<ApiResponse<QrCodeDetail>>(`/qr-codes/${encodeURIComponent(selectedQrId.value)}`);
  },
  { watch: [selectedQrId] }
);

const {
  data: scanLogsData,
  pending: scanLogsPending,
  error: scanLogsError,
  refresh: refreshScanLogs
} = await useAsyncData(
  'selected-qr-logs',
  async () => {
    if (!selectedQrId.value) {
      return null;
    }

    return useApiFetch<ApiResponse<QrScanLog[]>>(`/qr-codes/${encodeURIComponent(selectedQrId.value)}/scan-logs`);
  },
  { watch: [selectedQrId] }
);

const selectedQr = computed(() => qrDetailData.value?.data ?? null);
const selectedLogs = computed(() => scanLogsData.value?.data ?? []);
const selectedListItem = computed(() => qrCodes.value.find((item) => item.id === selectedQrId.value) ?? null);
const selectedSummary = computed(() => selectedQr.value ?? selectedListItem.value);
const publicQrUrl = computed(() => {
  if (!selectedSummary.value) {
    return '';
  }

  return `${requestUrl.origin.replace(/\/$/, '')}/q/${selectedSummary.value.token}`;
});
const { dataUrl: generatedQrPreviewUrl } = useQrPreviewDataUrl(publicQrUrl);
const selectedImagePath = computed(() => selectedSummary.value?.imagePath ?? null);
const selectedPreviewImageUrl = computed(() => {
  if (selectedImagePath.value && !previewImageFailed.value) {
    return assetUrl(selectedImagePath.value);
  }

  return generatedQrPreviewUrl.value;
});
const selectedPreviewAlt = computed(() =>
  selectedImagePath.value && !previewImageFailed.value
    ? `${selectedSummary.value?.label ?? 'QR'} gorseli`
    : `${selectedSummary.value?.label ?? 'QR'} kodu`
);
const recentLogs = computed(() => selectedLogs.value.slice(0, 4));

watch([selectedQrId, selectedImagePath], () => {
  previewImageFailed.value = false;
});

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

function getFloorLabel(value: string) {
  const match = value.match(/(\d+)\.\s*Kat/i);
  return match ? `${match[1]}. Kat` : 'Belirsiz kat';
}

function selectQr(id: string) {
  selectedQrId.value = id;
  actionError.value = '';
  actionMessage.value = '';
  copyMessage.value = '';
}

function openCreateModal() {
  pageMessage.value = '';
  formError.value = '';
  formMessage.value = '';
  isCreateModalOpen.value = true;
}

function closeCreateModal() {
  if (formSubmitting.value) {
    return;
  }

  isCreateModalOpen.value = false;
  formError.value = '';
  formMessage.value = '';
}

async function refreshSelection() {
  if (!selectedQrId.value) {
    return;
  }

  await Promise.all([refreshQrDetail(), refreshScanLogs()]);
}

async function submitQr() {
  formError.value = '';
  formMessage.value = '';
  pageMessage.value = '';

  if (!canSubmitQr.value) {
    formError.value = canSelectOrganization.value && !activeOrganizationId.value
      ? 'Yeni QR için önce tek bir kurum seç.'
      : 'QR bağlamak için uygun lokasyon bulunamadı.';
    return;
  }

  formSubmitting.value = true;

  try {
    const response = await useApiFetch<ApiResponse<QrCodeDetail>>('/qr-codes', {
      method: 'POST',
      body: {
        token: qrForm.token,
        label: qrForm.label,
        locationId: qrForm.locationId,
        isActive: qrForm.isActive,
        imagePath: qrForm.imagePath || undefined,
        note: qrForm.note || undefined
      }
    });

    qrForm.token = '';
    qrForm.label = '';
    qrForm.isActive = true;
    qrForm.imagePath = '';
    qrForm.note = '';
    isCreateModalOpen.value = false;
    pageMessage.value = 'QR kaydı oluşturuldu.';
    await Promise.all([refresh(), refreshLocationTree()]);
    selectedQrId.value = response.data.id;
    await refreshSelection();
  } catch (requestError) {
    formError.value = getApiErrorMessage(requestError, 'QR kaydı oluşturulamadı.');
  } finally {
    formSubmitting.value = false;
  }
}

async function setActiveState(action: 'activate' | 'deactivate') {
  if (!selectedQrId.value) {
    return;
  }

  actionError.value = '';
  actionMessage.value = '';
  actionLoading.value = action;

  try {
    await useApiFetch<ApiResponse<QrCodeDetail>>(`/qr-codes/${selectedQrId.value}/${action}`, {
      method: 'PATCH'
    });

    actionMessage.value = action === 'activate' ? 'QR tekrar aktif edildi.' : 'QR pasife alındı.';
    await refresh();
    await refreshSelection();
  } catch (requestError) {
    actionError.value = getApiErrorMessage(requestError, 'QR durumu güncellenemedi.');
  } finally {
    actionLoading.value = '';
  }
}

async function copyPublicQrUrl() {
  if (!publicQrUrl.value) {
    return;
  }

  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      throw new Error('Clipboard API unavailable');
    }

    await navigator.clipboard.writeText(publicQrUrl.value);
    copyMessage.value = 'Yonlendirme URL kopyalandi.';
  } catch {
    copyMessage.value = 'Kopyalama başarısız oldu.';
  }
}

function assetUrl(value?: string | null) {
  if (!value) {
    return '';
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const baseUrl = apiBaseUrl.replace(/\/$/, '');
  const path = value.startsWith('/') ? value : `/${value}`;
  return `${baseUrl}${path}`;
}
</script>

<template>
  <section class="section users-azure-page inventory-dashboard inventory-azure-page">
    <header class="users-azure-header inventory-azure-header">
      <div class="users-title-block">
        <p class="eyebrow">QR Inventory</p>
        <h1>QR Envanteri</h1>
        <p>{{ currentOrganizationLabel }} içindeki QR noktalarını, durumlarını ve okutma geçmişini yönet.</p>
      </div>

      <div class="users-header-actions">
        <button v-if="canManageQr" class="button primary users-create-button" type="button" @click="openCreateModal">
          <span class="users-plus-icon" aria-hidden="true"></span>
          Yeni QR
        </button>
        <button class="button users-refresh-button" type="button" @click="refresh">Yenile</button>
      </div>
    </header>

    <p v-if="pageMessage" class="success-text users-page-message">{{ pageMessage }}</p>

    <div class="inventory-toolbar users-directory-panel">
      <label class="inventory-search-field">
        <span aria-hidden="true"></span>
        <input v-model="searchTerm" type="text" placeholder="QR kodu, token veya lokasyon ara..." />
      </label>

      <div class="inventory-filter-grid">
        <label v-if="canSelectOrganization" class="inventory-select-card">
          <span>Kurum</span>
          <select v-model="selectedOrganizationId">
            <option value="ALL">Tüm kurumlar</option>
            <option v-for="organization in organizationOptions" :key="organization.id" :value="organization.id">
              {{ organization.name }}
            </option>
          </select>
        </label>

        <label class="inventory-select-card">
          <span>Kat</span>
          <select v-model="floorFilter">
            <option value="ALL">Tümü</option>
            <option v-for="floor in floorOptions" :key="floor" :value="floor">{{ floor }}</option>
          </select>
        </label>

        <label class="inventory-select-card">
          <span>Durum</span>
          <select v-model="statusFilter">
            <option value="ALL">Tüm durumlar</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Pasif</option>
          </select>
        </label>

        <label class="inventory-select-card">
          <span>Tur</span>
          <select v-model="typeFilter">
            <option value="ALL">Tüm tipler</option>
            <option v-for="type in typeOptions" :key="type" :value="type">{{ type }}</option>
          </select>
        </label>

        <label class="inventory-select-card">
          <span>Seçili kayıt</span>
          <select v-model="selectedQrId">
            <option v-for="qr in filteredQrCodes" :key="qr.id" :value="qr.id">{{ qr.label }}</option>
          </select>
        </label>
      </div>
    </div>

    <div class="inventory-stats users-stat-grid">
      <article class="inventory-stat-card users-stat-card tone-blue">
        <span>Toplam QR</span>
        <strong>{{ stats.total }}</strong>
        <small>Aktif ve pasif tüm kayıtlar</small>
      </article>
      <article class="inventory-stat-card users-stat-card tone-green">
        <span>Aktif</span>
        <strong>{{ stats.active }}</strong>
        <small>Talep akışı açık noktalar</small>
      </article>
      <article class="inventory-stat-card users-stat-card tone-violet">
        <span>Pasif</span>
        <strong>{{ stats.inactive }}</strong>
        <small>Revizyon veya kapalı kayıtlar</small>
      </article>
      <article class="inventory-stat-card users-stat-card tone-amber">
        <span>Toplam okutma</span>
        <strong>{{ stats.scans }}</strong>
        <small>Kayıtlı okutma kaydı toplamı</small>
      </article>
    </div>

    <div v-if="pending" class="inventory-empty-state panel">
      <p>QR envanteri yükleniyor...</p>
    </div>

    <div v-else-if="error" class="inventory-empty-state panel error-panel">
      <p>QR kodları alınamadı.</p>
    </div>

    <div v-else class="inventory-layout">
      <section class="inventory-table-card">
        <div class="inventory-table-head">
          <div>
            <h2>QR Kayıtları</h2>
            <p>{{ filteredQrCodes.length }} kayıt listeleniyor</p>
          </div>
          <NuxtLink
            v-if="selectedQrId"
            class="button"
            :to="`/admin/qrs/${selectedQrId}`"
          >
            Tam detaya git
          </NuxtLink>
        </div>

        <div class="table-wrap inventory-table-wrap">
          <table class="inventory-table">
            <thead>
              <tr>
                <th>QR kodu</th>
                <th>Lokasyon</th>
                <th>Tur</th>
                <th>Durum</th>
                <th>Okutma</th>
                <th>Son işlem</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="qr in filteredQrCodes"
                :key="qr.id"
                class="inventory-row"
                :class="{ 'is-selected': selectedQrId === qr.id }"
                @click="selectQr(qr.id)"
              >
                <td>
                  <div class="inventory-code">
                    <strong>#{{ qr.label }}</strong>
                    <span class="inventory-subline">{{ qr.token }}</span>
                  </div>
                </td>
                <td>
                  <strong>{{ qr.location.name }}</strong>
                  <span class="inventory-subline">
                    {{ qr.location.organization?.name ? `${qr.location.organization.name} · ` : '' }}{{ qr.location.code }}
                  </span>
                </td>
                <td>
                  <span class="status-pill subtle">{{ qr.location.type }}</span>
                </td>
                <td>
                  <span class="qr-token" :class="{ inactive: !qr.isActive }">
                    {{ qr.isActive ? 'Aktif' : 'Pasif' }}
                  </span>
                </td>
                <td>{{ qr.scanCount }}</td>
                <td>{{ formatDate(qr.lastScannedAt ?? qr.updatedAt) }}</td>
              </tr>

              <tr v-if="filteredQrCodes.length === 0">
                <td colspan="6">
                  <div class="inventory-empty-state">
                    <p>Filtrelere uyan QR kaydı yok.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <aside class="inventory-side-panel">
        <div class="inventory-panel-header">
          <div>
            <p class="eyebrow">Seçili QR</p>
            <h2>Detay paneli</h2>
          </div>
          <button class="button small" type="button" @click="refreshSelection">Yenile</button>
        </div>

        <div v-if="!selectedSummary" class="inventory-empty-state">
          <p>Soldaki listeden bir QR kaydı seç.</p>
        </div>

        <template v-else>
          <section class="inventory-preview-card">
            <div class="inventory-preview-frame">
              <img
                v-if="selectedPreviewImageUrl"
                :src="selectedPreviewImageUrl"
                :alt="selectedPreviewAlt"
                @error="previewImageFailed = true"
              />
              <div v-else class="inventory-preview-placeholder">
                <strong>{{ selectedSummary.token }}</strong>
                <span>QR hazirlaniyor</span>
              </div>
            </div>
            <span class="inventory-preview-plate">ID: #{{ selectedSummary.label }}</span>
          </section>

          <div v-if="qrDetailPending" class="inventory-note">
            <p>Seçili kayıt detayları yükleniyor...</p>
          </div>

          <div v-else-if="qrDetailError" class="inventory-note error-panel">
            <p>Seçili QR detayı alınamadı.</p>
          </div>

          <template v-else>
            <section class="inventory-detail-grid">
              <article class="inventory-meta-card">
                <span>Lokasyon</span>
                <strong>{{ selectedSummary.location.name }}</strong>
                <small class="inventory-meta-subvalue">
                  {{ selectedSummary.location.organization?.name ?? currentOrganizationLabel }}
                </small>
              </article>
              <article class="inventory-meta-card">
                <span>Kod / Tur</span>
                <strong class="inventory-meta-value">{{ selectedSummary.location.code }}</strong>
                <small class="inventory-meta-subvalue">{{ selectedSummary.location.type }}</small>
              </article>
              <article class="inventory-meta-card">
                <span>Durum</span>
                <strong>{{ selectedSummary.isActive ? 'Aktif' : 'Pasif' }}</strong>
              </article>
              <article class="inventory-meta-card">
                <span>Okutma</span>
                <strong>{{ selectedSummary.scanCount }}</strong>
              </article>
            </section>

            <section class="inventory-url-card">
              <span class="inventory-label">Yonlendirme URL</span>
              <div class="inventory-url-box">
                <code>{{ publicQrUrl }}</code>
                <button class="button small" type="button" @click="copyPublicQrUrl">Kopyala</button>
              </div>
              <p v-if="copyMessage" class="inventory-copy-feedback">{{ copyMessage }}</p>
            </section>

            <section class="inventory-meta-card">
              <span>Son işlemler</span>
              <div v-if="scanLogsPending" class="inventory-note">
                <p>Okutma kayıtları yükleniyor...</p>
              </div>
              <div v-else-if="scanLogsError" class="inventory-note error-panel">
                <p>Log bilgisi alınamadı.</p>
              </div>
              <div v-else class="inventory-activity-list">
                <article v-for="log in recentLogs" :key="log.id" class="inventory-activity-item">
                  <strong>{{ log.status }}</strong>
                  <span>{{ formatDate(log.scannedAt) }}</span>
                  <p>{{ log.requestId ? `Request: ${log.requestId}` : 'İstek oluşturulmamış.' }}</p>
                </article>
                <article v-if="recentLogs.length === 0" class="inventory-activity-item">
                  <strong>Henuz log yok</strong>
                  <p>Bu QR için okutulma geçmişi kaydedilmemiş.</p>
                </article>
              </div>
            </section>

            <section class="inventory-action-stack">
              <div class="inventory-action-row">
                <a class="button" :href="publicQrUrl" target="_blank" rel="noreferrer">QR önizleme</a>
                <NuxtLink class="button" :to="`/admin/qrs/${selectedSummary.id}`">Tam detay</NuxtLink>
              </div>

              <div v-if="canManageQr" class="inventory-action-row">
                <button
                  class="button approve"
                  type="button"
                  :disabled="selectedSummary.isActive || Boolean(actionLoading)"
                  @click="setActiveState('activate')"
                >
                  {{ actionLoading === 'activate' ? 'Aktif ediliyor...' : 'Aktife al' }}
                </button>
                <button
                  class="button danger"
                  type="button"
                  :disabled="!selectedSummary.isActive || Boolean(actionLoading)"
                  @click="setActiveState('deactivate')"
                >
                  {{ actionLoading === 'deactivate' ? 'Pasife aliniyor...' : 'Pasife al' }}
                </button>
              </div>

              <p v-if="actionError" class="error-text">{{ actionError }}</p>
              <p v-if="actionMessage" class="success-text">{{ actionMessage }}</p>
            </section>
          </template>
        </template>
      </aside>
    </div>

    <div v-if="isCreateModalOpen" class="users-modal-backdrop" role="presentation" @click.self="closeCreateModal">
      <section class="users-create-modal inventory-create-modal" role="dialog" aria-modal="true" aria-labelledby="createQrTitle">
        <header class="users-modal-header">
          <div>
            <p class="eyebrow">Yeni QR</p>
            <h2 id="createQrTitle">QR kaydı oluştur</h2>
          </div>
          <button class="users-modal-close" type="button" aria-label="Kapat" @click="closeCreateModal"></button>
        </header>

        <form class="users-modal-form inventory-create-form" @submit.prevent="submitQr">
          <label>
            <span>Lokasyon</span>
            <select id="qrLocation" v-model="qrForm.locationId" :disabled="!canSubmitQr || locationTreePending">
              <option v-if="!locationOptions.length" value="">Seçilebilir lokasyon yok</option>
              <option v-for="location in locationOptions" :key="location.id" :value="location.id">
                {{ location.label }}
              </option>
            </select>
          </label>

          <div class="users-modal-grid">
            <label>
              <span>Etiket</span>
              <input
                id="qrLabel"
                v-model="qrForm.label"
                type="text"
                maxlength="160"
                placeholder="Deneme C - Oda 101"
                :disabled="!canSubmitQr"
                required
              />
            </label>

            <label>
              <span>Token</span>
              <input
                id="qrToken"
                v-model="qrForm.token"
                type="text"
                maxlength="160"
                placeholder="deneme-c-room-101"
                :disabled="!canSubmitQr"
                required
              />
            </label>
          </div>

          <div class="users-modal-grid">
            <label>
              <span>Gorsel yolu</span>
              <input
                id="qrImagePath"
                v-model="qrForm.imagePath"
                type="text"
                maxlength="240"
                placeholder="Opsiyonel"
                :disabled="!canSubmitQr"
              />
            </label>

            <label>
              <span>Durum</span>
              <select v-model="qrForm.isActive" :disabled="!canSubmitQr">
                <option :value="true">Aktif</option>
                <option :value="false">Pasif</option>
              </select>
            </label>
          </div>

          <label>
            <span>Not</span>
            <textarea
              id="qrNote"
              v-model="qrForm.note"
              maxlength="1000"
              placeholder="Opsiyonel açıklama"
              :disabled="!canSubmitQr"
            />
          </label>

          <p v-if="canSelectOrganization && !activeOrganizationId" class="info-text">
            QR oluşturmak için önce tek bir kurum seç.
          </p>
          <p v-else-if="locationTreePending" class="info-text">Lokasyon seçenekleri yükleniyor...</p>
          <p v-else-if="locationTreeError" class="error-text">Lokasyon listesi alınamadı.</p>
          <p v-else-if="!locationOptions.length" class="info-text">
            Önce bu kurum için lokasyon ekle, sonra QR bağla.
          </p>
          <p v-if="formError" class="error-text">{{ formError }}</p>
          <p v-if="formMessage" class="success-text">{{ formMessage }}</p>

          <div class="users-modal-actions">
            <button class="button small" type="button" :disabled="formSubmitting" @click="refreshLocationTree">
              Lokasyonlari yenile
            </button>
            <button class="button small" type="button" :disabled="formSubmitting" @click="closeCreateModal">
              Vazgec
            </button>
            <button class="button primary" type="submit" :disabled="formSubmitting || !canSubmitQr">
              {{ formSubmitting ? 'Oluşturuluyor...' : 'Oluştur' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </section>
</template>
