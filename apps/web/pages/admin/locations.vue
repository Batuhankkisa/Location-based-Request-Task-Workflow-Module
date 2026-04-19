<script setup lang="ts">
interface QrCodeSummary {
  id: string;
  token: string;
  label: string;
  isActive: boolean;
}

interface LocationNode {
  id: string;
  name: string;
  code: string;
  type: string;
  qrCodes: QrCodeSummary[];
  children: LocationNode[];
}

const { data, pending, error, refresh } = await useAsyncData('locations-tree', () =>
  useApiFetch<ApiResponse<LocationNode[]>>('/locations/tree')
);

const locations = computed(() => data.value?.data ?? []);
</script>

<template>
  <section class="section">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Admin</p>
        <h1>Lokasyonlar</h1>
      </div>
      <button class="button" type="button" @click="refresh">Yenile</button>
    </div>

    <div v-if="pending" class="panel">
      <p>Lokasyonlar yükleniyor...</p>
    </div>

    <div v-else-if="error" class="panel error-panel">
      <p>Lokasyon ağacı alınamadı.</p>
    </div>

    <div v-else class="panel">
      <LocationTree v-if="locations.length" :nodes="locations" />
      <p v-else>Henüz lokasyon yok.</p>
    </div>
  </section>
</template>
