import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotifications } from "@/modules/messaging-notification/hooks/notifications-context";
import { colors } from "@/theme";
import { Glass } from "@/components/glass";

export function NotificationPopover() {
  const { items, open, setOpen, unread, loading, error, hasMore, reload, loadMore } = useNotifications();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  if (!open) return null;
  const top = (Platform.OS === "web" ? 0 : insets.top) + 70;
  return <View style={StyleSheet.absoluteFill}>
    <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Đóng thông báo" />
    <View style={{ position: "absolute", top, right: 10, width: Math.min(380, width - 20), maxHeight: height - top - 20 }}>
      <Glass strong style={{ borderRadius: 24, padding: 12, gap: 12, flexShrink: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>Thông báo{unread ? ` (${unread})` : ""}</Text>
          <Pressable onPress={() => void reload()} disabled={loading} accessibilityRole="button" accessibilityLabel="Làm mới thông báo" hitSlop={8}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </Pressable>
        </View>
        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
          {items.map((item) => <View key={item.notificationId} style={{ flexDirection: "row", gap: 10, padding: 10, borderRadius: 16, backgroundColor: item.readAt ? "transparent" : colors.primarySoft }}>
            {item.iconUrl ? <Image source={{ uri: item.iconUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} /> :
              <Ionicons name="notifications-outline" size={28} color={colors.primary} />}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>{item.title}</Text>
              <Text style={{ color: colors.text }}>{item.body}</Text>
              {!!item.actor && <Text style={{ color: colors.muted, fontSize: 12 }}>{item.actor.fullName}</Text>}
              {item.metadata?.confirmedQuestions?.map((question) => <Text key={question.questionId} style={{ color: colors.muted, fontSize: 12 }}>
                {question.subjectName}: {question.questionSnippet} (+{question.points} điểm)
              </Text>)}
              <Text style={{ color: colors.muted, fontSize: 12 }}>{new Date(item.createdAt).toLocaleString("vi-VN")}</Text>
            </View>
            {!item.readAt && <View accessibilityLabel="Chưa đọc" style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />}
          </View>)}
          {!!error && <View style={{ gap: 8 }}><Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>
            <Pressable onPress={() => void (items.length && hasMore ? loadMore() : reload())}><Text style={{ color: colors.primary }}>Thử lại</Text></Pressable>
          </View>}
          {loading && <ActivityIndicator color={colors.primary} />}
          {!loading && !error && !items.length && <Text style={{ textAlign: "center", padding: 24, color: colors.muted }}>Chưa có thông báo.</Text>}
          {hasMore && !error && <Pressable disabled={loading} onPress={() => void loadMore()} accessibilityRole="button" style={{ padding: 12 }}>
            <Text style={{ color: colors.primary, textAlign: "center" }}>Tải thêm</Text>
          </Pressable>}
        </ScrollView>
      </Glass>
    </View>
  </View>;
}
