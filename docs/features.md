# 機能仕様まとめ

Chillow の現状機能を実務想定の仕様レベルで整理したドキュメントです。

---

## 1. 認証・認可

- Google Identity Services で ID Token を取得し、`POST /api/auth/google` に渡す。
- バックエンドが JWT アクセストークンを発行し `HttpOnly` Cookie (`chillow_access_token`) に格納。
- すべての REST API と WebSocket は Cookie を用いたセッション認証。
- `/api/users/me` でログイン済みユーザー情報を取得し、Recoil ストアに復元。
- `/api/auth/logout` は Cookie を破棄し、フロントは Recoil をクリアして `/login` へ遷移。
- 管理者向けエンドポイントは `middleware.RequireRoles("admin")` で保護。

## 2. フレンド管理

- ユーザー検索: フレンドコードで `GET /api/users/search`。
- フレンド申請: `POST /api/friend-requests`。承認/拒否は `PATCH /api/friend-requests/:id`。
- フレンド一覧: `GET /api/friends` で最新メッセージ・未読件数・オンライン状態（WS連携）を返却。
- フレンド削除: `DELETE /api/friends/:friend_id`。双方向の friend レコード削除に加えて、該当ルームのメッセージ・既読レコードを物理削除し、添付オブジェクトもストレージから除去してから `room:revoked` を配信。
- フロントの FriendManage 画面には「フレンド追加」「申請一覧」「フレンド管理」のタブを用意し、削除操作はフレンド管理タブからのみ実行可能。

## 3. チャット機能

- REST API:
  - `GET /api/messages/:friend_id` で履歴取得＆未読を既読に更新。
  - `POST /api/messages` でメッセージ送信（テキスト/スタンプ/絵文字単体/画像）。
  - `PATCH /api/messages/:id` で送信者のみ編集可能。
  - `DELETE /api/messages/:id` で送信者のみ削除可能（添付ファイルはストレージからも削除）。
  - `POST /api/messages/:id/read` で既読化。
  - `POST /api/messages/media` で添付アップロード（ローカル or S3 互換ストレージを選択可能）。
  - `POST /api/messages/:id/report` で受信したメッセージを理由付きで通報。メッセージ単位で重複通報を抑制。
- WebSocket (`ws://<host>/ws`):
  - `join`, `message:send`, `message:edit`, `message:delete`, `typing:start/stop`, `ping` をサポート。
  - サーバーはイベントごとにフレンド関係を再検証し、無効な場合は `room:revoked` を返して強制的に離脱させる。
  - イベント `message:new/updated/deleted/read`, `typing:start/stop`, `presence:update`, `room:revoked` をブロードキャスト。
- 既読管理は `message_reads` テーブルでユーザー×メッセージ単位に記録し、REST/WS の両経路から upsert。
- フロント UI:
  - 画像/スタンプ/絵文字表示、送信者の編集・削除アクション、既読ラベル、タイピングインジケータ、オンライン表示、アップロード中インジケータを搭載。
  - WebSocket でリアルタイム更新し、友達一覧も未読件数・オンライン状態を即時反映。
  - 再読み込みボタンは不要で、`useFriendsData` がログイン状態を見て自動更新。
  - 編集可否ルール: テキスト or テキスト+絵文字のみ編集可。スタンプおよび絵文字単体メッセージはレイアウト維持のため編集不可だが削除は可能。
  - 受信メッセージには「通報」アクションを用意し、即座に API へ報告を送信できる。
  - 通報が掛かったメッセージの添付ファイルはレポート解決までストレージに保全される。

## 4. 管理者 / モデレーション

- 管理者アカウントは環境変数 `ADMIN_EMAILS` に登録されたメールアドレスのみ付与。通常ユーザーは常に `user` ロール。
- 管理 API (`/api/admin/...`) は Cookie + admin ロールを必須とし、以下を提供。
  - `GET /api/admin/health`
  - `POST /api/admin/users/:id/ban`（理由必須、オプションで `duration_hours` を指定して期限付き BAN）
  - `POST /api/admin/users/:id/unban`
  - `GET /api/admin/reports` / `POST /api/admin/reports/:id/resolve`（BAN or 拒否）
  - `GET /api/admin/banned-users`
- BAN 中ユーザーは REST/WS すべての API が 403 となり、ログイン済みでも利用できない。期限付き BAN は時間経過で自動解除。
- BAN を実行した瞬間にアクティブな WebSocket 接続も強制切断し、チャット継続を防止。
- 管理者は通常チャット UI にアクセスせず、専用の `/admin` 画面で通報一覧確認、BAN/拒否、BAN リスト管理、ログアウトのみを行う。

## 5. ストレージポリシー

- `ATTACHMENT_STORAGE=local|s3` で保存先を切替。
- `local`: `UPLOAD_DIR` 配下に `uploads/chat/<user_id>/` 形式で保存。`/uploads` を静的に配信。
- `s3`: 最小限の SigV4 署名で互換バケットに PUT/DELETE。`attachment_object` にキーを保持し、メッセージ削除やフレンド削除時にクリーンアップ。

## 6. その他仕様メモ

- フレンド関係が失効すると対象ルームへの WebSocket イベントは `room:revoked` が優先され、チャット画面では履歴クリア＋アラートを表示。
- `useFriendsData` は未ログイン時に API を呼び出さないため、401 やネットワークエラー時でも UI が崩壊しない。
- ブラウザにトークンを保持しないため、XSS を受けてもセッション盗難リスクを抑えられる。（Cookie には `HttpOnly`/`SameSite=Lax` を設定）
