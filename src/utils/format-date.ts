/** Ngày kiểu Việt Nam: 05/11/2026. */
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
