# Goビルドステージ
FROM golang:1.24-bookworm AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o server

# 実行ステージ
FROM debian:bookworm-slim
WORKDIR /app

# ルート証明書のみ
RUN apt-get update && \
    apt-get install -y ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/server .

EXPOSE 8080

CMD ["./server"]
