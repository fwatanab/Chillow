# 認証・認可設計

Chillow の開発環境向け認証／権限方針を以下のように統一しています。実務でも推奨される Cookie ベースの短期トークン運用を意識し、ブラウザ側にトークンを保持させない構成にしています。

---

## 概要

1. フロントエンドで Google Identity Services の OneTap/Popup を利用し ID Token を取得。
2. `POST /api/auth/google` に ID Token を送信。バックエンドで検証し、ユーザー作成/検索。
3. Go バックエンドで **アクセストークン (JWT)** を発行し、`HttpOnly` / `Secure`(開発中は false) / `SameSite=Lax` な Cookie (`chillow_access_token`) に格納して返却。ログイン済みで `/login` にアクセスした場合は自動的に `/` へリダイレクトします。
4. 以降の REST / WebSocket は Cookie のみで認証。Authorization Header や localStorage でのトークン保持は不要。
5. `/api/auth/logout` は Cookie を即時削除。

---

## バックエンドの構成

### 主要コンポーネント

| 役割 | ファイル |
| --- | --- |
| 設定値管理 | `backend/config/config.go` |
| トークン生成/検証 | `backend/service/auth/token.go` |
| Cookie 操作 | `backend/service/auth/cookie.go` |
| 認証ミドルウェア | `backend/middleware/auth.go` |
| 権限ミドルウェア | `backend/middleware/roles.go` |
| Google ログイン | `backend/controller/auth.go` |
| ルーティング | `backend/router/router.go` |

### JWT アクセストークン

- 署名方式: HS256
- Claim:
  - `user_id`
  - `role`
  - `exp` (30 分後)
  - `iat`
- Cookie `chillow_access_token` に格納。`COOKIE_DOMAIN` / `COOKIE_SECURE` / `FRONTEND_URL` で挙動を制御。

### User モデル

| カラム | 型 | 備考 |
| --- | --- | --- |
| id | BIGINT UNSIGNED | GORM の `uint` と合わせる |
| email | VARCHAR(191) | Unique |
| nickname | VARCHAR(50) | - |
| friend_code | VARCHAR(20) | Unique |
| avatar_url | TEXT | - |
| role | VARCHAR(20) | `admin` / `user`（`ADMIN_EMAILS` に含まれるメールのみ admin） |
| is_banned | TINYINT(1) | BAN 中か |
| banned_at | DATETIME NULL | BAN 開始時刻 |
| ban_reason | TEXT NULL | BAN 理由 |
| ban_expires_at | DATETIME NULL | 期限付き BAN の解除予定時刻 |
| created_at / updated_at | DATETIME | - |

### 認証/権限の流れ

1. `AuthMiddleware` は Authorization ヘッダの Bearer token を優先的に、無ければ Cookie から取得。
2. `ParseAccessToken` で JWT を検証し、`user_id` をもとに DB から最新のユーザー情報を取得。BAN 状態であれば 403 を返す。BAN 期限を過ぎていれば自動的に解除する。
3. `user_role` を Context に保存し、各 API グループで `middleware.AuthMiddleware()` を使用。
4. 管理者専用 API は `middleware.RequireRoles("admin")` で明示的に保護し、ユーザー向け API は `middleware.ForbidRoles("admin")` で拒否する（管理者はチャット機能を利用できない）。
5. `/ws` も Cookie ベースで認証し、接続前に BAN 状態とロールを再確認。接続後は **ルーム参加時・メッセージ送受信時に都度フレンド関係を再検証**。フレンド解除済みのルームには `room:revoked` を返して強制的に切断することで、不正なチャネル継続を防いでいる。

---

## 管理者ロールと BAN

- 管理者ロールは `.env` の `ADMIN_EMAILS`（カンマ区切り）に記載されたメールアドレスにのみ付与され、初回ユーザーであっても自動的に admin にはならない。
- 現在の管理 API:
  - `GET /api/admin/health`
  - `POST /api/admin/users/:id/ban`（理由必須、任意で `duration_hours` 指定）
  - `POST /api/admin/users/:id/unban`
  - `GET /api/admin/reports` / `POST /api/admin/reports/:id/resolve`
  - `GET /api/admin/banned-users`
- BAN 中は REST / WebSocket へのアクセスを完全に遮断する。期限付き BAN はミドルウェアが解除時刻を過ぎたタイミングで自動的に解除。
- BAN を発動すると現在接続中の WebSocket も強制的に切断し、即座に利用停止を反映する。
- 管理 UI は `/admin` として別画面を提供し、ユーザー向けチャット UI とは完全に分離している。

---

## フロントエンドの構成

- トークンを localStorage に保存しない。Recoil (`currentUserState`, `authLoadingState`) でのみ状態管理。
- `axios` は `withCredentials: true` のみ設定し、ヘッダにトークンを付与しない (`src/utils/axios.ts`)。
- `useRestoreUser` はマウント時に `/api/users/me` を呼んで Cookie による認証状況を確認。
- `PrivateRoute` は `authLoadingState` が true の間ローディング表示。
- `Login.tsx` は Google から得た ID Token を `loginWithGoogle` に渡し、返却されるユーザー情報を Recoil へ格納。
- `Mypage.tsx` で `logout()` を呼び、Cookie を削除→Recoil をリセット→`/login` へ遷移。
- WebSocket (`useWebSocket`, `WSClient`) はクエリトークン不要。`ws://localhost:8080/ws` へ Cookie 認証のまま接続。

---

## Google OAuth 設定 (開発)

- Authorized JavaScript origins: `http://localhost:5173` など **実際にアクセスするオリジンと必ず一致させること**（不一致だと `The given origin is not allowed for the given client ID.` で 403 となる）。
- Authorized redirect URIs: `http://localhost:5173/auth/callback`
- `.env` の `GOOGLE_REDIRECT_URI` と一致させること

本番では HTTPS ドメイン、`COOKIE_SECURE=true`、`GIN_MODE=release` など環境に応じて設定を変更してください。
