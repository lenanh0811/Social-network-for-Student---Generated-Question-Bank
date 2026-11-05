/** Quy tắc kiểm tra dùng chung cho form và mock server. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const checkEmail = (v: string) =>
  !v.trim() ? 'Vui lòng nhập email' : !EMAIL_RE.test(v.trim()) ? 'Email không hợp lệ' : undefined;

/** Swagger không công bố quy tắc mật khẩu (mật khẩu mẫu chỉ gồm số) => chỉ yêu cầu ≥ 8 ký tự, không khoảng trắng. */
export const checkPassword = (v: string) =>
  !v ? 'Vui lòng nhập mật khẩu'
    : v.length < 8 ? 'Mật khẩu tối thiểu 8 ký tự'
      : /\s/.test(v) ? 'Mật khẩu không được chứa khoảng trắng'
        : undefined;

export const checkName = (v: string) =>
  !v.trim() ? 'Vui lòng nhập họ tên' : v.trim().length > 100 ? 'Họ tên tối đa 100 ký tự' : undefined;

export const checkCode = (v: string) => (/^\d{6}$/.test(v) ? undefined : 'Mã xác thực gồm 6 chữ số');

/** date_of_birth dạng YYYY-MM-DD, không ở tương lai. */
export const checkDate = (v?: string) => {
  if (!v) return undefined;
  const d = new Date(`${v}T00:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(d.getTime())) return 'Ngày sinh dạng YYYY-MM-DD';
  return d > new Date() ? 'Ngày sinh không hợp lệ' : undefined;
};

/** Trả về object lỗi chỉ gồm các trường sai. */
export function collect(errors: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v)) as Record<string, string>;
}
