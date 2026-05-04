import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { InfoRow } from '../../components/InfoRow';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../utils/constants';
import { getRoleLabel } from '../../utils/role';

export function ProfileScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <ScreenContainer scrollable contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Geri"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.heading} />
        </Pressable>
        <Text style={styles.topBarTitle}>Profil</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Profil</Text>
        <Text style={styles.heroTitle}>{user?.fullName ?? 'Kullanıcı'}</Text>
      </View>

      <View style={styles.infoCard}>
        <InfoRow label="Ad soyad" value={user?.fullName} />
        <InfoRow label="E-posta" value={user?.email} />
        <InfoRow label="Rol" value={getRoleLabel(user?.role)} />
        <InfoRow label="Kurum" value={user?.organization?.name ?? 'Global admin'} />
        <InfoRow label="Durum" value={user?.isActive ? 'Aktif' : 'Pasif'} />
      </View>

      <AppButton label="Çıkış yap" onPress={() => void logout()} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14
  },
  topBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: COLORS.surface
  },
  backButtonPlaceholder: {
    width: 42,
    height: 42
  },
  topBarTitle: {
    color: COLORS.heading,
    fontSize: 18,
    fontWeight: '800'
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
    textTransform: 'uppercase'
  },
  heroTitle: {
    color: COLORS.surface,
    fontSize: 30,
    fontWeight: '800'
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  pressed: {
    opacity: 0.7
  }
});
