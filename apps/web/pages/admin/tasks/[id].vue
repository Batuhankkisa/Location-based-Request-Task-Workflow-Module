<script setup lang="ts">
import { Role, TaskStatus } from '@lbrtw/shared';

definePageMeta({
  middleware: 'admin-auth',
  roles: [Role.ADMIN, Role.SUPERVISOR, Role.STAFF]
});

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
    organization?: {
      id: string;
      name: string;
      code: string;
    };
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

type TaskActionId = 'start' | 'complete' | 'approve' | 'reject';

type ActionCard = {
  id: TaskActionId;
  label: string;
  helper: string;
  tone: 'navy' | 'success' | 'danger';
};

const auth = useAuth();
const route = useRoute();
const id = computed(() => String(route.params.id ?? ''));
const note = ref('');
const actionError = ref('');
const actionMessage = ref('');
const actionLoading = ref('');
const selectedAction = ref<TaskActionId | ''>('');
const noteInput = ref<HTMLTextAreaElement | null>(null);
const apiBaseUrl = useApiBaseUrl();

const { data, pending, error, refresh } = await useAsyncData(`task-${id.value}`, () =>
  useApiFetch<ApiResponse<TaskDetail>>(`/tasks/${encodeURIComponent(id.value)}`)
);

const task = computed(() => data.value?.data);
const requestMedia = computed(() => task.value?.request.media ?? []);
const imageMedia = computed(() => requestMedia.value.filter((item) => item.type === 'IMAGE'));
const audioMedia = computed(() => requestMedia.value.filter((item) => item.type === 'AUDIO'));
const primaryAudioUrl = computed(() => task.value?.request.audioFileUrl ?? audioMedia.value[0]?.fileUrl ?? '');
const currentUser = computed(() => auth.user.value);
const canApprove = computed(() => auth.hasRole(Role.ADMIN, Role.SUPERVISOR));

const requestSummary = computed(() => parseStructuredRequest(task.value?.request.requestText ?? ''));
const statusMeta = computed(() => getStatusMeta(task.value?.status));
const availableActions = computed<ActionCard[]>(() => {
  if (!task.value) {
    return [];
  }

  if (task.value.status === TaskStatus.NEW) {
    return [
      {
        id: 'start',
        label: 'Goreve Basla',
        helper: 'Talebi uzerine al',
        tone: 'navy'
      }
    ];
  }

  if (task.value.status === TaskStatus.IN_PROGRESS) {
    return [
      {
        id: 'complete',
        label: 'Is Bitti',
        helper: 'Gorevi onaya gonder',
        tone: 'success'
      }
    ];
  }

  if (task.value.status === TaskStatus.DONE_WAITING_APPROVAL && canApprove.value) {
    return [
      {
        id: 'approve',
        label: 'Onayla',
        helper: 'Gorevi kapat',
        tone: 'success'
      },
      {
        id: 'reject',
        label: 'Reddet',
        helper: 'Revizyona gonder',
        tone: 'danger'
      }
    ];
  }

  return [];
});

watch(
  availableActions,
  (actions) => {
    if (!actions.find((action) => action.id === selectedAction.value)) {
      selectedAction.value = actions[0]?.id ?? '';
    }
  },
  { immediate: true }
);

function parseStructuredRequest(value: string) {
  const lines = value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

  let category = 'Genel Talep';
  let title = 'Operasyon talebi';
  const descriptionLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('Kategori:')) {
      category = line.replace('Kategori:', '').trim() || category;
      continue;
    }

    if (line.startsWith('Baslik:')) {
      title = line.replace('Baslik:', '').trim() || title;
      continue;
    }

    if (line.startsWith('Aciklama:')) {
      descriptionLines.push(line.replace('Aciklama:', '').trim());
      continue;
    }

    descriptionLines.push(line);
  }

  return {
    category,
    title,
    description: descriptionLines.join('\n').trim() || value
  };
}

function getStatusMeta(status?: TaskStatus) {
  switch (status) {
    case TaskStatus.NEW:
      return {
        kicker: 'Acik Gorev',
        label: 'Yeni task hazir',
        helper: 'Talep siraya alindi'
      };
    case TaskStatus.IN_PROGRESS:
      return {
        kicker: 'Sahada',
        label: 'Islem devam ediyor',
        helper: 'Gorev aktif sekilde suruyor'
      };
    case TaskStatus.DONE_WAITING_APPROVAL:
      return {
        kicker: 'Onay Bekliyor',
        label: 'Yonetici aksiyonu gerekli',
        helper: 'Supervisor veya admin onayi bekleniyor'
      };
    case TaskStatus.APPROVED:
      return {
        kicker: 'Kapandi',
        label: 'Gorev onaylandi',
        helper: 'Akis tamamlandi'
      };
    case TaskStatus.REJECTED:
      return {
        kicker: 'Revizyon',
        label: 'Gorev reddedildi',
        helper: 'Not ile tekrar ele alinmali'
      };
    default:
      return {
        kicker: 'Gorev',
        label: 'Durum okunamadi',
        helper: 'Aksiyon bilgisi bekleniyor'
      };
  }
}

function focusNote() {
  noteInput.value?.focus();
}

async function submitSelectedAction() {
  if (!selectedAction.value) {
    actionError.value = 'Bu durum icin gonderilecek bir aksiyon yok.';
    return;
  }

  await runAction(selectedAction.value);
}

