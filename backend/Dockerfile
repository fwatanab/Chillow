# Goビルドステージ
FROM golang:1.24-bookworm AS builder

WORKDIR /app

# ビルドステージにopensslを追加（オプション、今回は不要）
RUN apt-get update && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o server

# 実行ステージ
FROM debian:bookworm-slim
WORKDIR /app

# 🔧 openssl + ca-certificates をインストール
RUN apt-get update && \
    apt-get install -y \
        openssl \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# サーバーとスクリプトをコピー
COPY --from=builder /app/server .
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# SSL証明書ディレクトリ作成
RUN mkdir -p /app/cert

EXPOSE 8443

# サーバー起動スクリプト
ENTRYPOINT ["/entrypoint.sh"]

