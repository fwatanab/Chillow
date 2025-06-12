#!/bin/sh

CERT_DIR="/app/cert"
CERT_FILE="$CERT_DIR/cert.pem"
KEY_FILE="$CERT_DIR/key.pem"

# 証明書が存在しなければ作成
if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
  echo "🔐 証明書が見つかりません。自己署名証明書を生成中..."
  mkdir -p "$CERT_DIR"
  openssl req -x509 -newkey rsa:2048 \
    -keyout "$KEY_FILE" -out "$CERT_FILE" \
    -days 365 -nodes -subj "/CN=localhost"
else
  echo "✅ 既存の証明書を使用します"
fi

echo "🚀 サーバーをHTTPSで起動します"
exec ./server

