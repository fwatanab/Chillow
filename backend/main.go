package main

import (
	"log"

	"chillow/config"
	"chillow/db"
	"chillow/router"
	"chillow/model"
)

func	main() {
	// 環境変数の読み込み
	config.LoadConfig()

	// DB接続
	db.InitDB()

	db.DB.AutoMigrate(&model.User{})

	// ルーターの初期化
	r := router.SetupRouter()

	// サーバー起動
// 	if err := r.Run(":8080"); err != nil {
// 		log.Fatalf("❌ サーバー起動失敗: %v", err)
// 	}

	if err := r.RunTLS(":8443", "./cert/cert.pem", "./cert/key.pem"); err != nil {
	log.Fatalf("❌ HTTPSサーバー起動失敗: %v", err)
	}
}

