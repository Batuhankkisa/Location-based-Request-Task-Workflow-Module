import { Alert } from 'react-native';

export function showUnavailableAction(title: string) {
  Alert.alert(title, 'Bu mobil aksiyon henüz forma bağlanmadı. Listeleme ve detay akışı çalışmaya devam eder.');
}
