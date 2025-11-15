package middleware

import (
	"net/http"
	"strings"
	"time"

	"chillow/db"
	"chillow/model"
	authsvc "chillow/service/auth"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenStr := extractBearerToken(c.GetHeader("Authorization"))
		if tokenStr == "" {
			if cookie, err := c.Cookie(authsvc.AccessTokenCookieName); err == nil {
				tokenStr = cookie
			}
		}

		if tokenStr == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "認証情報がありません"})
			return
		}

		claims, err := authsvc.ParseAccessToken(tokenStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "無効なトークンです"})
			return
		}

		var user model.User
		if err := db.DB.First(&user, claims.UserID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "ユーザー情報が存在しません"})
				return
			}
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報を取得できません"})
			return
		}

		if user.ShouldLiftBan(time.Now()) {
			user.ClearBan()
			_ = db.DB.Save(&user).Error
		}

		if user.IsBanned {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "アカウントは利用停止中です"})
			return
		}

		c.Set("user_id", user.ID)
		c.Set("user_role", user.Role)
		c.Next()
	}
}

func extractBearerToken(header string) string {
	if header == "" {
		return ""
	}
	parts := strings.Split(header, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return ""
	}
	return parts[1]
}
