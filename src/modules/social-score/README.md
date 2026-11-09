# Social Score

Nội dung: bài viết, bảng tin, bình luận, lượt thích và tải media.

**Người phụ trách:** _(điền tên)_

## Cấu trúc

- `api/client.ts`: gọi API qua `api()` dùng chung, giữ nguyên chữ ký cho màn hình.
- `api/adapters.ts`: chuyển DTO snake_case / response phân trang sang kiểu giao diện.
- `api/mock-db.ts`: dữ liệu và thao tác mock riêng cho module khi chưa cấu hình backend.
- `api/types.ts`: kiểu miền dữ liệu của module.
- `components/`: avatar, thẻ bài viết, bình luận và tải media.
- `screens/`: bảng tin, tìm kiếm, tạo bài viết và chi tiết bài viết.
- `utils/`: tiện ích chỉ dùng trong module.

Luồng gọi API: màn hình → `api/client.ts` → `api()` tại `@/api/backend` → transport dùng chung. `auth-user` là module duy nhất cung cấp token/refresh; Social Score không tự lưu token. `isMock` tại `@/api/http` quyết định kết quả có cần chuyển đổi qua adapter hay không. Route Expo Router trong `src/app/` chỉ kết nối điều hướng với màn hình của module.

## API của module

| STT | METHOD | Endpoint | Hàm trong `api/client.ts` | Màn hình |
|---:|---|---|---|---|
| 1 | GET | `/posts/me` | `getFeed` | Bảng tin (danh sách bài của tôi) |
| 2 | GET | `/posts/{id}` | `getPost` | Chi tiết bài viết |
| 3 | GET | `/subjects` | `getSubjects` | Chọn môn học khi tạo bài |
| 4 | POST | `/posts` | `createPost` | Tạo bài viết |
| 5 | PUT | `/posts/{id}` | `updatePost` | Chi tiết bài viết |
| 6 | DELETE | `/posts/{id}` | `deletePost` | Chi tiết bài viết |
| 7 | GET | `/users/{userId}/posts` | `getUserPosts` | Bài viết người dùng |
| 8 | GET | `/video-posts` | `getVideoPosts` | Video bài giảng |
| 9 | GET | `/comments` | `getComments` | Chi tiết bài viết |
| 10 | POST | `/comments` | `createComment` | Chi tiết bài viết |
| 11 | PUT | `/comments/{commentId}` | `updateComment` | Chi tiết bài viết |
| 12 | DELETE | `/comments/{commentId}` | `deleteComment` | Chi tiết bài viết |
| 13 | POST | `/react` | `react` | Bảng tin, chi tiết bài viết |
| 14 | GET | `/search` | `search` | Tìm kiếm |
| 15 | POST | `/medias/upload` | `uploadMedia` | Tạo bài viết |

Tải media dùng `FormData` với field `file` và `purpose=POST`; transport chung gửi multipart nguyên trạng. Tạo bài cần `subject_id` (ID số hợp lệ), gửi `media_urls` thành các object media và `visibility=PUBLIC`; form tải danh sách từ `GET /subjects` và yêu cầu chọn môn cho mọi loại bài. Endpoint giảng viên thêm ghi chú (`PUT /posts/{id}/lecturer-notes`) chưa được tích hợp UI.

Adapter xử lý `author.user_id`, `media_urls` là mảng object có `url`, cursor `pagination.after`, comment `deleted`, và Search với item lồng `post`/`user`/`question`. Reaction hỗ trợ `LIKE`, `LOVE`, `WOW`; thao tác lặp cùng reaction tuỳ backend có thể bỏ lượt reaction.

## Cấu hình

Đặt `EXPO_PUBLIC_API_URL` thành base URL dùng chung của backend. Khi không có URL, các hàm gọi dữ liệu mock của Social Score. Xem [tài liệu API](../../../SOCIAL_API.md) để biết response envelope, xác thực và yêu cầu backend.