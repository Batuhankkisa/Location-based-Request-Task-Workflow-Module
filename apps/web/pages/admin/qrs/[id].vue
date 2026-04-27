<script setup lang="ts">
import { Role } from '@lbrtw/shared';

definePageMeta({
  middleware: 'admin-auth',
  roles: [Role.ADMIN, Role.SUPERVISOR]
});

interface QrCodeDetail {
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
    id: string;
    name: string;
    code: string;
    type: string;
    organization?: {
      id: string;
      name: string;
      code: string;
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
  resolvedLocation: {
    name: string;
    code: string;
  } | null;
}

const auth = useAuth();
const route = useRoute();
const requestUrl = useRequestURL();
const apiBaseUrl = useApiBaseUrl();
const id = computed(() => String(route.params.id ?? ''));
const actionLoading = ref('');
const actionError = ref('');
const actionMessage = ref('');
const imageFailed = ref(false);
const canManageQr = computed(() => auth.hasRole(Role.ADMIN, Role.SUPERVISOR));

const {
  data: qrData,
  pending: qrPending,
  error: qrError,
  refresh: refreshQr
} = await useAsyncData(`qr-code-${id.value}`, () =>
  useApiFetch<ApiResponse<QrCodeDetail>>(`/qr-codes/${encodeURIComponent(id.value)}`)
);

const {
  data: logsData,
  pending: logsPending,
  error: logsError,
  refresh: refreshLogs
} = await useAsyncData(`qr-code-logs-${id.value}`, () =>
  useApiFetch<ApiResponse<QrScanLog[]>>(`/qr-codes/${encodeURIComponent(id.value)}/scan-logs`)
);

const qr = computed(() => qrData.value?.data);
const logs = computed(() => logsData.value?.data ?? []);
const publicQrUrl = computed(() => {
  if (!qr.value) {
    return '';
  }

  return `${requestUrl.origin.replace(/\/$/, '')}/q/${qr.value.token}`;
});
const { dataUrl: generatedQrPreviewUrl } = useQrPreviewDataUrl(publicQrUrl);
const qrImagePath = computed(() => qr.value?.imagePath ?? null);
const qrPreviewImageUrl = computed(() => {
  if (qrImagePath.value && !imageFailed.value) {
    return assetUrl(qrImagePath.value);
  }

  return generatedQrPreviewUrl.value;
});

watch(qrImagePath, () => {
  imageFailed.value = false;
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

async function setActiveState(action: 'activate' | 'deactivate') {
  actionError.value = '';
  actionMessage.value = '';
  actionLoading.value = action;

  try {
    await useApiFetch<ApiResponse<QrCodeDetail>>(`/qr-codes/${id.value}/${action}`, {
      method: 'PATCH'
    });

    actionMessage.value = action === 'activate' ? 'QR aktif edildi.' : 'QR pasife alindi.';
    await refreshQr();
    await refreshLogs();
  } catch (error) {
    actionError.value = getApiErrorMessage(error, 'QR durumu guncellenemedi.');
  } finally {
    actionLoading.value = '';
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
  <section class="section">
    <div class="page-heading">
      <div>
        <p class="eyebrow">QR detayi</p>
        <h1>{{ qr?.label ?? 'QR' }}</h1>
      </div>
      <NuxtLink class="button" to="/admin/qrs">QR listesine don</NuxtLink>
    </div>

    <div v-if="qrPending" class="panel">
      <p>QR detayi yukleniyor...</p>
    </div>

    <div v-else-if="qrError" class="panel error-panel">
      <p>QR kodu bulunamadi.</p>
    </div>

    <div v-else-if="qr" class="detail-grid">
      <section class="panel">
        <p class="eyebrow">Metadata</p>
        <h2>
          <span class="qr-token" :class="{ inactive: !qr.isActive }">
            {{ qr.isActive ? 'Aktif' : 'Pasif' }}
          </span>
        </h2>
        <dl class="definition-list">
          <div>
            <dt>Token</dt>
            <dd>{{ qr.token }}</dd>
          </div>
          <div>
            <dt>Lokasyon</dt>
            <dd>
              {{ qr.location.organization?.name ? `${qr.location.organization.name} · ` : '' }}{{ qr.location.name }}
              · {{ qr.location.code }}
            </dd>
          </div>
          <div>
            <dt>Kullanim sayisi</dt>
            <dd>{{ qr.scanCount }}</dd>
          </div>
          <div>
            <dt>Son kullanim</dt>
            <dd>{{ formatDate(qr.lastScannedAt) }}</dd>
          </div>
          <div>
            <dt>Olusturuldu</dt>
            <dd>{{ formatDate(qr.createdAt) }}</dd>
          </div>
          <div>
            <dt>Guncellendi</dt>
            <dd>{{ formatDate(qr.updatedAt) }}</dd>
          </div>
          <div>
            <dt>Pasife alinma</dt>
            <dd>{{ formatDate(qr.deactivatedAt) }}</dd>
          </div>
          <div>
            <dt>Not</dt>
            <dd>{{ qr.note ?? '-' }}</dd>
          </div>
        </dl>

        <div v-if="canManageQr" class="button-row qr-action-row">
          <button
            class="button approve"
            type="button"
            :disabled="qr.isActive || Boolean(actionLoading)"
            @click="setActiveState('activate')"
          >
            {{ actionLoading === 'activate' ? 'Aktif ediliyor...' : 'Aktif et' }}
          </button>
          <button
            class="button danger"
            type="button"
            :disabled="!qr.isActive || Boolean(actionLoading)"
            @click="setActiveState('deactivate')"
          >
            {{ actionLoading === 'deactivate' ? 'Pasife aliniyor...' : 'Pasife al' }}
          </button>
        </div>

        <p v-if="actionError" class="error-text">{{ actionError }}</p>
        <p v-if="actionMessage" class="success-text">{{ actionMessage }}</p>
      </section>

      <section class="panel">
        <p class="eyebrow">Gorsel</p>
        <h2>QR onizleme</h2>
        <p>
          <a :href="publicQrUrl" target="_blank" rel="noreferrer">{{ publicQrUrl }}</a>
        </p>
        <p v-if="qr.imagePath">
          <a :href="assetUrl(qr.imagePath)" target="_blank" rel="noreferrer">{{ qr.imagePath }}</a>
        </p>
        <div class="qr-preview-frame">
          <img
            v-if="qrPreviewImageUrl"
            :src="qrPreviewImageUrl"
            alt="QR gorsel onizleme"
            @error="imageFailed = true"
          />
          <p v-else class="muted">QR onizlemesi hazirlaniyor.</p>
        </div>
        <p v-if="imageFailed && qr.imagePath" class="muted">
          Kayitli gorsel bulunamadi; public URL icin otomatik QR gosteriliyor.
        </p>
      </section>

      <section class="panel full-span">
        <div class="page-heading">
          <div>
            <p class="eyebrow">Scan log</p>
            <h2>Okutulma gecmisi</h2>
          </div>
          <button class="button" type="button" @click="refreshLogs">Loglari yenile</button>
        </div>

        <div v-if="logsPending">
          <p>Loglar yukleniyor...</p>
        </div>
        <div v-else-if="logsError" class="error-panel panel">
          <p>Loglar alinamadi.</p>
        </div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Status</th>
                <th>Token</th>
                <th>IP</th>
                <th>Lokasyon</th>
                <th>Request</th>
                <th>Task</th>
                <th>Hata</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in logs" :key="log.id">
                <td>{{ formatDate(log.scannedAt) }}</td>
                <td><span class="status-pill">{{ log.status }}</span></td>
                <td>{{ log.tokenSnapshot }}</td>
                <td>{{ log.ip ?? '-' }}</td>
                <td>{{ log.resolvedLocation?.name ?? '-' }}</td>
                <td>{{ log.requestId ?? '-' }}</td>
                <td>{{ log.createdTaskId ?? '-' }}</td>
                <td>{{ log.errorMessage ?? '-' }}</td>
              </tr>
              <tr v-if="logs.length === 0">
                <td colspan="8">Henuz okutulma logu yok.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </section>
</template>
