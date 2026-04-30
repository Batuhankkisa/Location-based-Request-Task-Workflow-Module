import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../utils/constants';
import { showUnavailableAction } from '../utils/alerts';

interface MobileTopBarProps {
  trailingInitial?: string;
}

export function MobileTopBar({ trailingInitial }: MobileTopBarProps) {
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        onPress={() => showUnavailableAction('Menu')}
        style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
      >
        <Ionicons name="menu-outline" size={28} color={COLORS.heading} />
      </Pressable>
      <Text style={styles.brand}>QRTALEP</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => showUnavailableAction('Profil kisayolu')}
        style={({ pressed }) => [styles.avatar, pressed ? styles.pressed : null]}
      >
        {trailingInitial ? (
          <Text style={styles.avatarText}>{trailingInitial}</Text>
        ) : (
          <Ionicons name="person" size={17} color="#65748c" />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20
  },
  brand: {
    color: COLORS.heading,
    fontSize: 18,
    fontWeight: '800'
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceMuted
  },
  avatarText: {
    color: COLORS.heading,
    fontSize: 14,
    fontWeight: '800'
  },
  pressed: {
    opacity: 0.65
  }
});
