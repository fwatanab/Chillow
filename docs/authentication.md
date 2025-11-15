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
| role | VARCHAR(20) | `admin` / `user` (初期ユーザーは admin) |
| created_at / updated_at | DATETIME | - |

### 認証/権限の流れ

1. `AuthMiddleware` は Authorization ヘッダの Bearer token を優先的に、無ければ Cookie から取得。
2. `ParseAccessToken` で JWT を検証し、`user_id` と `user_role` を Context に保存。
3. 各 API グループで `middleware.AuthMiddleware()` を使用。
4. 管理者専用 API は `middleware.RequireRoles("admin")` で明示的に保護。
5. `/ws` も Cookie ベースで認証し、接続後は **ルーム参加時・メッセージ送受信時に都度フレンド関係を再検証**。フレンド解除済みのルームには `room:revoked` を返して強制的に切断することで、不正なチャネル継続を防いでいる。

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
