<script setup lang="ts">
import { TaskStatus } from '@lbrtw/shared';

interface TaskDetail {
  id: string;
  status: TaskStatus;
  assignedTo: string | null;
  completedBy: string | null;
  approvedBy: string | null;
  rejectedBy: string | null;
  createdAt: string;
  completedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  location: {
    name: string;
    code: string;
    type: string;
  };
  request: {
    id: string;
    requestText: string;
    channel: string;
    createdAt: string;
    qrCode: {
      token: string;
      label: string;
    };
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

const { data, pending, error, refresh } = await useAsyncData<ApiResponse<TaskDetail>>(
  `task-${id.value}`,
  () => useApiFetch<ApiResponse<TaskDetail>>(`/tasks/${encodeURIComponent(id.value)}`)
);

const task = computed(() => data.value?.data ?? null);
const history = computed(() => task.value?.history ?? []);
const errorMessage = computed(() => getApiErrorMessage(error.value, 'Task bulunamadı veya alınamadı.'));

function getApiErrorMessage(err: unknown, fallback: string) {
  if (!err || typeof err !== 'object') {
    return fallback;
  }

  const errorWithData = err as {
    data?: {
      message?: string | string[];
      error?: string;
    };
    message?: string;
  };
  const message = errorWithData.data?.message;

  if (Array.isArray(message)) {
    return message.join(' ');
  }

  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  if (typeof errorWithData.data?.error === 'string' && errorWithData.data.error.trim()) {
    return errorWithData.data.error;
  }

  if (typeof errorWithData.message === 'string' && errorWithData.message.trim()) {
    return errorWithData.message;
  }

  return fallback;
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
    actionError.value = getApiErrorMessage(err, 'Task güncellenemedi.');
  } finally {
    actionLoading.value = '';
  }
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
      <h1>Task bulunamadı</h1>
      <p>{{ errorMessage }}</p>
      <button class="button" type="button" @click="refresh()">Tekrar dene</button>
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
            <dt>Reddeden</dt>
            <dd>{{ task.rejectedBy ?? '-' }}</dd>
          </div>
          <div>
            <dt>Tamamlandı</dt>
            <dd>{{ formatDate(task.completedAt) }}</dd>
          </div>
          <div>
            <dt>Onaylandı</dt>
            <dd>{{ formatDate(task.approvedAt) }}</dd>
          </div>
          <div>
            <dt>Reddedildi</dt>
            <dd>{{ formatDate(task.rejectedAt) }}</dd>
          </div>
        </dl>
      </section>

      <section class="panel">
        <p class="eyebrow">Talep</p>
        <h2>{{ task.location.name }}</h2>
        <p>{{ task.request.requestText }}</p>
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
        <p class="eyebrow">Status history</p>
        <p v-if="history.length === 0" class="muted">Henüz history kaydı yok.</p>
        <table v-else>
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
            <tr v-for="item in history" :key="item.id">
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

    <div v-else class="panel error-panel">
      <h1>Task detayı alınamadı</h1>
      <p>API cevabı beklenen formatta değil.</p>
      <button class="button" type="button" @click="refresh()">Tekrar dene</button>
    </div>
  </section>
</template>
