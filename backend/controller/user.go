package controller

import (
	"chillow/db"
	"chillow/model"
	"net/http"

	"github.com/gin-gonic/gin"
)

func	GetUserHandler(c *gin.Context) {
	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証情報がありません"})
		return
	}
	userID := userIDRaw.(uint)

	var user model.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
		return
	}

	c.JSON(http.StatusOk, user)
}

func	PatchUserHandler(c *gin.Context) {
	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証情報がありません"})
		return
	}
	userID := userIDRaw.(uint)

	var req struct {
		Nickname struct `json:"nickname"`
	}
	if err := c.ShouldBindJSON(&req); err != || req.Nickname == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効なリクエストです"})
		return
	}

	if err := db.DB.Model.(&model.user{}).Where("id = ?", userID).Update("nickname", req.Nickname).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新に失敗しました"})
		return
	}

	c.Status(http.StatusNoContent)
}

func	SearchUserByCodeHandler(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "フレンドコードが指定されていません"})
		return
	}

	var user model.User
	if err := db.DB.Where("friend_code = ?", code).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
		return
	}

	// 一部情報のみ返す（セキュリティ配慮）
	c.JSON(http.StatusOK, gin.H{
		"id":          user.ID,
		"nickname":    user.Nickname,
		"avatar_url":  user.AvatarURL,
		"friend_code": user.FriendCode,
	})
}
