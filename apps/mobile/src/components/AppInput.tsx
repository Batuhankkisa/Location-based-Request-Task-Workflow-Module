import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { COLORS, LAYOUT } from '../utils/constants';

interface AppInputProps extends TextInputProps {
  label: string;
  error?: string | null;
}

export function AppInput({ label, error, multiline, style, ...props }: AppInputProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#98a2b3"
        multiline={multiline}
        style={[styles.input, multiline ? styles.multiline : null, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: COLORS.textMuted,
    textTransform: 'uppercase'
  },
  input: {
    minHeight: 56,
    borderRadius: LAYOUT.controlRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 16
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: 'top'
  },
  error: {
    color: COLORS.danger,
    fontSize: 13
  }
});
