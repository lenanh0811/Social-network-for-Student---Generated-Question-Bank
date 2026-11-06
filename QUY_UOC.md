# Quy ước chung của nhóm

Đọc **trước khi code**. Mục đích: 4 người làm 4 phần nhưng ghép lại chạy được, không ai phải sửa đồ của ai.

> Nguyên tắc gốc: **phần dùng chung chỉ có MỘT cách làm**. Thấy chưa có thì nhắn nhóm thêm vào phần dùng chung (`src/components/`, `src/api/http.ts`, `src/context/`, `src/hooks/`, `src/utils/`), đừng tự viết lại trong module của mình.

---

## 0. Cấu trúc thư mục

**Mỗi người một thư mục trọn gói** `src/modules/<tên-module>/`, bên trong có đủ phần của mình. Phần dùng chung ở ngoài `modules/`.

```
src/
├─ app/                 CHỈ có route. Mỗi file là một đường dẫn, và chỉ render màn hình ở modules/
├─ modules/
│  └─ <tên-module>/     ← thư mục CỦA MỘT NGƯỜI, chỉ sửa trong đây
│     ├─ api/           client.ts, adapters.ts, types.ts, mock-db.ts
│     ├─ components/    thành phần dùng lại trong module (vd. question-card.tsx)
│     └─ screens/<tên-màn-hình>/index.tsx   thân màn hình (+ thành phần riêng đặt cạnh nó)
├─ components/          giao diện DÙNG CHUNG: button.tsx, card.tsx, field.tsx… (mỗi file một thành phần)
├─ api/                 http.ts, backend.ts — lớp gọi API chung (mục 2)
├─ context/             auth.tsx (ai đang đăng nhập), notifications.tsx
├─ hooks/  utils/       use-load.ts · format-date.ts, navigation.ts, share.ts…
├─ screens/home/        trang chủ (chung cho cả nhóm)
├─ constants.ts         BRAND, SUBJECTS, MENU_ITEMS
├─ theme.ts             màu, khoảng cách, kiểu kính mờ
└─ types.ts             Role, User, IconName…
```

- `<tên-module>` là: `auth-user`, `social-score`, `relationship-privacy`, `messaging-notification`, `exam-bank`.
- **Tên file kebab-case** (`question-card.tsx`), mỗi thành phần một file. `StyleSheet.create` đặt **ở cuối file**.
- **Test đặt cạnh file được test** (`format-date.test.ts` cạnh `format-date.ts`).
- Khác nhau nhiều giữa nền tảng thì tách file `.web.ts` / `.native.ts` (như `storage.web.ts`).
- Tài liệu riêng từng module nằm ở `docs/<tên-module>.md`.

---

## 1. Token & đăng nhập

| | |
|---|---|
| Ai giữ token | **Chỉ** module `auth-user` (`src/modules/auth-user/api/client.ts`) |
| Khoá lưu | `quizhub.session` = JSON `{ accessToken, refreshToken, expiresAt }` · `quizhub.device_id` |
| Lưu ở đâu | Web: `localStorage` · Điện thoại: `expo-secure-store` |

**Cấm:** tự đọc/ghi `localStorage`, `AsyncStorage`, `SecureStore` để lấy token (kể cả khoá `"access_token"` — khoá này **không tồn tại** trong app). Tự xử lý 401 / tự làm mới token.

**Muốn biết ai đang đăng nhập:** `const { user, role } = useAuth()` (từ `@/context/auth`).
`role` là `'student'` hoặc `'lecturer'`. `user.id` luôn là **chuỗi**.

**Màn hình chỉ cho một vai trò:** bọc bằng `withRole(Component, ['lecturer'])` (`@/components/with-role`).

**Cần token thô (vd. kết nối WebSocket/STOMP):** `import { getAccessToken } from '@/modules/auth-user/api/client'` rồi `await getAccessToken()`. Hàm này tự làm mới khi hết hạn. Gọi lại **mỗi lần kết nối**, đừng lưu lại.

---

## 2. Gọi API

