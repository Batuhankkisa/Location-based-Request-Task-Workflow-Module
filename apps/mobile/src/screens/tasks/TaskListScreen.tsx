import { useCallback, useState } from 'react';
import { Pressable, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EmptyState } from '../../components/EmptyState';
import { LoadingView } from '../../components/LoadingView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatusBadge } from '../../components/StatusBadge';
import { tasksApi } from '../../api/tasks';
import { getApiErrorMessage } from '../../api/client';
import type { TaskListItem } from '../../types/task';
import { formatDateTime, formatRelativeLabel } from '../../utils/date';
import { COLORS, LAYOUT, TASK_STATUS_META } from '../../utils/constants';
import type { TasksStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<TasksStackParamList, 'TaskList'>;

export function TaskListScreen({ navigation }: Props) {
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <ScreenContainer style={styles.screen}>
      <FlatList
        contentContainerStyle={tasks.length ? styles.listContent : styles.emptyContent}
        data={tasks}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              title={error ? 'Gorevler yuklenemedi' : 'Acik gorev yok'}
              description={
                error
                  ? error
                  : 'Bu rolde goruntulenebilir aktif bir gorev bulundugunda burada kart olarak listelenir.'
              }
              actionLabel="Yeniden dene"
              onAction={() => {
                void loadTasks('initial');
              }}
            />
          )
        }
        ListHeaderComponent={
          <View style={styles.headerGroup}>
            <View style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>Acik gorevler</Text>
              <Text style={styles.heroTitle}>Task akisi</Text>
              <Text style={styles.heroDescription}>
                QR talebinden dogan isler bu listede durum badge&apos;i ile gorunur.
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Toplam</Text>
              <Text style={styles.summaryValue}>{tasks.length}</Text>
              <Text style={styles.summaryHint}>Pull to refresh ile listeyi guncelleyebilirsin.</Text>
            </View>
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
                <Text style={styles.locationName}>{item.location.name}</Text>
                <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
              </View>
              <Text style={styles.locationCode}>{item.location.code}</Text>
              <Text numberOfLines={3} style={styles.requestText}>
                {item.request.requestText}
              </Text>

              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.footerLabel}>Olusma</Text>
                  <Text style={styles.footerValue}>{formatDateTime(item.createdAt)}</Text>
                </View>
                <View>
                  <Text style={styles.footerLabel}>Gorev yasi</Text>
                  <Text style={styles.footerValue}>{formatRelativeLabel(item.createdAt)}</Text>
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
    gap: 14,
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
    letterSpacing: 0.7,
    textTransform: 'uppercase'
  },
  heroTitle: {
    color: COLORS.surface,
    fontSize: 32,
    fontWeight: '800'
  },
  heroDescription: {
    color: '#d4defa',
    fontSize: 15,
    lineHeight: 22
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    gap: 4
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  summaryValue: {
    color: COLORS.heading,
    fontSize: 30,
    fontWeight: '800'
  },
  summaryHint: {
    color: COLORS.textMuted,
    fontSize: 13
  },
  taskCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 26,
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
    alignItems: 'flex-start',
    gap: 12
  },
  locationName: {
    flex: 1,
    color: COLORS.heading,
    fontSize: 22,
    fontWeight: '800'
  },
  locationCode: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600'
  },
  requestText: {
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 24
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingTop: 8
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
