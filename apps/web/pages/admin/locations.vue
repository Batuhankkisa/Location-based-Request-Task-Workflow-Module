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
  type: LocationType | string;
  organization?: OrganizationOption;
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
const treeSearchTerm = ref('');

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
const filteredLocations = computed(() => filterLocationTree(locations.value, treeSearchTerm.value));
const hasTreeSearch = computed(() => treeSearchTerm.value.trim().length > 0);
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
      ? 'Yeni lokasyon için önce tek bir kurum seç.'
      : 'Yeni lokasyon için uygun parent bulunamadı.';
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
    formError.value = getApiErrorMessage(requestError, 'Lokasyon oluşturulamadı.');
  } finally {
    formSubmitting.value = false;
  }
}

function resetLocationForm() {
  form.name = '';
  form.code = '';
  form.type = LocationType.FLOOR;
  formError.value = '';
  formMessage.value = '';
}

function normalizeTreeSearch(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function nodeMatchesSearch(node: LocationNode, searchTerm: string) {
  const searchableText = [
    node.name,
    node.code,
    node.type,
    node.organization?.name,
    node.organization?.code,
    ...node.qrCodes.map((qr) => `${qr.label} ${qr.token}`)
  ]
    .filter(Boolean)
    .join(' ');

  return normalizeTreeSearch(searchableText).includes(searchTerm);
}

function filterLocationTree(nodes: LocationNode[], rawSearchTerm: string): LocationNode[] {
  const searchTerm = normalizeTreeSearch(rawSearchTerm);

  if (!searchTerm) {
    return nodes;
  }

  return nodes.flatMap((node) => {
    if (nodeMatchesSearch(node, searchTerm)) {
      return [node];
    }

    const children = filterLocationTree(node.children, searchTerm);
    if (!children.length) {
      return [];
    }

    return [
      {
        ...node,
        children
      }
    ];
  });
}
</script>

<template>
  <section class="section location-workspace">
    <div class="page-heading">
      <div>
        <h1>Lokasyon Ağacı</h1>
        <p class="lead">Tesis, bina, kat ve oda hiyerarşisini yönetin.</p>
      </div>
      <div class="button-row">
        <label v-if="canSelectOrganization">
          <span>Kurum</span>
          <select v-model="selectedOrganizationId">
            <option value="ALL">Tüm kurumlar</option>
            <option v-for="organization in organizationOptions" :key="organization.id" :value="organization.id">
              {{ organization.name }}
            </option>
          </select>
        </label>
        <button class="button export-button" type="button" @click="refresh">Yenile</button>
      </div>
    </div>

    <div class="detail-grid location-grid">
      <section class="panel location-form-card">
        <h2>Yeni Lokasyon Ekle</h2>

        <form class="section" @submit.prevent="submitLocation">
          <div>
            <label for="locationParent">Üst Lokasyon</label>
            <select id="locationParent" v-model="form.parentId" :disabled="!canSubmitLocation || pending">
              <option v-if="!parentOptions.length" value="">Seçilebilir parent yok</option>
              <option v-for="option in parentOptions" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
            </select>
          </div>

          <div>
            <label for="locationType">Kategori</label>
            <select id="locationType" v-model="form.type" :disabled="!canSubmitLocation">
              <option v-for="option in locationTypeOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </div>

          <div>
            <label for="locationName">Lokasyon Adı</label>
            <input
              id="locationName"
              v-model="form.name"
              type="text"
              maxlength="160"
              placeholder="Örn: Poliklinik Bekleme"
              :disabled="!canSubmitLocation"
              required
            />
          </div>

          <div>
            <label for="locationCode">Lokasyon Kodu</label>
            <input
              id="locationCode"
              v-model="form.code"
              type="text"
              maxlength="80"
              placeholder="ÖRN: MK-A-Z-01"
              :disabled="!canSubmitLocation"
              required
            />
          </div>

          <div class="form-actions">
            <button class="button small" type="button" :disabled="formSubmitting || !canSubmitLocation" @click="resetLocationForm">
              Temizle
            </button>
            <button class="button primary" type="submit" :disabled="formSubmitting || !canSubmitLocation">
              {{ formSubmitting ? 'Kaydediliyor...' : 'Kaydet' }}
            </button>
          </div>

          <p v-if="canSelectOrganization && !activeOrganizationId" class="info-text">
            Oluşturma formunu açmak için önce tek bir kurum seç.
          </p>
          <p v-else-if="pending" class="info-text">Parent seçenekleri yükleniyor...</p>
          <p v-else-if="!parentOptions.length" class="info-text">
            Bu kurum için parent lokasyon bulunamadı.
          </p>
          <p v-if="formError" class="error-text">{{ formError }}</p>
          <p v-if="formMessage" class="success-text">{{ formMessage }}</p>
        </form>
      </section>

      <section class="panel location-tree-card">
        <div class="location-tree-header">
          <h2>Mevcut Lokasyonlar</h2>
          <label class="tree-search">
            <span aria-hidden="true"></span>
            <input
              v-model="treeSearchTerm"
              type="search"
              placeholder="Ağaçta ara..."
              autocomplete="off"
              :disabled="pending || Boolean(error)"
            />
          </label>
        </div>

        <div v-if="pending" class="tree-state">
          <p>Lokasyonlar yükleniyor...</p>
        </div>

        <div v-else-if="error" class="tree-state error-panel">
          <p>Lokasyon ağacı alınamadı.</p>
        </div>

        <LocationTree v-else-if="filteredLocations.length" :nodes="filteredLocations" />
        <p v-else-if="hasTreeSearch" class="tree-state">Aramanla eslesen lokasyon bulunamadi.</p>
        <p v-else class="tree-state">Henuz lokasyon yok.</p>
      </section>
    </div>
  </section>
</template>
