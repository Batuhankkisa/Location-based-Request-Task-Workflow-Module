<script setup lang="ts">
import { Role } from '@lbrtw/shared';

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
  };
}

interface QrCodeDetail extends QrCodeListItem {
  location: {
    id: string;
    name: string;
    code: string;
    type: string;
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

const auth = useAuth();
const requestUrl = useRequestURL();
const apiBaseUrl = useApiBaseUrl();
const searchTerm = ref('');
const statusFilter = ref<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
const typeFilter = ref('ALL');
const floorFilter = ref('ALL');
const selectedQrId = ref('');
const actionLoading = ref('');
const actionError = ref('');
const actionMessage = ref('');
const copyMessage = ref('');

const canManageQr = computed(() => auth.hasRole(Role.ADMIN));
const { data, pending, error, refresh } = await useAsyncData('qr-codes', () =>
  useApiFetch<ApiResponse<QrCodeListItem[]>>('/qr-codes')
);

const qrCodes = computed(() => data.value?.data ?? []);

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
      : `${item.label} ${item.token} ${item.location.name} ${item.location.code}`
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
const recentLogs = computed(() => selectedLogs.value.slice(0, 4));

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

async function refreshSelection() {
  if (!selectedQrId.value) {
    return;
  }

  await Promise.all([refreshQrDetail(), refreshScanLogs()]);
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

    actionMessage.value = action === 'activate' ? 'QR tekrar aktif edildi.' : 'QR pasife alindi.';
    await refresh();
    await refreshSelection();
  } catch (requestError) {
    actionError.value = getApiErrorMessage(requestError, 'QR durumu guncellenemedi.');
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
    copyMessage.value = 'Kopyalama basarisiz oldu.';
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
  <section class="inventory-dashboard">
    <header class="inventory-hero">
      <div>
        <p class="eyebrow">Envanter</p>
        <h1>QR Envanteri ve Lokasyon Veritabani</h1>
        <p class="lead">
          Tum tesis genelindeki QR noktalarini yonet, durumlarini takip et ve secili kaydi aninda incele.
        </p>
      </div>

      <button class="button primary" type="button" @click="refresh">Kayitlari yenile</button>
    </header>

    <div class="inventory-toolbar">
      <label class="inventory-search-field">
        <span>Ara</span>
        <input v-model="searchTerm" type="text" placeholder="QR kodu, token veya lokasyon ara..." />
      </label>

      <div class="inventory-filter-grid">
        <label class="inventory-select-card">
          <span>Kat</span>
          <select v-model="floorFilter">
            <option value="ALL">Tumu</option>
            <option v-for="floor in floorOptions" :key="floor" :value="floor">{{ floor }}</option>
          </select>
        </label>

        <label class="inventory-select-card">
          <span>Durum</span>
          <select v-model="statusFilter">
            <option value="ALL">Tum durumlar</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Pasif</option>
          </select>
        </label>

        <label class="inventory-select-card">
          <span>Tur</span>
          <select v-model="typeFilter">
            <option value="ALL">Tum tipler</option>
            <option v-for="type in typeOptions" :key="type" :value="type">{{ type }}</option>
          </select>
        </label>

        <label class="inventory-select-card">
          <span>Secili kayit</span>
          <select v-model="selectedQrId">
            <option v-for="qr in filteredQrCodes" :key="qr.id" :value="qr.id">{{ qr.label }}</option>
          </select>
        </label>
      </div>
    </div>

    <div class="inventory-stats">
      <article class="inventory-stat-card">
        <span>Toplam QR</span>
        <strong>{{ stats.total }}</strong>
        <p>Platformdaki tum aktif ve pasif kayitlar.</p>
      </article>
      <article class="inventory-stat-card">
        <span>Aktif</span>
        <strong>{{ stats.active }}</strong>
        <p>Talep akisini canli tasiyan QR noktalar.</p>
      </article>
      <article class="inventory-stat-card">
        <span>Pasif</span>
        <strong>{{ stats.inactive }}</strong>
        <p>Revizyon veya kapatma bekleyen kayitlar.</p>
      </article>
      <article class="inventory-stat-card">
        <span>Toplam okutma</span>
        <strong>{{ stats.scans }}</strong>
        <p>Kayitli scan log adetlerinin toplami.</p>
      </article>
    </div>

    <div v-if="pending" class="inventory-empty-state panel">
      <p>QR envanteri yukleniyor...</p>
    </div>

    <div v-else-if="error" class="inventory-empty-state panel error-panel">
      <p>QR kodlari alinamadi.</p>
    </div>

    <div v-else class="inventory-layout">
      <section class="inventory-table-card">
        <div class="inventory-table-head">
          <div>
            <h2>QR Kayitlari</h2>
            <p>{{ filteredQrCodes.length }} kayit listeleniyor</p>
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
                <th>Son islem</th>
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
                  <span class="inventory-subline">{{ qr.location.code }}</span>
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
                    <p>Filtrelere uyan QR kaydi yok.</p>
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
            <p class="eyebrow">Secili QR</p>
            <h2>Detay paneli</h2>
          </div>
          <button class="button small" type="button" @click="refreshSelection">Yenile</button>
        </div>

        <div v-if="!selectedSummary" class="inventory-empty-state">
          <p>Soldaki listeden bir QR kaydi sec.</p>
        </div>

        <template v-else>
          <section class="inventory-preview-card">
            <div class="inventory-preview-frame">
              <img
                v-if="selectedQr?.imagePath"
                :src="assetUrl(selectedQr.imagePath)"
                :alt="`${selectedSummary.label} gorseli`"
              />
              <div v-else class="inventory-preview-placeholder">
                <strong>{{ selectedSummary.token }}</strong>
              </div>
            </div>
            <span class="inventory-preview-plate">ID: #{{ selectedSummary.label }}</span>
          </section>

          <div v-if="qrDetailPending" class="inventory-note">
            <p>Secili kayit detaylari yukleniyor...</p>
          </div>

          <div v-else-if="qrDetailError" class="inventory-note error-panel">
            <p>Secili QR detayi alinamadi.</p>
          </div>

          <template v-else>
            <section class="inventory-detail-grid">
              <article class="inventory-meta-card">
                <span>Lokasyon</span>
                <strong>{{ selectedSummary.location.name }}</strong>
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
              <span>Son islemler</span>
              <div v-if="scanLogsPending" class="inventory-note">
                <p>Scan loglar yukleniyor...</p>
              </div>
              <div v-else-if="scanLogsError" class="inventory-note error-panel">
                <p>Log bilgisi alinamadi.</p>
              </div>
              <div v-else class="inventory-activity-list">
                <article v-for="log in recentLogs" :key="log.id" class="inventory-activity-item">
                  <strong>{{ log.status }}</strong>
                  <span>{{ formatDate(log.scannedAt) }}</span>
                  <p>{{ log.requestId ? `Request: ${log.requestId}` : 'Istek olusturulmamis.' }}</p>
                </article>
                <article v-if="recentLogs.length === 0" class="inventory-activity-item">
                  <strong>Henuz log yok</strong>
                  <p>Bu QR icin okutulma gecmisi kaydedilmemis.</p>
                </article>
              </div>
            </section>

            <section class="inventory-action-stack">
              <div class="inventory-action-row">
                <a class="button" :href="publicQrUrl" target="_blank" rel="noreferrer">QR onizleme</a>
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
  </section>
</template>
