import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EmptyState } from '../../components/EmptyState';
import { LoadingView } from '../../components/LoadingView';
import { MobileTopBar } from '../../components/MobileTopBar';
import { SearchBar } from '../../components/SearchBar';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { tasksApi } from '../../api/tasks';
import { getApiErrorMessage } from '../../api/client';
import type { TaskListItem } from '../../types/task';
import { formatDateTime, formatRelativeLabel } from '../../utils/date';
import { COLORS, LAYOUT, TASK_STATUS_META } from '../../utils/constants';
import { TaskStatus } from '@lbrtw/shared';
import type { TasksStackParamList } from '../../navigation/types';
import { matchesSearchTerm } from '../../utils/search';

type Props = NativeStackScreenProps<TasksStackParamList, 'TaskList'>;

export function TaskListScreen({ navigation }: Props) {
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');

  const loadTasks = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await tasksApi.list();
      setTasks(response);
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
      void loadTasks('initial');
    }, [loadTasks])
  );

  const summary = useMemo(
    () => ({
      total: tasks.length,
      newTasks: tasks.filter((task) => task.status === TaskStatus.NEW).length,
      inProgress: tasks.filter((task) => task.status === TaskStatus.IN_PROGRESS).length,
      waiting: tasks.filter((task) => task.status === TaskStatus.DONE_WAITING_APPROVAL).length
    }),
    [tasks]
  );
  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;
        const matchesSearch = matchesSearchTerm(searchTerm, [
          task.request.requestText,
          task.request.transcriptText,
          task.location.name,
          task.location.code,
          task.location.type,
          task.location.organization?.name,
          task.assignedTo,
          TASK_STATUS_META[task.status].label
        ]);

        return matchesStatus && matchesSearch;
      }),
    [searchTerm, statusFilter, tasks]
  );
  const hasActiveFilter = searchTerm.trim().length > 0 || statusFilter !== 'ALL';

  return (
    <ScreenContainer style={styles.screen}>
      <MobileTopBar />
      <FlatList
        contentContainerStyle={filteredTasks.length ? styles.listContent : styles.emptyContent}
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              title={error ? 'Gorevler yuklenemedi' : hasActiveFilter ? 'Sonuc bulunamadi' : 'Acik gorev yok'}
              description={
                error
                  ? error
                  : hasActiveFilter
                    ? 'Arama veya filtre secimine uyan gorev bulunamadi.'
                    : 'Bu rolde goruntulenebilir aktif bir gorev bulundugunda burada kart olarak listelenir.'
              }
              actionLabel={error || !hasActiveFilter ? 'Yeniden dene' : undefined}
              onAction={error || !hasActiveFilter ? () => void loadTasks('initial') : undefined}
            />
          )
        }
        ListHeaderComponent={
          <View style={styles.headerGroup}>
            <View style={styles.titleRow}>
              <View style={styles.titleTextGroup}>
                <Text style={styles.pageTitle}>Gorevler</Text>
                <Text style={styles.pageSubtitle}>QR taleplerinden olusan aktif gorevleri goruntuleyin ve yonetin.</Text>
              </View>
            </View>

            <View style={styles.statGrid}>
              <StatCard icon="clipboard-outline" label="Toplam" tone="violet" value={String(summary.total)} />
              <StatCard icon="sparkles-outline" label="Yeni" tone="blue" value={String(summary.newTasks)} />
              <StatCard icon="time-outline" label="Devam Eden" tone="amber" value={String(summary.inProgress)} />
              <StatCard icon="hourglass-outline" label="Onay Bekleyen" tone="green" value={String(summary.waiting)} />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.searchRow}>
                <View style={styles.searchWrap}>
                  <SearchBar
                    onChangeText={setSearchTerm}
                    placeholder="Talep, lokasyon veya kod ara..."
                    value={searchTerm}
                  />
                </View>
                <FilterChip active={statusFilter === 'ALL'} label="Tumu" onPress={() => setStatusFilter('ALL')} />
                <FilterChip
                  active={statusFilter === TaskStatus.NEW}
                  label={TASK_STATUS_META[TaskStatus.NEW].label}
                  onPress={() => setStatusFilter(TaskStatus.NEW)}
                />
                <FilterChip
                  active={statusFilter === TaskStatus.IN_PROGRESS}
                  label={TASK_STATUS_META[TaskStatus.IN_PROGRESS].label}
                  onPress={() => setStatusFilter(TaskStatus.IN_PROGRESS)}
                />
                <FilterChip
                  active={statusFilter === TaskStatus.DONE_WAITING_APPROVAL}
                  label={TASK_STATUS_META[TaskStatus.DONE_WAITING_APPROVAL].label}
                  onPress={() => setStatusFilter(TaskStatus.DONE_WAITING_APPROVAL)}
                />
              </View>
            </ScrollView>
          </View>
        }
        onRefresh={() => {
          void loadTasks('refresh');
        }}
        refreshing={refreshing}
        renderItem={({ item }) => {
          const statusMeta = TASK_STATUS_META[item.status];

          return (
            <Pressable
              onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
              style={({ pressed }) => [styles.taskCard, pressed ? styles.taskCardPressed : null]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.statusRow}>
                  <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
                  <Text style={styles.createdText}>{formatDateTime(item.createdAt)}</Text>
                </View>
                <Ionicons name="ellipsis-vertical" size={18} color="#6b7280" />
              </View>
              <Text style={styles.locationName}>{item.request.requestText || item.location.name}</Text>
              <Text numberOfLines={3} style={styles.requestText}>
                {item.location.name}
              </Text>

              <View style={styles.tagRow}>
                <View style={styles.tag}>
                  <Ionicons name="business-outline" size={13} color={COLORS.textMuted} />
                  <Text style={styles.tagText}>{item.location.code}</Text>
                </View>
                <View style={styles.tag}>
                  <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
                  <Text style={styles.tagText}>{formatRelativeLabel(item.createdAt)}</Text>
                </View>
              </View>

              <View style={styles.cardActionRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(item.assignedTo ?? 'M').slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={styles.detailButton}>
                  <Text style={styles.detailButtonText}>Detay</Text>
                </View>
              </View>
            </Pressable>
          );
        }}
        showsVerticalScrollIndicator={false}
      />

      {loading ? <LoadingView description="Task listesi cekiliyor." title="Gorevler yukleniyor" /> : null}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  pageTitle: {
    color: COLORS.heading,
    fontSize: 31,
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
    width: 86,
    flexShrink: 0,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
    alignItems: 'center',
    gap: 8
  },
  searchWrap: {
    width: 230
  },
  filterChip: {
    minHeight: 36,
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
    fontSize: 14,
    fontWeight: '800'
  },
  filterChipTextActive: {
    color: COLORS.surface
  },
  taskCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  taskCardPressed: {
    opacity: 0.94
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  createdText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600'
  },
  locationName: {
    color: COLORS.heading,
    fontSize: 18,
    fontWeight: '800'
  },
  requestText: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 5,
    backgroundColor: '#f0f2f5',
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  tagText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700'
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eef0f3',
    paddingTop: 14
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb'
  },
  avatarText: {
    color: COLORS.heading,
    fontSize: 12,
    fontWeight: '800'
  },
  detailButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 18
  },
  detailButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800'
  },
  pressed: {
    opacity: 0.75
  }
});
