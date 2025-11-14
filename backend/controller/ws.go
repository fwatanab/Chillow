package controller

import (
	"log"
	"net/http"

	"chillow/config"
	authsvc "chillow/service/auth"
	"chillow/ws"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// WebSocketのUpgrade設定
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		return origin == config.Cfg.FrontendURL // フロントURLを許可
	},
}

// Hub（全クライアント共有）
var hub = ws.NewHub()

func init() {
	go hub.Run() // goroutineでHubのイベントループ開始
}

func WSHandler(c *gin.Context) {
	token, err := c.Cookie(authsvc.AccessTokenCookieName)
	if err != nil {
		c.String(http.StatusUnauthorized, "missing token")
		return
	}

	// JWTトークンを検証してuser_id取得
	claims, err := authsvc.ParseAccessToken(token)
	if err != nil || claims.UserID == 0 {
		c.String(http.StatusUnauthorized, "invalid token")
		return
	}

	// WebSocket接続へUpgrade
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	client := ws.NewClient(claims.UserID, conn, hub)
	client.Start() // readLoop, writeLoop 起動
}
