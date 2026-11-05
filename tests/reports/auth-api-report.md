# Kết quả test API Authentication & User Management

- Thời điểm chạy: 23:06:47 5/11/2026
- Môi trường: Mock server (tests/auth-mock-server.mjs) — chưa cấu hình AUTH_API_URL
- Tổng: **36** · Đạt: **36** · Lỗi: **0** · Bỏ qua: **0**

| Mã | Kịch bản | Endpoint | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Thời gian |
|---|---|---|---|---|---|---|
| TC01 | Đăng ký với thông tin hợp lệ | `POST /auth/register` | 2xx, trả về email/user_id | HTTP 201 · 1000 | ✅ PASS | 42 ms |
| TC02 | Đăng ký thiếu trường bắt buộc | `POST /auth/register` | 400/422 | HTTP 400 · VALIDATION_ERROR | ✅ PASS | 4 ms |
| TC03 | Đăng ký với email sai định dạng | `POST /auth/register` | 400/422 | HTTP 400 · VALIDATION_ERROR | ✅ PASS | 3 ms |
| TC04 | Đăng ký với mật khẩu yếu | `POST /auth/register` | 400/422 | HTTP 400 · VALIDATION_ERROR | ✅ PASS | 6 ms |
| TC05 | Đăng ký trùng email | `POST /auth/register` | 409 (hoặc 400/422) | HTTP 409 · EMAIL_EXISTS | ✅ PASS | 4 ms |
| TC06 | Đăng nhập khi chưa xác thực email | `POST /auth/login` | 403 (hoặc 401) | HTTP 403 · NOT_VERIFIED | ✅ PASS | 5 ms |
| TC07 | Xác thực với mã sai | `POST /auth/verify` | 400/422 | HTTP 400 · INVALID_CODE | ✅ PASS | 4 ms |
| TC08 | Xác thực với mã đúng | `POST /auth/verify` | 2xx | HTTP 200 · 1000 | ✅ PASS | 2 ms |
| TC09 | Đăng nhập với thông tin hợp lệ | `POST /auth/login` | 200 + access_token + refresh_token | HTTP 200 · 1000 | ✅ PASS | 4 ms |
| TC10 | Đăng nhập sai mật khẩu | `POST /auth/login` | 401 | HTTP 401 · INVALID_CREDENTIALS | ✅ PASS | 3 ms |
| TC11 | Đăng nhập email không tồn tại | `POST /auth/login` | 401 (hoặc 404) | HTTP 401 · INVALID_CREDENTIALS | ✅ PASS | 2 ms |
| TC12 | Đăng nhập thiếu mật khẩu | `POST /auth/login` | 400/422 | HTTP 400 · VALIDATION_ERROR | ✅ PASS | 4 ms |
| TC13 | Đăng nhập body rỗng | `POST /auth/login` | 400/422 | HTTP 400 · VALIDATION_ERROR | ✅ PASS | 1 ms |
| TC14 | Lấy hồ sơ khi chưa đăng nhập (không token) | `GET /users/me` | 401 | HTTP 401 · UNAUTHORIZED | ✅ PASS | 2 ms |
| TC15 | Lấy hồ sơ với token giả | `GET /users/me` | 401 | HTTP 401 · UNAUTHORIZED | ✅ PASS | 2 ms |
| TC16 | Lấy hồ sơ với token hợp lệ | `GET /users/me` | 200, đúng email, không lộ mật khẩu | HTTP 200 · 1000 | ✅ PASS | 1 ms |
| TC17 | Truy cập với access token đã hết hạn | `GET /users/me` | 401 | HTTP 401 · TOKEN_EXPIRED | ✅ PASS | 428 ms |
| TC18 | Refresh token hợp lệ => access token mới dùng được | `POST /auth/refresh` | 200 + access_token mới | HTTP 200 · 1000; token mới gọi /users/me OK | ✅ PASS | 11 ms |
| TC19 | Refresh với token không hợp lệ | `POST /auth/refresh` | 401 (hoặc 400/403) | HTTP 401 · INVALID_REFRESH_TOKEN | ✅ PASS | 3 ms |
| TC20 | Refresh thiếu refresh_token | `POST /auth/refresh` | 400/401/422 | HTTP 401 · INVALID_REFRESH_TOKEN | ✅ PASS | 2 ms |
| TC21 | Xem hồ sơ công khai theo userId | `GET /users/{userId}` | 200, không lộ mật khẩu | HTTP 200 · 1000 | ✅ PASS | 1 ms |
| TC22 | Xem hồ sơ userId không tồn tại | `GET /users/{userId}` | 404 | HTTP 404 · NOT_FOUND | ✅ PASS | 2 ms |
| TC23 | Cập nhật hồ sơ hợp lệ | `PUT /users/me` | 200, GET /users/me trả dữ liệu mới | HTTP 200 · 1000; dữ liệu đã lưu | ✅ PASS | 6 ms |
| TC24 | Cập nhật hồ sơ với họ tên rỗng | `PUT /users/me` | 400/422 | HTTP 400 · VALIDATION_ERROR | ✅ PASS | 2 ms |
| TC25 | Cập nhật hồ sơ khi chưa đăng nhập | `PUT /users/me` | 401 | HTTP 401 · UNAUTHORIZED | ✅ PASS | 5 ms |
| TC26 | Đổi mật khẩu với mật khẩu hiện tại sai | `POST /auth/change-password` | 400 (hoặc 401/403) | HTTP 400 · WRONG_PASSWORD | ✅ PASS | 3 ms |
| TC27 | Đổi mật khẩu khi chưa đăng nhập | `POST /auth/change-password` | 401 | HTTP 401 · UNAUTHORIZED | ✅ PASS | 3 ms |
| TC28 | Đổi mật khẩu thành công | `POST /auth/change-password` | 2xx; mk mới đăng nhập được, mk cũ bị từ chối | HTTP 200 · 1000; mk cũ 401, mk mới OK | ✅ PASS | 7 ms |
| TC29 | Đăng ký thiết bị hợp lệ | `POST /devices/register` | 2xx; gọi lại lần 2 vẫn 2xx | HTTP 200 · 1000; đăng ký lại OK | ✅ PASS | 7 ms |
| TC30 | Đăng ký thiết bị thiếu device_id | `POST /devices/register` | 400/422 | HTTP 400 · VALIDATION_ERROR | ✅ PASS | 3 ms |
| TC31 | Đăng ký thiết bị khi chưa đăng nhập | `POST /devices/register` | 401 | HTTP 401 · UNAUTHORIZED | ✅ PASS | 3 ms |
| TC32 | Huỷ đăng ký thiết bị khi chưa đăng nhập | `DELETE /devices/register` | 401 | HTTP 401 · UNAUTHORIZED | ✅ PASS | 4 ms |
| TC33 | Huỷ đăng ký thiết bị hợp lệ | `DELETE /devices/register` | 2xx | HTTP 200 · 1000 | ✅ PASS | 5 ms |
| TC34 | Đăng xuất khi chưa đăng nhập | `POST /auth/logout` | 401 | HTTP 401 · UNAUTHORIZED | ✅ PASS | 6 ms |
| TC35 | Đăng xuất => refresh token cũ bị thu hồi | `POST /auth/logout` | 2xx; refresh sau đó 401 | HTTP 200 · 1000; refresh cũ bị từ chối | ✅ PASS | 4 ms |
| TC36 | Xoá tài khoản => không đăng nhập lại được | `DELETE /users/me` | 2xx; đăng nhập sau đó 401 | HTTP 200 · 1000; đăng nhập lại bị từ chối | ✅ PASS | 6 ms |
