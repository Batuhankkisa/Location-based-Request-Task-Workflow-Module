import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getApiErrorMessage } from '../../api/client';
import { locationsApi } from '../../api/admin';
import { EmptyState } from '../../components/EmptyState';
import { LoadingView } from '../../components/LoadingView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatusBadge } from '../../components/StatusBadge';
import type { LocationTreeNode } from '../../types/admin';
import { COLORS, LAYOUT } from '../../utils/constants';

export function LocationsScreen() {
  const [locations, setLocations] = useState<LocationTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLocations = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await locationsApi.tree();
      setLocations(response);
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
  const flatLocations = useMemo(() => flattenLocationNodes(locations), [locations]);

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => void loadLocations('refresh')} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Lokasyon agaci</Text>
          <Text style={styles.heroTitle}>Tesis yapisi</Text>
          <Text style={styles.heroDescription}>Kurum, kat, oda ve alan hiyerarsisini QR baglariyla birlikte izle.</Text>
        </View>

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

        <View style={styles.treeList}>
          {flatLocations.map(({ node, depth }) => (
            <LocationNodeRow depth={depth} key={node.id} node={node} />
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function LocationNodeRow({ node, depth }: { node: LocationTreeNode; depth: number }) {
  const depthLabel = depth === 0 ? 'Kurum' : depth === 1 ? 'Kat' : depth === 2 ? 'Oda' : 'Alan';

  return (
    <View style={styles.nodeRow}>
      <View style={styles.depthRail}>
        <View style={[styles.depthDot, depth === 0 ? styles.depthDotRoot : null]} />
        <View style={styles.depthLine} />
      </View>

      <View style={[styles.nodeContent, { paddingLeft: Math.min(depth * 12, 36) }]}>
        <View style={styles.nodeHeader}>
          <View style={styles.nodeTitleGroup}>
            <Text style={styles.nodeType}>{depthLabel}</Text>
            <Text style={styles.nodeName}>{node.name}</Text>
            <Text style={styles.nodeMeta}>
              {node.code} / {node.type}
            </Text>
          </View>
          <StatusBadge label={`${node.qrCodes.length} QR`} tone={node.qrCodes.length ? 'info' : 'neutral'} />
        </View>

        {node.qrCodes.length ? (
          <View style={styles.qrRow}>
            {node.qrCodes.slice(0, 3).map((qr) => (
              <View key={qr.id} style={styles.qrChip}>
                <Text numberOfLines={1} style={styles.qrChipText}>
                  {qr.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
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

function flattenLocationNodes(nodes: LocationTreeNode[], depth = 0): Array<{ node: LocationTreeNode; depth: number }> {
  return nodes.flatMap((node) => [
    { node, depth },
    ...flattenLocationNodes(node.children, depth + 1)
  ]);
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
    borderRadius: 24,
    padding: 22,
    gap: 8
  },
  heroEyebrow: {
    color: '#b7c6eb',
    fontSize: 12,
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
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    overflow: 'hidden'
  },
  nodeRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  depthRail: {
    width: 18,
    alignItems: 'center'
  },
  depthDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: '#9aa8c7',
    marginTop: 7
  },
  depthDotRoot: {
    width: 12,
    height: 12,
    backgroundColor: COLORS.heading
  },
  depthLine: {
    flex: 1,
    width: 1,
    minHeight: 42,
    backgroundColor: COLORS.border,
    marginTop: 4
  },
  nodeContent: {
    flex: 1,
    gap: 9
  },
  nodeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10
  },
  nodeTitleGroup: {
    flex: 1
  },
  nodeType: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 2
  },
  nodeName: {
    color: COLORS.heading,
    fontSize: 17,
    fontWeight: '800'
  },
  nodeMeta: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3
  },
  qrRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  qrChip: {
    maxWidth: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.infoSoft,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  qrChipText: {
    color: COLORS.heading,
    fontSize: 12,
    fontWeight: '700'
  }
});
