# Chillow

Google OAuth でログインし、友達と 1 対 1 のチャットができるリアルタイム Web アプリです。  
WebSocket / 添付アップロード / 既読管理など、実務レベルの要件を想定して実装しています。

---

## 主な機能

- Google OAuth → JWT Cookie によるセッション管理
- フレンドコード検索 → 申請/承認フロー → リアルタイム友達一覧
- テキスト・画像・スタンプ・絵文字送信、編集/削除、既読/タイピング/オンライン表示
- 添付ストレージはローカル or S3 互換バケットを選択可能
- フレンド解除時は対象ルームのメッセージ・既読・添付を即時パージし、`room:revoked` を配信
- ユーザーは相手のメッセージを通報でき、管理者が BAN / 拒否を判断
- 管理者は専用 API / 画面からユーザーの BAN / 解除を行い、モデレーションを実施可能
- マイページでプロフィール変更、ログアウト、アカウント削除

詳細仕様は `docs/requirements.md` と `docs/features.md` を参照してください。

---

## アーキテクチャ / 技術スタック

| レイヤ | 技術 |
| --- | --- |
| フロント | React + TypeScript, Vite, Recoil, Tailwind CSS |
| バックエンド | Go 1.24, Gin, GORM, MySQL |
| Realtime | 独自 WebSocket Hub（Cookie 認証, ルーム管理, イベント配信） |
| 認証 | Google Identity Services, JWT (HS256) |
| ストレージ | ローカルファイル or S3 互換バケット（SigV4） |
| 開発補助 | Docker Compose, Makefile, eslint/prettier, gofmt |

---

## 必要環境

- Node.js 18+ / npm
- Go 1.24+
- MySQL 8.x
- Google Cloud Console で発行した OAuth クライアント ID
- （推奨）Docker / Docker Compose

---

## 環境設定

1. ルートに `.env`（または `backend/.env`）を配置し、共通設定を記述します。バックエンドは起動時に両方のファイルを自動的に読み込み、既存の環境変数を上書きしません。

   ```env
   FRONTEND_URL=http://localhost:5173
   BACKEND_URL=http://localhost:8080
   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxx
   GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback

   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=secret
   DB_NAME=chillow

   ATTACHMENT_STORAGE=local          # or s3
   UPLOAD_DIR=./uploads
   S3_BUCKET=your-bucket
   S3_REGION=ap-northeast-1
   S3_ACCESS_KEY=...
   S3_SECRET_KEY=...

   # 管理者として扱うメールアドレス（カンマ区切り）
   ADMIN_EMAILS=ops@example.com,owner@example.com
   ```

2. `docker-compose.yml` を使う場合は `.env` の内容がコンテナにも渡るよう設定してください。

---

## 起動方法

### 1. Docker + Makefile（推奨）

`make up` / `make dev` で Docker Compose をラップしており、DB・バックエンド・フロントをまとめて立ち上げられます。

```bash
make up     # バックグラウンドで docker compose up -d
make dev    # フォアグラウンド（ログを見ながら起動）
```

補助コマンド:

- 停止: `make down`
- 再ビルド付き再起動: `make restart`
- ログ閲覧: `make logs SERVICE=backend`
- DB 初期化: `make reset-db`
- コマンド一覧: `make help`

> **補足:** `make build` はフロント (`npm run build`) とバックエンド (`go build ./...`) のビルドをまとめて実行するターゲットであり、サーバーの起動は行いません。CI やデプロイ前の検証用途として利用してください。

### 2. 手動実行（ローカルで個別に起動する場合）

```bash
# フロントエンド
cd frontend
npm install
npm run dev          # http://localhost:5173

# バックエンド
cd backend
go mod tidy
go run main.go       # :8080 で起動
```

バックエンドをバイナリだけ生成したい場合は `make build-backend` も利用できます。

---

## テスト / ビルド

- フロント: `npm run build`（tsc + vite build）
- バックエンド: `go test ./...`（必要に応じて追加）、`go build ./...`
- まとめて確認したい場合は `make build` を実行（フロント/バックを順番にビルドするのみで、サーバーは起動しません）。

---

## プロジェクト構成

```
backend/        # Go (Gin) サーバー、REST + WebSocket
frontend/       # React/Vite アプリ
docs/           # 要件・仕様・認証方針ドキュメント
db/             # MySQL 用のデータ/初期化ファイル
docker-compose.yml
Makefile        # 開発向けコマンド集
```

---

## ドキュメント

- `docs/requirements.md` : 要件定義書
- `docs/features.md` : 実装済み機能の仕様
- `docs/authentication.md` : 認証/認可の設計

それぞれ最新の仕様と合わせて随時更新しています。

---

## 管理者 / モデレーション方針

- `ADMIN_EMAILS` に登録されているメールアドレスのみ `admin` ロールでサインインします。それ以外のユーザーは常に `user` ロールです。
- 管理 API (`/api/admin/...`) は Cookie 認証 + admin ロールが必須で、現状は以下の機能を提供しています。
  - `POST /api/admin/users/:id/ban` : 期限付きまたは無期限でユーザーを BAN（理由必須）
  - `POST /api/admin/users/:id/unban` : BAN 解除
  - `GET /api/admin/reports` / `POST /api/admin/reports/:id/resolve` : 通報一覧と BAN/拒否操作
  - `GET /api/admin/banned-users` : BAN リスト取得
  - `GET /api/admin/health` : 管理系 API の生存確認
- BAN 中のユーザーは REST / WebSocket すべてのエンドポイントへアクセスできません。期限付き BAN の場合は有効期限を過ぎると自動で解除されます。
- BAN 実行時はアクティブな WebSocket セッションも即座に切断され、強制的にチャットから退席させます。
- 通報中のメッセージ添付はレポートが解決するまでストレージ上に保全し、証跡を保持します。
- `/admin/events` (SSE) で通報・BAN の更新をリアルタイム配信し、管理画面はリロードなしで最新状態を反映します。
- 実運用では、別サブドメインの管理 UI やオペレーター用ツールからこれらの API を呼び出すことを想定しています。本リポジトリでは API レイヤの実装に留めつつ、通報確認と BAN 管理だけを行う最小限の管理画面（`/admin`）を同梱しています。管理者はチャット UI にはアクセスできません。
