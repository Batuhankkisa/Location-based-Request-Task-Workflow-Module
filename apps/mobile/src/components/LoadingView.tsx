import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../utils/constants';

interface LoadingViewProps {
  title?: string;
  description?: string;
}

export function LoadingView({
  title = 'Yukleniyor',
  description = 'Icerik hazirlaniyor.'
}: LoadingViewProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.heading} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.heading
  },
  description: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center'
  }
});
