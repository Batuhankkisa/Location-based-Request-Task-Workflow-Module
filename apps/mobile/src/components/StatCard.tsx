import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../utils/constants';

type IconName = ComponentProps<typeof Ionicons>['name'];
type StatTone = 'amber' | 'blue' | 'green' | 'red' | 'violet' | 'neutral';

interface StatCardProps {
  label: string;
  value: string;
  icon: IconName;
  tone?: StatTone;
}

export function StatCard({ label, value, icon, tone = 'neutral' }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, toneStyles[tone]]}>
        <Ionicons name={icon} size={18} color={iconColors[tone]} />
      </View>
      <Text style={[styles.label, tone !== 'neutral' ? { color: iconColors[tone] } : null]}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '47%',
    minHeight: 118,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 1
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  label: {
    color: '#3f4654',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  value: {
    color: COLORS.heading,
    fontSize: 28,
    fontWeight: '800'
  }
});

const toneStyles = StyleSheet.create({
  amber: {
    backgroundColor: COLORS.warningSoft
  },
  blue: {
    backgroundColor: '#dce8ff'
  },
  green: {
    backgroundColor: COLORS.successSoft
  },
  red: {
    backgroundColor: COLORS.dangerSoft
  },
  violet: {
    backgroundColor: '#ede9fe'
  },
  neutral: {
    backgroundColor: '#eef1f6'
  }
});

const iconColors: Record<StatTone, string> = {
  amber: COLORS.warning,
  blue: '#0b63ce',
  green: COLORS.success,
  red: COLORS.danger,
  violet: '#6d28d9',
  neutral: COLORS.heading
};
