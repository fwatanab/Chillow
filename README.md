# Chillow

「Chillow」は Google アカウントでログインし、友達と 1 対 1 のチャットを楽しめる Web アプリです。  
リアルタイム通信（WebSocket）と添付アップロードを備え、実務レベルの認証・権限設計を採用しています。

---

## 主な機能

- Google OAuth によるログイン（Cookie ベースのセッション管理）
- フレンドコード検索 → 申請/承認ワークフロー → フレンド一覧表示
- 画像/スタンプ/テキスト送受信、編集・削除、既読・タイピング表示、オンライン表示
- 添付ファイルはローカル保存と S3 互換バケットのどちらにも対応
- ルームごとに認可を再検証し、フレンド解除後は `room:revoked` で強制離脱
- マイページでニックネーム変更・ログアウト

詳しい仕様は `docs/requirements.md` と `docs/features.md` を参照してください。

---

## 技術スタック

| レイヤ | 技術 |
| --- | --- |
| フロントエンド | React + TypeScript, Vite, Recoil, Tailwind CSS |
| バックエンド | Go 1.24, Gin, GORM, MySQL |
| WebSocket | 独自実装（Cookie 認証, ルーム管理） |
| 認証 | Google Identity Services, JWT (HS256) |
| ストレージ | ローカルファイル or S3 互換バケット（SigV4） |

---

## 必要環境

- Node.js 18 以上 / npm
- Go 1.24 以上
- MySQL 8 系
- Google Cloud Console で発行した OAuth クライアント ID

---

## セットアップ

1. **環境変数の作成**  
   - `.env` をルートまたは各サービス配下に配置し、以下を設定してください（例）:
     ```
     # 共通
     FRONTEND_URL=http://localhost:5173
     BACKEND_URL=http://localhost:8080
     GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
     GOOGLE_CLIENT_SECRET=xxxx
     GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback
     
     # DB
     DB_HOST=127.0.0.1
     DB_PORT=3306
     DB_USER=root
     DB_PASSWORD=secret
     DB_NAME=chillow
     
     # ストレージ
     ATTACHMENT_STORAGE=local        # or s3
     UPLOAD_DIR=./uploads
     S3_BUCKET=your-bucket
     S3_REGION=ap-northeast-1
     S3_ACCESS_KEY=...
     S3_SECRET_KEY=...
     ```

2. **フロントエンド**  
   ```bash
   cd frontend
   npm install
   npm run dev   # http://localhost:5173
   ```

3. **バックエンド**  
   ```bash
   cd backend
   go mod tidy
   go run main.go   # デフォルトで :8080
   ```

4. `make build` でフロント/バックエンドのビルドをまとめて実行できます。  
   ※ ネットワーク制約下では Go の依存取得に失敗するため、必要に応じて GOPROXY を設定してください。

---

## テスト

- フロントエンド: `npm run build`（型チェック + Vite ビルド）
- バックエンド: Go のユニットテスト/ビルドを追加予定。現時点では `go build ./...` で依存解決が必要です。

---

## 参考ドキュメント

- `docs/authentication.md` : 認証/認可の詳細
- `docs/requirements.md` : 要件定義
- `docs/features.md` : 実装済み機能の仕様まとめ

