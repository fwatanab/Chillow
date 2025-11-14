package controller

import (
	"context"
	"log"
	"net/http"

	"chillow/config"
	"chillow/model"
	authsvc "chillow/service/auth"

	"github.com/gin-gonic/gin"
	"google.golang.org/api/idtoken"
)

// GoogleLoginHandler handles OAuth login via Google
func GoogleLoginHandler(c *gin.Context) {
	var req struct {
		IDToken string `json:"id_token"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効なリクエストです"})
		return
	}

	// GoogleのIDトークンを検証
	payload, err := idtoken.Validate(context.Background(), req.IDToken, config.Cfg.GoogleClientID)
	if err != nil {
		log.Printf("❌ IDトークン検証失敗: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "無効なトークンIDです"})
		return
	}

	// トークンから必要なユーザー情報を取り出す
	email, _ := payload.Claims["email"].(string)
	name, _ := payload.Claims["name"].(string)
	picture, _ := payload.Claims["picture"].(string)

	// ユーザーを検索または作成
	user, err := model.FindOrCreateUserByEmail(email, name, picture)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB処理に失敗しました"})
		return
	}

	log.Printf("✅ IDトークン検証成功: email=%s, name=%s", email, name)

	// アクセストークン発行＆Cookieに設定
	token, expiresAt, err := authsvc.GenerateAccessToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "トークン生成に失敗しました"})
		return
	}
	authsvc.SetAuthCookie(c, token, expiresAt)

	c.JSON(http.StatusOK, gin.H{"user": user})
}

func LogoutHandler(c *gin.Context) {
	authsvc.ClearAuthCookie(c)
	c.Status(http.StatusNoContent)
}
