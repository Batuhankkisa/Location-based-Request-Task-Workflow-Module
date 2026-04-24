import { StyleSheet, Text, View } from 'react-native';
import { COLORS, StatusTone } from '../utils/constants';

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
}

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <View style={[styles.base, toneStyles[tone]]}>
      <Text style={[styles.label, labelStyles[tone]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  label: {
    fontSize: 13,
    fontWeight: '700'
  }
});

const toneStyles = StyleSheet.create({
  neutral: {
    backgroundColor: '#eef2ff'
  },
  info: {
    backgroundColor: COLORS.infoSoft
  },
  success: {
    backgroundColor: COLORS.successSoft
  },
  warning: {
    backgroundColor: COLORS.warningSoft
  },
  danger: {
    backgroundColor: COLORS.dangerSoft
  }
});

const labelStyles = StyleSheet.create({
  neutral: {
    color: '#394b76'
  },
  info: {
    color: COLORS.info
  },
  success: {
    color: COLORS.success
  },
  warning: {
    color: COLORS.warning
  },
  danger: {
    color: COLORS.danger
  }
});
