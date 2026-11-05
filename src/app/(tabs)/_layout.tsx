import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { NotificationProvider } from '@/shared/notifications';
import { NotificationPopover } from '@/shared/ui/NotificationPopover';
import { MenuProvider, SideMenu } from '@/shared/ui/SideMenu';
import { TopBar } from '@/shared/ui/TopBar';

const page = (title: string) => ({ title, headerTransparent: true, header: () => <TopBar /> });

/**
 * Không dùng thanh tab: điều hướng bằng menu 3 gạch (SideMenu, danh sách ở shared/menu.ts).
 * Navbar trên cùng (TopBar): menu 3 gạch, logo, tìm kiếm, chuông thông báo.
 */
export default function TabsLayout() {
  return (
    <NotificationProvider>
    <MenuProvider>
      <View style={{ flex: 1 }}>
        <Tabs tabBar={() => null} screenOptions={{ sceneStyle: { backgroundColor: 'transparent' } }}>
          <Tabs.Screen name="index" options={page('Trang chủ')} />
          <Tabs.Screen name="social" options={page('Bảng tin')} />
          <Tabs.Screen name="contribute" options={page('Đóng góp câu hỏi')} />
          <Tabs.Screen name="review" options={page('Duyệt câu hỏi')} />
          <Tabs.Screen name="games" options={page('Trò chơi dự đoán')} />
          <Tabs.Screen name="exams" options={page('Đề thi')} />
          <Tabs.Screen name="profile" options={page('Cá nhân')} />
        </Tabs>
        <NotificationPopover />
        <SideMenu />
      </View>
    </MenuProvider>
    </NotificationProvider>
  );
}
