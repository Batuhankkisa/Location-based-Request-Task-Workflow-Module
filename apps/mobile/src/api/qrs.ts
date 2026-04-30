import type { CreateQrPayload, QrDetail, QrListItem, QrScanLog } from '../types/qr';
import { apiClient, unwrapResponse } from './client';

export const qrsApi = {
  list() {
    return unwrapResponse<QrListItem[]>(apiClient.get('/qr-codes'));
  },

  getById(qrId: string) {
    return unwrapResponse<QrDetail>(apiClient.get(`/qr-codes/${qrId}`));
  },

  getScanLogs(qrId: string) {
    return unwrapResponse<QrScanLog[]>(apiClient.get(`/qr-codes/${qrId}/scan-logs`));
  },

  create(payload: CreateQrPayload) {
    return unwrapResponse<QrDetail>(apiClient.post('/qr-codes', payload));
  },

  activate(qrId: string) {
    return unwrapResponse<QrDetail>(apiClient.patch(`/qr-codes/${qrId}/activate`));
  },

  deactivate(qrId: string) {
    return unwrapResponse<QrDetail>(apiClient.patch(`/qr-codes/${qrId}/deactivate`));
  }
};
