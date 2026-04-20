<script setup lang="ts">
import { TaskStatus } from '@lbrtw/shared';

interface TaskMedia {
  id: string;
  type: 'IMAGE' | 'AUDIO';
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  originalName: string | null;
  createdAt: string;
}

interface TaskDetail {
  id: string;
  status: TaskStatus;
  assignedTo: string | null;
  completedBy: string | null;
  approvedBy: string | null;
  createdAt: string;
  completedAt: string | null;
  approvedAt: string | null;
  location: {
    name: string;
    code: string;
    type: string;
  };
  request: {
    id: string;
    requestText: string;
    transcriptText: string | null;
    audioFileUrl: string | null;
    channel: string;
    createdAt: string;
    qrCode: {
      token: string;
      label: string;
    };
    media: TaskMedia[];
  };
  history: Array<{
    id: string;
    fromStatus: TaskStatus | null;
    toStatus: TaskStatus;
    note: string | null;
    changedBy: string | null;
    createdAt: string;
  }>;
}

const route = useRoute();
const id = computed(() => String(route.params.id ?? ''));
const changedBy = ref('Demo Personel');
const note = ref('');
const actionError = ref('');
const actionMessage = ref('');
const actionLoading = ref('');
const apiBaseUrl = useApiBaseUrl();

const { data, pending, error, refresh } = await useAsyncData(
  `task-${id.value}`,
  () => useApiFetch<ApiResponse<TaskDetail>>(`/tasks/${encodeURIComponent(id.value)}`)
);

const task = computed(() => data.value?.data);
const requestMedia = computed(() => task.value?.request.media ?? []);
const imageMedia = computed(() => requestMedia.value.filter((item) => item.type === 'IMAGE'));
const audioMedia = computed(() => requestMedia.value.filter((item) => item.type === 'AUDIO'));
const primaryAudioUrl = computed(() => task.value?.request.audioFileUrl ?? audioMedia.value[0]?.fileUrl ?? '');

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

async function runAction(action: 'start' | 'complete' | 'approve' | 'reject') {
  actionError.value = '';
  actionMessage.value = '';
  actionLoading.value = action;

  try {
    await useApiFetch<ApiResponse<TaskDetail>>(`/tasks/${id.value}/${action}`, {
      method: 'PATCH',
      body: {
        changedBy: changedBy.value,
        assignedTo: changedBy.value,
        note: note.value
      }
    });

    actionMessage.value = 'Task güncellendi.';
    note.value = '';
    await refresh();
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Task güncellenemedi.';
  } finally {
    actionLoading.value = '';
  }
}

