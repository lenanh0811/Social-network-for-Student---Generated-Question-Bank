# Relationship & Privacy

Nội dung: kết bạn, theo dõi, chặn, quyền riêng tư.

**Người phụ trách:** _(điền tên)_

## API của module
| STT | METHOD | Endpoint | Hàm trong api/client.ts | Màn hình |
|---|---|---|---|---|
| | | | | |

## Cách làm
- Hàm gọi API viết trong `api/client.ts`, dùng `call()` từ `@/shared/api/http` (xem `modules/exam-bank/api/client.ts` làm mẫu).
- Màn hình viết trong `screens/`, rồi thêm 1 file route mỏng trong `src/app/` (xem README.md ở thư mục gốc).
- Chỉ sửa trong thư mục này; cần dùng chung thì đưa vào `src/shared/`.
