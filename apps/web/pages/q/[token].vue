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

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: {
    transcript: string;
  };
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

type RequestCategory = {
  id: string;
  label: string;
  helper: string;
};

const REQUEST_CATEGORIES: RequestCategory[] = [
  { id: 'HOUSEKEEPING', label: 'Housekeeping', helper: 'Oda duzeni ve havlu' },
  { id: 'TECHNICAL', label: 'Teknik Servis', helper: 'Ariza ve ekipman' },
  { id: 'SERVICE', label: 'Ikram', helper: 'Yiyecek ve icecek' },
  { id: 'CLEANING', label: 'Temizlik', helper: 'Hizli destek talebi' }
];

const MAX_IMAGE_UPLOADS = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

const route = useRoute();
const token = computed(() => String(route.params.token ?? ''));
const selectedCategoryId = ref(REQUEST_CATEGORIES[0].id);
const requestTitle = ref('');
const requestDescription = ref('');
const transcriptText = ref('');
const liveTranscript = ref('');
const submitError = ref('');
const successMessage = ref('');
const mediaError = ref('');
const voiceStatus = ref('');
const submitting = ref(false);
const isRecording = ref(false);
const speechSupported = ref(false);
const isSecureContextRef = ref(true);
const selectedImages = ref<File[]>([]);
const imagePreviews = ref<Array<{ name: string; size: string; url: string }>>([]);
const audioFile = ref<File | null>(null);
const audioUrl = ref('');
const imageInput = ref<HTMLInputElement | null>(null);

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: BlobPart[] = [];
let audioStream: MediaStream | null = null;
let recognition: SpeechRecognitionLike | null = null;

const { data, pending, error, refresh } = await useAsyncData(`public-qr-${token.value}`, () =>
  useApiFetch<ApiResponse<PublicQr>>(`/public/qr/${encodeURIComponent(token.value)}`)
);

const selectedCategory = computed(
  () => REQUEST_CATEGORIES.find((item) => item.id === selectedCategoryId.value) ?? REQUEST_CATEGORIES[0]
);
const locationLabel = computed(() => data.value?.data.location.name ?? 'Lokasyon');
const canSubmit = computed(
  () =>
    Boolean(requestTitle.value.trim()) ||
    Boolean(requestDescription.value.trim()) ||
    Boolean(transcriptText.value.trim()) ||
    Boolean(audioFile.value) ||
    selectedImages.value.length > 0
);
const composedRequestText = computed(() => {
  const parts = [`Kategori: ${selectedCategory.value.label}`];

  if (requestTitle.value.trim()) {
    parts.push(`Baslik: ${requestTitle.value.trim()}`);
  }

  if (requestDescription.value.trim()) {
    parts.push(`Aciklama: ${requestDescription.value.trim()}`);
  }

  return parts.join('\n');
});

watch(
  () => data.value?.data.location.name,
  (name) => {
    if (name && !requestTitle.value.trim()) {
      requestTitle.value = `${name} icin destek talebi`;
    }
  },
  { immediate: true }
);

onMounted(() => {
  speechSupported.value = Boolean(getSpeechRecognitionConstructor());
  isSecureContextRef.value = typeof window === 'undefined' ? true : window.isSecureContext;
});

onBeforeUnmount(() => {
  stopVoiceInput();
  revokeAudioUrl();
  clearImagePreviews();
});

async function submitRequest() {
  submitError.value = '';
  successMessage.value = '';

  if (!canSubmit.value) {
    submitError.value = 'Talep ozeti, ses kaydi veya fotograf eklemelisin.';
    return;
  }

  const body = new FormData();
  body.append('token', token.value);
  body.append('channel', RequestChannel.QR_WEB);
  body.append('requestText', composedRequestText.value);

  if (transcriptText.value.trim()) {
    body.append('transcriptText', transcriptText.value.trim());
  }

  if (data.value?.data.scanLogId) {
    body.append('scanLogId', data.value.data.scanLogId);
  }

  for (const image of selectedImages.value) {
    body.append('images', image);
  }

  if (audioFile.value) {
    body.append('audio', audioFile.value);
  }

  submitting.value = true;
  try {
    const response = await useApiFetch<CreateRequestResponse>('/public/requests', {
      method: 'POST',
      body
    });

    successMessage.value = `Talebin iletildi. Gorev no: ${response.taskId}`;
    requestDescription.value = '';
    transcriptText.value = '';
    liveTranscript.value = '';
    clearSelectedImages();
    clearAudio();
  } catch (err) {
    submitError.value = getApiErrorMessage(err, 'Talep gonderilemedi.');
  } finally {
    submitting.value = false;
  }
}

