# Social Network Core

The app is an Expo Router client for the Social Network Core API. The API server is not part of this repository.

## Configuration and API envelope

Set `EXPO_PUBLIC_API_URL` to the server origin (for example `http://192.168.1.20:8080`). The client appends `/api/v1`; if the value already ends in `/api/v1`, it will not append it again. A physical phone cannot normally reach the development computer through `localhost`.

Responses are read from the documented `{ code, message, data }` envelope. The implementation accepts success codes `0000` (from the live OpenAPI integration notes), `1000` (from the supplied API detail), and `SUCCESS`. Other business codes and non-2xx HTTP responses are surfaced as errors. Authentication is centralized in `configureSocialApiAuth`; connect the app's actual sign-in/session provider there rather than embedding a long-lived token in an `EXPO_PUBLIC_` variable. The auth and refresh contract is not included in the supplied API detail.

The configured host serves OpenAPI successfully, but protected routes return `401` without a valid access token. Browser requests with `Origin: http://localhost:8081` currently receive `403` and no `Access-Control-Allow-Origin` header (including the preflight request). Expo Web therefore also requires the backend to allow the app origin and `Authorization` header; native iOS/Android requests are not subject to browser CORS.

Set `EXPO_PUBLIC_CURRENT_USER_ID` to the signed-in user's ID if the API does not include an `is_owner` flag in post/comment responses; this only controls whether owner actions are shown in the UI and is not an authorization substitute.

## Endpoint mapping

| Method and path | Client behavior and payload |
| --- | --- |
| `GET /posts/me?after=&limit=10` | Reads the signed-in user's `data.items` and numeric `data.pagination.after` / `has_next`. `limit` is capped at 50. |
| `GET /users/{userId}/posts?after=&limit=10` | Reads another user's post list and the same pagination shape. |
| `GET /video-posts?subject_id=&after=&limit=2` | Reads lecture videos; `limit` is capped at 3. |
| `POST /posts` | Supports `SOCIAL_POST` and `LEARNING_VIDEO`; requests must include a valid numeric `subject_id`, as used by the API contract test. |
| `GET /posts/{id}` | Maps `post_id`, `author.user_id`, media objects in `media_urls`, reaction/comment counts, and timestamps from `data`. |
| `PUT /posts/{id}` / `DELETE /posts/{id}` | Edits or deletes a post. The PUT example returns only the post ID and update time, so the client reloads the detail afterward. |
| `PUT /posts/{id}/lecturer-notes` | Documented for lecturer/admin notes; not yet integrated into the client/UI. |
| `GET /comments?target_type=POST&target_id=...&after=&limit=20` | Reads `data.items` and numeric cursor pagination; comment IDs and `parent_comment_id` are int64 values. |
| `POST /comments` | Sends `target_type`, `target_id`, `content`, and optional `parent_comment_id`. |
| `PUT /comments/{commentId}` / `DELETE /comments/{commentId}` | Edits or soft-deletes a comment. A response's `deleted` flag is mapped to the hidden-comment state. |
| `POST /react` | Supports `LIKE`, `LOVE`, and `WOW`; repeating the same reaction toggles it off. |

Post responses encode `media_urls` as objects containing a `url`, and author IDs as `user_id`; the client maps these to the UI model. The exported API document does not specify the full request-body fields for creating/updating posts, comments, or reactions.

The attached API document does not include the `/search` or `/medias/upload` endpoints that the UI currently calls. Their request/response shapes cannot be verified against this document; confirm those contracts with the backend before relying on them.

Post and comment content are limited to 500 words. The media picker allows up to four static images (4 MB each) or one video. Animated GIFs are rejected. The supplied document does not specify a video size limit.

## API integration test script

Start the backend and configure a test subject (and two users for the ownership case):

```powershell
$env:SOCIAL_API_URL = "http://localhost:8080"
$env:SOCIAL_API_TOKEN = "<test-user-token>"
$env:SOCIAL_OTHER_USER_TOKEN = "<different-test-user-token>"
npm run test:api
```

The suite discovers a valid subject through authenticated `GET /subjects` when `SOCIAL_SUBJECT_ID` is unset, then creates and deletes temporary content. It checks empty/over-500-word posts and comments, owner authorization, comment CRUD, repeated Like behavior, empty search results, and invalid/missing upload files. It skips the integration test if the API URL or `SOCIAL_API_TOKEN` is not configured; the different-user authorization case skips if `SOCIAL_OTHER_USER_TOKEN` is not set.

The API document identifies storage failure as `FILE_UPLOAD_FAILED`, but provides no way to force a storage outage through a request. The script therefore checks upload validation failures; verify the storage-failure UI path with a backend fault-injection fixture.
