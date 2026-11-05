import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1877f2',
        tabBarInactiveTintColor: '#606770',
        tabBarStyle: { height: 62, paddingTop: 6, paddingBottom: 5 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Bảng tin',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>⌂</Text>,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Tìm kiếm',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>⌕</Text>,
        }}
      />
    </Tabs>
  );
}
