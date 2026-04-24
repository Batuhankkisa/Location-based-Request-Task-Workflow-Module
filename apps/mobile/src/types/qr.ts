import type { LocationType, QrScanStatus } from '@lbrtw/shared';

export interface QrLocation {
  id: string;
  name: string;
  code: string;
  type: LocationType;
}

export interface QrListItem {
  id: string;
  token: string;
  label: string;
  isActive: boolean;
  scanCount: number;
  lastScannedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  location: QrLocation;
}

export interface QrDetail extends QrListItem {
  deactivatedAt?: string | null;
  imagePath?: string | null;
  note?: string | null;
}

export interface QrScanLog {
  id: string;
  tokenSnapshot: string;
  scannedAt: string;
  ip?: string | null;
  userAgent?: string | null;
  status: QrScanStatus;
  requestId?: string | null;
  createdTaskId?: string | null;
  errorMessage?: string | null;
  resolvedLocation?: QrLocation | null;
}
