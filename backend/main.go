package main

import (
	"log"

	"chillow/config"
	"chillow/router"
)

func	main() {
	cfg := config.LoadConfig()                // .env 読み込み

	r := router.SetupRouter()       // 全ルーティングを設定

	if err := r.Run(":8080"); err != nil {
		log.Fatalf("サーバー起動失敗: %v", err)
	}
}

