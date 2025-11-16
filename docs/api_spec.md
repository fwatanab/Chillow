# Chillow API設計書（最新版）

本ドキュメントは 2025 年時点の実装（`backend/controller` / `router/router.go`）に基づき、REST API と WebSocket の仕様をまとめたものです。すべてのエンドポイントは `https://{backend-host}/api` をプレフィックスに持ち、認証が必要なエンドポイントでは JWT アクセストークンを `HttpOnly` Cookie（`chillow_access_token`）として送信します。

---

## 共通データ構造

| オブジェクト | 主なフィールド |
| --- | --- |
| `User` | `id`, `nickname`, `email`, `friend_code`, `avatar_url`, `role`, `is_banned`, `created_at`, `updated_at` |
| `Friend` (一覧行) | `id`, `friend_id`, `friend_nickname`, `friend_avatar_url`, `last_message_*`, `unread_count`, `is_online` |
| `FriendRequest` | `id`, `requester_id`, `receiver_id`, `status`, `created_at`, `updated_at`, `requester` |
| `Message` | `id`, `sender_id`, `receiver_id`, `content`, `message_type`, `attachment_url`, `is_read`, `is_deleted`, `edited_at`, `created_at`, `updated_at` |

日時はすべて ISO8601 文字列（UTC）です。

---

## 認証

### POST `/auth/google`

Google ID トークンを受け取り、ユーザー作成/ログインとトークン発行を行います。成功時に `user` 情報を返し、アクセストークンを Cookie に設定します。

```json
{
  "id_token": "<Google ID Token>"
}
```

### POST `/auth/logout`

アクセストークン Cookie を削除します。レスポンスは `204 No Content`。

---

## ユーザー

### GET `/users/me`

現在のユーザー情報を返します。

### PATCH `/users/me`

ニックネームを更新します。

```json
{
  "nickname": "new_display_name"
}
```

成功時は `204 No Content`。

### GET `/users/search?code=<FRIEND_CODE>`

フレンドコードでユーザーを検索します。自分自身や管理者はエラーとなります。

レスポンス例:

```json
{
  "id": 42,
  "nickname": "Chillow User",
  "avatar_url": "https://...",
  "friend_code": "U123ABC"
}
```

---

## フレンド申請

全エンドポイントは `middleware.ForbidRoles("admin")` がかかっているため、一般ユーザーのみ利用可能です。

### POST `/friend-requests`

```json
{
  "receiver_id": 2
}
```

既存の友達や pending の重複申請は `409 Conflict`。復活ロジックにより過去の `declined` を再利用する場合もあります。

### GET `/friend-requests`

自分宛ての pending 申請一覧を取得します。`requester` 情報が付与されます。

### PATCH `/friend-requests/:id`

受信側のみ操作可能。`status` に `accepted` または `declined` を指定します。承認時は双方向の `friends` レコードが作成され、関係する他の申請も削除されます。

```json
{
  "status": "accepted"
}
```

---

## フレンド

### GET `/friends`

チャット一覧で使用するフレンド情報を返します。レスポンスは `FriendRow` の配列で、最新メッセージ・未読数・オンライン状態（WebSocket presence）を含みます。

### DELETE `/friends/:friend_id`

友達関係を双方向で削除します。過去のフレンド申請や添付ファイルも併せてクリーンアップします。成功時は `204 No Content`。

---

## メッセージ

エンドポイントはすべて認証済みユーザー（一般ユーザー）向けです。管理者はチャットを利用できません。

### GET `/messages/:friend_id`

指定ユーザーとのメッセージ履歴を時系列で返します。レスポンス取得時、受信者が自分の未読メッセージは自動的に既読化され、`message:read` イベントが発行されます。

### POST `/messages`

```json
{
  "receiver_id": 2,
  "content": "こんにちは",
  "message_type": "text",             // text | image | sticker
  "attachment_url": "https://...",     // image/sticker のとき必須
  "attachment_object": "s3-key-123"    // 任意
}
```

本文は `message_type` に応じたバリデーションが行われます。レスポンスは作成された `Message`。

### POST `/messages/media`

フォーム投稿（`multipart/form-data`）で画像をアップロードします。`file` フィールド必須。レスポンス:

