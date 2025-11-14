# Chillow Project Makefile

.DEFAULT_GOAL := help

DOCKER_COMPOSE ?= docker compose
SERVICE ?= backend
SHELL_CMD ?= sh

.PHONY: help up dev down build build-backend build-frontend images restart logs ps exec clean reset-db

up: ## コンテナをバックグラウンドで立ち上げ
	$(DOCKER_COMPOSE) up -d

dev: ## フォアグラウンドで起動（ログ確認用）
	$(DOCKER_COMPOSE) up

down: ## すべてのコンテナ停止
	$(DOCKER_COMPOSE) down

build: build-frontend build-backend ## フロント/バックをローカルビルド

build-frontend:
	cd frontend && npm install && npm run build

build-backend:
	cd backend && go build ./...

images: ## Dockerイメージだけをビルド
	$(DOCKER_COMPOSE) build

restart: ## 再ビルド付きで再起動
	$(DOCKER_COMPOSE) down
	$(DOCKER_COMPOSE) up -d --build

logs: ## ログをフォロー（例：make logs SERVICE=frontend）
	$(DOCKER_COMPOSE) logs -f $(SERVICE)

ps: ## コンテナ状態の一覧表示
	$(DOCKER_COMPOSE) ps

exec: ## コンテナに入る（例：make exec SERVICE=db SHELL_CMD=bash）
	$(DOCKER_COMPOSE) exec $(SERVICE) $(SHELL_CMD)

clean: ## コンテナとボリュームを全削除
	$(DOCKER_COMPOSE) down -v --remove-orphans

reset-db: ## DBボリュームを初期化して再起動
	$(DOCKER_COMPOSE) down -v --remove-orphans
	rm -rf db/data || true
	$(DOCKER_COMPOSE) up -d

help: ## コマンド一覧を表示
	@echo ""
	@echo "📘 Chillow 開発用 Makefile コマンド一覧"
	@echo "------------------------------------------"
	@grep -E '^[a-zA-Z_-]+:.*?## .+' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "make %-10s %s\n", $$1, $$2}'
	@echo ""
