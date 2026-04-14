import { Tabs } from 'expo-router';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { colors } from '@/config/theme';

export default function ClientLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="barbell-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: 'Plans',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="stats-chart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="person-outline" color={color} size={size} />
          ),
        }}
      />
      {/* Hidden routes */}
      <Tabs.Screen name="programs" options={{ href: null }} />
      <Tabs.Screen name="schedule" options={{ href: null }} />
      <Tabs.Screen name="discover" options={{ href: null }} />
      <Tabs.Screen name="trainer-profile" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="create-program" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="create-routine" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="generate" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="review-plan" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}
