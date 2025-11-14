package main

import (
	"log"

	"chillow/config"
	"chillow/db"
	"chillow/model"
	"chillow/router"
)

func main() {
	// 環境変数の読み込み
	config.LoadConfig()

	// DB接続
	db.InitDB()

	// スキーマを最新化（ユーザー／友達／申請／メッセージ）
	if err := db.DB.AutoMigrate(
		&model.User{},
		&model.Friend{},
		&model.FriendRequest{},
		&model.Message{},
	); err != nil {
		log.Fatalf("❌ AutoMigrate失敗: %v", err)
	}

	// ルーターの初期化
	r := router.SetupRouter()

	// サーバー起動（開発環境はHTTPで十分）
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("❌ サーバー起動失敗: %v", err)
	}
}
