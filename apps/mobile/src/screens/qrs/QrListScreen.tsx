import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EmptyState } from '../../components/EmptyState';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { FormModal, OptionChip } from '../../components/FormModal';
import { LoadingView } from '../../components/LoadingView';
import { MobileTopBar } from '../../components/MobileTopBar';
import { SearchBar } from '../../components/SearchBar';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { getApiErrorMessage } from '../../api/client';
import { locationsApi } from '../../api/admin';
import { qrsApi } from '../../api/qrs';
import type { LocationTreeNode } from '../../types/admin';
import type { QrListItem } from '../../types/qr';
import { COLORS, LAYOUT } from '../../utils/constants';
import { formatDateTime } from '../../utils/date';
import type { QrsStackParamList } from '../../navigation/types';
import { matchesSearchTerm } from '../../utils/search';

type Props = NativeStackScreenProps<QrsStackParamList, 'QrList'>;
type QrStatusFilter = 'ALL' | 'ACTIVE' | 'PASSIVE';

export function QrListScreen({ navigation }: Props) {
  const [items, setItems] = useState<QrListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationTreeNode[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [label, setLabel] = useState('');
  const [locationId, setLocationId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QrStatusFilter>('ALL');

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

  const loadLocations = useCallback(async () => {
    try {
      const response = await locationsApi.tree();
      setLocations(response);
      const firstLocation = flattenLocations(response).find((location) => location.type !== 'ORGANIZATION');
      setLocationId((current) => current || firstLocation?.id || '');
    } catch (_error) {
      return;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadItems('initial');
      void loadLocations();
    }, [loadItems, loadLocations])
  );

  const summary = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.isActive).length,
      passive: items.filter((item) => !item.isActive).length,
      scans: items.reduce((total, item) => total + item.scanCount, 0)
    }),
    [items]
  );
  const locationOptions = useMemo(
    () => flattenLocations(locations).filter((location) => location.type !== 'ORGANIZATION'),
    [locations]
  );
  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesStatus =
          statusFilter === 'ALL' ||
          (statusFilter === 'ACTIVE' && item.isActive) ||
          (statusFilter === 'PASSIVE' && !item.isActive);
        const matchesSearch = matchesSearchTerm(searchTerm, [
          item.token,
          item.label,
          item.location.name,
          item.location.code,
          item.location.type,
          item.location.organization?.name,
          item.scanCount,
          item.isActive ? 'aktif' : 'pasif'
        ]);

        return matchesStatus && matchesSearch;
      }),
    [items, searchTerm, statusFilter]
  );
  const hasActiveFilter = searchTerm.trim().length > 0 || statusFilter !== 'ALL';

  async function handleCreateQr() {
    setFormError(null);

    if (!token.trim() || !label.trim() || !locationId) {
      setFormError('Token, etiket ve lokasyon zorunludur.');
      return;
    }

    setSubmitting(true);
    try {
      await qrsApi.create({
        token: token.trim(),
        label: label.trim(),
        locationId,
        isActive
      });
      setModalVisible(false);
      setToken('');
      setLabel('');
      setIsActive(true);
      await loadItems('refresh');
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer style={styles.screen}>
      <MobileTopBar />
      <FlatList
        contentContainerStyle={filteredItems.length ? styles.listContent : styles.emptyContent}
        data={filteredItems}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              title={error ? 'QR listesi alınamadı' : hasActiveFilter ? 'Sonuç bulunamadı' : 'QR kaydı yok'}
              description={
                error
                  ? error
                  : hasActiveFilter
                    ? 'Arama veya filtre seçimine uyan QR kaydı bulunamadı.'
                    : 'Supervisor ve admin kullanıcıları için QR kayıtları bu alanda listelenir.'
              }
              actionLabel={error || !hasActiveFilter ? 'Yeniden dene' : undefined}
              onAction={error || !hasActiveFilter ? () => void loadItems('initial') : undefined}
            />
          )
        }
        ListHeaderComponent={
          <View style={styles.headerGroup}>
            <View style={styles.titleRow}>
              <View style={styles.titleTextGroup}>
                <Text style={styles.pageTitle}>QR Envanteri</Text>
                <Text style={styles.pageSubtitle}>Sistemdeki tüm QR kodlarını yönetin.</Text>
              </View>
              <Pressable onPress={() => setModalVisible(true)} style={styles.newButton}>
                <Ionicons name="add" size={18} color={COLORS.surface} />
                <Text style={styles.newButtonText}>Yeni</Text>
              </Pressable>
            </View>

            <View style={styles.statGrid}>
              <StatCard icon="qr-code-outline" label="Toplam QR" tone="blue" value={String(summary.total)} />
              <StatCard icon="checkmark-circle-outline" label="Aktif" tone="green" value={String(summary.active)} />
              <StatCard icon="alert-circle-outline" label="Pasif" tone="red" value={String(summary.passive)} />
              <StatCard icon="bar-chart-outline" label="Okutulma" tone="blue" value={formatCompactNumber(summary.scans)} />
            </View>

            <View style={styles.searchRow}>
              <View style={styles.searchWrap}>
                <SearchBar
                  onChangeText={setSearchTerm}
                  placeholder="ID veya lokasyon ara..."
                  value={searchTerm}
                />
              </View>
            </View>

            <View style={styles.filterRow}>
              <FilterChip active={statusFilter === 'ALL'} label="Tümü" onPress={() => setStatusFilter('ALL')} />
              <FilterChip active={statusFilter === 'ACTIVE'} label="Aktif" onPress={() => setStatusFilter('ACTIVE')} />
              <FilterChip active={statusFilter === 'PASSIVE'} label="Pasif" onPress={() => setStatusFilter('PASSIVE')} />
            </View>

            <Text style={styles.sectionTitle}>Son Eklenenler</Text>
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
              <View style={styles.qrIconBox}>
                <Ionicons name="qr-code-outline" size={24} color={item.isActive ? COLORS.heading : '#98a2b3'} />
              </View>
              <View style={styles.cardTitleGroup}>
                <Text style={styles.cardToken}>{item.token}</Text>
                <Text style={styles.cardLabel}>{item.label}</Text>
                <Text style={styles.cardLocation}>
                  {item.location.name}  /  {item.scanCount} scan
                </Text>
              </View>
              <StatusBadge label={item.isActive ? 'Aktif' : 'Pasif'} tone={item.isActive ? 'success' : 'danger'} />
            </View>
            <Text style={styles.cardLocationHint}>Son kullanim: {formatDateTime(item.lastScannedAt)}</Text>
          </Pressable>
        )}
        showsVerticalScrollIndicator={false}
      />

      {loading ? <LoadingView description="QR kayıtları çekiliyor." title="QR Kodları yükleniyor" /> : null}
      <FormModal
        onClose={() => setModalVisible(false)}
        subtitle="Webdeki QR oluşturma mantığı ile aynı endpoint kullanılır."
        title="Yeni QR"
        visible={modalVisible}
      >
        <AppInput label="Token" onChangeText={setToken} placeholder="qr-2026-room-101" value={token} />
        <AppInput label="Etiket" onChangeText={setLabel} placeholder="Oda 101 Giriş QR" value={label} />

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Lokasyon</Text>
          <View style={styles.optionWrap}>
            {locationOptions.slice(0, 12).map((location) => (
              <OptionChip
                key={location.id}
                label={`${location.name} (${location.code})`}
                onPress={() => setLocationId(location.id)}
                selected={locationId === location.id}
              />
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Durum</Text>
          <View style={styles.optionWrap}>
            <OptionChip label="Aktif" onPress={() => setIsActive(true)} selected={isActive} />
            <OptionChip label="Pasif" onPress={() => setIsActive(false)} selected={!isActive} />
          </View>
        </View>

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}
        <AppButton label="QR Oluştur" loading={submitting} onPress={handleCreateQr} rightIcon="checkmark-outline" />
      </FormModal>
    </ScreenContainer>
  );
}

