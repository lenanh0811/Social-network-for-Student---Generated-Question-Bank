/** Quy tắc kiểm tra dùng chung cho form và mock server (khớp ràng buộc của backend). */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const checkEmail = (v: string) =>
  !v.trim() ? 'Vui lòng nhập email' : !EMAIL_RE.test(v.trim()) ? 'Email không hợp lệ' : undefined;

export const checkPassword = (v: string) =>
  !v ? 'Vui lòng nhập mật khẩu'
    : v.length < 8 ? 'Mật khẩu tối thiểu 8 ký tự'
      : !/[A-Za-z]/.test(v) || !/\d/.test(v) ? 'Mật khẩu cần có cả chữ và số'
        : undefined;

export const checkName = (v: string) =>
  !v.trim() ? 'Vui lòng nhập họ tên' : v.trim().length > 100 ? 'Họ tên tối đa 100 ký tự' : undefined;

export const checkCode = (v: string) => (/^\d{6}$/.test(v) ? undefined : 'Mã xác thực gồm 6 chữ số');

export const checkPhone = (v?: string) => (!v || /^0\d{9,10}$/.test(v) ? undefined : 'Số điện thoại không hợp lệ');

/** Trả về object lỗi chỉ gồm các trường sai. */
export function collect(errors: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v)) as Record<string, string>;
}
