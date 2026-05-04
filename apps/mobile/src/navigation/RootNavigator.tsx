import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { useAuthBootstrap } from '../hooks/useAuthBootstrap';
import { ScreenContainer } from '../components/ScreenContainer';
import { LoadingView } from '../components/LoadingView';
import { AppButton } from '../components/AppButton';
import { useAuthStore } from '../store/authStore';
import { COLORS } from '../utils/constants';
import { canAccessMobileApp, getRoleLabel } from '../utils/role';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.text,
    border: COLORS.border,
    primary: COLORS.heading
  }
};

export function RootNavigator() {
  useAuthBootstrap();

  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  if (status === 'idle' || status === 'loading') {
    return (
      <ScreenContainer centered>
        <LoadingView title="Oturum kontrol ediliyor" description="Kayıtlı token ile giriş deneniyor." />
      </ScreenContainer>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {status === 'authenticated' ? (
        canAccessMobileApp(user?.role) ? (
          <AppNavigator />
        ) : (
          <ScreenContainer centered>
            <View style={styles.accessCard}>
              <Text style={styles.accessEyebrow}>Yetki gerekli</Text>
              <Text style={styles.accessTitle}>Mobil uygulama supervisor ve adminler içindir.</Text>
              <Text style={styles.accessDescription}>
                Bu hesap rolü: {getRoleLabel(user?.role)}. Görev ve QR operasyonları için supervisor veya admin
                hesabı ile giriş yapın.
              </Text>
              <AppButton label="Çıkış yap" onPress={() => void logout()} />
            </View>
          </ScreenContainer>
        )
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  accessCard: {
    width: '100%',
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    padding: 22
  },
  accessEyebrow: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  accessTitle: {
    color: COLORS.heading,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30
  },
  accessDescription: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22
  }
});
