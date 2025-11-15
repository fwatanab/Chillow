package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RequireRoles(roles ...string) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(roles))
	for _, role := range roles {
		allowed[role] = struct{}{}
	}

	return func(c *gin.Context) {
		roleVal, exists := c.Get("user_role")
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "権限がありません"})
			return
		}
		role, _ := roleVal.(string)
		if _, ok := allowed[role]; !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "権限がありません"})
			return
		}
		c.Next()
	}
}

func ForbidRoles(roles ...string) gin.HandlerFunc {
	blocked := make(map[string]struct{}, len(roles))
	for _, role := range roles {
		blocked[role] = struct{}{}
	}
	return func(c *gin.Context) {
		roleVal, exists := c.Get("user_role")
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "権限がありません"})
			return
		}
		role, _ := roleVal.(string)
		if _, ok := blocked[role]; ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "権限がありません"})
			return
		}
		c.Next()
	}
}
