import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { useAuthBootstrap } from '../hooks/useAuthBootstrap';
import { ScreenContainer } from '../components/ScreenContainer';
import { LoadingView } from '../components/LoadingView';
import { useAuthStore } from '../store/authStore';
import { COLORS } from '../utils/constants';

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

  if (status === 'idle' || status === 'loading') {
    return (
      <ScreenContainer centered>
        <LoadingView title="Oturum kontrol ediliyor" description="Kayitli token ile giris deneniyor." />
      </ScreenContainer>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {status === 'authenticated' ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
