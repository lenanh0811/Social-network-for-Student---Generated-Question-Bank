# Kết quả test API Quan hệ & Báo cáo vi phạm

- Thời điểm chạy: 00:54:59 6/11/2026
- Môi trường: Mock server (tests/relationship-mock-server.mjs, mô phỏng theo Swagger)
- Tài khoản: A, B (SV), C (GV) trên mock
- Tổng: **44** · Đạt: **44** · Lỗi: **0** · Bỏ qua: **0**

| Mã | Kịch bản | Endpoint | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Thời gian |
|---|---|---|---|---|---|---|
| RL01 | Lấy danh sách bạn bè khi chưa đăng nhập | `GET /friendships` | 401 · 9998 | HTTP 401 · 9998 — Full authentication is required to access this resource | ✅ PASS | 2 ms |
| RL02 | Theo dõi khi chưa đăng nhập | `POST /follows/{id}` | 401 · 9998 | HTTP 401 · 9998 — Full authentication is required to access this resource | ✅ PASS | 3 ms |
| RL03 | Chặn khi chưa đăng nhập | `POST /blocks/{id}` | 401 · 9998 | HTTP 401 · 9998 — Full authentication is required to access this resource | ✅ PASS | 3 ms |
| RL04 | Báo cáo khi chưa đăng nhập | `POST /report` | 401 · 9998 | HTTP 401 · 9998 — Full authentication is required to access this resource | ✅ PASS | 5 ms |
| RL05 | Token giả mạo | `GET /blocks` | 401 · 9998 | HTTP 401 · 9998 — Full authentication is required to access this resource | ✅ PASS | 2 ms |
| RL06 | Danh sách bạn bè | `GET /friendships` | 200, items[] + total_friends | HTTP 200 · 0000; 0 mục, total_friends=0 | ✅ PASS | 2 ms |
| RL07 | Lời mời kết bạn đã nhận | `GET /friendships/requests/received` | 200, items[] + total_pending | HTTP 200 · 0000; 0 mục, total_pending=0 | ✅ PASS | 2 ms |
| RL08 | Lời mời kết bạn đã gửi | `GET /friendships/requests/sent` | 200, items[] + total_sent | HTTP 200 · 0000; 0 mục, total_sent=0 | ✅ PASS | 3 ms |
| RL09 | Người theo dõi tôi | `GET /follows/followers` | 200, items[] + total_followers | HTTP 200 · 0000; 0 mục, total_followers=0 | ✅ PASS | 3 ms |
| RL10 | Người tôi đang theo dõi | `GET /follows/following` | 200, items[] + total_following | HTTP 200 · 0000; 0 mục, total_following=0 | ✅ PASS | 3 ms |
| RL11 | Danh sách đã chặn | `GET /blocks` | 200, items[] + total_blocked | HTTP 200 · 0000; 0 mục, total_blocked=0 | ✅ PASS | 2 ms |
| RL12 | Thống kê quan hệ của chính mình | `GET /users/{id}/relationship-stats` | 200, counts + relationship_with_me | HTTP 200 · 0000; {"followers_count":0,"following_count":0,"friends_count":0} | ✅ PASS | 5 ms |
| RL13 | Thống kê quan hệ user không tồn tại | `GET /users/{id}/relationship-stats` | 404 USER_NOT_FOUND | HTTP 404 · USER_NOT_FOUND — Không tìm thấy người dùng | ✅ PASS | 2 ms |
| RL14 | Tự theo dõi chính mình | `POST /follows/{id}` | 400 CANNOT_INTERACT_WITH_SELF | HTTP 400 · CANNOT_INTERACT_WITH_SELF — Không thể tương tác với chính mình | ✅ PASS | 3 ms |
| RL15 | Tự gửi lời mời cho chính mình | `POST /friendships/request` | 400 CANNOT_INTERACT_WITH_SELF | HTTP 400 · CANNOT_INTERACT_WITH_SELF — Không thể tương tác với chính mình | ✅ PASS | 4 ms |
| RL16 | Tự chặn chính mình | `POST /blocks/{id}` | 400 CANNOT_INTERACT_WITH_SELF | HTTP 400 · CANNOT_INTERACT_WITH_SELF — Không thể tương tác với chính mình | ✅ PASS | 3 ms |
| RL17 | Gửi lời mời thiếu addressee_id | `POST /friendships/request` | 400 · 1002 | HTTP 400 · 1002 — Trường 'addressee_id' không hợp lệ (MISSING_REQUIRED_PARAMET | ✅ PASS | 2 ms |
| RL18 | Theo dõi user không tồn tại | `POST /follows/{id}` | 404 USER_NOT_FOUND | HTTP 404 · USER_NOT_FOUND — Không tìm thấy người dùng | ✅ PASS | 2 ms |
| RL19 | Chặn user không tồn tại | `POST /blocks/{id}` | 404 USER_NOT_FOUND | HTTP 404 · USER_NOT_FOUND — Không tìm thấy người dùng | ✅ PASS | 3 ms |
| RL20 | Chấp nhận lời mời không tồn tại | `POST /friendships/accept` | 404 RESOURCE_NOT_FOUND | HTTP 404 · RESOURCE_NOT_FOUND — Không tìm thấy lời mời kết bạn | ✅ PASS | 3 ms |
| RL21 | A theo dõi B | `POST /follows/{id}` | 200, following=true, new_followers_count | HTTP 200 · 0000; followers của B = 1 | ✅ PASS | 7 ms |
| RL22 | B thấy A đang theo dõi mình (followed_by) | `GET /users/{id}/relationship-stats` | followed_by=true | followed_by=true | ✅ PASS | 1 ms |
| RL23 | A bỏ theo dõi B | `DELETE /follows/{id}` | 200, following=false | HTTP 200 · 0000 | ✅ PASS | 2 ms |
| RL24 | Bỏ theo dõi người chưa theo dõi | `DELETE /follows/{id}` | 404 RESOURCE_NOT_FOUND | HTTP 404 · RESOURCE_NOT_FOUND — Chưa theo dõi người này | ✅ PASS | 1 ms |
| RL25 | A gửi lời mời kết bạn cho B | `POST /friendships/request` | 200, status=PENDING | HTTP 200 · 0000; status=PENDING | ✅ PASS | 3 ms |
| RL26 | Gửi lại lời mời đang chờ | `POST /friendships/request` | 409 FRIEND_REQUEST_PENDING | HTTP 409 · FRIEND_REQUEST_PENDING — Lời mời đang chờ xử lý | ✅ PASS | 2 ms |
| RL27 | Lời mời xuất hiện ở cả 2 phía | `GET /friendships/requests/sent · received` | A.sent có B, B.received có A, stats PENDING | OK | ✅ PASS | 5 ms |
| RL28 | B từ chối lời mời | `POST /friendships/decline` | 200; B.received không còn A | HTTP 200 · 0000 | ✅ PASS | 5 ms |
| RL29 | A mời lại, B chấp nhận | `POST /friendships/accept` | 200, status=ACCEPTED; 2 bên có nhau trong /friendships | HTTP 200 · 0000; status=ACCEPTED | ✅ PASS | 11 ms |
| RL30 | Gửi lời mời khi đã là bạn | `POST /friendships/request` | 409 ALREADY_FRIENDS | HTTP 409 · ALREADY_FRIENDS — Hai người đã là bạn bè | ✅ PASS | 2 ms |
| RL31 | Huỷ kết bạn | `DELETE /friendships/{friendId}` | 200; không còn trong /friendships | HTTP 200 · 0000 | ✅ PASS | 3 ms |
| RL32 | Huỷ kết bạn khi chưa là bạn | `DELETE /friendships/{friendId}` | 404 RESOURCE_NOT_FOUND | HTTP 404 · RESOURCE_NOT_FOUND — Hai người chưa là bạn bè | ✅ PASS | 4 ms |
| RL33 | Hai người cùng mời nhau => tự thành bạn bè | `POST /friendships/request` | Lời mời thứ 2: 200, status=ACCEPTED | HTTP 200 · 0000; status=ACCEPTED | ✅ PASS | 3 ms |
| RL34 | Kết bạn khác vai trò (SV–GV) | `POST /friendships/request` | 403 ACTION_NOT_ALLOWED | HTTP 403 · ACTION_NOT_ALLOWED — Chỉ kết bạn với người cùng vai trò | ✅ PASS | 1 ms |
| RL35 | A chặn B => huỷ kết bạn và theo dõi 2 chiều | `POST /blocks/{id}` | 200, blocked=true; hết bạn bè & theo dõi | HTTP 200 · 0000; bạn bè & theo dõi đã bị huỷ | ✅ PASS | 4 ms |
| RL36 | Chặn lại người đã chặn | `POST /blocks/{id}` | 409 ALREADY_BLOCKED | HTTP 409 · ALREADY_BLOCKED — Đã chặn người dùng này | ✅ PASS | 1 ms |
| RL37 | Người bị chặn theo dõi / mời kết bạn | `POST /follows/{id} · /friendships/request` | 403 USER_IS_BLOCKED | follow: HTTP 403 · USER_IS_BLOCKED — Mối quan hệ bị chặn; request: 403 | ✅ PASS | 2 ms |
| RL38 | Bỏ chặn | `DELETE /blocks/{id}` | 200, blocked=false | HTTP 200 · 0000 | ✅ PASS | 2 ms |
| RL39 | Bỏ chặn người chưa chặn | `DELETE /blocks/{id}` | 404 RESOURCE_NOT_FOUND | HTTP 404 · RESOURCE_NOT_FOUND — Chưa chặn người dùng này | ✅ PASS | 2 ms |
| RL40 | Báo cáo thiếu violation_type | `POST /report` | 400 · 1002 | HTTP 400 · 1002 — Trường 'violation_type' không hợp lệ (MISSING_REQUIRED_PARAM | ✅ PASS | 2 ms |
| RL41 | Báo cáo với violation_type không hợp lệ | `POST /report` | 400 | HTTP 400 · 1003 — Giá trị không hợp lệ | ✅ PASS | 2 ms |
| RL42 | Tự báo cáo chính mình | `POST /report` | 400 CANNOT_INTERACT_WITH_SELF | HTTP 400 · CANNOT_INTERACT_WITH_SELF — Không thể tương tác với chính mình | ✅ PASS | 1 ms |
| RL43 | Báo cáo user không tồn tại | `POST /report` | 404 USER_NOT_FOUND | HTTP 404 · USER_NOT_FOUND — Không tìm thấy người dùng | ✅ PASS | 1 ms |
| RL44 | Báo cáo người dùng hợp lệ | `POST /report` | 201, report_id, status=PENDING | HTTP 201 · 0000; report_id=1 | ✅ PASS | 2 ms |
