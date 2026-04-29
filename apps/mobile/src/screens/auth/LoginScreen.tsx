import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuthStore } from '../../store/authStore';
import { API_BASE_URL, COLORS, LAYOUT } from '../../utils/constants';

export function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const status = useAuthStore((state) => state.status);
  const authError = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin123!');
  const [validationError, setValidationError] = useState<string | null>(null);

  const isLoading = status === 'loading';
  const errorMessage = validationError ?? authError;

  async function handleSubmit() {
    clearError();
    setValidationError(null);

    if (!email.trim() || !password.trim()) {
      setValidationError('Email ve sifre zorunludur.');
      return;
    }

    try {
      await login(email, password);
    } catch (_error) {
      return;
    }
  }

  return (
    <ScreenContainer scrollable contentContainerStyle={styles.content}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardArea}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandIconText}>N</Text>
          </View>
          <Text style={styles.brandTitle}>Nexus</Text>
          <Text style={styles.brandSubtitle}>Enterprise Portal</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Hesabiniza Giris Yapin</Text>

          <AppInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            label="E-POSTA ADRESI"
            onChangeText={(value) => {
              clearError();
              setValidationError(null);
              setEmail(value);
            }}
            placeholder="admin@example.com"
            value={email}
          />

          <AppInput
            autoCapitalize="none"
            autoCorrect={false}
            label="SIFRE"
            onChangeText={(value) => {
              clearError();
              setValidationError(null);
              setPassword(value);
            }}
            placeholder="Admin123!"
            secureTextEntry
            value={password}
          />

          <View style={styles.loginActionRow}>
            <Pressable disabled style={styles.rememberMe}>
              <View style={styles.checkbox} />
              <Text style={styles.actionText}>Beni Hatirla</Text>
            </Pressable>
            <Text style={styles.actionText}>Sifremi Unuttum?</Text>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <AppButton label={isLoading ? 'Giris yapiliyor...' : 'Giris yap'} loading={isLoading} onPress={handleSubmit} />

          <Text style={styles.apiHint}>API: {API_BASE_URL}</Text>
        </View>

        <Text style={styles.footer}>© 2026 Nexus Enterprise. Tum haklari saklidir.</Text>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center'
  },
  keyboardArea: {
    gap: LAYOUT.sectionGap
  },
  brand: {
    alignItems: 'center',
    gap: 7,
    paddingBottom: 8
  },
  brandIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.heading
  },
  brandIconText: {
    color: COLORS.surface,
    fontSize: 25,
    fontWeight: '800'
  },
  brandTitle: {
    color: COLORS.heading,
    fontSize: 34,
    fontWeight: '800'
  },
  brandSubtitle: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontWeight: '700'
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 22,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  formTitle: {
    color: COLORS.heading,
    fontSize: 25,
    fontWeight: '800',
    marginBottom: 4
  },
  loginActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted
  },
  actionText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700'
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '600'
  },
  apiHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center'
  },
  footer: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center'
  }
});