function FilterChip({ label, active = false, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.filterChip, active ? styles.filterChipActive : null, pressed ? styles.pressed : null]}
    >
      <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function flattenLocations(nodes: LocationTreeNode[]): LocationTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenLocations(node.children)]);
}

function formatCompactNumber(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace('.', ',')}k`;
  }

  return String(value);
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0
  },
  listContent: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: 22,
    paddingBottom: 16,
    gap: 14
  },
  emptyContent: {
    flexGrow: 1,
    paddingHorizontal: LAYOUT.screenPadding,
    paddingVertical: 16,
    gap: 14
  },
  headerGroup: {
    gap: 18,
    marginBottom: 2
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  pageTitle: {
    color: COLORS.heading,
    fontSize: 25,
    fontWeight: '800'
  },
  titleTextGroup: {
    flex: 1,
    flexShrink: 1
  },
  pageSubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 4
  },
  newButton: {
    flexShrink: 0,
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    backgroundColor: '#0b63ce',
    paddingHorizontal: 12
  },
  newButtonText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '800'
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8
  },
  searchWrap: {
    flex: 1
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  filterChip: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 13
  },
  filterChipActive: {
    borderColor: '#2f77e5',
    backgroundColor: '#2f77e5'
  },
  filterChipText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800'
  },
  filterChipTextActive: {
    color: COLORS.surface
  },
  pressed: {
    opacity: 0.75
  },
  sectionTitle: {
    color: COLORS.heading,
    fontSize: 17,
    fontWeight: '800',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  cardPressed: {
    opacity: 0.94
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  qrIconBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#f2f5f9'
  },
  cardTitleGroup: {
    flex: 1
  },
  cardToken: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700'
  },
  cardLabel: {
    color: COLORS.heading,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 3
  },
  cardLocation: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5
  },
  cardLocationHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600'
  },
  formSection: {
    gap: 10
  },
  formLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  formError: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '700'
  }
});