**Một cách duy nhất:** hàm `api()` trong [`src/api/backend.ts`](src/api/backend.ts).

```ts
import { api } from '@/api/backend';

export const listMyPosts = () =>
  api<{ contents: RawPost[] } | Post[]>('GET', '/posts/me', {
    query: { limit: 20 },
    mock: () => MOCK_POSTS,            // dữ liệu demo khi chưa có backend
  }).then((r) => (isMock ? (r as Post[]) : (r as { contents: RawPost[] }).contents.map(toPost)));
```

- `path` bắt đầu bằng `/`, **không** có `/api/v1` (địa chỉ gốc lấy từ `.env`).
- Tự gắn token (lấy từ phiên `quizhub.session` do `auth-user` giữ), tự bóc `{ code, message, data }` → bạn nhận đúng phần `data`.
- Gặp lỗi 401: tự làm mới token qua `auth-user` rồi gửi lại **một lần**. Làm mới không được thì `auth-user` đưa người dùng về màn đăng nhập. Module **không** tự xử lý 401.
- Lỗi: ném `ApiError`, `error.message` là thông báo tiếng Việt của server — hiển thị thẳng cho người dùng.
- Body gửi bằng `body: {...}`; tham số URL bằng `query: {...}` (giá trị rỗng tự bỏ).

**Cấm:** `axios`, `fetch` trực tiếp, thư viện HTTP khác. Muốn thêm thư viện → hỏi cả nhóm trước, cài bằng `npx expo install <tên>`.

**Đặt tên dữ liệu**
- Backend trả `snake_case` + chữ HOA cho kiểu liệt kê (`WEB`, `PENDING`). Trong module, chuyển sang `camelCase` + chữ thường bằng một file `api/adapters.ts` (xem `src/modules/exam-bank/api/adapters.ts` làm mẫu). Giao diện **không** đọc `snake_case`.
- ID luôn là **chuỗi** trong giao diện (`String(id)`), gửi lên thì `Number(id)`.
- **Backend là nguồn đúng, không phải slide.** Trước khi làm một API, đọc Swagger: <https://snsqb.duckdns.org/api/v1/docs>. Tên trường, giá trị hợp lệ, API nào có thật — đều ở đó.

**Chế độ demo:** mỗi module phải có dữ liệu `mock` để chạy `npm run demo` (không cần backend/tài khoản). Dữ liệu mock **cùng hình dạng** với dữ liệu sau khi chuyển đổi.

**Chạy**
- `npm run dev` → web cổng **3000** (backend chỉ cho phép cổng 3000 và 5173).
- `npm run demo` → dữ liệu mô phỏng, tài khoản demo: `an.nv@sis.hust.edu.vn` / `quan.tm@hust.edu.vn`, mật khẩu `Demo1234`.

---

## 3. Đặt tên route (đường dẫn)

Mỗi file trong `src/app/` là một đường dẫn. File ở đó **chỉ có 1 dòng** trỏ tới màn hình thật trong module:

```ts
// src/app/(tabs)/messages.tsx
export { default } from '@/modules/messaging-notification/screens/message';
```

Quy tắc:
1. Chữ thường, ngăn cách bằng dấu gạch ngang, **không dấu tiếng Việt**: `/exam-bank/submission/form`.
2. **Trang chính trong menu** (tab) đặt ở `src/app/(tabs)/<tên>.tsx` → URL ngắn: `/social`, `/messages`, `/contribute`.
3. **Trang con** đặt trong thư mục có tên module: `/exam-bank/...`, `/messages/[conversationId]`, `/posts/[id]`.
4. Tham số động đặt tên rõ nghĩa: `[userId]`, `[postId]`, `[conversationId]` — tránh chỉ `[id]` khi dễ nhầm.
5. **Một URL chỉ có một người sở hữu.** Trước khi tạo route mới, xem `src/app/` đã có chưa (vd. `/search` không được hai người cùng tạo).

