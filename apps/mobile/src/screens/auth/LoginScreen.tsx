import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>LBRTW Mobile</Text>
          <Text style={styles.title}>Personel Girisi</Text>
          <Text style={styles.subtitle}>
            Mevcut auth contract ile ayni API uzerinden gorev ve QR akisina baglanir.
          </Text>
        </View>

        <View style={styles.locationCard}>
          <Text style={styles.locationLabel}>API BAGLANTISI</Text>
          <Text style={styles.locationValue}>{API_BASE_URL}</Text>
          <Text style={styles.locationHint}>
            Telefonda test edeceksen localhost yerine bilgisayarinin local IP adresini gir.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Login</Text>
          <Text style={styles.formDescription}>
            Admin, supervisor ve staff kullanicilari ayni ekrandan giris yapar.
          </Text>

          <AppInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            label="Email"
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
            label="Sifre"
            onChangeText={(value) => {
              clearError();
              setValidationError(null);
              setPassword(value);
            }}
            placeholder="Admin123!"
            secureTextEntry
            value={password}
          />

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <AppButton label="Giris Yap" loading={isLoading} onPress={handleSubmit} />

          <Text style={styles.footnote}>
            Bu ilk surumde refresh token yok. Access token SecureStore icinde saklanir.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    gap: LAYOUT.sectionGap
  },
  hero: {
    backgroundColor: COLORS.heading,
    borderRadius: 30,
    padding: 24,
    gap: 8
  },
  eyebrow: {
    color: '#b8c7ec',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  },
  title: {
    color: COLORS.surface,
    fontSize: 34,
    fontWeight: '800'
  },
  subtitle: {
    color: '#d7e1ff',
    fontSize: 15,
    lineHeight: 22
  },
  locationCard: {
    backgroundColor: '#e5ecff',
    borderRadius: 22,
    padding: 18,
    gap: 6
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5570a5',
    letterSpacing: 0.4
  },
  locationValue: {
    color: COLORS.heading,
    fontSize: 15,
    fontWeight: '700'
  },
  locationHint: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 30,
    padding: 22,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  formTitle: {
    color: COLORS.heading,
    fontSize: 24,
    fontWeight: '800'
  },
  formDescription: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 21
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '600'
  },
  footnote: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center'
  }
});
