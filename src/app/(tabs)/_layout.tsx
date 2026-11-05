import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useWindowDimensions, type ColorValue } from 'react-native';
import type { ComponentProps } from 'react';
import { useAuth } from '@/shared/context/Auth';
import { screenOptions } from '@/shared/ui';
import { colors } from '@/shared/theme';

type Icon = ComponentProps<typeof Ionicons>['name'];
const tab = (title: string, icon: Icon, iconOff: Icon) => ({
  ...screenOptions(title), title,
  tabBarIcon: ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => <Ionicons name={focused ? icon : iconOff} color={color as string} size={size} />,
});

export default function TabsLayout() {
  const { role } = useAuth();
  const wide = useWindowDimensions().width >= 768; // màn rộng (web/tablet): menu bên trái; điện thoại: menu dưới
  return (
    <Tabs screenOptions={{
      tabBarPosition: wide ? 'left' : 'bottom',
      tabBarVariant: wide ? 'material' : 'uikit',
      tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarLabelStyle: { fontWeight: '600' } }}>
      <Tabs.Screen name="index" options={tab('Trang chủ', 'home', 'home-outline')} />
      <Tabs.Screen name="contribute" options={tab('Đóng góp', 'create', 'create-outline')} />
      <Tabs.Screen name="review" options={{ ...tab('Duyệt câu hỏi', 'shield-checkmark', 'shield-checkmark-outline'), href: role === 'lecturer' ? '/review' : null }} />
      <Tabs.Screen name="games" options={tab('Trò chơi', 'game-controller', 'game-controller-outline')} />
      <Tabs.Screen name="exams" options={tab('Đề thi', 'document-text', 'document-text-outline')} />
      <Tabs.Screen name="profile" options={tab('Cá nhân', 'person', 'person-outline')} />
    </Tabs>
  );
}