| Người | Phạm vi route |
|---|---|
| Tài khoản | `/login`, `/profile`, `/account/*`, `/users/[userId]` |
| Mạng xã hội | `/social`, `/create`, `/posts/[postId]`, `/search` |
| Quan hệ | `/friends`, `/account/blocked`, `/report` |
| Nhắn tin & thông báo | `/messages`, `/messages/[conversationId]` |
| Ngân hàng câu hỏi | `/contribute`, `/review`, `/games`, `/exams`, `/exam-bank/*` |

**Trang cần đăng nhập:** thêm tên route vào mảng `PRIVATE_ROUTES` trong [`src/app/_layout.tsx`](src/app/_layout.tsx) (tên như trong thư mục `app`, vd. `'messages/[conversationId]'`).

---

## 4. Thêm mục vào menu 3 gạch

Làm đủ **3 việc**, mỗi việc một dòng:

1. **Route** — tạo `src/app/(tabs)/<tên>.tsx` (1 dòng trỏ tới màn hình, xem mục 3).
2. **Khai báo tab** — thêm vào [`src/app/(tabs)/_layout.tsx`](src/app/(tabs)/_layout.tsx):
   ```tsx
   <Tabs.Screen name="messages" options={page('Tin nhắn')} />
   ```
   Nếu chỉ một vai trò được thấy:
   ```tsx
   <Tabs.Screen name="review" options={{ ...page('Duyệt câu hỏi'), href: role === 'lecturer' ? '/review' : null }} />
   ```
3. **Mục menu** — thêm một object vào `MENU_ITEMS` trong [`src/constants.ts`](src/constants.ts):
   ```ts
   { label: 'Tin nhắn', icon: 'chatbubble-ellipses-outline', href: '/messages', roles: ['student'] }
   ```
   - `icon`: tên icon [Ionicons](https://icons.expo.fyi) (dạng `-outline`).
   - `roles`: bỏ trống = ai cũng thấy.
   - Chỉ thêm **dòng của mình**, không đổi thứ tự/dòng của người khác (tránh xung đột khi gộp code).

**Giao diện dùng chung:** nút, ô nhập, thẻ, màu… lấy từ `@/components/*` và `@/theme`. Không tự chế màu / nút riêng.

---

## 5. Cách làm việc với Git

1. **Không push thẳng `main`.** Mỗi người làm trên nhánh riêng: `git checkout -b <tên-module>/<việc>` (vd. `messaging/chat-window`).
2. Xong thì tạo **Pull Request**, nhờ **một người khác** xem rồi mới gộp.
3. **Trước khi tạo PR** (và sau mỗi lần `git pull`):
   ```bash
   npm install            # có thể có thư viện mới
   npx tsc --noEmit       # không được có lỗi mới do bạn gây ra
   npm run demo           # thử nhanh app còn chạy
   ```
4. **Chỉ sửa trong thư mục module của mình**: `src/modules/<tên>/`. Cần sửa phần dùng chung (`src/components/*.tsx`, `src/api/http.ts`, `src/api/backend.ts`, `src/app/_layout.tsx`, `(tabs)/_layout.tsx`, `src/constants.ts`) → làm **thay đổi nhỏ**, nói rõ trong PR.
5. Commit đủ file: **đừng để thiếu thư mục mới** (đã từng push thiếu `src/modules/social-score/` làm cả nhóm không chạy được).
6. Không commit file `.env` (đã nằm trong `.gitignore`).

---

## Việc cần chốt với nhóm (điền vào)

| Việc | Người |
|---|---|
| Giữ phần dùng chung (`src/components/*.tsx`, `src/api/http.ts`, `src/api/backend.ts`, `src/context/`, `src/hooks/`, `src/utils/`, `src/constants.ts`, `src/theme.ts`, 2 file layout) | |
| Phụ trách tài khoản + hồ sơ + tìm kiếm + báo cáo | |
| Phụ trách mạng xã hội + quan hệ | |
| Phụ trách nhắn tin + thông báo + huy hiệu/cửa hàng | |
| Phụ trách ngân hàng câu hỏi (phiên, duyệt, luyện tập, đề thi, AI, minigame) | |