async function startVoiceInput() {
  mediaError.value = '';
  voiceStatus.value = '';

  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    mediaError.value = 'Bu tarayici ses kaydi desteklemiyor.';
    return;
  }

  if (typeof window !== 'undefined' && !window.isSecureContext) {
    mediaError.value =
      'Mikrofon izni icin bu sayfayi localhost veya HTTPS uzerinden acmalisin. Telefon/IP uzerinden duz HTTP acildiginda tarayici prompt gostermez.';
    return;
  }

  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    mediaError.value = getMicrophoneErrorMessage(error);
    stopAudioStream();
    return;
  }

  try {
    audioChunks = [];
    mediaRecorder = new MediaRecorder(audioStream, getAudioRecorderOptions());
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    mediaRecorder.onstop = () => {
      const mimeType = mediaRecorder?.mimeType || 'audio/webm';
      const blob = new Blob(audioChunks, { type: mimeType });
      setAudioBlob(blob, mimeType);
      stopAudioStream();
      mediaRecorder = null;
    };

    mediaRecorder.start();
    isRecording.value = true;
    startSpeechRecognition();
  } catch {
    mediaError.value = 'Tarayici mikrofon kaydini baslatamadi. Baska bir ses kayit uygulamasi cihazı kullaniyor olabilir.';
    stopAudioStream();
  }
}

function stopVoiceInput() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }

  stopSpeechRecognition();
  isRecording.value = false;
}

function startSpeechRecognition() {
  const SpeechRecognition = getSpeechRecognitionConstructor();

  if (!SpeechRecognition) {
    voiceStatus.value = 'Speech-to-text desteklenmiyor, ses kaydi yine de alinacak.';
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'tr-TR';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = (event) => {
    const finalParts: string[] = [];
    const interimParts: string[] = [];

    for (let index = 0; index < event.results.length; index += 1) {
      const result = event.results[index];
      const text = result[0]?.transcript?.trim();

      if (!text) {
        continue;
      }

      if (result.isFinal) {
        finalParts.push(text);
      } else {
        interimParts.push(text);
      }
    }

    const finalText = finalParts.join(' ').trim();
    liveTranscript.value = interimParts.join(' ').trim();

    if (finalText) {
      transcriptText.value = finalText;
      if (!requestDescription.value.trim()) {
        requestDescription.value = finalText;
      }
    }
  };
  recognition.onerror = (event) => {
    voiceStatus.value = event.error
      ? `Speech-to-text hatasi: ${event.error}`
      : 'Speech-to-text tamamlanamadi, ses kaydi saklanacak.';
  };
  recognition.onend = () => {
    liveTranscript.value = '';
  };

  try {
    recognition.start();
    voiceStatus.value = 'Dinleniyor. Ses notu da talebe eklenecek.';
  } catch {
    voiceStatus.value = 'Speech-to-text baslatilamadi, ses kaydi yine de alinacak.';
  }
}

function stopSpeechRecognition() {
  if (!recognition) {
    return;
  }

  try {
    recognition.stop();
  } catch {
    // Browser recognition stop can throw if it already ended.
  }

  recognition = null;
}

function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') {
    return null;
  }

  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function getAudioRecorderOptions() {
  if (MediaRecorder.isTypeSupported('audio/webm')) {
    return { mimeType: 'audio/webm' };
  }

  if (MediaRecorder.isTypeSupported('audio/mp4')) {
    return { mimeType: 'audio/mp4' };
  }

  return undefined;
}

function setAudioBlob(blob: Blob, mimeType: string) {
  revokeAudioUrl();

  if (blob.size > MAX_AUDIO_BYTES) {
    mediaError.value = 'Ses kaydi 10 MB sinirini asamaz.';
    audioFile.value = null;
    return;
  }

  const extension = mimeType.includes('mp4') ? 'm4a' : 'webm';
  audioFile.value = new File([blob], `request-audio-${Date.now()}.${extension}`, { type: mimeType });
  audioUrl.value = URL.createObjectURL(blob);
  voiceStatus.value = 'Ses kaydi hazir.';
}

function clearAudio() {
  audioFile.value = null;
  transcriptText.value = '';
  revokeAudioUrl();
}

