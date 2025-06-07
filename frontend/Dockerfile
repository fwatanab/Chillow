# Node.js 環境（Debianベース）を使ってReactアプリをビルド
FROM node:20-bookworm AS builder

# 作業ディレクトリを /app に設定
WORKDIR /app

# 依存関係をインストール
COPY package.json package-lock.json ./
RUN npm install

# 本番用の静的ファイルを生成
COPY . .
RUN npm run build

# 実行ステージ（nginx で静的ファイル提供）
FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y nginx && \
    rm -rf /var/lib/apt/lists/*

# ビルド成果物をnginxへ
COPY --from=builder /app/dist /usr/share/nginx/html

# nginxのポート設定
EXPOSE 3000

# Nginxサーバーを起動
CMD ["nginx", "-g", "daemon off;"]

