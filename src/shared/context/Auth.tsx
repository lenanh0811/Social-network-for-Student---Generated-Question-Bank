import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { LECTURER, STUDENT } from '@/shared/mockUsers';
import type { Role, User } from '@/shared/types';

const Ctx = createContext<{ user: User; role: Role; setRole: (r: Role) => void }>(null as never);
export const useAuth = () => useContext(Ctx);

/** Tạm thời: chuyển vai trò để demo. Thay bằng đăng nhập thật của module Auth. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('student');
  const value = useMemo(() => ({ user: role === 'student' ? STUDENT : LECTURER, role, setRole }), [role]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
