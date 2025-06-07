# Chillow Project Makefile

.DEFAULT_GOAL := help

.PHONY: help up down build restart logs logs-backend logs-frontend logs-db ps \
        exec-backend exec-frontend exec-db clean reset-db

up:
	docker-compose up -d

down:
	docker-compose down

build:
	docker-compose build

restart:
	docker-compose down && docker-compose up -d --build

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

logs-db:
	docker-compose logs -f db

ps:
	docker-compose ps

exec-backend:
	docker-compose exec backend sh

exec-frontend:
	docker-compose exec frontend sh

exec-db:
	docker-compose exec db bash

clean:
	docker-compose down -v --remove-orphans

reset-db:
	docker-compose down -v --remove-orphans
	rm -rf db/data || true
	docker-compose up -d

help:
	@echo ""
	@echo "📘 Chillow 開発用 Makefile コマンド一覧"
	@echo "------------------------------------------"
	@echo "make up            # コンテナ起動（バックグラウンド）"
	@echo "make down          # コンテナ停止"
	@echo "make build         # イメージのビルド"
	@echo "make restart       # 再ビルド付きで再起動"
	@echo "make logs          # 全体のログを表示"
	@echo "make logs-backend  # バックエンドログを表示"
	@echo "make logs-frontend # フロントエンドログを表示"
	@echo "make logs-db       # データベースログを表示"
	@echo "make ps            # コンテナの状態一覧表示"
	@echo "make exec-backend  # バックエンドに入る（sh）"
	@echo "make exec-frontend # フロントエンドに入る（sh）"
	@echo "make exec-db       # DBに入る（bash）"
	@echo "make clean         # コンテナとボリュームを削除"
	@echo "make reset-db      # DBボリュームを初期化して再起動"
	@echo "make help          # この使い方一覧を表示"
	@echo ""

