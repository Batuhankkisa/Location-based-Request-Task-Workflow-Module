import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EmptyState } from '../../components/EmptyState';
import { LoadingView } from '../../components/LoadingView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatusBadge } from '../../components/StatusBadge';
import { getApiErrorMessage } from '../../api/client';
import { qrsApi } from '../../api/qrs';
import type { QrListItem } from '../../types/qr';
import { COLORS, LAYOUT } from '../../utils/constants';
import { formatDateTime } from '../../utils/date';
import type { QrsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<QrsStackParamList, 'QrList'>;

export function QrListScreen({ navigation }: Props) {
  const [items, setItems] = useState<QrListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await qrsApi.list();
      setItems(response);
      setError(null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadItems('initial');
    }, [loadItems])
  );

  return (
    <ScreenContainer style={styles.screen}>
      <FlatList
        contentContainerStyle={items.length ? styles.listContent : styles.emptyContent}
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              title={error ? 'QR listesi alinamadi' : 'QR kaydi yok'}
              description={
                error
                  ? error
                  : 'Supervisor ve admin kullanicilari icin QR kayitlari bu alanda listelenir.'
              }
              actionLabel="Yeniden dene"
              onAction={() => {
                void loadItems('initial');
              }}
            />
          )
        }
        ListHeaderComponent={
          <View style={styles.headerGroup}>
            <View style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>QR inventory</Text>
              <Text style={styles.heroTitle}>Kodlar ve bagli lokasyonlar</Text>
              <Text style={styles.heroDescription}>
                Durum, scan sayisi ve son kullanimi kart bazli olarak kontrol et.
              </Text>
            </View>
          </View>
        }
        onRefresh={() => {
          void loadItems('refresh');
        }}
        refreshing={refreshing}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('QrDetail', { qrId: item.id })}
            style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
          >
            <View style={styles.cardHead}>
              <Text style={styles.cardToken}>{item.token}</Text>
              <StatusBadge label={item.isActive ? 'Aktif' : 'Pasif'} tone={item.isActive ? 'success' : 'danger'} />
            </View>
            <Text style={styles.cardLabel}>{item.label}</Text>
            <Text style={styles.cardLocation}>{item.location.name}</Text>
            <Text style={styles.cardLocationHint}>{item.location.code}</Text>

            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.footerLabel}>Scan</Text>
                <Text style={styles.footerValue}>{item.scanCount}</Text>
              </View>
              <View>
                <Text style={styles.footerLabel}>Son kullanim</Text>
                <Text style={styles.footerValue}>{formatDateTime(item.lastScannedAt)}</Text>
              </View>
            </View>
          </Pressable>
        )}
        showsVerticalScrollIndicator={false}
      />

      {loading ? <LoadingView description="QR kayitlari cekiliyor." title="QRlar yukleniyor" /> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0
  },
  listContent: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingVertical: 16,
    gap: 14
  },
  emptyContent: {
    flexGrow: 1,
    paddingHorizontal: LAYOUT.screenPadding,
    paddingVertical: 16,
    gap: 14
  },
  headerGroup: {
    marginBottom: 14
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
  heroDescription: {
    color: '#d4defa',
    fontSize: 15,
    lineHeight: 22
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 26,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  cardPressed: {
    opacity: 0.94
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10
  },
  cardToken: {
    flex: 1,
    color: COLORS.heading,
    fontSize: 18,
    fontWeight: '800'
  },
  cardLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700'
  },
  cardLocation: {
    color: COLORS.heading,
    fontSize: 20,
    fontWeight: '800'
  },
  cardLocationHint: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600'
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingTop: 10
  },
  footerLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  footerValue: {
    color: COLORS.heading,
    fontSize: 14,
    fontWeight: '700'
  }
});