function mediaUrl(fileUrl: string) {
  if (/^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }

  const baseUrl = apiBaseUrl.replace(/\/$/, '');
  const path = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
  return `${baseUrl}${path}`;
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
</script>

<template>
  <section class="section">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Task detayı</p>
        <h1>{{ task?.location.name ?? 'Task' }}</h1>
      </div>
      <NuxtLink class="button" to="/admin/tasks">Listeye dön</NuxtLink>
    </div>

    <div v-if="pending" class="panel">
      <p>Task detayı yükleniyor...</p>
    </div>

    <div v-else-if="error" class="panel error-panel">
      <p>Task bulunamadı.</p>
    </div>

    <div v-else-if="task" class="detail-grid">
      <section class="panel">
        <p class="eyebrow">Durum</p>
        <h2><span class="status-pill">{{ task.status }}</span></h2>
        <dl class="definition-list">
          <div>
            <dt>Oluşturuldu</dt>
            <dd>{{ formatDate(task.createdAt) }}</dd>
          </div>
          <div>
            <dt>Atanan</dt>
            <dd>{{ task.assignedTo ?? '-' }}</dd>
          </div>
          <div>
            <dt>Tamamlayan</dt>
            <dd>{{ task.completedBy ?? '-' }}</dd>
          </div>
          <div>
            <dt>Onaylayan</dt>
            <dd>{{ task.approvedBy ?? '-' }}</dd>
          </div>
          <div>
            <dt>Tamamlandı</dt>
            <dd>{{ formatDate(task.completedAt) }}</dd>
          </div>
          <div>
            <dt>Onaylandı</dt>
            <dd>{{ formatDate(task.approvedAt) }}</dd>
          </div>
        </dl>
      </section>

      <section class="panel">
        <p class="eyebrow">Talep</p>
        <h2>{{ task.location.name }}</h2>
        <p>{{ task.request.requestText }}</p>

        <div v-if="task.request.transcriptText" class="request-media-block">
          <h3>Transcript</h3>
          <p>{{ task.request.transcriptText }}</p>
        </div>

        <div v-if="primaryAudioUrl" class="request-media-block">
          <h3>Ses kaydı</h3>
          <audio class="audio-player" :src="mediaUrl(primaryAudioUrl)" controls />
        </div>

        <div v-if="imageMedia.length" class="request-media-block">
          <h3>Fotoğraflar</h3>
          <div class="admin-media-grid">
            <a
              v-for="image in imageMedia"
              :key="image.id"
              :href="mediaUrl(image.fileUrl)"
              target="_blank"
              rel="noreferrer"
              class="admin-media-image"
            >
              <img :src="mediaUrl(image.fileUrl)" :alt="image.originalName ?? 'Talep fotoğrafı'" />
            </a>
          </div>
        </div>

        <p v-if="!task.request.transcriptText && !requestMedia.length" class="muted">
          Bu talepte medya veya transcript yok.
        </p>
        <p class="muted">
          {{ task.location.code }} · {{ task.location.type }} · {{ task.request.qrCode.token }}
        </p>
      </section>

      <section class="panel action-panel">
        <p class="eyebrow">Aksiyon</p>
        <label for="changedBy">İşlem yapan</label>
        <input id="changedBy" v-model="changedBy" type="text" />

        <label for="note">Not</label>
        <textarea id="note" v-model="note" rows="3" placeholder="Opsiyonel not" />

        <div class="button-row">
          <button
            class="button primary"
            type="button"
            :disabled="task.status !== TaskStatus.NEW || Boolean(actionLoading)"
            @click="runAction('start')"
          >
            {{ actionLoading === 'start' ? 'Başlatılıyor...' : 'Başlat' }}
          </button>
          <button
            class="button primary"
            type="button"
            :disabled="task.status !== TaskStatus.IN_PROGRESS || Boolean(actionLoading)"
            @click="runAction('complete')"
          >
            {{ actionLoading === 'complete' ? 'Tamamlanıyor...' : 'Tamamla' }}
          </button>
          <button
            class="button approve"
            type="button"
            :disabled="task.status !== TaskStatus.DONE_WAITING_APPROVAL || Boolean(actionLoading)"
            @click="runAction('approve')"
          >
            {{ actionLoading === 'approve' ? 'Onaylanıyor...' : 'Onayla' }}
          </button>
          <button
            class="button danger"
            type="button"
            :disabled="task.status !== TaskStatus.DONE_WAITING_APPROVAL || Boolean(actionLoading)"
            @click="runAction('reject')"
          >
            {{ actionLoading === 'reject' ? 'Reddediliyor...' : 'Reddet' }}
          </button>
        </div>

        <p v-if="actionError" class="error-text">{{ actionError }}</p>
        <p v-if="actionMessage" class="success-text">{{ actionMessage }}</p>
      </section>

      <section class="panel full-span">
        <p class="eyebrow">Medya metadata</p>
        <table>
          <thead>
            <tr>
              <th>Tip</th>
              <th>Dosya</th>
              <th>MIME</th>
              <th>Boyut</th>
              <th>Yüklendi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in requestMedia" :key="item.id">
              <td>{{ item.type }}</td>
              <td>
                <a :href="mediaUrl(item.fileUrl)" target="_blank" rel="noreferrer">
                  {{ item.originalName ?? item.fileUrl }}
                </a>
              </td>
              <td>{{ item.mimeType }}</td>
              <td>{{ formatBytes(item.fileSize) }}</td>
              <td>{{ formatDate(item.createdAt) }}</td>
            </tr>
            <tr v-if="requestMedia.length === 0">
              <td colspan="5">Medya dosyası yok.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="panel full-span">
        <p class="eyebrow">Status history</p>
        <table>
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Önce</th>
              <th>Sonra</th>
              <th>İşlem yapan</th>
              <th>Not</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in task.history" :key="item.id">
              <td>{{ formatDate(item.createdAt) }}</td>
              <td>{{ item.fromStatus ?? '-' }}</td>
              <td>{{ item.toStatus }}</td>
              <td>{{ item.changedBy ?? '-' }}</td>
              <td>{{ item.note ?? '-' }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </section>
</template>
