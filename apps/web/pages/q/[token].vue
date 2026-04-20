<script setup lang="ts">
import { RequestChannel } from '@lbrtw/shared';

interface PublicQr {
  id: string;
  token: string;
  label: string;
  imagePath?: string | null;
  scanLogId?: string;
  location: {
    id: string;
    name: string;
    code: string;
    type: string;
  };
}

interface CreateRequestResponse {
  success: boolean;
  requestId: string;
  taskId: string;
}

const route = useRoute();
const token = computed(() => String(route.params.token ?? ''));
const requestText = ref('');
const submitError = ref('');
const successMessage = ref('');
const micHint = ref('');
const submitting = ref(false);

const { data, pending, error, refresh } = await useAsyncData(
  `public-qr-${token.value}`,
  () => useApiFetch<ApiResponse<PublicQr>>(`/public/qr/${encodeURIComponent(token.value)}`)
);

async function submitRequest() {
  submitError.value = '';
  successMessage.value = '';

  if (!requestText.value.trim()) {
    submitError.value = 'Talep metni boş olamaz.';
    return;
  }

  submitting.value = true;
  try {
    const response = await useApiFetch<CreateRequestResponse>('/public/requests', {
      method: 'POST',
      body: {
        token: token.value,
        requestText: requestText.value,
        channel: RequestChannel.QR_WEB,
        scanLogId: data.value?.data.scanLogId
      }
    });

    successMessage.value = `Talebin alındı. Task ID: ${response.taskId}`;
    requestText.value = '';
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : 'Talep gönderilemedi.';
  } finally {
    submitting.value = false;
  }
}

function showMicHint() {
  micHint.value = 'Mikrofon ile metne çevirme bu MVP’de hazır bir yer tutucu olarak duruyor.';
}
</script>

<template>
  <section class="section narrow">
    <button v-if="error" class="button" type="button" @click="refresh">Tekrar dene</button>

    <div v-if="pending" class="panel">
      <p>QR bilgisi yükleniyor...</p>
    </div>

    <div v-else-if="error" class="panel error-panel">
      <h1>QR bulunamadı</h1>
      <p>Token geçersiz ya da pasif olabilir.</p>
    </div>

    <form v-else-if="data?.data" class="panel request-form" @submit.prevent="submitRequest">
      <p class="eyebrow">Public talep</p>
      <h1>{{ data.data.location.name }}</h1>
      <p class="muted">{{ data.data.label }} · {{ data.data.location.code }}</p>

      <label for="requestText">Talebin</label>
      <textarea
        id="requestText"
        v-model="requestText"
        rows="6"
        placeholder="Örn: Havlu istiyorum"
        :disabled="submitting"
      />

      <div class="form-actions">
        <button class="button secondary" type="button" @click="showMicHint">Mikrofon</button>
        <button class="button primary" type="submit" :disabled="submitting">
          {{ submitting ? 'Gönderiliyor...' : 'Talebi gönder' }}
        </button>
      </div>

      <p v-if="micHint" class="info-text">{{ micHint }}</p>
      <p v-if="submitError" class="error-text">{{ submitError }}</p>
      <p v-if="successMessage" class="success-text">{{ successMessage }}</p>
    </form>
  </section>
</template>
