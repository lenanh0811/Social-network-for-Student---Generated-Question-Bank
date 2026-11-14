# Social Score

Module phụ trách bảng tin, bài viết, video bài giảng, bình luận, cảm xúc, tìm kiếm và media.

## Cấu trúc

- `api/social-api.ts`: điểm truy cập API duy nhất của module; dùng transport chung từ `@/api/backend`.
- `api/adapters.ts`: chuyển response DTO sang kiểu giao diện.
- `api/mock-db.ts`: dữ liệu và thao tác mock khi chưa cấu hình backend.
- `api/types.ts`: kiểu dữ liệu miền, đặt tên chữ thường.
- `components/`: avatar, thẻ bài viết, bình luận và tải media.
- `screens/`: bảng tin, tìm kiếm, tạo bài viết và chi tiết bài viết.

Xác thực, refresh token, envelope lỗi và mock transport được xử lý bởi `@/api/backend` và `@/api/http`; Social Score không tự lưu token.

## API đã tích hợp

| Method | Endpoint | Hàm |
|---|---|---|
| GET | `/activity-feeds` | `getFeed` |
| GET | `/activity-feeds/new-count` | `getNewFeedCount` |
| POST | `/posts` | `createPost` |
| GET | `/posts/{id}` | `getPost` |
| PUT | `/posts/{id}` | `updatePost` |
| DELETE | `/posts/{id}` | `deletePost` |
| PUT | `/posts/{id}/lecturer-notes` | `updateLecturerNote` |
| GET | `/posts/me` | `getMyPosts` |
| GET | `/users/{userId}/posts` | `getUserPosts` |
| GET | `/video-posts` | `getVideoPosts` |
| GET | `/comments` | `getComments`, `getCommentsPage` |
| POST | `/comments` | `createComment` |
| PUT | `/comments/{commentId}` | `updateComment` |
| DELETE | `/comments/{commentId}` | `deleteComment` |
| POST | `/react` | `react` |
| GET | `/search` | `search` |
| GET | `/search/saved` | `getSavedSearches` |
| POST | `/search/saved` | `recordSavedSearch` |
| DELETE | `/search/saved/{id}` | `deleteSavedSearch` |
| POST | `/medias/presign` | `getPresignedUrls` |
| POST | `/medias/upload` | `uploadMedia` |
| POST | `/medias/verify` | `verifyMedias` |
| GET | `/subjects` | `getSubjects` |

`getFeed` dùng Activity Feed; `getMyPosts` là danh sách bài viết cá nhân. Bình luận nhận `parentCommentId` để gửi reply. `react` mặc định thao tác trên bài viết và LIKE, đồng thời nhận loại mục tiêu và cảm xúc khác. Các hàm presign/verify nhận payload theo schema backend; `uploadMedia` thực hiện multipart upload trực tiếp (`file`, `purpose=POST`).

## Cấu hình

Đặt `EXPO_PUBLIC_API_URL` thành base URL dùng chung của backend. Khi không có URL, các hàm dùng mock riêng của Social Score. Xem [tài liệu API](../../../SOCIAL_API.md) để biết response envelope và yêu cầu backend.
