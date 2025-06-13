package controller

import (
	"chillow/config"
	"chillow/model"
	"context"
	"net/http"
	"time"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
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

	// JWTトークン発行
	token, err := generateJWT(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "トークン生成に失敗しました"})
		return
	}

	log.Printf("🔐 JWT発行成功: userID=%d", user.ID)

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":          user.ID,
			"nickname":    user.Nickname,
			"email":       user.Email,
			"friend_code": user.FriendCode,
			"avatar_url":  user.AvatarURL,
		},
		"token": token,
	})
}

// JWTを生成
func generateJWT(userID uint) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(time.Hour * 24).Unix(),
		"iat":     time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.Cfg.JWTSecret))
}

