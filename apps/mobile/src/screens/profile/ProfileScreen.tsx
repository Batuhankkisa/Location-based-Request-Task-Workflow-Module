import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { InfoRow } from '../../components/InfoRow';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuthStore } from '../../store/authStore';
import { API_BASE_URL, COLORS, LAYOUT } from '../../utils/constants';
import { getRoleLabel } from '../../utils/role';

export function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <ScreenContainer scrollable contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Profil</Text>
        <Text style={styles.heroTitle}>{user?.fullName ?? 'Kullanici'}</Text>
        <Text style={styles.heroSubtitle}>Mobil auth bootstrap SecureStore ile korunur.</Text>
      </View>

      <View style={styles.infoCard}>
        <InfoRow label="Ad soyad" value={user?.fullName} />
        <InfoRow label="Email" value={user?.email} />
        <InfoRow label="Rol" value={getRoleLabel(user?.role)} />
        <InfoRow label="Kurum" value={user?.organization?.name ?? 'Global admin'} />
        <InfoRow label="Durum" value={user?.isActive ? 'Aktif' : 'Pasif'} />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>API baglantisi</Text>
        <Text style={styles.sectionText}>{API_BASE_URL}</Text>
        <Text style={styles.sectionMuted}>
          Fiziksel cihazda test icin backend URL&apos;sini local IP ile guncelle.
        </Text>
      </View>

      <AppButton label="Logout" onPress={() => void logout()} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14
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
  heroSubtitle: {
    color: '#d4defa',
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
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.heading
  },
  sectionText: {
    color: COLORS.heading,
    fontSize: 16,
    fontWeight: '700'
  },
  sectionMuted: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 21
  }
});
