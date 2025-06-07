# Chillow API設計書（v1）

## 概要

ChillowはWebSocketを用いたリアルタイムチャットアプリです。本ドキュメントでは、Chillowで使用されるREST APIの主要エンドポイントについて記載します。

---

## 認証関連

### POST `/api/auth/google`

Google OAuthトークンによるログイン / 新規登録

* **リクエスト**

```json
{
  "id_token": "<Google発行のIDトークン>"
}
```

* **レスポンス例**

```json
{
  "user": {
    "id": 1,
    "nickname": "chill_user",
    "email": "user@example.com",
    "friend_code": "U123ABC",
    "avatar_url": "https://..."
  },
  "token": "<JWTトークン>"
}
```

---

## ユーザー関連

### GET `/api/users/me`

ログイン中のユーザー情報を取得（要認証）

* **レスポンス**

```json
{
  "id": 1,
  "nickname": "chill_user",
  "email": "user@example.com",
  "friend_code": "U123ABC",
  "avatar_url": "https://..."
}
```

### PATCH `/api/users/me`

ニックネームの変更

* **リクエスト**

```json
{
  "nickname": "new_nickname"
}
```

* **レスポンス**：ステータス204（No Content）

---

## フレンド関連

### GET `/api/users/search?code=U123ABC`

フレンドコードでユーザーを検索

### POST `/api/friend-requests`

フレンド申請を送る

```json
{
  "receiver_id": 2
}
```

### GET `/api/friend-requests`

受け取った申請一覧の取得

### PATCH `/api/friend-requests/:id`

申請の承認または拒否

```json
{
  "status": "accepted" // または "rejected"
}
```

### GET `/api/friends`

友達一覧を取得

### DELETE `/api/friends/:id`

友達を削除

---

## チャット関連

### GET `/api/messages/:friend_id`

指定した友達とのメッセージ履歴を取得

* **クエリ例**：`?limit=30&before=2024-06-01T00:00:00Z`

### POST `/api/messages`

新規メッセージ送信（要WebSocket対応）

```json
{
  "receiver_id": 2,
  "content": "こんにちは！"
}
```

---

## 既読管理

### POST `/api/messages/:id/read`

メッセージを既読にする

* **レスポンス**：ステータス204

---

## 通知系（拡張予定）

### GET `/api/unread-counts`

未読件数の取得（チャット一覧表示用）

---

## WebSocket仕様

### 接続先

ws://yourdomain.com/ws/chat

### 接続方法

* 接続時に JWTトークン をクエリパラメータで渡す

* 例：ws://yourdomain.com/ws/chat?token=xxx

### 接続後の動作

* 接続後、以下の形式でメッセージを送受信する（JSON）

### ▶ 送信形式（クライアント → サーバー）

```json
{
  "type": "message",
  "receiver_id": 2,
  "content": "こんにちは"
}
```
### ▶ サーバーからの受信（サーバー → クライアント）

```json
{
  "type": "message",
  "sender_id": 2,
  "content": "こんにちは",
  "timestamp": "2025-06-07T12:00:00Z"
}
```

### ▶ 既読通知

```json
{
  "type": "read",
  "message_id": 123,
  "reader_id": 1
}
```

* 接続エラー・切断対応
* 認証エラー時：接続拒否、401エラーを返す
* タイムアウト、ping/pongで接続維持
* 切断時に再接続処理（フロント側対応）

---

## 備考

* すべてのAPIはJWT認証（Authorizationヘッダ）を必要とします
* WebSocketは `/ws/chat/:friend_id` に接続し、双方向通信を行います
* エラーレスポンスは統一された形式で返却（今後定義）

