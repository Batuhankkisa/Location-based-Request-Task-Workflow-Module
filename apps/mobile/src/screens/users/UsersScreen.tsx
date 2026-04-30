import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Role } from '@lbrtw/shared';
import { useFocusEffect } from '@react-navigation/native';
import { organizationsApi, usersApi } from '../../api/admin';
import { getApiErrorMessage } from '../../api/client';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { EmptyState } from '../../components/EmptyState';
import { FormModal, OptionChip } from '../../components/FormModal';
import { LoadingView } from '../../components/LoadingView';
import { MobileTopBar } from '../../components/MobileTopBar';
import { SearchBar } from '../../components/SearchBar';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import type { AdminOrganization, AdminUser } from '../../types/admin';
import { COLORS, LAYOUT } from '../../utils/constants';
import { getRoleLabel } from '../../utils/role';
import { matchesSearchTerm } from '../../utils/search';

type RoleFilter = 'ALL' | Role;
type UserStatusFilter = 'ALL' | 'ACTIVE' | 'PASSIVE';

const ROLE_FILTER_SEQUENCE: RoleFilter[] = ['ALL', Role.SUPERVISOR, Role.STAFF, Role.ADMIN];
const STATUS_FILTER_SEQUENCE: UserStatusFilter[] = ['ALL', 'ACTIVE', 'PASSIVE'];

