import type { Role, User } from '@/shared/types';

/** Hồ sơ đầy đủ (GET /users/me). Mở rộng `User` dùng chung để các module khác không phải đổi. */
export interface UserProfile extends User {
  email: string;
  verified: boolean;
  avatarUrl?: string;
  studentId?: string;
  faculty?: string;
  className?: string;
  phone?: string;
  bio?: string;
  createdAt?: string;
}

/** Hồ sơ công khai (GET /users/{userId}) — không có email/điện thoại. */
export type PublicProfile = Pick<UserProfile, 'id' | 'name' | 'role' | 'avatarUrl' | 'faculty' | 'className' | 'bio'>;

export interface Session {
  accessToken: string;
  refreshToken: string;
  /** epoch ms */
  expiresAt: number;
}

/** Thiết bị hiện tại, đăng ký với server qua POST /devices/register. */
export interface DeviceInfo {
  id: string;
  name: string;
  platform: string;
  /** Token nhận thông báo đẩy (nếu module thông báo cung cấp). */
  pushToken?: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  studentId?: string;
}

export interface UpdateProfileInput {
  fullName: string;
  studentId?: string;
  faculty?: string;
  className?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
}

/** Lỗi API đã chuẩn hoá: `status` là HTTP status, `code` là mã nghiệp vụ trong envelope. */
export class AuthError extends Error {
  constructor(message: string, public status: number, public code?: string, public fields?: Record<string, string>) {
    super(message);
    this.name = 'AuthError';
  }
}
