/** Web không có SecureStore => dùng localStorage (bọc try/catch vì có thể bị chặn ở chế độ riêng tư). */
export const storage = {
  get: async (key: string) => {
    try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
  },
  set: async (key: string, value: string) => {
    try { globalThis.localStorage?.setItem(key, value); } catch { /* bỏ qua */ }
  },
  remove: async (key: string) => {
    try { globalThis.localStorage?.removeItem(key); } catch { /* bỏ qua */ }
  },
};
