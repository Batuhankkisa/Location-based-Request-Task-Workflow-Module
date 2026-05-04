import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { buildAssetUrl, getApiErrorMessage } from '../../api/client';
import { qrsApi } from '../../api/qrs';
import { AppButton } from '../../components/AppButton';
import { EmptyState } from '../../components/EmptyState';
import { InfoRow } from '../../components/InfoRow';
import { LoadingView } from '../../components/LoadingView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuthStore } from '../../store/authStore';
import type { QrDetail, QrScanLog } from '../../types/qr';
import { COLORS, LAYOUT, QR_SCAN_STATUS_META } from '../../utils/constants';
import { formatDateTime } from '../../utils/date';
import { canToggleQrStatus } from '../../utils/role';
import type { QrsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<QrsStackParamList, 'QrDetail'>;

export function QrDetailScreen({ route, navigation }: Props) {
  const { qrId } = route.params;
  const role = useAuthStore((state) => state.user?.role);

  const [qr, setQr] = useState<QrDetail | null>(null);
  const [logs, setLogs] = useState<QrScanLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'activate' | 'deactivate' | null>(null);

  const loadDetail = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [detailResponse, logResponse] = await Promise.all([qrsApi.getById(qrId), qrsApi.getScanLogs(qrId)]);
      setQr(detailResponse);
      setLogs(logResponse);
      setError(null);
      navigation.setOptions({ title: detailResponse.label });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation, qrId]);

  useEffect(() => {
    void loadDetail('initial');
  }, [loadDetail]);

  async function handleToggle(nextAction: 'activate' | 'deactivate') {
    if (!qr) {
      return;
    }

    setActionLoading(nextAction);
    setError(null);

    try {
      const response =
        nextAction === 'activate' ? await qrsApi.activate(qr.id) : await qrsApi.deactivate(qr.id);
      setQr(response);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setActionLoading(null);
    }
  }

  if (loading && !qr) {
    return (
      <ScreenContainer centered>
        <LoadingView description="QR detayı ve okutma kayıtları alınıyor." title="QR açılıyor" />
      </ScreenContainer>
    );
  }

  if (!qr) {
    return (
      <ScreenContainer centered>
        <EmptyState
          title="QR bulunamadı"
          description={error ?? 'QR detayı okunamadı.'}
          actionLabel="Listeye dön"
          onAction={() => navigation.goBack()}
        />
      </ScreenContainer>
    );
  }

  const previewUri = buildAssetUrl(qr.imagePath);

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => void loadDetail('refresh')} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Seçili QR</Text>
          <Text style={styles.heroTitle}>{qr.label}</Text>
          <Text style={styles.heroSubtitle}>{qr.token}</Text>
        </View>

        <View style={styles.infoCard}>
          <InfoRow label="Lokasyon" value={qr.location.name} hint={qr.location.code} />
          <InfoRow label="Durum" value={qr.isActive ? 'Aktif' : 'Pasif'} />
          <InfoRow label="Okutulma sayısı" value={String(qr.scanCount)} />
          <InfoRow label="Son kullanım" value={formatDateTime(qr.lastScannedAt)} />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Önizleme</Text>
          <View style={styles.previewCard}>
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.previewPlaceholder}>
                <Text style={styles.previewPlaceholderText}>Görsel önizleme alanı</Text>
              </View>
            )}
          </View>
          <Text style={styles.previewCaption}>{previewUri ?? 'Görsel yolu tanımlı değil.'}</Text>
        </View>

        {canToggleQrStatus(role) ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Admin aksiyonları</Text>
            {qr.isActive ? (
              <AppButton
                label="Pasife al"
                loading={actionLoading === 'deactivate'}
                onPress={() => void handleToggle('deactivate')}
                variant="danger"
              />
            ) : (
              <AppButton
                label="Aktife al"
                loading={actionLoading === 'activate'}
                onPress={() => void handleToggle('activate')}
                variant="secondary"
              />
            )}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Okutma kayıtları</Text>
          <View style={styles.logsList}>
            {logs.length ? (
              logs.map((log) => {
                const meta = QR_SCAN_STATUS_META[log.status];

                return (
                  <View key={log.id} style={styles.logItem}>
                    <View style={styles.logHead}>
                      <StatusBadge label={meta.label} tone={meta.tone} />
                      <Text style={styles.logDate}>{formatDateTime(log.scannedAt)}</Text>
                    </View>
                    <Text style={styles.logToken}>{log.tokenSnapshot}</Text>
                    <Text style={styles.logMeta}>
                      {log.resolvedLocation?.name ?? 'Lokasyon eşleşmesi yok'}
                    </Text>
                    {log.errorMessage ? <Text style={styles.logError}>{log.errorMessage}</Text> : null}
                  </View>
                );
              })
            ) : (
              <Text style={styles.sectionMuted}>Bu QR için okutma kaydı bulunmuyor.</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0
  },
  content: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingVertical: 16,
    gap: 14
  },
  heroCard: {
    backgroundColor: COLORS.heading,
    borderRadius: 30,
    padding: 24,
    gap: 8
  },
  heroEyebrow: {
    color: '#b7c6eb',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  heroTitle: {
    color: COLORS.surface,
    fontSize: 30,
    fontWeight: '800'
  },
  heroSubtitle: {
    color: '#d4defa',
    fontSize: 15,
    lineHeight: 22
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.heading
  },
  previewCard: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 22,
    padding: 14
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    backgroundColor: '#dbe4fb'
  },
  previewPlaceholder: {
    height: 220,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbe4fb'
  },
  previewPlaceholderText: {
    color: COLORS.heading,
    fontSize: 15,
    fontWeight: '700'
  },
  previewCaption: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18
  },
  logsList: {
    gap: 12
  },
  logItem: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 20,
    padding: 14,
    gap: 8
  },
  logHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10
  },
  logDate: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600'
  },
  logToken: {
    color: COLORS.heading,
    fontSize: 15,
    fontWeight: '700'
  },
  logMeta: {
    color: COLORS.text,
    fontSize: 14
  },
  logError: {
    color: COLORS.danger,
    fontSize: 14
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '600'
  },
  sectionMuted: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 22
  }
});
