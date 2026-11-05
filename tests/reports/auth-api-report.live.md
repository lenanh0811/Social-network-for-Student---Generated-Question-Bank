# Kết quả test API Authentication & User Management

- Thời điểm chạy: 00:23:45 6/11/2026
- Môi trường: https://snsqb.duckdns.org/api/v1
- Tài khoản test: không có (chỉ chạy các case không cần đăng nhập)
- Tổng: **39** · Đạt: **9** · Lỗi: **2** · Bỏ qua: **28**

| Mã | Kịch bản | Endpoint | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Thời gian |
|---|---|---|---|---|---|---|
| TC01 | Đăng ký với thông tin hợp lệ | `POST /auth/admin/register` | 200 · 0000 | API admin — Swagger ghi "không được gọi" (chỉ test trên mock) | ⏭️ SKIP | 0 ms |
| TC02 | Đăng ký thiếu trường bắt buộc | `POST /auth/admin/register` | 400 · 1002 | API admin — Swagger ghi "không được gọi" (chỉ test trên mock) | ⏭️ SKIP | 0 ms |
| TC03 | Đăng ký trùng email | `POST /auth/admin/register` | 409 USER_ALREADY_EXISTS | API admin — Swagger ghi "không được gọi" (chỉ test trên mock) | ⏭️ SKIP | 0 ms |
| TC04 | Đăng nhập khi chưa kích hoạt | `POST /auth/login` | 403 USER_NOT_VERIFIED | API admin — Swagger ghi "không được gọi" (chỉ test trên mock) | ⏭️ SKIP | 0 ms |
| TC05 | Xác thực OTP sai | `POST /auth/admin/verify` | 400 VERIFICATION_CODE_INVALID | API admin — Swagger ghi "không được gọi" (chỉ test trên mock) | ⏭️ SKIP | 0 ms |
| TC06 | Gửi lại OTP khi mã cũ còn hiệu lực | `POST /auth/admin/resend-verify` | 409 | API admin — Swagger ghi "không được gọi" (chỉ test trên mock) | ⏭️ SKIP | 0 ms |
| TC07 | Xác thực OTP đúng => nhận token | `POST /auth/admin/verify` | 200 + access_token | API admin — Swagger ghi "không được gọi" (chỉ test trên mock) | ⏭️ SKIP | 0 ms |
| TC08 | Đăng nhập với thông tin hợp lệ | `POST /auth/login` | 200 + access_token, refresh_token, user_id, role | Không có tài khoản đã kích hoạt (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| TC09 | Đăng nhập sai mật khẩu | `POST /auth/login` | 400 · 9990 | Không có tài khoản đã kích hoạt (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| TC10 | Đăng nhập email không tồn tại | `POST /auth/login` | 400 · 9990 | HTTP 400 · 9990 | ✅ PASS | 523 ms |
| TC11 | Đăng nhập thiếu trường bắt buộc | `POST /auth/login` | 400 · 1002, liệt kê trường thiếu | HTTP 400 · 1002; thiếu platform, password, deviceId, email | ✅ PASS | 123 ms |
| TC12 | Đăng nhập với platform không hợp lệ | `POST /auth/login` | 400 | HTTP 400 · 1003 | ✅ PASS | 43 ms |
| TC13 | Lấy hồ sơ khi chưa đăng nhập (không token) | `GET /users/me` | 401 · 9998 | HTTP 401 · 9998 | ✅ PASS | 41 ms |
| TC14 | Lấy hồ sơ với token giả | `GET /users/me` | 401 · 9998 | HTTP 401 · 9998 | ✅ PASS | 42 ms |
| TC15 | Lấy hồ sơ với token hợp lệ | `GET /users/me` | 200, đúng email, không lộ mật khẩu | Chưa có access token (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| TC16 | Truy cập với access token đã hết hạn | `GET /users/me` | 401 · 9998 | Backend thật: cần AUTH_EXPIRED_TOKEN | ⏭️ SKIP | 0 ms |
| TC17 | Refresh token hợp lệ => access token mới dùng được | `POST /auth/refresh` | 200 + access_token mới | Chưa có access token (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| TC18 | Refresh với token không hợp lệ | `POST /auth/refresh` | 401 · 9998 | HTTP 401 · 9998 | ✅ PASS | 40 ms |
| TC19 | Refresh thiếu refresh_token | `POST /auth/refresh` | 400 · 1002 | HTTP 400 · 1002 | ✅ PASS | 36 ms |
| TC20 | Xem hồ sơ công khai theo userId | `GET /users/{userId}` | 200, ẩn email & mật khẩu | Chưa có access token (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| TC21 | Xem hồ sơ userId không tồn tại | `GET /users/{userId}` | 404 USER_NOT_FOUND | Chưa có access token (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| TC22 | Cập nhật hồ sơ hợp lệ | `PUT /users/me` | 200, GET /users/me trả dữ liệu mới | Chưa có access token (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| TC23 | Cập nhật hồ sơ với họ tên rỗng | `PUT /users/me` | 400 | Chưa có access token (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| TC24 | Cập nhật hồ sơ khi chưa đăng nhập | `PUT /users/me` | 401 · 9998 | HTTP 401 · 9998 | ✅ PASS | 43 ms |
| TC25 | Đổi mật khẩu với mật khẩu cũ sai | `POST /auth/change-password` | 400 · 9990 | Chưa có access token (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| TC26 | Đổi mật khẩu khi chưa đăng nhập | `POST /auth/change-password` | 401 · 9998 | Mong đợi HTTP 401, nhận HTTP 403 · 1009 {"code":"1009","message":"ACCESS_DENIED","data":null} | ❌ FAIL | 55 ms |
| TC27 | Đổi mật khẩu thiếu trường | `POST /auth/change-password` | 400 · 1002 | Chưa có access token (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| TC28 | Đổi mật khẩu thành công | `POST /auth/change-password` | 200; mk mới đăng nhập được, mk cũ bị từ chối | Chưa có access token (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| TC29 | Danh sách thiết bị có thiết bị hiện tại | `GET /devices` | 200, data.devices có is_current_device | Chưa có access token (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| TC30 | Danh sách thiết bị khi chưa đăng nhập | `GET /devices` | 401 | HTTP 401 · 9998 | ✅ PASS | 37 ms |
| TC31 | Đồng bộ FID cho thiết bị hiện tại | `POST /devices/fid` | 200 | Chưa có access token (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| TC32 | Đồng bộ FID thiếu trường fid | `POST /devices/fid` | 400 · 1002 | Chưa có access token (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| TC33 | Huỷ đăng ký FID | `POST /devices/fid/unregister` | 200 | Chưa có access token (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| TC34 | Đăng xuất thiết bị khác => refresh của thiết bị đó bị thu hồi | `POST /devices/{deviceId}/logout` | 200; refresh thiết bị B 401 | Chưa có access token (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| TC35 | Xoá thiết bị khỏi tài khoản | `DELETE /devices/{deviceId}` | 200; không còn trong GET /devices | Chưa có access token (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| TC36 | Đăng xuất thiết bị không tồn tại | `POST /devices/{deviceId}/logout` | 404 DEVICE_NOT_FOUND | Chưa có access token (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| TC37 | Đăng xuất khi chưa đăng nhập | `POST /auth/logout` | 401 · 9998 | Mong đợi HTTP 401, nhận HTTP 403 · 1009 {"code":"1009","message":"ACCESS_DENIED","data":null} | ❌ FAIL | 41 ms |
| TC38 | Đăng xuất => refresh token cũ bị thu hồi | `POST /auth/logout` | 200; refresh sau đó 401 | Chưa có access token (đặt AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| TC39 | Xoá tài khoản => không đăng nhập lại được | `DELETE /users/me` | 200; đăng nhập sau đó thất bại | Không xoá tài khoản thật — chỉ chạy với tài khoản tạo trên mock | ⏭️ SKIP | 0 ms |
