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
        name="programs"
        options={{
          title: 'Programs',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="list-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: 'Statistics',
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
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="search-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen name="trainer-profile" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="create-program" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="create-routine" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="generate" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="review-plan" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}
