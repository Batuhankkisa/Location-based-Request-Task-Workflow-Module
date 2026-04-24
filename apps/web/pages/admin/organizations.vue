<script setup lang="ts">
import { OrganizationType, Role } from '@lbrtw/shared';

definePageMeta({
  middleware: 'admin-auth',
  roles: [Role.ADMIN]
});

interface OrganizationItem {
  id: string;
  name: string;
  code: string;
  type: OrganizationType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    users: number;
    locations: number;
  };
}

const form = reactive({
  name: '',
  code: '',
  type: OrganizationType.HOSPITAL
});
const submitting = ref(false);
const formError = ref('');
const formMessage = ref('');

const typeOptions = Object.values(OrganizationType);

const { data, pending, error, refresh } = await useAsyncData('organizations', () =>
  useApiFetch<ApiResponse<OrganizationItem[]>>('/organizations')
);

const organizations = computed(() => data.value?.data ?? []);
const summaryCards = computed(() => [
  {
    label: 'Toplam kurum',
    value: organizations.value.length,
    detail: 'Platformda tanimli tenant sayisi.',
    tone: 'indigo'
  },
  {
    label: 'Aktif kurum',
    value: organizations.value.filter((organization) => organization.isActive).length,
    detail: 'Operasyonel olarak acik kuruluslar.',
    tone: 'teal'
  },
  {
    label: 'Toplam kullanici',
    value: organizations.value.reduce((total, organization) => total + organization._count.users, 0),
    detail: 'Kurumlara atanmis hesaplar.',
    tone: 'amber'
  },
  {
    label: 'Toplam lokasyon',
    value: organizations.value.reduce((total, organization) => total + organization._count.locations, 0),
    detail: 'Tum kurumlarda kayitli alanlar.',
    tone: 'rose'
  }
]);
const spotlightOrganizations = computed(() => organizations.value.slice(0, 4));

