import { QrScanStatus, Role, TaskStatus } from '@lbrtw/shared';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const envApiBaseUrl =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export const API_BASE_URL = envApiBaseUrl.trim().replace(/\/$/, '');

export const AUTH_TOKEN_KEY = 'lbrtw.mobile.access_token';

export const COLORS = {
  background: '#f4f7fb',
  surface: '#ffffff',
  surfaceMuted: '#eef3fa',
  text: '#1f232b',
  textMuted: '#5f6673',
  heading: '#071326',
  border: '#d9dee7',
  primary: '#071326',
  primarySoft: '#d9e7ff',
  success: '#1f8f4d',
  successSoft: '#e6f7ed',
  warning: '#e58a00',
  warningSoft: '#fff2da',
  danger: '#cf3345',
  dangerSoft: '#ffe9ec',
  info: '#315efb',
  infoSoft: '#e8eeff',
  shadow: 'rgba(16, 24, 40, 0.08)'
} as const;

export const LAYOUT = {
  screenPadding: 20,
  sectionGap: 18,
  cardRadius: 24,
  controlRadius: 18
} as const;

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: 'Admin',
  [Role.SUPERVISOR]: 'Supervisor',
  [Role.STAFF]: 'Staff'
};

export const TASK_STATUS_META: Record<TaskStatus, { label: string; tone: StatusTone }> = {
  [TaskStatus.NEW]: { label: 'Yeni', tone: 'info' },
  [TaskStatus.IN_PROGRESS]: { label: 'İşlemde', tone: 'warning' },
  [TaskStatus.DONE_WAITING_APPROVAL]: { label: 'Onay Bekliyor', tone: 'neutral' },
  [TaskStatus.APPROVED]: { label: 'Onaylandı', tone: 'success' },
  [TaskStatus.REJECTED]: { label: 'Reddedildi', tone: 'danger' }
};

export const QR_SCAN_STATUS_META: Record<QrScanStatus, { label: string; tone: StatusTone }> = {
  [QrScanStatus.RESOLVED]: { label: 'Çözüldü', tone: 'success' },
  [QrScanStatus.INACTIVE]: { label: 'Pasif', tone: 'warning' },
  [QrScanStatus.TOKEN_NOT_FOUND]: { label: 'Bulunamadı', tone: 'danger' },
  [QrScanStatus.REQUEST_CREATED]: { label: 'Talep Oluştu', tone: 'info' },
  [QrScanStatus.REQUEST_FAILED]: { label: 'Talep Hatası', tone: 'danger' }
};
