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

1. ルートに `.env`（または `backend/.env` などサービスごと）を配置し、共通設定を記述します。

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
