<script setup lang="ts">
import { LocationType, OrganizationType } from '@lbrtw/shared';

defineOptions({
  name: 'LocationTree'
});

interface QrCodeSummary {
  id: string;
  token: string;
  label: string;
  isActive: boolean;
}

interface OrganizationSummary {
  id: string;
  name: string;
  code: string;
  type: OrganizationType;
  isActive: boolean;
}

interface LocationNode {
  id: string;
  name: string;
  code: string;
  type: LocationType | string;
  organization?: OrganizationSummary;
  qrCodes: QrCodeSummary[];
  children: LocationNode[];
}

defineProps<{
  nodes: LocationNode[];
}>();

function getRowClass(node: LocationNode) {
  return {
    'is-leaf': node.children.length === 0,
    [`tree-row--${node.type.toLowerCase()}`]: true
  };
}

function getIconType(node: LocationNode) {
  if (node.type === LocationType.ORGANIZATION) {
    return (node.organization?.type ?? OrganizationType.GENERAL).toLowerCase();
  }

  if (node.type === LocationType.FLOOR) {
    return 'floor';
  }

  if (node.type === LocationType.ROOM) {
    return 'room';
  }

  if (node.type === LocationType.AREA) {
    return 'area';
  }

  return 'general';
}
</script>

<template>
  <ul class="tree-list">
    <li v-for="node in nodes" :key="node.id" class="tree-item">
      <div class="tree-row" :class="getRowClass(node)">
        <span class="tree-disclosure" :class="{ 'is-hidden': !node.children.length }" aria-hidden="true">
          <svg viewBox="0 0 12 8" role="presentation" focusable="false">
            <path d="M1.4 1.2 6 5.8l4.6-4.6" />
          </svg>
        </span>

        <span class="tree-node-icon" :class="`tree-node-icon--${getIconType(node)}`" aria-hidden="true">
          <svg v-if="getIconType(node) === 'hospital'" viewBox="0 0 24 24" role="presentation" focusable="false">
            <path d="M4.5 21V5.5A2.5 2.5 0 0 1 7 3h10a2.5 2.5 0 0 1 2.5 2.5V21" />
            <path d="M8.5 21v-5.5h7V21" />
            <path d="M12 7v6" />
            <path d="M9 10h6" />
          </svg>
          <svg v-else-if="getIconType(node) === 'hotel'" viewBox="0 0 24 24" role="presentation" focusable="false">
            <path d="M4 20V6" />
            <path d="M20 20v-7.5a2.5 2.5 0 0 0-2.5-2.5H9" />
            <path d="M4 13h16" />
            <path d="M7 10h2.5a2 2 0 0 1 2 2v1H7z" />
          </svg>
          <svg v-else-if="getIconType(node) === 'clinic'" viewBox="0 0 24 24" role="presentation" focusable="false">
            <path d="M5 21V7l7-4 7 4v14" />
            <path d="M9 21v-6h6v6" />
            <path d="M12 7.5v5" />
            <path d="M9.5 10h5" />
          </svg>
          <svg v-else-if="getIconType(node) === 'restaurant'" viewBox="0 0 24 24" role="presentation" focusable="false">
            <path d="M7 3v8" />
            <path d="M4.5 3v4.5A2.5 2.5 0 0 0 7 10a2.5 2.5 0 0 0 2.5-2.5V3" />
            <path d="M7 10v11" />
            <path d="M17 3v18" />
            <path d="M17 3c2 1.4 3 3.4 3 6v2h-3" />
          </svg>
          <svg v-else-if="getIconType(node) === 'floor'" viewBox="0 0 24 24" role="presentation" focusable="false">
            <path d="m4 8 8-4 8 4-8 4z" />
            <path d="m4 12 8 4 8-4" />
            <path d="m4 16 8 4 8-4" />
          </svg>
          <svg v-else-if="getIconType(node) === 'room'" viewBox="0 0 24 24" role="presentation" focusable="false">
            <path d="M7 21V4h10v17" />
            <path d="M10 12h.01" />
            <path d="M5 21h14" />
          </svg>
          <svg v-else-if="getIconType(node) === 'area'" viewBox="0 0 24 24" role="presentation" focusable="false">
            <path d="M4 6h16v12H4z" />
            <path d="M9 6v12" />
            <path d="M15 6v12" />
            <path d="M4 12h16" />
          </svg>
          <svg v-else viewBox="0 0 24 24" role="presentation" focusable="false">
            <path d="M4.5 21V7.5L12 3l7.5 4.5V21" />
            <path d="M8 10h2" />
            <path d="M14 10h2" />
            <path d="M8 14h2" />
            <path d="M14 14h2" />
          </svg>
        </span>

        <div class="tree-node-copy">
          <strong>{{ node.name }}</strong>
          <span class="muted">KOD: {{ node.code }}</span>
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
