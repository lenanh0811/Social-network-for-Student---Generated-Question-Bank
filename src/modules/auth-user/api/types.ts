import type { Role, User } from '@/shared/types';

export type Gender = 'MALE' | 'FEMALE';

/** Hồ sơ đầy đủ — ProfileResponse của GET /users/me. Mở rộng `User` dùng chung để các module khác không phải đổi. */
export interface UserProfile extends User {
  email: string;
  verified: boolean;
  profileCompleted?: boolean;
  avatarUrl?: string;
  coverUrl?: string;
  /** student_lecturer_code: MSSV hoặc mã cán bộ (nhà trường cấp, không sửa được). */
  code?: string;
  /** school_faculty */
  faculty?: string;
  major?: string;
  className?: string;
  gender?: Gender;
  /** YYYY-MM-DD */
  dateOfBirth?: string;
  bio?: string;
  createdAt?: string;
}

/** Hồ sơ công khai (GET /users/{userId}) — server ẩn email, ngày sinh. */
export type PublicProfile = Pick<UserProfile, 'id' | 'name' | 'role' | 'avatarUrl' | 'faculty' | 'major' | 'className' | 'bio'>;

export interface Session {
  accessToken: string;
  refreshToken: string;
  /** epoch ms */
  expiresAt: number;
}

/** Thông tin thiết bị hiện tại gửi kèm khi đăng nhập. */
export interface DeviceInfo {
  id: string;
  name: string;
  /** IOS | ANDROID | DESKTOP | WEB */
  platform: string;
  osVersion?: string;
  appVersion?: string;
}

/** DeviceResponse của GET /devices. */
export interface Device {
  id: string;
  name: string;
  platform: string;
  osVersion?: string;
  appVersion?: string;
  lastActiveAt?: string;
  active: boolean;
  current: boolean;
}

export interface RegisterInput {
  email: string;
  password: string;
  role: Role;
}

/** Các trường PUT /users/me cho phép sửa. */
export interface UpdateProfileInput {
  fullName: string;
  bio?: string;
  gender?: Gender;
  dateOfBirth?: string;
  avatarUrl?: string;
}

/** Lỗi API đã chuẩn hoá: `status` là HTTP status, `code` là mã nghiệp vụ trong envelope. */
export class AuthError extends Error {
  constructor(message: string, public status: number, public code?: string, public fields?: Record<string, string>) {
    super(message);
    this.name = 'AuthError';
  }
}
