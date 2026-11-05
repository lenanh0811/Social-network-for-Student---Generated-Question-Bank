import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authApi from '@/modules/auth-user/api/client';
import type { UserProfile } from '@/modules/auth-user/api/types';
import type { Role } from '@/shared/types';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthValue = {
  status: AuthStatus;
  /** Người dùng đang đăng nhập. Chỉ dùng trong các màn hình đã được bảo vệ (status === 'signedIn'). */
  user: UserProfile;
  role: Role;
  /** Chỉ có tác dụng ở chế độ mock: đổi vai trò để demo giao diện. */
  setRole: (r: Role) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Tải lại GET /users/me. */
  reload: () => Promise<void>;
  setUser: (u: UserProfile) => void;
};

const GUEST: UserProfile = { id: '', name: 'Khách', role: 'student', email: '', verified: false };
const Ctx = createContext<AuthValue>(null as never);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [roleOverride, setRoleOverride] = useState<Role | null>(null);

  const setUser = useCallback((u: UserProfile | null) => {
    setUserState(u);
    setRoleOverride(null);
    setStatus(u ? 'signedIn' : 'signedOut');
  }, []);

  // Mở app: khôi phục phiên đã lưu rồi tải hồ sơ (getMe tự refresh nếu token hết hạn).
  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await authApi.restoreSession();
      if (!s) return alive && setUser(null);
      try {
        const me = await authApi.getMe();
        if (alive) setUser(me);
      } catch {
        if (alive) setUser(null);
      }
    })();
    return () => { alive = false; };
  }, [setUser]);

  // Refresh token bị từ chối ở bất kỳ request nào => quay về màn đăng nhập.
  useEffect(() => authApi.onSessionChange((s) => { if (!s) setUser(null); }), [setUser]);

  const value = useMemo<AuthValue>(() => ({
    status,
    user: user ?? GUEST,
    role: (authApi.isMock && roleOverride) || user?.role || 'student',
    setRole: setRoleOverride,
    signIn: async (email, password) => setUser(await authApi.login(email, password)),
    signOut: () => authApi.logout(),
    reload: async () => setUserState(await authApi.getMe()),
    setUser: (u) => setUserState(u),
  }), [status, user, roleOverride, setUser]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
