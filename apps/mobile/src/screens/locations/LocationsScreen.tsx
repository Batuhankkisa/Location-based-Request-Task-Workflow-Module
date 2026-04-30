import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LocationType } from '@lbrtw/shared';
import { useFocusEffect } from '@react-navigation/native';
import { getApiErrorMessage } from '../../api/client';
import { locationsApi } from '../../api/admin';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { EmptyState } from '../../components/EmptyState';
import { FormModal, OptionChip } from '../../components/FormModal';
import { LoadingView } from '../../components/LoadingView';
import { MobileTopBar } from '../../components/MobileTopBar';
import { SearchBar } from '../../components/SearchBar';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatusBadge } from '../../components/StatusBadge';
import type { LocationTreeNode } from '../../types/admin';
import { COLORS, LAYOUT } from '../../utils/constants';
import { normalizeSearchText } from '../../utils/search';

export function LocationsScreen() {
  const [locations, setLocations] = useState<LocationTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<LocationType>(LocationType.ROOM);
  const [parentId, setParentId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadLocations = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await locationsApi.tree();
      setLocations(response);
      const firstParent = flattenLocationNodes(response)[0];
      setParentId((current) => current || firstParent?.id || '');
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
      void loadLocations('initial');
    }, [loadLocations])
  );

  const totals = useMemo(() => getLocationTotals(locations), [locations]);
  const parentOptions = useMemo(() => flattenLocationNodes(locations), [locations]);
  const filteredLocations = useMemo(() => filterLocationNodes(locations, searchTerm), [locations, searchTerm]);

  async function handleCreateLocation() {
    setFormError(null);

    if (!name.trim() || !code.trim() || !parentId) {
      setFormError('Ad, kod ve parent lokasyon zorunludur.');
      return;
    }

    const parent = parentOptions.find((item) => item.id === parentId);
    setSubmitting(true);
    try {
      await locationsApi.create({
        name: name.trim(),
        code: code.trim(),
        type,
        parentId,
        organizationId: parent?.organizationId
      });
      setModalVisible(false);
      setName('');
      setCode('');
      setType(LocationType.ROOM);
      await loadLocations('refresh');
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer style={styles.screen}>
      <MobileTopBar />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => void loadLocations('refresh')} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>Lokasyonlar</Text>
          <Pressable onPress={() => setModalVisible(true)} style={styles.newButton}>
            <Ionicons name="add" size={18} color={COLORS.surface} />
            <Text style={styles.newButtonText}>Yeni</Text>
          </Pressable>
        </View>

        <SearchBar onChangeText={setSearchTerm} placeholder="Lokasyon ara..." value={searchTerm} />

        <View style={styles.summaryGrid}>
          <SummaryTile label="Lokasyon" value={String(totals.locations)} />
          <SummaryTile label="QR" value={String(totals.qrs)} />
        </View>

        {loading ? <LoadingView description="Lokasyon agaci aliniyor." title="Yukleniyor" /> : null}

        {!loading && error ? (
          <EmptyState
            title="Lokasyonlar yuklenemedi"
            description={error}
            actionLabel="Yeniden dene"
            onAction={() => void loadLocations('initial')}
          />
        ) : null}

        {!loading && !error && !locations.length ? (
          <EmptyState title="Lokasyon yok" description="Bu scope icin lokasyon kaydi bulunmuyor." />
        ) : null}

        {!loading && !error && locations.length > 0 && !filteredLocations.length ? (
          <EmptyState title="Sonuc bulunamadi" description="Aramanla eslesen lokasyon, kurum veya QR kaydi yok." />
        ) : null}

        <View style={styles.treeList}>
          {filteredLocations.map((node) => (
            <LocationOrganizationCard key={node.id} node={node} />
          ))}
        </View>
      </ScrollView>
      <FormModal
        onClose={() => setModalVisible(false)}
        subtitle="Webdeki lokasyon olusturma endpointi kullanilir."
        title="Yeni Lokasyon"
        visible={modalVisible}
      >
        <AppInput label="Ad" onChangeText={setName} placeholder="Toplanti Odasi A" value={name} />
        <AppInput autoCapitalize="characters" label="Kod" onChangeText={setCode} placeholder="ROOM-A" value={code} />

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Tip</Text>
          <View style={styles.optionWrap}>
            {[LocationType.FLOOR, LocationType.ROOM, LocationType.AREA].map((item) => (
              <OptionChip key={item} label={item} onPress={() => setType(item)} selected={type === item} />
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Parent Lokasyon</Text>
          <View style={styles.optionWrap}>
            {parentOptions.slice(0, 12).map((location) => (
              <OptionChip
                key={location.id}
                label={`${location.name} (${location.code})`}
                onPress={() => setParentId(location.id)}
                selected={parentId === location.id}
              />
            ))}
          </View>
        </View>

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}
        <AppButton label="Lokasyon Olustur" loading={submitting} onPress={handleCreateLocation} rightIcon="checkmark-outline" />
      </FormModal>
    </ScreenContainer>
  );
}

function LocationOrganizationCard({ node }: { node: LocationTreeNode }) {
  return (
    <View style={styles.orgCard}>
      <View style={styles.orgHeader}>
        <View style={styles.orgIcon}>
          <Ionicons name="business-outline" size={24} color={COLORS.heading} />
        </View>
        <View style={styles.orgTitleGroup}>
          <Text style={styles.orgName}>{node.name}</Text>
          <Text style={styles.orgMeta}>Ana Organizasyon</Text>
        </View>
        <StatusBadge label="Aktif" tone="success" />
      </View>

      <View style={styles.branchArea}>
        <View style={styles.branchLine} />
        <View style={styles.branchCards}>
          {node.children.length ? (
            node.children.map((child) => <LocationGroupCard key={child.id} node={child} />)
          ) : (
            <LocationGroupCard node={node} />
          )}
        </View>
      </View>
    </View>
  );
}

function LocationGroupCard({ node }: { node: LocationTreeNode }) {
  const visibleChildren = node.children.length ? node.children : node.qrCodes.map((qr) => ({
    id: qr.id,
    name: qr.label,
    code: qr.token,
    qrCodes: []
  }));

  return (
    <View style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <Ionicons name="layers-outline" size={16} color={COLORS.heading} />
        <Text style={styles.groupTitle}>{node.name}</Text>
      </View>

      {visibleChildren.slice(0, 4).map((child) => (
        <View key={child.id} style={styles.locationLeaf}>
          <Ionicons name="square-outline" size={14} color={COLORS.textMuted} />
          <Text numberOfLines={1} style={styles.leafName}>{child.name}</Text>
          <Text style={styles.leafCount}>{'qrCodes' in child ? child.qrCodes.length : 1} Envanter</Text>
        </View>
      ))}
    </View>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryTile}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function getLocationTotals(nodes: LocationTreeNode[]) {
  let locations = 0;
  let qrs = 0;

  function walk(items: LocationTreeNode[]) {
    for (const item of items) {
      locations += 1;
      qrs += item.qrCodes.length;
      walk(item.children);
    }
  }

  walk(nodes);
  return { locations, qrs };
}

function flattenLocationNodes(nodes: LocationTreeNode[]): LocationTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenLocationNodes(node.children)]);
}

