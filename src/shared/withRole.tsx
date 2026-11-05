import type { ComponentType } from 'react';
import { useAuth } from '@/shared/context/Auth';
import type { Role } from '@/shared/types';
import { Empty, Header, Screen } from '@/shared/ui';

const NAME: Record<Role, string> = { student: 'sinh viên', lecturer: 'giảng viên' };

/** Bọc màn hình: chỉ các vai trò trong `roles` được xem, vai trò khác thấy thông báo. */
export function withRole<P extends object>(Comp: ComponentType<P>, roles: Role[]) {
  return function Guarded(props: P) {
    const { role } = useAuth();
    if (roles.includes(role)) return <Comp {...props} />;
    return (
      <Screen>
        <Header title="Không có quyền truy cập" />
        <Empty icon="lock-closed-outline" text={`Chức năng này dành cho ${roles.map((r) => NAME[r]).join(', ')}. Hãy chuyển vai trò ở trang Cá nhân.`} />
      </Screen>
    );
  };
}