function revokeAudioUrl() {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);
    audioUrl.value = '';
  }
}

function stopAudioStream() {
  audioStream?.getTracks().forEach((track) => track.stop());
  audioStream = null;
}

function openImagePicker() {
  imageInput.value?.click();
}

function handleImageChange(event: Event) {
  mediaError.value = '';
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);

  if (files.length > MAX_IMAGE_UPLOADS) {
    mediaError.value = `En fazla ${MAX_IMAGE_UPLOADS} fotograf secebilirsin.`;
    input.value = '';
    return;
  }

  const acceptedImages: File[] = [];

  for (const file of files) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      mediaError.value = 'Sadece jpeg, png veya webp yuklenebilir.';
      input.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      mediaError.value = 'Her fotograf en fazla 5 MB olabilir.';
      input.value = '';
      return;
    }

    acceptedImages.push(file);
  }

  clearImagePreviews();
  selectedImages.value = acceptedImages;
  imagePreviews.value = acceptedImages.map((file) => ({
    name: file.name,
    size: formatBytes(file.size),
    url: URL.createObjectURL(file)
  }));
  input.value = '';
}

function removeImage(index: number) {
  const preview = imagePreviews.value[index];
  if (preview) {
    URL.revokeObjectURL(preview.url);
  }

  selectedImages.value.splice(index, 1);
  imagePreviews.value.splice(index, 1);
}

function clearSelectedImages() {
  selectedImages.value = [];
  clearImagePreviews();
}

function clearImagePreviews() {
  imagePreviews.value.forEach((preview) => URL.revokeObjectURL(preview.url));
  imagePreviews.value = [];
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function getMicrophoneErrorMessage(error: unknown) {
  const errorName =
    typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : 'UnknownError';

  if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      return 'Bu adres guvenli degil. Mikrofon icin `http://localhost:3000` veya HTTPS kullanmalisin.';
    }

    return 'Tarayici mikrofon iznini engelledi. Adres cubugundaki kilit veya site ayarlarindan mikrofonu Allow yapip sayfayi yenile.';
  }

  if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
    return 'Kullanilabilir mikrofon bulunamadi.';
  }

  if (errorName === 'NotReadableError' || errorName === 'TrackStartError' || errorName === 'AbortError') {
    return 'Mikrofon su anda baska bir uygulama tarafindan kullaniliyor olabilir.';
  }

  return 'Mikrofon izni alinamadi. Tarayici izinlerini ve baglanti tipini kontrol et.';
}
</script>

