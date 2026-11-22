# Messaging & Notification

Chuyển chức năng từ source `Project` sang khung `Project_NewSetup`, giữ bố cục và thành phần giao diện của module cũ: nền gradient, thẻ kính, danh sách hội thoại, bong bóng tin nhắn, ô nhập, hộp xác nhận xóa và popover thông báo. Màn hình rộng từ 900px hiển thị hai cột; điện thoại chuyển giữa danh sách và hội thoại.

## Cấu trúc và quy ước

- Route `/messages` trỏ tới `screens/message/index.tsx`.
- `api/messages.ts`, `api/notifications.ts` dùng `api()` từ `@/api/backend`; không dùng Axios hoặc đọc token từ localStorage.
- `api/adapters.ts` chuyển snake_case và enum chữ HOA của REST/STOMP sang camelCase và chữ thường; ID đưa ra giao diện là chuỗi.
- `hooks/use-chat-socket.ts` quản lý kết nối, lịch sử, typing và read receipt; `store/chat-store.ts` dùng Zustand.
- `hooks/notifications-context.tsx` và `components/notification-popover.tsx` sở hữu phần thông báo. Hai file `src/context/notifications.tsx` và `src/components/notification-popover.tsx` chỉ re-export để giữ tích hợp của khung mới.
- Giao diện dùng màu và thành phần dùng chung của khung mới; gradient riêng của màn chat nằm ở `theme.ts` trong module.

## API và xác thực

Đối chiếu Swagger tại `https://snsqb.duckdns.org/api/v1/docs/openapi.json` ngày 22/11/2026.

| API | Chức năng |
| --- | --- |
| `GET /conversations?limit=10&after=...` | Danh sách hội thoại |
| `GET /conversations/{id}/messages?limit=100&after=...` | Lịch sử tin nhắn |
| `POST /conversations/direct` | Hàm tạo hội thoại 1-1 với `target_user_id` |
| `DELETE /messages/{id}` | Xóa ở phía tôi (`ME`) hoặc thu hồi (`EVERYONE`) |
| `GET /notifications?limit=20&after=...` | Thông báo và tổng số chưa đọc |

`src/api/backend.ts` chuẩn hóa gốc API bằng `getApiBaseUrl('api/v1')`, vì `.env` được cung cấp là domain gốc. Không thêm `/api/v1` trong từng endpoint; URL đã có tiền tố cũng không bị lặp.

```dotenv
EXPO_PUBLIC_API_URL=https://snsqb.duckdns.org
EXPO_PUBLIC_WS_URL=https://snsqb.duckdns.org/api/v1/ws
```

STOMP dùng WebSocket thuần tại `wss://snsqb.duckdns.org/api/v1/ws/websocket`. Token lấy từ `getAccessToken()` mỗi CONNECT; khi xác thực bị từ chối, gọi `refreshAccessToken()` của lớp dùng chung và thử lại một lần theo `QUY_UOC.md`.

Publish `/app/chat.send`, `/app/chat.read`, `/app/chat.typing`; subscribe `/user/queue/messages` và `/topic/conv.{id}.typing`. Payload đi qua adapter trước khi gửi và sau khi nhận, giữ nguyên nội dung tin nhắn.

## Hành vi giữ từ bản cũ

- Tin gửi hiển thị ngay với ID tạm âm. Broadcast của server thay thế tin tạm; bỏ chữ “Đang gửi” sau khi publish trên kết nối mở chỉ phản ánh trạng thái truyền, không xác nhận server đã lưu.
- Reconnect theo backoff 1–30 giây, đăng ký lại subscription và gửi hàng đợi sau khi kết nối lại. Dọn hàng đợi, store và subscription khi dispose để không chuyển tin sang phiên đăng nhập khác.
- Web giữ kết nối khi đổi tab. Native ngắt khi vào nền và kết nối lại khi quay về foreground.
- Typing gửi bắt đầu/kết thúc, dừng sau 2 giây không nhập. Hội thoại đang mở gửi read receipt khi ứng dụng active.
- Xóa/thu hồi cần xác nhận và thành công từ API trước khi cập nhật store. ID tạm không được xóa. Store ghi nhớ thao tác xóa để snapshot cũ không làm nội dung xuất hiện lại.
- Chuông thông báo tải trang đầu khi khởi tạo và mỗi lần mở, hỗ trợ làm mới/tải thêm/thử lại. Badge dùng `unread_count` từ server. Hiển thị title, body, icon, actor, thời gian, metadata và trạng thái đọc từ API.

Phạm vi vẫn như bản cũ: màn chat gửi văn bản, chưa có giao diện tạo hội thoại mới, upload media, quản lý nhóm hoặc tải thêm lịch sử/hội thoại. Thông báo chỉ đọc danh sách, chưa gọi API đánh dấu đọc, push notification hoặc điều hướng target. Thu hồi phía người khác cập nhật khi tải lại lịch sử; chưa thêm xử lý sự kiện thu hồi realtime.

## Demo và kiểm tra

Khi không đặt `EXPO_PUBLIC_API_URL`, module dùng `api/mock-db.ts`: ba hội thoại mẫu, gửi/xóa/thu hồi cục bộ và thông báo mẫu; không mở WebSocket bằng token demo. Dữ liệu demo đã ở hình dạng camelCase.

```powershell
npm run lint
npx tsc --noEmit
node --experimental-transform-types --no-warnings --test src/modules/messaging-notification/api/messaging.test.mjs
node --experimental-transform-types --no-warnings --test src/modules/messaging-notification/api/demo.test.mjs
```

Test nằm cạnh API, dùng fetch giả lập và kiểm tra code thật: đường dẫn, refresh, body xóa, adapter thông báo/STOMP, race REST/realtime, bảo toàn xóa/thu hồi và dọn hàng đợi khi đổi phiên. Không dùng tài khoản thật hoặc gửi tin tới backend trong các test này.
