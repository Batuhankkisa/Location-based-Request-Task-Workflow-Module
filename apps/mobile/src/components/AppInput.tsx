import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { COLORS, LAYOUT } from '../utils/constants';

interface AppInputProps extends TextInputProps {
  label: string;
  error?: string | null;
  leftIcon?: ComponentProps<typeof Ionicons>['name'];
}

export function AppInput({ label, error, multiline, style, leftIcon, ...props }: AppInputProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputShell}>
        {leftIcon ? <Ionicons name={leftIcon} size={22} color="#3f4654" /> : null}
        <TextInput
          placeholderTextColor="#7b8493"
          multiline={multiline}
          style={[styles.input, multiline ? styles.multiline : null, style]}
          {...props}
        />
      </View>
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
  inputShell: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#f1f4f8',
    paddingHorizontal: 16,
    paddingVertical: 0
  },
  input: {
    flex: 1,
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