```json
{
  "url": "https://cdn/.../chat.png",
  "objectKey": "chat/abc123.png"
}
```

### POST `/messages/:id/read`

指定メッセージを既読化します。レスポンスとして更新後の `Message` が返り、`message:read` イベントが配信されます。

### PATCH `/messages/:id`

送信者のみ編集可能。本文の更新（最大 2000 文字）後の `Message` を返します。削除済みメッセージは編集不可。

```json
{
  "content": "修正後の本文"
}
```

### DELETE `/messages/:id`

送信者のみ削除可能。ソフトデリートされ、添付ファイルは未通報であればストレージから削除されます。レスポンスは更新済み `Message`。

### POST `/messages/:id/report`

メッセージを通報します。

```json
{
  "reason": "不適切な発言のため"
}
```

成功した場合は `200 OK`。

---

## 管理者 API

管理者はチャット機能を使用できません。以下のエンドポイントは `RequireRoles("admin")` が付与されています。

| メソッド | パス | 説明 |
| --- | --- | --- |
| GET | `/admin/health` | バックエンドのヘルス確認 |
| GET | `/admin/events` | 最近の監視イベントの取得 |
| GET | `/admin/reports` | 通報リストの取得 |
| POST | `/admin/reports/:id/resolve` | 通報の処理（ペナルティ内容などを記録） |
| POST | `/admin/users/:id/ban` | 指定ユーザーのアカウント停止 |
| POST | `/admin/users/:id/unban` | 停止解除 |
| GET | `/admin/banned-users` | BAN 中のユーザー一覧 |

リクエスト/レスポンスの詳細は `backend/controller/admin.go` を参照してください。

---

## WebSocket

### 接続

- エンドポイント: `wss://{backend-host}/ws`
- 認証: `chillow_access_token` Cookie を付与（クエリパラメータは不要）
- Origin: `config.Cfg.FrontendURL` のみ許可
- 管理者および BAN 中のユーザーは拒否されます

### ルーム

`roomId = "{min(userIdA,userIdB)}-{max(userIdA,userIdB)}"` で会話が識別されます。フロントエンドの `useChatSocket` / `useFriendsData` は `join` イベントを内部的に送信し、Hub が presence と typing を管理します。

### クライアント → サーバー イベント

| type | ペイロード | 説明 |
| --- | --- | --- |
| `message:send` | `{ roomId, content, messageType, attachmentUrl, attachmentObject }` | メッセージ送信。REST の `/messages` と同じバリデーション |
| `message:edit` | `{ roomId, messageId, content }` | メッセージ編集 |
| `message:delete` | `{ roomId, messageId }` | メッセージ削除 |
| `typing:start` / `typing:stop` | `{ roomId }` | 入力状態の共有 |
| `ping` | `{} (内部)` | クライアント実装側の keep-alive |

### サーバー → クライアント イベント

| type | 説明 |
| --- | --- |
| `message:new` | 新着メッセージ。`message` は `MessageDTO` 形式 |
| `message:updated` | 編集または削除済みメッセージ |
| `message:deleted` | 削除通知（現在は `message:updated` と同一 DTO） |
| `message:read` | 既読状態の更新 |
| `typing:start` / `typing:stop` | 入力インジケータ |
| `presence:update` | ルームごとのオンラインユーザー ID リスト |
| `room:revoked` | 友達解除等によりルームが使えなくなった通知 |

各イベントの正確な JSON 形式は `backend/ws/types.go` を参照してください。

---

## 備考

- すべての API は JSON を返します。エラー時は `{"error": "message"}` 形式。
- 添付ファイルは `/api/messages/media` で取得した `url` と `objectKey` をメッセージ送信時に利用します。
- `friends` 取得時の `unread_count` はバックエンドでメッセージ既読と同期されています。フロントエンドは WebSocket の `message:*` / `presence:*` を購読してリアルタイム更新します。
* タイムアウト、ping/pongで接続維持
* 切断時に再接続処理（フロント側対応）

---

## 備考

* すべてのAPIはJWT認証（Authorizationヘッダ）を必要とします
* WebSocketは `/ws/chat/:friend_id` に接続し、双方向通信を行います
* エラーレスポンスは統一された形式で返却（今後定義）
