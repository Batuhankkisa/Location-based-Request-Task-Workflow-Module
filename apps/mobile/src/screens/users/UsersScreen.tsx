import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Role } from '@lbrtw/shared';
import { useFocusEffect } from '@react-navigation/native';
import { usersApi } from '../../api/admin';
import { getApiErrorMessage } from '../../api/client';
import { EmptyState } from '../../components/EmptyState';
import { LoadingView } from '../../components/LoadingView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatusBadge } from '../../components/StatusBadge';
import type { AdminUser } from '../../types/admin';
import { COLORS, LAYOUT } from '../../utils/constants';
import { getRoleLabel } from '../../utils/role';

export function UsersScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await usersApi.list();
      setUsers(response);
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
      void loadUsers('initial');
    }, [loadUsers])
  );

  const summary = useMemo(
    () => ({
      supervisors: users.filter((user) => user.role === Role.SUPERVISOR).length,
      staff: users.filter((user) => user.role === Role.STAFF).length,
      admins: users.filter((user) => user.role === Role.ADMIN).length
    }),
    [users]
  );

  return (
    <ScreenContainer style={styles.screen}>
      <FlatList
        contentContainerStyle={users.length ? styles.content : styles.emptyContent}
        data={users}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.headerGroup}>
            <View style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>Kullanicilar</Text>
              <Text style={styles.heroTitle}>Rol ve kurum</Text>
              <Text style={styles.heroDescription}>Admin, supervisor ve staff hesaplarini mobilde takip et.</Text>
            </View>
            <View style={styles.summaryGrid}>
              <SummaryTile label="Admin" value={String(summary.admins)} />
              <SummaryTile label="Supervisor" value={String(summary.supervisors)} />
              <SummaryTile label="Staff" value={String(summary.staff)} />
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              title={error ? 'Kullanicilar yuklenemedi' : 'Kullanici yok'}
              description={error ?? 'Sistemde kullanici kaydi bulunmuyor.'}
              actionLabel="Yeniden dene"
              onAction={() => void loadUsers('initial')}
            />
          )
        }
        onRefresh={() => void loadUsers('refresh')}
        refreshing={refreshing}
        renderItem={({ item }) => <UserCard user={item} />}
        showsVerticalScrollIndicator={false}
      />
      {loading ? <LoadingView description="Kullanicilar aliniyor." title="Yukleniyor" /> : null}
    </ScreenContainer>
  );
}

function UserCard({ user }: { user: AdminUser }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleGroup}>
          <Text style={styles.cardTitle}>{user.fullName}</Text>
          <Text style={styles.cardMeta}>{user.email}</Text>
        </View>
        <StatusBadge label={user.isActive ? 'Aktif' : 'Pasif'} tone={user.isActive ? 'success' : 'danger'} />
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Rol</Text>
        <Text style={styles.infoValue}>{getRoleLabel(user.role)}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Kurum</Text>
        <Text style={styles.infoValue}>{user.organization?.name ?? 'Global admin'}</Text>
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
    gap: 12
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
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceMuted,
    padding: 12
  },
  infoLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  infoValue: {
    flex: 1,
    color: COLORS.heading,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right'
  }
});
