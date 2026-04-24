import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from './AppButton';
import { COLORS, LAYOUT } from '../utils/constants';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconCircle} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? <AppButton label={actionLabel} onPress={onAction} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    padding: 24,
    gap: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceMuted
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.heading
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textMuted
  }
});
