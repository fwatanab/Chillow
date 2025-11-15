package controller

import (
	"log"
	"net/http"
	"time"

	"chillow/config"
	"chillow/db"
	"chillow/model"
	authsvc "chillow/service/auth"
	"chillow/ws"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
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

	var user model.User
	if err := db.DB.First(&user, claims.UserID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.String(http.StatusUnauthorized, "user not found")
			return
		}
		c.String(http.StatusInternalServerError, "failed to load user")
		return
	}
	if user.ShouldLiftBan(time.Now()) {
		user.ClearBan()
		_ = db.DB.Save(&user).Error
	}
	if user.IsBanned {
		c.String(http.StatusForbidden, "account suspended")
		return
	}
	if user.Role == "admin" {
		c.String(http.StatusForbidden, "admin accounts cannot join chat")
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
