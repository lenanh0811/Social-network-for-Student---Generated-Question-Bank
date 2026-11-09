# Relationship & Privacy

Nội dung: kết bạn, theo dõi, chặn, báo cáo vi phạm.

**Người phụ trách:** _(điền tên)_

## API của module
Nguồn: Swagger https://snsqb.duckdns.org/api/v1/swagger-ui/index.html (nhóm 07 Friendships, 08 Follows, 09 Blocks, 26 Reports).

| STT | METHOD | Endpoint | Body / dữ liệu chính | Hàm trong `api/client.ts` | Màn hình |
|---|---|---|---|---|---|
| 1 | GET | `/friendships` | → `items[]: user_id, full_name, friends_since, mutual_friends_count`, `total_friends` | `listFriends` | `/friends` (Bạn bè) |
| 2 | GET | `/friendships/requests/received` | → `items[].requester`, `total_pending` | `listReceivedRequests` | `/friends?tab=requests` |
| 3 | GET | `/friendships/requests/sent` | → `items[].receiver`, `total_sent` | `listSentRequests` | `/friends?tab=requests` |
| 4 | POST | `/friendships/request` | `addressee_id` → `status` (PENDING / ACCEPTED nếu người kia đã mời trước) | `sendFriendRequest` | `/users/[userId]` |
| 5 | POST | `/friendships/accept` | `requester_id` | `acceptFriendRequest` | `/users/[userId]`, `/friends` |
| 6 | POST | `/friendships/decline` | `requester_id` | `declineFriendRequest` | `/users/[userId]`, `/friends` |
| 7 | DELETE | `/friendships/{friendId}` | — | `unfriend` | `/users/[userId]` |
| 8 | GET | `/follows/followers` · `/follows/following` | → `items[]: …, following_back / following_me, friend` | `listFollowers`, `listFollowing` | `/friends` |
| 9 | POST · DELETE | `/follows/{targetUserId}` | → `new_followers_count` | `follow`, `unfollow` | `/users/[userId]`, `/friends` |
| 10 | GET | `/blocks` | → `items[]: user_id, full_name, blocked_at` | `listBlocked` | `/account/blocked` |
| 11 | POST · DELETE | `/blocks/{targetUserId}` | — | `block`, `unblock` | `/users/[userId]`, `/account/blocked` |
| 12 | GET | `/users/{userId}/relationship-stats` | → `counts`, `relationship_with_me: friend, following, followed_by, blocked, friend_request_status` | `getRelationship` | `/users/[userId]` |
| 13 | POST | `/report` | `target_type (USER/POST/COMMENT), target_id, violation_type (HARASSMENT/HATE_STATEMENT/SPAM/OTHER), description, evidence_urls` | `report` | `/report?targetType=USER&targetId=..&name=..` |

**Luật của server (đã làm giống trong mock):**
- Chỉ kết bạn giữa người cùng vai trò (SV–SV, GV–GV), khác vai trò ⇒ `403 ACTION_NOT_ALLOWED`. Giao diện ẩn nút "Kết bạn" và ghi chú lý do; theo dõi thì ai cũng được.
- Gửi lời mời khi người kia đã mời mình ⇒ tự động thành bạn bè.
- Chặn ⇒ server tự huỷ kết bạn + theo dõi 2 chiều; đang chặn thì kết bạn/theo dõi trả `403 USER_IS_BLOCKED`.
- Tự tương tác với chính mình ⇒ `400 CANNOT_INTERACT_WITH_SELF`; trùng ⇒ `409 ALREADY_FRIENDS / FRIEND_REQUEST_PENDING / ALREADY_BLOCKED`; không có ⇒ `404 RESOURCE_NOT_FOUND / USER_NOT_FOUND`.

**Lưu ý khi đối chiếu Swagger:**
- `friend_request_status = PENDING` không cho biết ai gửi ⇒ `getRelationship` tra thêm danh sách lời mời đã nhận để phân biệt "Chấp nhận / Từ chối" với "Đã gửi lời mời".
- Chưa làm API rút lời mời đã gửi `DELETE /friendships/requests/sent/{receiverId}` ⇒ nút hiển thị "Đã gửi lời mời" (không bấm được).
- Danh sách dùng phân trang cursor; hiện lấy 1 trang `limit=50` (tối đa của server).
- `evidence_urls` (ảnh bằng chứng) chưa làm: cần module upload media (`/medias/*`).

## Cách làm
- API gọi qua `api()` trong `src/api/backend.ts` (tự gắn token, tự làm mới khi gặp 401, lỗi là `ApiError`); đổi dữ liệu server ở `api/adapters.ts`.
- Mock: `api/mock-db.ts` (lưu localStorage `quizhub.mockRelations.v1`). Người dùng mẫu `s2…s6`, `l2` nằm trong `auth-user/api/mock-db.ts`.
- Dữ liệu demo với tài khoản SV `an.nv@sis.hust.edu.vn`: bạn bè Lê Thị Bình, Đỗ Quang Huy; lời mời đến từ Phạm Minh Châu, Vũ Thu Hà; đã mời Hoàng Đức Dũng; đang theo dõi GV demo.
- Nút trên hồ sơ người khác: `components/relationship-panel.tsx` (gắn trong `auth-user/screens/user-profile/index.tsx`).
