import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import { Role } from '@lbrtw/shared';
import type { AppStackParamList, AppTabParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { COLORS } from '../utils/constants';
import { canManageOrganizations, canManageUsers, canSeeLocationsModule, canSeeQrModule } from '../utils/role';

interface MobileTopBarProps {
  trailingInitial?: string;
}

export function MobileTopBar({ trailingInitial }: MobileTopBarProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const user = useAuthStore((state) => state.user);
  const role = user?.role ?? Role.STAFF;
  const initial = trailingInitial ?? user?.fullName?.slice(0, 1).toUpperCase();
  const menuItems = useMemo(() => getMenuItems(role), [role]);

  function navigateTo(routeName: keyof AppTabParamList | keyof AppStackParamList) {
    setMenuVisible(false);

    requestAnimationFrame(() => {
      getRootNavigation(navigation).navigate(routeName);
    });
  }

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="Menu"
        accessibilityRole="button"
        onPress={() => setMenuVisible(true)}
        style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
      >
        <Ionicons name="menu-outline" size={28} color={COLORS.heading} />
      </Pressable>
      <Text style={styles.brand}>QRTALEP</Text>
      <Pressable
        accessibilityLabel="Profil"
        accessibilityRole="button"
        onPress={() => navigateTo('Profile')}
        style={({ pressed }) => [styles.avatar, pressed ? styles.pressed : null]}
      >
        {initial ? (
          <Text style={styles.avatarText}>{initial}</Text>
        ) : (
          <Ionicons name="person" size={17} color="#65748c" />
        )}
      </Pressable>

      <Modal animationType="fade" transparent visible={menuVisible} onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuVisible(false)}>
          <Pressable style={styles.menuSheet}>
            <View style={styles.menuHeader}>
              <View>
                <Text style={styles.menuEyebrow}>Menu</Text>
                <Text style={styles.menuTitle}>{user?.fullName ?? 'QRTALEP'}</Text>
              </View>
              <Pressable
                accessibilityLabel="Menuyu kapat"
                accessibilityRole="button"
                onPress={() => setMenuVisible(false)}
                style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
              >
                <Ionicons name="close-outline" size={22} color={COLORS.heading} />
              </Pressable>
            </View>

            <View style={styles.menuList}>
              {menuItems.map((item) => (
                <Pressable
                  key={item.routeName}
                  accessibilityRole="button"
                  onPress={() => navigateTo(item.routeName)}
                  style={({ pressed }) => [styles.menuItem, pressed ? styles.menuItemPressed : null]}
                >
                  <View style={styles.menuIcon}>
                    <Ionicons name={item.iconName} size={19} color={COLORS.heading} />
                  </View>
                  <View style={styles.menuCopy}>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <Text style={styles.menuItemMeta}>{item.meta}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function getMenuItems(role: Role) {
  return [
    {
      routeName: 'TasksTab',
      title: 'Talepler',
      meta: 'Aktif gorev akisi',
      iconName: 'list-circle-outline'
    },
    canSeeQrModule(role)
      ? {
          routeName: 'QrsTab',
          title: 'QR Envanteri',
          meta: 'Kodlar ve okutulmalar',
          iconName: 'qr-code-outline'
        }
      : null,
    canSeeLocationsModule(role)
      ? {
          routeName: 'LocationsTab',
          title: 'Lokasyonlar',
          meta: 'Tesis agaci',
          iconName: 'git-network-outline'
        }
      : null,
    canManageOrganizations(role)
      ? {
          routeName: 'OrganizationsTab',
          title: 'Kurumlar',
          meta: 'Organizasyon ayarlari',
          iconName: 'business-outline'
        }
      : null,
    canManageUsers(role)
      ? {
          routeName: 'UsersTab',
          title: 'Kullanicilar',
          meta: 'Roller ve hesaplar',
          iconName: 'people-outline'
        }
      : null,
  ].filter(
    (
      item
    ): item is {
      routeName: keyof AppTabParamList;
      title: string;
      meta: string;
      iconName: keyof typeof Ionicons.glyphMap;
    } => Boolean(item)
  );
}

function getRootNavigation(navigation: NavigationProp<ParamListBase>) {
  let currentNavigation = navigation;
  let parentNavigation = currentNavigation.getParent<NavigationProp<ParamListBase>>();

  while (parentNavigation) {
    currentNavigation = parentNavigation;
    parentNavigation = currentNavigation.getParent<NavigationProp<ParamListBase>>();
  }

  return currentNavigation;
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
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(7, 19, 38, 0.28)'
  },
  menuSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 30,
    gap: 16
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  menuEyebrow: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase'
  },
  menuTitle: {
    color: COLORS.heading,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 3
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: COLORS.surfaceMuted
  },
  menuList: {
    gap: 8
  },
  menuItem: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12
  },
  menuItemPressed: {
    backgroundColor: COLORS.surfaceMuted
  },
  menuIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft
  },
  menuCopy: {
    flex: 1
  },
  menuItemTitle: {
    color: COLORS.heading,
    fontSize: 15,
    fontWeight: '800'
  },
  menuItemMeta: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2
  }
});
