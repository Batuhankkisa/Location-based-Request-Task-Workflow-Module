<script setup lang="ts">
import { LocationType, OrganizationType, Role } from '@lbrtw/shared';

definePageMeta({
  middleware: 'admin-auth',
  roles: [Role.ADMIN, Role.SUPERVISOR]
});

interface OrganizationOption {
  id: string;
  name: string;
  code: string;
  type: OrganizationType;
  isActive: boolean;
}

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

interface LocationOption {
  id: string;
  label: string;
  type: string;
}

const auth = useAuth();
const route = useRoute();
const router = useRouter();
const canSelectOrganization = computed(() => auth.hasRole(Role.ADMIN));
const canManageLocations = computed(() => auth.hasRole(Role.ADMIN, Role.SUPERVISOR));
function readOrganizationIdFromRoute() {
  return typeof route.query.organizationId === 'string' ? route.query.organizationId : 'ALL';
}

const selectedOrganizationId = ref(
  auth.hasRole(Role.ADMIN)
    ? readOrganizationIdFromRoute()
    : (auth.user.value?.organizationId ?? 'ALL')
);
const locationTypeOptions = [LocationType.FLOOR, LocationType.ROOM, LocationType.AREA];
const form = reactive({
  name: '',
  code: '',
  type: LocationType.FLOOR as LocationType,
  parentId: ''
});
const formSubmitting = ref(false);
const formError = ref('');
const formMessage = ref('');

const { data: organizationData } = await useAsyncData('location-organizations', async () => {
  if (!canSelectOrganization.value) {
    return {
      success: true,
      data: [] as OrganizationOption[]
    };
  }

  return useApiFetch<ApiResponse<OrganizationOption[]>>('/organizations');
});

const organizationOptions = computed(() => organizationData.value?.data ?? []);
const activeOrganizationId = computed(() => {
  if (!canSelectOrganization.value) {
    return auth.user.value?.organizationId ?? '';
  }

  return selectedOrganizationId.value === 'ALL' ? '' : selectedOrganizationId.value;
});

const { data, pending, error, refresh } = await useAsyncData(
  'locations-tree',
  () =>
    useApiFetch<ApiResponse<LocationNode[]>>('/locations/tree', {
      query:
        selectedOrganizationId.value !== 'ALL'
          ? {
              organizationId: selectedOrganizationId.value
            }
          : undefined
    }),
  {
    watch: [selectedOrganizationId]
  }
);

const locations = computed(() => data.value?.data ?? []);
const currentOrganizationLabel = computed(() => {
  if (canSelectOrganization.value) {
    return selectedOrganizationId.value === 'ALL'
      ? 'Tum kurumlar'
      : organizationOptions.value.find((item) => item.id === selectedOrganizationId.value)?.name ?? 'Secili kurum';
  }

  return auth.user.value?.organization?.name ?? 'Kurum tanimsiz';
});
const parentOptions = computed<LocationOption[]>(() => {
  const items: LocationOption[] = [];

  const walk = (nodes: LocationNode[], depth = 0) => {
    for (const node of nodes) {
      items.push({
        id: node.id,
        label: `${'-- '.repeat(depth)}${node.name} (${node.type})`,
        type: node.type
      });

      if (node.children.length) {
        walk(node.children, depth + 1);
      }
    }
  };

  walk(locations.value);
  return items;
});
const canSubmitLocation = computed(
  () => Boolean(activeOrganizationId.value) && parentOptions.value.length > 0 && canManageLocations.value
);

watch(
  [selectedOrganizationId, parentOptions],
  () => {
    formError.value = '';
    formMessage.value = '';

    if (!parentOptions.value.some((item) => item.id === form.parentId)) {
      form.parentId = parentOptions.value[0]?.id ?? '';
    }
  },
  { immediate: true }
);

watch(
  () => route.query.organizationId,
  (organizationId) => {
    if (!canSelectOrganization.value) {
      return;
    }

    const nextOrganizationId = typeof organizationId === 'string' ? organizationId : 'ALL';
    if (selectedOrganizationId.value !== nextOrganizationId) {
      selectedOrganizationId.value = nextOrganizationId;
    }
  }
);

watch(selectedOrganizationId, (organizationId) => {
  if (!canSelectOrganization.value) {
    return;
  }

  const routeOrganizationId = readOrganizationIdFromRoute();
  if (routeOrganizationId === organizationId) {
    return;
  }

  const nextQuery = { ...route.query };
  if (organizationId === 'ALL') {
    delete nextQuery.organizationId;
  } else {
    nextQuery.organizationId = organizationId;
  }

  void router.replace({ query: nextQuery });
});

