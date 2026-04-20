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

const MAX_IMAGE_UPLOADS = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

const route = useRoute();
const token = computed(() => String(route.params.token ?? ''));
const requestText = ref('');
const transcriptText = ref('');
const liveTranscript = ref('');
const submitError = ref('');
const successMessage = ref('');
const mediaError = ref('');
const voiceStatus = ref('');
const submitting = ref(false);
const isRecording = ref(false);
const speechSupported = ref(false);
const selectedImages = ref<File[]>([]);
const imagePreviews = ref<Array<{ name: string; size: string; url: string }>>([]);
const audioFile = ref<File | null>(null);
const audioUrl = ref('');

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: BlobPart[] = [];
let audioStream: MediaStream | null = null;
let recognition: SpeechRecognitionLike | null = null;

const { data, pending, error, refresh } = await useAsyncData(
  `public-qr-${token.value}`,
  () => useApiFetch<ApiResponse<PublicQr>>(`/public/qr/${encodeURIComponent(token.value)}`)
);

const canSubmit = computed(
  () =>
    Boolean(requestText.value.trim()) ||
    Boolean(transcriptText.value.trim()) ||
    Boolean(audioFile.value) ||
    selectedImages.value.length > 0
);

onMounted(() => {
  speechSupported.value = Boolean(getSpeechRecognitionConstructor());
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
    submitError.value = 'Talep metni, ses kaydı veya fotoğraf eklemelisin.';
    return;
  }

  const body = new FormData();
  body.append('token', token.value);
  body.append('channel', RequestChannel.QR_WEB);

  if (requestText.value.trim()) {
    body.append('requestText', requestText.value.trim());
  }

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

    successMessage.value = `Talebin alındı. Task ID: ${response.taskId}`;
    requestText.value = '';
    transcriptText.value = '';
    liveTranscript.value = '';
    clearSelectedImages();
    clearAudio();
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : 'Talep gönderilemedi.';
  } finally {
    submitting.value = false;
  }
}

async function startVoiceInput() {
  mediaError.value = '';
  voiceStatus.value = '';

  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    mediaError.value = 'Bu tarayıcı ses kaydı desteklemiyor.';
    return;
  }

  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
    mediaError.value = 'Mikrofon izni alınamadı.';
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
    voiceStatus.value = 'Speech-to-text desteklenmiyor; ses kaydı yine de alınacak.';
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

      if (!requestText.value.trim()) {
        requestText.value = finalText;
      }
    }
  };
  recognition.onerror = (event) => {
    voiceStatus.value = event.error
      ? `Speech-to-text hatası: ${event.error}`
      : 'Speech-to-text tamamlanamadı; ses kaydı saklanacak.';
  };
  recognition.onend = () => {
    liveTranscript.value = '';
  };

  try {
    recognition.start();
    voiceStatus.value = 'Dinleniyor. Konuşma metne çevrilebilirse aşağıya düşecek.';
  } catch {
    voiceStatus.value = 'Speech-to-text başlatılamadı; ses kaydı yine de alınacak.';
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
    mediaError.value = 'Ses kaydı 10 MB sınırını aşamaz.';
    audioFile.value = null;
    return;
  }

  const extension = mimeType.includes('mp4') ? 'm4a' : 'webm';
  audioFile.value = new File([blob], `request-audio-${Date.now()}.${extension}`, { type: mimeType });
  audioUrl.value = URL.createObjectURL(blob);
  voiceStatus.value = 'Ses kaydı hazır.';
}

function clearAudio() {
  audioFile.value = null;
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

function handleImageChange(event: Event) {
  mediaError.value = '';
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);

  if (files.length > MAX_IMAGE_UPLOADS) {
    mediaError.value = `En fazla ${MAX_IMAGE_UPLOADS} fotoğraf seçebilirsin.`;
    input.value = '';
    return;
  }

  const acceptedImages: File[] = [];

  for (const file of files) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      mediaError.value = 'Sadece jpeg, png veya webp fotoğraf yüklenebilir.';
      input.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      mediaError.value = 'Her fotoğraf en fazla 5 MB olabilir.';
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

function appendTranscriptToRequest() {
  const transcript = transcriptText.value.trim();

  if (!transcript) {
    return;
  }

  requestText.value = requestText.value.trim()
    ? `${requestText.value.trim()}\n${transcript}`
    : transcript;
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
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

      <section class="inline-section">
        <div class="inline-heading">
          <div>
            <p class="eyebrow">Ses</p>
            <h2>Konuşarak anlat</h2>
          </div>
          <span class="muted">{{ speechSupported ? 'Speech-to-text destekleniyor' : 'Ses kaydı desteklenirse alınır' }}</span>
        </div>

        <div class="form-actions">
          <button
            v-if="!isRecording"
            class="button secondary"
            type="button"
            :disabled="submitting"
            @click="startVoiceInput"
          >
            Mikrofonu başlat
          </button>
          <button v-else class="button danger" type="button" @click="stopVoiceInput">
            Kaydı durdur
          </button>
          <button class="button" type="button" :disabled="!audioFile" @click="clearAudio">
            Ses kaydını sil
          </button>
        </div>

        <p v-if="voiceStatus" class="info-text">{{ voiceStatus }}</p>
        <p v-if="liveTranscript" class="muted">Canlı metin: {{ liveTranscript }}</p>

        <label for="transcriptText">Transcript</label>
        <textarea
          id="transcriptText"
          v-model="transcriptText"
          rows="3"
          placeholder="Konuşma metni burada görünebilir veya elle yazılabilir"
          :disabled="submitting"
        />

        <div class="form-actions">
          <button class="button" type="button" :disabled="!transcriptText.trim()" @click="appendTranscriptToRequest">
            Transcripti talebe ekle
          </button>
        </div>

        <audio v-if="audioUrl" class="audio-player" :src="audioUrl" controls />
      </section>

      <section class="inline-section">
        <p class="eyebrow">Fotoğraf</p>
        <label for="images">Fotoğraf yükle</label>
        <input
          id="images"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          :disabled="submitting"
          @change="handleImageChange"
        />
        <p class="muted">En fazla 5 fotoğraf, dosya başına 5 MB.</p>

        <div v-if="imagePreviews.length" class="media-preview-grid">
          <article v-for="(image, index) in imagePreviews" :key="image.url" class="media-preview-item">
            <img :src="image.url" :alt="image.name" />
            <div>
              <strong>{{ image.name }}</strong>
              <span class="muted">{{ image.size }}</span>
            </div>
            <button class="button small" type="button" @click="removeImage(index)">Sil</button>
          </article>
        </div>
      </section>

      <div class="form-actions">
        <button class="button primary" type="submit" :disabled="submitting || !canSubmit">
          {{ submitting ? 'Gönderiliyor...' : 'Talebi gönder' }}
        </button>
      </div>

      <p v-if="mediaError" class="error-text">{{ mediaError }}</p>
      <p v-if="submitError" class="error-text">{{ submitError }}</p>
      <p v-if="successMessage" class="success-text">{{ successMessage }}</p>
    </form>
  </section>
</template>
