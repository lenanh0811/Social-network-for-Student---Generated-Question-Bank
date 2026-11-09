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
| `GET /activity-feeds?after=&limit=20` | Reads `data.items` and `data.pagination`; currently renders `target_type=POST` items and supports cursor-based “Tải thêm”. |
| `POST /posts` | Sends `content`, `media_urls`, `subject_id`, and `post_type`; available types are `SOCIAL_POST` and `LEARNING_VIDEO`. |
| `GET /posts/{id}` | Reads post details and maps `post_id`, author, `media_urls`, `react_count`, `comment_count`, `reacted_by_me`, and `is_edited`. |
| `PUT /posts/{id}` | Sends changed `content` and/or `media_urls`. |
| `DELETE /posts/{id}` | Deletes a post after user confirmation. |
| `POST /comments` | Sends `target_type: "POST"`, `target_id`, and `content`. |
| `GET /comments?target_type=POST&target_id=...&limit=20` | Reads `data.items` and maps `comment_id`, author, content, hidden state, and replies. |
| `PUT /comments/{commentId}` / `DELETE /comments/{commentId}` | Edits or deletes a comment; edit/delete controls are shown only for the owner when the API provides `is_owner` or `EXPO_PUBLIC_CURRENT_USER_ID` is configured. |
| `POST /react` | Sends `{ target_type: "POST", target_id, reaction_type: "LIKE" \| "NONE" }`; only the documented Like action is shown. |
| `POST /medias/upload` | Sends multipart fields `file` and `purpose=POST`; uses `data.url` on success. |

The supplied API document has two unresolved request details for `POST /posts`: it lists `media_urls` as a string in the input table but as a list in the response and frontend flow, and it marks `subject_id` required without confirming whether every post type needs it. The client sends `media_urls` as an array and requires a subject ID. Confirm these two details with the backend before production integration.

Post and comment content are limited to 500 words. The media picker allows up to four static images (4 MB each) or one video. Animated GIFs are rejected. The supplied document does not specify a video size limit.

## API integration test script

Start the backend and configure a test subject (and two users for the ownership case):

```powershell
$env:SOCIAL_API_URL = "http://localhost:8080"
$env:SOCIAL_API_TOKEN = "<test-user-token>"
$env:SOCIAL_OTHER_USER_TOKEN = "<different-test-user-token>"
$env:SOCIAL_SUBJECT_ID = "<valid-subject-id>"
npm run test:api
```

The suite creates and deletes temporary content, checks empty/over-500-word posts and comments, owner authorization, comment CRUD, repeated Like behavior, and invalid/missing upload files. It skips if the API URL or subject ID is not configured; the different-user authorization case skips if `SOCIAL_OTHER_USER_TOKEN` is not set.

The API document identifies storage failure as `FILE_UPLOAD_FAILED`, but provides no way to force a storage outage through a request. The script therefore checks upload validation failures; verify the storage-failure UI path with a backend fault-injection fixture.
