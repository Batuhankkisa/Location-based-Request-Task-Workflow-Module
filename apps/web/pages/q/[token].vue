<script setup lang="ts">
import { RequestChannel } from '@lbrtw/shared';

interface PublicQr {
  id: string;
  token: string;
  label: string;
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
const apiBaseUrl = useApiBaseUrl();
const qrData = ref<ApiResponse<PublicQr> | null>(null);
const requestText = ref('');
const loadError = ref('');
const submitError = ref('');
const successMessage = ref('');
const micHint = ref('');
const submitting = ref(false);
const pending = ref(true);

async function loadQr() {
  pending.value = true;
  loadError.value = '';
  qrData.value = null;

  try {
    qrData.value = await $fetch<ApiResponse<PublicQr>>(
      `/public/qr/${encodeURIComponent(token.value)}`,
      { baseURL: apiBaseUrl }
    );
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'QR bilgisi alinamadi.';
  } finally {
    pending.value = false;
  }
}

onMounted(loadQr);
watch(token, loadQr);

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
        channel: RequestChannel.QR_WEB
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
    <button v-if="loadError" class="button" type="button" @click="loadQr">Tekrar dene</button>

    <div v-if="pending" class="panel">
      <p>QR bilgisi yükleniyor...</p>
    </div>

    <div v-else-if="loadError" class="panel error-panel">
      <h1>QR bulunamadı</h1>
      <p>Token geçersiz ya da pasif olabilir.</p>
      <p class="muted">{{ loadError }}</p>
    </div>

    <form v-else-if="qrData?.data" class="panel request-form" @submit.prevent="submitRequest">
      <p class="eyebrow">Public talep</p>
      <h1>{{ qrData.data.location.name }}</h1>
      <p class="muted">{{ qrData.data.label }} · {{ qrData.data.location.code }}</p>

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

    <div v-else class="panel error-panel">
      <h1>QR bilgisi alinamadi</h1>
      <p>API cevabi beklenen formatta degil. Lutfen API'nin calistigini ve seed verinin yuklendigini kontrol et.</p>
    </div>
  </section>
</template>
