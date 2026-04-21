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
const id = computed(() => String(route.params.id ?? ''));
const actionLoading = ref('');
const actionError = ref('');
const actionMessage = ref('');
const imageFailed = ref(false);
const canManageQr = computed(() => auth.hasRole(Role.ADMIN));

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
            <dd>{{ qr.location.name }} · {{ qr.location.code }}</dd>
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
        <h2>QR asset</h2>
        <p v-if="qr.imagePath">
          <a :href="qr.imagePath" target="_blank" rel="noreferrer">{{ qr.imagePath }}</a>
        </p>
        <div v-if="qr.imagePath && !imageFailed" class="qr-preview-frame">
          <img :src="qr.imagePath" alt="QR gorsel onizleme" @error="imageFailed = true" />
        </div>
        <p v-else class="muted">
          {{ qr.imagePath ? 'Gorsel dosyasi henuz public klasore eklenmemis.' : 'Gorsel yolu tanimli degil.' }}
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
