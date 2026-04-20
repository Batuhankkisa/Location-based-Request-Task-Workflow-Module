<script setup lang="ts">
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
    name: string;
    code: string;
    type: string;
  };
}

const { data, pending, error, refresh } = await useAsyncData('qr-codes', () =>
  useApiFetch<ApiResponse<QrCodeListItem[]>>('/qr-codes')
);

const qrCodes = computed(() => data.value?.data ?? []);

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}
</script>

<template>
  <section class="section">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Admin</p>
        <h1>QR kodları</h1>
      </div>
      <button class="button" type="button" @click="refresh">Yenile</button>
    </div>

    <div v-if="pending" class="panel">
      <p>QR kodları yükleniyor...</p>
    </div>

    <div v-else-if="error" class="panel error-panel">
      <p>QR kodları alınamadı.</p>
    </div>

    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Lokasyon</th>
            <th>Token</th>
            <th>Durum</th>
            <th>Kullanım</th>
            <th>Son kullanım</th>
            <th>Oluşturuldu</th>
            <th>Görsel</th>
            <th>Aksiyon</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="qr in qrCodes" :key="qr.id">
            <td>
              <strong>{{ qr.location.name }}</strong>
              <span class="muted">{{ qr.location.code }}</span>
            </td>
            <td><span class="qr-token">{{ qr.token }}</span></td>
            <td>
              <span class="qr-token" :class="{ inactive: !qr.isActive }">
                {{ qr.isActive ? 'Aktif' : 'Pasif' }}
              </span>
              <span v-if="qr.deactivatedAt" class="muted">{{ formatDate(qr.deactivatedAt) }}</span>
            </td>
            <td>{{ qr.scanCount }}</td>
            <td>{{ formatDate(qr.lastScannedAt) }}</td>
            <td>{{ formatDate(qr.createdAt) }}</td>
            <td>
              <a v-if="qr.imagePath" :href="qr.imagePath" target="_blank" rel="noreferrer">
                {{ qr.imagePath }}
              </a>
              <span v-else>-</span>
            </td>
            <td>
              <NuxtLink class="button small" :to="`/admin/qrs/${qr.id}`">Detay</NuxtLink>
            </td>
          </tr>
          <tr v-if="qrCodes.length === 0">
            <td colspan="8">Henüz QR kodu yok.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