async function runAction(action: TaskActionId) {
  actionError.value = '';
  actionMessage.value = '';
  actionLoading.value = action;

  try {
    await useApiFetch<ApiResponse<TaskDetail>>(`/tasks/${id.value}/${action}`, {
      method: 'PATCH',
      body: {
        note: note.value
      }
    });

    actionMessage.value = 'Gorev durumu guncellendi.';
    note.value = '';
    await refresh();
  } catch (requestError) {
    actionError.value = getApiErrorMessage(requestError, 'Gorev guncellenemedi.');
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
  <section class="mobile-flow task-update-flow">
    <div class="mobile-shell task-update-shell">
      <header class="mobile-hero task-hero">
        <div class="mobile-hero-row">
          <NuxtLink class="mobile-back" to="/admin/tasks">Geri</NuxtLink>
        </div>

        <div v-if="task" class="task-status-chip">
          <span class="task-status-dot" />
          <strong>{{ statusMeta.kicker }}</strong>
        </div>

        <div>
          <h1>Gorevi Guncelle</h1>
          <p>{{ statusMeta.helper }}</p>
        </div>
      </header>

      <div v-if="pending" class="mobile-card mobile-state-card">
        <p>Gorev detayi yukleniyor...</p>
      </div>

      <div v-else-if="error" class="mobile-card error-panel mobile-state-card">
        <h2>Gorev bulunamadi</h2>
        <p>Istenen gorev kaydi acilamadi.</p>
      </div>

      <div v-else-if="task" class="task-update-layout">
        <aside class="task-side-stack">
          <section class="mobile-card task-summary-card">
            <div class="task-summary-grid">
              <div>
                <span>Konum</span>
                <strong>{{ task.location.name }}</strong>
                <small>{{ task.location.organization?.name ?? '-' }}</small>
              </div>
              <div>
                <span>Kategori</span>
                <strong>{{ requestSummary.category }}</strong>
              </div>
              <div>
                <span>Durum</span>
                <strong>{{ statusMeta.label }}</strong>
              </div>
              <div>
                <span>Atanan</span>
                <strong>{{ task.assignedTo ?? currentUser?.fullName ?? '-' }}</strong>
              </div>
            </div>

            <div class="task-request-brief">
              <strong>{{ requestSummary.title }}</strong>
              <p>{{ requestSummary.description }}</p>
            </div>
          </section>

          <section class="mobile-card task-history-card">
            <div class="section-heading">
              <p class="eyebrow">Gecmis</p>
              <h2>Status akisi</h2>
            </div>

            <div class="task-history-list">
              <article v-for="item in task.history" :key="item.id" class="task-history-item">
                <strong>{{ item.toStatus }}</strong>
                <span>{{ formatDate(item.createdAt) }}</span>
                <p>{{ item.note ?? item.changedBy ?? 'Not yok' }}</p>
              </article>
            </div>
          </section>
        </aside>

        <div class="task-main-stack">
          <section class="mobile-card task-action-zone">
            <div class="section-heading">
              <p class="eyebrow">Aksiyon Secin</p>
              <h2>Gorev durumu</h2>
            </div>

            <div class="task-action-grid">
              <button
                v-for="action in availableActions"
                :key="action.id"
                type="button"
                class="task-action-card"
                :class="[
                  `tone-${action.tone}`,
                  { 'is-selected': selectedAction === action.id, 'is-busy': actionLoading === action.id }
                ]"
                @click="selectedAction = action.id"
              >
                <strong>{{ action.label }}</strong>
                <span>{{ action.helper }}</span>
              </button>

              <button type="button" class="task-action-card tone-note" @click="focusNote">
                <strong>Not Ekle</strong>
                <span>Aciklama ya da revizyon notu yaz</span>
              </button>
            </div>
          </section>

          <section class="mobile-card task-note-card">
            <label for="note">Not / Aciklama</label>
            <textarea
              id="note"
              ref="noteInput"
              v-model="note"
              rows="5"
              placeholder="Yapilan islem, eksik malzeme veya ek aciklama..."
            />
          </section>

          <section
            v-if="requestMedia.length || task.request.transcriptText || primaryAudioUrl"
            class="mobile-card task-media-card"
          >
            <div class="section-heading">
              <p class="eyebrow">Ekler</p>
              <h2>Talep medyasi</h2>
            </div>

            <p v-if="task.request.transcriptText" class="task-transcript-copy">{{ task.request.transcriptText }}</p>

            <audio v-if="primaryAudioUrl" class="audio-player" :src="mediaUrl(primaryAudioUrl)" controls />

            <div v-if="imageMedia.length" class="request-photo-grid">
              <a
                v-for="image in imageMedia"
                :key="image.id"
                :href="mediaUrl(image.fileUrl)"
                target="_blank"
                rel="noreferrer"
                class="request-photo-card request-photo-link"
              >
                <img :src="mediaUrl(image.fileUrl)" :alt="image.originalName ?? 'Talep fotografi'" />
                <div>
                  <strong>{{ image.originalName ?? 'Talep fotografi' }}</strong>
                  <span>{{ formatDate(image.createdAt) }}</span>
                </div>
              </a>
            </div>
          </section>

          <section class="mobile-card task-submit-card">
            <button
              class="request-submit-button"
              type="button"
              :disabled="!selectedAction || Boolean(actionLoading)"
              @click="submitSelectedAction"
            >
              {{ actionLoading ? 'Durum gonderiliyor...' : 'Durumu Gonder' }}
            </button>

            <p v-if="actionError" class="error-text">{{ actionError }}</p>
            <p v-if="actionMessage" class="success-text">{{ actionMessage }}</p>
          </section>
        </div>
      </div>
    </div>
  </section>
</template>
