import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { OrganizationType } from '@lbrtw/shared';
import { useFocusEffect } from '@react-navigation/native';
import { organizationsApi } from '../../api/admin';
import { getApiErrorMessage } from '../../api/client';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { EmptyState } from '../../components/EmptyState';
import { FormModal, OptionChip } from '../../components/FormModal';
import { LoadingView } from '../../components/LoadingView';
import { MobileTopBar } from '../../components/MobileTopBar';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import type { AdminOrganization } from '../../types/admin';
import { COLORS, LAYOUT } from '../../utils/constants';
import { showUnavailableAction } from '../../utils/alerts';

export function OrganizationsScreen() {
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<OrganizationType>(OrganizationType.HOSPITAL);
  const [isActive, setIsActive] = useState(true);
  const [telegramEnabled, setTelegramEnabled] = useState(false);

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

  async function handleCreateOrganization() {
    setFormError(null);

    if (!name.trim() || !code.trim()) {
      setFormError('Kurum adi ve kod zorunludur.');
      return;
    }

    setSubmitting(true);
    try {
      await organizationsApi.create({
        name: name.trim(),
        code: code.trim(),
        type,
        isActive,
        telegramEnabled
      });
      setModalVisible(false);
      setName('');
      setCode('');
      setType(OrganizationType.HOSPITAL);
      setIsActive(true);
      setTelegramEnabled(false);
      await loadOrganizations('refresh');
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
        contentContainerStyle={organizations.length ? styles.content : styles.emptyContent}
        data={organizations}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.headerGroup}>
            <View style={styles.titleRow}>
              <Text style={styles.pageTitle}>Kurumlar</Text>
              <Pressable onPress={() => setModalVisible(true)} style={styles.newButton}>
                <Ionicons name="add" size={18} color={COLORS.surface} />
                <Text style={styles.newButtonText}>Yeni Kurum</Text>
              </Pressable>
            </View>
            <View style={styles.summaryGrid}>
              <StatCard icon="business-outline" label="Toplam Kurum" value={String(organizations.length)} />
              <StatCard icon="shield-checkmark-outline" label="Aktif" value={`${summary.active} / ${organizations.length}`} />
              <StatCard icon="people-outline" label="Kullanicilar" value={String(summary.users)} />
              <StatCard icon="paper-plane-outline" label="Telegram" tone="green" value={`${organizations.filter((item) => item.telegramEnabled).length} aktif`} />
            </View>
            <Text style={styles.sectionTitle}>Tum Kurumlar</Text>
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
      <FormModal
        onClose={() => setModalVisible(false)}
        subtitle="Kurum olusturulunca root lokasyon webdeki gibi otomatik acilir."
        title="Yeni Kurum"
        visible={modalVisible}
      >
        <AppInput label="Kurum Adi" onChangeText={setName} placeholder="Ozel Hastane C" value={name} />
        <AppInput autoCapitalize="characters" label="Kod" onChangeText={setCode} placeholder="HSP-C" value={code} />

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Tip</Text>
          <View style={styles.optionWrap}>
            {Object.values(OrganizationType).map((item) => (
              <OptionChip key={item} label={item} onPress={() => setType(item)} selected={type === item} />
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

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Telegram</Text>
          <View style={styles.optionWrap}>
            <OptionChip label="Kapali" onPress={() => setTelegramEnabled(false)} selected={!telegramEnabled} />
            <OptionChip label="Acik" onPress={() => setTelegramEnabled(true)} selected={telegramEnabled} />
          </View>
        </View>

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}
        <AppButton label="Kurum Olustur" loading={submitting} onPress={handleCreateOrganization} rightIcon="checkmark-outline" />
      </FormModal>
    </ScreenContainer>
  );
}

function OrganizationCard({ organization }: { organization: AdminOrganization }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.orgIcon, organization.isActive ? styles.orgIconActive : styles.orgIconPassive]}>
          <Ionicons name={organization.isActive ? 'business' : 'construct-outline'} size={23} color={organization.isActive ? COLORS.surface : COLORS.textMuted} />
        </View>
        <View style={styles.cardTitleGroup}>
          <Text style={styles.cardTitle}>{organization.name}</Text>
          <Text style={styles.cardMeta}>
            {organization.type}
          </Text>
        </View>
        <StatusBadge label={organization.isActive ? 'Aktif' : 'Pasif'} tone={organization.isActive ? 'success' : 'danger'} />
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerText}>{organization._count.locations} Lokasyon</Text>
        <Text style={styles.footerText}>{organization._count.users} Kullanici</Text>
      </View>
    </View>
  );
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
    flexWrap: 'wrap',
    gap: 10
  },
  sectionTitle: {
    color: COLORS.heading,
    fontSize: 17,
    fontWeight: '800'
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 14
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  orgIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  orgIconActive: {
    backgroundColor: COLORS.primary
  },
  orgIconPassive: {
    backgroundColor: '#e5e7eb'
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
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eef0f3',
    paddingTop: 12
  },
  footerText: {
    color: COLORS.text,
    fontSize: 13,
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
