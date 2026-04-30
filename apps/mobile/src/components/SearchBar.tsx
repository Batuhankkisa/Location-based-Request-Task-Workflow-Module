import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { COLORS } from '../utils/constants';

interface SearchBarProps {
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
}

export function SearchBar({ onChangeText, placeholder, value }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={19} color="#687385" />
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#737b8c"
        returnKeyType="search"
        style={styles.input}
        value={value}
      />
      {value ? (
        <Pressable
          accessibilityLabel="Aramayi temizle"
          accessibilityRole="button"
          onPress={() => onChangeText('')}
          style={({ pressed }) => [styles.clearButton, pressed ? styles.pressed : null]}
        >
          <Ionicons name="close-circle" size={18} color="#7b8494" />
        </Pressable>
      ) : null}
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
  },
  clearButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pressed: {
    opacity: 0.65
  }
});
