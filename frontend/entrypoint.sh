#!/bin/sh

# ディレクトリがなければ作成
mkdir -p /etc/nginx/ssl

# 証明書がなければ作成
if [ ! -f /etc/nginx/ssl/dev.crt ]; then
  echo "📜 Creating self-signed certificate..."
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/dev.key \
    -out /etc/nginx/ssl/dev.crt \
    -subj "/C=JP/ST=Tokyo/L=Dev/O=Dev/CN=${DOMAIN_NAME}"
fi

echo "🚀 Starting nginx..."
exec nginx -g "daemon off;"

