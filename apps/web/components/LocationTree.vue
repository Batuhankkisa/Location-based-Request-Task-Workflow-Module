<script setup lang="ts">
defineOptions({
  name: 'LocationTree'
});

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

defineProps<{
  nodes: LocationNode[];
}>();
</script>

<template>
  <ul class="tree-list">
    <li v-for="node in nodes" :key="node.id" class="tree-item">
      <div class="tree-row">
        <div>
          <strong>{{ node.name }}</strong>
          <span class="muted">{{ node.code }} · {{ node.type }}</span>
        </div>
        <div v-if="node.qrCodes.length" class="qr-token-list">
          <span
            v-for="qr in node.qrCodes"
            :key="qr.id"
            class="qr-token"
            :class="{ inactive: !qr.isActive }"
          >
            {{ qr.token }}
          </span>
        </div>
      </div>

      <LocationTree v-if="node.children.length" :nodes="node.children" />
    </li>
  </ul>
</template>