function filterLocationNodes(nodes: LocationTreeNode[], rawSearchTerm: string): LocationTreeNode[] {
  const searchTerm = normalizeSearchText(rawSearchTerm);

  if (!searchTerm) {
    return nodes;
  }

  return nodes.flatMap((node) => {
    if (locationNodeMatches(node, searchTerm)) {
      return [node];
    }

    const children = filterLocationNodes(node.children, searchTerm);
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

function locationNodeMatches(node: LocationTreeNode, searchTerm: string) {
  const searchableText = [
    node.name,
    node.code,
    node.type,
    node.organization?.name,
    node.organization?.code,
    ...node.qrCodes.map((qr) => `${qr.label} ${qr.token} ${qr.isActive ? 'aktif' : 'pasif'}`)
  ]
    .map((value) => normalizeSearchText(value))
    .join(' ');

  return searchableText.includes(searchTerm);
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0
  },
  content: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: 22,
    paddingBottom: 16,
    gap: 14
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  pageTitle: {
    color: COLORS.heading,
    fontSize: 25,
    fontWeight: '800'
  },
  newButton: {
    flexShrink: 0,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12
  },
  newButtonText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '800'
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12
  },
  summaryTile: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  summaryValue: {
    color: COLORS.heading,
    fontSize: 28,
    fontWeight: '800'
  },
  treeList: {
    gap: 16
  },
  orgCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 14
  },
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  orgIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
    marginRight: 12
  },
  orgTitleGroup: {
    flex: 1
  },
  orgName: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800'
  },
  orgMeta: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 3
  },
  branchArea: {
    flexDirection: 'row',
    gap: 14
  },
  branchLine: {
    width: 1,
    backgroundColor: COLORS.border,
    marginLeft: 17
  },
  branchCards: {
    flex: 1,
    gap: 12
  },
  groupCard: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 12,
    gap: 12
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  groupTitle: {
    color: COLORS.heading,
    fontSize: 16,
    fontWeight: '800'
  },
  locationLeaf: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  leafName: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600'
  },
  leafCount: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700'
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
