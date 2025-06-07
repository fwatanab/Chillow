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

# 必要なツールをインストール（nginx + openssl）
RUN apt-get update && \
    apt-get install -y nginx openssl && \
    rm -rf /var/lib/apt/lists/*

# Nginxの設定ファイル
COPY default.conf /etc/nginx/conf.d/default.conf

# 証明書生成スクリプトをコピーし実行権限を付与
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# ビルド成果物をnginxへ
COPY --from=builder /app/dist /usr/share/nginx/html

# HTTPS用ポートを開ける
EXPOSE 443

# 起動時にSSL生成→nginx起動
CMD ["/entrypoint.sh"]