async function submitLocation() {
  formError.value = '';
  formMessage.value = '';

  if (!canSubmitLocation.value) {
    formError.value = canSelectOrganization.value && !activeOrganizationId.value
      ? 'Yeni lokasyon icin once tek bir kurum sec.'
      : 'Yeni lokasyon icin uygun parent bulunamadi.';
    return;
  }

  formSubmitting.value = true;

  try {
    await useApiFetch<ApiResponse<LocationNode>>('/locations', {
      method: 'POST',
      body: {
        organizationId: activeOrganizationId.value,
        name: form.name,
        code: form.code,
        type: form.type,
        parentId: form.parentId
      }
    });

    form.name = '';
    form.code = '';
    form.type = LocationType.FLOOR;
    formMessage.value = 'Lokasyon eklendi.';
    await refresh();
  } catch (requestError) {
    formError.value = getApiErrorMessage(requestError, 'Lokasyon olusturulamadi.');
  } finally {
    formSubmitting.value = false;
  }
}
</script>

<template>
  <section class="section">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Admin</p>
        <h1>Lokasyonlar</h1>
        <p class="lead">{{ currentOrganizationLabel }}</p>
      </div>
      <div class="button-row">
        <label v-if="canSelectOrganization">
          <span>Kurum</span>
          <select v-model="selectedOrganizationId">
            <option value="ALL">Tum kurumlar</option>
            <option v-for="organization in organizationOptions" :key="organization.id" :value="organization.id">
              {{ organization.name }}
            </option>
          </select>
        </label>
        <button class="button" type="button" @click="refresh">Yenile</button>
      </div>
    </div>

    <div class="detail-grid">
      <section class="panel">
        <p class="eyebrow">Yeni lokasyon</p>
        <h2>Kat, oda veya alan ekle</h2>
        <p class="muted">
          Admin her kuruma ekleyebilir. Supervisor sadece bagli oldugu kurumun agacina ekleme yapar.
        </p>

        <form class="section" @submit.prevent="submitLocation">
          <div>
            <label for="locationParent">Ust lokasyon</label>
            <select id="locationParent" v-model="form.parentId" :disabled="!canSubmitLocation || pending">
              <option v-if="!parentOptions.length" value="">Secilebilir parent yok</option>
              <option v-for="option in parentOptions" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
            </select>
          </div>

          <div>
            <label for="locationType">Tur</label>
            <select id="locationType" v-model="form.type" :disabled="!canSubmitLocation">
              <option v-for="option in locationTypeOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </div>

          <div>
            <label for="locationName">Ad</label>
            <input
              id="locationName"
              v-model="form.name"
              type="text"
              maxlength="160"
              placeholder="1. Kat veya Oda 101"
              :disabled="!canSubmitLocation"
              required
            />
          </div>

          <div>
            <label for="locationCode">Kod</label>
            <input
              id="locationCode"
              v-model="form.code"
              type="text"
              maxlength="80"
              placeholder="DENEME_C_FLOOR_1"
              :disabled="!canSubmitLocation"
              required
            />
          </div>

          <div class="form-actions">
            <button class="button primary" type="submit" :disabled="formSubmitting || !canSubmitLocation">
              {{ formSubmitting ? 'Kaydediliyor...' : 'Lokasyon ekle' }}
            </button>
          </div>

          <p v-if="canSelectOrganization && !activeOrganizationId" class="info-text">
            Olusturma formunu acmak icin once tek bir kurum sec.
          </p>
          <p v-else-if="pending" class="info-text">Parent secenekleri yukleniyor...</p>
          <p v-else-if="!parentOptions.length" class="info-text">
            Bu kurum icin parent lokasyon bulunamadi.
          </p>
          <p v-if="formError" class="error-text">{{ formError }}</p>
          <p v-if="formMessage" class="success-text">{{ formMessage }}</p>
        </form>
      </section>

      <section class="panel">
        <p class="eyebrow">Agac notu</p>
        <h2>Kurum kokunu koru</h2>
        <div class="section">
          <p>
            Her kurum olusurken kok `ORGANIZATION` lokasyonu otomatik acilir. Yeni kayitlar bu kokun veya alt
            duzumlerin altina eklenir.
          </p>
          <p>
            Oda icin genelde parent olarak kat secilir. Alan veya servis bolumu gibi esnek yapilar icin `AREA`
            kullanabilirsin.
          </p>
          <p>
            Staff kullanicilar bu sayfada agaci gorebilir ama yeni lokasyon acamaz.
          </p>
        </div>
      </section>
    </div>

    <div v-if="pending" class="panel">
      <p>Lokasyonlar yukleniyor...</p>
    </div>

    <div v-else-if="error" class="panel error-panel">
      <p>Lokasyon agaci alinamadi.</p>
    </div>

    <div v-else class="panel">
      <LocationTree v-if="locations.length" :nodes="locations" />
      <p v-else>Henuz lokasyon yok.</p>
    </div>
  </section>
</template>