<template>
  <section class="mobile-flow request-page">
    <div class="mobile-shell request-shell">
      <header class="mobile-hero">
        <div class="mobile-hero-row">
          <NuxtLink class="mobile-back" to="/">Geri</NuxtLink>
          <span class="mobile-more">...</span>
        </div>

        <div>
          <h1>Talep Olustur</h1>
          <p>QR ile acilan mobil uyumlu web ekrani</p>
        </div>
      </header>

      <button v-if="error" class="button" type="button" @click="refresh">Tekrar dene</button>

      <div v-if="pending" class="mobile-card mobile-state-card">
        <p>QR bilgisi yukleniyor...</p>
      </div>

      <div v-else-if="error" class="mobile-card error-panel mobile-state-card">
        <h2>QR bulunamadi</h2>
        <p>Token gecersiz ya da pasif olabilir.</p>
      </div>

      <form v-else-if="data?.data" class="mobile-request-flow request-flow-layout" @submit.prevent="submitRequest">
        <aside class="request-side-stack">
          <section class="mobile-location-card">
            <div class="mobile-location-pin">O</div>
            <div>
              <strong>Konum: {{ locationLabel }}</strong>
              <span>{{ data.data.location.code }}</span>
            </div>
          </section>

          <section class="mobile-card request-context-card">
            <div class="section-heading">
              <p class="eyebrow">Talep Ozeti</p>
              <h2>{{ selectedCategory.label }}</h2>
            </div>

            <div class="request-context-list">
              <article>
                <span>QR etiketi</span>
                <strong>{{ data.data.label }}</strong>
              </article>
              <article>
                <span>Talep tipi</span>
                <strong>{{ selectedCategory.helper }}</strong>
              </article>
              <article>
                <span>Fotograf</span>
                <strong>{{ selectedImages.length }} adet secildi</strong>
              </article>
              <article>
                <span>Ses notu</span>
                <strong>{{ audioFile ? 'Hazir' : speechSupported ? 'Eklenebilir' : 'Destek yok' }}</strong>
              </article>
            </div>

            <div class="request-help-card">
              <strong>Mikrofon notu</strong>
              <p v-if="isSecureContextRef">
                Desktopta `localhost` veya canli HTTPS adresinde tarayici izin penceresi acilmalidir.
              </p>
              <p v-else>
                Bu sayfa guvenli baglamda acilmadi. Mikrofon sadece `localhost` veya HTTPS adresinde calisir.
              </p>
            </div>
          </section>

          <section class="mobile-info-banner">
            <strong>Bilgi</strong>
            <p>Bu talep ilgili ekibe yonlendirilir. Gerekirse yonetici onayi surece dahil olur.</p>
          </section>
        </aside>

        <div class="request-main-stack">
          <section class="mobile-card request-builder-card">
            <div class="request-builder-section">
              <p class="request-section-label">Talep Turu</p>
              <div class="request-category-grid">
                <button
                  v-for="category in REQUEST_CATEGORIES"
                  :key="category.id"
                  class="request-category-chip"
                  :class="{ 'is-active': selectedCategoryId === category.id }"
                  type="button"
                  @click="selectedCategoryId = category.id"
                >
                  <strong>{{ category.label }}</strong>
                  <span>{{ category.helper }}</span>
                </button>
              </div>
            </div>

            <div class="request-builder-section">
              <label for="requestTitle">Talep Basligi</label>
              <input
                id="requestTitle"
                v-model="requestTitle"
                type="text"
                maxlength="120"
                placeholder="Oda icin kisa talep basligi"
                :disabled="submitting"
              />
            </div>

            <div class="request-builder-section">
              <label for="requestDescription">Talep Aciklamasi</label>
              <textarea
                id="requestDescription"
                v-model="requestDescription"
                rows="5"
                placeholder="Talebi detayli acikla"
                :disabled="submitting"
              />
            </div>

            <div class="request-builder-section">
              <div class="request-media-actions">
                <button
                  class="request-soft-action"
                  type="button"
                  :disabled="submitting"
                  @click="isRecording ? stopVoiceInput() : startVoiceInput()"
                >
                  {{ isRecording ? 'Kaydi Durdur' : 'Sesle Gir' }}
                </button>

                <button class="request-soft-action" type="button" :disabled="submitting" @click="openImagePicker">
                  Fotograf Ekle
                </button>
              </div>

              <input
                ref="imageInput"
                class="request-hidden-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                :disabled="submitting"
                @change="handleImageChange"
              />

              <p v-if="voiceStatus" class="request-inline-note">{{ voiceStatus }}</p>
              <p v-if="liveTranscript" class="request-inline-note">Canli transcript: {{ liveTranscript }}</p>

              <textarea
                v-if="transcriptText || audioFile || isRecording"
                v-model="transcriptText"
                rows="3"
                class="request-transcript"
                placeholder="Ses kaydinin transcripti burada tutulur"
                :disabled="submitting"
              />

              <div v-if="audioUrl" class="request-audio-preview">
                <audio class="audio-player" :src="audioUrl" controls />
                <button class="button small" type="button" @click="clearAudio">Ses kaydini sil</button>
              </div>

              <div v-if="imagePreviews.length" class="request-photo-grid">
                <article v-for="(image, index) in imagePreviews" :key="image.url" class="request-photo-card">
                  <img :src="image.url" :alt="image.name" />
                  <div>
                    <strong>{{ image.name }}</strong>
                    <span>{{ image.size }}</span>
                  </div>
                  <button class="button small" type="button" @click="removeImage(index)">Kaldir</button>
                </article>
              </div>
            </div>
          </section>

          <section class="mobile-card request-submit-card">
            <button class="request-submit-button" type="submit" :disabled="submitting || !canSubmit">
              {{ submitting ? 'Talep iletiliyor...' : 'Talebi Gonder' }}
            </button>

            <p v-if="mediaError" class="error-text">{{ mediaError }}</p>
            <p v-if="submitError" class="error-text">{{ submitError }}</p>
            <p v-if="successMessage" class="success-text">{{ successMessage }}</p>
            <p class="request-footnote">Misafir kullanicisi olarak islem yapiyorsunuz.</p>
          </section>
        </div>
      </form>
    </div>
  </section>
</template>
