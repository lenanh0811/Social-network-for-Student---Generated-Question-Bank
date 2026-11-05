# Kết quả test API Authentication & User Management

- Thời điểm chạy: 00:54:58 6/11/2026
- Môi trường: Mock server (tests/auth-mock-server.mjs, mô phỏng theo Swagger)
- Tài khoản test: tạo mới trên mock
- Tổng: **39** · Đạt: **39** · Lỗi: **0** · Bỏ qua: **0**

| Mã | Kịch bản | Endpoint | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Thời gian |
|---|---|---|---|---|---|---|
| TC01 | Đăng ký với thông tin hợp lệ | `POST /auth/admin/register` | 200 · 0000 | HTTP 200 · 0000 | ✅ PASS | 34 ms |
| TC02 | Đăng ký thiếu trường bắt buộc | `POST /auth/admin/register` | 400 · 1002 | HTTP 400 · 1002 | ✅ PASS | 11 ms |
| TC03 | Đăng ký trùng email | `POST /auth/admin/register` | 409 USER_ALREADY_EXISTS | HTTP 409 · USER_ALREADY_EXISTS | ✅ PASS | 7 ms |
| TC04 | Đăng nhập khi chưa kích hoạt | `POST /auth/login` | 403 USER_NOT_VERIFIED | HTTP 403 · USER_NOT_VERIFIED | ✅ PASS | 7 ms |
| TC05 | Xác thực OTP sai | `POST /auth/admin/verify` | 400 VERIFICATION_CODE_INVALID | HTTP 400 · VERIFICATION_CODE_INVALID | ✅ PASS | 10 ms |
| TC06 | Gửi lại OTP khi mã cũ còn hiệu lực | `POST /auth/admin/resend-verify` | 409 | HTTP 409 · ACTION_ALREADY_PERFORMED | ✅ PASS | 6 ms |
| TC07 | Xác thực OTP đúng => nhận token | `POST /auth/admin/verify` | 200 + access_token | HTTP 200 · 0000 | ✅ PASS | 6 ms |
| TC08 | Đăng nhập với thông tin hợp lệ | `POST /auth/login` | 200 + access_token, refresh_token, user_id, role | HTTP 200 · 0000 | ✅ PASS | 5 ms |
| TC09 | Đăng nhập sai mật khẩu | `POST /auth/login` | 400 · 9990 | HTTP 400 · 9990 | ✅ PASS | 8 ms |
| TC10 | Đăng nhập email không tồn tại | `POST /auth/login` | 400 · 9990 | HTTP 400 · 9990 | ✅ PASS | 6 ms |
| TC11 | Đăng nhập thiếu trường bắt buộc | `POST /auth/login` | 400 · 1002, liệt kê trường thiếu | HTTP 400 · 1002; thiếu email, password, device_id, platform | ✅ PASS | 6 ms |
| TC12 | Đăng nhập với platform không hợp lệ | `POST /auth/login` | 400 | HTTP 400 · 1003 | ✅ PASS | 3 ms |
| TC13 | Lấy hồ sơ khi chưa đăng nhập (không token) | `GET /users/me` | 401 · 9998 | HTTP 401 · 9998 | ✅ PASS | 4 ms |
| TC14 | Lấy hồ sơ với token giả | `GET /users/me` | 401 · 9998 | HTTP 401 · 9998 | ✅ PASS | 3 ms |
| TC15 | Lấy hồ sơ với token hợp lệ | `GET /users/me` | 200, đúng email, không lộ mật khẩu | HTTP 200 · 0000 | ✅ PASS | 5 ms |
| TC16 | Truy cập với access token đã hết hạn | `GET /users/me` | 401 · 9998 | HTTP 401 · 9998 | ✅ PASS | 428 ms |
| TC17 | Refresh token hợp lệ => access token mới dùng được | `POST /auth/refresh` | 200 + access_token mới | HTTP 200 · 0000; token mới gọi /users/me OK | ✅ PASS | 10 ms |
| TC18 | Refresh với token không hợp lệ | `POST /auth/refresh` | 401 · 9998 | HTTP 401 · 9998 | ✅ PASS | 2 ms |
| TC19 | Refresh thiếu refresh_token | `POST /auth/refresh` | 400 · 1002 | HTTP 400 · 1002 | ✅ PASS | 2 ms |
| TC20 | Xem hồ sơ công khai theo userId | `GET /users/{userId}` | 200, ẩn email & mật khẩu | HTTP 200 · 0000 | ✅ PASS | 4 ms |
| TC21 | Xem hồ sơ userId không tồn tại | `GET /users/{userId}` | 404 USER_NOT_FOUND | HTTP 404 · USER_NOT_FOUND | ✅ PASS | 2 ms |
| TC22 | Cập nhật hồ sơ hợp lệ | `PUT /users/me` | 200, GET /users/me trả dữ liệu mới | HTTP 200 · 0000; dữ liệu đã lưu | ✅ PASS | 7 ms |
| TC23 | Cập nhật hồ sơ với họ tên rỗng | `PUT /users/me` | 400 | HTTP 400 · 1002 | ✅ PASS | 2 ms |
| TC24 | Cập nhật hồ sơ khi chưa đăng nhập | `PUT /users/me` | 401 · 9998 | HTTP 401 · 9998 | ✅ PASS | 6 ms |
| TC25 | Đổi mật khẩu với mật khẩu cũ sai | `POST /auth/change-password` | 400 · 9990 | HTTP 400 · 9990 | ✅ PASS | 4 ms |
| TC26 | Đổi mật khẩu khi chưa đăng nhập | `POST /auth/change-password` | 401 · 9998 | HTTP 401 · 9998 | ✅ PASS | 3 ms |
| TC27 | Đổi mật khẩu thiếu trường | `POST /auth/change-password` | 400 · 1002 | HTTP 400 · 1002 | ✅ PASS | 2 ms |
| TC28 | Đổi mật khẩu thành công | `POST /auth/change-password` | 200; mk mới đăng nhập được, mk cũ bị từ chối | HTTP 200 · 0000; mk cũ bị từ chối, mk mới OK | ✅ PASS | 5 ms |
| TC29 | Danh sách thiết bị có thiết bị hiện tại | `GET /devices` | 200, data.devices có is_current_device | HTTP 200 · 0000; 1 thiết bị | ✅ PASS | 2 ms |
| TC30 | Danh sách thiết bị khi chưa đăng nhập | `GET /devices` | 401 | HTTP 401 · 9998 | ✅ PASS | 2 ms |
| TC31 | Đồng bộ FID cho thiết bị hiện tại | `POST /devices/fid` | 200 | HTTP 200 · 0000 | ✅ PASS | 4 ms |
| TC32 | Đồng bộ FID thiếu trường fid | `POST /devices/fid` | 400 · 1002 | HTTP 400 · 1002 | ✅ PASS | 3 ms |
| TC33 | Huỷ đăng ký FID | `POST /devices/fid/unregister` | 200 | HTTP 200 · 0000 | ✅ PASS | 2 ms |
| TC34 | Đăng xuất thiết bị khác => refresh của thiết bị đó bị thu hồi | `POST /devices/{deviceId}/logout` | 200; refresh thiết bị B 401 | HTTP 200 · 0000; refresh của B bị từ chối | ✅ PASS | 6 ms |
| TC35 | Xoá thiết bị khỏi tài khoản | `DELETE /devices/{deviceId}` | 200; không còn trong GET /devices | HTTP 200 · 0000; đã biến mất khỏi danh sách | ✅ PASS | 5 ms |
| TC36 | Đăng xuất thiết bị không tồn tại | `POST /devices/{deviceId}/logout` | 404 DEVICE_NOT_FOUND | HTTP 404 · DEVICE_NOT_FOUND | ✅ PASS | 3 ms |
| TC37 | Đăng xuất khi chưa đăng nhập | `POST /auth/logout` | 401 · 9998 | HTTP 401 · 9998 | ✅ PASS | 5 ms |
| TC38 | Đăng xuất => refresh token cũ bị thu hồi | `POST /auth/logout` | 200; refresh sau đó 401 | HTTP 200 · 0000; refresh cũ bị từ chối | ✅ PASS | 4 ms |
| TC39 | Xoá tài khoản => không đăng nhập lại được | `DELETE /users/me` | 200; đăng nhập sau đó thất bại | HTTP 200 · 0000; đăng nhập lại bị từ chối | ✅ PASS | 6 ms |
