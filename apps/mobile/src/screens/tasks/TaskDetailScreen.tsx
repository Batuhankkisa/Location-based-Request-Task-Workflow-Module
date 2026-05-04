import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { RequestMediaType, TaskStatus } from '@lbrtw/shared';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { buildAssetUrl, getApiErrorMessage } from '../../api/client';
import { tasksApi } from '../../api/tasks';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { EmptyState } from '../../components/EmptyState';
import { InfoRow } from '../../components/InfoRow';
import { LoadingView } from '../../components/LoadingView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuthStore } from '../../store/authStore';
import type { RequestMediaItem, TaskDetail } from '../../types/task';
import { COLORS, LAYOUT, TASK_STATUS_META } from '../../utils/constants';
import { formatDateTime } from '../../utils/date';
import { canReviewTask } from '../../utils/role';
import type { TasksStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<TasksStackParamList, 'TaskDetail'>;
type TaskAction = 'start' | 'complete' | 'approve' | 'reject';

export function TaskDetailScreen({ route, navigation }: Props) {
  const { taskId } = route.params;
  const role = useAuthStore((state) => state.user?.role);

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [actionLoading, setActionLoading] = useState<TaskAction | null>(null);

  const loadTask = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await tasksApi.getById(taskId);
      setTask(response);
      setError(null);
      navigation.setOptions({ title: response.location.name });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation, taskId]);

  useEffect(() => {
    void loadTask('initial');
  }, [loadTask]);

  const images = useMemo(
    () => task?.request.media.filter((item) => item.type === RequestMediaType.IMAGE) ?? [],
    [task]
  );

  const audioUrl = task?.request.audioFileUrl ? buildAssetUrl(task.request.audioFileUrl) : null;
  const statusMeta = task ? TASK_STATUS_META[task.status] : null;

  async function handleAction(action: TaskAction) {
    if (!task) {
      return;
    }

    setActionLoading(action);
    setError(null);

    try {
      const payload = note.trim() ? { note } : undefined;
      let response: TaskDetail;

      switch (action) {
        case 'start':
          response = await tasksApi.start(task.id, payload);
          break;
        case 'complete':
          response = await tasksApi.complete(task.id, payload);
          break;
        case 'approve':
          response = await tasksApi.approve(task.id, payload);
          break;
        case 'reject':
          response = await tasksApi.reject(task.id, payload);
          break;
      }

      setTask(response);
      setNote('');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setActionLoading(null);
    }
  }

  if (loading && !task) {
    return (
      <ScreenContainer centered>
        <LoadingView description="Görev detay bilgisi alınıyor." title="Görev açılıyor" />
      </ScreenContainer>
    );
  }

  if (!task) {
    return (
      <ScreenContainer centered>
        <EmptyState
          title="Görev bulunamadı"
          description={error ?? 'Görev detayı okunamadı.'}
          actionLabel="Listeye dön"
          onAction={() => navigation.goBack()}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => void loadTask('refresh')} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Açık görev</Text>
          <View style={styles.heroRow}>
            <Text style={styles.heroTitle}>Görevi güncelle</Text>
            {statusMeta ? <StatusBadge label={statusMeta.label} tone={statusMeta.tone} /> : null}
          </View>
          <Text style={styles.heroSubtitle}>{task.request.requestText}</Text>
        </View>

        <View style={styles.infoCard}>
          <InfoRow label="Lokasyon" value={task.location.name} hint={task.location.code} />
          <InfoRow label="QR" value={task.request.qrCode?.label ?? '-'} hint={task.request.qrCode?.token ?? '-'} />
          <InfoRow label="Oluşma" value={formatDateTime(task.createdAt)} />
          <InfoRow label="Atanan" value={task.assignedTo ?? 'Henüz atanmadı'} />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Talep metni</Text>
          <Text style={styles.sectionText}>{task.request.requestText}</Text>
          {task.request.transcriptText ? (
            <>
              <Text style={styles.sectionSubheading}>Transcript</Text>
              <Text style={styles.sectionText}>{task.request.transcriptText}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ses alanı</Text>
          {audioUrl ? (
            <>
              <Text style={styles.sectionText}>Ses kaydı geldi. Oynatıcı yerine bu aşamada bağlantı alanı hazırlandı.</Text>
              <AppButton label="Ses bağlantısını aç" onPress={() => void Linking.openURL(audioUrl)} variant="secondary" />
            </>
          ) : (
            <Text style={styles.sectionMuted}>Bu talep için ses kaydı bulunmuyor.</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Görseller</Text>
          {images.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.imageRow}>
                {images.map((image) => (
                  <MediaCard image={image} key={image.id} />
                ))}
              </View>
            </ScrollView>
          ) : (
            <Text style={styles.sectionMuted}>Bu talep için görsel eklenmemiş.</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Aksiyon seçin</Text>
          <View style={styles.actionsGrid}>
            {task.status === TaskStatus.NEW ? (
              <AppButton
                label="Başlat"
                loading={actionLoading === 'start'}
                onPress={() => void handleAction('start')}
                style={styles.actionButton}
                variant="secondary"
              />
            ) : null}
            {task.status === TaskStatus.IN_PROGRESS ? (
              <AppButton
                label="Tamamla"
                loading={actionLoading === 'complete'}
                onPress={() => void handleAction('complete')}
                style={styles.actionButton}
                variant="secondary"
              />
            ) : null}
            {task.status === TaskStatus.DONE_WAITING_APPROVAL && canReviewTask(role) ? (
              <>
                <AppButton
                  label="Onayla"
                  loading={actionLoading === 'approve'}
                  onPress={() => void handleAction('approve')}
                  style={styles.actionButton}
                  variant="secondary"
                />
                <AppButton
                  label="Reddet"
                  loading={actionLoading === 'reject'}
                  onPress={() => void handleAction('reject')}
                  style={styles.actionButton}
                  variant="danger"
                />
              </>
            ) : null}
          </View>

          <AppInput
            label="Aksiyon notu"
            multiline
            onChangeText={setNote}
            placeholder="Açıklama veya ekip notu ekleyin"
            value={note}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Geçmiş</Text>
          <View style={styles.historyList}>
            {task.history.length ? (
              task.history.map((entry) => {
                const nextMeta = TASK_STATUS_META[entry.toStatus];
                return (
                  <View key={entry.id} style={styles.historyItem}>
                    <View style={styles.historyHead}>
                      <StatusBadge label={nextMeta.label} tone={nextMeta.tone} />
                      <Text style={styles.historyDate}>{formatDateTime(entry.createdAt)}</Text>
                    </View>
                    <Text style={styles.historyActor}>{entry.changedBy ?? 'Sistem'}</Text>
                    {entry.note ? <Text style={styles.historyNote}>{entry.note}</Text> : null}
                  </View>
                );
              })
            ) : (
              <Text style={styles.sectionMuted}>Henüz geçmiş kaydı yok.</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function MediaCard({ image }: { image: RequestMediaItem }) {
  const imageUrl = buildAssetUrl(image.fileUrl);

  return (
    <View style={styles.mediaCard}>
      {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.mediaImage} /> : null}
      <Text numberOfLines={1} style={styles.mediaName}>
        {image.originalName ?? image.storageKey}
      </Text>
      {imageUrl ? (
        <AppButton label="Aç" onPress={() => void Linking.openURL(imageUrl)} style={styles.mediaButton} variant="ghost" />
      ) : null}
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
  heroCard: {
    backgroundColor: COLORS.heading,
    borderRadius: 30,
    padding: 24,
    gap: 10
  },
  heroEyebrow: {
    color: '#b7c6eb',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  heroTitle: {
    flex: 1,
    color: COLORS.surface,
    fontSize: 30,
    fontWeight: '800'
  },
  heroSubtitle: {
    color: '#d5def8',
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
  sectionSubheading: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase'
  },
  sectionText: {
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 24
  },
  sectionMuted: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 22
  },
  imageRow: {
    flexDirection: 'row',
    gap: 14
  },
  mediaCard: {
    width: 180,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 20,
    padding: 12,
    gap: 10
  },
  mediaImage: {
    width: '100%',
    height: 120,
    borderRadius: 16,
    backgroundColor: '#dbe4fb'
  },
  mediaName: {
    color: COLORS.heading,
    fontSize: 14,
    fontWeight: '700'
  },
  mediaButton: {
    minHeight: 42
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  actionButton: {
    flexBasis: '48%'
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '600'
  },
  historyList: {
    gap: 12
  },
  historyItem: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 20,
    padding: 14,
    gap: 10
  },
  historyHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10
  },
  historyDate: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600'
  },
  historyActor: {
    color: COLORS.heading,
    fontSize: 15,
    fontWeight: '700'
  },
  historyNote: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22
  }
});
