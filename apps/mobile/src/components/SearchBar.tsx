import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';
import { COLORS } from '../utils/constants';

interface SearchBarProps {
  placeholder: string;
}

export function SearchBar({ placeholder }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={19} color="#687385" />
      <TextInput
        editable={false}
        placeholder={placeholder}
        placeholderTextColor="#737b8c"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    backgroundColor: '#f3f6fa',
    paddingHorizontal: 12
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    paddingVertical: 0
  }
});
