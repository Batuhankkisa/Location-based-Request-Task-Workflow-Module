<script setup lang="ts">
interface TaskListItem {
  id: string;
  status: string;
  createdAt: string;
  location: {
    name: string;
    code: string;
  };
  request: {
    requestText: string;
    channel: string;
  };
}

const { data, pending, error, refresh } = await useAsyncData('tasks', () =>
  useApiFetch<ApiResponse<TaskListItem[]>>('/tasks')
);

const tasks = computed(() => data.value?.data ?? []);

function formatDate(value: string) {
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
        <p class="eyebrow">Operasyon</p>
        <h1>Task listesi</h1>
      </div>
      <button class="button" type="button" @click="refresh">Yenile</button>
    </div>

    <div v-if="pending" class="panel">
      <p>Tasklar yükleniyor...</p>
    </div>

    <div v-else-if="error" class="panel error-panel">
      <p>Tasklar alınamadı.</p>
    </div>

    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Oluşturulma tarihi</th>
            <th>Lokasyon</th>
            <th>Talep metni</th>
            <th>Durum</th>
            <th>Aksiyon</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in tasks" :key="task.id">
            <td>{{ formatDate(task.createdAt) }}</td>
            <td>
              <strong>{{ task.location.name }}</strong>
              <span class="muted">{{ task.location.code }}</span>
            </td>
            <td>{{ task.request.requestText }}</td>
            <td><span class="status-pill">{{ task.status }}</span></td>
            <td>
              <NuxtLink class="button small" :to="`/admin/tasks/${task.id}`">Detay</NuxtLink>
            </td>
          </tr>
          <tr v-if="tasks.length === 0">
            <td colspan="5">Henüz task yok.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
