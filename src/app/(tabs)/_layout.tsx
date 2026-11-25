import { Tabs } from "expo-router";
import { usePathname } from "expo-router";
import { View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/auth";
import { NotificationProvider } from "@/context/notifications";
import { NotificationPopover } from "@/components/notification-popover";
import { BottomNav, ContactsSidebar, Sidebar, hasRightSidebar } from "@/components/side-menu";
import { AccountMenu, TopBar, type MenuKind, WIDE_BREAKPOINT, useTopBarHeight } from "@/components/top-bar";
import { useState } from "react";
import { colors } from "@/theme";

const page = (title: string) => ({ title, headerShown: false });

/**
 * Bố cục kiểu Facebook: TopBar cố định trên cùng, Sidebar trái (màn rộng) hoặc BottomNav (màn hẹp).
 * Danh sách mục điều hướng ở src/constants.ts.
 */
export default function TabsLayout() {
  const { role } = useAuth();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  const barH = useTopBarHeight();
  const path = usePathname();
  const bottom = useSafeAreaInsets().bottom;
  const [menu, setMenu] = useState<MenuKind>(null);
  return (
    <NotificationProvider>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={{ flex: 1, flexDirection: "row" }}>
            {wide ? <Sidebar top={barH} /> : null}
            <View style={{ flex: 1 }}>
          <Tabs
            tabBar={() => null}
            screenOptions={{ sceneStyle: { backgroundColor: "transparent" } }}
          >
            <Tabs.Screen name="index" options={{ href: null }} />
            <Tabs.Screen name="social" options={page("Bảng tin")} />
            <Tabs.Screen name="search" options={page("Tìm kiếm")} />
            <Tabs.Screen name="messages" options={page("Tin nhắn")} />
            <Tabs.Screen
              name="contribute"
              options={{
                ...page("Đóng góp câu hỏi"),
                href: role === "student" ? "/contribute" : null,
              }}
            />
            <Tabs.Screen
              name="review"
              options={{
                ...page("Duyệt câu hỏi"),
                href: role === "lecturer" ? "/review" : null,
              }}
            />
            <Tabs.Screen
              name="games"
              options={{
                ...page("Trò chơi dự đoán"),
                href: role === "student" ? "/games" : null,
              }}
            />
            <Tabs.Screen
              name="exams"
              options={{
                ...page("Đề thi"),
                href: role === "lecturer" ? "/exams" : null,
              }}
            />
            <Tabs.Screen name="profile" options={page("Cá nhân")} />
          </Tabs>
            </View>
            {wide && hasRightSidebar(path) ? <ContactsSidebar top={barH} /> : null}
          </View>
          {wide ? null : <BottomNav bottomInset={bottom} />}
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }}><TopBar menu={menu} setMenu={setMenu} /></View>
          <NotificationPopover />
          <AccountMenu menu={menu} onClose={() => setMenu(null)} top={barH} />
        </View>
    </NotificationProvider>
  );
}