async function submit() {
  formError.value = '';
  formMessage.value = '';
  submitting.value = true;

  try {
    await useApiFetch<ApiResponse<OrganizationItem>>('/organizations', {
      method: 'POST',
      body: {
        name: form.name,
        code: form.code,
        type: form.type
      }
    });

    form.name = '';
    form.code = '';
    form.type = OrganizationType.HOSPITAL;
    formMessage.value = 'Kurum olusturuldu.';
    await refresh();
  } catch (requestError) {
    formError.value = getApiErrorMessage(requestError, 'Kurum olusturulamadi.');
  } finally {
    submitting.value = false;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}
</script>

<template>
  <section class="section workspace-shell">
    <header class="workspace-hero workspace-hero-organizations">
      <div class="workspace-title-block">
        <p class="eyebrow">Multi-organization</p>
        <h1>Kurumlar</h1>
        <p class="lead">
          Kurum portfoyunu, her kurumdaki kullanici yogunlugunu ve lokasyon kapsamini tek ekranda yonet.
        </p>
      </div>

      <div class="workspace-actions">
        <button class="button secondary" type="button" @click="refresh">Yenile</button>
      </div>
    </header>

    <div class="workspace-metrics-grid">
      <article
        v-for="card in summaryCards"
        :key="card.label"
        class="metric-card"
        :class="`tone-${card.tone}`"
      >
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
        <p>{{ card.detail }}</p>
      </article>
    </div>

    <div class="workspace-grid workspace-grid-wide">
      <section class="panel workspace-form-card">
        <div class="workspace-card-head">
          <div>
            <p class="eyebrow">Yeni kurum</p>
            <h2>Kurum olustur</h2>
          </div>
          <span class="workspace-badge">Blueprint baslangici</span>
        </div>

        <p class="workspace-card-copy">
          Yeni tenant acildiginda kurumun kok lokasyonu otomatik olusur ve sonrasinda lokasyon, QR ve kullanici
          akislari bu kurum scope'unda devam eder.
        </p>

        <form class="workspace-form-stack" @submit.prevent="submit">
          <div>
            <label for="organizationName">Kurum adi</label>
            <input
              id="organizationName"
              v-model="form.name"
              type="text"
              maxlength="160"
              placeholder="Ozel Hastane C"
              required
            />
          </div>

          <div>
            <label for="organizationCode">Kod</label>
            <input
              id="organizationCode"
              v-model="form.code"
              type="text"
              maxlength="80"
              placeholder="HOSPITAL_C"
              required
            />
          </div>

          <div>
            <label for="organizationType">Tur</label>
            <select id="organizationType" v-model="form.type">
              <option v-for="type in typeOptions" :key="type" :value="type">{{ type }}</option>
            </select>
          </div>

          <div class="form-actions">
            <button class="button primary" type="submit" :disabled="submitting">
              {{ submitting ? 'Olusturuluyor...' : 'Kurumu kaydet' }}
            </button>
          </div>

          <p v-if="formError" class="error-text">{{ formError }}</p>
          <p v-if="formMessage" class="success-text">{{ formMessage }}</p>
        </form>
      </section>

      <section class="panel workspace-aside-card">
        <div class="workspace-card-head">
          <div>
            <p class="eyebrow">Portfoy gorunumu</p>
            <h2>En yogun kurumlar</h2>
          </div>
        </div>

        <div class="workspace-stack-list">
          <article
            v-for="organization in spotlightOrganizations"
            :key="organization.id"
            class="workspace-list-card"
          >
            <div>
              <NuxtLink class="organization-link" :to="`/admin/locations?organizationId=${organization.id}`">
                <strong>{{ organization.name }}</strong>
              </NuxtLink>
              <span>{{ organization.code }} · {{ organization.type }}</span>
            </div>
            <div class="workspace-chip-row">
              <span class="status-pill" :class="{ approved: organization.isActive, rejected: !organization.isActive }">
                {{ organization.isActive ? 'Aktif' : 'Pasif' }}
              </span>
              <span class="auth-chip">{{ organization._count.users }} kullanici</span>
              <span class="auth-chip">{{ organization._count.locations }} lokasyon</span>
            </div>
          </article>

          <article v-if="spotlightOrganizations.length === 0" class="workspace-empty-card">
            <strong>Henuz kurum yok</strong>
            <p>Soldaki form ile ilk kurumu olusturup lokasyon ve QR agacina gecebilirsin.</p>
          </article>
        </div>
      </section>
    </div>

    <section class="panel workspace-table-card">
      <div class="workspace-table-header">
        <div>
          <p class="eyebrow">Kurum listesi</p>
          <h2>Kayitli organizationlar</h2>
          <p class="workspace-card-copy">
            Her kurum satirindan kullanici, task, QR ve lokasyon yonetim ekranlarina dogrudan gecis yapabilirsin.
          </p>
        </div>
      </div>

      <div v-if="pending" class="workspace-empty-card">
        <p>Kurumlar yukleniyor...</p>
      </div>

      <div v-else-if="error" class="workspace-empty-card error-panel">
        <p>Kurumlar alinamadi.</p>
      </div>

      <div v-else class="table-wrap workspace-table-wrap">
        <table class="workspace-table organizations-table">
          <thead>
            <tr>
              <th>Kurum</th>
              <th>Tur</th>
              <th>Durum</th>
              <th>Kullanicilar</th>
              <th>Lokasyonlar</th>
              <th>Olusturulma</th>
              <th>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="organization in organizations" :key="organization.id">
              <td>
                <div class="workspace-cell-stack">
                  <NuxtLink class="organization-link" :to="`/admin/locations?organizationId=${organization.id}`">
                    <strong>{{ organization.name }}</strong>
                  </NuxtLink>
                  <span>{{ organization.code }}</span>
                </div>
              </td>
              <td><span class="auth-chip">{{ organization.type }}</span></td>
              <td>
                <span class="status-pill" :class="{ approved: organization.isActive, rejected: !organization.isActive }">
                  {{ organization.isActive ? 'Aktif' : 'Pasif' }}
                </span>
              </td>
              <td>{{ organization._count.users }}</td>
              <td>{{ organization._count.locations }}</td>
              <td>{{ formatDate(organization.createdAt) }}</td>
              <td>
                <div class="workspace-chip-row">
                  <NuxtLink class="button small" :to="`/admin/users?organizationId=${organization.id}`">
                    Kullanicilar
                  </NuxtLink>
                  <NuxtLink class="button small" :to="`/admin/tasks?organizationId=${organization.id}`">
                    Tasklar
                  </NuxtLink>
                  <NuxtLink class="button small" :to="`/admin/qrs?organizationId=${organization.id}`">
                    QR yonet
                  </NuxtLink>
                  <NuxtLink class="button small" :to="`/admin/locations?organizationId=${organization.id}`">
                    Lokasyon yonet
                  </NuxtLink>
                </div>
              </td>
            </tr>

            <tr v-if="organizations.length === 0">
              <td colspan="7">Henuz organization yok.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
