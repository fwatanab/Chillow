FROM golang:1.24-bookworm AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

# ソースコード全体をコピー
COPY . .
RUN go build -o server

# 実行ステージ（Debianで軽量構成）
FROM debian:bookworm-slim

WORKDIR /app
COPY --from=builder /app/server .

EXPOSE 8080
CMD ["./server"]