export function UsersScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Admin123!');
  const [role, setRole] = useState<Role>(Role.STAFF);
  const [organizationId, setOrganizationId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('ALL');

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

  const loadOrganizations = useCallback(async () => {
    try {
      const response = await organizationsApi.list();
      setOrganizations(response);
      setOrganizationId((current) => current || response[0]?.id || '');
    } catch (_error) {
      return;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadUsers('initial');
      void loadOrganizations();
    }, [loadUsers, loadOrganizations])
  );

  const summary = useMemo(
    () => ({
      supervisors: users.filter((user) => user.role === Role.SUPERVISOR).length,
      staff: users.filter((user) => user.role === Role.STAFF).length,
      admins: users.filter((user) => user.role === Role.ADMIN).length
    }),
    [users]
  );
  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
        const matchesStatus =
          statusFilter === 'ALL' ||
          (statusFilter === 'ACTIVE' && user.isActive) ||
          (statusFilter === 'PASSIVE' && !user.isActive);
        const matchesSearch = matchesSearchTerm(searchTerm, [
          user.fullName,
          user.email,
          user.role,
          getRoleLabel(user.role),
          user.organization?.name,
          user.organization?.code,
          user.isActive ? 'aktif' : 'pasif'
        ]);

        return matchesRole && matchesStatus && matchesSearch;
      }),
    [roleFilter, searchTerm, statusFilter, users]
  );
  const hasActiveFilter = searchTerm.trim().length > 0 || roleFilter !== 'ALL' || statusFilter !== 'ALL';

  function openCreateModal() {
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setPassword('Admin123!');
    setRole(Role.STAFF);
    setOrganizationId(organizations[0]?.id ?? '');
    setIsActive(true);
    setFormError(null);
    setModalVisible(true);
  }

  function openEditModal(user: AdminUser) {
    setEditingUser(user);
    setFullName(user.fullName);
    setEmail(user.email);
    setPassword('');
    setRole(user.role);
    setOrganizationId(user.organizationId ?? organizations[0]?.id ?? '');
    setIsActive(user.isActive);
    setFormError(null);
    setModalVisible(true);
  }

  async function handleSaveUser() {
    setFormError(null);

    if (!fullName.trim() || !email.trim() || (!editingUser && !password.trim())) {
      setFormError(editingUser ? 'Ad soyad ve email zorunludur.' : 'Ad soyad, email ve sifre zorunludur.');
      return;
    }

    if (role !== Role.ADMIN && !organizationId) {
      setFormError('Supervisor ve staff kullanicilari icin kurum zorunludur.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        fullName: fullName.trim(),
        email: email.trim(),
        role,
        organizationId: role === Role.ADMIN ? undefined : organizationId,
        isActive
      };

      if (editingUser) {
        await usersApi.update(editingUser.id, {
          ...payload,
          organizationId: role === Role.ADMIN ? null : organizationId,
          ...(password.trim() ? { password: password.trim() } : {})
        });
      } else {
        await usersApi.create({
          ...payload,
          password: password.trim()
        });
      }

      setModalVisible(false);
      setEditingUser(null);
      setFullName('');
      setEmail('');
      setPassword('Admin123!');
      setRole(Role.STAFF);
      setIsActive(true);
      await loadUsers('refresh');
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
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={filteredUsers.length ? styles.content : styles.emptyContent}
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.headerGroup}>
            <View style={styles.topLine}>
              <Text style={styles.panelTitle}>Yonetim Paneli</Text>
              <View style={styles.profileGroup}>
                <View>
                  <Text style={styles.profileTitle}>Admin Profil</Text>
                  <Text style={styles.profileSubtitle}>Yonetici</Text>
                </View>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>A</Text>
                </View>
              </View>
            </View>

            <View style={styles.titleRow}>
              <View style={styles.titleTextGroup}>
                <Text style={styles.pageTitle}>Supervisor ve Staff Hesaplari</Text>
                <Text style={styles.pageSubtitle}>Sistemdeki tum operasyonel kullanicilari yonetin.</Text>
              </View>
              <Pressable onPress={openCreateModal} style={styles.newButton}>
                <Ionicons name="add" size={18} color={COLORS.surface} />
                <Text style={styles.newButtonText}>Yeni Kullanici Ekle</Text>
              </Pressable>
            </View>

            <View style={styles.summaryGrid}>
              <StatCard icon="people-outline" label="Toplam" value={String(users.length)} />
              <StatCard icon="id-card-outline" label="Supervisor" tone="blue" value={String(summary.supervisors)} />
              <StatCard icon="people-circle-outline" label="Staff" value={String(summary.staff)} />
              <StatCard icon="shield-outline" label="Global Admin" tone="red" value={String(summary.admins)} />
            </View>

            <View style={styles.filterPanel}>
              <View style={styles.searchWrap}>
                <SearchBar
                  onChangeText={setSearchTerm}
                  placeholder="Isim, email veya kurum ara..."
                  value={searchTerm}
                />
              </View>
              <Pressable onPress={() => setRoleFilter(getNextValue(roleFilter, ROLE_FILTER_SEQUENCE))} style={styles.roleSelect}>
                <Text style={styles.roleSelectText}>{getRoleFilterLabel(roleFilter)}</Text>
                <Ionicons name="chevron-down" size={14} color={COLORS.text} />
              </Pressable>
              <Pressable onPress={() => setStatusFilter(getNextValue(statusFilter, STATUS_FILTER_SEQUENCE))} style={styles.filterButton}>
                <Ionicons name="filter-outline" size={17} color={COLORS.text} />
                <Text style={styles.filterText}>{getStatusFilterLabel(statusFilter)}</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              title={error ? 'Kullanicilar yuklenemedi' : hasActiveFilter ? 'Sonuc bulunamadi' : 'Kullanici yok'}
              description={
                error ??
                (hasActiveFilter
                  ? 'Arama veya filtre secimine uyan kullanici bulunamadi.'
                  : 'Sistemde kullanici kaydi bulunmuyor.')
              }
              actionLabel={error || !hasActiveFilter ? 'Yeniden dene' : undefined}
              onAction={error || !hasActiveFilter ? () => void loadUsers('initial') : undefined}
            />
          )
        }
        onRefresh={() => void loadUsers('refresh')}
        numColumns={2}
        refreshing={refreshing}
        renderItem={({ item }) => <UserCard onEdit={openEditModal} user={item} />}
        showsVerticalScrollIndicator={false}
      />
      {loading ? <LoadingView description="Kullanicilar aliniyor." title="Yukleniyor" /> : null}
      <FormModal
        onClose={() => setModalVisible(false)}
        subtitle={
          editingUser
            ? 'Kullanici bilgileri, rol, kurum ve durum guncellenir.'
            : 'Webdeki kullanici olusturma mantigi ile ayni endpoint kullanilir.'
        }
        title={editingUser ? 'Kullanici Duzenle' : 'Yeni Kullanici'}
        visible={modalVisible}
      >
        <AppInput label="Ad Soyad" onChangeText={setFullName} placeholder="Mehmet Can" value={fullName} />
        <AppInput
          autoCapitalize="none"
          keyboardType="email-address"
          label="Email"
          onChangeText={setEmail}
          placeholder="m.can@example.com"
          value={email}
        />
        <AppInput
          label="Sifre"
          onChangeText={setPassword}
          placeholder={editingUser ? 'Degistirmeyeceksen bos birak' : 'Admin123!'}
          secureTextEntry
          value={password}
        />

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Rol</Text>
          <View style={styles.optionWrap}>
            {[Role.STAFF, Role.SUPERVISOR, Role.ADMIN].map((item) => (
              <OptionChip key={item} label={getRoleLabel(item)} onPress={() => setRole(item)} selected={role === item} />
            ))}
          </View>
        </View>

        {role !== Role.ADMIN ? (
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Kurum</Text>
            <View style={styles.optionWrap}>
              {organizations.map((organization) => (
                <OptionChip
                  key={organization.id}
                  label={organization.name}
                  onPress={() => setOrganizationId(organization.id)}
                  selected={organizationId === organization.id}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Durum</Text>
          <View style={styles.optionWrap}>
            <OptionChip label="Aktif" onPress={() => setIsActive(true)} selected={isActive} />
            <OptionChip label="Pasif" onPress={() => setIsActive(false)} selected={!isActive} />
          </View>
        </View>

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}
        <AppButton
          label={editingUser ? 'Kullanici Guncelle' : 'Kullanici Olustur'}
          loading={submitting}
          onPress={handleSaveUser}
          rightIcon="checkmark-outline"
        />
      </FormModal>
    </ScreenContainer>
  );
}

function getNextValue<T>(current: T, sequence: T[]) {
  const currentIndex = sequence.indexOf(current);
  return sequence[(currentIndex + 1) % sequence.length] ?? sequence[0];
}

function getRoleFilterLabel(roleFilter: RoleFilter) {
  return roleFilter === 'ALL' ? 'Tum Roller' : getRoleLabel(roleFilter);
}

function getStatusFilterLabel(statusFilter: UserStatusFilter) {
  if (statusFilter === 'ACTIVE') {
    return 'Aktif';
  }

  if (statusFilter === 'PASSIVE') {
    return 'Pasif';
  }

  return 'Tum Durumlar';
}

function UserCard({ onEdit, user }: { onEdit: (user: AdminUser) => void; user: AdminUser }) {
  const initials = user.fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.userAvatar, user.role === Role.ADMIN ? styles.adminAvatar : null]}>
          <Text style={[styles.userAvatarText, user.role === Role.ADMIN ? styles.adminAvatarText : null]}>{initials}</Text>
        </View>
        <View style={styles.cardTitleGroup}>
          <Text numberOfLines={1} style={styles.cardTitle}>{user.fullName}</Text>
          <Text style={styles.cardMeta}>{user.email}</Text>
        </View>
        <Ionicons name="ellipsis-vertical" size={16} color={COLORS.textMuted} />
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Rol</Text>
          <Text style={[styles.infoValue, user.role === Role.ADMIN ? styles.adminRoleText : null]}>
            {getRoleLabel(user.role)}
          </Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Durum</Text>
          <Text style={styles.infoValue}>{user.isActive ? 'Aktif' : 'Pasif'}</Text>
        </View>
      </View>
      <View style={styles.orgBox}>
        <Text style={styles.infoLabel}>Kurum</Text>
        <Text numberOfLines={1} style={styles.orgValue}>{user.organization?.name ?? 'Tum Sistem'}</Text>
      </View>
      <Pressable onPress={() => onEdit(user)} style={({ pressed }) => [styles.editButton, pressed ? styles.pressed : null]}>
        <Text style={styles.editButtonText}>Duzenle</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0
  },
  content: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingVertical: 22,
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
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  panelTitle: {
    color: COLORS.heading,
    fontSize: 18,
    fontWeight: '800'
  },
  profileGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  profileTitle: {
    color: COLORS.text,
    fontSize: 15,
    textAlign: 'right'
  },
  profileSubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'right',
    marginTop: 2
  },
  profileAvatar: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c7d2e8'
  },
  profileAvatarText: {
    color: COLORS.heading,
    fontSize: 15,
    fontWeight: '800'
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  titleTextGroup: {
    flex: 1,
    flexShrink: 1
  },
  pageTitle: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: '800',
    lineHeight: 31
  },
  pageSubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5
  },
  newButton: {
    flexShrink: 0,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 11
  },
  newButtonText: {
    color: COLORS.surface,
    fontSize: 12,
    fontWeight: '800'
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  filterPanel: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 12,
    gap: 10
  },
  searchWrap: {
    flex: 1
  },
  roleSelect: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12
  },
  roleSelectText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600'
  },
  filterButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: '#eef1f6'
  },
  filterText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700'
  },
  columnWrapper: {
    gap: 6
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 12
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#cdd5e5'
  },
  adminAvatar: {
    backgroundColor: COLORS.dangerSoft
  },
  userAvatarText: {
    color: COLORS.heading,
    fontSize: 14,
    fontWeight: '800'
  },
  adminAvatarText: {
    color: COLORS.danger
  },
  cardTitleGroup: {
    flex: 1
  },
  cardTitle: {
    color: COLORS.heading,
    fontSize: 16,
    fontWeight: '800'
  },
  cardMeta: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 6
  },
  infoBox: {
    flex: 1,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#e5eaf1',
    backgroundColor: '#f5f7fa',
    padding: 8
  },
  infoLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  infoValue: {
    color: COLORS.heading,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5
  },
  adminRoleText: {
    color: COLORS.danger
  },
  orgBox: {
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#e5eaf1',
    backgroundColor: '#f5f7fa',
    padding: 8
  },
  orgValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6
  },
  editButton: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.surfaceMuted
  },
  editButtonText: {
    color: COLORS.heading,
    fontSize: 12,
    fontWeight: '800'
  },
  pressed: {
    opacity: 0.75
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
