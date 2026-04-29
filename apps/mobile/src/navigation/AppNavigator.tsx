import { Ionicons } from '@expo/vector-icons';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Role } from '@lbrtw/shared';
import { COLORS } from '../utils/constants';
import { canManageOrganizations, canManageUsers, canSeeLocationsModule, canSeeQrModule } from '../utils/role';
import { LocationsScreen } from '../screens/locations/LocationsScreen';
import { OrganizationsScreen } from '../screens/organizations/OrganizationsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { QrDetailScreen } from '../screens/qrs/QrDetailScreen';
import { QrListScreen } from '../screens/qrs/QrListScreen';
import { TaskDetailScreen } from '../screens/tasks/TaskDetailScreen';
import { TaskListScreen } from '../screens/tasks/TaskListScreen';
import { UsersScreen } from '../screens/users/UsersScreen';
import { useAuthStore } from '../store/authStore';
import type { AppTabParamList, QrsStackParamList, TasksStackParamList } from './types';

const Tab = createBottomTabNavigator<AppTabParamList>();
const TasksStack = createNativeStackNavigator<TasksStackParamList>();
const QrsStack = createNativeStackNavigator<QrsStackParamList>();

function TasksStackNavigator() {
  return (
    <TasksStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: COLORS.background
        }
      }}
    >
      <TasksStack.Screen name="TaskList" component={TaskListScreen} />
      <TasksStack.Screen name="TaskDetail" component={TaskDetailScreen} />
    </TasksStack.Navigator>
  );
}

function QrsStackNavigator() {
  return (
    <QrsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: COLORS.background
        }
      }}
    >
      <QrsStack.Screen name="QrList" component={QrListScreen} />
      <QrsStack.Screen name="QrDetail" component={QrDetailScreen} />
    </QrsStack.Navigator>
  );
}

export function AppNavigator() {
  const role = useAuthStore((state) => state.user?.role ?? Role.STAFF);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.heading,
        tabBarInactiveTintColor: '#8b98b8',
        tabBarStyle: {
          height: 76,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600'
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={getTabIconName(route.name)} size={size} color={color} />
        )
      })}
    >
      <Tab.Screen
        name="TasksTab"
        component={TasksStackNavigator}
        options={{
          title: 'Talepler'
        }}
      />
      {canSeeQrModule(role) ? (
        <Tab.Screen
          name="QrsTab"
          component={QrsStackNavigator}
          options={{
            title: 'QRlar'
          }}
        />
      ) : null}
      {canSeeLocationsModule(role) ? (
        <Tab.Screen
          name="LocationsTab"
          component={LocationsScreen}
          options={{
            title: 'Lokasyon'
          }}
        />
      ) : null}
      {canManageOrganizations(role) ? (
        <Tab.Screen
          name="OrganizationsTab"
          component={OrganizationsScreen}
          options={{
            title: 'Kurumlar'
          }}
        />
      ) : null}
      {canManageUsers(role) ? (
        <Tab.Screen
          name="UsersTab"
          component={UsersScreen}
          options={{
            title: 'Kisiler'
          }}
        />
      ) : null}
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profil'
        }}
      />
    </Tab.Navigator>
  );
}

function getTabIconName(routeName: keyof AppTabParamList): keyof typeof Ionicons.glyphMap {
  switch (routeName) {
    case 'TasksTab':
      return 'list-circle-outline';
    case 'QrsTab':
      return 'qr-code-outline';
    case 'LocationsTab':
      return 'git-network-outline';
    case 'OrganizationsTab':
      return 'business-outline';
    case 'UsersTab':
      return 'people-outline';
    case 'ProfileTab':
      return 'person-circle-outline';
    default:
      return 'ellipse-outline';
  }
}
