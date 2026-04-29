import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { organizationsApi } from '../../api/admin';
import { getApiErrorMessage } from '../../api/client';
import { EmptyState } from '../../components/EmptyState';
import { LoadingView } from '../../components/LoadingView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatusBadge } from '../../components/StatusBadge';
import type { AdminOrganization } from '../../types/admin';
import { COLORS, LAYOUT } from '../../utils/constants';

export function OrganizationsScreen() {
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrganizations = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await organizationsApi.list();
      setOrganizations(response);
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
      void loadOrganizations('initial');
    }, [loadOrganizations])
  );

  const summary = useMemo(
    () => ({
      active: organizations.filter((organization) => organization.isActive).length,
      users: organizations.reduce((total, organization) => total + organization._count.users, 0),
      locations: organizations.reduce((total, organization) => total + organization._count.locations, 0)
    }),
    [organizations]
  );

  return (
    <ScreenContainer style={styles.screen}>
      <FlatList
        contentContainerStyle={organizations.length ? styles.content : styles.emptyContent}
        data={organizations}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.headerGroup}>
            <View style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>Kurumlar</Text>
              <Text style={styles.heroTitle}>Multi-organization</Text>
              <Text style={styles.heroDescription}>Kurum durumu, kullanici sayisi ve lokasyon dagilimini izle.</Text>
            </View>
            <View style={styles.summaryGrid}>
              <SummaryTile label="Aktif" value={String(summary.active)} />
              <SummaryTile label="Kullanici" value={String(summary.users)} />
              <SummaryTile label="Lokasyon" value={String(summary.locations)} />
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              title={error ? 'Kurumlar yuklenemedi' : 'Kurum yok'}
              description={error ?? 'Sistemde kurum kaydi bulunmuyor.'}
              actionLabel="Yeniden dene"
              onAction={() => void loadOrganizations('initial')}
            />
          )
        }
        onRefresh={() => void loadOrganizations('refresh')}
        refreshing={refreshing}
        renderItem={({ item }) => <OrganizationCard organization={item} />}
        showsVerticalScrollIndicator={false}
      />
      {loading ? <LoadingView description="Kurumlar aliniyor." title="Yukleniyor" /> : null}
    </ScreenContainer>
  );
}

function OrganizationCard({ organization }: { organization: AdminOrganization }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleGroup}>
          <Text style={styles.cardTitle}>{organization.name}</Text>
          <Text style={styles.cardMeta}>
            {organization.code} / {organization.type}
          </Text>
        </View>
        <StatusBadge label={organization.isActive ? 'Aktif' : 'Pasif'} tone={organization.isActive ? 'success' : 'danger'} />
      </View>

      <View style={styles.metricsRow}>
        <Metric label="Kullanici" value={organization._count.users} />
        <Metric label="Lokasyon" value={organization._count.locations} />
        <Metric label="Telegram" value={organization.telegramEnabled ? 'Acik' : 'Kapali'} />
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0
  },
  content: {
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
    gap: 14,
    marginBottom: 2
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
    fontSize: 29,
    fontWeight: '800'
  },
  heroDescription: {
    color: '#d4defa',
    fontSize: 15,
    lineHeight: 22
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10
  },
  summaryTile: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  summaryValue: {
    color: COLORS.heading,
    fontSize: 24,
    fontWeight: '800'
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 14
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10
  },
  cardTitleGroup: {
    flex: 1
  },
  cardTitle: {
    color: COLORS.heading,
    fontSize: 20,
    fontWeight: '800'
  },
  cardMeta: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10
  },
  metric: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceMuted,
    padding: 12
  },
  metricLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  metricValue: {
    color: COLORS.heading,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4
  }
});
