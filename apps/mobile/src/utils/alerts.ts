import { Alert } from 'react-native';

export function showUnavailableAction(title: string) {
  Alert.alert(title, 'Bu mobil aksiyon henuz forma baglanmadi. Listeleme ve detay akisi calismaya devam eder.');
}
