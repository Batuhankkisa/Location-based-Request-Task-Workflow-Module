import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../utils/constants';

interface InfoRowProps {
  label: string;
  value?: string | null;
  hint?: string | null;
}

export function InfoRow({ label, value, hint }: InfoRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueGroup}>
        <Text style={styles.value}>{value || '-'}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  label: {
    flex: 0.8,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase'
  },
  valueGroup: {
    flex: 1.2,
    alignItems: 'flex-end',
    gap: 4
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    color: COLORS.heading
  },
  hint: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'right'
  }
});
