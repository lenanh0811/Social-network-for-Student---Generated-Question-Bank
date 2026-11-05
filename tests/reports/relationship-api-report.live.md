# Kết quả test API Quan hệ & Báo cáo vi phạm

- Thời điểm chạy: 00:49:14 6/11/2026
- Môi trường: https://snsqb.duckdns.org/api/v1
- Tài khoản: A không có, B không có
- Tổng: **44** · Đạt: **5** · Lỗi: **0** · Bỏ qua: **39**

| Mã | Kịch bản | Endpoint | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Thời gian |
|---|---|---|---|---|---|---|
| RL01 | Lấy danh sách bạn bè khi chưa đăng nhập | `GET /friendships` | 401 · 9998 | HTTP 401 · 9998 — Full authentication is required to access this resource | ✅ PASS | 436 ms |
| RL02 | Theo dõi khi chưa đăng nhập | `POST /follows/{id}` | 401 · 9998 | HTTP 401 · 9998 — Full authentication is required to access this resource | ✅ PASS | 95 ms |
| RL03 | Chặn khi chưa đăng nhập | `POST /blocks/{id}` | 401 · 9998 | HTTP 401 · 9998 — Full authentication is required to access this resource | ✅ PASS | 36 ms |
| RL04 | Báo cáo khi chưa đăng nhập | `POST /report` | 401 · 9998 | HTTP 401 · 9998 — Full authentication is required to access this resource | ✅ PASS | 41 ms |
| RL05 | Token giả mạo | `GET /blocks` | 401 · 9998 | HTTP 401 · 9998 — Full authentication is required to access this resource | ✅ PASS | 42 ms |
| RL06 | Danh sách bạn bè | `GET /friendships` | 200, items[] + total_friends | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL07 | Lời mời kết bạn đã nhận | `GET /friendships/requests/received` | 200, items[] + total_pending | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL08 | Lời mời kết bạn đã gửi | `GET /friendships/requests/sent` | 200, items[] + total_sent | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL09 | Người theo dõi tôi | `GET /follows/followers` | 200, items[] + total_followers | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL10 | Người tôi đang theo dõi | `GET /follows/following` | 200, items[] + total_following | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL11 | Danh sách đã chặn | `GET /blocks` | 200, items[] + total_blocked | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL12 | Thống kê quan hệ của chính mình | `GET /users/{id}/relationship-stats` | 200, counts + relationship_with_me | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL13 | Thống kê quan hệ user không tồn tại | `GET /users/{id}/relationship-stats` | 404 USER_NOT_FOUND | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL14 | Tự theo dõi chính mình | `POST /follows/{id}` | 400 CANNOT_INTERACT_WITH_SELF | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL15 | Tự gửi lời mời cho chính mình | `POST /friendships/request` | 400 CANNOT_INTERACT_WITH_SELF | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL16 | Tự chặn chính mình | `POST /blocks/{id}` | 400 CANNOT_INTERACT_WITH_SELF | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL17 | Gửi lời mời thiếu addressee_id | `POST /friendships/request` | 400 · 1002 | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL18 | Theo dõi user không tồn tại | `POST /follows/{id}` | 404 USER_NOT_FOUND | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL19 | Chặn user không tồn tại | `POST /blocks/{id}` | 404 USER_NOT_FOUND | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL20 | Chấp nhận lời mời không tồn tại | `POST /friendships/accept` | 404 RESOURCE_NOT_FOUND | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL21 | A theo dõi B | `POST /follows/{id}` | 200, following=true, new_followers_count | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL22 | B thấy A đang theo dõi mình (followed_by) | `GET /users/{id}/relationship-stats` | followed_by=true | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL23 | A bỏ theo dõi B | `DELETE /follows/{id}` | 200, following=false | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL24 | Bỏ theo dõi người chưa theo dõi | `DELETE /follows/{id}` | 404 RESOURCE_NOT_FOUND | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL25 | A gửi lời mời kết bạn cho B | `POST /friendships/request` | 200, status=PENDING | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL26 | Gửi lại lời mời đang chờ | `POST /friendships/request` | 409 FRIEND_REQUEST_PENDING | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL27 | Lời mời xuất hiện ở cả 2 phía | `GET /friendships/requests/sent · received` | A.sent có B, B.received có A, stats PENDING | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL28 | B từ chối lời mời | `POST /friendships/decline` | 200; B.received không còn A | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL29 | A mời lại, B chấp nhận | `POST /friendships/accept` | 200, status=ACCEPTED; 2 bên có nhau trong /friendships | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL30 | Gửi lời mời khi đã là bạn | `POST /friendships/request` | 409 ALREADY_FRIENDS | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL31 | Huỷ kết bạn | `DELETE /friendships/{friendId}` | 200; không còn trong /friendships | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL32 | Huỷ kết bạn khi chưa là bạn | `DELETE /friendships/{friendId}` | 404 RESOURCE_NOT_FOUND | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL33 | Hai người cùng mời nhau => tự thành bạn bè | `POST /friendships/request` | Lời mời thứ 2: 200, status=ACCEPTED | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL34 | Kết bạn khác vai trò (SV–GV) | `POST /friendships/request` | 403 ACTION_NOT_ALLOWED | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL35 | A chặn B => huỷ kết bạn và theo dõi 2 chiều | `POST /blocks/{id}` | 200, blocked=true; hết bạn bè & theo dõi | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL36 | Chặn lại người đã chặn | `POST /blocks/{id}` | 409 ALREADY_BLOCKED | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL37 | Người bị chặn theo dõi / mời kết bạn | `POST /follows/{id} · /friendships/request` | 403 USER_IS_BLOCKED | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL38 | Bỏ chặn | `DELETE /blocks/{id}` | 200, blocked=false | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL39 | Bỏ chặn người chưa chặn | `DELETE /blocks/{id}` | 404 RESOURCE_NOT_FOUND | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL40 | Báo cáo thiếu violation_type | `POST /report` | 400 · 1002 | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL41 | Báo cáo với violation_type không hợp lệ | `POST /report` | 400 | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL42 | Tự báo cáo chính mình | `POST /report` | 400 CANNOT_INTERACT_WITH_SELF | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL43 | Báo cáo user không tồn tại | `POST /report` | 404 USER_NOT_FOUND | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
| RL44 | Báo cáo người dùng hợp lệ | `POST /report` | 201, report_id, status=PENDING | Chưa đăng nhập được tài khoản A (đặt REL_EMAIL_A/REL_PASSWORD_A hoặc AUTH_TEST_EMAIL/AUTH_TEST_PASSWORD) | ⏭️ SKIP | 0 ms |
