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
        <View style={styles.formCard}>
          <Text style={styles.brandTitle}>QRTALEP</Text>
          <Text style={styles.formTitle}>Admin ve Personel Login</Text>
          <Text style={styles.formSubtitle}>Guvenli JWT tabanli giris yapin.</Text>

          <AppInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            label="E-POSTA ADRESI"
            leftIcon="mail-outline"
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
            leftIcon="lock-closed-outline"
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

          <AppButton
            label={isLoading ? 'Giris yapiliyor...' : 'Giris Yap'}
            loading={isLoading}
            onPress={handleSubmit}
            rightIcon="arrow-forward-outline"
          />
        </View>

        <Text style={styles.apiHint}>API: {API_BASE_URL}</Text>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center'
  },
  keyboardArea: {
    gap: 14
  },
  brandTitle: {
    color: COLORS.heading,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center'
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  formTitle: {
    color: COLORS.text,
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'center'
  },
  formSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: -8,
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
    borderRadius: 4,
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
  }
});
