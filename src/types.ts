import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

export type Role = 'student' | 'lecturer';
export interface User { id: string; name: string; role: Role }

/** Tên icon Ionicons dùng trong toàn app. */
export type IconName = ComponentProps<typeof Ionicons>["name"];
