import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { COLORS, LAYOUT } from '../utils/constants';

type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  rightIcon?: ComponentProps<typeof Ionicons>['name'];
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  rightIcon
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        isDisabled ? styles.disabled : null,
        pressed && !isDisabled ? styles.pressed : null,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? COLORS.surface : COLORS.heading} />
      ) : (
        <>
          <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
          {rightIcon ? <Ionicons name={rightIcon} size={20} color={labelStyles[variant].color} /> : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    flexDirection: 'row',
    gap: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  label: {
    fontSize: 16,
    fontWeight: '700'
  },
  disabled: {
    opacity: 0.5
  },
  pressed: {
    transform: [{ scale: 0.99 }]
  }
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: COLORS.primary,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 2
  },
  secondary: {
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  danger: {
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: '#f7c7ce'
  }
});

const labelStyles = StyleSheet.create({
  primary: {
    color: COLORS.surface
  },
  secondary: {
    color: COLORS.heading
  },
  ghost: {
    color: COLORS.heading
  },
  danger: {
    color: COLORS.danger
  }
});
